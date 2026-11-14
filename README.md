<div align="center">

# AoE4 Strategyzer

<img src="Images/Title-Image-AoE4-Strategyzer.png" alt="AoE4 Strategyzer">

</div>

Desktop app for Age of Empires IV strategy management — build orders, civilization profiles, matchup notes, map tierlists and strategic quotes, built with [Tauri 2](https://tauri.app) (Rust backend, vanilla JavaScript frontend).

## Features

- **Match Setup** — the core of the app: pick your civilization and the (expected) opponent, and get a thematically embedded view with opponent-specific build orders, matchup notes, map info and the matching tierlist context per matchup
- **Build Order Library** — per-civilization build orders with creator/editors, type chips (Rush, Boom, Fast Castle, …), opponent flags, export/import and per-card export
- **Matchup Notes** — per-opponent civilizations and map types, matchup profiles with sync from build order data
- **Civs** — civilization profiles with editable sections (General Approach, Strengths, Weaknesses, …), embedded Match Setup and Build Order filter
- **Maps** — map pool management, map type notes and civilization tierlists (ranked / team-ranked), team-game tierlists for 2v2/3v3/4v4 with role filters
- **Themes** — three app themes: Classic White, Parchment and Bayeux Blue (dark navy with gold headings)
- **Data safety** — user-generated data lives outside the app and survives updates

## Installation

### Windows

Download the latest installer directly:

- [**AoE4 Strategyzer Setup** (NSIS installer, recommended)](https://github.com/mexxez16/AoE4-Strategyzer/releases/latest/download/AoE4.Strategyzer_0.1.1_x64-setup.exe)
- [**AoE4 Strategyzer** (MSI, alternative)](https://github.com/mexxez16/AoE4-Strategyzer/releases/latest/download/AoE4.Strategyzer_0.1.1_x64_en-US.msi)

Or browse all files on the [Releases](https://github.com/mexxez16/AoE4-Strategyzer/releases) page.

### Arch Linux / CachyOS

Download the [pacman package](https://github.com/mexxez16/AoE4-Strategyzer/releases/latest/download/aoe4-strategyzer-0.1.1-1-x86_64.pkg.tar.zst) and install it:

```bash
sudo pacman -U aoe4-strategyzer-0.1.1-1-x86_64.pkg.tar.zst
```

Installs for new setups and upgrades existing ones. See [CachyOS/INSTALL.md](CachyOS/INSTALL.md) for details.

### Build from source

Requirements: [Rust](https://www.rust-lang.org) (stable) plus the platform prerequisites for Tauri 2 (e.g. WebView2 on Windows, `webkit2gtk-4.1` on Linux).

```bash
# Run in dev mode (frontend loads from disk)
cd "Tauri UI"
cargo run

# Build a release bundle (installer, msi/deb/…)
npx -y @tauri-apps/cli@latest build
```

## User data

All user-generated content is stored under the app data directory (`%APPDATA%` on Windows, `~/.local/share/aoe4-strategyzer/` on Linux) and is **never overwritten by updates**:

| Content | Location |
|---|---|
| civ profiles | `civ-data/` |
| build orders | `build-order-data/<civ>/*.json` |
| matchup data | `matchup/*.json` |
| tierlists | `tierlist/*.json` |
| map pool & notes | `maps/` |

Defaults (flag assets, resource icons, stock data) are embedded in the binary; deleting user data restores factory values.

## Project layout

```
Tauri UI/            Tauri 2 app (Rust src/, frontend/, capabilities/)
  frontend/          Vanilla JS/HTML/CSS single-page frontend
packaging/           Desktop entry for Linux packaging
PKGBUILD             Arch/CachyOS package definition
CachyOS/             Linux install documentation
```

## License

Released under the [MIT License](LICENSE).

## Disclaimer

Age of Empires IV © Microsoft Corporation.

This project was created under Microsoft's ["Game Content Usage Rules"](https://www.xbox.com/en-us/developers/rules) using assets from Age of Empires IV, and it is not endorsed by or affiliated with Microsoft or Worlds Edge.
