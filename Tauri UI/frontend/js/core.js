// Core application state and basic functionality
// Application State
let civilizations = [];
let selectedCiv = null;
let buildOrderDatabase = {};

// Flag to prevent duplicate initialization (memory leak fix)
let appInitialized = false;

// Store timeout IDs for potential cleanup
const initializationTimeouts = [];

// Open external URLs in the system browser.
// In Tauri the webview cannot open http(s) links itself (window.open and
// target="_blank" are inert), so this goes through the open_external_url
// command. Falls back to window.open in browser mode.
async function openExternalUrl(url) {
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
        try {
            await window.__TAURI__.core.invoke('open_external_url', { url: url });
            return true;
        } catch (error) {
            console.error('open_external_url failed:', error);
            if (typeof showNotification === 'function') {
                showNotification('Could not open link: ' + error.message, 'error');
            }
            return false;
        }
    }
    window.open(url, '_blank');
    return true;
}
window.openExternalUrl = openExternalUrl;

// Route "Open Guide"/"bo-link" anchors through the system browser in Tauri mode
document.addEventListener('click', function(event) {
    const anchor = event.target.closest && event.target.closest('a[href^="http"]');
    if (!anchor) return;
    if (!(window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke)) return;
    event.preventDefault();
    openExternalUrl(anchor.href);
});

// Navigation
function showSection(sectionName) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show selected section
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionName).classList.add('active');
    
    // Check file access status for specific sections
    if (sectionName === 'strategy') {
        checkFileAccessStatus('strategy');
    // LEGACY: Creator and viewer sections kept but removed from navigation
    } else if (sectionName === 'build-order-creator') {
        checkFileAccessStatus('creator');
    } else if (sectionName === 'build-order-viewer') {
        checkFileAccessStatus('viewer');
    } else if (sectionName === 'maps') {
        checkFileAccessStatus('maps');
    } else if (sectionName === 'matchup') {
        checkFileAccessStatus('matchup');
    }

    // Civs tab embeds the shared Build Orders filter and Match Setup at its bottom.
    if (sectionName === 'civs') {
        if (typeof moveBuildOrdersToCivs === 'function') moveBuildOrdersToCivs();
        if (typeof moveMatchSetupToCivs === 'function') moveMatchSetupToCivs();
    } else {
        if (typeof moveBuildOrdersBackToHome === 'function') moveBuildOrdersBackToHome();
        if (typeof moveMatchSetupBackToHome === 'function') moveMatchSetupBackToHome();
    }
}

// Utility Classes
class UIHelpers {
    static showElement(element) {
        if (element) element.classList.remove('hidden');
    }
    
    static hideElement(element) {
        if (element) element.classList.add('hidden');
    }
    
    static toggleElement(element) {
        if (element) element.classList.toggle('hidden');
    }
}

