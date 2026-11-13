// Tierlist functionality
// Tierlists are rendered dynamically (no static tier rows in index.html).
// Supported views: general, personal, and team-game tierlists per
// game size (2v2/3v3/4v4) and role (Boomer, Cav, Infantry, FC, ...).

// Tierlist data structure: slug -> { [tierId]: [civId, ...] }
let tierlistData = {};

// Ordered tier ids per tierlist (S-D by default, custom tiers appended)
let tierOrder = {};

let currentTierlistType = 'general';
let teamGameSize = '2v2';
let teamGameRole = 'default';
let draggedCiv = null;
let tierDragDropEnabled = false; // Flag to prevent duplicate event listeners

const DEFAULT_TIERS = ['S', 'A', 'B', 'C', 'D'];

// Tier colors matching the project's gold/blue scheme (S = gold ... D = deep blue)
const DEFAULT_TIER_STYLES = {
    'S': { background: '#f3be6e', color: '#3a2d12' },
    'A': { background: '#c8873f', color: '#fdf6e9' },
    'B': { background: '#7d99b5', color: '#f4f0e6' },
    'C': { background: '#567a9c', color: '#f4f0e6' },
    'D': { background: '#2f4d6b', color: '#f4f0e6' }
};

// Palette cycled through by custom tiers
const CUSTOM_TIER_PALETTE = [
    { background: '#8d6cc8', color: '#f4f0e6' },
    { background: '#4f9d69', color: '#f4f0e6' },
    { background: '#c86a6a', color: '#f4f0e6' },
    { background: '#6cc8bd', color: '#22403c' },
    { background: '#c8a24f', color: '#3a2d12' }
];

const TEAM_GAME_SIZES = ['2v2', '3v3', '4v4'];

const TEAM_GAME_ROLES = [
    { id: 'default', label: 'Allround' },
    { id: 'boomer', label: 'Boomer' },
    { id: 'cav', label: 'Cav' },
    { id: 'infantry', label: 'Infantry' },
    { id: 'fc', label: 'FC' },
    { id: 'mobile-ranged', label: 'Mobile Ranged' },
    { id: 'dark-age', label: 'Dark Age' },
    { id: 'feudal-age', label: 'Feudal Age' }
];

// Slugs: 'general', 'personal', '2v2', '2v2-boomer', ...
function currentSlug() {
    if (currentTierlistType === 'general') return 'general';
    if (currentTierlistType === 'personal') return 'personal';
    return teamGameSlug(teamGameSize, teamGameRole);
}

function teamGameSlug(size, role) {
    return size === '2v2' && role === 'default' ? '2v2' : `${size}-${role}`;
}

function tierFileName(slug) {
    return `${slug}-tierlist.json`;
}

function storageKey(slug) {
    return `aoe4-tierlist-${slug}`;
}

// Initialize tierlist
// Note: This function is now async to properly wait for file loading
async function initializeTierlist() {
    // Files are the primary source of truth; localStorage is only a fallback
    // if the files couldn't be loaded (prevents stale data from overriding files)
    const legacyKeys = {
        'general': 'aoe4-tierlist-general',
        'personal': 'aoe4-tierlist-personal',
        '2v2': 'aoe4-tierlist-team-game'
    };

    for (const slug of ['general', 'personal', '2v2']) {
        await loadTierlistFromDisk(slug);

        if (!tierlistData[slug]) {
            // File load failed - fall back to saved data
            const legacyKey = legacyKeys[slug];
            const saved = localStorage.getItem(legacyKey || storageKey(slug));
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed === 'object' && parsed.S !== undefined) {
                        tierlistData[slug] = parsed;
                    }
                } catch (e) {
                    console.warn(`Invalid localStorage data for ${slug} tierlist`);
                }
            }
        }

        // Guarantee data + tier order exist (e.g. first run with no files)
        await ensureTierlistLoaded(slug);
    }

    populateAllTierlists();
}

