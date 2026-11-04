# SI FORGE STUDIO 1.0.0

Portable Windows x64 website studio with a light workspace.

- Visual frontend canvas with drag/drop, nested components, pages, reusable blocks, undo/redo, and mobile style overrides.
- Backend node graphs with validation, conditions, database insert/list, custom JavaScript, responses, and execution logs.
- Per-page HTML, CSS, and JavaScript editors.
- Working signup/signin starter, dashboard, account-owned records, and database tools.
- Entire projects, backend code, embedded assets, account hashes, and database contents encrypted with AES-256-GCM and a password-derived key.
- Bundled Electron and Node runtimes; built-in features run offline without installation.
- Export a separate password-encrypted local website with its own bundled runtime.

## Download and run

Download **SI-FORGE-STUDIO-1.0.0-Windows-x64.zip**, extract the complete folder to a writable location, and open **SI FORGE STUDIO.exe**. Keep all files together. Create a project and keep its password safe: there is no password recovery.

The Windows build is unsigned. V1 serves websites locally; public hosting is not included. Custom columns are text. Backend code nodes are synchronous trusted JavaScript, not an OS sandbox.

## Validation

Core encryption/account/database/flow tests and packaged desktop integration tests passed on Windows. A standalone website export was moved to another folder, launched, signed into, and used to read and add persisted records. Save-on-close and desktop privilege isolation were checked. See VALIDATION.md for scope and limitations.
