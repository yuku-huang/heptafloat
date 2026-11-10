import links from '../shared/hepta-links.cjs';

// Recognize card destinations only. Other web links retain their existing behavior.
export function linkedCard(input) {
  if (typeof input !== 'string') return null;
  try {
    if (/^https:/i.test(input)) return { id: links.parseHeptaCardUrl(input).cardId };
    if (/^flowhepta:/i.test(input)) return { id: links.parseFlowHeptaDeepLink(input).cardId };
    const match = /^heptabase:\/\/card\/([0-9a-f-]+)$/i.exec(input);
    if (match && links.UUID.test(match[1])) return { id: match[1].toLowerCase() };
    if (match && /^\d{4}-\d{2}-\d{2}$/.test(match[1])) return { id: match[1], objectType: 'journal' };
  } catch { /* Malformed card links never become internal navigation. */ }
  return null;
}
