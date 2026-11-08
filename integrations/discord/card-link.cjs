// Optional external-Bot helper only. This module never sends a message.
const { markHeptaCardUrl } = require('../../shared/hepta-links.cjs');

function discordCardLink(title, originalHttpsUrl) {
  const label = (String(title || '').replace(/\s+/g, ' ').trim().slice(0, 200) || '開啟卡片')
    .replace(/([\\[\]`*_~|])/g, '\\$1');
  // Explicit destination boundaries keep following punctuation out of the URL.
  return `[${label}](<${markHeptaCardUrl(originalHttpsUrl)}>)`;
}
module.exports = { discordCardLink };
