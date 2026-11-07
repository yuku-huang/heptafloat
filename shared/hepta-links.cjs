// Shared by Electron, the renderer, the MV3 bridge and the optional Bot helper.
// IDs are capabilities for reads only; a link never authorizes a write.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_URL_LENGTH = 2048;
function urlOf(input) {
  if (typeof input !== 'string' || !input || input.length > MAX_URL_LENGTH
    || /[\s\x00-\x1f\x7f<>"'`\\]/.test(input)) throw new Error('卡片連結格式無效。');
  let url;
  try { url = new URL(input); } catch { throw new Error('卡片連結格式無效。'); }
  if (url.username || url.password || url.port) throw new Error('卡片連結不可包含帳密或連接埠。');
  // URL normalizes dot segments; reject them rather than accepting an extra path.
  if (/\/(?:\.|%2e)(?:\.|%2e)?(?:\/|\?|#|$)/i.test(input)) throw new Error('卡片路徑無效。');
  return url;
}
function cardIntent({ spaceId, cardId } = {}) {
  if (typeof spaceId !== 'string' || typeof cardId !== 'string' || !UUID.test(spaceId) || !UUID.test(cardId)) {
    throw new Error('空間或卡片 ID 必須是 UUID。');
  }
  spaceId = spaceId.toLowerCase(); cardId = cardId.toLowerCase();
  return { spaceId, cardId, canonicalUrl: `https://app.heptabase.com/${spaceId}/card/${cardId}` };
}
function validateCardIntent(payload) {
  const intent = cardIntent(payload);
  if (payload.canonicalUrl !== intent.canonicalUrl) throw new Error('卡片網址與 ID 不一致。');
  return intent;
}
function parseHeptaCardUrl(input) {
  const url = urlOf(input), parts = url.pathname.split('/');
  if (url.protocol !== 'https:' || url.hostname !== 'app.heptabase.com'
    || parts.length !== 4 || parts[2] !== 'card') throw new Error('這不是支援的 Heptabase 卡片 HTTPS 連結。');
  const intent = cardIntent({ spaceId: parts[1], cardId: parts[3] });
  const entries = [...url.searchParams];
  if (entries.length > 20 || entries.some(([k, v]) => !/^[\w.-]{1,64}$/.test(k) || v.length > 256 || /[\x00-\x1f\x7f<>"'`;\\]/.test(v))
    || url.searchParams.getAll('flowhepta').length > 1
    || (url.searchParams.has('flowhepta') && url.searchParams.get('flowhepta') !== '1')) throw new Error('卡片連結查詢參數無效。');
  return { ...intent, marked: url.searchParams.get('flowhepta') === '1' };
}
function buildFlowHeptaDeepLink(ids) {
  const { spaceId, cardId } = cardIntent(ids);
  return `flowhepta://card/${cardId}?space=${spaceId}`;
}
function parseFlowHeptaDeepLink(input) {
  const url = urlOf(input);
  if (url.protocol !== 'flowhepta:' || url.hostname !== 'card' || url.hash
    || url.pathname.split('/').length !== 2 || [...url.searchParams].length !== 1
    || url.searchParams.getAll('space').length !== 1) throw new Error('不支援這個 Flow HeptaBase 連結。');
  return cardIntent({ cardId: url.pathname.slice(1), spaceId: url.searchParams.get('space') });
}
function intentFromArgv(argv) {
  // Never assume the URL is last; Electron/Windows append their own flags.
  let intent = null, invalid = false, found = false;
  for (const arg of argv) {
    if (typeof arg !== 'string' || !/^flowhepta:/i.test(arg)) continue;
    found = true;
    try { intent = parseFlowHeptaDeepLink(arg); } catch { invalid = true; }
  }
  return { intent, invalid, found }; // last valid intent wins; flags are never executed
}
function markHeptaCardUrl(input) {
  parseHeptaCardUrl(input);
  const url = new URL(input); url.searchParams.set('flowhepta', '1');
  return url.href; // Bot helper only; preserves existing query and fragment.
}
module.exports = { UUID, MAX_URL_LENGTH, cardIntent, validateCardIntent, parseHeptaCardUrl,
  buildFlowHeptaDeepLink, parseFlowHeptaDeepLink, intentFromArgv, markHeptaCardUrl };
