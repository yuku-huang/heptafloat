// Session-only page history; unrelated to the pinned/recent card list or text undo.
export class CardHistory {
  constructor() { this.entries = []; this.index = -1; this.pending = null; }
  visit(target) {
    if (!target || target.kind === 'draft') return;
    const current = this.entries[this.index];
    if (current?.id === target.id && current.kind === target.kind) return;
    this.entries.splice(this.index + 1);
    this.entries.push({ kind: target.kind, id: target.id });
    if (this.entries.length > 100) this.entries.shift();
    this.index = this.entries.length - 1;
  }
  destination(direction, current) {
    const base = this.pending ? this.entries.indexOf(this.pending.target) : this.index;
    const index = current?.kind === 'draft' && !this.pending && direction === -1 ? base : base + direction;
    if (current?.kind === 'draft' && direction === 1 && !this.pending) return null;
    return this.entries[index] ? { index, target: this.entries[index] } : null;
  }
  begin(direction, current) {
    const request = this.destination(direction, current);
    if (request) this.pending = request;
    return request;
  }
  commit(request) {
    if (this.pending !== request) return false;
    const index = this.entries.indexOf(request.target);
    this.pending = null;
    if (index < 0) this.visit(request.target);
    else this.index = index;
    return true;
  }
  cancel(request = this.pending) { if (this.pending === request) this.pending = null; }
}
