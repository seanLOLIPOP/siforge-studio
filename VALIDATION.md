# Windows V1 validation

Validated on this Windows machine on November 4, 2026. This is a working unsigned V1 build, not a claim of a production security audit or testing on every Windows configuration.

## Passed

- Eleven automated tests, including snapping, rotated resizing, layout commands, mobile overrides, stacking and runtime layout rendering, plus core tests: authenticated encryption and tamper detection; invalid schema/path rejection; graph validation, code timeout, and cycle limits; complete HTTP/project/account/database lifecycle; encrypted project transfer preserving code/assets/accounts/records with invalid-file and collision checks; website-only transfer restrictions.
- AES-256-GCM envelope contains no plaintext project name, backend code marker, or record marker. Wrong passwords and modified ciphertext fail to decrypt.
- Account signup and login use salted password hashes. Account A cannot read Account B's records. Project editor responses omit hashes and table rows from the page model.
- Insert followed by a failed backend node rolls back. Records and account hashes survive lock/unlock. Password rotation rejects the old password.
- Editor API rejects invalid tokens and foreign origins. Locked websites return a locked response. Sessions clear on lock.
- Desktop source and packaged EXE: create project, canvas selection/edit, component insertion and cross-frame drag/drop, undo/redo, mobile preview, backend node drag/configuration and output connections, graph test, record inspection, custom code save, lock/reopen, and graceful save-on-close.
- Packaged export integration: real signup UI, authenticated dashboard form, database table refresh, saved reusable block, mobile property edit, full runtime export, move exported folder, launch standalone EXE, sign in with persisted account, read persisted record, add another record, and close gracefully.
- Preview and exported website have no `window.desktop` bridge. The editor and website use separate loopback ports. The desktop bridge validates the sender main frame and editor origin.
- Studio and website screenshots were rendered and visually inspected.
- Project transfer desktop integration: native save/open picker handlers, encrypted file export, canceled dialogs, wrong password while keeping another project open, import into a second workspace, imported account login and owned records, editable frontend code, start-screen import, and duplicate-copy safety. The native picker results are stubbed in automation; the actual desktop IPC and disk writes are exercised.

- Designer integration: flow reorder, free dragging, guide cancellation, grid snapping, resize, rotation and rotated resize, duplicate, stacking, undo/redo, keyboard nudging, Alt reparenting, automatic mobile stacking, mobile override/reset, running website geometry parity, whole-page origin placement, canvas/header editing, inline text editing, and encrypted reopen.

- Blank canvas integration: default blank project, no header or preset elements, full-width viewport and minimum viewport height, zero desktop/mobile padding, palette drop coordinates, free position at page origin, blank added pages, and encrypted reopen.

## Portable delivery

`release/SI FORGE STUDIO/` includes Electron, Node, required libraries, license notices, source/runtime files, and the launch EXE. Packaged startup uses the included `runtime/node.exe`. No package manager, external database server, WebView2 installer, or separate Node installation is required by the built-in starter.

The standalone exported website was moved to another folder and launched successfully on this machine. A second physical Windows PC and a network-disabled machine have not been tested. Built-in features use only local files and loopback requests; custom external URLs, JavaScript, or services can require internet.

## Explicit V1 limits

- Local websites only; no public deployment, HTTPS provisioning, production email, password reset, or email verification.
- Custom database columns are text, with insert/list/delete controls; no schema alteration UI, relationships, or arbitrary SQL console.
- Displayed record lists are capped at 1000 rows. All rows are retained in encrypted project snapshots.
- Backend Code nodes are synchronous JavaScript with a 300 ms VM timeout. They are trusted project code, not an OS sandbox. Async code, packages, and direct filesystem/network libraries are not provided.
- Frontend HTML/CSS/JS extensions are per page. Arbitrary code does not round-trip into visual elements.
- Visual layout supports one selected element at a time, nested containers, free positioning, resize and rotation. Multi-selection, a full animation timeline, and arbitrary custom CSS transform editing are not included.
- Mobile overrides use one 600 px breakpoint. Native builds target Windows x64 and are unsigned.
- Encryption protects saved project files, not process memory, OS swap, crash dumps, or information exposed by custom code. There is no password recovery or automatic backup service.

The older `si-forge-studio` and `si-forge` projects were preserved. Their project formats are not automatically migrated.