// Initialize app when DOM is loaded
// Memory leak fix: Prevent duplicate initialization
document.addEventListener('DOMContentLoaded', async function() {
    // Prevent duplicate initialization
    if (appInitialized) {
        console.log('App already initialized, skipping...');
        return;
    }
    appInitialized = true;

    console.log('AoE4 Strategyzer initializing...');

    // TAURI: File system variables are set by tauri-adapter.js

    // Load default civilizations
    loadDefaultCivs();
    
    // Initialize components
    populateCivDropdowns();
    populateBuildOrderForm();
    populateFilterDropdown();
    
    // Initial load of local build orders if civilization is already selected
    // Store timeout ID for potential cleanup
    initializationTimeouts.push(setTimeout(() => {
        const buildCivSelect = document.getElementById('build-civ-select');
        const buildCivText = document.getElementById('build-civ-select-text');

        // Check if a civ is displayed but hidden input is empty
        if (buildCivText && buildCivText.textContent && buildCivText.textContent !== 'Select civilization...' && (!buildCivSelect || !buildCivSelect.value)) {
            // Find the matching civilization
            const displayedCivName = buildCivText.textContent.trim();
            const matchingCiv = civilizations.find(civ => civ.name === displayedCivName);

            if (matchingCiv && buildCivSelect) {
                console.log('Setting initial civilization:', matchingCiv.id);
                buildCivSelect.value = matchingCiv.id;

                // Trigger change event
                const changeEvent = new Event('change', { bubbles: true });
                buildCivSelect.dispatchEvent(changeEvent);
            }
        } else if (buildCivSelect && buildCivSelect.value && window.loadLocalBuildOrdersForDropdown) {
            // Hidden input already has value
            window.loadLocalBuildOrdersForDropdown(buildCivSelect.value);
        }
    }, 500));

    // Ensure dropdowns are populated after DOM settles
    initializationTimeouts.push(setTimeout(() => {
        populateFilterDropdown();
        populateBuildOrderForm();
    }, 100));

    // Initialize tierlist (async to properly load from files first)
    await initializeTierlist();
    initializationTimeouts.push(setTimeout(enableTierDragDrop, 100)); // Ensure DOM is ready
    
    // Set initial file access status
    updateFileAccessStatus();
    
    // Check file access status for all tabs
    checkFileAccessStatus('maps');
    checkFileAccessStatus('build-orders');
    checkFileAccessStatus('strategy');
    // LEGACY: Creator and viewer status checks kept but removed from navigation
    checkFileAccessStatus('creator');
    checkFileAccessStatus('viewer');
    
    // TAURI: No setup hint needed - file system is always available
    
    // Load build orders from JSON files (initial attempt)
    await loadAllCivBuildOrders();
    
    // Update filter after build orders are loaded
    filterBuildOrders();
    
    // TAURI: File system is always ready, retry not needed but kept for safety
    initializationTimeouts.push(setTimeout(async () => {
        if (Object.keys(buildOrderDatabase).length === 0) {
            console.log('Retrying build order loading...');
            await loadAllCivBuildOrders();
            filterBuildOrders();
        }
    }, 1000));
    
    // Initialize maps section
    if (typeof initializeMaps === 'function') {
        initializeMaps();
    }
    
    // Initialize Quick Match Setup
    initializeQuickMatchSetup();
    
    // LEGACY: Initialize Build Order Creator and Viewer - kept for future use
    
    // Initialize Matchup module
    if (typeof initializeMatchup === 'function') {
        initializeMatchup();
    }
    
    // Initialize unified strategy functionality
    if (typeof initializeStrategyUnified === 'function') {
        initializeStrategyUnified();
    }

    // Initialize Civs tab
    if (typeof initializeCivs === 'function') {
        initializeCivs();
    }
    
    // Initialize dropdown visual states after everything is loaded
    if (typeof initializeDropdownVisualStates === 'function') {
        initializationTimeouts.push(setTimeout(initializeDropdownVisualStates, 200));
    }
    
    console.log('AoE4 Strategyzer initialized successfully');
});

// Quick Match Setup functionality
async function initializeQuickMatchSetup() {
    console.log('Initializing Quick Match Setup...');
    // Wait for maps to be loaded
    await loadQuickMatchMaps();
    console.log('Quick Match maps loaded:', window.quickMatchMaps?.length || 0, 'maps');
    populateMapDropdown();
    console.log('Map dropdown populated');
}

// Load maps data for Quick Match Setup
// TAURI: merge maps-data-default.json with user data from APPDATA
async function loadQuickMatchMaps() {
    try {
        let defaults = [];

        // Defaults shipped with the app (read-only base data)
        try {
            const defResponse = await fetch('maps/maps-data-default.json');
            if (defResponse.ok) {
                const parsedDefaults = JSON.parse(await defResponse.text());
                if (Array.isArray(parsedDefaults)) defaults = parsedDefaults;
            }
        } catch (defError) {
            console.log('No default maps data found');
        }

        let userMaps = [];

        // User data: APPDATA first, falls back to embedded maps-data.json
        if (window.readFileSystemFile) {
            const content = await window.readFileSystemFile('maps', 'maps-data.json');
            if (content) {
                try {
                    const appdataMaps = JSON.parse(content);
                    if (Array.isArray(appdataMaps)) userMaps = appdataMaps;
                    console.log('Loaded quick match maps from APPDATA:', userMaps.length);
                } catch (parseError) {
                    console.warn('Could not parse maps file from APPDATA:', parseError);
                }
            }
        }

        if (userMaps.length === 0) {
            try {
                const response = await fetch('maps/maps-data.json');
                if (response.ok) {
                    const embeddedMaps = JSON.parse(await response.text());
                    if (Array.isArray(embeddedMaps)) userMaps = embeddedMaps;
                }
            } catch (fetchError) {
                console.log('No embedded maps data found');
            }
        }

        // User maps override defaults, missing defaults are added
        window.quickMatchMaps = typeof window.mergeMapData === 'function' ?
            window.mergeMapData(defaults, userMaps).filter(m => !m.hidden) :
            defaults.concat(userMaps.filter(m => !m.hidden));
    } catch (error) {
        console.error('Error loading quick match maps:', error);
        window.quickMatchMaps = [];
    }
}

