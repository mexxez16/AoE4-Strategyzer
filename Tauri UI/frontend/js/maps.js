// Maps functionality module
let mapsData = [];
let currentEditingMap = null;
let defaultMapsCache = null;

// Normalize a map name for merge conflict detection
function normalizeMapName(name) {
    return (name || '').trim().toLowerCase();
}

// Load the shipped default maps (maps-data-default.json).
// These are read-only base data: they appear in All Maps but are never
// overwritten by installs, because user edits live in APPDATA maps-data.json.
async function fetchDefaultMaps() {
    if (defaultMapsCache) return defaultMapsCache;
    try {
        const response = await fetch('maps/maps-data-default.json');
        if (response.ok) {
            defaultMapsCache = JSON.parse(await response.text());
            if (!Array.isArray(defaultMapsCache)) defaultMapsCache = [];
            console.log('Loaded default maps:', defaultMapsCache.length);
        }
    } catch (error) {
        console.log('No default maps data found');
        defaultMapsCache = [];
    }
    return defaultMapsCache;
}

// Merge default maps with user maps.
// User maps win over defaults (matched by normalized name or default id).
// Entries with hidden=true are tombstones for deleted defaults: they are
// excluded from the result but suppress re-adding the default map.
function mergeMapData(defaults, userMaps) {
    const users = Array.isArray(userMaps) ? userMaps : [];
    const defs = Array.isArray(defaults) ? defaults : [];

    const visibleNames = new Set();
    const hiddenNames = new Set();
    const userIds = new Set();

    users.forEach(m => {
        if (!m || !m.name) return;
        if (m.id) userIds.add(m.id);
        if (m.hidden) {
            hiddenNames.add(normalizeMapName(m.name));
        } else {
            visibleNames.add(normalizeMapName(m.name));
        }
    });

    // Visible user maps come first, then missing defaults
    const merged = users.filter(m => m && m.name && !m.hidden);
    defs.forEach(d => {
        const n = normalizeMapName(d.name);
        if (visibleNames.has(n) || hiddenNames.has(n) || (d.id && userIds.has(d.id))) return;
        merged.push(d);
    });
    return merged;
}

// True if a map is identical to its shipped default (no user edit yet).
// Pristine defaults are excluded from APPDATA saves so they stay in
// maps-data-default.json and future updates to defaults still propagate.
function isPristineDefault(map) {
    if (!map || map.hidden) return false;
    if (!defaultMapsCache) return false;
    const def = defaultMapsCache.find(d => d.id === map.id);
    if (!def) return false;
    const fields = ['name', 'type', 'isRanked', 'isTeamRanked', 'userNotes', 'sheepPattern', 'rankedTierlist', 'teamRankedTierlist'];
    return fields.every(f => JSON.stringify(map[f] ?? null) === JSON.stringify(def[f] ?? null));
}

// All maps without hidden tombstone entries (for display/data use)
function getVisibleMaps() {
    return mapsData.filter(m => !m.hidden);
}

// Initialize maps
async function initializeMaps() {
    console.log('Initializing maps...');
    try {
        // Check file access for maps section first
        checkFileAccessStatus('maps');
        console.log('File access status checked');
        
        // TAURI: File system ready is set by tauri-adapter.js
        
        // Load maps data
        await loadMapsData();
        console.log('Maps data loaded:', mapsData);
        
        // Generate civilization tier list dropdowns
        populateCivTierlistDropdowns();
        console.log('Civilization tier list dropdowns populated');
        
        // Display maps
        displayMapPools();
        displayAllMaps();
        console.log('Maps displayed');
        
        console.log('Maps initialization complete');
    } catch (error) {
        console.error('Error initializing maps:', error);
        showNotification('Error initializing maps: ' + error.message, 'error');
    }
}

// Load maps data from JSON files
// TAURI: Defaults (maps-data-default.json) merged with user data from APPDATA
async function loadMapsData() {
    console.log('loadMapsData called');

    try {
        const defaults = await fetchDefaultMaps();

        let userMaps = [];

        // Load embedded legacy user data (bundled maps-data.json)
        try {
            const response = await fetch('maps/maps-data.json');
            if (response.ok) {
                const embeddedMaps = JSON.parse(await response.text());
                if (Array.isArray(embeddedMaps)) userMaps = userMaps.concat(embeddedMaps);
                console.log('Loaded maps from embedded assets:', embeddedMaps.length);
            }
        } catch (fetchError) {
            console.log('No embedded maps data found');
        }

        // Then try APPDATA via Tauri FS API (user-saved data, has priority)
        if (window.readFileSystemFile) {
            const content = await window.readFileSystemFile('maps', 'maps-data.json');
            if (content) {
                try {
                    const appdataMaps = JSON.parse(content);
                    if (Array.isArray(appdataMaps)) {
                        userMaps = appdataMaps;
                        console.log('Loaded maps from APPDATA:', appdataMaps.length);
                    }
                } catch (parseError) {
                    console.warn('Could not parse maps file from APPDATA:', parseError);
                }
            }
        }

        // Merge: user maps override defaults, missing defaults are added
        mapsData = mergeMapData(defaults, userMaps);

        // Update Quick Match maps data to stay in sync
        window.quickMatchMaps = getVisibleMaps();

    } catch (error) {
        console.error('Error loading maps data:', error);
        mapsData = [];
        window.quickMatchMaps = [];
    }
}

