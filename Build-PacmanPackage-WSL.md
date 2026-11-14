# Building the pacman package (Winch WSL on Windows)

Guide for building an `aoe4-strategyzer-*.pkg.tar.zst` file using the Winch WSL distribution. The finished package can be installed on any Arch-based system (e.g. CachyOS) via `pacman -U`.

## Prerequisites

- Windows with WSL2 enabled.
- **Winch WSL** installed from the Microsoft Store.
- On first Winch start: create a user + set a password.

## Step 1: Update the system + install build dependencies

In the Winch terminal:

```bash
sudo pacman -Syu --noconfirm
sudo pacman -S --needed --noconfirm \
    base-devel webkit2gtk-4.1 gtk3 librsvg rust cargo pkgconf
```

If packages cannot be signed/verified (keyring errors):

```bash
sudo pacman-key --init
sudo pacman-key --populate archlinux
sudo pacman -Syy
```

## Step 2: Copy the project into the Linux file system

Building directly on `/mnt/c/...` is significantly slower (cross-filesystem
overhead) and can cause permission problems with `makepkg`. Therefore copy:

```bash
cp -r "/mnt/c/D Partition/Weiteres/AoE4 Strat Choice Tauri" ~/aoe4-strat
cd ~/aoe4-strat
ls
```

`ls` must show `PKGBUILD`, `Tauri UI/`, `packaging/` and `CachyOS/`.

## Step 3: Build the package

```bash
makepkg
```

Duration: 5–15 minutes on the first run (Rust compiles ~150 dependencies).

On repeated builds the cargo cache is warm — then only 1–2 minutes.

Result:

```bash
ls *.pkg.tar.zst
# → aoe4-strategyzer-<version>-x86_64.pkg.tar.zst
```

## Step 4: Copy the file back to Windows

```bash
cp aoe4-strategyzer-*.pkg.tar.zst "/mnt/c/D Partition/Weiteres/AoE4 Strat Choice Tauri/"
```

The `.pkg.tar.zst` file can now be transferred to CachyOS or any other Arch system.

## Step 5: Installation on the target system (CachyOS)

```bash
sudo pacman -U aoe4-strategyzer-<version>-x86_64.pkg.tar.zst
```

This installs:

- `/usr/bin/aoe4-strategyzer` — binary
- `/usr/share/applications/aoe4-strategyzer.desktop` — menu entry
- `/usr/share/icons/hicolor/{32,128,512}x{...}/apps/aoe4-strategyzer.png` — icons

User data ends up in `~/.local/share/aoe4-strategyzer/`. See
[CachyOS/INSTALL.md](CachyOS/INSTALL.md) for the full user guide.

Launch from the application menu or via `aoe4-strategyzer` in the terminal.

## Updates: only source code changed

After code changes on the Windows side:

```bash
# In Winch:
rm -rf ~/aoe4-strat
cp -r "/mnt/c/D Partition/Weiteres/AoE4 Strat Choice Tauri" ~/aoe4-strat
cd ~/aoe4-strat
makepkg -f      # -f overwrites the existing .pkg.tar.zst
cp aoe4-strategyzer-*.pkg.tar.zst "/mnt/c/D Partition/Weiteres/AoE4 Strat Choice Tauri/"
```

Before re-building, bump the version in `PKGBUILD` (`pkgver`, `pkgrel`),
otherwise pacman rejects re-installing the same package version.

**Never bundle user data:** before building, make sure
`Tauri UI/frontend/maps/maps-data.json` (and any other user files) are not
present in the copy — see [AGENTS.md](AGENTS.md) for the full user-data
policy.

## Troubleshooting

**`error: target/release/aoe4-strategyzer: No such file or directory`**
The build did not complete. Check the console output — usually a missing
dependency. Install it and run `makepkg -f` again.

**`one or more PGP signatures could not be verified`**
```bash
sudo pacman-key --refresh-keys
```

**`error: failed to run custom build command for tauri-build`**
Usually `webkit2gtk-4.1` or `pkgconf` is missing. Run again:
```bash
sudo pacman -S --needed webkit2gtk-4.1 pkgconf
```

**`error: linker cc not found`**
`base-devel` incomplete:
```bash
sudo pacman -S --needed base-devel
```

**`makepkg` running as root**
Never run with `sudo makepkg` — `makepkg` refuses. Start it as a normal user.

**Build extremely slow despite warm cache**
Probably building on `/mnt/c/...`. Always copy into the Linux home (`~/`)
first (step 2).

## Optional: test directly in WSL

Winch supports graphical applications via WSLg. You can install and test the
package right there:

```bash
sudo pacman -U aoe4-strategyzer-*.pkg.tar.zst
aoe4-strategyzer
```
