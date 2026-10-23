// ProseMirror's Mod means Command on macOS and Control on Windows/Linux.
export const isMac = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '');
export const modLabel = isMac ? '⌘' : 'Ctrl';
export const modPressed = (event) => isMac ? event.metaKey : event.ctrlKey;

export function shortcutName(event, mac = isMac) {
  const mods = [event.altKey && 'Alt', event.ctrlKey && (mac ? 'Ctrl' : 'Mod'),
    event.metaKey && (mac ? 'Mod' : 'Meta'), event.shiftKey && 'Shift'].filter(Boolean);
  const key = event.key === 'Enter' ? 'enter' : event.code?.startsWith('Key') ? event.code.slice(3).toLowerCase()
    : event.code?.startsWith('Digit') ? event.code.slice(5) : event.key.toLowerCase();
  return [...mods.sort(), key].join('-');
}

export function shortcutGlyphs(name, mac = isMac) {
  if (!name) return [];
  const parts = name.split(/-(?!$)/), key = parts.pop();
  const labels = mac ? [['Ctrl', '⌃'], ['Alt', '⌥'], ['Shift', '⇧'], ['Mod', '⌘']]
    : [['Mod', 'Ctrl'], ['Ctrl', 'Ctrl'], ['Alt', 'Alt'], ['Shift', 'Shift']];
  return [...labels.filter(([m]) => parts.includes(m)).map(([, label]) => label),
    { Enter: '↩', Space: 'Space' }[key] ?? key.toUpperCase()];
}