// Save maps data to JSON file
// TAURI: Uses writeFileSystemFile from tauri-adapter.js
async function saveMapsData() {
    console.log('saveMapsData called');
    try {
        const directory = 'maps';
        const fileName = 'maps-data.json';

        // Only save user data: user-created maps, edited defaults and hidden
        // tombstones. Pristine defaults stay in maps-data-default.json.
        const dataToSave = getVisibleMaps().filter(m => !isPristineDefault(m))
            .concat(mapsData.filter(m => m.hidden));

        // Use Tauri FS API via tauri-adapter.js
        if (window.writeFileSystemFile) {
            console.log('Saving maps data via Tauri FS API...');
            const success = await window.writeFileSystemFile(directory, fileName, JSON.stringify(dataToSave, null, 2));
            if (success) {
                console.log('Data written successfully');
                showNotification('Maps data saved successfully!', 'success');
            } else {
                showNotification('Error saving maps data', 'error');
            }
        } else if (window.fileSystemReady && window.directoryHandle) {
            // Fallback for non-Tauri mode using File System Access API
            console.log('Getting maps directory...');
            const mapsHandle = await getOrCreateSubdirectory(window.directoryHandle, 'maps');
            console.log('Creating/getting file handle...');
            const fileHandle = await mapsHandle.getFileHandle('maps-data.json', { create: true });
            console.log('Creating writable stream...');
            const writable = await fileHandle.createWritable();
            console.log('Writing data...', dataToSave);
            await writable.write(JSON.stringify(dataToSave, null, 2));
            await writable.close();
            console.log('Data written successfully');
            showNotification('Maps data saved successfully!', 'success');
        } else {
            console.log('File system not ready');
            showNotification('File system access required for saving. Please enable file access to save maps.', 'warning');
        }
    } catch (error) {
        console.error('Error saving maps data:', error);
        showNotification('Error saving maps data: ' + error.message, 'error');
    }
}

// Populate civilization tier list dropdowns
function populateCivTierlistDropdowns() {
    const rankedContainer = document.getElementById('ranked-civ-tierlist');
    const teamRankedContainer = document.getElementById('team-ranked-civ-tierlist');
    
    if (!rankedContainer || !teamRankedContainer) return;
    
    const tiers = ['S', 'A', 'B', 'C', 'D'];
    
    // Clear existing content
    rankedContainer.innerHTML = '';
    teamRankedContainer.innerHTML = '';
    
    // Create dropdowns for each civilization
    civilizations.forEach(civ => {
        // Ranked tierlist
        const rankedItem = document.createElement('div');
        rankedItem.className = 'civ-tier-item';
        rankedItem.innerHTML = `
            <div class="civ-tier-label">
                ${getCivFlag(civ.id) ? `<img src="${getCivFlag(civ.id)}" class="civ-flag" alt="${civ.name}">` : ''}
                <span>${civ.name}</span>
            </div>
            <select class="tier-select" data-civ="${civ.id}" data-mode="ranked">
                <option value="">-</option>
                ${tiers.map(tier => `<option value="${tier}">${tier}</option>`).join('')}
            </select>
        `;
        rankedContainer.appendChild(rankedItem);
        
        // Team ranked tierlist
        const teamRankedItem = rankedItem.cloneNode(true);
        teamRankedItem.querySelector('select').setAttribute('data-mode', 'team-ranked');
        teamRankedContainer.appendChild(teamRankedItem);
    });
}

// Save map
async function saveMap() {
    console.log('saveMap function called');
    
    // Check if file access is available, request if not
    const hasAccess = await checkAndRequestFileAccess('save the map');
    if (!hasAccess) {
        return;
    }
    const mapName = document.getElementById('map-name').value.trim();
    const mapType = document.querySelector('input[name="map-type-radio"]:checked')?.value;
    const isRanked = document.getElementById('map-ranked-pool').checked;
    const isTeamRanked = document.getElementById('map-team-ranked-pool').checked;
    const userNotes = document.getElementById('map-user-notes').value.trim();
    const sheepPattern = document.getElementById('map-sheep-pattern').value.trim();
    
    console.log('Form values:', { mapName, mapType, isRanked, isTeamRanked, userNotes, sheepPattern });
    
    if (!mapName) {
        showNotification('Please enter a map name', 'error');
        return;
    }
    
    if (!mapType) {
        showNotification('Please select a map type', 'error');
        return;
    }
    
    // Collect civilization tier lists
    const rankedTierlist = {};
    const teamRankedTierlist = {};
    
    document.querySelectorAll('#ranked-civ-tierlist select').forEach(select => {
        const civId = select.getAttribute('data-civ');
        const tier = select.value;
        if (tier) rankedTierlist[civId] = tier;
    });
    
    document.querySelectorAll('#team-ranked-civ-tierlist select').forEach(select => {
        const civId = select.getAttribute('data-civ');
        const tier = select.value;
        if (tier) teamRankedTierlist[civId] = tier;
    });
    
    const mapData = {
        id: currentEditingMap ? currentEditingMap.id : generateId(),
        name: mapName,
        type: mapType,
        isRanked: isRanked,
        isTeamRanked: isTeamRanked,
        userNotes: userNotes,
        sheepPattern: sheepPattern,
        rankedTierlist: rankedTierlist,
        teamRankedTierlist: teamRankedTierlist,
        lastModified: new Date().toISOString()
    };
    
    if (currentEditingMap) {
        // Update existing map
        const index = mapsData.findIndex(m => m.id === currentEditingMap.id);
        if (index !== -1) {
            mapsData[index] = mapData;
        }
    } else {
        // Add new map
        mapsData.push(mapData);
    }
    
    console.log('File system status:', {
        fileSystemReady: window.fileSystemReady,
        directoryHandle: window.directoryHandle,
        projectDirectoryHandle: window.projectDirectoryHandle
    });

    // Save and refresh (using await for consistency with async function)
    await saveMapsData();
    clearMapForm();
    displayMapPools();
    displayAllMaps();

    // Update Quick Match maps data to stay in sync
    window.quickMatchMaps = getVisibleMaps();

    // Refresh Quick Match dropdown if it exists
    if (typeof populateMapDropdown === 'function') {
        populateMapDropdown();
    }
}

