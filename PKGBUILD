# Maintainer: Max Pestemer <max.pestemer@gmail.com>
pkgname=aoe4-strategyzer
pkgver=1.0.0
pkgrel=2
pkgdesc="Strategy helper for Age of Empires IV: build orders, tierlists, matchups"
arch=('x86_64')
# =====================================================================
# User-Data-Richtlinie:
#   Neue Installationen  -> App seedet Defaults selbst (in der Binary)
#   Updates/Upgrades     -> User-Daten liegen in $XDG_DATA_HOME und werden
#                           von pacman NIE angefasst (nicht Teil von $pkgdir)
#   Bewusst NICHT im Paket: build-order-data/, civ-data/, matchup/,
#   *-tierlist.json — sie gehoeren dem User, niemals dem Package.
# =====================================================================
url=""
license=('custom')
depends=('webkit2gtk-4.1' 'gtk3' 'librsvg' 'glibc')
makedepends=('rust' 'cargo' 'pkgconf' 'base-devel')
options=('!strip' '!debug')

build() {
    cd "$startdir/Tauri UI"
    export CARGO_TARGET_DIR="$srcdir/target"
    cargo build --release --locked --manifest-path Cargo.toml
}

package() {
    cd "$startdir"

    # Binary
    install -Dm755 "$srcdir/target/release/aoe4-strategyzer" \
        "$pkgdir/usr/bin/aoe4-strategyzer"

    # Desktop entry
    install -Dm644 "packaging/aoe4-strategyzer.desktop" \
        "$pkgdir/usr/share/applications/aoe4-strategyzer.desktop"

    # Icons
    install -Dm644 "Tauri UI/frontend/Icons/icon.png" \
        "$pkgdir/usr/share/icons/hicolor/512x512/apps/aoe4-strategyzer.png"
    install -Dm644 "Tauri UI/frontend/Icons/128x128.png" \
        "$pkgdir/usr/share/icons/hicolor/128x128/apps/aoe4-strategyzer.png"
    install -Dm644 "Tauri UI/frontend/Icons/32x32.png" \
        "$pkgdir/usr/share/icons/hicolor/32x32/apps/aoe4-strategyzer.png"
}
