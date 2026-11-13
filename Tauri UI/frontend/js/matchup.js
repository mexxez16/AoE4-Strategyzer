// Matchup notes management functionality

// Global reference to MutationObserver for cleanup (memory leak fix)
let matchupObserver = null;

// ==============================================================================
// MATCHUP SYNCHRONIZATION FROM BUILD ORDERS
// ==============================================================================

// Scan all build orders for opponent information
// TAURI: Use window.scanAllBuildOrdersForOpponents from tauri-adapter.js if available
async function scanAllBuildOrdersForOpponentsLocal() {
    // In Tauri mode, use the tauri-adapter version which handles fetch-based loading
    if (window.isTauri && typeof window.scanAllBuildOrdersForOpponents === 'function') {
        return window.scanAllBuildOrdersForOpponents();
    }
    console.log('🔍 Starting Build Order scan for opponents...');

    const buildOrdersData = [];
    
    try {
        // Get build-order-data directory
        const buildOrderDataDir = await window.directoryHandle.getDirectoryHandle('build-order-data');
        
        // Iterate through each civilization directory
        for await (const civEntry of buildOrderDataDir.values()) {
            if (civEntry.kind !== 'directory') continue;
            
            const civId = civEntry.name;
            console.log(`📂 Scanning civilization: ${civId}`);
            
            // Read all JSON files in the civ directory
            for await (const buildOrderEntry of civEntry.values()) {
                if (buildOrderEntry.kind !== 'file' || !buildOrderEntry.name.endsWith('.json')) {
                    continue;
                }
                
                try {
                    const file = await buildOrderEntry.getFile();
                    const content = await file.text();
                    const buildOrderData = JSON.parse(content);
                    
                    // Extract opponent information
                    if (buildOrderData.opponents && Array.isArray(buildOrderData.opponents) && buildOrderData.opponents.length > 0) {
                        buildOrdersData.push({
                            civId: civId,
                            buildOrderName: buildOrderData.name || buildOrderEntry.name.replace('.json', ''),
                            opponents: buildOrderData.opponents,
                            fileName: buildOrderEntry.name
                        });
                        
                        console.log(`  ✅ Found: ${buildOrderData.name} vs [${buildOrderData.opponents.join(', ')}]`);
                    }
                } catch (error) {
                    console.warn(`  ⚠️ Could not parse ${buildOrderEntry.name}:`, error.message);
                }
            }
        }
        
        console.log(`🎯 Scan complete! Found ${buildOrdersData.length} build orders with opponent data`);
        return buildOrdersData;
        
    } catch (error) {
        console.error('❌ Error scanning build orders:', error);
        throw error;
    }
}

// Load all existing matchup data
// TAURI: Use window.loadAllMatchupData from tauri-adapter.js if available
async function loadAllMatchupDataLocal() {
    // In Tauri mode, use the tauri-adapter version which handles fetch-based loading
    if (window.isTauri && typeof window.loadAllMatchupData === 'function') {
        return window.loadAllMatchupData();
    }
    console.log('📖 Loading existing matchup data...');

    const matchupData = {};
    
    try {
        // Get matchup directory
        const matchupDir = await window.directoryHandle.getDirectoryHandle('matchup');
        
        // Read all matchup JSON files
        for await (const entry of matchupDir.values()) {
            if (entry.kind !== 'file' || !entry.name.endsWith('-matchups.json')) {
                continue;
            }
            
            const civId = entry.name.replace('-matchups.json', '');
            
            try {
                const file = await entry.getFile();
                const content = await file.text();
                const civMatchupData = JSON.parse(content);
                
                // Extract the nested structure correctly
                matchupData[civId] = civMatchupData[civId] || {};
                console.log(`  ✅ Loaded matchups for: ${civId}`);
                console.log(`  🔍 DEBUG - ${civId} keys:`, Object.keys(matchupData[civId]));
                
            } catch (error) {
                console.warn(`  ⚠️ Could not parse ${entry.name}:`, error.message);
                // Initialize empty structure for this civ
                matchupData[civId] = {};
            }
        }
        
        console.log(`🎯 Matchup data loaded for ${Object.keys(matchupData).length} civilizations`);
        return matchupData;
        
    } catch (error) {
        console.error('❌ Error loading matchup data:', error);
        throw error;
    }
}

