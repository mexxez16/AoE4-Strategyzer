// Tauri File System Adapter
// This file provides Tauri-specific file system functionality
// For embedded assets, we use fetch() to load JSON files directly via http://tauri.localhost/
// For writing files, we use Tauri's FS API (to be implemented when needed)

// ============================================================================
// TAURI DETECTION
// ============================================================================

// Detect Tauri by checking protocol (tauri:// or https://tauri.localhost)
const isTauriApp = window.__TAURI__ !== undefined ||
                   window.location.protocol === 'tauri:' ||
                   window.location.hostname === 'tauri.localhost';

console.log('Tauri detection:', {
    '__TAURI__': window.__TAURI__ !== undefined,
    'protocol': window.location.protocol,
    'hostname': window.location.hostname,
    'isTauriApp': isTauriApp
});

// Only execute if running in Tauri
if (isTauriApp) {
    console.log('Tauri Desktop Mode detected - Loading Tauri adapter...');

    // ============================================================================
    // TAURI 2.x FS API HELPERS (defined early for use throughout)
    // ============================================================================

    // BaseDirectory enum values from Tauri 2.x
    // See: https://v2.tauri.app/reference/javascript/fs/
    const BaseDirectory = {
        AppData: 14,      // Application data directory (e.g., C:\Users\<user>\AppData\Roaming\<app>)
        AppLocalData: 15, // Local application data
        AppCache: 16,     // Application cache directory
        Resource: 10      // Resource directory (embedded assets)
    };

    // Check if Tauri FS API is available
    function hasTauriFs() {
        return window.__TAURI__ && window.__TAURI__.fs;
    }

    // ============================================================================
    // FETCH-BASED FILE READING (for embedded assets)
    // ============================================================================

    // Read a file using fetch (works for embedded assets in Tauri)
    async function fetchFile(path) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                return await response.text();
            }
            console.log(`Fetch ${path}: status ${response.status}`);
            return null;
        } catch (error) {
            console.error(`Fetch error for ${path}:`, error);
            return null;
        }
    }

    // Read JSON file using fetch
    async function fetchJsonFile(path) {
        const content = await fetchFile(path);
        if (content) {
            try {
                return JSON.parse(content);
            } catch (e) {
                console.error(`JSON parse error for ${path}:`, e);
                return null;
            }
        }
        return null;
    }

    // ============================================================================
    // OVERRIDE loadMapsData - merge maps-data-default.json with APPDATA user data
    // ============================================================================

    window.loadMapsData = async function() {
        console.log('Tauri adapter: loadMapsData called (using fetch)');
        try {
            // Defaults shipped with the app (read-only base data)
            let defaults = [];
            try {
                const parsed = await fetchJsonFile('maps/maps-data-default.json');
                if (Array.isArray(parsed)) defaults = parsed;
            } catch (e) {
                console.log('Tauri adapter: No default maps data found');
            }

            // User data: APPDATA first, falls back to embedded maps-data.json
            let userMaps = [];
            const content = window.readFileSystemFile ?
                await window.readFileSystemFile('maps', 'maps-data.json') : null;
            if (content) {
                try {
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) userMaps = parsed;
                } catch (e) {
                    console.warn('Tauri adapter: Could not parse maps file:', e);
                }
            }

            // User maps override defaults, missing defaults are added
            const merged = typeof window.mergeMapData === 'function' ?
                window.mergeMapData(defaults, userMaps) :
                [...userMaps, ...defaults.filter(d =>
                    !userMaps.some(m => m && m.name && d.name &&
                        m.name.trim().toLowerCase() === d.name.trim().toLowerCase()))];

            window.mapsData = merged;
            if (typeof mapsData !== 'undefined') {
                // Also update the module-level variable if it exists
                mapsData.length = 0;
                mapsData.push(...merged);
            }
            window.quickMatchMaps = merged.filter(m => !m.hidden);
            console.log('Tauri adapter: Maps loaded:', merged.length, 'maps');
            return merged;
        } catch (error) {
            console.error('Tauri adapter: Error loading maps:', error);
            window.mapsData = [];
            window.quickMatchMaps = [];
            return [];
        }
    };

    // ============================================================================
    // OVERRIDE loadAllCivBuildOrders - Use fetch for embedded build orders
    // ============================================================================

    window.loadAllCivBuildOrders = async function() {
        console.log('Tauri adapter: loadAllCivBuildOrders called (using fetch)');

        // Initialize the global database
        if (typeof window.buildOrderDatabase === 'undefined') {
            window.buildOrderDatabase = {};
        }

        let totalBuildOrders = 0;

        // Known build order files per civilization (since we can't list directories via fetch)
        // This is populated from the actual file structure - we iterate over these keys directly
        const knownBuildOrders = {
            'abbasid': [
                '2-tc-standard.json',
                'abbassid-3-tc-fc-into-camels.json',
                's11-abba-eco-wing-2tc.json',
                'test-1.json',
                'test-2.json'
            ],
            'ayyubids': [
                '2-tc-zenagos.json',
                'ayyu-test.json',
                'beasty-ayyubids-fc.json',
                'fc.json',
                'feudal-aggro.json'
            ],
            'byzantines': [
                '5-cisterns-grand-winery.json',
                'fast-5-cisterns.json',
                'hippo-aggression.json'
            ],
            'chinese': [
                '1tc-io-song-valdemar.json',
                '2tc-no-io-song.json',
                '2tc-no-io-tang.json',
                '2tc-song-valdemar.json',
                'dark-age-spearman-io-fast.json',
                'dark-age-spearmen-io-slow.json',
                'fast-feudal-no-ui-zhu-ge-nu-all-in.json',
                'fc-song-io.json',
                'fc-song-no-io.json',
                'fc-song-valdemar.json',
                'vortix-openning-no-io-ps.json'
            ],
            'delhi': [
                'dof-mass-ghazi.json'
            ],
            'english': [
                '2-tc-fc-classic.json',
                'lb-all-in.json'
            ],
            'french': [
                'dark-age-wheelbarrow-into-trade.json',
                'dark-age-wheelbarrow-ps.json',
                'fast-feudal-knight-attack-valdemar.json',
                'fast-pro-scouts-valdemar.json',
                'feudal-trade.json',
                'wheelbarrow-into-ps-beasty.json'
            ],
            'french-jd': [],
            'golden-horde': [],
            'house-of-lancaster': [
                'kings-feudal-push.json',
                'manor-boom-fc.json'
            ],
            'hre': [
                '2-tc.json',
                'dark-age-spearmen.json',
                'dark-age-wheelbarrow.json',
                'fast-imp.json',
                'fc-burger.json'
            ],
            'japanese': [
                'dark-age-spearmen-opening.json',
                'fast-castle-bannerman.json',
                'fast-castle-classic.json',
                'fast-castle-towara-takezaiku.json',
                'feudal-classic-opening.json',
                'feudal-yumi-stone-opening.json',
                'japanese-dark-age-fishing-order.json',
                'japanese-faster-fc.json',
                'two-tc.json'
            ],
            'knights-templar': [],
            'macedonian-dynasty': [
                'gw-beasty-opening.json',
                'ps.json'
            ],
            'mali': [],
            'mongols': [
                'dark-age-horsemen.json',
                'feudal-aggro-keshik-into-trade.json',
                'feudal-aggro-khan-hunter.json',
                'feudal-rush.json',
                'tower-rush-into-trade.json'
            ],
            'order-of-the-dragon': [],
            'ottoman': [],
            'rus': [
                'feudal-pro-scouts.json',
                'golden-gate-fc-pro-scouts.json'
            ],
            'sengoku-daimyo': [
                '2xyatai-opening.json',
                'fast-castle-with-tower.json'
            ],
            'tughlaq-dynasty': [],
            'vikings': [],
            'scots': [],
            'zhu-xi': [
                '2-tc-song.json',
                '2tc-tang-pilsen.json',
                'dark-age-rush-fast.json',
                'dark-age-rush-slow.json',
                'dark-age-wheelbarrow-into-ps.json',
                'fast-castle-pilsen-3-scouts.json',
                'fc-ps.json',
                'feudal-aggro-crackedy.json',
                'feudal-pro-scouts-horseman-or-mia.json',
                'full-water-zhu-xi-valdemar.json',
                'pro-scouts-fc-delayed-valdemar-s9.json'
            ]
        };

        // Iterate over all civilizations defined in knownBuildOrders
        for (const [civId, buildOrderFiles] of Object.entries(knownBuildOrders)) {
            // Initialize civ in database if not exists
            if (!window.buildOrderDatabase[civId]) {
                window.buildOrderDatabase[civId] = {};
            }

            // Load embedded build orders
            for (const fileName of buildOrderFiles) {
                const boPath = `build-order-data/${civId}/${fileName}`;
                const boData = await fetchJsonFile(boPath);
                if (boData && boData.name) {
                    window.buildOrderDatabase[civId][boData.name] = boData;
                    totalBuildOrders++;
                }
            }

            console.log(`Tauri adapter: Loaded ${Object.keys(window.buildOrderDatabase[civId]).length} embedded build orders for ${civId}`);
        }

        // Also load user-created build orders from APPDATA
        let userBuildOrders = 0;
        if (hasTauriFs()) {
            console.log('Tauri adapter: Loading user-created build orders from APPDATA...');
            const allCivIds = Object.keys(knownBuildOrders);

            for (const civId of allCivIds) {
                try {
                    const userFiles = await window.listUserBuildOrders(civId);
                    if (userFiles.length > 0) {
                        // Initialize civ in database if not exists
                        if (!window.buildOrderDatabase[civId]) {
                            window.buildOrderDatabase[civId] = {};
                        }

                        for (const fileName of userFiles) {
                            try {
                                const content = await window.readFileSystemFile(`build-order-data/${civId}`, fileName);
                                if (content) {
                                    const boData = JSON.parse(content);
                                    if (boData && boData.name) {
                                        // User build orders override embedded ones with same name
                                        window.buildOrderDatabase[civId][boData.name] = boData;
                                        userBuildOrders++;
                                        console.log(`Tauri adapter: Loaded user build order: ${boData.name}`);
                                    }
                                }
                            } catch (parseError) {
                                console.warn(`Tauri adapter: Could not parse user build order ${fileName}:`, parseError.message);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`Tauri adapter: Error loading user build orders for ${civId}:`, error.message);
                }
            }
            console.log(`Tauri adapter: Loaded ${userBuildOrders} user-created build orders`);
        }

        console.log(`Tauri adapter: Total build orders loaded: ${totalBuildOrders + userBuildOrders} (${totalBuildOrders} embedded + ${userBuildOrders} user-created)`);

        // Update UI
        if (typeof updateBuildOrderCount === 'function') {
            updateBuildOrderCount();
        }
        if (typeof filterBuildOrders === 'function') {
            filterBuildOrders();
        }
        if (typeof updateFooterStats === 'function') {
            updateFooterStats();
        }
    };

    // ============================================================================
    // OVERRIDE loadMatchupData - Use fetch for embedded matchup files
    // ============================================================================

    window.loadMatchupDataForCiv = async function(civId) {
        console.log(`Tauri adapter: Loading matchup data for ${civId}`);
        const path = `matchup/${civId}-matchups.json`;
        const data = await fetchJsonFile(path);
        return data || { matchups: {} };
    };

    // Known matchup files (since we can't list directories via fetch)
    const knownMatchupCivs = [
        'abbasid', 'ayyubids', 'byzantines', 'chinese', 'delhi', 'english',
        'french', 'french-jd', 'golden-horde', 'house-of-lancaster', 'hre',
        'japanese', 'knights-templar', 'macedonian-dynasty', 'mali', 'mongols',
        'order-of-the-dragon', 'ottoman', 'rus', 'sengoku-daimyo', 'tughlaq-dynasty', 'vikings', 'scots', 'zhu-xi'
    ];

    // Load all matchup data for all civilizations
    window.loadAllMatchupData = async function() {
        console.log('Tauri adapter: loadAllMatchupData called');
        const matchupData = {};

        for (const civId of knownMatchupCivs) {
            try {
                const path = `matchup/${civId}-matchups.json`;
                const data = await fetchJsonFile(path);
                if (data) {
                    // Extract the nested structure correctly
                    matchupData[civId] = data[civId] || {};
                    console.log(`Tauri adapter: Loaded matchups for: ${civId}`);
                }
            } catch (error) {
                console.warn(`Tauri adapter: Could not load matchups for ${civId}:`, error.message);
                matchupData[civId] = {};
            }
        }

        console.log(`Tauri adapter: Matchup data loaded for ${Object.keys(matchupData).length} civilizations`);
        return matchupData;
    };

    // Scan all build orders for opponent information (Tauri version)
    window.scanAllBuildOrdersForOpponents = async function() {
        console.log('Tauri adapter: scanAllBuildOrdersForOpponents called');
        const buildOrdersData = [];

        // Use knownBuildOrders from the loadAllCivBuildOrders function
        for (const [civId, buildOrderFiles] of Object.entries(knownBuildOrders)) {
            if (buildOrderFiles.length === 0) continue;

            for (const fileName of buildOrderFiles) {
                const boPath = `build-order-data/${civId}/${fileName}`;
                try {
                    const buildOrderData = await fetchJsonFile(boPath);
                    if (buildOrderData && buildOrderData.opponents &&
                        Array.isArray(buildOrderData.opponents) &&
                        buildOrderData.opponents.length > 0) {
                        buildOrdersData.push({
                            civId: civId,
                            buildOrderName: buildOrderData.name || fileName.replace('.json', ''),
                            opponents: buildOrderData.opponents,
                            fileName: fileName
                        });
                        console.log(`Tauri adapter: Found: ${buildOrderData.name} vs [${buildOrderData.opponents.join(', ')}]`);
                    }
                } catch (error) {
                    console.warn(`Tauri adapter: Could not parse ${fileName}:`, error.message);
                }
            }
        }

        console.log(`Tauri adapter: Scan complete! Found ${buildOrdersData.length} build orders with opponent data`);
        return buildOrdersData;
    };

    // ============================================================================
    // DIRECTORY HANDLE MOCK (for API compatibility)
    // ============================================================================

    function createFetchDirectoryHandle(basePath) {
        return {
            _isTauriHandle: true,
            _path: basePath,
            name: basePath.split('/').pop() || 'root',

            getDirectoryHandle: async function(directoryName, options) {
                const newPath = basePath ? `${basePath}/${directoryName}` : directoryName;
                return createFetchDirectoryHandle(newPath);
            },

            getFileHandle: async function(fileName, options) {
                return createFetchFileHandle(basePath, fileName);
            },

            values: async function*() {
                // For now, return empty - directory listing not supported via fetch
                console.log('Tauri adapter: Directory listing via fetch not implemented');
            }
        };
    }

    function createFetchFileHandle(dirPath, fileName) {
        const fullPath = dirPath ? `${dirPath}/${fileName}` : fileName;
        return {
            _isTauriHandle: true,
            _dirPath: dirPath,
            _fileName: fileName,
            name: fileName,

            getFile: async function() {
                const content = await fetchFile(fullPath);
                return {
                    text: async () => content || '',
                    name: fileName
                };
            },

            createWritable: async function() {
                // Writing not supported via fetch
                console.warn('Tauri adapter: Writing files requires Tauri FS API (not yet implemented)');
                let buffer = '';
                return {
                    write: async (content) => { buffer = content; },
                    close: async () => {
                        console.warn('Tauri adapter: File write skipped - Tauri FS API not initialized');
                    }
                };
            }
        };
    }

    // ============================================================================
    // OVERRIDE FILE SYSTEM FUNCTIONS
    // ============================================================================

    // Override requestDirectoryAccess - in Tauri, access is always granted
    window.requestDirectoryAccess = async function() {
        console.log('Tauri adapter: requestDirectoryAccess called');
        window.fileSystemReady = true;
        window.supportsFileSystemAccess = true;
        window.directoryHandle = createFetchDirectoryHandle('');
        window.projectDirectoryHandle = window.directoryHandle;

        if (typeof updateFileAccessStatus === 'function') {
            updateFileAccessStatus();
        }

        // Reload data
        await window.loadMapsData();
        if (typeof displayMapPools === 'function') displayMapPools();
        if (typeof displayAllMaps === 'function') displayAllMaps();

        await window.loadAllCivBuildOrders();

        if (typeof showNotification === 'function') {
            showNotification('Tauri file system ready!', 'success');
        }
        return true;
    };

    // Override checkAndRequestFileAccess - always returns true in Tauri
    window.checkAndRequestFileAccess = async function(actionName = 'save') {
        return true;
    };

    // Override getOrCreateSubdirectory
    window.getOrCreateSubdirectory = async function(parentHandle, directoryName) {
        if (parentHandle && parentHandle._isTauriHandle) {
            return parentHandle.getDirectoryHandle(directoryName, { create: true });
        }
        return createFetchDirectoryHandle(directoryName);
    };

    // Override getOrCreateFile
    window.getOrCreateFile = async function(directoryHandle, fileName, defaultContent = '') {
        if (directoryHandle && directoryHandle._isTauriHandle) {
            const dirPath = directoryHandle._path || '';
            return createFetchFileHandle(dirPath, fileName);
        }
        return createFetchFileHandle('', fileName);
    };

    // Override getDirectoryHandle
    window.getDirectoryHandle = async function(directoryName) {
        return createFetchDirectoryHandle(directoryName);
    };

    // Override getFileHandle
    window.getFileHandle = async function(directoryHandle, fileName) {
        if (directoryHandle && directoryHandle._isTauriHandle) {
            return createFetchFileHandle(directoryHandle._path || '', fileName);
        }
        return createFetchFileHandle('', fileName);
    };

    // ============================================================================
    // UI STATUS OVERRIDES
    // ============================================================================

    window.updateFileAccessStatus = function() {
        const statusElements = [
            document.getElementById('file-access-status'),
            document.getElementById('file-access-status-strategy')
        ];

        const enableButtons = [
            document.getElementById('enable-file-access'),
            document.getElementById('enable-file-access-strategy')
        ];

        statusElements.forEach((statusElement, index) => {
            const enableButton = enableButtons[index];
            if (!statusElement) return;

            statusElement.textContent = 'Tauri Desktop Mode - File access enabled';
            statusElement.className = 'status-text success';
            if (enableButton) enableButton.style.display = 'none';

            const warningDiv = document.getElementById('no-save-warning');
            if (warningDiv) warningDiv.remove();
        });
    };

    window.checkFileAccessStatus = function(section) {
        const statusElement = document.getElementById(`file-access-status-${section}`);
        const enableButton = document.getElementById(`enable-file-access-${section}`);

        if (!statusElement) return;

        statusElement.textContent = 'Tauri file system enabled';
        statusElement.style.color = '#27ae60';
        if (enableButton) enableButton.style.display = 'none';
    };

    window.showSetupHint = function() {
        // Do nothing in Tauri
    };

    window.showNoSaveWarning = function() {
        // Do nothing in Tauri
    };

    // ============================================================================
    // FILE SYSTEM READ/WRITE FUNCTIONS (using Tauri 2.x FS API)
    // ============================================================================

    // Note: BaseDirectory and hasTauriFs() are defined at the top of this file

    // Read file from a subdirectory
    // First tries Tauri FS API (for user data in APPDATA), then falls back to fetch (for embedded assets)
    window.readFileSystemFile = async function(directory, fileName) {
        const relativePath = `${directory}/${fileName}`;
        console.log(`Tauri adapter: Reading file ${relativePath}`);

        // Try Tauri FS API first (for user-saved data in APPDATA)
        if (hasTauriFs()) {
            try {
                const fs = window.__TAURI__.fs;
                const fileExists = await fs.exists(relativePath, { baseDir: BaseDirectory.AppData });
                if (fileExists) {
                    const content = await fs.readTextFile(relativePath, { baseDir: BaseDirectory.AppData });
                    console.log(`Tauri adapter: Read from APPDATA: ${relativePath}`);
                    return content;
                }
            } catch (e) {
                console.log(`Tauri adapter: File not in APPDATA (${e.message}), trying embedded assets`);
            }
        }

        // Try localStorage as secondary fallback (for legacy saved data)
        const storageKey = `tauri-file:${relativePath}`;
        const localStorageData = localStorage.getItem(storageKey);
        if (localStorageData) {
            console.log(`Tauri adapter: Found in localStorage: ${storageKey}`);
            return localStorageData;
        }

        // Fall back to fetch for embedded assets
        try {
            const response = await fetch(relativePath);
            if (response.ok) {
                console.log(`Tauri adapter: Found via fetch: ${relativePath}`);
                return await response.text();
            }
            console.log(`Tauri adapter: File not found: ${relativePath}`);
            return null;
        } catch (error) {
            console.error(`Tauri adapter: Error reading ${relativePath}:`, error);
            return null;
        }
    };

    // Save file to a user-chosen location (native save dialog)
    window.saveFileWithDialog = async function(defaultFileName, content) {
        if (!window.isTauri || !window.__TAURI__ || !window.__TAURI__.dialog) {
            // Browser mode: download to the default download folder
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        }
        try {
            const dialog = window.__TAURI__.dialog;
            if (typeof dialog.save !== 'function') {
                console.warn('Tauri adapter: dialog plugin not available');
                return false;
            }
            const targetPath = await dialog.save({
                title: 'Save build order export',
                defaultPath: defaultFileName,
                filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (!targetPath) return false; // user cancelled

            const fs = window.__TAURI__.fs;
            await fs.writeTextFile(targetPath, content);
            console.log(`Tauri adapter: saved export to ${targetPath}`);
            if (typeof showNotification === 'function') showNotification(`Exported to ${targetPath}`, 'success');
            return true;
        } catch (error) {
            console.error('Tauri adapter: save dialog failed:', error);
            if (typeof showNotification === 'function') showNotification('Error saving file: ' + error.message, 'error');
            return false;
        }
    };

    // Write file using Tauri FS API to APPDATA directory
    window.writeFileSystemFile = async function(directory, fileName, content) {
        const relativePath = `${directory}/${fileName}`;
        console.log(`Tauri adapter: writeFileSystemFile called for ${relativePath}`);

        if (hasTauriFs()) {
            try {
                const fs = window.__TAURI__.fs;

                // Create directory if it doesn't exist
                try {
                    const dirExists = await fs.exists(directory, { baseDir: BaseDirectory.AppData });
                    if (!dirExists) {
                        await fs.mkdir(directory, { baseDir: BaseDirectory.AppData, recursive: true });
                        console.log(`Tauri adapter: Created directory: ${directory}`);
                    }
                } catch (mkdirError) {
                    // Directory might already exist, that's OK
                    console.log(`Tauri adapter: mkdir note: ${mkdirError.message}`);
                }

                // Write the file
                await fs.writeTextFile(relativePath, content, { baseDir: BaseDirectory.AppData });
                console.log(`Tauri adapter: Saved to APPDATA: ${relativePath}`);
                return true;
            } catch (error) {
                console.error(`Tauri adapter: Error writing file via Tauri FS:`, error);
                // Fall through to localStorage fallback
            }
        } else {
            console.warn('Tauri adapter: Tauri FS API not available (window.__TAURI__.fs is undefined)');
        }

        // Fallback to localStorage if Tauri FS not available
        console.warn('Tauri adapter: Using localStorage fallback');
        const storageKey = `tauri-file:${relativePath}`;
        try {
            localStorage.setItem(storageKey, content);
            console.log(`Tauri adapter: Saved to localStorage: ${storageKey}`);
            return true;
        } catch (error) {
            console.error(`Tauri adapter: Error saving to localStorage:`, error);
            throw error;
        }
    };

    // List files in a directory (for loading user-created build orders)
    window.listUserBuildOrders = async function(civId) {
        if (!hasTauriFs()) {
            console.log('Tauri adapter: Cannot list user build orders - FS not available');
            return [];
        }

        const dirPath = `build-order-data/${civId}`;
        try {
            const fs = window.__TAURI__.fs;
            const dirExists = await fs.exists(dirPath, { baseDir: BaseDirectory.AppData });
            if (!dirExists) {
                return [];
            }

            const entries = await fs.readDir(dirPath, { baseDir: BaseDirectory.AppData });
            const jsonFiles = entries
                .filter(entry => entry.name && entry.name.endsWith('.json'))
                .map(entry => entry.name);

            console.log(`Tauri adapter: Found ${jsonFiles.length} user build orders for ${civId}`);
            return jsonFiles;
        } catch (e) {
            console.warn(`Tauri adapter: Error listing directory ${dirPath}:`, e);
            return [];
        }
    };

    // ============================================================================
    // SET GLOBAL FLAGS IMMEDIATELY
    // ============================================================================

    window.isTauri = true;
    window.supportsFileSystemAccess = true;
    window.fileSystemReady = true;
    window.directoryHandle = createFetchDirectoryHandle('');
    window.projectDirectoryHandle = window.directoryHandle;

    console.log('Tauri adapter: Global flags set');

    // ============================================================================
    // AUTO-LOAD DATA AFTER DOM IS READY
    // ============================================================================

    // Wait for DOM and other scripts to load, then reload data
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadTauriData);
    } else {
        // DOM already loaded, wait a bit for other scripts
        setTimeout(loadTauriData, 100);
    }

    async function loadTauriData() {
        console.log('Tauri adapter: Loading data...');

        // Update status UI
        if (typeof updateFileAccessStatus === 'function') {
            updateFileAccessStatus();
        }

        // Load maps data
        try {
            await window.loadMapsData();
            if (typeof displayMapPools === 'function') displayMapPools();
            if (typeof displayAllMaps === 'function') displayAllMaps();
            console.log('Tauri adapter: Maps loaded successfully');
        } catch (e) {
            console.error('Tauri adapter: Error loading maps:', e);
        }

        // Load build orders
        try {
            await window.loadAllCivBuildOrders();
            console.log('Tauri adapter: Build orders loaded successfully');
        } catch (e) {
            console.error('Tauri adapter: Error loading build orders:', e);
        }

        // Populate dropdowns
        if (typeof populateMapDropdown === 'function') {
            populateMapDropdown();
        }

        console.log('Tauri adapter: Data loading complete');
    }

    console.log('Tauri adapter loaded successfully');
}
