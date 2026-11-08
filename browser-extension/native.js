import links from '../shared/hepta-links.cjs';
export const NATIVE_HOST = 'com.heptafloat.bridge';
export function nativeCardMessage(raw) {
  const { spaceId, cardId } = links.validateCardIntent(raw);
  return { action: 'openCard', spaceId, cardId };
}
export async function openNativeCard(intent, send, timeoutMs = 8000) {
  const message = nativeCardMessage(intent);
  let timer;
  try {
    const result = await Promise.race([
      Promise.resolve(send(NATIVE_HOST, message)),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('本機橋接未在時間內回應，尚未確認卡片是否開啟。')), timeoutMs); }),
    ]);
    if (result?.accepted !== true) throw new Error(typeof result?.error === 'string' ? result.error : '本機橋接沒有確認開啟請求。');
    return result; // Host process creation only, not card-render acknowledgement.
  } finally { clearTimeout(timer); }
}
