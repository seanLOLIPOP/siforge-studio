# SI FORGE STUDIO — Native 2.0.1 Preview

A portable Windows website builder with WPF desktop controls, a WebView2 website canvas, connected backend flows, custom code, encrypted projects, accounts and a database.

This is the compatibility-first native migration build. Design, Navbar Studio, shadows, backend nodes, database tools, code editing, project transfer, encryption and runnable website exports remain available. The C#/.NET 10 WPF presentation layer uses native controls; the shared editing controller and Node backend still use JavaScript during this stage. Website rendering remains HTML/CSS/JavaScript. It is not a complete rewrite of the editing engine.

Download the portable Windows ZIP from [Releases](https://github.com/seanLOLIPOP/siforge-studio/releases). The source-code ZIP is for development; use the named Windows release asset to run the app.

## Start

Open `release/SI FORGE STUDIO Native/SI FORGE STUDIO.exe`. Keep the entire folder together in a writable location. The native ZIP includes .NET, Node and a fixed WebView2 runtime. No installation, Node setup, .NET setup or runtime download is required. The build targets Windows x64; it is unsigned.

Create a project with a password of at least 10 characters. Blank page is the default: no header, preset content, margins or padding. The full viewport is usable, and dropped components start in free position at the drop coordinates. New pages are also blank. Select Accounts and database when creating a project to use the original starter. That starter has a home page, signup/signin, a dashboard, a task form, a tasks table, and a working backend flow. Choose **Run website**, create an account, and save a task. The Database workspace displays project records and website accounts.

The native desktop interface uses a dark workspace. Use **Inspector** in the top toolbar to hide or show properties and expand the canvas. This changes the editor chrome only; website colors follow your project.

## Workspaces

- **Design**: click or drag components to add them; select on the canvas or in Layers. Edit text, style, fields, table bindings, and form endpoints. Drag layers to reorder or nest. Desktop/mobile preview, mobile style overrides (600 px breakpoint), saved reusable blocks, duplicate, delete, undo/redo, and page settings are included. Drag elements to reorder in Layout mode, or choose Free position for overlap and exact X/Y placement. Selection handles resize and rotate. Properties provides exact values and Bring forward / Send backward. Guides and adjustable Grid have separate toggles. Hold Alt while dragging to move into another container. Desktop positions stack on mobile; Mobile accepts separate overrides and a reset control.
- **Navbar Studio**: create reusable navbars with logo-left, centered-logo, split, floating and sidebar presets. Drag items between left/center/right sections or use the section selector and move buttons. Add links, buttons, icon links, dropdowns and large panels with columns, headings, descriptions and embedded images. Adjust colors, height, padding, gaps, corners, shadows, borders, transparency and sticky positioning. Set tablet/mobile breakpoints, device visibility, collapse behavior, and drawer/dropdown/full-screen menus. Assign one saved navbar to selected pages or all pages. Duplicate presets to make variations. Sign-in opens a working account dialog; signed-in users get an email menu and Sign out. Authentication stays on the current page. Existing project import/export includes saved navbars.
- **Backend**: add endpoints and request/validate/condition/insert/list/code/response nodes. Drag nodes. Click an output dot then a destination node to connect. Set false branches in node settings. Configuration is JSON. A request must reach a response; execution is capped at 100 steps. Tests use the `studio` record owner. Node input/output tracing is limited to identifiers, timings, and errors.
- **Database**: create tables with custom text columns, insert records, delete records, and inspect users. IDs, owners, and timestamps are automatic. Website access requires a signed-in account and is scoped by record owner. Schema alteration, arbitrary SQL, relationships, and pagination beyond the first 1000 displayed rows are not included.
- **Code**: per-page HTML, CSS, and JavaScript; custom synchronous JavaScript in backend Code nodes. Return an updated `input` from backend code. Custom HTML is not converted back into visual elements. Backend code has a 300 ms VM timeout and no provided `require` or network API. It is trusted project code, not an OS security sandbox. Async backend code and external packages are not supported.
- **Settings**: website name, global accent/background, password change, and quick guide.

Designer shortcuts: arrow keys nudge free elements by 1 px (Shift: 10 px), or reorder layout elements. Ctrl+D duplicates; Delete removes; Ctrl+Z / Ctrl+Y undo and redo. Escape cancels a drag. Shift snaps rotation to 15 degrees or preserves resize proportions. Ctrl temporarily disables snapping. Each gesture is one undo step.

The entire page is the canvas: free-position elements can reach the edges and header area. Click **Canvas** to change page background, content width, minimum height, padding, spacing and direction; mobile has separate layout overrides. Click the header to edit its title, colors, padding and visibility. Double-click headings, text or buttons to edit their text directly. Press Enter to finish or Escape to cancel.

## Encryption and portability

Each `.siforge` file contains the entire project, backend graph/code, embedded images, user hashes, and database rows. AES-256-GCM encrypts it with a scrypt-derived key (N=32768, r=8, p=1; random 16-byte salt and 12-byte nonce). Files are atomically replaced. SQLite runs in memory; no plaintext SQLite project file is created. Passwords are not stored. Website passwords use salted scrypt hashes. Sessions remain in memory and clear on lock/restart.

Keep your password safe: there is no recovery. Back up encrypted project files regularly. Encryption protects files at rest, not data visible to a running app, operating-system memory, swap, crash dumps, screenshots, or malicious code on the computer. Native WebView2 profiles are stored in `.native-data` beside the app; classic Electron caches also stay beside the classic app; pages use no-store responses. The app does not claim forensic protection.

`projects/`, `exports/`, and desktop profile/cache folders are created beside the packaged EXE. Source development uses `workspace/` instead. Upload images through Properties to embed them; external image URLs need internet and are not downloaded automatically. Offline portability applies to built-in features and embedded assets, not custom external services.

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
npm run test:navbar
npm run test:shadows
npm run test:export
npm run test:project-transfer
```

Native development requires the .NET 10 SDK and an extracted fixed x64 WebView2 runtime. `scripts/package-native.ps1` accepts `-Dotnet` and `-WebViewRuntime` paths; its defaults use the local SIForgeBuildTools cache. NuGet restore needs internet on the first build. `npm run test:native` exercises real WPF controls and a moved native website export. `npm run build:classic` and `npm run start:classic` preserve the classic tooling.

Development dependency installation needs internet. The packaged app bundles its own runtimes and does not require npm or a separate Node installation. `npm run build` publishes the self-contained WPF application, copies the fixed WebView2 runtime, and bundles the current Node executable. The classic build uses the installed Electron runtime. `SI_ELECTRON_RUNTIME` can select another predownloaded Windows Electron runtime. The build tools also support the original local sibling runtime as a fallback, but it is not required after `npm install`.

To test a packaged build, set `SI_TEST_EXE` to its full executable path before running the desktop/export tests. Screenshots are written to `artifacts/`. Tests use temporary project directories.

Projects from the older sibling SI FORGE Studio app are not automatically migrated. That app is preserved separately.

## Local build delivery

After building and checking a native version, run `npm run deliver:local`. It creates the versioned native ZIP and opens the preview in `C:\Users\norml\OneDrive\Desktop\SI FORGE STUDIO\SI FORGE STUDIO Native`. The classic app stays at the parent location. Existing encrypted project files are copied into the native preview without modifying the originals. Subsequent edits in the two app folders are separate. Import/export `.siforge` files to transfer changes. `npm run deliver:classic` preserves the old delivery workflow.

## Navbar Studio

Open Navbar in the left rail, choose New navbar and pick a variation. Click an item to edit its label, destination, section and device visibility; use + beside Items to add more. Choose Dropdown or Large panel to add panel links. Choose Navbar in Properties to edit the brand and overall appearance. Tablet and Mobile preview the configured breakpoints at actual device widths; the desktop preview scrolls horizontally in a narrow workspace. Click Use on pages checkboxes or Apply to all pages. Page checkboxes take effect immediately and are saved automatically. Use Run website to test real account sign-in; the editor preview shows the account dialog without sending credentials.

Navbar presets are stored in the encrypted project. Per-page header settings remain available on pages without an assigned navbar. A navbar has its own responsive breakpoints, independent of the page designer's 600 px breakpoint. Menus open by click or keyboard; Escape closes them. Dropdowns support one panel level, with up to four columns in a large panel. Sidebar width is 260 px. CSS may be extended in Code; it does not become visual navbar controls.

## Shadow generator

In Design, select an element and find Shadow generator in Properties. In Navbar Studio, select Navbar or an item to edit its shadows. Apply to Element changes the box shadow; Apply to Text changes shadows along the letter shapes. Choose Soft, Hard, Inset, Glow, Raised, 3D extrusion or Long shadow. Inset and Raised apply to element boxes.

Color follows can use the background, current text color, theme accent or a custom color. Linked effects update with those colors; text shadows follow edited text automatically. Adjust horizontal/vertical offsets, blur, spread, strength and 3D layer count. Mobile Design supports overrides and Reset mobile shadows. Choose None to remove an effect. Effects persist in encrypted projects and website exports. These are CSS shadow effects, including layered 3D extrusion; they do not add a 3D lighting engine. Solid background colors drive background-linked shadows; gradients use the theme accent as a fallback.

## Migration performance status

The first blank-project process-tree sample used about 368 MiB of private allocation for the native build versus 286 MiB for classic Electron 1.5. This is a single-machine private-bytes sample, not a peak-RAM or startup benchmark. A lower-memory result has not been demonstrated. WPF controls, native backend dragging, virtualized database grids, reduced duplicate field updates, and suppression of embedded-image data URLs in native control snapshots are implemented, but broad performance tuning is still needed. The preview is kept alongside the classic app for this reason.

The native test pipe and WebView debugging port are created only when explicit test environment variables are supplied. Normal launches expose neither. Website pages have no desktop bridge. Native project dialogs restrict editable project files to `.siforge` and retain the 128 MB limit.