// Populate map dropdown in Quick Match Setup
// Pool filter of the Quick Match Setup: 'ranked' | 'team-ranked' | 'all'.
// Defaults to 'ranked' so the Map dropdown only shows the current pool.
function getMatchPoolFilter() {
    const el = document.getElementById('match-pool');
    return el && el.value ? el.value : 'ranked';
}

// Maps of the selected pool, sorted alphabetically
function getMatchPoolFilteredMaps() {
    const pool = getMatchPoolFilter();
    return (window.quickMatchMaps || []).filter(m => {
        if (pool === 'ranked') return m.isRanked;
        if (pool === 'team-ranked') return m.isTeamRanked;
        return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
}

// Pool selection in Quick Match Setup
function selectMatchPool(value, label) {
    const el = document.getElementById('match-pool');
    const textEl = document.getElementById('match-pool-text');
    if (el) el.value = value;
    if (textEl) textEl.textContent = label;
    if (typeof closeCustomDropdown === 'function') closeCustomDropdown('match-pool');

    // Reset the map selection when it is no longer part of the pool
    const selectedId = document.getElementById('map-select')?.value;
    if (selectedId && !getMatchPoolFilteredMaps().some(m => m.id === selectedId)) {
        const mapHidden = document.getElementById('map-select');
        const mapText = document.getElementById('map-select-text');
        if (mapHidden) mapHidden.value = '';
        if (mapText) mapText.textContent = 'Select map...';
        hideMapInfo();
    }

    populateMapDropdown();
    if (typeof autoGetStrategyRecommendation === 'function') {
        autoGetStrategyRecommendation();
    }
}
window.selectMatchPool = selectMatchPool;

function populateMapDropdown() {
    const optionsContainer = document.getElementById('map-select-options');
    console.log('populateMapDropdown called');
    console.log('optionsContainer element found:', !!optionsContainer);
    console.log('quickMatchMaps available:', !!window.quickMatchMaps);
    console.log('maps data:', window.quickMatchMaps);

    if (!optionsContainer) {
        console.error('Map dropdown options container not found');
        return;
    }

    if (!window.quickMatchMaps) {
        console.error('No quick match maps data available');
        return;
    }

    // Only maps of the selected pool, sorted alphabetically
    const sortedMaps = getMatchPoolFilteredMaps();
    console.log('sorted maps:', sortedMaps);
    
    // Clear existing options and add default option
    optionsContainer.innerHTML = '<div class="dropdown-option" onclick="selectMap(\'\', \'Select map...\')">Select map...</div>';
    
    // Add map options
    sortedMaps.forEach(map => {
        const typeLabel = map.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.textContent = `${map.name} (${typeLabel})`;
        option.onclick = () => selectMap(map.id, `${map.name} (${typeLabel})`, map.type);
        optionsContainer.appendChild(option);
    });
}

// Handle map selection in Quick Match Setup
function onMapSelect() {
    const mapSelect = document.getElementById('map-select');
    const mapId = mapSelect.value;
    
    if (mapId && window.quickMatchMaps) {
        const map = window.quickMatchMaps.find(m => m.id === mapId);
        if (map) {
            // Auto-update map type dropdown
            selectMapType(map.type, map.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()));
            
            // Display map information
            displayMapInfo(mapId);
        }
    } else {
        // Hide map info if no map selected
        hideMapInfo();
    }
    
    // Trigger strategy recommendation update
    if (typeof autoGetStrategyRecommendation === 'function') {
        autoGetStrategyRecommendation();
    }
}

// Display map information in Quick Match Setup
function displayMapInfo(mapId) {
    if (!window.quickMatchMaps || !mapId) {
        hideMapInfo();
        return;
    }
    
    const map = window.quickMatchMaps.find(m => m.id === mapId);
    if (!map) {
        hideMapInfo();
        return;
    }
    
    // Show map info grid
    const mapInfoGrid = document.getElementById('map-info-grid');
    if (mapInfoGrid) {
        mapInfoGrid.classList.remove('hidden');
    }
    
    // Update user notes
    const userNotesSection = document.getElementById('map-user-notes-section');
    const userNotesValue = document.getElementById('map-user-notes-value');
    if (map.userNotes && map.userNotes.trim()) {
        userNotesValue.textContent = map.userNotes;
        userNotesSection.style.display = 'block';
    } else {
        userNotesSection.style.display = 'none';
    }
    
    // Update sheep pattern
    const sheepPatternSection = document.getElementById('map-sheep-pattern-section');
    const sheepPatternValue = document.getElementById('map-sheep-pattern-value');
    if (map.sheepPattern && map.sheepPattern.trim()) {
        sheepPatternValue.textContent = map.sheepPattern;
        sheepPatternSection.style.display = 'block';
    } else {
        sheepPatternSection.style.display = 'none';
    }
    
    // Update ranked tierlist
    const rankedTierlistSection = document.getElementById('map-ranked-tierlist-section');
    const rankedTierlistDisplay = document.getElementById('map-ranked-tierlist-display');
    if (map.rankedTierlist && Object.keys(map.rankedTierlist).length > 0) {
        const rankedTiers = createCompactTierlistForQuickMatch(map.rankedTierlist);
        rankedTierlistDisplay.innerHTML = rankedTiers;
        rankedTierlistSection.style.display = 'block';
    } else {
        rankedTierlistSection.style.display = 'none';
    }
    
}

// Hide map information
function hideMapInfo() {
    const mapInfoGrid = document.getElementById('map-info-grid');
    if (mapInfoGrid) {
        mapInfoGrid.classList.add('hidden');
    }
}

// Create compact tierlist HTML for Quick Match (reusing maps module logic)
function createCompactTierlistForQuickMatch(tierlist) {
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
            const flagPath = getCivFlag ? getCivFlag(civId) : null;
            const flagHtml = flagPath ? `<img src="${flagPath}" class="civ-flag" alt="${civ.name}">` : '';
            return `<span class="tier-civ-item">${flagHtml}${civ.name}</span>`;
        }).join('');
        
        return `<div class="tier-row-compact"><strong>${tier}:</strong> ${civItems}</div>`;
    }).filter(row => row !== '').join('');
}

