// Official CLI metadata only: never inspect Heptabase's database or cache.
const normalize = (text) => String(text || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
const PAGE_SIZE = 100;
const MAX_AGE = 5 * 60_000;

class CardSearch {
  constructor(cli) {
    this.cli = cli;
    this.cards = new Map();
    this.expires = 0;
    this.loading = null;
    this.revision = 0;
    this.partial = new Map();
    this.total = 0;
    this.indexError = null;
    this.queries = new Map();
  }
  invalidate() { this.expires = 0; this.revision++; this.queries.clear(); this.indexError = null; }
  list(offset = 0, limit = PAGE_SIZE, query = '') {
    const args = ['card', 'list', '--offset', String(offset), '--limit', String(limit)];
    if (query) args.push('-q', query);
    return this.cli.run(args);
  }
  async index() {
    if (Date.now() < this.expires) return this.cards;
    if (this.loading) return this.loading;
    const revision = this.revision;
    this.indexError = null;
    this.partial = new Map();
    this.loading = (async () => {
      const deadline = Date.now() + 180_000;
      const first = await this.list();
      const cards = new Map((first.results || []).map((card) => [card.id, card]));
      const total = Number(first.total ?? cards.size);
      this.partial = cards; this.total = total;
      let offset = PAGE_SIZE;
      let failure;
      // Bound process concurrency and duration even for a very large library.
      await Promise.all(Array.from({ length: 3 }, async () => {
        try {
          while (!failure && offset < total) {
            if (Date.now() >= deadline) throw new Error('Title search timed out. Please retry.');
            const start = offset; offset += PAGE_SIZE;
            const page = await this.list(start);
            for (const card of page.results || []) cards.set(card.id, card);
          }
        } catch (error) { failure = error; }
      }));
      if (failure) throw failure;
      this.cards = cards;
      this.expires = revision === this.revision ? Date.now() + MAX_AGE : 0;
      return cards;
    })();
    try { return await this.loading; }
    catch (error) { this.indexError = error; throw error; }
    finally { this.loading = null; }
  }
  keyword(query) {
    const cached = this.queries.get(query);
    if (cached && cached.expires > Date.now()) return cached.promise;
    const promise = this.list(0, 50, query);
    this.queries.set(query, { promise, expires: Date.now() + 10_000 });
    promise.catch(() => { if (this.queries.get(query)?.promise === promise) this.queries.delete(query); });
    if (this.queries.size > 100) this.queries.delete(this.queries.keys().next().value);
    return promise;
  }
  async search(raw = '', retry = false) {
    if (retry) this.indexError = null;
    const query = String(raw).trim().slice(0, 500);
    if (!query) {
      const recent = await this.list(0, 20);
      // Opening the picker is useful immediately; prepare title search in the background.
      if (!this.indexError) this.index().catch(() => {});
      return { results: recent.results || [] };
    }
    // Do not make typing wait for a large library to finish indexing. Publish
    // every metadata page and let the picker refresh while the index is warming.
    const indexing = this.indexError ? Promise.resolve() : this.index().catch(() => {});
    const [native] = await Promise.allSettled([this.keyword(query)]);
    await new Promise((resolve) => { const timer = setTimeout(resolve, 100); indexing.then(() => { clearTimeout(timer); resolve(); }); });
    const indexed = this.indexError ? { status: 'rejected', reason: this.indexError }
      : { status: 'fulfilled', value: new Map([...this.cards, ...this.partial]) };
    const needle = normalize(query), words = needle.split(' ');
    const titleMatches = indexed.status === 'fulfilled'
      ? [...indexed.value.values()].filter((card) => words.every((word) => normalize(card.title).includes(word))) : [];
    const results = new Map(titleMatches.map((card) => [card.id, card]));
    if (native.status === 'fulfilled') for (const card of native.value.results || []) results.set(card.id, card);
    const warnings = [];
    if (indexed.status === 'rejected') warnings.push(`Title search unavailable: ${indexed.reason.message}`);
    if (native.status === 'rejected') warnings.push(`Content search unavailable: ${native.reason.message}`);
    if (warnings.length && !results.size && !this.loading) throw new Error(warnings.join(' '));
    const score = (card) => normalize(card.title) === needle ? 3 : normalize(card.title).includes(needle) ? 2
      : words.every((word) => normalize(card.title).includes(word)) ? 1 : 0;
    return { results: [...results.values()].sort((a, b) => score(b) - score(a)
      || String(b.lastEditedTime || '').localeCompare(String(a.lastEditedTime || ''))).slice(0, 50),
      ...(warnings.length && { warning: warnings.join(' ') }),
      ...(this.loading && { indexing: true, indexedCount: this.partial.size, total: this.total }) };
  }
}
module.exports = { CardSearch };
