// Global app theme switcher (Classic White / Pergament / Bayeux Blue)
// Applies a body-level theme class so every section (Build Orders,
// Tierlist, Civs, Maps, ...) is themed consistently.

(function () {
    const THEME_KEY = 'aoe4-app-theme';
    const THEMES = ['classic-white', 'parchment', 'bayeux-blue'];
    const ALIASES = { 'scroll': 'bayeux-blue' };

    function normalize(theme) {
        if (THEMES.includes(theme)) return theme;
        if (ALIASES[theme]) return ALIASES[theme];
        return null;
    }

    function getAppTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        // Migrate demo-less legacy themes (e.g. the removed "scroll")
        return normalize(saved) || 'classic-white';
    }

    // Apply the theme to <body> and sync the toggle buttons in the header
    function applyAppTheme(theme) {
        theme = normalize(theme) || 'classic-white';

        document.body.classList.remove(...THEMES.map(t => `theme-${t}`));
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem(THEME_KEY, theme);

        document.querySelectorAll('.theme-toggle .theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }

    applyAppTheme(getAppTheme());

    window.setAppTheme = applyAppTheme;
})();