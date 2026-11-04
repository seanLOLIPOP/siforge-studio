# SI FORGE STUDIO — Windows V1

A portable, offline website builder with a light workspace, visual page canvas, connected backend flows, custom code, accounts, and a database.

Download the portable Windows ZIP from [Releases](https://github.com/seanLOLIPOP/siforge-studio/releases). The source-code ZIP is for development; use the named Windows release asset to run the app.

## Start

Open `release/SI FORGE STUDIO/SI FORGE STUDIO.exe`. Keep the entire folder together in a writable location. No installation, Node setup, or network access is required. The build targets Windows x64; it is unsigned.

Create a project with a password of at least 10 characters. The starter has a home page, signup/signin, a dashboard, a task form, a tasks table, and a working backend flow. Choose **Run website**, create an account, and save a task. The Database workspace displays project records and website accounts.

## Workspaces

- **Design**: click or drag components to add them; select on the canvas or in Layers. Edit text, style, fields, table bindings, and form endpoints. Drag layers to reorder or nest. Desktop/mobile preview, mobile style overrides (600 px breakpoint), saved reusable blocks, duplicate, delete, undo/redo, and page settings are included. Layout uses CSS properties; free-position absolute dragging is not included in this first build.
- **Backend**: add endpoints and request/validate/condition/insert/list/code/response nodes. Drag nodes. Click an output dot then a destination node to connect. Set false branches in node settings. Configuration is JSON. A request must reach a response; execution is capped at 100 steps. Tests use the `studio` record owner. Node input/output tracing is limited to identifiers, timings, and errors.
- **Database**: create tables with custom text columns, insert records, delete records, and inspect users. IDs, owners, and timestamps are automatic. Website access requires a signed-in account and is scoped by record owner. Schema alteration, arbitrary SQL, relationships, and pagination beyond the first 1000 displayed rows are not included.
- **Code**: per-page HTML, CSS, and JavaScript; custom synchronous JavaScript in backend Code nodes. Return an updated `input` from backend code. Custom HTML is not converted back into visual elements. Backend code has a 300 ms VM timeout and no provided `require` or network API. It is trusted project code, not an OS security sandbox. Async backend code and external packages are not supported.
- **Settings**: website name, global accent/background, password change, and quick guide.

## Encryption and portability

Each `.siforge` file contains the entire project, backend graph/code, embedded images, user hashes, and database rows. AES-256-GCM encrypts it with a scrypt-derived key (N=32768, r=8, p=1; random 16-byte salt and 12-byte nonce). Files are atomically replaced. SQLite runs in memory; no plaintext SQLite project file is created. Passwords are not stored. Website passwords use salted scrypt hashes. Sessions remain in memory and clear on lock/restart.

Keep your password safe: there is no recovery. Back up encrypted project files regularly. Encryption protects files at rest, not data visible to a running app, operating-system memory, swap, crash dumps, screenshots, or malicious code on the computer. Electron caches are redirected beside the app; pages use no-store responses. The app does not claim forensic protection.

`projects/`, `exports/`, and Electron profile/cache folders are created beside the packaged EXE. Source development uses `workspace/` instead. Upload images through Properties to embed them; external image URLs need internet and are not downloaded automatically. Offline portability applies to built-in features and embedded assets, not custom external services.

## Export

Export writes a standalone folder under `exports/`, with `SI FORGE Website.exe`, the bundled runtime, and a copy of the password-encrypted project. Open the EXE, unlock the project, and the website runs locally. The exported copy has its own data. It does not deploy a public server. Runtime listeners bind to 127.0.0.1 only. HTTPS, email verification, password reset, internet hosting, and production account administration are outside this V1.

## Develop / verify

On Windows x64, install Node 24.22 or later, then run:

```powershell
npm install
npm test
npm start
npm run build
npm run test:desktop
npm run test:export
```

Development dependency installation needs internet. The packaged app bundles its own runtimes and does not require npm or a separate Node installation. `npm run build` uses the installed Electron runtime and the current Node executable. `SI_ELECTRON_RUNTIME` can select another predownloaded Windows Electron runtime. The build tools also support the original local sibling runtime as a fallback, but it is not required after `npm install`.

To test a packaged build, set `SI_TEST_EXE` to its full executable path before running the desktop/export tests. Screenshots are written to `artifacts/`. Tests use temporary project directories.

Projects from the older sibling SI FORGE Studio app are not automatically migrated. That app is preserved separately.