// Merge build orders into existing matchup data (without overwriting)
function mergeBuildOrderIntoMatchups(buildOrderInfo, matchupData) {
    const { civId, buildOrderName, opponents } = buildOrderInfo;
    
    // Ensure civ structure exists
    if (!matchupData[civId]) {
        matchupData[civId] = {};
    }
    
    // For each opponent, add this build order if not already present
    opponents.forEach(opponentCivId => {
        // Ensure opponent structure exists
        if (!matchupData[civId][opponentCivId]) {
            matchupData[civId][opponentCivId] = {
                buildOrders: [],
                strategies: { strat1: "", strat2: "", strat3: "" },
                tactics: { tak1: "", tak2: "", tak3: "" },
                attention: { att1: "", att2: "", att3: "" }
            };
        }
        
        // Ensure all required properties exist (for existing matchups that might be incomplete)
        if (!matchupData[civId][opponentCivId].buildOrders) {
            matchupData[civId][opponentCivId].buildOrders = [];
        }
        if (!matchupData[civId][opponentCivId].strategies) {
            matchupData[civId][opponentCivId].strategies = { strat1: "", strat2: "", strat3: "" };
        }
        if (!matchupData[civId][opponentCivId].tactics) {
            matchupData[civId][opponentCivId].tactics = { tak1: "", tak2: "", tak3: "" };
        }
        if (!matchupData[civId][opponentCivId].attention) {
            matchupData[civId][opponentCivId].attention = { att1: "", att2: "", att3: "" };
        }
        
        // Add build order if not already present (KEINE ÜBERSCHREIBUNG!)
        const existingBuildOrders = matchupData[civId][opponentCivId].buildOrders;
        if (!existingBuildOrders.includes(buildOrderName)) {
            existingBuildOrders.push(buildOrderName);
            console.log(`  ➕ Added "${buildOrderName}" to ${civId} vs ${opponentCivId}`);
        } else {
            console.log(`  ℹ️ "${buildOrderName}" already exists in ${civId} vs ${opponentCivId}`);
        }
    });
}

// Main synchronization engine
async function synchronizeMatchups(buildOrdersData, existingMatchups) {
    console.log('🔄 Starting matchup synchronization...');
    
    const updatedMatchups = JSON.parse(JSON.stringify(existingMatchups)); // Deep copy
    let totalAdded = 0;
    let totalSkipped = 0;
    
    // Process each build order
    buildOrdersData.forEach(buildOrderInfo => {
        const beforeCount = JSON.stringify(updatedMatchups).length;
        
        mergeBuildOrderIntoMatchups(buildOrderInfo, updatedMatchups);
        
        const afterCount = JSON.stringify(updatedMatchups).length;
        if (afterCount > beforeCount) {
            totalAdded++;
        } else {
            totalSkipped++;
        }
    });
    
    console.log(`🎯 Synchronization complete:`);
    console.log(`  ✅ Build orders added: ${totalAdded}`);
    console.log(`  ℹ️ Build orders skipped (already exists): ${totalSkipped}`);
    
    return {
        updatedMatchups,
        stats: {
            added: totalAdded,
            skipped: totalSkipped,
            processed: buildOrdersData.length
        }
    };
}

// LEGACY: Create backup of existing matchup data
// This function is no longer used - backups are handled differently now
/*
async function createMatchupBackup() {
    console.log('💾 Creating matchup data backup...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDirName = `matchup-backup-${timestamp}`;

    try {
        // Create backup directory
        const backupDir = await window.directoryHandle.getDirectoryHandle(backupDirName, { create: true });
        const matchupDir = await window.directoryHandle.getDirectoryHandle('matchup');

        let backedUpFiles = 0;

        // Copy all matchup files to backup
        for await (const entry of matchupDir.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('-matchups.json')) {
                const file = await entry.getFile();
                const content = await file.text();

                const backupFileHandle = await backupDir.getFileHandle(entry.name, { create: true });
                const writable = await backupFileHandle.createWritable();
                await writable.write(content);
                await writable.close();

                backedUpFiles++;
            }
        }

        console.log(`✅ Backup created: ${backupDirName} (${backedUpFiles} files)`);
        return { backupDir: backupDirName, fileCount: backedUpFiles };

    } catch (error) {
        console.error('❌ Error creating backup:', error);
        throw error;
    }
}
*/

