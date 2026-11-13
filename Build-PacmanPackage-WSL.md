# Pacman-Paket bauen (Winch WSL auf Windows)

Anleitung zum Bauen einer `aoe4-strategyzer-*.pkg.tar.zst`-Datei über die Winch-WSL-Distribution. Das fertige Paket ist auf jedem Arch-basierten System (z.B. CachyOS) per `pacman -U` installierbar.

## Voraussetzungen

- Windows mit WSL2 aktiviert.
- **Winch WSL** aus dem Microsoft Store installiert.
- Beim ersten Start in Winch: User anlegen + Passwort setzen.

## Schritt 1: System aktualisieren + Build-Dependencies

Im Winch-Terminal:

```bash
sudo pacman -Syu --noconfirm
sudo pacman -S --needed --noconfirm \
    base-devel webkit2gtk-4.1 gtk3 librsvg rust cargo pkgconf
```

Falls keine Pakete signiert werden können (Keyring-Fehler):

```bash
sudo pacman-key --init
sudo pacman-key --populate archlinux
sudo pacman -Syy
```

## Schritt 2: Projekt ins Linux-Dateisystem kopieren

Direkt auf `/mnt/c/...` zu bauen ist deutlich langsamer (Cross-Filesystem-Overhead) und kann zu Permission-Problemen mit `makepkg` führen. Daher kopieren:

```bash
cp -r "/mnt/c/D Partition/Weiteres/AoE4 Strat Choice Tauri" ~/aoe4-strat
cd ~/aoe4-strat
ls
```

`ls` muss `PKGBUILD`, `Tauri UI/`, `packaging/` und `CachyOS-Install.md` zeigen.

## Schritt 3: Paket bauen

```bash
makepkg
```

Dauer: 5–15 Min beim ersten Mal (Rust kompiliert ~150 Dependencies).

Bei wiederholten Builds ist der Cargo-Cache warm — dann nur 1–2 Min.

Resultat:

```bash
ls *.pkg.tar.zst
# → aoe4-strategyzer-1.0.0-1-x86_64.pkg.tar.zst
```

## Schritt 4: Datei zurück nach Windows kopieren

```bash
cp aoe4-strategyzer-*.pkg.tar.zst "/mnt/c/D Partition/Weiteres/AoE4 Strat Choice Tauri/"
```

Die `.pkg.tar.zst`-Datei kann jetzt auf CachyOS oder jedes andere Arch-System übertragen werden.

## Schritt 5: Installation auf dem Zielsystem (CachyOS)

```bash
sudo pacman -U aoe4-strategyzer-1.0.0-1-x86_64.pkg.tar.zst
```

Das installiert:

- `/usr/bin/aoe4-strategyzer` — Binary
- `/usr/share/applications/aoe4-strategyzer.desktop` — Menüeintrag
- `/usr/share/icons/hicolor/{32,128,512}x{...}/apps/aoe4-strategyzer.png` — Icons

Civ-Daten landen unter `~/.local/share/aoe4-strategyzer/civ-data/`.

Start aus dem Anwendungsmenü oder per `aoe4-strategyzer` im Terminal.

## Updates: nur Quellcode geändert

Nach Code-Änderungen unter Windows:

```bash
# In Winch:
rm -rf ~/aoe4-strat
cp -r "/mnt/c/D Partition/Weiteres/AoE4 Strat Choice Tauri" ~/aoe4-strat
cd ~/aoe4-strat
makepkg -f      # -f überschreibt das bestehende .pkg.tar.zst
cp aoe4-strategyzer-*.pkg.tar.zst "/mnt/c/D Partition/Weiteres/AoE4 Strat Choice Tauri/"
```

Vor dem Re-Build die Versionsnummer in `PKGBUILD` (`pkgver=1.0.0`, `pkgrel=1`) hochzählen, sonst lehnt Pacman das alte Paket beim Re-Install ab.

## Troubleshooting

**`error: target/release/aoe4-strategyzer: No such file or directory`**
Build hat nicht durchgelaufen. Output über die Konsole prüfen — meist eine fehlende Dependency. Nachinstallieren und `makepkg -f` nochmal.

**`one or more PGP signatures could not be verified`**
```bash
sudo pacman-key --refresh-keys
```

**`error: failed to run custom build command for tauri-build`**
Meist fehlt `webkit2gtk-4.1` oder `pkgconf`. Erneut:
```bash
sudo pacman -S --needed webkit2gtk-4.1 pkgconf
```

**`error: linker cc not found`**
`base-devel` nicht vollständig:
```bash
sudo pacman -S --needed base-devel
```

**`makepkg` läuft als root**
Niemals mit `sudo makepkg` ausführen — `makepkg` weigert sich. Als normaler User starten.

**Build extrem langsam trotz warmem Cache**
Vermutlich wird auf `/mnt/c/...` gebaut. Immer ins Linux-Home (`~/`) kopieren (Schritt 2).

## Optional: Direkt in WSL testen

Winch unterstützt grafische Anwendungen via WSLg. Du kannst das Paket dort auch installieren und testen:

```bash
sudo pacman -U aoe4-strategyzer-*.pkg.tar.zst
aoe4-strategyzer
```
