# AGENTS.md — AoE4 Strategyzer

General rules for agents. They apply across platforms: Windows (Tauri
NSIS/MSI installers) and CachyOS/Arch (PKGBUILD/Pacman package).

## User-Data Policy (top rule)

Content created or edited by the user belongs to the user — the installer
never bundles user data, and an installation never overwrites any.

### 1. No user data in the installer / package

Before EVERY installer build (Windows `tauri build`, CachyOS `makepkg`),
make sure only factory-default content is packed.

**Important (code reality):** The app loads factory data via `fetch()` from
the bundle — without it, fresh installations would be empty. These
directories therefore belong in the bundle:
- `Tauri UI/frontend/build-order-data/<civ>/*.json` — exactly the set from
  the `knownBuildOrders` list in `js/tauri-adapter.js`
- `Tauri UI/frontend/matchup/*-matchups.json` — according to `knownMatchupCivs`
- `Tauri UI/frontend/civ-data/*.json` (fallback defaults)
- `Tauri UI/frontend/maps/maps-data-default.json` (unchanged, factory)
- Static assets: `Flags/`, `Icons/`, `Images/`, code (`js/`, `style.css`,
  `index.html`)

**Never pack:**
- `Tauri UI/frontend/maps/maps-data.json` — legacy fallback containing real
  user edits (notes, tier rankings); the app does not need it, defaults +
  APPDATA work fine without it.
- All user files outside the factory lists: build orders not listed in
  `knownBuildOrders` are user content → remove them from the bundle.
- Practically: before a build, delete user data only in the build copy,
  never in the original working directory.

### 2. Installation never overwrites user data

- User data lives exclusively in the user directory:
  - Windows: `%APPDATA%\com.aoe4.strategyzer\`
  - Linux/CachyOS: `~/.local/share/aoe4-strategyzer/` (or `$XDG_DATA_HOME`)
- Installers and installation routines must **never write to, rename or
  delete** anything in this directory — including during updates.
- Seed defaults **only when the file does not exist yet**
  (create-if-missing, never overwrite). If a user file exists, it is always
  the authoritative version.
- Factory defaults (`maps-data-default.json`, embedded defaults) are updated
  by updates and merged with the APPDATA user data — user edits therefore
  never revert defaults.
- Uninstallation only removes global app files (binary, desktop entry,
  icons), never the user directory.

### 3. When code or packaging changes

- New, replaceable data belongs in the default schema (binary or
  `*-default.json`), not in a path the user can edit.
- After code changes, verify that the separation between "default
  (read-only, from bundle/binary) vs. user (APPDATA, can override)" remains
  intact.