// Stub function to prevent errors if called
async function createMatchupBackup() {
    console.log('ℹ️ Backup skipped - legacy function disabled');
    return { backupDir: 'disabled', fileCount: 0 };
}

// Validate matchup data integrity
function validateMatchupIntegrity(matchupData) {
    console.log('🔍 Validating matchup data integrity...');
    
    const issues = [];
    const civIds = Object.keys(matchupData);
    
    civIds.forEach(civId => {
        // Check if civ exists in civilizations array
        const civExists = civilizations.find(c => c.id === civId);
        if (!civExists) {
            issues.push(`Unknown civilization ID: ${civId}`);
        }
        
        const civMatchups = matchupData[civId];
        if (typeof civMatchups !== 'object') {
            issues.push(`Invalid matchup data structure for ${civId}`);
            return;
        }
        
        Object.keys(civMatchups).forEach(opponentCivId => {
            // Check if opponent civ exists
            const opponentExists = civilizations.find(c => c.id === opponentCivId);
            if (!opponentExists) {
                issues.push(`Unknown opponent civilization ID: ${opponentCivId} in ${civId} matchups`);
            }
            
            const matchup = civMatchups[opponentCivId];
            
            // Validate matchup structure
            if (!matchup.buildOrders || !Array.isArray(matchup.buildOrders)) {
                issues.push(`Missing or invalid buildOrders array in ${civId} vs ${opponentCivId}`);
            }
            
            if (!matchup.strategies || typeof matchup.strategies !== 'object') {
                issues.push(`Missing or invalid strategies object in ${civId} vs ${opponentCivId}`);
            }
            
            if (!matchup.tactics || typeof matchup.tactics !== 'object') {
                issues.push(`Missing or invalid tactics object in ${civId} vs ${opponentCivId}`);
            }
            
            if (!matchup.attention || typeof matchup.attention !== 'object') {
                issues.push(`Missing or invalid attention object in ${civId} vs ${opponentCivId}`);
            }
        });
    });
    
    if (issues.length > 0) {
        console.warn(`⚠️ Found ${issues.length} validation issues:`, issues);
        return { valid: false, issues };
    } else {
        console.log('✅ Matchup data validation passed');
        return { valid: true, issues: [] };
    }
}

// Validate before synchronization
// TAURI: File system always available via tauri-adapter.js
async function validateBeforeSync() {
    console.log('🛡️ Running pre-synchronization checks...');

    const checks = {
        fileSystemAccess: true, // TAURI: Always true
        buildOrderDataExists: false,
        matchupDataExists: false,
        civilizationsLoaded: false
    };

    // Check if build-order-data directory exists
    try {
        await window.directoryHandle.getDirectoryHandle('build-order-data');
        checks.buildOrderDataExists = true;
    } catch (error) {
        console.warn('build-order-data directory not found');
    }

    // Check if matchup directory exists
    try {
        await window.directoryHandle.getDirectoryHandle('matchup');
        checks.matchupDataExists = true;
    } catch (error) {
        console.warn('matchup directory not found');
    }

    // Check if civilizations are loaded
    if (civilizations && civilizations.length > 0) {
        checks.civilizationsLoaded = true;
    }

    const allChecksPass = Object.values(checks).every(check => check === true);

    console.log('🔍 Pre-sync validation:', checks);

    if (!allChecksPass) {
        const failedChecks = Object.keys(checks).filter(key => !checks[key]);
        throw new Error(`Pre-sync validation failed: ${failedChecks.join(', ')}`);
    }

    return checks;
}


