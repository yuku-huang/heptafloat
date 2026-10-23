const { contextBridge, ipcRenderer } = require('electron');
// A narrow message bridge; renderer code never receives Node, filesystem, or raw IPC APIs.
contextBridge.exposeInMainWorld('heptafloat', {
  postMessage: (message) => {
    ipcRenderer.invoke('hf:message', message).then((result) => {
      if (message.requestId) ipcRenderer.emit('hf:local-reply', null, { type: 'reply', requestId: message.requestId, result });
    }).catch(() => {
      if (message.requestId) ipcRenderer.emit('hf:local-reply', null, { type: 'reply', requestId: message.requestId, result: { error: 'Desktop connection failed.' } });
    });
  },
  onEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('hf:event', listener);
    ipcRenderer.on('hf:local-reply', listener);
    return () => { ipcRenderer.removeListener('hf:event', listener); ipcRenderer.removeListener('hf:local-reply', listener); };
  },
});