// Clear map form
function clearMapForm() {
    document.getElementById('map-name').value = '';
    document.querySelectorAll('input[name="map-type-radio"]').forEach(radio => radio.checked = false);
    document.getElementById('map-ranked-pool').checked = false;
    document.getElementById('map-team-ranked-pool').checked = false;
    document.getElementById('map-user-notes').value = '';
    document.getElementById('map-sheep-pattern').value = '';
    document.querySelectorAll('.tier-select').forEach(select => select.value = '');
    currentEditingMap = null;
}

// Map pool membership management -------------------------------

// Remove a map from a pool (unsets the flag; the map itself stays)
async function toggleMapPoolMembership(mapId, pool) {
    const map = mapsData.find(m => m.id === mapId);
    if (!map) return;
    if (pool === 'ranked') map.isRanked = false;
    else if (pool === 'team-ranked') map.isTeamRanked = false;
    else return;
    await saveMapsData();
    window.quickMatchMaps = getVisibleMaps();
    displayMapPools();
    displayAllMaps();
}

// Add / remove panel of a pool ("+ Add Map" above the pool list)
function toggleAddMapPanel(pool) {
    if (pool !== 'ranked' && pool !== 'team-ranked') return;
    const panel = document.getElementById(`add-map-panel-${pool}`);
    if (!panel) return;
    const showing = panel.style.display !== 'none';
    panel.style.display = showing ? 'none' : 'block';
    if (!showing) {
        const input = document.getElementById(`add-map-search-${pool}`);
        if (input) {
            input.value = '';
            renderAddMapPoolList(pool);
            input.focus();
        }
    }
}