// Save updated matchup data to files
// TAURI: Uses writeFileSystemFile from tauri-adapter.js
async function saveUpdatedMatchups(updatedMatchups) {
    console.log('💾 Saving updated matchup data...');

    let savedFiles = 0;
    const directory = 'matchup';

    // Save each civilization's matchup data
    for (const [civId, civMatchups] of Object.entries(updatedMatchups)) {
        try {
            const fileName = `${civId}-matchups.json`;
            // Wrap civMatchups with the civId key to maintain correct structure
            const wrappedContent = { [civId]: civMatchups };
            const fileContent = JSON.stringify(wrappedContent, null, 2);

            // Use Tauri FS API via tauri-adapter.js
            if (window.writeFileSystemFile) {
                const success = await window.writeFileSystemFile(directory, fileName, fileContent);
                if (success) {
                    savedFiles++;
                    console.log(`  ✅ Saved: ${fileName}`);
                } else {
                    console.error(`  ❌ Failed to save ${fileName}`);
                }
            } else if (window.directoryHandle) {
                // Fallback for non-Tauri mode
                const matchupDir = await window.directoryHandle.getDirectoryHandle('matchup');
                const fileHandle = await matchupDir.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(fileContent);
                await writable.close();
                savedFiles++;
                console.log(`  ✅ Saved: ${fileName}`);
            }
        } catch (error) {
            console.error(`  ❌ Error saving ${civId}-matchups.json:`, error);
            throw error;
        }
    }

    console.log(`💾 Successfully saved ${savedFiles} matchup files`);
    return savedFiles;
}

// Main synchronization function (called by UI button)
async function syncMatchupsFromBuildOrders() {
    const statusElement = document.getElementById('sync-status');
    const syncButton = document.getElementById('sync-matchups-btn');
    
    // Update UI status
    function updateStatus(message, type = 'info') {
        if (statusElement) {
            statusElement.innerHTML = `<span class="status-${type}">${message}</span>`;
        }
        console.log(message);
    }
    
    // Disable button during sync
    if (syncButton) {
        syncButton.disabled = true;
        syncButton.textContent = 'Syncing...';
    }
    
    try {
        updateStatus('🔍 Starting matchup synchronization...', 'info');
        
        // Step 1: Validate prerequisites
        await validateBeforeSync();
        updateStatus('✅ Prerequisites validated', 'success');
        
        // Step 2: Create backup
        const backup = await createMatchupBackup();
        updateStatus(`💾 Backup created: ${backup.backupDir}`, 'success');
        
        // Step 3: Scan build orders
        updateStatus('📂 Scanning build orders for opponent data...', 'info');
        const buildOrdersData = await scanAllBuildOrdersForOpponentsLocal();
        
        if (buildOrdersData.length === 0) {
            updateStatus('⚠️ No build orders with opponent data found', 'warning');
            return;
        }
        
        // Step 4: Load existing matchups
        updateStatus('📖 Loading existing matchup data...', 'info');
        const existingMatchups = await loadAllMatchupDataLocal();
        
        // Step 5: Synchronize data
        updateStatus('🔄 Synchronizing matchup data...', 'info');
        const syncResult = await synchronizeMatchups(buildOrdersData, existingMatchups);
        
        // Step 6: Validate updated data
        updateStatus('🔍 Validating synchronized data...', 'info');
        const validation = validateMatchupIntegrity(syncResult.updatedMatchups);
        
        if (!validation.valid) {
            throw new Error(`Validation failed: ${validation.issues.join(', ')}`);
        }
        
        // Step 7: Save updated data
        updateStatus('💾 Saving updated matchup files...', 'info');
        const savedCount = await saveUpdatedMatchups(syncResult.updatedMatchups);
        
        // Success!
        updateStatus(
            `🎉 Sync complete! Added ${syncResult.stats.added} new build order assignments, ` +
            `skipped ${syncResult.stats.skipped} existing ones. Saved ${savedCount} files.`,
            'success'
        );
        
        // Show detailed results
        console.log('📊 Synchronization Results:');
        console.log('  Build orders processed:', syncResult.stats.processed);
        console.log('  New assignments added:', syncResult.stats.added);
        console.log('  Existing assignments skipped:', syncResult.stats.skipped);
        console.log('  Files saved:', savedCount);
        console.log('  Backup location:', backup.backupDir);
        
    } catch (error) {
        console.error('❌ Synchronization failed:', error);
        updateStatus(`❌ Sync failed: ${error.message}`, 'error');
    } finally {
        // Re-enable button
        if (syncButton) {
            syncButton.disabled = false;
            syncButton.textContent = 'Sync Matchups from Build Orders';
        }
    }
}


// Initialize matchup functionality
function initializeMatchup() {
    console.log('Initializing Matchup module...');
    
    // Populate dropdowns
    populateMatchupDropdowns();
    
    // Add event listeners
    setupMatchupEventListeners();
    
    // Check file access status
    checkFileAccessStatus('matchup');
}

