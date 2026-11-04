# SI FORGE STUDIO 1.1.0

Import and export editable, password-encrypted projects.

- **Project → Export project** saves a `.siforge` file containing pages, styles, code, backend flows, embedded assets, accounts, and database records.
- **Project → Import project**, or **Import project** on the start screen, opens a project file using its password.
- Imports create separate local copies. Invalid files, wrong passwords, and canceled dialogs preserve the current project.
- **Project → Export website** remains available for standalone runnable website folders.

Existing project files remain compatible. This update does not rewrite the text in existing websites.

## Download and run

Download **SI-FORGE-STUDIO-1.1.0-Windows-x64.zip**, extract the complete folder to a writable location, and open **SI FORGE STUDIO.exe**. Keep all files together. Import a previous build’s `.siforge` files or copy its `projects` folder into the new app folder. Keep your project password safe: there is no password recovery.

The Windows build is unsigned. V1 serves websites locally; public hosting is not included. Custom columns are text. Backend code nodes are synchronous trusted JavaScript, not an OS sandbox.

## Validation

Core tests, packaged editor tests, standalone website export tests, and native project transfer integration passed on Windows. See VALIDATION.md for scope and limitations.