// Refresh Quick Match maps manually
async function refreshQuickMatchMaps() {
    console.log('Manually refreshing Quick Match maps...');
    await loadQuickMatchMaps();
    populateMapDropdown();
}

// Helper function to check if all required values are present and load matchup info
function checkAndLoadMatchupInfo() {
    console.log('=== checkAndLoadMatchupInfo called ===');
    
    const myCiv = document.getElementById('my-civ').value;
    const opponentCiv = document.getElementById('opponent-civ').value; 
    const mapType = document.getElementById('map-type').value;
    
    console.log('Values check:', { myCiv, opponentCiv, mapType });
    
    if (myCiv && opponentCiv && mapType) {
        console.log('All values present, loading matchup info...');
        loadMatchupInfoForHome();
    } else {
        console.log('Not all values present, hiding matchup info');
        // Hide Matchup Info if not all values are present
        const matchupInfoGrid = document.getElementById('matchup-info-grid');
        if (matchupInfoGrid) {
            matchupInfoGrid.classList.add('hidden');
        }
    }
}

// Load matchup info for home tab
async function loadMatchupInfoForHome() {
    const myCivId = document.getElementById('my-civ').value;
    const opponentCivId = document.getElementById('opponent-civ').value;
    const mapType = document.getElementById('map-type').value;
    const matchupInfoGrid = document.getElementById('matchup-info-grid');
    
    console.log('=== loadMatchupInfoForHome called ===');
    console.log('myCivId:', myCivId);
    console.log('opponentCivId:', opponentCivId);
    console.log('mapType:', mapType);
    
    if (!myCivId || !opponentCivId || !matchupInfoGrid) {
        if (matchupInfoGrid) {
            matchupInfoGrid.classList.add('hidden');
        }
        console.log('Missing required values, hiding matchup info');
        return;
    }
    
    try {
        let matchupData = null;
        let buildOrderData = null;

        // TAURI: Load matchup data from both sources and merge (APPDATA has priority)
        try {
            let embeddedMatchups = null;
            let appdataMatchups = null;

            // First load embedded assets (base data)
            try {
                const matchupResponse = await fetch(`matchup/${myCivId}-matchups.json`);
                if (matchupResponse.ok) {
                    embeddedMatchups = await matchupResponse.json();
                    console.log('Loaded matchup data from embedded assets for Home:', myCivId);
                }
            } catch (fetchError) {
                console.log('No embedded matchup data found');
            }

            // Then try APPDATA via Tauri FS API (user-saved data, has priority)
            if (window.readFileSystemFile) {
                const content = await window.readFileSystemFile('matchup', `${myCivId}-matchups.json`);
                if (content) {
                    try {
                        appdataMatchups = JSON.parse(content);
                        console.log('Loaded matchup data from APPDATA for Home:', myCivId);
                    } catch (parseError) {
                        console.warn('Could not parse matchup file from APPDATA:', parseError);
                    }
                }
            }

            // Merge data: APPDATA overrides embedded, but embedded serves as fallback
            let allMatchups = null;
            if (appdataMatchups && embeddedMatchups) {
                // Deep merge: start with embedded, override with APPDATA
                allMatchups = JSON.parse(JSON.stringify(embeddedMatchups)); // Clone embedded
                // Merge APPDATA matchups over embedded
                if (appdataMatchups[myCivId]) {
                    if (!allMatchups[myCivId]) {
                        allMatchups[myCivId] = {};
                    }
                    Object.assign(allMatchups[myCivId], appdataMatchups[myCivId]);
                }
                console.log('Merged matchup data from both sources');
            } else if (appdataMatchups) {
                allMatchups = appdataMatchups;
            } else if (embeddedMatchups) {
                allMatchups = embeddedMatchups;
            }

            if (allMatchups) {
                matchupData = allMatchups[myCivId]?.[opponentCivId];
                console.log('Loaded matchup data:', matchupData);
            }
        } catch (error) {
            console.log('No matchup data found:', error);
        }
        
        // Get build orders from the global buildOrderDatabase (NOT from legacy files!)
        if (window.buildOrderDatabase && window.buildOrderDatabase[myCivId]) {
            buildOrderData = {
                civilization: myCivId,
                buildOrders: window.buildOrderDatabase[myCivId]
            };
            console.log('Using build orders from buildOrderDatabase for:', myCivId);
            console.log('Available build orders:', Object.keys(window.buildOrderDatabase[myCivId] || {}));
        } else {
            console.log('No build orders found in buildOrderDatabase for:', myCivId);
        }
        
        // Display matchup info
        if (matchupData || buildOrderData) {
            matchupInfoGrid.classList.remove('hidden');
            displayMatchupInfo(matchupData, buildOrderData, myCivId, opponentCivId, mapType);
        } else {
            matchupInfoGrid.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error loading matchup info:', error);
        matchupInfoGrid.classList.add('hidden');
    }
}

// Display matchup info in home tab
function displayMatchupInfo(matchupData, buildOrderData, myCivId, opponentCivId, mapType) {
    // Build Orders Section
    const buildOrdersSection = document.getElementById('matchup-build-orders-section');
    const recommendedBOList = document.getElementById('matchup-recommended-build-orders');
    
    recommendedBOList.innerHTML = '';
    
    // Simply show all build orders from the matchup data
    if (matchupData?.buildOrders && matchupData.buildOrders.length > 0) {
        buildOrdersSection.style.display = 'block';
        console.log('Displaying build orders from matchup:', matchupData.buildOrders);
        
        matchupData.buildOrders.forEach(boName => {
            // Try to get details from buildOrderDatabase if available
            const boDetails = buildOrderData?.buildOrders?.[boName] || window.buildOrderDatabase?.[myCivId]?.[boName];
            
            console.log(`=== Processing matchup build order: "${boName}" ===`);
            console.log('boDetails found:', !!boDetails);
            
            if (boDetails) {
                console.log('boDetails.mapTypes:', boDetails.mapTypes);
                console.log('Current mapType:', mapType);
                
                // Check if build order works for this map type
                const worksForMapType = !mapType || !boDetails.mapTypes || boDetails.mapTypes.includes(mapType);
                console.log('worksForMapType:', worksForMapType);
                
                if (worksForMapType) {
                    console.log(`✅ Showing build order "${boName}" - works for map type`);
                    const boItem = createBuildOrderItemForHome(boName, boDetails);
                    recommendedBOList.appendChild(boItem);
                } else {
                    console.log(`❌ Hiding build order "${boName}" - doesn't work for map type`);
                }
            } else {
                // If no details found, just show the name (no filtering possible)
                console.log(`⚠️ No details found for build order "${boName}", showing name only`);
                const boItem = document.createElement('div');
                boItem.className = 'build-order-item';
                boItem.innerHTML = `
                    <div class="build-order-header">
                        <h5>${boName}</h5>
                        <span class="build-order-link-text">not found</span>
                    </div>
                `;
                recommendedBOList.appendChild(boItem);
            }
        });
    } else {
        buildOrdersSection.style.display = 'none';
        console.log('No build orders in matchup data');
    }
    
    // Strategies Section
    const strategiesSection = document.getElementById('matchup-strategies-section');
    const strategiesList = document.getElementById('matchup-strategies-list');
    strategiesList.innerHTML = '';
    
    const strategies = [];
    if (matchupData?.strategies) {
        Object.entries(matchupData.strategies)
            .sort((a, b) => parseInt(a[0].replace('strat', ''), 10) - parseInt(b[0].replace('strat', ''), 10))
            .forEach(([key, text]) => {
                if (text) strategies.push({ text: text, number: key.replace('strat', '') });
            });
    }
    
    if (strategies.length > 0) {
        strategiesSection.style.display = 'block';
        strategies.forEach(strat => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>Strat ${strat.number}:</strong> ${strat.text}`;
            strategiesList.appendChild(li);
        });
    } else {
        strategiesSection.style.display = 'none';
    }
    
    // Tactics Section
    const tacticsSection = document.getElementById('matchup-tactics-section');
    const tacticsList = document.getElementById('matchup-tactics-list');
    tacticsList.innerHTML = '';
    
    const tactics = [];
    if (matchupData?.tactics) {
        Object.entries(matchupData.tactics)
            .sort((a, b) => parseInt(a[0].replace('tak', ''), 10) - parseInt(b[0].replace('tak', ''), 10))
            .forEach(([key, text]) => {
                if (text) tactics.push(text);
            });
    }
    
    if (tactics.length > 0) {
        tacticsSection.style.display = 'block';
        tactics.forEach(tactic => {
            const li = document.createElement('li');
            li.textContent = tactic;
            tacticsList.appendChild(li);
        });
    } else {
        tacticsSection.style.display = 'none';
    }
    
    // Attention Points Section
    const attentionSection = document.getElementById('matchup-attention-section');
    const attentionList = document.getElementById('matchup-attention-list');
    attentionList.innerHTML = '';
    
    const attentionPoints = [];
    if (matchupData?.attention) {
        Object.entries(matchupData.attention)
            .sort((a, b) => parseInt(a[0].replace('att', ''), 10) - parseInt(b[0].replace('att', ''), 10))
            .forEach(([key, text]) => {
                if (text) attentionPoints.push(text);
            });
    }
    
    if (attentionPoints.length > 0) {
        attentionSection.style.display = 'block';
        attentionPoints.forEach(point => {
            const li = document.createElement('li');
            li.textContent = point;
            attentionList.appendChild(li);
        });
    } else {
        attentionSection.style.display = 'none';
    }
}

// Create build order item for home tab display
function createBuildOrderItemForHome(buildOrderName, details) {
    const boItem = document.createElement('div');
    boItem.className = 'build-order-item';
    boItem.style.cursor = 'pointer';
    
    // Determine if it's a local or external build order
    const isLocalUrl = details.url && details.url.startsWith('local://');
    const linkTypeText = isLocalUrl ? 'local' : 'external';
    
    // Set up data attributes and click handler
    if (isLocalUrl) {
        boItem.setAttribute('data-is-local', 'true');
        boItem.setAttribute('data-url', details.url);
        boItem.setAttribute('data-civ-id', details.civId || '');
        boItem.setAttribute('data-name', buildOrderName);
    } else {
        boItem.setAttribute('data-is-local', 'false');
        boItem.setAttribute('data-url', details.url || '');
        boItem.setAttribute('data-name', buildOrderName);
    }
    
    boItem.onclick = function(event) {
        if (isLocalUrl) {
            if (typeof handleBuildOrderItemClick === 'function') {
                handleBuildOrderItemClick(this, event);
            }
        } else {
            // For external URLs, open directly
            if (details.url) {
                console.log('Opening external URL:', details.url);
                openExternalUrl(details.url);
            } else {
                console.error('No URL found for external build order:', buildOrderName);
            }
        }
    };
    
    // Create the HTML structure
    boItem.innerHTML = `
        <div class="build-order-header">
            <h5>${buildOrderName}</h5>
            <span class="build-order-link-text ${isLocalUrl ? 'local' : 'external'}">${linkTypeText}</span>
        </div>
        ${details.notes ? `<p class="build-order-notes"><strong>Notes:</strong> ${details.notes}</p>` : ''}
    `;
    
    return boItem;
}


// Map selection function for custom dropdown
function selectMap(mapId, displayText, mapType) {
    const mapSelect = document.getElementById('map-select');
    const mapSelectText = document.getElementById('map-select-text');
    
    if (mapSelect && mapSelectText) {
        mapSelect.value = mapId;
        mapSelectText.textContent = displayText;
        closeCustomDropdown('map-select');
        
        // Update visual selection state
        if (typeof updateDropdownSelectionVisual === 'function') {
            updateDropdownSelectionVisual('map-select', mapId);
        }
        
        // Auto-update map type if provided
        if (mapType) {
            selectMapType(mapType, mapType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()));
        }
        
        // Trigger existing handlers
        onMapSelect();
    }
}

// Map Type selection function for custom dropdown
function selectMapType(value, text) {
    const mapTypeSelect = document.getElementById('map-type');
    const mapTypeText = document.getElementById('map-type-text');
    
    if (mapTypeSelect && mapTypeText) {
        mapTypeSelect.value = value;
        mapTypeText.textContent = text;
        closeCustomDropdown('map-type');
        
        // Update visual selection state
        if (typeof updateDropdownSelectionVisual === 'function') {
            updateDropdownSelectionVisual('map-type', value);
        }
        
        // Trigger existing change handler
        if (typeof autoGetStrategyRecommendation === 'function') {
            autoGetStrategyRecommendation();
        }
        
        // Also check and load matchup info if all values are present
        if (typeof checkAndLoadMatchupInfo === 'function') {
            checkAndLoadMatchupInfo();
        }
    }
}

// Close custom dropdown function
function closeCustomDropdown(dropdownId) {
    const options = document.getElementById(dropdownId + '-options');
    const selected = document.querySelector(`#${dropdownId}-dropdown .dropdown-selected`);
    
    if (options && selected) {
        options.classList.remove('active');
        selected.classList.remove('active');
    }
}

// Export functions to global scope
window.initializeQuickMatchSetup = initializeQuickMatchSetup;
window.onMapSelect = onMapSelect;
window.refreshQuickMatchMaps = refreshQuickMatchMaps;
window.loadMatchupInfoForHome = loadMatchupInfoForHome;
window.selectMap = selectMap;
window.selectMapType = selectMapType;
window.closeCustomDropdown = closeCustomDropdown;