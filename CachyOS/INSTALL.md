# AoE4 Strategyzer — Installation auf CachyOS

Diese Anleitung installiert das mitgelieferte Pacman-Paket `aoe4-strategyzer-*.pkg.tar.zst` auf CachyOS (oder anderen Arch-Derivaten).

## Voraussetzungen

Aktuelles CachyOS-System (Arch-basiert) mit `pacman`. Die Laufzeit-Dependencies werden von `pacman -U` automatisch mitinstalliert:

- `webkit2gtk-4.1`
- `gtk3`
- `librsvg`
- `glibc`

## Installation

Im Ordner, in dem die `.pkg.tar.zst` liegt:

```bash
sudo pacman -U aoe4-strategyzer-1.0.0-1-x86_64.pkg.tar.zst
```

Bei fehlenden Dependencies fragt pacman nach — mit `Y` bestätigen.

Das Paket installiert:

- `/usr/bin/aoe4-strategyzer` — Binary
- `/usr/share/applications/aoe4-strategyzer.desktop` — Menüeintrag
- `/usr/share/icons/hicolor/{32x32,128x128,512x512}/apps/aoe4-strategyzer.png` — Icons

## Erster Start

- Aus dem Anwendungsmenü: **AoE4 Strategyzer** (Kategorie *Games / Strategy*)
- Oder aus dem Terminal:

```bash
aoe4-strategyzer
```

## Wo landen deine Daten?

| Datentyp | Ort |
|---|---|
| Civ-Daten (Civs-Tab) | `~/.local/share/aoe4-strategyzer/civ-data/<civ>.json` |
| Build Orders (User) | `~/.local/share/aoe4-strategyzer/build-order-data/<civ>/*.json` |
| Matchups (User) | `~/.local/share/aoe4-strategyzer/matchup/*.json` |
| Tierlists (User) | `~/.local/share/aoe4-strategyzer/tierlist/*.json` (z. B. `tierlist-host-general.json`) |

Beim ersten Start werden Standardwerte **aus der Binary** geladen — die gebundelten Defaults (`build-order-data/`, `civ-data/`, `matchup/`, Tierlist-Vorlagen) sind **Teil der Programmdateien**, nicht des Pakets. Das Paket installiert ausschließlich Binary, Desktop-Eintrag und Icons.

**Update-Garantie:** Ein Pacman-Upgrade (`pacman -U`) berührt niemals `~/.local/share/aoe4-strategyzer/` — User-generierte Daten (Build Orders, Civ-Änderungen, Matchups, Tierlists) bleiben bei Updates unangetastet. Sobald du im App-Datenordner etwas speicherst, überschreibt nur DU deine Dateien; das Paket enthält keine Daten.

## Update auf neue Version

Neue `.pkg.tar.zst` erhalten und dieselbe Kommandozeile wie oben:

```bash
sudo pacman -U aoe4-strategyzer-<version>-x86_64.pkg.tar.zst
```

- pacman erkennt das Update automatisch (`pkgrel` hochzählen bei Nachbauten derselben Version).
- **User-Daten in `~/.local/share/aoe4-strategyzer/` bleiben garantiert erhalten** — das Paket installiert keine Daten, also kann es sie auch nicht überschreiben.
- Neue/gemischte Defaults (in der Binary) greifen nur für noch nicht vorhandene User-Dateien; bestehende überschreiben die Defaults ohnehin (die App liest primero aus dem User-Ordner).

## Deinstallation

```bash
sudo pacman -R aoe4-strategyzer
```

Um auch die User-Daten zu entfernen:

```bash
rm -rf ~/.local/share/aoe4-strategyzer
```

## Troubleshooting

**App startet nicht, WebKit-Fehler**
WebKit-Rendering-Problem — mit Software-Rendering testen:

```bash
WEBKIT_DISABLE_COMPOSITING_MODE=1 aoe4-strategyzer
```

**"conflicting files" beim Installieren**
Meist ist eine ältere Version parallel installiert (z.B. AppImage). Erst die alte Version entfernen, dann `pacman -U` erneut.

**Kein Menüeintrag sichtbar nach Installation**
Icon-Cache aktualisieren:

```bash
sudo gtk-update-icon-cache -f /usr/share/icons/hicolor
```

Ggf. neu anmelden oder Desktop-Environment neu starten.

**Fenstergröße zu groß**
Die App wurde für 1920×1080 konfiguriert (Mindestgröße 1200×700). Bei kleineren Displays wird sie zentriert eingeblendet.