// Load one tierlist file (legacy team-game-tierlist.json is mapped to 2v2)
// Sets tierlistData[slug]
async function loadTierlistFromDisk(slug) {
    try {
        let fileName = tierFileName(slug);
        let fallbackSlug = null;
        if (slug === '2v2') {
            fallbackSlug = 'team-game'; // legacy pre-role team-game tierlist
        }

        let content = await readFileSystemFile('tierlist', fileName);
        if (!content && fallbackSlug) {
            content = await readFileSystemFile('tierlist', tierFileName(fallbackSlug));
            if (content) fileName = tierFileName(fallbackSlug);
        }
        if (!content) return;

        const data = JSON.parse(content);
        const tiers = data.tiers || data;
        if (tiers && typeof tiers === 'object' && tiers.S !== undefined) {
            tierlistData[slug] = tiers;
            tierOrder[slug] = Array.isArray(data.tierOrder)
                ? data.tierOrder.filter(t => tiers[t] !== undefined)
                : null;
            localStorage.setItem(storageKey(slug), JSON.stringify(tiers));
            console.log(`Loaded tierlist from file: ${fileName}`);
        }
    } catch (error) {
        console.log(`Error loading ${slug} tierlist from file:`, error);
    }
}

// Ensure data + tier order exist for a slug, loading from disk once
async function ensureTierlistLoaded(slug) {
    if (tierlistData[slug] === undefined) {
        await loadTierlistFromDisk(slug);
    }
    if (tierlistData[slug] === undefined) {
        tierlistData[slug] = emptyTiers(slug);
    }
    if (tierOrder[slug] === undefined) {
        tierOrder[slug] = getTierOrder(slug);
    }
}

function getTierOrder(slug) {
    if (Array.isArray(tierOrder[slug]) && tierOrder[slug].length > 0) {
        return tierOrder[slug];
    }
    return [...DEFAULT_TIERS];
}

function emptyTiers(slug) {
    const tiers = {};
    getTierOrder(slug).forEach(tier => { tiers[tier] = []; });
    return tiers;
}

