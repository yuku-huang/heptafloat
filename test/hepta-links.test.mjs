import test from 'node:test';
import assert from 'node:assert/strict';
import links from '../shared/hepta-links.cjs';
const { cardIntent, validateCardIntent, parseHeptaCardUrl, buildFlowHeptaDeepLink, parseFlowHeptaDeepLink, intentFromArgv, markHeptaCardUrl } = links;
const spaceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', cardId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const web = `https://app.heptabase.com/${spaceId}/card/${cardId}`;
const deep = `flowhepta://card/${cardId}?space=${spaceId}`;
test('HTTPS and protocol URLs roundtrip canonical IDs, marker and query/hash', () => {
  const intent = cardIntent({ spaceId, cardId });
  assert.deepEqual(parseHeptaCardUrl(`${web}?q=hello&flowhepta=1#block-1`), { ...intent, marked: true });
  assert.equal(parseHeptaCardUrl(web).marked, false);
  assert.equal(parseHeptaCardUrl(web.toUpperCase().replace('/CARD/', '/card/')).cardId, cardId);
  assert.equal(buildFlowHeptaDeepLink(intent), deep);
  assert.deepEqual(parseFlowHeptaDeepLink(deep), intent);
  assert.deepEqual(validateCardIntent(intent), intent);
});
test('reject phishing, credentials, paths, invalid IDs and unsafe URL data', () => {
  for (const url of [null, '', 'x'.repeat(2049), web.replace('https:', 'http:'),
    web.replace('.com/', '.com.evil.example/'), web.replace('app.', 'www.'), web.replace('https://', 'https://user@'),
    web.replace('.com/', '.com:444/'), `${web}/extra`, `${web}/`, web.replace('/card/', '/whiteboard/'),
    web.replace(cardId, 'bad-id'), `${web}?flowhepta=0`, `${web}?flowhepta=1&flowhepta=1`,
    `${web}?x=%00`, `${web}?x=%22`, `${web};calc`, `${web}?x=hello world`, web.replace('/card/', '/./card/'),
    web.replace(cardId, `%62${cardId.slice(1)}`), `javascript:${web}`, `${web}\\`, `${web}?x=%3Bcalc`]) {
    assert.throws(() => parseHeptaCardUrl(url), String(url).slice(0, 100));
  }
});
test('protocol accepts only card host and one space parameter; flags do not become URLs', () => {
  for (const url of [deep.replace('card/', 'evil/'), deep.replace('flowhepta:', 'heptabase:'),
    `${deep}&cmd=calc`, `${deep}&space=${spaceId}`, `${deep}#x`, deep.replace(cardId, `${cardId}/more`),
    deep.replace(spaceId, 'bad'), `flowhepta://card/${cardId}`, `${deep}&`, `${deep}%26calc`]) {
    // A trailing ampersand is a legal URL delimiter with no extra parameter.
    if (url === `${deep}&`) assert.deepEqual(parseFlowHeptaDeepLink(url), cardIntent({ spaceId, cardId }));
    else assert.throws(() => parseFlowHeptaDeepLink(url));
  }
  const b = deep.replace(cardId, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  const r = intentFromArgv(['HeptaFloat.exe', '--hidden', deep, '--original-process-start-time=1', b, '--flag']);
  assert.equal(r.intent.cardId, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  assert.equal(r.invalid, false);
  assert.equal(intentFromArgv(['--url=https://example.com']).found, false);
  assert.deepEqual(intentFromArgv(['flowhepta://invalid']), { intent: null, invalid: true, found: true });
});
test('IPC rejects mismatched canonical URL; Bot marker preserves query/hash and is idempotent', () => {
  assert.throws(() => validateCardIntent({ spaceId, cardId, canonicalUrl: 'https://evil.example' }));
  const original = `${web}?source=bot#block-1`, marked = markHeptaCardUrl(original);
  assert.equal(marked, `${web}?source=bot&flowhepta=1#block-1`);
  assert.equal(markHeptaCardUrl(marked), marked);
  assert.equal(parseHeptaCardUrl(marked).canonicalUrl, web);
});
