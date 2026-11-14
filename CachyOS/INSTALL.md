# AoE4 Strategyzer — Installation on CachyOS

This guide installs the shipped pacman package `aoe4-strategyzer-<version>-x86_64.pkg.tar.zst` on CachyOS (or other Arch derivatives).

## Prerequisites

A current CachyOS (Arch-based) system with `pacman`. Runtime dependencies are installed automatically by `pacman -U`:

- `webkit2gtk-4.1`
- `gtk3`
- `librsvg`
- `glibc`

## Installation

In the folder containing the `.pkg.tar.zst`:

```bash
sudo pacman -U aoe4-strategyzer-<version>-x86_64.pkg.tar.zst
```

Confirm missing dependencies with `Y` when prompted.

The package installs:

- `/usr/bin/aoe4-strategyzer` — binary
- `/usr/share/applications/aoe4-strategyzer.desktop` — menu entry
- `/usr/share/icons/hicolor/{32x32,128x128,512x512}/apps/aoe4-strategyzer.png` — icons

## First launch

- From the application menu: **AoE4 Strategyzer** (category *Games / Strategy*)
- Or from the terminal:

```bash
aoe4-strategyzer
```

## Where does your data live?

| Data type | Location |
|---|---|
| Civ data (Civs tab) | `~/.local/share/aoe4-strategyzer/civ-data/<civ>.json` |
| Build orders (user) | `~/.local/share/aoe4-strategyzer/build-order-data/<civ>/*.json` |
| Matchups (user) | `~/.local/share/aoe4-strategyzer/matchup/*.json` |
| Tierlists (user) | `~/.local/share/aoe4-strategyzer/tierlist/*.json` |

On first launch, standard values are loaded **from the binary** — the bundled defaults (`build-order-data/`, `civ-data/`, `matchup/`, tierlist templates) are part of the program, not the package. The package installs only the binary, desktop entry and icons.

**Update guarantee:** A pacman upgrade (`pacman -U`) never touches `~/.local/share/aoe4-strategyzer/` — user-generated data (build orders, civ changes, matchups, tierlists) remains untouched by updates. Once you save something in the app data folder, only YOU can overwrite your files; the package contains no data.

## Updating to a new version

Get the new `.pkg.tar.zst` and run the same command as above:

```bash
sudo pacman -U aoe4-strategyzer-<version>-x86_64.pkg.tar.zst
```

- pacman detects the update automatically (bump `pkgrel` when rebuilding the same version).
- **User data in `~/.local/share/aoe4-strategyzer/` is guaranteed to survive** — the package installs no data, so it cannot overwrite anything.
- New/updated defaults (in the binary) apply only to user files that do not exist yet; existing files always take precedence (the app reads from the user folder first).

## Uninstallation

```bash
sudo pacman -R aoe4-strategyzer
```

To also remove user data:

```bash
rm -rf ~/.local/share/aoe4-strategyzer
```

## Troubleshooting

**App does not start, WebKit error**
Test with software rendering:

```bash
WEBKIT_DISABLE_COMPOSITING_MODE=1 aoe4-strategyzer
```

**"conflicting files" during installation**
Usually an older version is installed in parallel. Remove it first, then run `pacman -U` again.

**No menu entry visible after installation**
Refresh the icon cache:

```bash
sudo gtk-update-icon-cache -f /usr/share/icons/hicolor
```

If necessary, log out and back in (or restart the desktop environment).

**Window too large**
The app is configured for 1920×1080 (minimum 1200×700). On smaller displays it is centered on screen.