// Populate matchup civilization dropdowns
function populateMatchupDropdowns() {
    const myCivOptions = document.getElementById('matchup-my-civ-options');
    const opponentCivOptions = document.getElementById('matchup-opponent-civ-options');
    
    if (!myCivOptions || !opponentCivOptions) {
        console.error('Matchup dropdown elements not found');
        return;
    }
    
    // Clear existing options
    myCivOptions.innerHTML = '';
    opponentCivOptions.innerHTML = '';
    
    // Populate both dropdowns with civilizations
    civilizations.forEach(civ => {
        const flagPath = getCivFlag(civ.id);
        const flagHtml = flagPath ? `<img src="${flagPath}" class="dropdown-flag" alt="${civ.name}">` : '';
        
        // My civilization dropdown
        const myOption = document.createElement('div');
        myOption.className = 'dropdown-option';
        myOption.innerHTML = `${flagHtml}${civ.name}`;
        myOption.onclick = () => selectMatchupCiv('my', civ.id, civ.name);
        myCivOptions.appendChild(myOption);
        
        // Opponent civilization dropdown
        const opponentOption = document.createElement('div');
        opponentOption.className = 'dropdown-option';
        opponentOption.innerHTML = `${flagHtml}${civ.name}`;
        opponentOption.onclick = () => selectMatchupCiv('opponent', civ.id, civ.name);
        opponentCivOptions.appendChild(opponentOption);
    });
}

// Handle civilization selection in matchup
function selectMatchupCiv(type, civId, civName) {
    if (type === 'my') {
        document.getElementById('matchup-my-civ').value = civId;
        document.getElementById('matchup-my-civ-text').textContent = civName;
        closeCustomDropdown('matchup-my-civ');
    } else {
        document.getElementById('matchup-opponent-civ').value = civId;
        document.getElementById('matchup-opponent-civ-text').textContent = civName;
        closeCustomDropdown('matchup-opponent-civ');
    }
    
    // Check if both civilizations are selected
    const myCiv = document.getElementById('matchup-my-civ').value;
    const opponentCiv = document.getElementById('matchup-opponent-civ').value;
    
    if (myCiv && opponentCiv) {
        // Show notes container
        document.getElementById('matchup-notes-container').classList.remove('hidden');
        
        // Load existing matchup data
        loadMatchupData(myCiv, opponentCiv);
    }
}

// Setup event listeners for matchup
// Memory leak fix: Store observer reference and disconnect before re-attaching
function setupMatchupEventListeners() {
    // Disconnect any existing observer first to prevent duplicates
    if (matchupObserver) {
        matchupObserver.disconnect();
        matchupObserver = null;
    }

    // Add change listeners to detect selections
    const myCivInput = document.getElementById('matchup-my-civ');
    const opponentCivInput = document.getElementById('matchup-opponent-civ');

    if (myCivInput && opponentCivInput) {
        // Use MutationObserver to detect value changes
        matchupObserver = new MutationObserver(() => {
            const myCiv = myCivInput.value;
            const opponentCiv = opponentCivInput.value;

            if (myCiv && opponentCiv) {
                document.getElementById('matchup-notes-container').classList.remove('hidden');
                loadMatchupData(myCiv, opponentCiv);
            }
        });

        matchupObserver.observe(myCivInput, { attributes: true, attributeFilter: ['value'] });
        matchupObserver.observe(opponentCivInput, { attributes: true, attributeFilter: ['value'] });
    }
}

// Cleanup function for matchup event listeners
function cleanupMatchupEventListeners() {
    if (matchupObserver) {
        matchupObserver.disconnect();
        matchupObserver = null;
    }
}

