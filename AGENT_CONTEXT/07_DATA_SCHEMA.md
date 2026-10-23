# Data schema and bridge

`%APPDATA%/HeptaFloat/state.json`:

```json
{"settings":{"pinned":true,"theme":"system","fontScale":1,"hotkey":"Control+Alt+J","launchAtLogin":false},"recents":[],"bounds":{"x":100,"y":100,"width":520,"height":650}}
```

Recent entries: `{id, objectType, title, chars, openedAt, pinned?}`. At most 100 are retained. `openedAt` is an ISO timestamp; journal IDs are `YYYY-MM-DD`, note IDs are UUIDs. There is no note-body database in state.json.

Recovery JSON: `{kind, id, content, md5?, savedLocallyAt?}`; `content` is serialized Heptabase ProseMirror JSON. Filename hashes `kind:id` for saves. New-note drafts have unique IDs; after creation their recovery metadata records the real card ID. These private files are never Git inputs.

Editor messages: `{action, requestId?, ...payload}`. Read returns `{kind,id,title,content,contentMd5}`. Save returns `{current?,error?}`. Create returns `{createdId?,current?,error?}`. Searches return `{results}`. Other allowlisted messages manage recents, native window state, settings, and image import. Unknown actions fail.

Host events: `reply`, `command`, `titles`, `visible`, `settings`, `title`, `notice`, `state`. No credentials are sent to the renderer. The CLI owns authentication with Heptabase.