// Show specific tierlist
function showTierlist(type) {
    currentTierlistType = type;

    // Update buttons
    const activeButton = document.querySelector(`.tierlist-toggle .toggle-btn[data-view="${type}"]`);
    document.querySelectorAll('.tierlist-toggle .toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (activeButton) activeButton.classList.add('active');

    // Show/hide tierlists
    const views = {
        'general': document.getElementById('general-tierlist'),
        'team-game': document.getElementById('team-game-tierlist'),
        'personal': document.getElementById('personal-tierlist')
    };
    Object.entries(views).forEach(([view, el]) => {
        if (el) el.style.display = view === type ? 'block' : 'none';
    });

    if (type === 'team-game') {
        populateTeamGameControls();
    }

    populateTierlist();
}

// Populate the size/role dropdowns of the team-game view
function populateTeamGameControls() {
    const sizeSelect = document.getElementById('team-game-size');
    const roleSelect = document.getElementById('team-game-role');
    if (!sizeSelect || !roleSelect) return;

    sizeSelect.innerHTML = TEAM_GAME_SIZES.map(size =>
        `<option value="${size}" ${size === teamGameSize ? 'selected' : ''}>${size}</option>`).join('');
    roleSelect.innerHTML = TEAM_GAME_ROLES.map(role =>
        `<option value="${role.id}" ${role.id === teamGameRole ? 'selected' : ''}>${role.label}</option>`).join('');
}

// Called when the size/role dropdowns change
async function onTeamGameSettingChange() {
    const sizeSelect = document.getElementById('team-game-size');
    const roleSelect = document.getElementById('team-game-role');
    if (!sizeSelect || !roleSelect) return;

    teamGameSize = sizeSelect.value;
    teamGameRole = roleSelect.value;

    await ensureTierlistLoaded(currentSlug());
    renderTierlistView(currentSlug());
}

// Populate all tierlists on startup
function populateAllTierlists() {
    populateTierlist();
}

// Populate specific tierlist display
function populateSpecificTierlist() {
    populateTierlist();
}

// Populate tierlist display (for current view/slug)
function populateTierlist() {
    const slug = currentSlug();
    renderTierlistView(slug);
}

// Render the tierlist of a slug into its static host element
function renderTierlistView(slug) {
    const isTeamGame = slug !== 'general' && slug !== 'personal';
    const hostId = isTeamGame ? 'tierlist-host-team-game' : `tierlist-host-${slug}`;
    const host = document.getElementById(hostId);
    if (!host) return;

    host.innerHTML = '';

    const data = tierlistData[slug];
    const order = getTierOrder(slug);

    const container = document.createElement('div');
    container.className = 'tierlist-container';

    order.forEach(tierId => {
        container.appendChild(createTierRow(slug, tierId));
    });
    container.appendChild(createAddTierRow(slug));

    host.appendChild(container);

    // Unassigned civs section
    const assignedCivs = new Set();
    order.forEach(tier => {
        (data[tier] || []).forEach(civId => assignedCivs.add(civId));
    });

    const unassigned = document.createElement('div');
    unassigned.className = 'unassigned-civs';
    const heading = document.createElement('h3');
    heading.textContent = 'Unassigned Civilizations';
    unassigned.appendChild(heading);
    const unassignedCivs = document.createElement('div');
    unassignedCivs.className = 'tier-civs';
    unassignedCivs.dataset.slug = slug;
    unassignedCivs.dataset.tier = '';
    civilizations.forEach(civ => {
        if (!assignedCivs.has(civ.id)) {
            unassignedCivs.appendChild(createCivChip(civ));
        }
    });
    unassigned.appendChild(unassignedCivs);
    host.appendChild(unassigned);
}

function domPrefix(slug) {
    return slug.replace(/[^a-z0-9-]/gi, '-') + '-';
}

function createTierRow(slug, tierId) {
    const row = document.createElement('div');
    row.className = 'tier-row';
    row.dataset.tier = tierId;

    // Tier label
    const label = document.createElement('div');
    const style = getTierStyle(slug, tierId);
    if (DEFAULT_TIERS.includes(tierId)) {
        label.className = `tier-label tier-${tierId.toLowerCase()}`;
    } else {
        label.className = 'tier-label tier-custom';
        label.style.background = style.background;
        label.style.color = style.color;
    }
    label.textContent = tierId;
    row.appendChild(label);

    // Civ container
    const civs = document.createElement('div');
    civs.className = 'tier-civs';
    civs.id = `${domPrefix(slug)}tier-${tierId.toLowerCase()}`;
    civs.dataset.slug = slug;
    civs.dataset.tier = tierId;
    // Subtle tint of the tier color so the drop zone identifies its tier
    civs.style.backgroundColor = hexToRgba(style.background, 0.16);

    const data = tierlistData[slug];
    (data[tierId] || []).forEach(civId => {
        const civData = civilizations.find(c => c.id === civId);
        if (civData) {
            civs.appendChild(createCivChip(civData));
        }
    });
    row.appendChild(civs);

    // Delete button for custom tiers
    if (!DEFAULT_TIERS.includes(tierId)) {
        const del = document.createElement('button');
        del.className = 'tier-delete-btn';
        del.textContent = '×';
        del.title = `Remove tier "${tierId}"`;
        del.onclick = () => deleteCustomTier(slug, tierId);
        row.appendChild(del);
    }

    return row;
}

// Add-tier control below the last tier row
function createAddTierRow(slug) {
    const row = document.createElement('div');
    row.className = 'add-tier-row';
    const btn = document.createElement('button');
    btn.className = 'btn-secondary add-tier-btn';
    btn.textContent = '+ Add Tier';
    btn.onclick = () => addCustomTier(slug);
    row.appendChild(btn);
    return row;
}

async function addCustomTier(slug) {
    const name = prompt('Name of the new tier (e.g. S+, Fun):');
    if (!name) return;

    const tierId = name.trim().slice(0, 3);
    if (!tierId) return;
    if (tierOrder[slug].some(t => t.toLowerCase() === tierId.toLowerCase())) {
        alert(`Tier "${tierId}" already exists.`);
        return;
    }

    // New tiers are appended after S-D
    tierOrder[slug] = [...tierOrder[slug], tierId];
    tierlistData[slug][tierId] = [];

    await autoSaveTierlist(slug);
    populateTierlist();
}

async function deleteCustomTier(slug, tierId) {
    if (!confirm(`Remove tier "${tierId}"? Its civilizations become unassigned.`)) return;

    tierOrder[slug] = tierOrder[slug].filter(t => t !== tierId);
    delete tierlistData[slug][tierId];

    await autoSaveTierlist(slug);
    populateTierlist();
}

function getTierStyle(slug, tierId) {
    if (!DEFAULT_TIERS.includes(tierId)) {
        const idx = tierOrder[slug].indexOf(tierId);
        return CUSTOM_TIER_PALETTE[Math.max(idx, 0) % CUSTOM_TIER_PALETTE.length];
    }
    return DEFAULT_TIER_STYLES[tierId] || { background: '#7d99b5', color: '#f4f0e6' };
}

// Hex color (#rgb / #rrggbb) -> rgba() string with the given alpha
function hexToRgba(hex, alpha) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Create civilization chip element (flag only, name as tooltip)
function createCivChip(civData) {
    const chip = document.createElement('div');
    chip.className = 'civ-chip';
    chip.dataset.civId = civData.id;
    chip.title = civData.name;
    chip.draggable = true;

    // Add flag image
    const flagPath = getCivFlag(civData.id);
    if (flagPath) {
        const flagImg = document.createElement('img');
        flagImg.src = flagPath;
        flagImg.className = 'civ-flag';
        flagImg.alt = civData.name;
        // IMPORTANT: Prevent image from being dragged separately
        flagImg.draggable = false;
        chip.appendChild(flagImg);
    }

    // Add civ name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'civ-name';
    nameSpan.textContent = civData.name;
    chip.appendChild(nameSpan);

    return chip;
}

// Enable drag and drop for tierlist
// Uses flag to prevent duplicate event listeners (memory leak fix)
function enableTierDragDrop() {
    // Prevent duplicate event listeners
    if (tierDragDropEnabled) {
        return;
    }
    tierDragDropEnabled = true;

    // Add event listeners to civ chips
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragend', handleDragEnd);
}

// Disable drag and drop for tierlist (cleanup function)
function disableTierDragDrop() {
    if (!tierDragDropEnabled) {
        return;
    }
    tierDragDropEnabled = false;

    document.removeEventListener('dragstart', handleDragStart);
    document.removeEventListener('dragover', handleDragOver);
    document.removeEventListener('drop', handleDrop);
    document.removeEventListener('dragend', handleDragEnd);
}

// Handle drag start
function handleDragStart(e) {
    if (!e.target.classList.contains('civ-chip')) return;

    draggedCiv = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

// Handle drag over
let draggedOverContainer = null;
function handleDragOver(e) {
    if (!draggedCiv) return false;

    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';

    // Highlight drop zones via class (theme-aware styling)
    const tierContainer = e.target.closest('.tier-civs');
    if (tierContainer) {
        if (draggedOverContainer && draggedOverContainer !== tierContainer) {
            draggedOverContainer.classList.remove('drop-hover');
        }
        draggedOverContainer = tierContainer;
        tierContainer.classList.add('drop-hover');
    }

    return false;
}

// Handle drop
function handleDrop(e) {
    // IMPORTANT: preventDefault is required for drop to work
    if (e.preventDefault) {
        e.preventDefault();
    }
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    const tierContainer = e.target.closest('.tier-civs');

    if (!tierContainer || !draggedCiv) {
        console.log('handleDrop - No tierContainer or draggedCiv, returning');
        return false;
    }

    // Remove highlight
    tierContainer.classList.remove('drop-hover');

    // Get tier info
    const tierRow = tierContainer.closest('.tier-row');
    const slug = tierContainer.dataset.slug || 'general';
    const tier = tierRow ? tierRow.dataset.tier : null;
    const civId = draggedCiv.dataset.civId;

    // Update data structure
    updateTierlistData(civId, tier, slug);

    // Move the element
    tierContainer.appendChild(draggedCiv);

    return false;
}

// Handle drag end
// Performance optimization: Use cached tier containers when available
function handleDragEnd(e) {
    // Remove dragging class - only need to remove from the dragged element
    if (draggedCiv) {
        draggedCiv.classList.remove('dragging');
    }

    // Reset highlights on tier containers
    if (draggedOverContainer) {
        draggedOverContainer.classList.remove('drop-hover');
        draggedOverContainer = null;
    }

    document.querySelectorAll('.tierlist-view .tier-civs.drop-hover').forEach(container => {
        container.classList.remove('drop-hover');
    });

    draggedCiv = null;
}

// Update tierlist data
function updateTierlistData(civId, newTier, slug) {
    const target = slug || currentSlug();
    const currentData = tierlistData[target];

    // Remove from all tiers
    Object.keys(currentData).forEach(tier => {
        const index = currentData[tier].indexOf(civId);
        if (index > -1) {
            currentData[tier].splice(index, 1);
        }
    });

    // Add to new tier if specified
    if (newTier && currentData[newTier]) {
        currentData[newTier].push(civId);
    }

    // Auto-save
    autoSaveTierlist(target);
}

// Build the JSON payload of a tierlist
function serializeTierlist(slug) {
    return {
        type: slug,
        tierOrder: tierOrder[slug],
        tiers: tierlistData[slug],
        lastUpdated: new Date().toISOString()
    };
}

// Auto-save tierlist to file
// TAURI: File system always available via tauri-adapter.js
async function autoSaveTierlist(slug) {
    const target = slug || currentSlug();
    const data = serializeTierlist(target);
    const jsonContent = JSON.stringify(data, null, 2);

    try {
        await writeFileSystemFile('tierlist', tierFileName(target), jsonContent);
        console.log(`Auto-saved ${tierFileName(target)}`);
    } catch (error) {
        console.error('Auto-save failed:', error);
    }
}

// Save tierlist
// TAURI: File system always available via tauri-adapter.js
async function saveTierlist() {
    const target = currentSlug();
    const data = serializeTierlist(target);
    const jsonContent = JSON.stringify(data, null, 2);
    const fileName = tierFileName(target);

    try {
        await writeFileSystemFile('tierlist', fileName, jsonContent);
        alert(`Tierlist saved as ${fileName}!`);
    } catch (error) {
        console.error('Save failed:', error);
        alert('Error saving tierlist: ' + error.message);
    }
}

// Reset tierlist
function resetTierlist() {
    if (!confirm('Are you sure you want to reset the current tierlist?')) return;

    const slug = currentSlug();
    tierlistData[slug] = {};
    getTierOrder(slug).forEach(tier => { tierlistData[slug][tier] = []; });

    // Clear localStorage
    localStorage.removeItem(storageKey(slug));

    // Repopulate
    populateTierlist();
}

// Export tierlist
function exportTierlist() {
    const slug = currentSlug();
    const jsonContent = JSON.stringify(serializeTierlist(slug), null, 2);
    const blob = new Blob([jsonContent], {type: 'application/json'});
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = tierFileName(slug);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import tierlist
function importTierlist() {
    document.getElementById('tierlistFileInput').click();
}

// Handle tierlist file select
function handleTierlistFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const tiers = data.tiers || data;

            if (tiers && typeof tiers === 'object' && tiers.S !== undefined) {
                let target = data.type;

                // Legacy team-game files have no game size - import as 2v2 default
                if (target === 'team-game') target = '2v2';

                if (tierlistData[target] === undefined) {
                    alert(`Unknown tierlist type in file: ${target}`);
                } else {
                    tierlistData[target] = tiers;
                    tierOrder[target] = Array.isArray(data.tierOrder)
                        ? data.tierOrder.filter(t => tiers[t] !== undefined)
                        : [...DEFAULT_TIERS];

                    localStorage.setItem(storageKey(target), JSON.stringify(tiers));

                    if (target === currentSlug()) {
                        populateTierlist();
                    }
                    autoSaveTierlist(target);
                    alert('Tierlist imported successfully!');
                }
            } else {
                alert('Invalid tierlist file format');
            }
        } catch (err) {
            alert('Error importing tierlist: Invalid JSON format');
        }
    };
    reader.readAsText(file);

    // Clear the input so the same file can be selected again
    event.target.value = '';
}

// Export functions to global scope
window.showTierlist = showTierlist;
window.saveTierlist = saveTierlist;
window.resetTierlist = resetTierlist;
window.exportTierlist = exportTierlist;
window.importTierlist = importTierlist;
window.handleTierlistFileSelect = handleTierlistFileSelect;
window.onTeamGameSettingChange = onTeamGameSettingChange;