// Load matchup data from JSON file
// TAURI: Loads from both sources and merges (APPDATA has priority)
async function loadMatchupData(myCivId, opponentCivId) {
    const fileName = `${myCivId}-matchups.json`;
    const directory = 'matchup';

    try {
        let embeddedMatchups = null;
        let appdataMatchups = null;

        // First load embedded assets (base data)
        try {
            const response = await fetch(`matchup/${myCivId}-matchups.json`);
            if (response.ok) {
                embeddedMatchups = await response.json();
                console.log(`Loaded matchup data from embedded assets for ${myCivId}`);
            }
        } catch (fetchError) {
            console.log(`No embedded matchup data for ${myCivId}`);
        }

        // Then try APPDATA via Tauri FS API (user-saved data, has priority)
        if (window.readFileSystemFile) {
            const content = await window.readFileSystemFile(directory, fileName);
            if (content) {
                try {
                    appdataMatchups = JSON.parse(content);
                    console.log(`Loaded matchup data from APPDATA for ${myCivId}`);
                } catch (parseError) {
                    console.warn('Could not parse matchup file from APPDATA:', parseError);
                }
            }
        }

        // Merge data: APPDATA overrides embedded, but embedded serves as fallback
        let matchupData = null;
        if (appdataMatchups && embeddedMatchups) {
            // Deep merge: start with embedded, override with APPDATA
            matchupData = JSON.parse(JSON.stringify(embeddedMatchups)); // Clone embedded
            // Merge APPDATA matchups over embedded
            if (appdataMatchups[myCivId]) {
                if (!matchupData[myCivId]) {
                    matchupData[myCivId] = {};
                }
                Object.assign(matchupData[myCivId], appdataMatchups[myCivId]);
            }
            console.log('Merged matchup data from both sources');
        } else if (appdataMatchups) {
            matchupData = appdataMatchups;
        } else if (embeddedMatchups) {
            matchupData = embeddedMatchups;
        }

        if (matchupData) {
            const specificMatchup = matchupData[myCivId]?.[opponentCivId] || {};
            populateMatchupNotes(specificMatchup);
            await loadBuildOrdersForMatchup(myCivId, specificMatchup.buildOrders || []);
        } else {
            clearMatchupNotes();
            await loadBuildOrdersForMatchup(myCivId, []);
        }
    } catch (error) {
        console.error('Error loading matchup data:', error);
        clearMatchupNotes();
        await loadBuildOrdersForMatchup(myCivId, []);
    }
}

// Load available build orders for a civilization
// TAURI: Uses buildOrderDatabase populated by tauri-adapter.js
async function loadBuildOrdersForMatchup(civId, selectedBuildOrders = []) {
    const buildOrderList = document.getElementById('matchup-build-order-list');
    if (!buildOrderList) return;

    buildOrderList.innerHTML = '';

    try {
        let buildOrderData = null;

        // Use global buildOrderDatabase (populated by tauri-adapter.js)
        if (window.buildOrderDatabase && window.buildOrderDatabase[civId]) {
            const allBuildOrders = {};

            Object.entries(window.buildOrderDatabase[civId]).forEach(([name, details]) => {
                allBuildOrders[name] = {
                    mapTypes: details.mapTypes || [],
                    opponents: details.opponents || []
                };
            });

            buildOrderData = {
                buildOrders: allBuildOrders
            };
        }
        
        if (buildOrderData && buildOrderData.buildOrders) {
            // Create checkboxes for each build order
            Object.entries(buildOrderData.buildOrders).forEach(([buildOrderName, details]) => {
                const item = document.createElement('div');
                item.className = 'build-order-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `bo-${buildOrderName.replace(/\s+/g, '-')}`;
                checkbox.value = buildOrderName;
                checkbox.checked = selectedBuildOrders.includes(buildOrderName);
                
                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                checkbox.setAttribute('aria-label', 'Select build order: ' + buildOrderName);
                label.textContent = buildOrderName;
                
                // Add map types info
                if (details.mapTypes && details.mapTypes.length > 0) {
                    const mapTypesSpan = document.createElement('span');
                    mapTypesSpan.className = 'build-order-map-types';
                    mapTypesSpan.textContent = `(${details.mapTypes.map(mt => mt.replace('-', ' ')).join(', ')})`;
                    label.appendChild(mapTypesSpan);
                }
                
                item.appendChild(checkbox);
                item.appendChild(label);
                buildOrderList.appendChild(item);
            });
        } else {
            buildOrderList.innerHTML = '<p style="color: #666; text-align: center;">No build orders available for this civilization</p>';
        }
    } catch (error) {
        console.error('Error loading build orders:', error);
        buildOrderList.innerHTML = '<p style="color: #e74c3c; text-align: center;">Error loading build orders</p>';
    }
}

