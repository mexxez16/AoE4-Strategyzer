# AoE4 Strategyzer — Installation auf CachyOS

Anleitung zum Bauen und Installieren der App auf CachyOS (Arch-basiert).

## Voraussetzungen

System-Pakete über `pacman` installieren:

```bash
sudo pacman -S --needed base-devel curl wget file openssl \
    webkit2gtk-4.1 librsvg \
    rust cargo
```

Optional für Bundle-Pakete (`.deb`, `.rpm`, `.AppImage`):

```bash
sudo pacman -S --needed dpkg rpm-tools
```

Tauri CLI installieren (benötigt für `cargo tauri build`):

```bash
cargo install tauri-cli --version "^2.0"
```

## Projekt übertragen

Den Projektordner `Tauri UI/` auf CachyOS kopieren — **ohne** `target/`, da dort plattformspezifische Build-Artefakte liegen.

Beispiel per USB-Stick, Netzwerk-Share oder Git:

```bash
# in den Projektordner wechseln
cd ~/projects/aoe4-strategyzer/Tauri\ UI/
```

## Dev-Modus (zum Testen)

```bash
cargo tauri dev
```

Startet einen Debug-Build mit Devtools (F12 funktioniert). Erste Kompilierung dauert 5–15 Minuten.

Alternativ ohne Tauri-CLI:

```bash
cargo run
```

## Release-Build (zum Installieren)

```bash
cargo tauri build
```

Erzeugt fertige Pakete unter `target/release/bundle/`:

- `appimage/aoe4-strategyzer_1.0.0_amd64.AppImage` — portable, keine Installation nötig
- `deb/aoe4-strategyzer_1.0.0_amd64.deb` — für Debian/Ubuntu
- `rpm/aoe4-strategyzer-1.0.0-1.x86_64.rpm` — Arch kann RPMs installieren, nativ aber unüblich

Die Binary alleine liegt unter `target/release/aoe4-strategyzer` und kann direkt ausgeführt werden.

## Installation als AppImage (empfohlen auf Arch)

```bash
chmod +x target/release/bundle/appimage/aoe4-strategyzer_1.0.0_amd64.AppImage
./target/release/bundle/appimage/aoe4-strategyzer_1.0.0_amd64.AppImage
```

Optional in Menü integrieren: Die AppImage nach `~/Applications/` kopieren und über ein Tool wie `appimaged` oder `AppImageLauncher` (AUR) einbinden.

## Installation als natives Pacman-Paket (empfohlen für Arch/CachyOS)

Im Projekt-Root liegt eine `PKGBUILD`-Datei. Im Projekt-Verzeichnis (also dort, wo `PKGBUILD` und `Tauri UI/` liegen) folgendes ausführen:

```bash
makepkg -si
```

`makepkg` baut die Release-Version, packt sie zu `aoe4-strategyzer-1.0.0-1-x86_64.pkg.tar.zst` und `-i` installiert sie direkt via `pacman`. Das Paket installiert:

- `/usr/bin/aoe4-strategyzer` — Binary
- `/usr/share/applications/aoe4-strategyzer.desktop` — Menüeintrag
- `/usr/share/icons/hicolor/{32x32,128x128,512x512}/apps/aoe4-strategyzer.png` — Icons

Civ-Daten werden im Release-Build unter `$XDG_DATA_HOME/aoe4-strategyzer/civ-data/` gespeichert (typischerweise `~/.local/share/aoe4-strategyzer/civ-data/`).

Deinstallation:

```bash
sudo pacman -R aoe4-strategyzer
```

## Installation als .deb (falls gewünscht)

CachyOS unterstützt `.deb` nicht direkt. Entweder AppImage nutzen oder mit `debtap` (AUR) nach Arch konvertieren:

```bash
yay -S debtap
sudo debtap -u
debtap target/release/bundle/deb/aoe4-strategyzer_1.0.0_amd64.deb
sudo pacman -U aoe4-strategyzer-*.pkg.tar.zst
```

## Bekannte Einschränkungen

- **Fonts**: `frontend/fonts/` ist leer (Trajan Pro ist kommerziell). Die App nutzt Fallback auf System-Schrift. Optional Cinzel von Google Fonts in `frontend/fonts/` ablegen.
- **Build-Order-Daten** fehlen für: `french-jd`, `knights-templar`, `mali`, `order-of-the-dragon`, `ottoman`, `golden-horde`. Diese Zivilisationen sind in `civilizations.js` gelistet, haben aber keinen Datenordner. Keine fatalen Fehler, nur leere Listen in der UI.

## Troubleshooting

**`webkit2gtk-4.0 not found`** — Tauri 2 nutzt `4.1`. Sicherstellen, dass `webkit2gtk-4.1` (nicht `4.0`) installiert ist:

```bash
pacman -Qi webkit2gtk-4.1
```

**`error: linker cc not found`** — `base-devel` nachinstallieren.

**App startet, aber leeres Fenster** — WebKit-Rendering-Problem. Mit Software-Rendering testen:

```bash
WEBKIT_DISABLE_COMPOSITING_MODE=1 ./aoe4-strategyzer
```

**Fenstergröße zu groß für Display** — Die Config setzt `width: 1920, height: 1080`. Bei kleineren Monitoren wird die App zentriert, Mindestgröße ist 1200×700. Anpassbar in `tauri.conf.json`.

## Deinstallation

- AppImage: Datei löschen.
- Über Paket installiert: `sudo pacman -R aoe4-strategyzer`.
