# SI FORGE STUDIO — Windows V1

A portable, offline website builder with a light workspace, visual page canvas, connected backend flows, custom code, accounts, and a database.

Download the portable Windows ZIP from [Releases](https://github.com/seanLOLIPOP/siforge-studio/releases). The source-code ZIP is for development; use the named Windows release asset to run the app.

## Start

Open `release/SI FORGE STUDIO/SI FORGE STUDIO.exe`. Keep the entire folder together in a writable location. No installation, Node setup, or network access is required. The build targets Windows x64; it is unsigned.

Create a project with a password of at least 10 characters. Blank page is the default: no header, preset content, margins or padding. The full viewport is usable, and dropped components start in free position at the drop coordinates. New pages are also blank. Select Accounts and database when creating a project to use the original starter. That starter has a home page, signup/signin, a dashboard, a task form, a tasks table, and a working backend flow. Choose **Run website**, create an account, and save a task. The Database workspace displays project records and website accounts.

## Workspaces

- **Design**: click or drag components to add them; select on the canvas or in Layers. Edit text, style, fields, table bindings, and form endpoints. Drag layers to reorder or nest. Desktop/mobile preview, mobile style overrides (600 px breakpoint), saved reusable blocks, duplicate, delete, undo/redo, and page settings are included. Drag elements to reorder in Layout mode, or choose Free position for overlap and exact X/Y placement. Selection handles resize and rotate. Properties provides exact values and Bring forward / Send backward. Guides and adjustable Grid have separate toggles. Hold Alt while dragging to move into another container. Desktop positions stack on mobile; Mobile accepts separate overrides and a reset control.
- **Backend**: add endpoints and request/validate/condition/insert/list/code/response nodes. Drag nodes. Click an output dot then a destination node to connect. Set false branches in node settings. Configuration is JSON. A request must reach a response; execution is capped at 100 steps. Tests use the `studio` record owner. Node input/output tracing is limited to identifiers, timings, and errors.
- **Database**: create tables with custom text columns, insert records, delete records, and inspect users. IDs, owners, and timestamps are automatic. Website access requires a signed-in account and is scoped by record owner. Schema alteration, arbitrary SQL, relationships, and pagination beyond the first 1000 displayed rows are not included.
- **Code**: per-page HTML, CSS, and JavaScript; custom synchronous JavaScript in backend Code nodes. Return an updated `input` from backend code. Custom HTML is not converted back into visual elements. Backend code has a 300 ms VM timeout and no provided `require` or network API. It is trusted project code, not an OS security sandbox. Async backend code and external packages are not supported.
- **Settings**: website name, global accent/background, password change, and quick guide.

Designer shortcuts: arrow keys nudge free elements by 1 px (Shift: 10 px), or reorder layout elements. Ctrl+D duplicates; Delete removes; Ctrl+Z / Ctrl+Y undo and redo. Escape cancels a drag. Shift snaps rotation to 15 degrees or preserves resize proportions. Ctrl temporarily disables snapping. Each gesture is one undo step.

The entire page is the canvas: free-position elements can reach the edges and header area. Click **Canvas** to change page background, content width, minimum height, padding, spacing and direction; mobile has separate layout overrides. Click the header to edit its title, colors, padding and visibility. Double-click headings, text or buttons to edit their text directly. Press Enter to finish or Escape to cancel.

## Encryption and portability

Each `.siforge` file contains the entire project, backend graph/code, embedded images, user hashes, and database rows. AES-256-GCM encrypts it with a scrypt-derived key (N=32768, r=8, p=1; random 16-byte salt and 12-byte nonce). Files are atomically replaced. SQLite runs in memory; no plaintext SQLite project file is created. Passwords are not stored. Website passwords use salted scrypt hashes. Sessions remain in memory and clear on lock/restart.

Keep your password safe: there is no recovery. Back up encrypted project files regularly. Encryption protects files at rest, not data visible to a running app, operating-system memory, swap, crash dumps, screenshots, or malicious code on the computer. Electron caches are redirected beside the app; pages use no-store responses. The app does not claim forensic protection.

`projects/`, `exports/`, and Electron profile/cache folders are created beside the packaged EXE. Source development uses `workspace/` instead. Upload images through Properties to embed them; external image URLs need internet and are not downloaded automatically. Offline portability applies to built-in features and embedded assets, not custom external services.

## Import and export projects

Choose **Project → Export project**, then choose where to save the `.siforge` file. This is an editable, password-encrypted copy of the whole project: pages, styles, code, backend flows, embedded assets, account hashes, and database records. It uses the current project password and does not include the app runtime.

On another Studio installation, choose **Import project** on the start screen, or **Project → Import project** while editing. Select the `.siforge` file and enter its password. Studio validates the file, saves the current project if one is open, and opens a new local copy. Imports get unique filenames; existing projects are preserved. Incorrect passwords and invalid files leave the current project open. Importing does not change the source file. The file limit is 128 MB.

## Export a website

**Project → Export website** writes a standalone folder under `exports/`, with `SI FORGE Website.exe`, the bundled runtime, and a copy of the password-encrypted project. Open the EXE, unlock the project, and the website runs locally. The exported copy has its own data. It does not deploy a public server. Runtime listeners bind to 127.0.0.1 only. HTTPS, email verification, password reset, internet hosting, and production account administration are outside this V1.

## Develop / verify

On Windows x64, install Node 24.22 or later, then run:

```powershell
npm install
npm test
npm start
npm run build
npm run test:desktop
npm run test:designer
npm run test:export
npm run test:project-transfer
```

Development dependency installation needs internet. The packaged app bundles its own runtimes and does not require npm or a separate Node installation. `npm run build` uses the installed Electron runtime and the current Node executable. `SI_ELECTRON_RUNTIME` can select another predownloaded Windows Electron runtime. The build tools also support the original local sibling runtime as a fallback, but it is not required after `npm install`.

To test a packaged build, set `SI_TEST_EXE` to its full executable path before running the desktop/export tests. Screenshots are written to `artifacts/`. Tests use temporary project directories.

Projects from the older sibling SI FORGE Studio app are not automatically migrated. That app is preserved separately.

## Local build delivery

After building and checking a new version, run `npm run deliver:local`. It creates the versioned ZIP, extracts the application into `C:\Users\norml\OneDrive\Desktop\SI FORGE STUDIO`, and opens the app there. Existing projects and exports are preserved. Existing versioned subfolders are preserved. A running app in the destination receives a normal close request before the update; it is never force-killed.
