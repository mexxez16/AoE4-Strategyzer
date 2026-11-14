# AGENTS.md — AoE4 Strategyzer

Allgemeingültige Regeln für Agenten. Sie gelten plattformübergreifend für
Windows (Tauri NSIS/MSI-Installer) und CachyOS/Arch (PKGBUILD/Pacman-Paket).

## User-Data-Richtlinie (oberste Regel)

Vom Nutzer erstellte oder bearbeitete Inhalte gehören dem Nutzer — der
Installer packt niemals Nutzerdaten mit und eine Installation
überschreibt niemals welche.

### 1. Keine Nutzerdaten in den Installer / das Paket

Vor JEDEM Build eines Installers (Windows `tauri build`, CachyOS `makepkg`)
sicherstellen, dass nur Factory-Default-Inhalt gepackt wird.

**Wichtig (Code-Realität):** Die App lädt die Factory-Daten per `fetch()` aus
dem Bundle — ohne sie wären frische Installationen leer. Diese Verzeichnisse
gehören also ins Bundle:
- `Tauri UI/frontend/build-order-data/<civ>/*.json` — genau der Satz aus der
  `knownBuildOrders`-Liste in `js/tauri-adapter.js`
- `Tauri UI/frontend/matchup/*-matchups.json` — laut `knownMatchupCivs`
- `Tauri UI/frontend/civ-data/*.json` (Fallback-Defaults)
- `Tauri UI/frontend/maps/maps-data-default.json` (unverändert, factory)
- Statische Assets: `Flags/`, `Icons/`, `Images/`, Code (`js/`, `style.css`,
  `index.html`)

**Niemals packen:**
- `Tauri UI/frontend/maps/maps-data.json` — Legacy-Fallback mit echten
  Nutzerbearbeitungen (Notizen, Tier-Rankings); die App braucht sie nicht,
  Defaults + APPDATA greifen ohne sie normal.
- Alle Nutzerdateien außerhalb der Factory-Listen: Build-Orders, die nicht in
  `knownBuildOrders` stehen, sind Nutzer-Content → aus dem Bundle entfernen.
- Praktisch: Vor einem Build-Nutzerdaten nur in der Build-Kopie löschen,
  niemals im Original-Arbeitsverzeichnis.

### 2. Installation überschreibt keine Nutzerdaten

- Nutzerdaten liegen ausschließlich im Nutzerverzeichnis:
  - Windows: `%APPDATA%\com.aoe4.strategyzer\`
  - Linux/CachyOS: `~/.local/share/aoe4-strategyzer/` (bzw. `$XDG_DATA_HOME`)
- Installer und Installationsroutinen dürfen in dieses Verzeichnis
  **nie schreiben, umbenennen oder löschen** — auch nicht bei Updates.
- Defaults nur **seeden, wenn die Datei noch nicht existiert**
  (Create-if-missing, niemals Overwrite). Existiert eine Nutzerdatei, gilt
  sie immer als wahre Version.
- Factory-Defaults (`maps-data-default.json`, embedded Defaults) werden von
  Updates aktualisiert und werden zusammen mit den APPDATA-Nutzerdaten
  gemergt — Nutzeredits setzen dadurch niemals Defaults zurück.
- Deinstallation entfernt nur globale App-Dateien (Binary, Desktop-Entry,
  Icons), nie das Nutzerverzeichnis.

### 3. Wenn Code oder Paketierung geändert wird

- Neue, austauschbare Daten gehören ins Default-Schema (Binary oder
  `*-default.json`), nicht in einen Pfad, den der Nutzer bearbeiten kann.
- Nach Code-Änderungen prüfen, dass die Trennung "Default (read-only, aus
  Bundle/Binary) vs. Nutzer (APPDATA, can-override)" bestehen bleibt.
