import links from '../shared/hepta-links.cjs';
export const DEFAULTS = { interceptAll: false, autoLaunch: true };
export function handoffIntent(input) {
  const url = new URL(input);
  if (url.pathname !== '/handoff.html' || [...url.searchParams].length !== 2
    || url.searchParams.getAll('space').length !== 1 || url.searchParams.getAll('card').length !== 1) throw new Error('無效的預覽請求。');
  return links.cardIntent({ spaceId: url.searchParams.get('space'), cardId: url.searchParams.get('card') });
}
export function installBridge(api) {
  const serials = new Map();
  const bypassKey = (tabId) => `web:${tabId}`;
  async function beforeNavigate(details) {
    if (details.frameId !== 0 || details.tabId < 0) return;
    let intent;
    try { intent = links.parseHeptaCardUrl(details.url); } catch { return; }
    const serial = (serials.get(details.tabId) || 0) + 1;
    serials.set(details.tabId, serial);
    const key = bypassKey(details.tabId);
    const [settings, session] = await Promise.all([api.storage.local.get(DEFAULTS), api.storage.session.get(key)]);
    if (session[key]?.url === intent.canonicalUrl && session[key].expires > Date.now()) return;
    if (!intent.marked && settings.interceptAll !== true) return;
    const tab = await api.tabs.get(details.tabId);
    if (serials.get(details.tabId) !== serial) return;
    // Do not redirect a tab that navigated elsewhere while storage was loading.
    const currentUrl = tab.pendingUrl || tab.url;
    if (currentUrl && new URL(currentUrl).href !== new URL(details.url).href) return;
    const handoff = new URL(api.runtime.getURL('handoff.html'));
    handoff.searchParams.set('space', intent.spaceId); handoff.searchParams.set('card', intent.cardId);
    await api.tabs.update(details.tabId, { url: handoff.href });
  }
  async function openWeb(sender) {
    const url = new URL(sender.url);
    const expected = new URL(api.runtime.getURL('handoff.html'));
    if (sender.id !== api.runtime.id || url.protocol !== expected.protocol || url.host !== expected.host
      || !Number.isInteger(sender.tab?.id)) throw new Error('不允許的來源。');
    const intent = handoffIntent(sender.url), key = bypassKey(sender.tab.id);
    // One tab/card only; survives MV3 worker suspension and expires quickly.
    await api.storage.session.set({ [key]: { url: intent.canonicalUrl, expires: Date.now() + 30_000 } });
    await api.tabs.update(sender.tab.id, { url: intent.canonicalUrl });
    return { ok: true };
  }
  api.webNavigation.onBeforeNavigate.addListener((details) => { beforeNavigate(details).catch(() => {}); },
    { url: [{ schemes: ['https'], hostEquals: 'app.heptabase.com' }] });
  api.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.action !== 'openWeb') return false;
    openWeb(sender).then(reply, () => reply({ error: '無法開啟網頁，請停用擴充功能後重試。' })); return true;
  });
  api.tabs.onRemoved.addListener((id) => { serials.delete(id); api.storage.session.remove(bypassKey(id)).catch(() => {}); });
  api.action.onClicked.addListener(() => api.runtime.openOptionsPage());
  return { beforeNavigate, openWeb };
}