// Populate matchup notes in text areas
function populateMatchupNotes(matchupData) {
    // Populate strategies
    document.getElementById('strat1').value = matchupData.strategies?.strat1 || '';
    document.getElementById('strat2').value = matchupData.strategies?.strat2 || '';
    document.getElementById('strat3').value = matchupData.strategies?.strat3 || '';
    
    // Populate tactics
    document.getElementById('tak1').value = matchupData.tactics?.tak1 || '';
    document.getElementById('tak2').value = matchupData.tactics?.tak2 || '';
    document.getElementById('tak3').value = matchupData.tactics?.tak3 || '';
    
    // Populate attention points
    document.getElementById('att1').value = matchupData.attention?.att1 || '';
    document.getElementById('att2').value = matchupData.attention?.att2 || '';
    document.getElementById('att3').value = matchupData.attention?.att3 || '';
}

// Clear all matchup notes
function clearMatchupNotes() {
    const textareas = document.querySelectorAll('.matchup-note-textarea');
    textareas.forEach(textarea => {
        textarea.value = '';
    });
}

// Save matchup data
// TAURI: Uses writeFileSystemFile from tauri-adapter.js
async function saveMatchupData() {
    const myCivId = document.getElementById('matchup-my-civ').value;
    const opponentCivId = document.getElementById('matchup-opponent-civ').value;

    if (!myCivId || !opponentCivId) {
        showNotification('Please select both civilizations', 'error');
        return;
    }

    // Collect selected build orders
    const selectedBuildOrders = [];
    const buildOrderCheckboxes = document.querySelectorAll('#matchup-build-order-list input[type="checkbox"]:checked');
    buildOrderCheckboxes.forEach(checkbox => {
        selectedBuildOrders.push(checkbox.value);
    });

    // Collect data from text areas
    const matchupNotes = {
        buildOrders: selectedBuildOrders,
        strategies: {
            strat1: document.getElementById('strat1').value.trim(),
            strat2: document.getElementById('strat2').value.trim(),
            strat3: document.getElementById('strat3').value.trim()
        },
        tactics: {
            tak1: document.getElementById('tak1').value.trim(),
            tak2: document.getElementById('tak2').value.trim(),
            tak3: document.getElementById('tak3').value.trim()
        },
        attention: {
            att1: document.getElementById('att1').value.trim(),
            att2: document.getElementById('att2').value.trim(),
            att3: document.getElementById('att3').value.trim()
        }
    };

    const fileName = `${myCivId}-matchups.json`;
    const directory = 'matchup';

    try {
        // Load existing data or create new structure
        let matchupData = {};

        // Try to read existing file first
        if (window.readFileSystemFile) {
            const existingContent = await window.readFileSystemFile(directory, fileName);
            if (existingContent) {
                try {
                    matchupData = JSON.parse(existingContent);
                } catch (parseError) {
                    console.warn('Could not parse existing matchup file, creating new');
                    matchupData = { [myCivId]: {} };
                }
            } else {
                matchupData = { [myCivId]: {} };
            }
        } else {
            matchupData = { [myCivId]: {} };
        }

        // Ensure structure exists
        if (!matchupData[myCivId]) {
            matchupData[myCivId] = {};
        }

        // Update specific matchup
        matchupData[myCivId][opponentCivId] = matchupNotes;

        // Save using Tauri FS API via tauri-adapter.js
        if (window.writeFileSystemFile) {
            const success = await window.writeFileSystemFile(directory, fileName, JSON.stringify(matchupData, null, 2));
            if (success) {
                showNotification('Matchup notes saved successfully!', 'success');
            } else {
                showNotification('Error saving matchup notes', 'error');
            }
        } else {
            // Fallback for non-Tauri mode using File System Access API
            const matchupHandle = await getOrCreateSubdirectory(window.directoryHandle, 'matchup');
            const fileHandle = await getOrCreateFile(matchupHandle, fileName);
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(matchupData, null, 2));
            await writable.close();
            showNotification('Matchup notes saved successfully!', 'success');
        }
    } catch (error) {
        console.error('Error saving matchup data:', error);
        showNotification('Error saving matchup notes: ' + error.message, 'error');
    }
}

// Export functions to global scope
window.initializeMatchup = initializeMatchup;
window.saveMatchupData = saveMatchupData;
window.syncMatchupsFromBuildOrders = syncMatchupsFromBuildOrders;
window.selectMatchupCiv = selectMatchupCiv;