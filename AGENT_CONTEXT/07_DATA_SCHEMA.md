# Data schema and bridge

win.8 adds registered-renderer request `{action:'copyCardLink',kind:'note'|'journal',id:<UUID|date>}`. Host validates kind/id and its window's optional space context, keeps journal date references for native URIs, awaits clipboard write and replies `{copied:true}` or the existing error envelope. Only note UUIDs with known space form HTTPS links. The renderer supplies no clipboard payload, URL or space. Draft/invalid kinds/IDs are rejected. No persisted schema change.

Approved Native Messaging schema (bridge 1.1.1 / unchanged host 1.0.0): one 4-byte native little-endian byte length followed by strict UTF-8 JSON, at most 8192 bytes. Request `{action:"openCard",spaceId:<UUID>,cardId:<UUID>,requestId?:<UUID>}`; reject unknown fields/actions and canonicalize UUIDs. Response `{accepted:true}` or `{accepted:false,error:<bounded generic message>}`; never a renderer acknowledgement. No card content/auth data is transmitted to this host.

Local native install receipt: `{owner:"heptafloat-native-install-v1",browser,extensionId,appInstallRoot,installed,versions:[],registryKeys:[]}` under `%LOCALAPPDATA%/Programs/HeptaFloatNativeBridge/<Browser>/native-install-state.json`. Edge registryKeys are its primary and Google Chrome fallback, constrained to static allowed paths; legacy receipts without the additive field own only the primary. Status additionally exposes `registrations:[{key,manifestPath,owned}]`. Per-version config remains `{owner:"heptafloat-native-config-v1",origin,appInstallRoot}`; one exact-origin stdio manifest points to a fixed EXE. Build metadata `{version,sha256}` and host framing are unchanged. All actual receipts/config/origins/paths stay local, outside Git.

Extension request `{action:"closeHandoff"}` has no caller-chosen target. The worker validates sender.id/origin, frameId=0, valid handoff IDs, nonnegative sender.tab.id and matching current URL; then removes that tab. Response is `{ok:true}` or `{error}` if the page remains reachable. No close diagnostics/state are persisted. Page-local choice sequence suppresses closure after alternate actions.

Installer CLI addition (source desktop manager): `Status` keeps `{installRoot,installed,command}` and adds `systemAssociation:{friendlyName,friendlyNameResult,executable,executableResult}`; result strings are eight-digit Windows HRESULT hex, `00000000` on success. `Refresh` returns `{registered,associationChangeNotified,systemAssociation}` after validating the existing receipt/current executable. Desktop receipt/state/card/recovery schemas are unchanged. These fields do not acknowledge browser delivery.

Bridge 1.0.1 adds no persisted data/settings. Launcher enabled/one-shot/pending/sequence state is page-local. Errors are rendered after URL/UUID redaction, never stored. UI version is injected from source manifest; loaded version comes from runtime.getManifest. Local settings/session bypass and Heptabase note schemas are unchanged.

Window-local host state: `{intent?,pinned,recoveryKey,ready,closing,allowClose,title}`; `recoveryKey` is a fresh host UUID and is never chosen by the renderer. Main overwrites it on save/create requests. Recovery JSON gains optional `recoveryKey`; filenames and verified retry-base keys derive from `kind:id:recoveryKey`. Legacy unscoped files are preserved. Note-body JSON/schema is unchanged. No window registry/pin/history/buffer is persisted beyond the existing main-window defaults. Theme/font/hotkey/startup and recents stay app-wide.

Deep Link intent remains `{spaceId,cardId,canonicalUrl}`. Each registered window has its own validated initial intent; preload/renderer validate the bootstrap event. Link windows now share normal editor IPC with the journal, including validated read/save/create/image actions. Window controls and replies target the sender; no cross-window navigation is implied. `previewRead` only bootstraps the initial card; it is no longer a read-only permission mode.

MV3 local settings: `{interceptAll:false,autoLaunch:true,autoClose:true}`. `storage.local.get(DEFAULTS)` merges the new preference for legacy installs, preserving existing values. Session `web:<tabId>` holds `{url:canonicalUrl,expires:epochMs}` for a 30-second bypass, removed on tab close. No note content/auth data. The desktop installer receipt and note/state/recovery schemas are unchanged; all actual local receipts/private content stay out of Git.

Code block language uses existing `attrs.params = [!]<language>[:displayMode]` (confirmed in official CLI help). `!` preserves wrap; Mermaid display mode survives until an explicit language change. Unknown values are retained. No new schema/marks; highlight classes are transient decorations only.

`%APPDATA%/HeptaFloat/state.json`:

```json
{"settings":{"pinned":true,"theme":"system","fontScale":1,"hotkey":"Control+Alt+J","launchAtLogin":false},"recents":[],"bounds":{"x":100,"y":100,"width":520,"height":650}}
```

Recent entries: `{id, objectType, title, chars, openedAt, pinned?}`. At most 100 are retained. `openedAt` is an ISO timestamp; journal IDs are `YYYY-MM-DD`, note IDs are UUIDs. There is no note-body database in state.json.

Recovery JSON: `{kind, id, content, md5?, recoveryKey?, savedLocallyAt?}`; `content` is serialized Heptabase ProseMirror JSON. Filename hashes `kind:id:recoveryKey` for window-scoped saves; legacy requests without a scope still hash `kind:id`. New-note drafts have unique IDs; after creation their recovery metadata records the real card ID. These private files are never Git inputs.

Editor messages: `{action, requestId?, ...payload}`. Read returns `{kind,id,title,content,contentMd5}`. Save returns `{current?,error?}`. Create returns `{createdId?,current?,error?}`. Search accepts `{query}` and returns `{results,warning?}` or `{error}`. Each result is official CLI metadata `{id,objectType,title,createdTime?,lastEditedTime?}`; at most 20 for empty query, 50 for a keyword. A warning identifies an unavailable title/content source; errors never become empty arrays in the UI. Other allowlisted messages manage recents, native window state, settings, and image import. Unknown actions fail.

Search metadata (`Map<id,card>`, five-minute expiry) and navigation history (`entries: [{kind,id}], index, pending`) are memory-only. There is no persistent schema migration. Windows history holds at most 100 visits; drafts are skipped until a note ID exists.

An incomplete search also returns `{indexing:true,indexedCount,total}`. Results may already be usable; the picker refreshes in the background until indexing completes. Native keyword responses are cached for ten seconds to avoid spawning processes for every progress refresh. No-results is only final when `indexing` is absent and there is no source error.

Search accepts optional `retry:true` for a new query or explicit Retry click. Automatic progress refresh does not restart a failed index; it surfaces the error/warning and stops polling until a user retry.

Host events: `reply`, `command`, `titles`, `visible`, `settings`, `title`, `notice`, `state`. No credentials are sent to the renderer. The CLI owns authentication with Heptabase.