// Render the candidate list for a pool's "+ Add Map" search: visible maps
// NOT in the pool yet, matching the current search text
function renderAddMapPoolList(pool) {
    if (pool !== 'ranked' && pool !== 'team-ranked') return;
    const list = document.getElementById(`add-map-list-${pool}`);
    if (!list) return;
    const searchEl = document.getElementById(`add-map-search-${pool}`);
    const query = (searchEl ? searchEl.value : '').trim().toLowerCase();
    const inPool = m => pool === 'ranked' ? m.isRanked : m.isTeamRanked;
    const candidates = getVisibleMaps()
        .filter(m => !inPool(m))
        .filter(m => !query || m.name.toLowerCase().includes(query))
        .sort((a, b) => a.name.localeCompare(b.name));

    list.innerHTML = candidates.length > 0
        ? candidates.map(m => {
            const typeLabel = (m.type || '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `<div class="add-map-option" onclick="window.addMapToPool('${m.id}', '${pool}')">
                <span class="add-map-name">${m.name}</span>
                ${typeLabel ? `<span class="add-map-type">${typeLabel}</span>` : ''}
            </div>`;
        }).join('')
        : '<p class="no-maps add-map-empty">No matching maps found</p>';
}

// Add a map to a pool from the "+ Add Map" search results
async function addMapToPool(mapId, pool) {
    const map = mapsData.find(m => m.id === mapId);
    if (!map || (pool !== 'ranked' && pool !== 'team-ranked')) return;
    if (pool === 'ranked') map.isRanked = true;
    else map.isTeamRanked = true;
    toggleAddMapPanel(pool);
    await saveMapsData();
    window.quickMatchMaps = getVisibleMaps();
    displayMapPools();
    displayAllMaps();
}

// End map pool membership management ---------------------------

// Display map pools
function displayMapPools() {
    console.log('displayMapPools called with mapsData:', mapsData);
    
    const rankedPool = document.getElementById('ranked-map-pool');
    const teamRankedPool = document.getElementById('team-ranked-map-pool');
    
    if (!rankedPool || !teamRankedPool) {
        console.error('Map pool elements not found');
        return;
    }
    
    const rankedMaps = getVisibleMaps().filter(m => m.isRanked).sort((a, b) => a.name.localeCompare(b.name));
    const teamRankedMaps = getVisibleMaps().filter(m => m.isTeamRanked).sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('Ranked maps:', rankedMaps);
    console.log('Team ranked maps:', teamRankedMaps);
    
    rankedPool.innerHTML = rankedMaps.length > 0
        ? rankedMaps.map(m => createMapPoolItem(m, 'ranked')).join('')
        : '<p class="no-maps">No maps in ranked pool</p>';

    teamRankedPool.innerHTML = teamRankedMaps.length > 0
        ? teamRankedMaps.map(m => createMapPoolItem(m, 'team-ranked')).join('')
        : '<p class="no-maps">No maps in team ranked pool</p>';

    // Note: No setTimeout needed - buttons use onclick attributes which work immediately
    // Functions are already exposed on window object before this code runs
}

// Create map pool item HTML
function createMapPoolItem(map, sectionPrefix = 'pool') {
    const typeClass = `map-type-${map.type}`;
    const typeLabel = map.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const dropdownId = `${sectionPrefix}-dropdown-${map.id}`;
    const editId = `${sectionPrefix}-edit-${map.id}`;
    
    // Create compact tierlist summaries
    const rankedTiers = createCompactTierlist(map.rankedTierlist || {});
    const teamRankedTiers = createCompactTierlist(map.teamRankedTierlist || {});
    
    // Generate tier list dropdowns HTML
    const tierListDropdownsHTML = generateTierListDropdownsHTML(map, sectionPrefix);
    
    return `
        <div class="map-pool-item">
            <div class="map-pool-header" onclick="toggleMapDropdown('${dropdownId}')">
                <div class="map-pool-info">
                    <span class="map-name">${map.name}</span>
                    <span class="map-type-badge ${typeClass}">${typeLabel}</span>
                </div>
                <div class="map-pool-actions">
                    <button class="btn-secondary btn-small" onclick="event.stopPropagation(); window.toggleInlineEditMap('${map.id}', '${sectionPrefix}')">Edit</button>
                    <button class="btn-danger btn-small pool-remove-btn" onclick="event.stopPropagation(); window.toggleMapPoolMembership('${map.id}', '${sectionPrefix}')">Remove</button>
                    <button class="btn-danger btn-small" onclick="event.stopPropagation(); window.deleteMap('${map.id}')">Delete</button>
                    <button class="map-dropdown-toggle" id="toggle-${dropdownId}">▼</button>
                </div>
            </div>
            <div class="map-dropdown-content" id="${dropdownId}">
                <div class="map-details">
                    ${map.userNotes ? `
                    <div class="map-detail-item">
                        <div class="map-detail-label">User Notes</div>
                        <div class="map-detail-value">${map.userNotes}</div>
                    </div>` : ''}
                    ${map.sheepPattern ? `
                    <div class="map-detail-item">
                        <div class="map-detail-label">Sheep Pattern</div>
                        <div class="map-detail-value">${map.sheepPattern}</div>
                    </div>` : ''}
                </div>
                
                ${rankedTiers ? `
                <div class="map-tierlist-summary">
                    <div class="map-detail-label">Ranked Tierlist</div>
                    <div class="tierlist-compact">${rankedTiers}</div>
                </div>` : ''}
                
                ${teamRankedTiers ? `
                <div class="map-tierlist-summary">
                    <div class="map-detail-label">Team Ranked Tierlist</div>
                    <div class="tierlist-compact">${teamRankedTiers}</div>
                </div>` : ''}
            </div>
            
            <!-- Inline Edit Form -->
            <div class="map-inline-edit" id="${editId}" style="display: none;">
                <div class="inline-edit-form">
                    <div class="form-grid">
                        <div class="form-item">
                            <label for="${sectionPrefix}-edit-name-${map.id}">Map Name</label>
                            <input type="text" id="${sectionPrefix}-edit-name-${map.id}" class="form-input" value="${map.name.replace(/"/g, '&quot;')}">
                        </div>
                        
                        <div class="form-item">
                            <div class="group-label">Map Type</div>
                            <div class="radio-group">
                                <label class="radio-label">
                                    <input type="radio" name="${sectionPrefix}-edit-type-${map.id}" value="land-open" ${map.type === 'land-open' ? 'checked' : ''}> Land Open
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="${sectionPrefix}-edit-type-${map.id}" value="land-narrow" ${map.type === 'land-narrow' ? 'checked' : ''}> Land Narrow
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="${sectionPrefix}-edit-type-${map.id}" value="hybrid" ${map.type === 'hybrid' ? 'checked' : ''}> Hybrid
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="${sectionPrefix}-edit-type-${map.id}" value="water" ${map.type === 'water' ? 'checked' : ''}> Water
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-item">
                            <div class="group-label">Map Pools</div>
                            <div class="checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="${sectionPrefix}-edit-ranked-${map.id}" ${map.isRanked ? 'checked' : ''}> Ranked Map Pool
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="${sectionPrefix}-edit-team-ranked-${map.id}" ${map.isTeamRanked ? 'checked' : ''}> Team Ranked Map Pool
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-item full-width">
                            <label for="${sectionPrefix}-edit-user-notes-${map.id}">Map User Notes</label>
                            <textarea id="${sectionPrefix}-edit-user-notes-${map.id}" class="form-input" rows="2">${(map.userNotes || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                        </div>
                        
                        <div class="form-item full-width">
                            <label for="${sectionPrefix}-edit-sheep-pattern-${map.id}">Sheep Pattern Notes</label>
                            <textarea id="${sectionPrefix}-edit-sheep-pattern-${map.id}" class="form-input" rows="2">${(map.sheepPattern || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                        </div>
                        
                        ${tierListDropdownsHTML}
                    </div>
                    
                    <div class="form-actions">
                        <button class="btn-primary btn-small" onclick="window.saveInlineMapEdit('${map.id}', '${sectionPrefix}')">Save Changes</button>
                        <button class="btn-secondary btn-small" onclick="window.cancelInlineMapEdit('${map.id}', '${sectionPrefix}')">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Filter/sort state for the All Maps list (search text, map type, pool, sort mode)
let mapsListFilter = { search: '', type: '', pool: '', sort: 'name-asc' };

// Pure filter+sort over a map array, shared by displayAllMaps and tests
function filterMapsForDisplay(maps, f) {
    let list = maps.filter(m => m && m.name && !m.hidden);
    if (f.search) {
        const q = f.search.toLowerCase();
        list = list.filter(m => m.name.toLowerCase().includes(q));
    }
    if (f.type) {
        list = list.filter(m => m.type === f.type);
    }
    if (f.pool === 'ranked') {
        list = list.filter(m => m.isRanked);
    } else if (f.pool === 'team-ranked') {
        list = list.filter(m => m.isTeamRanked);
    }
    if (f.sort === 'name-desc') {
        list = [...list].sort((a, b) => b.name.localeCompare(a.name));
    } else if (f.sort === 'type') {
        list = [...list].sort((a, b) =>
            (a.type || '').localeCompare(b.type || '') || a.name.localeCompare(b.name));
    } else {
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
}

function selectMapsListType(value, label) {
    mapsListFilter.type = value;
    const textEl = document.getElementById('maps-type-text');
    if (textEl) textEl.textContent = label;
    const hidden = document.getElementById('maps-type');
    if (hidden) hidden.value = value;
    const options = document.getElementById('maps-type-options');
    if (options) options.classList.remove('active');
    const selected = document.querySelector('#maps-type-dropdown .dropdown-selected');
    if (selected) selected.classList.remove('active');
    applyMapsListFilter();
}
function selectMapsListPool(value, label) {
    mapsListFilter.pool = value;
    const textEl = document.getElementById('maps-pool-text');
    if (textEl) textEl.textContent = label;
    const hidden = document.getElementById('maps-pool');
    if (hidden) hidden.value = value;
    const options = document.getElementById('maps-pool-options');
    if (options) options.classList.remove('active');
    const selected = document.querySelector('#maps-pool-dropdown .dropdown-selected');
    if (selected) selected.classList.remove('active');
    applyMapsListFilter();
}

function applyMapsListFilter() {
    const textEl = document.getElementById('maps-filter-text');
    if (textEl) mapsListFilter.search = textEl.value.trim();
    const typeVal = document.getElementById('maps-type');
    if (typeVal) mapsListFilter.type = typeVal.value || '';
    const poolVal = document.getElementById('maps-pool');
    if (poolVal) mapsListFilter.pool = poolVal.value || '';
    const sortEl = document.getElementById('maps-sort-select');
    if (sortEl) mapsListFilter.sort = sortEl.value || 'name-asc';
    displayAllMaps();
}

function displayAllMaps() {
    console.log('displayAllMaps called with mapsData:', mapsData);
    console.log('Number of maps:', mapsData.length);
    console.log('Map names:', mapsData.map(m => m.name));

    const mapsList = document.getElementById('maps-list');
    if (!mapsList) {
        console.error('Maps list element not found');
        return;
    }

    const sortedMaps = filterMapsForDisplay(mapsData, mapsListFilter);

    if (sortedMaps.length === 0) {
        mapsList.innerHTML = mapsData.length > 0
            ? '<p class="no-maps">No maps match the current filter</p>'
            : '<p class="no-maps">No maps added yet</p>';
        return;
    }
    
    mapsList.innerHTML = sortedMaps.map(map => {
        const typeClass = `map-type-${map.type}`;
        const typeLabel = map.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const dropdownId = `all-dropdown-${map.id}`;
        const editId = `all-edit-${map.id}`;
        
        // Create compact tierlist summaries
        const rankedTiers = createCompactTierlist(map.rankedTierlist || {});
        const teamRankedTiers = createCompactTierlist(map.teamRankedTierlist || {});
        
        // Generate tier list dropdowns HTML
        const tierListDropdownsHTML = generateTierListDropdownsHTML(map, 'all');
        
        return `
            <div class="map-pool-item">
                <div class="map-pool-header" onclick="toggleMapDropdown('${dropdownId}')">
                    <div class="map-pool-info">
                        <span class="map-name">${map.name}</span>
                        <span class="map-type-badge ${typeClass}">${typeLabel}</span>
                        <div class="map-badges">
                            ${map.isRanked ? '<span class="pool-badge ranked">Ranked</span>' : ''}
                            ${map.isTeamRanked ? '<span class="pool-badge team-ranked">Team Ranked</span>' : ''}
                        </div>
                    </div>
                    <div class="map-pool-actions">
                        <button class="btn-secondary btn-small" onclick="event.stopPropagation(); window.toggleInlineEditMap('${map.id}', 'all')">Edit</button>
                        <button class="btn-danger btn-small" onclick="event.stopPropagation(); window.deleteMap('${map.id}')">Delete</button>
                        <button class="map-dropdown-toggle" id="toggle-${dropdownId}">▼</button>
                    </div>
                </div>
                <div class="map-dropdown-content" id="${dropdownId}">
                    <div class="map-details">
                        ${map.userNotes ? `
                        <div class="map-detail-item">
                            <div class="map-detail-label">User Notes</div>
                            <div class="map-detail-value">${map.userNotes}</div>
                        </div>` : ''}
                        ${map.sheepPattern ? `
                        <div class="map-detail-item">
                            <div class="map-detail-label">Sheep Pattern</div>
                            <div class="map-detail-value">${map.sheepPattern}</div>
                        </div>` : ''}
                    </div>
                    
                    ${rankedTiers ? `
                    <div class="map-tierlist-summary">
                        <div class="map-detail-label">Ranked Tierlist</div>
                        <div class="tierlist-compact">${rankedTiers}</div>
                    </div>` : ''}
                    
                    ${teamRankedTiers ? `
                    <div class="map-tierlist-summary">
                        <div class="map-detail-label">Team Ranked Tierlist</div>
                        <div class="tierlist-compact">${teamRankedTiers}</div>
                    </div>` : ''}
                </div>
                
                <!-- Inline Edit Form -->
                <div class="map-inline-edit" id="${editId}" style="display: none;">
                    <div class="inline-edit-form">
                        <div class="form-grid">
                            <div class="form-item">
                                <label for="all-edit-name-${map.id}">Map Name</label>
                                <input type="text" id="all-edit-name-${map.id}" class="form-input" value="${map.name.replace(/"/g, '&quot;')}">
                            </div>
                            
                            <div class="form-item">
                                <div class="group-label">Map Type</div>
                                <div class="radio-group">
                                    <label class="radio-label">
                                        <input type="radio" name="all-edit-type-${map.id}" value="land-open" ${map.type === 'land-open' ? 'checked' : ''}> Land Open
                                    </label>
                                    <label class="radio-label">
                                        <input type="radio" name="all-edit-type-${map.id}" value="land-narrow" ${map.type === 'land-narrow' ? 'checked' : ''}> Land Narrow
                                    </label>
                                    <label class="radio-label">
                                        <input type="radio" name="all-edit-type-${map.id}" value="hybrid" ${map.type === 'hybrid' ? 'checked' : ''}> Hybrid
                                    </label>
                                    <label class="radio-label">
                                        <input type="radio" name="all-edit-type-${map.id}" value="water" ${map.type === 'water' ? 'checked' : ''}> Water
                                    </label>
                                </div>
                            </div>
                            
                            <div class="form-item">
                                <div class="group-label">Map Pools</div>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="all-edit-ranked-${map.id}" ${map.isRanked ? 'checked' : ''}> Ranked Map Pool
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="all-edit-team-ranked-${map.id}" ${map.isTeamRanked ? 'checked' : ''}> Team Ranked Map Pool
                                    </label>
                                </div>
                            </div>
                            
                            <div class="form-item full-width">
                                <label for="all-edit-user-notes-${map.id}">Map User Notes</label>
                                <textarea id="all-edit-user-notes-${map.id}" class="form-input" rows="2">${(map.userNotes || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                            </div>
                            
                            <div class="form-item full-width">
                                <label for="all-edit-sheep-pattern-${map.id}">Sheep Pattern Notes</label>
                                <textarea id="all-edit-sheep-pattern-${map.id}" class="form-input" rows="2">${(map.sheepPattern || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                            </div>
                            
                            ${tierListDropdownsHTML}
                        </div>
                        
                        <div class="form-actions">
                            <button class="btn-primary btn-small" onclick="window.saveInlineMapEdit('${map.id}', 'all')">Save Changes</button>
                            <button class="btn-secondary btn-small" onclick="window.cancelInlineMapEdit('${map.id}', 'all')">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Event listeners removed - all buttons now use onclick handlers
}

// Generate tier list dropdowns HTML for inline edit
function generateTierListDropdownsHTML(map, sectionPrefix = 'edit') {
    const tiers = ['S', 'A', 'B', 'C', 'D'];
    let html = '<div class="form-item full-width"><h4>Civilization Tier Lists</h4><div class="civ-tierlists">';
    
    // Ranked tierlist
    html += '<div class="tierlist-section"><h5>Ranked Civ Tierlist</h5><div class="civ-tierlist-grid">';
    civilizations.forEach(civ => {
        const selectedTier = map.rankedTierlist?.[civ.id] || '';
        const flagPath = getCivFlag(civ.id);
        html += `
            <div class="civ-tier-item">
                <div class="civ-tier-label">
                    ${flagPath ? `<img src="${flagPath}" class="civ-flag" alt="${civ.name}">` : ''}
                    <span>${civ.name}</span>
                </div>
                <select class="tier-select" id="${sectionPrefix}-ranked-tier-${map.id}-${civ.id}" data-civ="${civ.id}" data-mode="ranked">
                    <option value="">-</option>
                    ${tiers.map(tier => `<option value="${tier}" ${selectedTier === tier ? 'selected' : ''}>${tier}</option>`).join('')}
                </select>
            </div>
        `;
    });
    html += '</div></div>';
    
    // Team ranked tierlist
    html += '<div class="tierlist-section"><h5>Team Ranked Civ Tierlist</h5><div class="civ-tierlist-grid">';
    civilizations.forEach(civ => {
        const selectedTier = map.teamRankedTierlist?.[civ.id] || '';
        const flagPath = getCivFlag(civ.id);
        html += `
            <div class="civ-tier-item">
                <div class="civ-tier-label">
                    ${flagPath ? `<img src="${flagPath}" class="civ-flag" alt="${civ.name}">` : ''}
                    <span>${civ.name}</span>
                </div>
                <select class="tier-select" id="${sectionPrefix}-team-tier-${map.id}-${civ.id}" data-civ="${civ.id}" data-mode="team-ranked">
                    <option value="">-</option>
                    ${tiers.map(tier => `<option value="${tier}" ${selectedTier === tier ? 'selected' : ''}>${tier}</option>`).join('')}
                </select>
            </div>
        `;
    });
    html += '</div></div>';
    
    html += '</div></div>';
    return html;
}

// Toggle inline edit form for map
function toggleInlineEditMap(mapId, sectionPrefix = 'edit') {
    console.log('toggleInlineEditMap called with mapId:', mapId, 'sectionPrefix:', sectionPrefix);
    
    // Close any other open inline edit forms
    document.querySelectorAll('.map-inline-edit').forEach(form => {
        if (form.id !== `${sectionPrefix}-edit-${mapId}`) {
            form.style.display = 'none';
        }
    });
    
    const editForm = document.getElementById(`${sectionPrefix}-edit-${mapId}`);
    console.log('Edit form found:', !!editForm, 'ID:', `${sectionPrefix}-edit-${mapId}`);
    
    if (!editForm) {
        console.error('Edit form not found for mapId:', mapId, 'sectionPrefix:', sectionPrefix);
        return;
    }
    
    const isVisible = editForm.style.display === 'block';
    if (isVisible) {
        editForm.style.display = 'none';
        console.log('Form closed');
    } else {
        editForm.style.display = 'block';
        console.log('Form opened');
    }
}

// Make function available globally immediately
window.toggleInlineEditMap = toggleInlineEditMap;

// Save inline map edit
async function saveInlineMapEdit(mapId, sectionPrefix = 'edit') {
    // Check if file access is available, request if not
    const hasAccess = await checkAndRequestFileAccess('save the map changes');
    if (!hasAccess) {
        return;
    }
    
    const mapName = document.getElementById(`${sectionPrefix}-edit-name-${mapId}`).value.trim();
    const mapType = document.querySelector(`input[name="${sectionPrefix}-edit-type-${mapId}"]:checked`)?.value;
    const isRanked = document.getElementById(`${sectionPrefix}-edit-ranked-${mapId}`).checked;
    const isTeamRanked = document.getElementById(`${sectionPrefix}-edit-team-ranked-${mapId}`).checked;
    const userNotes = document.getElementById(`${sectionPrefix}-edit-user-notes-${mapId}`).value.trim();
    const sheepPattern = document.getElementById(`${sectionPrefix}-edit-sheep-pattern-${mapId}`).value.trim();
    
    if (!mapName) {
        showNotification('Please enter a map name', 'error');
        return;
    }
    
    if (!mapType) {
        showNotification('Please select a map type', 'error');
        return;
    }
    
    // Find and update the map in mapsData
    const mapIndex = mapsData.findIndex(m => m.id === mapId);
    if (mapIndex === -1) {
        showNotification('Map not found', 'error');
        return;
    }
    
    // Collect tier lists
    const rankedTierlist = {};
    const teamRankedTierlist = {};
    
    // Get ranked tierlist values
    document.querySelectorAll(`#${sectionPrefix}-edit-${mapId} select[id^="${sectionPrefix}-ranked-tier-${mapId}-"]`).forEach(select => {
        const civId = select.getAttribute('data-civ');
        const tier = select.value;
        if (tier) rankedTierlist[civId] = tier;
    });
    
    // Get team ranked tierlist values
    document.querySelectorAll(`#${sectionPrefix}-edit-${mapId} select[id^="${sectionPrefix}-team-tier-${mapId}-"]`).forEach(select => {
        const civId = select.getAttribute('data-civ');
        const tier = select.value;
        if (tier) teamRankedTierlist[civId] = tier;
    });
    
    // Update map data
    mapsData[mapIndex] = {
        ...mapsData[mapIndex],
        name: mapName,
        type: mapType,
        isRanked: isRanked,
        isTeamRanked: isTeamRanked,
        userNotes: userNotes,
        sheepPattern: sheepPattern,
        rankedTierlist: rankedTierlist,
        teamRankedTierlist: teamRankedTierlist,
        lastModified: new Date().toISOString()
    };
    
    // Save and refresh (using await for consistency with async function)
    await saveMapsData();
    displayMapPools();
    displayAllMaps();

    // Update Quick Match maps data to stay in sync
    window.quickMatchMaps = getVisibleMaps();

    // Refresh Quick Match dropdown if it exists
    if (typeof populateMapDropdown === 'function') {
        populateMapDropdown();
    }

    showNotification('Map updated successfully!', 'success');
}

// Cancel inline map edit
function cancelInlineMapEdit(mapId, sectionPrefix = 'edit') {
    const editForm = document.getElementById(`${sectionPrefix}-edit-${mapId}`);
    if (editForm) {
        editForm.style.display = 'none';
    }
}

// Make save and cancel functions available globally immediately
window.saveInlineMapEdit = saveInlineMapEdit;
window.cancelInlineMapEdit = cancelInlineMapEdit;

// Edit map (legacy function for backwards compatibility)
function editMap(mapId) {
    const map = mapsData.find(m => m.id === mapId);
    if (!map) return;
    
    currentEditingMap = map;
    
    // Populate form
    document.getElementById('map-name').value = map.name;
    document.querySelector(`input[name="map-type-radio"][value="${map.type}"]`).checked = true;
    document.getElementById('map-ranked-pool').checked = map.isRanked;
    document.getElementById('map-team-ranked-pool').checked = map.isTeamRanked;
    document.getElementById('map-user-notes').value = map.userNotes || '';
    document.getElementById('map-sheep-pattern').value = map.sheepPattern || '';
    
    // Set tier lists
    Object.entries(map.rankedTierlist || {}).forEach(([civId, tier]) => {
        const select = document.querySelector(`#ranked-civ-tierlist select[data-civ="${civId}"]`);
        if (select) select.value = tier;
    });
    
    Object.entries(map.teamRankedTierlist || {}).forEach(([civId, tier]) => {
        const select = document.querySelector(`#team-ranked-civ-tierlist select[data-civ="${civId}"]`);
        if (select) select.value = tier;
    });
    
    // Scroll to form
    document.querySelector('.map-manager').scrollIntoView({ behavior: 'smooth' });
}

// Delete map
async function deleteMap(mapId) {
    // Check if file access is available, request if not
    const hasAccess = await checkAndRequestFileAccess('delete the map');
    if (!hasAccess) {
        return;
    }

    if (!confirm('Are you sure you want to delete this map?')) return;

    const removedMap = mapsData.find(m => m.id === mapId);
    const removedIsDefault = removedMap && defaultMapsCache && defaultMapsCache.some(d => d.id === mapId);

    mapsData = mapsData.filter(m => m.id !== mapId);

    // Deleted default maps get a hidden tombstone so they are not
    // re-added from maps-data-default.json on the next load.
    if (removedIsDefault) {
        mapsData.push({ ...removedMap, hidden: true });
    }

    // Save and refresh (using await for consistency with async function)
    await saveMapsData();
    displayMapPools();
    displayAllMaps();

    // Update Quick Match maps data to stay in sync
    window.quickMatchMaps = getVisibleMaps();

    // Refresh Quick Match dropdown if it exists
    if (typeof populateMapDropdown === 'function') {
        populateMapDropdown();
    }
}

// Generate unique ID
function generateId() {
    return `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create compact tierlist HTML
function createCompactTierlist(tierlist) {
    if (!tierlist || Object.keys(tierlist).length === 0) {
        return '';
    }
    
    // Define tier order
    const tierOrder = ['S', 'A', 'B', 'C', 'D'];
    
    // Group civilizations by tier
    const tierGroups = {};
    Object.entries(tierlist).forEach(([civId, tier]) => {
        if (!tierGroups[tier]) {
            tierGroups[tier] = [];
        }
        const civ = civilizations.find(c => c.id === civId);
        if (civ) {
            tierGroups[tier].push({ civId, civ });
        }
    });
    
    // Create HTML for each tier row
    return tierOrder.map(tier => {
        if (!tierGroups[tier] || tierGroups[tier].length === 0) {
            return '';
        }
        
        const civItems = tierGroups[tier].map(({ civId, civ }) => {
            const flagPath = getCivFlag(civId);
            const flagHtml = flagPath ? `<img src="${flagPath}" class="civ-flag" alt="${civ.name}">` : '';
            return `<span class="tier-civ-item">${flagHtml}${civ.name}</span>`;
        }).join('');
        
        return `<div class="tier-row-compact"><strong>${tier}:</strong> ${civItems}</div>`;
    }).filter(row => row !== '').join('');
}

// Toggle map dropdown
function toggleMapDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    const toggle = document.getElementById(`toggle-${dropdownId}`);
    
    if (!dropdown || !toggle) return;
    
    const isExpanded = dropdown.classList.contains('expanded');
    
    // Close all other dropdowns
    document.querySelectorAll('.map-dropdown-content.expanded').forEach(d => {
        if (d.id !== dropdownId) {
            d.classList.remove('expanded');
            const toggleBtn = document.getElementById(`toggle-${d.id}`);
            if (toggleBtn) toggleBtn.classList.remove('expanded');
        }
    });
    
    // Toggle this dropdown
    dropdown.classList.toggle('expanded');
    toggle.classList.toggle('expanded');
}

// Refresh maps display (for debugging)
async function refreshMaps() {
    console.log('Refreshing maps...');
    console.log('Current mapsData before refresh:', mapsData);
    
    // Clear the cache
    mapsData = [];
    window.quickMatchMaps = [];
    
    // Reload fresh data
    await loadMapsData();
    console.log('Maps loaded. New mapsData:', mapsData);
    console.log('Looking for Canal:', mapsData.find(m => m.name === 'Canal'));
    
    // Re-display everything
    displayMapPools();
    displayAllMaps();
    
    // Also refresh Quick Match dropdown
    if (typeof populateMapDropdown === 'function') {
        populateMapDropdown();
    }
    
    console.log('Maps refreshed successfully');
    showNotification('Maps refreshed!', 'success');
}

// Export maps functions to global scope
window.initializeMaps = initializeMaps;
window.mergeMapData = mergeMapData;
window.saveMap = saveMap;
window.clearMapForm = clearMapForm;
window.editMap = editMap;
window.deleteMap = deleteMap;
window.refreshMaps = refreshMaps;
window.loadMapsData = loadMapsData;
window.displayMapPools = displayMapPools;
window.displayAllMaps = displayAllMaps;
window.toggleMapPoolMembership = toggleMapPoolMembership;
window.toggleAddMapPanel = toggleAddMapPanel;
window.renderAddMapPoolList = renderAddMapPoolList;
window.addMapToPool = addMapToPool;
// Test hook: replace the in-memory maps data (jsdom test harness sets data
// here because top-level `let` bindings are script-scoped in the harness)
window.__setMapsData = function (arr) {
    mapsData = Array.isArray(arr) ? arr : [];
    return mapsData.length;
};
window.filterMapsForDisplay = filterMapsForDisplay;
window.selectMapsListType = selectMapsListType;
window.selectMapsListPool = selectMapsListPool;
window.applyMapsListFilter = applyMapsListFilter;
window.toggleMapDropdown = toggleMapDropdown;
// Make functions available immediately
window.toggleInlineEditMap = toggleInlineEditMap;
window.saveInlineMapEdit = saveInlineMapEdit;
window.cancelInlineMapEdit = cancelInlineMapEdit;

// Debug: Log when functions are exposed
console.log('Maps.js: Functions exposed to window:', {
    toggleInlineEditMap: typeof window.toggleInlineEditMap,
    saveInlineMapEdit: typeof window.saveInlineMapEdit,
    cancelInlineMapEdit: typeof window.cancelInlineMapEdit
});

// Note: DOMContentLoaded listener removed - functions are already exposed above
// Adding duplicate listeners would be unnecessary and could cause memory issues