const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { CardSearch } = require('./search.cjs');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
function checkId(kind, id) {
  if (!(kind === 'note' && UUID.test(id) || kind === 'journal' && DATE.test(id))) throw new Error('Invalid card identifier.');
}
function checkContent(content) {
  if (typeof content !== 'string' || Buffer.byteLength(content) > 1024 * 1024) throw new Error('Card content must be under 1 MB.');
  const doc = JSON.parse(content);
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) throw new Error('Expected a ProseMirror document.');
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try { await fs.writeFile(temp, JSON.stringify(value, null, 2), 'utf8'); await fs.rename(temp, file); }
  finally { await fs.rm(temp, { force: true }); }
}

class HeptabaseService {
  constructor(cli, dataDir) {
    this.cli = cli; this.dataDir = dataDir; this.writeChain = Promise.resolve(); this.lastSaved = new Map();
    this.cardSearch = new CardSearch(cli);
  }
  serializeWrite(fn) {
    const result = this.writeChain.then(fn);
    this.writeChain = result.catch(() => {});
    return result;
  }
  async scratch(fn) {
    const root = path.join(this.dataDir, 'temp');
    await fs.mkdir(root, { recursive: true });
    const dir = await fs.mkdtemp(path.join(root, 'request-'));
    try { return await fn(dir); } finally { await fs.rm(dir, { recursive: true, force: true }); }
  }
  read(kind, id) {
    checkId(kind, id);
    return this.cli.run([kind, 'read', id]).then((r) => ({ ...r, kind, id }));
  }
  async backup(message) {
    const key = createHash('sha256').update(`${message.kind}:${message.id}`).digest('hex');
    const file = path.join(this.dataDir, 'recovery', `${key}.json`);
    await atomicJson(file, { ...message, savedLocallyAt: new Date().toISOString() });
    return file;
  }
  save(message) {
    checkId(message.kind, message.id); checkContent(message.content);
    return this.serializeWrite(async () => {
      const file = await this.backup(message);
      const result = {};
      try {
        // Missing readback is NOT permission to overwrite the current remote version.
        const md5 = message.md5 || this.lastSaved.get(`${message.kind}:${message.id}`);
        if (!md5) throw new Error('No verified base version. Reopen the card before retrying; your draft is kept locally.');
        const saved = await this.scratch(async (dir) => {
          const contentFile = path.join(dir, 'content.json');
          await fs.writeFile(contentFile, message.content, 'utf8');
          return this.cli.run([message.kind, 'save', message.id, '--content-md5', md5, '--content-file', contentFile]);
        });
        // Only a hash explicitly returned by save can serve as a retry base.
        if (saved.contentMd5) this.lastSaved.set(`${message.kind}:${message.id}`, saved.contentMd5);
        else this.lastSaved.delete(`${message.kind}:${message.id}`);
        this.cardSearch.invalidate();
      } catch (e) { result.error = e.message; }
      try { result.current = await this.read(message.kind, message.id); } catch {}
      if (!result.error && result.current) await fs.rm(file, { force: true });
      return result;
    });
  }
  createNote(message) {
    checkContent(message.content);
    return this.serializeWrite(async () => {
      const file = await this.backup({ kind: 'draft', id: randomUUID(), content: message.content });
      const result = {};
      try {
        const title = String(message.title || 'Untitled').replace(/[\r\n]/g, ' ').slice(0, 500);
        const created = await this.cli.run(['note', 'create', '--no-created-by-ai', '--content', `# ${title}`]);
        checkId('note', created.id); result.createdId = created.id;
        this.cardSearch.invalidate();
        const fresh = await this.read('note', created.id);
        this.lastSaved.set(`note:${created.id}`, fresh.contentMd5);
        // Keep the created id on disk if filling the new card fails.
        await atomicJson(file, { kind: 'note', id: created.id, md5: fresh.contentMd5, content: message.content });
        await this.scratch(async (dir) => {
          const contentFile = path.join(dir, 'content.json');
          await fs.writeFile(contentFile, message.content, 'utf8');
          const saved = await this.cli.run(['note', 'save', created.id, '--content-md5', fresh.contentMd5, '--content-file', contentFile]);
          if (saved.contentMd5) this.lastSaved.set(`note:${created.id}`, saved.contentMd5);
          else this.lastSaved.delete(`note:${created.id}`);
        });
        result.current = await this.read('note', created.id);
        this.cardSearch.invalidate();
        await fs.rm(file, { force: true });
      } catch (e) { result.error = e.message; }
      return result;
    });
  }
  search(query = '', retry = false) { return this.cardSearch.search(query, retry); }
  cardType(id) {
    if (!UUID.test(id)) throw new Error('Invalid card identifier.');
    return this.cli.run(['card', 'properties', id]);
  }
  async setupStatus() {
    try { await this.read('journal', today()); return { step: 'ready' }; }
    catch (e) {
      const message = e.message;
      const step = /subscription/i.test(message) ? 'subscription' : /CLI is off|missing/i.test(message) ? 'enableCLI'
        : /reach Heptabase|not running/i.test(message) ? 'open' : 'other';
      return { step, message };
    }
  }
  async mentionTitles(content) {
    const ids = new Set();
    const walk = (node) => {
      for (const key of ['cardId', 'pdfCardId', 'objectId', 'highlightElementId']) if (UUID.test(node.attrs?.[key])) ids.add(node.attrs[key]);
      node.content?.forEach(walk);
    };
    walk(JSON.parse(content));
    const titles = {};
    // Bound background work; never let a large card block editing or saving.
    for (const id of [...ids].slice(0, 50)) {
      try { titles[id] = (await this.cardType(id)).title; } catch {}
    }
    return titles;
  }
  async file(id) {
    if (!UUID.test(id)) throw new Error('Invalid image identifier.');
    return this.scratch(async (dir) => {
      const result = await this.cli.run(['file', 'export', id, '--output-dir', dir]);
      const file = path.resolve(result.path || '');
      if (!file.startsWith(path.resolve(dir) + path.sep)) throw new Error('Unexpected export location.');
      if (!/^image\/(png|jpeg|gif|webp|avif|bmp)$/i.test(result.mimeType || '')) throw new Error('Unsupported image type.');
      return { data: await fs.readFile(file), mimeType: result.mimeType };
    });
  }
  async importImage({ data, name }) {
    if (typeof data !== 'string' || data.length > 28 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) throw new Error('Invalid image or image exceeds 20 MB.');
    return this.scratch(async (dir) => {
      const safeName = path.win32.basename(String(name || 'Pasted image.png')).replace(/[^\p{L}\p{N} ._-]/gu, '_');
      if (!/\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(safeName)) throw new Error('Unsupported image type.');
      const file = path.join(dir, safeName);
      await fs.writeFile(file, Buffer.from(data, 'base64'));
      return this.cli.run(['file', 'import', file]);
    });
  }
}
module.exports = { HeptabaseService, atomicJson, checkId, checkContent, today, UUID, DATE };
