// Build order management functionality

// Path to build orders folder (for documentation)
const BUILD_ORDERS_PATH = 'build-order-data/'; // Updated to use new unified directory

// Flag to prevent duplicate modal event listeners (memory leak fix)
let buildOrderModalListenersAttached = false;

// Helper function to create safe HTML IDs from build order names
function sanitizeForId(str) {
    // Replace spaces with dashes and remove/replace special characters
    return str.replace(/[:\s]+/g, '-')  // Replace colons and spaces with dashes
              .replace(/[^a-zA-Z0-9-_]/g, '') // Remove other special characters
              .replace(/--+/g, '-')  // Replace multiple dashes with single dash
              .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
}

// Show build order preview modal
// TAURI: Uses readFileSystemFile from tauri-adapter.js
window.showBuildOrderPreview = async function(url, civId, buildTitle) {
    // Check if it's a local build order URL
    if (url && url.startsWith('local://')) {
        // Parse the local URL: local://build-order-creator/french/filename.json or local://build-order-data/french/filename.json
        const parts = url.replace('local://', '').split('/');
        if (parts.length >= 3) {
            const baseDir = parts[0]; // 'build-order-creator' or 'build-order-data'
            const civ = parts[1];
            const fileName = parts[2];
            const directory = `${baseDir}/${civ}`;

            try {
                let buildOrderData = null;

                // First try APPDATA via Tauri FS API
                if (window.readFileSystemFile) {
                    const content = await window.readFileSystemFile(directory, fileName);
                    if (content) {
                        buildOrderData = JSON.parse(content);
                        console.log(`Loaded build order from APPDATA: ${directory}/${fileName}`);
                    }
                }

                // If not found in APPDATA, try embedded assets via fetch
                if (!buildOrderData) {
                    try {
                        const response = await fetch(`${directory}/${fileName}`);
                        if (response.ok) {
                            buildOrderData = await response.json();
                            console.log(`Loaded build order from embedded assets: ${directory}/${fileName}`);
                        }
                    } catch (fetchError) {
                        console.log('Build order not found in embedded assets');
                    }
                }

                // Fallback to legacy File System Access API
                if (!buildOrderData && window.directoryHandle) {
                    const creatorDir = await window.directoryHandle.getDirectoryHandle(baseDir);
                    const civDir = await creatorDir.getDirectoryHandle(civ);
                    const fileHandle = await civDir.getFileHandle(fileName);
                    const file = await fileHandle.getFile();
                    const content = await file.text();
                    buildOrderData = JSON.parse(content);
                }

                if (buildOrderData) {
                    // Display in modal
                    displayBuildOrderInModal(buildOrderData);

                    // Show modal
                    document.getElementById('build-order-preview-modal').style.display = 'flex';
                } else {
                    console.error('Could not load build order from any source');
                    alert('Could not load build order preview');
                }
            } catch (error) {
                console.error('Error loading local build order:', error);
                alert('Could not load build order preview');
            }
        }
    } else {
        // External URL - just open in new tab
        openExternalUrl(url);
    }
}

// Display build order data in modal
function displayBuildOrderInModal(buildOrderData) {
    const titleElement = document.getElementById('modal-build-title');
    const descriptionDiv = document.getElementById('modal-viewer-description');
    const descriptionText = document.getElementById('modal-viewer-description-text');
    const tbody = document.getElementById('modal-viewer-tbody');

    // Set title
    titleElement.textContent = buildOrderData.name || 'Build Order Preview';

    // Show/hide description
    if (buildOrderData.description && buildOrderData.description.trim()) {
        descriptionText.textContent = buildOrderData.description;
        descriptionDiv.style.display = 'block';
    } else {
        descriptionDiv.style.display = 'none';
    }

    // Clear existing rows
    tbody.innerHTML = '';

    // Add steps
    buildOrderData.steps.forEach((step) => {
        const row = document.createElement('tr');

        if (step.type === 'custom') {
            // Custom text row
            row.className = 'custom-row';
            row.innerHTML = `
                <td>${step.step}</td>
                <td class="time-cell">${step.time || ''}</td>
                <td colspan="5" class="custom-text-cell">${step.customText || ''}</td>
            `;
        } else if (step.type === 'ageup') {
            // Age up row
            row.className = 'age-up-row';
            row.innerHTML = `
                <td>${step.step}</td>
                <td class="time-cell">${step.time || ''}</td>
                <td colspan="4" class="age-up-cell">
                    <span class="age-roman">${step.ageRoman || 'II'}</span>
                    <span class="age-label">Age Up</span>
                </td>
                <td class="notes-cell">${step.notes || ''}</td>
            `;
        } else {
            // Standard resource row
            row.innerHTML = `
                <td>${step.step}</td>
                <td class="time-cell">${step.time || ''}</td>
                <td class="resource-cell">${formatResourceValue(step.food)}</td>
                <td class="resource-cell">${formatResourceValue(step.wood)}</td>
                <td class="resource-cell">${formatResourceValue(step.gold)}</td>
                <td class="resource-cell">${formatResourceValue(step.stone)}</td>
                <td class="notes-cell">${step.notes || ''}</td>
            `;
        }

        tbody.appendChild(row);
    });
}

// Format resource value for modal (same as viewer)
function formatResourceValue(value) {
    // Only show value if it exists and is not undefined/null
    if (value === undefined || value === null || value === '') {
        return '';
    }
    const num = parseInt(value);
    if (isNaN(num)) {
        return '';
    }
    return `<strong>${num}</strong>`;
}

// Close build order preview modal
window.closeBuildOrderPreview = function() {
    document.getElementById('build-order-preview-modal').style.display = 'none';
}

// Handler for modal click (stored for reference)
function handleModalClick(e) {
    const modal = document.getElementById('build-order-preview-modal');
    if (e.target === modal) {
        window.closeBuildOrderPreview();
    }
}

// Handler for ESC key (stored for reference)
function handleModalEscKey(e) {
    const modal = document.getElementById('build-order-preview-modal');
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
        window.closeBuildOrderPreview();
    }
}

// Close modal when clicking outside of it or pressing ESC
// Memory leak fix: Use flag to prevent duplicate listeners
document.addEventListener('DOMContentLoaded', function() {
    if (buildOrderModalListenersAttached) {
        return;
    }
    buildOrderModalListenersAttached = true;

    const modal = document.getElementById('build-order-preview-modal');
    if (!modal) {
        return;
    }

    // Close when clicking on overlay (outside modal content)
    modal.addEventListener('click', handleModalClick);

    // Close when pressing ESC key
    document.addEventListener('keydown', handleModalEscKey);
});

// Load local build orders for dropdown (simplified version)
// TAURI: Uses buildOrderDatabase populated by tauri-adapter.js
window.loadLocalBuildOrdersForDropdown = async function(civId) {
    const buildSelect = document.getElementById('local-build-order-select');

    if (!buildSelect) {
        console.error('Local build order select element not found!');
        return;
    }

    // Clear current selection
    buildSelect.innerHTML = '<option value="">-- Select a Build Order --</option>';

    if (!civId) {
        return;
    }

    try {
        const buildOrders = [];

        // First use buildOrderDatabase (populated by tauri-adapter.js)
        if (window.buildOrderDatabase && window.buildOrderDatabase[civId]) {
            Object.entries(window.buildOrderDatabase[civId]).forEach(([name, details]) => {
                // Only include local build orders
                if (details.location === 'local' || (details.url && details.url.startsWith('local://'))) {
                    buildOrders.push({
                        fileName: details.fileName || `${name.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase()}.json`,
                        name: name,
                        data: {
                            name: name,
                            ...details
                        }
                    });
                }
            });
            console.log(`Loaded ${buildOrders.length} local build orders for ${civId} from buildOrderDatabase`);
        }

        // Fallback to legacy File System Access API if no build orders found
        if (buildOrders.length === 0 && window.directoryHandle) {
            try {
                const creatorDir = await window.directoryHandle.getDirectoryHandle('build-order-creator');
                const civDir = await creatorDir.getDirectoryHandle(civId);

                for await (const entry of civDir.values()) {
                    if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                        try {
                            const file = await entry.getFile();
                            const content = await file.text();
                            const buildOrderData = JSON.parse(content);
                            buildOrders.push({
                                fileName: entry.name,
                                name: buildOrderData.name || entry.name,
                                data: buildOrderData
                            });
                        } catch (error) {
                            console.error('Error reading build order file:', entry.name, error);
                        }
                    }
                }
            } catch (error) {
                console.log('No legacy build-order-creator directory found for', civId);
            }
        }

        // Sort and add to dropdown
        buildOrders.sort((a, b) => a.name.localeCompare(b.name));

        if (buildOrders.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No build orders found';
            option.disabled = true;
            buildSelect.appendChild(option);
        } else {
            buildOrders.forEach(bo => {
                const option = document.createElement('option');
                option.value = bo.fileName;
                option.textContent = bo.name;
                option.dataset.buildOrderData = JSON.stringify(bo.data);
                buildSelect.appendChild(option);
            });
        }

    } catch (error) {
        console.log('Error loading build orders for', civId, error);
    }
}

// Handle local build order selection when dropdown changes
window.loadSelectedLocalBuildOrder = function() {
    const dropdown = document.getElementById('local-build-order-select');
    const buildTitleInput = document.getElementById('build-title');
    const buildUrlInput = document.getElementById('build-url');

    if (!dropdown || !buildTitleInput) return;

    const selectedOption = dropdown.options[dropdown.selectedIndex];
    if (!selectedOption || !selectedOption.value) return;

    // Get build order data from dataset
    const buildOrderData = JSON.parse(selectedOption.dataset.buildOrderData || '{}');

    // Set the title
    buildTitleInput.value = buildOrderData.name || '';

    // Clear URL field since we're using local build order
    if (buildUrlInput) {
        buildUrlInput.value = '';
    }

    // Store reference for later use
    const civId = document.getElementById('build-civ-select').value;
    window.selectedLocalBuildOrder = {
        civId: civId,
        fileName: selectedOption.value,
        data: buildOrderData
    };
}

// Load all civilization build orders from new unified build-order-data system
// TAURI: Skip this definition - tauri-adapter.js provides the fetch-based implementation
if (!window.isTauri) {
window.loadAllCivBuildOrders = async function() {
    console.log('Loading build orders from new build-order-data system (non-Tauri)...');

    try {
        // Get build-order-data directory
        const buildOrderDataDir = await window.directoryHandle.getDirectoryHandle('build-order-data');

        // Load build orders for each civilization
        for (const civ of civilizations) {
            try {
                const civDir = await buildOrderDataDir.getDirectoryHandle(civ.id);
                const civBuildOrders = {};

                // Read all JSON files in the civilization directory
                for await (const entry of civDir.values()) {
                    if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                        try {
                            const file = await entry.getFile();
                            const content = await file.text();
                            const buildOrderData = JSON.parse(content);

                            // Use the build order name as key (maintain compatibility)
                            const buildOrderName = buildOrderData.name || entry.name.replace('.json', '');
                            civBuildOrders[buildOrderName] = {
                                // Keep existing structure for compatibility with filterBuildOrders
                                url: buildOrderData.url,
                                mapTypes: buildOrderData.mapTypes || [],
                                opponents: buildOrderData.opponents || [],
                                notes: buildOrderData.notes || '',
                                advancedNotes: buildOrderData.advancedNotes || {},
                                active: buildOrderData.active !== false, // Default to active

                                // Add new fields for the unified system
                                location: buildOrderData.location,
                                description: buildOrderData.description || '',
                                lastModified: buildOrderData.lastModified,
                                steps: buildOrderData.steps || [], // For local build orders
                                fileName: entry.name // Store filename for editing
                            };
                        } catch (error) {
                            console.error(`Error parsing ${entry.name} for ${civ.id}:`, error);
                        }
                    }
                }

                if (Object.keys(civBuildOrders).length > 0) {
                    buildOrderDatabase[civ.id] = civBuildOrders;
                    console.log(`Loaded ${Object.keys(civBuildOrders).length} build orders for ${civ.name}`);
                }

            } catch (error) {
                console.log(`No build orders found for ${civ.name}:`, error.message);
            }
        }

        // Update build orders display
        filterBuildOrders();
        console.log('Build orders loading complete. Database:', buildOrderDatabase);

        // Update footer statistics
        updateFooterStats();

    } catch (error) {
        console.error('Error accessing build-order-data directory:', error);
    }

    // Mark build orders as loaded
    if (window.AppLoadingState) {
        window.AppLoadingState.buildOrdersLoaded = true;
        window.AppLoadingState.checkAllLoaded();
    }
};
} // End of if (!window.isTauri) block

// Removed old loadFileWithFileSystemAPI - now using build-order-data directory only

// Populate build order form dropdowns
function populateBuildOrderForm() {
    const buildCivSelect = document.getElementById('build-civ-select');
    const opponentCheckboxes = document.getElementById('opponent-civ-checkboxes');

    if (!buildCivSelect || !opponentCheckboxes) return;

    // Custom dropdown will be populated when clicked, just add event listener
    buildCivSelect.addEventListener('change', populateAddAdvancedNotes);

    // Populate opponent checkboxes with flags
    opponentCheckboxes.innerHTML = '';
    civilizations.forEach(civ => {
        const flagPath = getCivFlag(civ.id);
        const label = document.createElement('label');
        label.className = 'checkbox-label';

        let flagHtml = '';
        if (flagPath) {
            flagHtml = `<img src="${flagPath}" class="checkbox-flag" alt="${civ.name}"> `;
        }

        label.innerHTML = `
            <input type="checkbox" name="opponent-civ" value="${civ.id}"> ${flagHtml}${civ.name}
        `;
        opponentCheckboxes.appendChild(label);
    });
}

// Add build order
async function addBuildOrder() {
    // Check if file access is available, request if not
    const hasAccess = await checkAndRequestFileAccess('add the build order');
    if (!hasAccess) {
        return;
    }
    const civId = document.getElementById('build-civ-select').value;
    const title = document.getElementById('build-title').value.trim();
    let url = document.getElementById('build-url').value.trim();
    const notes = document.getElementById('build-notes').value.trim();

    // Check if a local build order is selected
    const localBuildOrderSelect = document.getElementById('local-build-order-select');
    const localBuildOrderSelected = localBuildOrderSelect && localBuildOrderSelect.value;

    // If local build order is selected, use a special internal URL
    if (localBuildOrderSelected && window.selectedLocalBuildOrder) {
        url = `local://build-order-creator/${civId}/${localBuildOrderSelect.value}`;
    }

    if (!civId || !title || (!url && !localBuildOrderSelected)) {
        alert('Please fill in all required fields: Civilization, Title, and either URL or Local Build Order');
        return;
    }

    // Get selected map types
    const mapTypeCheckboxes = document.querySelectorAll('input[name="map-type"]:checked');
    const mapTypes = Array.from(mapTypeCheckboxes).map(cb => cb.value);

    if (mapTypes.length === 0) {
        alert('Please select at least one map type');
        return;
    }

    // Get selected opponent civilizations
    const opponentCheckboxes = document.querySelectorAll('input[name="opponent-civ"]:checked');
    const opponents = Array.from(opponentCheckboxes).map(cb => cb.value);

    if (opponents.length === 0) {
        alert('Please select at least one opponent civilization');
        return;
    }

    // Collect advanced notes
    const advancedNotes = {};
    const advancedNotesInputs = document.querySelectorAll('#add-advanced-notes textarea');
    advancedNotesInputs.forEach(textarea => {
        const civId = textarea.dataset.civ;
        const mapType = textarea.dataset.map;
        const noteText = textarea.value.trim();

        if (noteText) {
            if (!advancedNotes[civId]) {
                advancedNotes[civId] = {};
            }
            advancedNotes[civId][mapType] = noteText;
        }
    });

    // Create build order object
    const buildOrder = {
        url: url,
        mapTypes: mapTypes,
        opponents: opponents,
        notes: notes,
        advancedNotes: advancedNotes
    };

    // Initialize civilization data if it doesn't exist
    if (!buildOrderDatabase[civId]) {
        buildOrderDatabase[civId] = {};
    }

    // Add build order to database
    buildOrderDatabase[civId][title] = buildOrder;

    // Save to file
    autoSaveCivBuildOrders(civId);

    // Clear form
    clearBuildOrderForm();

    // Refresh display
    filterBuildOrders();

    alert('Build order added successfully!');
}

// Auto-save civilization build orders
// TAURI: File system always available via tauri-adapter.js
async function autoSaveCivBuildOrders(civId) {
    const civData = {
        civilization: civId,
        buildOrders: buildOrderDatabase[civId] || {}
    };

    const jsonContent = JSON.stringify(civData, null, 2);
    const fileName = `${civId}-build-orders.json`;

    try {
        await writeFileSystemFile('build-orders', fileName, jsonContent);
        console.log(`Saved ${fileName}`);
    } catch (error) {
        console.error('Save failed:', error);
    }
}

// Clear build order form
function clearBuildOrderForm() {
    document.getElementById('build-civ-select').value = '';
    document.getElementById('build-title').value = '';
    document.getElementById('build-url').value = '';
    document.getElementById('build-notes').value = '';

    // Clear checkboxes
    document.querySelectorAll('input[name="map-type"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="opponent-civ"]').forEach(cb => cb.checked = false);

    // Clear advanced notes
    document.getElementById('add-advanced-notes').innerHTML = '';

    // Reset custom dropdown display
    const dropdown = document.getElementById('build-civ-select-dropdown');
    if (dropdown) {
        const selectedText = dropdown.querySelector('.dropdown-selected span');
        if (selectedText) {
            selectedText.innerHTML = 'Select civilization...';
        }
    }
}

// Filter build orders by civilization and active status
function filterBuildOrders() {
    const selectedCiv = document.getElementById('filter-civ-select').value;
    const selectedStatus = document.getElementById('filter-active-select').value;
    const container = document.getElementById('filtered-build-orders');

    if (!container) return;

    // Theme is applied globally via <body> class (js/theme.js)

    container.innerHTML = '';

    // Collect all cards first, sorted by the chosen key
    const sortKey = (document.getElementById('sort-build-orders') || {}).value || 'name';
    const boEntries = [];
    Object.entries(buildOrderDatabase).forEach(([civId, buildOrders]) => {
        // Skip if filtering by specific civ and this isn't it
        if (selectedCiv && civId !== selectedCiv) return; // harter Civ-Filter: nur die gewaehlte Civ


        const civData = civilizations.find(c => c.id === civId);
        if (!civData) return;

        Object.entries(buildOrders).forEach(([buildOrderName, details]) => {
            // Filter by active status
            const isActive = details.active !== false; // Default to active if not specified
            if (selectedStatus === 'active' && !isActive) return;
            if (selectedStatus === 'inactive' && isActive) return;

            // Sekundaerer BO-Filter: Select-All an = alle; aus + keine Auswahl = nichts
            if (selectedCiv && !civBoAllSelected) {
                if (civBoFilterState.size === 0) return;
                if (!civBoFilterState.has(buildOrderName)) return;
            }

            // Sort-key value filter: only build orders whose key value is selected (empty = all)
            if (boValueFilterState.selected.size > 0) {
                const value = valueOfBo(sortKey, civId, buildOrderName, details);
                if (value === null || !boValueFilterState.selected.has(value)) return;
            }

            const card = document.createElement('div');
            card.className = `build-order-card ${isActive ? 'active-build-order' : 'inactive-build-order'}`;
            card.id = `build-order-${civId}-${sanitizeForId(buildOrderName)}`;
            // Add data attributes for easy access to original values
            card.setAttribute('data-civ-id', civId);
            card.setAttribute('data-build-order-name', buildOrderName);

            const opponentFlags = (details.opponents || []).map(oppId => {
                const oppData = civilizations.find(c => c.id === oppId);
                const flagPath = oppData ? getCivFlag(oppId) : null;
                const name = oppData ? oppData.name : oppId;
                return flagPath
                    ? `<span class="opp-chip"><img src="${flagPath}" class="opp-flag" alt="${name}" title="${name}"></span>`
                    : `<span class="opp-chip">${name}</span>`;
            }).join('');

            const mapChips = (details.mapTypes || []).map(map =>
                `<span class="map-chip">${map.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>`
            ).join('');

            const civColor = typeof window.getCompareColor === 'function' ? window.getCompareColor(civId) : '#6a94bb';
            card.style.setProperty('--civ-color', civColor);

            const isLocalOrder = details.url && details.url.startsWith('local://');
            const linkHtml = isLocalOrder
                ? `<span class="bo-link">📜 Local Build Order</span>`
                : `<a class="bo-link" href="${details.url}" target="_blank" rel="noopener">Open Guide ↗</a>`;

            // Age progression badges (local build orders only)
            const ageRoman = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4 };
            const currentAge = (details.steps || []).reduce((max, step) => {
                const age = step.ageRoman || step.age;
                return ageRoman[age] ? Math.max(max, ageRoman[age]) : max;
            }, 0);
            const lastAgeRoman = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' }[currentAge] || '';

            // Notes belong to the edit form (and the editor) only
            const noteHtml = '';

            const largeFlag = getLargeCivFlag(civId);
            const flagHtml = largeFlag ? `<div class="bo-flag" style="background-image:url('${largeFlag}')"></div>` : '';
            const ageHtml = currentAge ? `
                <div class="bo-ages" title="Progresses to Age ${lastAgeRoman} • ${(details.steps || []).length} steps">
                    ${[1,2,3,4].map(n => `
                        <img src="Images/age/age_${n}.webp" class="bo-age-icon ${n <= currentAge ? 'reached' : 'dim'}"
                             alt="Age ${n}" title="${n <= currentAge ? `Reached Age ${n}` : `Not reached (Age ${lastAgeRoman} max)`}">
                    `).join('')}
                </div>` : '';

            card.innerHTML = `
                ${isActive ? '<div class="active-plaque">ACTIVE</div>' : '<div class="inactive-plaque">INACTIVE</div>'}
                <div class="bo-content${largeFlag ? ' has-flag' : ''}${currentAge ? ' has-ages' : ''}">
                    ${flagHtml}
                    <h4>${buildOrderName}</h4>
                    <div class="type-line">
                        ${(details.types || []).map(t => `<span class="type-chip">${t}</span>`).join('')}
                    </div>
                    <div class="meta-row">
                        ${mapChips}
                    </div>
                    <div class="meta-row meta-row-vs">
                        <span class="vs-label">vs</span>
                        ${opponentFlags}
                    </div>
                    <div class="url">${linkHtml}</div>
                    ${noteHtml}
                    ${ageHtml}
                </div>
                <button class="bo-card-export" title="Export this build order" onclick="exportSingleBuildOrder('${civId}', '${buildOrderName.replace(/'/g, "\\'")}')">⬇</button>
                <button class="edit-btn" id="edit-btn-${civId}-${sanitizeForId(buildOrderName)}" onclick="toggleEditForm('${civId}', '${buildOrderName}')" title="Edit build order">✎ Edit</button>

                <div class="edit-form" id="edit-form-${civId}-${sanitizeForId(buildOrderName)}">
                    <div class="form-grid">
                        <div class="form-item">
                            <label for="card-edit-title-${civId}-${sanitizeForId(buildOrderName)}">Build Order Title</label>
                            <input type="text" id="card-edit-title-${civId}-${sanitizeForId(buildOrderName)}" class="form-input edit-title" value="${buildOrderName}">
                        </div>
                        <div class="form-item">
                            <label for="card-edit-url-${civId}-${sanitizeForId(buildOrderName)}">Build Order URL</label>
                            <input type="url" id="card-edit-url-${civId}-${sanitizeForId(buildOrderName)}" class="form-input edit-url" value="${details.url}">
                        </div>
                        <div class="form-item">
                            <div class="group-label">Type</div>
                            <div class="checkbox-group">
                                ${['Rush', 'Dark Age Aggression', 'Boom', 'Fast Castle', 'Fast Imperial', 'Timing Attack', 'Cheese', 'Custom'].map(t => `
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="edit-bo-type" value="${t}" ${(details.types || []).includes(t) ? 'checked' : ''}> ${t}
                                    </label>
                                `).join('')}
                                <input type="text" id="edit-custom-type-input-${civId}-${sanitizeForId(buildOrderName)}" class="form-input custom-type-input" placeholder="Own category..." style="display: none;">
                            </div>
                        </div>
                        <div class="form-item">
                            <div class="group-label">Map Types</div>
                            <div class="checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="edit-map-type" value="land-open" ${(details.mapTypes || []).includes('land-open') ? 'checked' : ''}> Land Open
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="edit-map-type" value="land-narrow" ${(details.mapTypes || []).includes('land-narrow') ? 'checked' : ''}> Land Narrow
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="edit-map-type" value="hybrid" ${(details.mapTypes || []).includes('hybrid') ? 'checked' : ''}> Hybrid
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" name="edit-map-type" value="water" ${(details.mapTypes || []).includes('water') ? 'checked' : ''}> Water
                                </label>
                            </div>
                        </div>
                        <div class="form-item">
                            <div class="group-label">Opponent Civilizations</div>
                            <div class="checkbox-group edit-opponents-${civId}-${sanitizeForId(buildOrderName)}">
                                ${civilizations.map(civ => {
                                    const flagPath = getCivFlag(civ.id);
                                    const flagHtml = flagPath ? `<img src="${flagPath}" class="checkbox-flag" alt="${civ.name}"> ` : '';
                                    return `
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="edit-opponent-civ" value="${civ.id}" ${(details.opponents || []).includes(civ.id) ? 'checked' : ''}> ${flagHtml}${civ.name}
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        <div class="form-item">
                            <label for="card-edit-notes-${civId}-${sanitizeForId(buildOrderName)}">User Notes</label>
                            <textarea id="card-edit-notes-${civId}-${sanitizeForId(buildOrderName)}" class="form-input edit-notes" rows="3">${details.notes || ''}</textarea>
                        </div>
                        <div class="form-item">
                            <label for="card-edit-status-${civId}-${sanitizeForId(buildOrderName)}">Build Order Status</label>
                            <select id="card-edit-status-${civId}-${sanitizeForId(buildOrderName)}" class="form-input edit-active-status" name="edit-active-status">
                                <option value="active" ${details.active !== false ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${details.active === false ? 'selected' : ''}>Inactive</option>
                            </select>
                            <small class="form-help">Active build orders appear in strategy recommendations and are highlighted in the library.</small>
                        </div>
                        <div class="form-item">
                            <div class="group-label">Advanced User Notes (Matchup-specific)</div>
                            <div class="advanced-notes-section">
                                ${generateAdvancedNotesHTML(civId, buildOrderName, details)}
                            </div>
                        </div>
                        ${details.location === 'local' ? `
                        <div class="build-order-creator">
                            <h4>Build Order Steps</h4>
                            <div class="creator-controls">
                                <button type="button" class="btn-secondary btn-small" onclick="addStepToLibraryEdit('${civId}', '${buildOrderName}', 'standard')">Add Standard Row</button>
                                <button type="button" class="btn-secondary btn-small" onclick="addStepToLibraryEdit('${civId}', '${buildOrderName}', 'custom')">Add Custom Row</button>
                                <button type="button" class="btn-secondary btn-small" onclick="addStepToLibraryEdit('${civId}', '${buildOrderName}', 'ageup')">Add Age Up</button>
                            </div>

                            <div class="build-order-table-container">
                                <table class="build-order-table">
                                    <thead>
                                        <tr>
                                            <th width="60">#</th>
                                            <th width="80">Time</th>
                                            <th width="100" class="resource-header food">
                                                <img src="Icons/foodicon.png" alt="Food" class="resource-icon" onerror="this.style.display='none'">
                                            </th>
                                            <th width="100" class="resource-header wood">
                                                <img src="Icons/woodicon.png" alt="Wood" class="resource-icon" onerror="this.style.display='none'">
                                            </th>
                                            <th width="100" class="resource-header gold">
                                                <img src="Icons/goldicon.png" alt="Gold" class="resource-icon" onerror="this.style.display='none'">
                                            </th>
                                            <th width="100" class="resource-header stone">
                                                <img src="Icons/stoneicon.png" alt="Stone" class="resource-icon" onerror="this.style.display='none'">
                                            </th>
                                            <th>Notes</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="edit-steps-tbody-${civId}-${sanitizeForId(buildOrderName)}"
                                           data-civ-id="${civId}" data-build-order-name="${buildOrderName.replace(/"/g, '&quot;')}">
                                        ${generateStepsTableHTML(details.steps, civId, buildOrderName)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="edit-form-buttons">
                        <div class="left-buttons">
                            <button class="save-btn" onclick="saveBuildOrderEdit('${civId}', '${buildOrderName}')">Save Changes</button>
                            <button class="cancel-btn" onclick="toggleEditForm('${civId}', '${buildOrderName}')">Cancel</button>
                        </div>
                        <button class="delete-btn" onclick="deleteBuildOrder('${civId}', '${buildOrderName}')">Delete</button>
                    </div>
                </div>
            `;

            // Whole-card click opens the preview popup (local: modal, external: new tab).
            // Interactions inside (edit form, links, buttons) are excluded.
            const openBuildOrder = () => window.handleBuildOrderClick(details.url, civId, buildOrderName);
            card.addEventListener('click', (e) => {
                if (e.target.closest('.edit-btn, .edit-form, a, .bo-link, input, select, textarea, button')) return;
                openBuildOrder();
            });
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `Open build order ${buildOrderName} (${civData.name})`);
            card.addEventListener('keydown', (e) => {
                // Only react when the card itself is focused; keydown from
                // inputs/textareas inside the edit form bubbles up here and
                // must not trigger the open action.
                if (e.target !== card) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openBuildOrder();
                }
            });

            boEntries.push({ civId, buildOrderName, card });
        });
    });

    // Comparator per sort key; missing values sort to the end
    const sortFns = {
        name: (a, b) => a.buildOrderName.localeCompare(b.buildOrderName),
        type: (a, b) => keyOf(a, 'types').toLowerCase().localeCompare(keyOf(b, 'types').toLowerCase()),
        mapType: (a, b) => keyOf(a, 'mapTypes').toLowerCase().localeCompare(keyOf(b, 'mapTypes').toLowerCase()),
        opponent: (a, b) => opponentNameOf(a).toLowerCase().localeCompare(opponentNameOf(b).toLowerCase()),
        ageUp: (a, b) => ageUpSecondsOf(a) - ageUpSecondsOf(b)
    };
    const cmp = sortFns[sortKey] || sortFns.name;

    function valueOfBo(key, civId, buildOrderName, details) {
        if (key === 'type') return (details.types || []).length ? details.types[0] : 'Uncategorized';
        if (key === 'mapType') return (details.mapTypes || []).length ? details.mapTypes[0] : 'uncategorized';
        if (key === 'opponent') return (details.opponents || [])[0] || '~none';
        if (key === 'ageUp') {
            const time = (details.steps || []).filter(st => st.type === 'ageup').map(st => st.time).filter(Boolean)[0];
            return time || '~none';
        }
        return null;
    }
    function keyOf(entry, field) {
        return ((buildOrderDatabase[entry.civId][entry.buildOrderName] || {})[field] || [])[0] || '';
    }
    function opponentNameOf(entry) {
        const bo = buildOrderDatabase[entry.civId][entry.buildOrderName] || {};
        const oppId = (bo.opponents || [])[0];
        if (!oppId) return '~';
        return ((civilizations.find(c => c.id === oppId) || {}).name || oppId);
    }
    function ageUpSecondsOf(entry) {
        const bo = buildOrderDatabase[entry.civId][entry.buildOrderName] || {};
        const time = (bo.steps || []).filter(st => st.type === 'ageup').map(st => st.time).filter(Boolean)[0];
        const m = String(time).match(/(\d{1,2}):(\d{2})/);
        return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : Infinity;
    }

    boEntries.sort(cmp);
    boEntries.forEach(({ card }) => container.appendChild(card));
}

// Generate edit form HTML
function generateEditFormHTML(civId, buildOrderName, details) {
    const mapTypes = ['land-open', 'land-narrow', 'hybrid', 'water'];

    return `
        <div class="form-grid">
            <div class="form-item">
                <label for="edit-title-${civId}-${buildOrderName.replace(/\s+/g, '-')}">Title</label>
                <input type="text" id="edit-title-${civId}-${buildOrderName.replace(/\s+/g, '-')}" class="form-input" value="${buildOrderName}">
            </div>
            <div class="form-item">
                <label for="edit-url-${civId}-${buildOrderName.replace(/\s+/g, '-')}">URL</label>
                <input type="url" id="edit-url-${civId}-${buildOrderName.replace(/\s+/g, '-')}" class="form-input" value="${details.url}">
            </div>
            <div class="form-item">
                <div class="group-label">Map Types</div>
                <div class="checkbox-group">
                    ${mapTypes.map(mapType => `
                        <label class="checkbox-label">
                            <input type="checkbox" name="edit-map-type-${civId}-${buildOrderName.replace(/\s+/g, '-')}" value="${mapType}" ${(details.mapTypes || []).includes(mapType) ? 'checked' : ''}> ${mapType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="form-item">
                <div class="group-label">Opponent Civilizations</div>
                <div class="checkbox-group">
                    ${civilizations.map(civ => {
                        const flagPath = getCivFlag(civ.id);
                        const flagHtml = flagPath ? `<img src="${flagPath}" class="checkbox-flag" alt="${civ.name}"> ` : '';
                        return `
                            <label class="checkbox-label">
                                <input type="checkbox" name="edit-opponent-civ-${civId}-${buildOrderName.replace(/\s+/g, '-')}" value="${civ.id}" ${(details.opponents || []).includes(civ.id) ? 'checked' : ''}> ${flagHtml}${civ.name}
                            </label>
                        `;
                    }).join('')}
                </div>
            </div>
            <div class="form-item">
                <label for="edit-notes-${civId}-${buildOrderName.replace(/\s+/g, '-')}">Notes</label>
                <textarea id="edit-notes-${civId}-${buildOrderName.replace(/\s+/g, '-')}" class="form-input" rows="3">${details.notes || ''}</textarea>
            </div>
            <div class="form-item">
                <div class="group-label">Advanced Notes</div>
                <div class="advanced-notes-section" id="edit-advanced-notes-${civId}-${buildOrderName.replace(/\s+/g, '-')}">
                    ${generateAdvancedNotesHTML(civId, buildOrderName, details)}
                </div>
            </div>
        </div>
        <div class="edit-form-buttons">
            <div class="left-buttons">
                <button class="save-btn" onclick="saveBuildOrderEdit('${civId}', '${buildOrderName}')">Save Changes</button>
                <button class="cancel-btn" onclick="toggleEditForm('${civId}', '${buildOrderName}')">Cancel</button>
            </div>
            <button class="delete-btn" onclick="deleteBuildOrder('${civId}', '${buildOrderName}')">Delete</button>
        </div>
    `;
}

// Toggle edit form visibility
function toggleEditForm(civId, buildOrderName) {
    const formId = `edit-form-${civId}-${sanitizeForId(buildOrderName)}`;
    const form = document.getElementById(formId);
    const buttonId = `edit-btn-${civId}-${sanitizeForId(buildOrderName)}`;
    const button = document.getElementById(buttonId);

    // Close all other open forms and reset their buttons
    document.querySelectorAll('.edit-form.active').forEach(f => {
        if (f.id !== formId) {
            f.classList.remove('active');
            // Reset other buttons to "Edit"
            const otherId = f.id.replace('edit-form-', 'edit-btn-');
            const otherBtn = document.getElementById(otherId);
            if (otherBtn) {
                otherBtn.textContent = 'Edit';
                otherBtn.classList.remove('close-btn');
            }
        }
    });

    if (form && button) {
        const isActive = form.classList.contains('active');
        form.classList.toggle('active');

        // Update button text and style
        if (isActive) {
            button.textContent = 'Edit';
            button.classList.remove('close-btn');
        } else {
            button.textContent = 'Close';
            button.classList.add('close-btn');
        }
    }
}

// Save build order edits
async function saveBuildOrderEdit(civId, originalName) {
    console.log('Saving build order edit for:', civId, originalName);

    const cardId = `build-order-${civId}-${sanitizeForId(originalName)}`;
    const card = document.getElementById(cardId);

    if (!card) {
        console.error('Card not found:', cardId);
        alert('Error: Could not find build order card');
        return;
    }

    // Check if file access is available
    const hasAccess = await checkAndRequestFileAccess('save the build order changes');
    if (!hasAccess) {
        return;
    }

    try {
        // Get new values using the simpler class selectors
        const newTitle = card.querySelector('.edit-title').value.trim();
        const newUrl = card.querySelector('.edit-url').value.trim();
        const newNotes = card.querySelector('.edit-notes').value.trim();
        const newStatus = card.querySelector('.edit-active-status').value;

        if (!newTitle || !newUrl) {
            alert('Title and URL are required');
            return;
        }

        // Get selected map types
        const mapTypeCheckboxes = card.querySelectorAll('input[name="edit-map-type"]:checked');
        const mapTypes = Array.from(mapTypeCheckboxes).map(cb => cb.value);

        if (mapTypes.length === 0) {
            alert('Please select at least one map type');
            return;
        }

        // Get selected opponents
        const opponentCheckboxes = card.querySelectorAll('input[name="edit-opponent-civ"]:checked');
        const opponents = Array.from(opponentCheckboxes).map(cb => cb.value);

        if (opponents.length === 0) {
            alert('Please select at least one opponent civilization');
            return;
        }

        // Get selected types (in Custom, freie Kategorie aus dem Eingabefeld)
        const typeCheckboxes = card.querySelectorAll('input[name="edit-bo-type"]:checked');
        const types = Array.from(typeCheckboxes).map(cb => cb.value);
        const customTypeInput = card.querySelector('.custom-type-input');
        if (customTypeInput && customTypeInput.style.display !== 'none') {
            const customValue = customTypeInput.value.trim();
            if (customValue) {
                const i = types.indexOf('Custom');
                if (i !== -1) types[i] = customValue; else types.push(customValue);
            }
        }

        if (types.length === 0) {
            alert('Please select at least one type');
            return;
        }

        // Collect advanced notes
        const advancedNotes = {};
        const advancedNotesInputs = card.querySelectorAll('.advanced-note-input');
        advancedNotesInputs.forEach(textarea => {
            const opponentCivId = textarea.dataset.civ;
            const mapType = textarea.dataset.map;
            const noteText = textarea.value.trim();

            if (noteText) {
                if (!advancedNotes[opponentCivId]) {
                    advancedNotes[opponentCivId] = {};
                }
                advancedNotes[opponentCivId][mapType] = noteText;
            }
        });

        // Check if this is a local build order (has steps)
        const isLocal = newUrl.includes('build-order-data/');
        let steps = null;

        if (isLocal) {
            // Collect step data from the steps table
            const tbody = card.querySelector(`#edit-steps-tbody-${civId}-${sanitizeForId(originalName)}`);
            if (tbody) {
                const stepRows = tbody.querySelectorAll('tr[data-step-index]');
                steps = [];

                stepRows.forEach((row, index) => {
                    const stepData = {
                        step: index + 1
                    };

                    // Determine row type based on class
                    if (row.classList.contains('custom-row')) {
                        stepData.type = 'custom';
                        const customTextInput = row.querySelector('.custom-text-input');
                        stepData.customText = customTextInput ? customTextInput.value.trim() : '';
                        const timeInput = row.querySelector('.time-input');
                        stepData.time = timeInput ? timeInput.value.trim() : '';
                    } else if (row.classList.contains('age-up-row')) {
                        stepData.type = 'ageup';
                        const ageRoman = row.querySelector('.age-roman');
                        stepData.ageRoman = ageRoman ? ageRoman.textContent : 'II';
                        const notesInput = row.querySelector('.notes-input');
                        stepData.notes = notesInput ? notesInput.value.trim() : '';
                        const timeInput = row.querySelector('.time-input');
                        stepData.time = timeInput ? timeInput.value.trim() : '';
                    } else {
                        // Standard row
                        stepData.type = 'standard';
                        const foodInput = row.querySelector('input[data-type="food"]');
                        const woodInput = row.querySelector('input[data-type="wood"]');
                        const goldInput = row.querySelector('input[data-type="gold"]');
                        const stoneInput = row.querySelector('input[data-type="stone"]');
                        const notesInput = row.querySelector('.notes-input');
                        const timeInput = row.querySelector('.time-input');

                        // Only store value if it's not empty, distinguish between empty and 0
                        if (foodInput && foodInput.value.trim() !== '') {
                            stepData.food = parseInt(foodInput.value);
                        }
                        if (woodInput && woodInput.value.trim() !== '') {
                            stepData.wood = parseInt(woodInput.value);
                        }
                        if (goldInput && goldInput.value.trim() !== '') {
                            stepData.gold = parseInt(goldInput.value);
                        }
                        if (stoneInput && stoneInput.value.trim() !== '') {
                            stepData.stone = parseInt(stoneInput.value);
                        }
                        stepData.notes = notesInput ? notesInput.value.trim() : '';
                        stepData.time = timeInput ? timeInput.value.trim() : '';
                    }

                    steps.push(stepData);
                });
            } else {
                // If we can't find the tbody, try to preserve existing steps from database
                const existingBuildOrder = buildOrderDatabase[civId]?.[originalName];
                if (existingBuildOrder && existingBuildOrder.steps) {
                    steps = existingBuildOrder.steps;
                } else {
                    steps = [];
                }
            }
        }

        if (isLocal) {
            // Save as individual build order file in build-order-data/
            const fileName = `${newTitle.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase()}.json`;
            const buildOrderData = {
                name: newTitle,
                location: "local",
                url: `local://build-order-data/${civId}/${fileName}`,
                civilization: civId,
                description: "",
                lastModified: new Date().toISOString(),
                notes: newNotes,
                advancedNotes: advancedNotes,
                mapTypes: mapTypes,
                opponents: opponents,
                types: types,
                active: newStatus === 'active',
                steps: steps || []
            };

            try {
                const directory = `build-order-data/${civId}`;

                // Use Tauri FS API via tauri-adapter.js
                if (window.writeFileSystemFile) {
                    // Note: Tauri FS doesn't have a delete function exposed, so old files may remain
                    // if the name changed - this is acceptable for now
                    if (newTitle !== originalName) {
                        console.log(`Name changed from "${originalName}" to "${newTitle}" - old file may remain in APPDATA`);
                    }

                    const success = await window.writeFileSystemFile(directory, fileName, JSON.stringify(buildOrderData, null, 2));
                    if (!success) {
                        throw new Error('Failed to save build order');
                    }
                    console.log(`Saved local build order: ${fileName}`);
                } else if (window.directoryHandle) {
                    // Fallback for non-Tauri mode using File System Access API
                    const buildOrderDataDir = await getOrCreateSubdirectory(window.directoryHandle, 'build-order-data');
                    const civDir = await getOrCreateSubdirectory(buildOrderDataDir, civId);

                    // If name changed, delete old file
                    if (newTitle !== originalName) {
                        const oldFileName = `${originalName.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase()}.json`;
                        try {
                            await civDir.removeEntry(oldFileName);
                            console.log(`Deleted old build order file: ${oldFileName}`);
                        } catch (error) {
                            console.warn(`Could not delete old file ${oldFileName}:`, error);
                        }
                    }

                    const fileHandle = await civDir.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(JSON.stringify(buildOrderData, null, 2));
                    await writable.close();
                    console.log(`Saved local build order: ${fileName}`);
                } else {
                    throw new Error('File system access not available');
                }

                // Update in-memory database
                if (!buildOrderDatabase[civId]) {
                    buildOrderDatabase[civId] = {};
                }

                // Handle name change
                if (newTitle !== originalName) {
                    // Remove old entry
                    delete buildOrderDatabase[civId][originalName];
                }

                // Add/update entry in database
                buildOrderDatabase[civId][newTitle] = {
                    url: buildOrderData.url,
                    mapTypes: buildOrderData.mapTypes,
                    opponents: buildOrderData.opponents,
                    types: buildOrderData.types,
                    notes: buildOrderData.notes,
                    advancedNotes: buildOrderData.advancedNotes,
                    active: buildOrderData.active,
                    location: buildOrderData.location,
                    description: buildOrderData.description,
                    lastModified: buildOrderData.lastModified,
                    steps: buildOrderData.steps,
                    fileName: fileName
                };

            } catch (error) {
                console.error('Error saving local build order:', error);
                alert('Error saving build order: ' + error.message);
                return;
            }
        } else {
            // Update legacy system for external URLs
            const updatedBuildOrder = {
                url: newUrl,
                mapTypes: mapTypes,
                opponents: opponents,
                types: types,
                notes: newNotes,
                advancedNotes: advancedNotes,
                active: newStatus === 'active'
            };

            // Handle name change
            if (newTitle !== originalName) {
                // Remove old entry
                delete buildOrderDatabase[civId][originalName];
                // Add with new name
                buildOrderDatabase[civId][newTitle] = updatedBuildOrder;
            } else {
                // Update existing entry
                buildOrderDatabase[civId][originalName] = updatedBuildOrder;
            }

            // Save to legacy file
            await autoSaveCivBuildOrders(civId);
        }

        // Refresh display
        filterBuildOrders();

        // Keep the edit form open for further changes (re-render reset it)
        toggleEditForm(civId, newTitle);

        alert('Build order updated successfully!');

    } catch (error) {
        console.error('Error saving build order:', error);
        alert('Error saving build order: ' + error.message);
    }
}

// Delete build order
async function deleteBuildOrder(civId, buildOrderName) {
    // Check if file access is available, request if not
    const hasAccess = await checkAndRequestFileAccess('delete the build order');
    if (!hasAccess) {
        return;
    }

    if (!confirm(`Are you sure you want to delete "${buildOrderName}"?`)) {
        return;
    }

    // Get build order details to check if it's local
    const buildOrder = buildOrderDatabase[civId]?.[buildOrderName];
    if (!buildOrder) {
        alert('Error: Build order not found');
        return;
    }

    try {
        // Check if this build order has a JSON file that needs to be deleted
        // This includes all build orders loaded from build-order-data directory
        const hasJsonFile = buildOrder.fileName ||
                           buildOrder.url?.includes('build-order-data/') ||
                           buildOrder.location === 'local';

        if (hasJsonFile) {
            // Delete the JSON file from build-order-data directory
            const buildOrderDataDir = await getOrCreateSubdirectory(window.directoryHandle, 'build-order-data');
            const civDir = await getOrCreateSubdirectory(buildOrderDataDir, civId);

            // Generate filename or use stored filename
            let fileName = buildOrder.fileName;
            if (!fileName) {
                // Generate filename using the same logic as when saving
                fileName = `${buildOrderName.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase()}.json`;
            }

            console.log(`Attempting to delete file: ${fileName} for build order: ${buildOrderName}`);

            // Delete the JSON file - if this fails, abort the entire operation
            await civDir.removeEntry(fileName);
            console.log(`Successfully deleted build order file: ${fileName}`);
        }

        // For legacy external build orders (not in build-order-data), update the legacy file
        if (!hasJsonFile) {
            await autoSaveCivBuildOrders(civId);
        }

        // Remove from in-memory database
        delete buildOrderDatabase[civId][buildOrderName];

        // Refresh display
        filterBuildOrders();

        alert('Build order deleted successfully!');

    } catch (error) {
        console.error('Error deleting build order:', error);
        alert('Error deleting build order: ' + error.message);
    }
}

// Export filtered build orders
// ============================================================================
// Build order export & import (filter bar dropdowns + per-card export)
// ============================================================================

const BO_EXPORT_TYPE = 'aoe4-strategyzer-build-orders';

function toggleBoFilterDropdown(id) {
    const target = document.getElementById(id);
    if (!target) return;

    // Close other dropdowns first (value filter panel included)
    document.querySelectorAll('.bo-filter-panel').forEach(d => {
        if (d.id !== id) d.style.display = 'none';
    });

    const opening = target.style.display === 'none' || target.style.display === '';
    showBoFilterPanelRow();
    target.style.display = opening ? 'block' : 'none';
    if (opening && id === 'bo-export-dropdown') {
        renderBoExportList();
    }
}

// Build the checkbox list of build orders for the chosen export scope
function renderBoExportList() {
    const scope = document.getElementById('bo-export-scope').value;
    const list = document.getElementById('bo-export-list');
    const selectedCiv = document.getElementById('filter-civ-select').value;
    if (!list) return;

    if (scope === 'current' && !selectedCiv) {
        list.innerHTML = '<p class="bo-import-summary">Please select a civilization in the filter dropdown first.</p>';
        return;
    }

    const civsForScope = scope === 'current' ? [selectedCiv] : Object.keys(buildOrderDatabase);
    let html = '<label class="bo-select-item bo-select-all"><input type="checkbox" id="bo-select-all" onchange="toggleBoSelectAll(this.checked)"> Select All</label>';
    civsForScope.forEach(civId => {
        const orders = buildOrderDatabase[civId] || {};
        const names = Object.keys(orders);
        if (names.length === 0) return;
        const civName = (civilizations.find(c => c.id === civId) || {}).name || civId;
        html += `<div class="bo-select-civ">${civName}</div>`;
        names.forEach(name => {
            const bo = orders[name];
            const isActive = bo.active !== false;
            html += `<label class="bo-select-item"><input type="checkbox" class="bo-export-item" data-civ="${civId}" data-name="${name.replace(/"/g, '&quot;')}"> ${name}${isActive ? '' : ' (inactive)'}</label>`;
        });
    });
    list.innerHTML = html || '<p class="bo-import-summary">No build orders available.</p>';
}

// Click outside the build orders filter box closes its dropdown panels
document.addEventListener('click', (e) => {
    if (!e.target || typeof e.target.closest !== 'function') return;
    if (!e.target.closest('.build-orders-filter')) {
        document.querySelectorAll('#bo-export-dropdown, #bo-import-dropdown, #bo-value-filter-panel')
            .forEach(d => { d.style.display = 'none'; });
        hideBoFilterPanelRow();
    }
});

// ============================================================================
// Sort-key value filter (checkbox panel below the filter controls)
// ============================================================================

let boValueFilterState = { key: 'name', selected: new Set() };
let civBoFilterState = new Set(); // checked build order names of the filtered civ
let civBoAllSelected = true;      // Select-All-Zustand des civ-BO-Panels (true = alle zeigen)

function showBoFilterPanelRow() {
    const row = document.getElementById('bo-filter-panel-row');
    if (row) row.style.display = 'flex';
}

function hideBoFilterPanelRow() {
    const row = document.getElementById('bo-filter-panel-row');
    if (row) row.style.display = 'none';
}


const VALUE_FILTER_TITLES = {
    type: 'Filter by Type',
    mapType: 'Filter by Map Type',
    opponent: 'Filter by vs. Civ',
    ageUp: 'Filter by Age Up Time'
};

// Called when the sort key changes: update the value filter panel
function onSortKeyChange() {
    const sortKey = (document.getElementById('sort-build-orders') || {}).value || 'name';
    boValueFilterState = { key: sortKey, selected: new Set() };
    renderBoValueFilterPanel();
    filterBuildOrders();
}

function valueEntriesFor(key) {
    // union of the concrete values of all build orders, sorted
    const values = new Map();
    Object.entries(buildOrderDatabase).forEach(([civId, orders]) => {
        Object.entries(orders).forEach(([name, bo]) => {
            if (key === 'type') ((bo.types || []).length ? bo.types : ['Uncategorized']).forEach(v => values.set(v, v));
            else if (key === 'mapType') ((bo.mapTypes || []).length ? bo.mapTypes : ['uncategorized'])
                .forEach(v => values.set(v, formatMapType(v)));
            else if (key === 'opponent') {
                if (!(bo.opponents || []).length) values.set('~none', 'No opponent set');
                else (bo.opponents || []).forEach(oppId => {
                    const display = ((civilizations.find(c => c.id === oppId) || {}).name || oppId);
                    values.set(oppId, display);
                });
            }
            else if (key === 'ageUp') {
                const time = (bo.steps || []).filter(st => st.type === 'ageup').map(st => st.time).filter(Boolean)[0];
                values.set(time || '~none', time ? time + ' (first Age Up)' : 'No age up time');
            }
        });
    });
    return [...values.entries()].sort((a, b) => String(a[1]).toLowerCase().localeCompare(String(b[1]).toLowerCase()));
}

function formatMapType(v) {
    return String(v).replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function renderBoValueFilterPanel() {
    const panel = document.getElementById('bo-value-filter-panel');
    const list = document.getElementById('bo-value-filter-list');
    const title = document.getElementById('bo-value-filter-title');
    if (!panel || !list) return;

    const key = boValueFilterState.key;
    if (!VALUE_FILTER_TITLES[key]) { panel.style.display = 'none'; return; }

    if (title) title.textContent = VALUE_FILTER_TITLES[key];
    const entries = valueEntriesFor(key);
    list.innerHTML = entries.map(([value, label]) =>
        `<label class="bo-select-item"><input type="checkbox" class="bo-value-filter-item" data-value="${value.replace(/"/g, '&quot;')}"> ${label}</label>`
    ).join('');
    panel.style.display = 'block';
    showBoFilterPanelRow();
}

function toggleBoValueFilterAll(checked) {
    boValueFilterState.selected = checked ? new Set() : new Set();
    document.querySelectorAll('#bo-value-filter-list .bo-value-filter-item').forEach(cb => { cb.checked = checked; });
}

// checkbox change on the value filter list (delegated)
document.addEventListener('change', (e) => {
    if (!e.target || !e.target.classList || !e.target.classList.contains('bo-value-filter-item')) return;
    if (e.target.checked) boValueFilterState.selected.add(e.target.dataset.value);
    else boValueFilterState.selected.delete(e.target.dataset.value);
    // Select All checkbox reflects partial selection
    const all = document.getElementById('bo-value-select-all');
    if (all) all.checked = false;
    filterBuildOrders();
});

// Panel below the filter: build orders of the selected civilization (secondary filter)
function renderCivBoFilterPanel(civId) {
    const panel = document.getElementById('bo-value-filter-panel');
    const list = document.getElementById('bo-value-filter-list');
    const title = document.getElementById('bo-value-filter-title');
    if (!panel || !list) return;
    civBoFilterState = new Set();
    civBoAllSelected = true;

    if (!civId) {
        panel.style.display = 'none';
        onSortKeyChangeKeepValueFilter();
        return;
    }

    const orders = buildOrderDatabase[civId] || {};
    const names = Object.keys(orders);
    if (title) title.textContent = 'Filter Build Orders of ' + ((civilizations.find(c => c.id === civId) || {}).name || civId);
    list.innerHTML = names.map(name =>
        `<label class="bo-select-item"><input type="checkbox" class="bo-civ-bo-item" data-name="${name.replace(/"/g, '&quot;')}" checked> ${name}</label>`
    ).join('') || '<p class="bo-import-summary">No build orders for this civilization yet.</p>';
    civBoFilterState = new Set(names);

    // Select-All: im Civ-Modus eigenes onchange setzen
    const selectAll = document.getElementById('bo-value-select-all');
    if (selectAll) {
        selectAll.checked = true;
        selectAll.setAttribute('onchange', 'toggleCivBoSelectAll(this.checked)');
    }

    const panelRow = document.getElementById('bo-filter-panel-row');
    if (panelRow) panelRow.style.display = 'flex';
    panel.style.display = 'block';
}

// Select All im civ-BO-Panel: an/aus schaltet alle Checkboxen, Filter folgt
function toggleCivBoSelectAll(checked) {
    civBoAllSelected = checked;
    document.querySelectorAll('#bo-value-filter-list .bo-civ-bo-item').forEach(cb => { cb.checked = checked; });
    civBoFilterState = checked ? new Set([...document.querySelectorAll('#bo-value-filter-list .bo-civ-bo-item')].map(cb => cb.dataset.name)) : new Set();
    filterBuildOrders();
}
window.toggleCivBoSelectAll = toggleCivBoSelectAll;

// keep an active value filter panel content when the civ selection is cleared
function onSortKeyChangeKeepValueFilter() {
    boValueFilterState = { key: boValueFilterState.key, selected: new Set() };
    renderBoValueFilterPanel();
}

// checkbox change on the civ build order list (delegated)
document.addEventListener('change', (e) => {
    if (!e.target || !e.target.classList || !e.target.classList.contains('bo-civ-bo-item')) return;
    if (e.target.checked) civBoFilterState.add(e.target.dataset.name);
    else civBoFilterState.delete(e.target.dataset.name);
    const boxes = [...document.querySelectorAll('#bo-value-filter-list .bo-civ-bo-item')];
    civBoAllSelected = boxes.length > 0 && boxes.every(cb => cb.checked);
    const selectAll = document.getElementById('bo-value-select-all');
    if (selectAll) selectAll.checked = civBoAllSelected;
    filterBuildOrders();
});

// Custom-Type input toggle (edit form): 'Custom' angehakt -> Eingabefeld zeigen
document.addEventListener('change', (e) => {
    if (!e.target || !e.target.name || e.target.name !== 'edit-bo-type') return;
    if (e.target.value !== 'Custom') return;
    const input = e.target.closest('.checkbox-group').querySelector('.custom-type-input');
    if (input) input.style.display = e.target.checked ? 'block' : 'none';
});

// Select/deselect all build order checkboxes of the export list
function toggleBoSelectAll(checked) {
    document.querySelectorAll('#bo-export-list .bo-export-item').forEach(cb => { cb.checked = checked; });
}

function collectBoExportItems() {
    const includeInactive = document.getElementById('bo-export-include-inactive').checked;
    const items = [];
    document.querySelectorAll('#bo-export-list .bo-export-item:checked').forEach(cb => {
        const civId = cb.dataset.civ;
        const name = cb.dataset.name;
        const bo = buildOrderDatabase[civId] && buildOrderDatabase[civId][name];
        if (!bo) return;
        if (bo.active === false && !includeInactive) return;
        items.push({ civId, name, bo });
    });
    return items;
}

// Export selected build orders as a single JSON file
function exportSelectedBuildOrders() {
    const items = collectBoExportItems();
    if (items.length === 0) {
        alert('Please select at least one build order to export.');
        return;
    }

    const grouped = {};
    items.forEach(({ civId, name, bo }) => {
        if (!grouped[civId]) grouped[civId] = {};
        grouped[civId][name] = bo;
    });

    const payload = {
        type: BO_EXPORT_TYPE,
        version: 1,
        exported: new Date().toISOString(),
        items: Object.entries(grouped).map(([civId, buildOrders]) => ({ civId, buildOrders }))
    };

    downloadJson(payload, 'build-orders-export.json');
    document.getElementById('bo-export-dropdown').style.display = 'none';
}

// Export a single build order (per-card button)
window.exportSingleBuildOrder = function (civId, buildOrderName) {
    const bo = buildOrderDatabase[civId] && buildOrderDatabase[civId][buildOrderName];
    if (!bo) {
        alert('Build order not found.');
        return;
    }
    const payload = {
        type: BO_EXPORT_TYPE,
        version: 1,
        exported: new Date().toISOString(),
        items: [{ civId, buildOrders: { [buildOrderName]: bo } }]
    };
    // Tauri: native save dialog with directory choice; Browser: default downloads
    if (typeof window.saveFileWithDialog === 'function') {
        window.saveFileWithDialog(`${sanitizeForId(buildOrderName)}-build-order.json`, JSON.stringify(payload, null, 2));
    } else {
        downloadJson(payload, `${sanitizeForId(buildOrderName)}-build-order.json`);
    }
};

function downloadJson(payload, fileName) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ---------- Import ----------

let boImportQueue = [];

function handleBoImportFiles(event) {
    const files = Array.from(event.target.files || []);
    boImportQueue = [];
    const summary = document.getElementById('bo-import-summary');
    const runBtn = document.getElementById('bo-import-run');
    if (!files.length || !summary) return;

    let remaining = files.length;
    const parseFile = (file) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                boImportQueue = boImportQueue.concat(collectBoImportItems(data));
            } catch (err) {
                console.warn('Invalid JSON file:', file.name, err);
            }
            if (--remaining === 0) {
                showBoImportSummary(summary, runBtn);
            }
        };
        reader.readAsText(file);
    };
    files.forEach(parseFile);
    event.target.value = '';
}

// Accept our export wrapper, single-civ exports or a single build order
function collectBoImportItems(data) {
    if (data && data.type === BO_EXPORT_TYPE && Array.isArray(data.items)) {
        const items = [];
        data.items.forEach(entry => {
            Object.entries(entry.buildOrders || {}).forEach(([name, bo]) => {
                items.push({ civId: entry.civId, name, bo });
            });
        });
        return items;
    }
    if (data && data.civilization && data.buildOrders) {
        return Object.entries(data.buildOrders).map(([name, bo]) => ({ civId: data.civilization, name, bo }));
    }
    if (data && data.name && (data.steps || data.layout)) {
        const civId = data.civilization || 'unknown';
        return [{ civId, name: data.name, bo: data }];
    }
    return [];
}

function showBoImportSummary(summary, runBtn, extra) {
    const known = boImportQueue.filter(i => i.civId !== 'unknown').length;
    const unknown = boImportQueue.length - known;
    let text = `${boImportQueue.length} build order(s) ready for import.`;
    if (unknown > 0) text += ` ${unknown} with unknown civilization will be filed as "unknown".`;
    if (extra) text += ' ' + extra;
    summary.textContent = text;
    runBtn.style.display = boImportQueue.length ? '' : 'none';
}

async function runBoImport() {
    const mode = document.getElementById('bo-import-mode').value;
    const summary = document.getElementById('bo-import-summary');
    let imported = 0, skipped = 0, renamed = 0;

    for (const entry of boImportQueue) {
        if (!buildOrderDatabase[entry.civId]) buildOrderDatabase[entry.civId] = {};

        let targetName = entry.name;
        let existing = buildOrderDatabase[entry.civId][targetName];
        if (existing) {
            if (mode === 'skip') { skipped++; continue; }
            if (mode === 'rename') {
                let i = 2;
                while (buildOrderDatabase[entry.civId][`${entry.name} (imported ${i})`]) i++;
                targetName = `${entry.name} (imported ${i})`;
                renamed++;
            }
        }

        const bo = JSON.parse(JSON.stringify(entry.bo));
        bo.name = targetName;
        bo.location = 'local';
        bo.lastModified = new Date().toISOString();

        buildOrderDatabase[entry.civId][targetName] = bo;

        // persist into the build order data directory
        try {
            const fileName = `${targetName.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase()}.json`;
            await writeFileSystemFile(`build-order-data/${entry.civId}`, fileName, JSON.stringify(bo, null, 2));
        } catch (err) {
            console.warn('Could not write imported build order file:', err);
        }
        imported++;
    }
    boImportQueue = [];

    filterBuildOrders();
    if (typeof updateFooterStats === 'function') updateFooterStats();

    const runBtn = document.getElementById('bo-import-run');
    if (runBtn) runBtn.style.display = 'none';
    if (summary) {
        summary.textContent = `Imported: ${imported}` + (renamed ? ` (renamed: ${renamed})` : '') + (skipped ? ` | Skipped: ${skipped}` : '');
    }
    showNotification(`Import finished: ${imported} imported, ${skipped} skipped.`, 'success');
}

// Export build orders via the library cards (single button) - legacy entry point
function exportFilteredBuildOrders() {
    const filterCiv = document.getElementById('filter-civ-select').value;

    if (!filterCiv) {
        alert('Please select a civilization to export');
        return;
    }

    const civData = {
        civilization: filterCiv,
        buildOrders: buildOrderDatabase[filterCiv] || {}
    };

    const dataStr = JSON.stringify(civData, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filterCiv}-build-orders.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function generateStepsTableHTML(steps, civId, buildOrderName) {
    if (!steps || steps.length === 0) {
        return '<tr><td colspan="8" style="text-align: center; color: #666;">No steps available - Click "Add Standard Row" to begin</td></tr>';
    }

    return steps.map((step, index) => {
        const editTypeBtn = `<button class="row-btn row-btn-type" onclick="editStepRowType(this, ${index})" title="Edit Row Type">⇄</button>`;
        if (step.type === 'custom') {
            return `
                <tr class="custom-row" data-step-index="${index}" draggable="true">
                    <td class="row-number">${index + 1}</td>
                    <td>
                        <input type="text" class="time-input" value="${step.time || ''}"
                               onchange="updateStepData(this, ${index}, 'time')" placeholder="00:00">
                    </td>
                    <td colspan="5">
                        <input type="text" class="custom-text-input" value="${step.customText || ''}"
                               onchange="updateStepData(this, ${index}, 'customText')">
                    </td>
                    <td class="row-actions">
                        <button class="row-btn row-btn-insert" onclick="insertStepAfterLibraryEdit(this, ${index})" title="Insert row after">+</button>
                        ${editTypeBtn}
                        <button class="row-btn row-btn-remove" onclick="removeStepFromLibraryEdit(this, ${index})" title="Remove row">×</button>
                    </td>
                </tr>
            `;
        } else if (step.type === 'ageup') {
            return `
                <tr class="age-up-row" data-step-index="${index}" draggable="true">
                    <td class="row-number">${index + 1}</td>
                    <td>
                        <input type="text" class="time-input" value="${step.time || ''}"
                               onchange="updateStepData(this, ${index}, 'time')" placeholder="00:00">
                    </td>
                    <td colspan="4" class="age-up-cell">
                        <span class="age-roman">${step.ageRoman || 'II'}</span>
                        <span class="age-label">Age Up</span>
                    </td>
                    <td>
                        <input type="text" class="notes-input age-up-notes" value="${step.notes || ''}"
                               onchange="updateStepData(this, ${index}, 'notes')">
                    </td>
                    <td class="row-actions">
                        <button class="row-btn row-btn-insert" onclick="insertStepAfterLibraryEdit(this, ${index})" title="Insert row after">+</button>
                        ${editTypeBtn}
                        <button class="row-btn row-btn-remove" onclick="removeStepFromLibraryEdit(this, ${index})" title="Remove row">×</button>
                    </td>
                </tr>
            `;
        } else {
            // Standard row
            return `
                <tr class="standard-row" data-step-index="${index}" draggable="true">
                    <td class="row-number">${index + 1}</td>
                    <td>
                        <input type="text" class="time-input" value="${step.time || ''}"
                               onchange="updateStepData(this, ${index}, 'time')" placeholder="00:00">
                    </td>
                    <td>
                        <input type="number" class="resource-input" data-type="food" min="0" value="${step.food !== undefined ? step.food : ''}"
                               onchange="updateStepData(this, ${index}, 'food')" placeholder="">
                    </td>
                    <td>
                        <input type="number" class="resource-input" data-type="wood" min="0" value="${step.wood !== undefined ? step.wood : ''}"
                               onchange="updateStepData(this, ${index}, 'wood')" placeholder="">
                    </td>
                    <td>
                        <input type="number" class="resource-input" data-type="gold" min="0" value="${step.gold !== undefined ? step.gold : ''}"
                               onchange="updateStepData(this, ${index}, 'gold')" placeholder="">
                    </td>
                    <td>
                        <input type="number" class="resource-input" data-type="stone" min="0" value="${step.stone !== undefined ? step.stone : ''}"
                               onchange="updateStepData(this, ${index}, 'stone')" placeholder="">
                    </td>
                    <td>
                        <input type="text" class="notes-input" value="${step.notes || ''}"
                               onchange="updateStepData(this, ${index}, 'notes')">
                    </td>
                    <td class="row-actions">
                        <button class="row-btn row-btn-insert" onclick="insertStepAfterLibraryEdit(this, ${index})" title="Insert row after">+</button>
                        ${editTypeBtn}
                        <button class="row-btn row-btn-remove" onclick="removeStepFromLibraryEdit(this, ${index})" title="Remove row">×</button>
                    </td>
                </tr>
            `;
        }
    }).join('');
}

// ============================================================================
// Step row type editing & reordering (library edit form)
// The DOM table mirrors buildOrderDatabase[civId][name].steps; these helpers
// mutate the backing data and re-render the table for consistent indices.
// ============================================================================

function findLibraryBuildOrder(civId, buildOrderName) {
    return buildOrderDatabase && buildOrderDatabase[civId] ? buildOrderDatabase[civId][buildOrderName] : null;
}

// Opens the row-type modal in "change" mode for an existing step
window.editStepRowType = function (button, stepIndex) {
    const tbody = button.closest('tbody');
    if (!tbody) return;
    const civId = tbody.dataset.civId || '';
    const buildOrderName = tbody.dataset.buildOrderName || '';
    if (!findLibraryBuildOrder(civId, buildOrderName)) return;

    window.pendingStepTypeChange = { civId, buildOrderName, stepIndex };
    const title = document.getElementById('local-row-type-modal-title');
    const hint = document.getElementById('local-row-type-modal-hint');
    if (title) title.textContent = 'Edit Row Type';
    if (hint) hint.textContent = 'Choose the new type of this row (existing content is kept where possible):';
    const modal = document.getElementById('local-row-type-modal');
    if (modal) modal.style.display = 'flex';
};

// Converts a step to a new type, preserving content where sensible
window.convertStepTypeInLibraryEdit = function (civId, buildOrderName, stepIndex, newType) {
    const buildOrder = findLibraryBuildOrder(civId, buildOrderName);
    if (!buildOrder || !buildOrder.steps || !buildOrder.steps[stepIndex]) return;

    const step = buildOrder.steps[stepIndex];
    const oldNotes = step.notes || '';
    const oldCustomText = step.customText || '';
    const carryOver = oldNotes || oldCustomText;

    let converted;
    if (newType === 'standard') {
        converted = { step: stepIndex + 1, type: 'standard', food: 0, wood: 0, gold: 0, stone: 0, notes: carryOver };
    } else if (newType === 'custom') {
        converted = { step: stepIndex + 1, type: 'custom', customText: carryOver, food: 0, wood: 0, gold: 0, stone: 0, notes: '' };
    } else if (newType === 'ageup') {
        const priorAgeUps = buildOrder.steps.slice(0, stepIndex).filter(s => s.type === 'ageup').length;
        const romans = ['II', 'III', 'IV', 'V'];
        const ageRoman = romans[Math.min(priorAgeUps, 3)] || 'II';
        converted = { step: stepIndex + 1, type: 'ageup', ageRoman: ageRoman, customText: 'Age Up to ' + ageRoman, food: 0, wood: 0, gold: 0, stone: 0, notes: carryOver };
    } else {
        return;
    }
    converted.time = step.time || '';

    buildOrder.steps[stepIndex] = converted;
    rerenderLibraryStepsTable(civId, buildOrderName);
};

// Reorders the backing steps array according to the current DOM row order
window.reorderLibrarySteps = function (tbody) {
    if (!tbody) return;
    const civId = tbody.dataset.civId || '';
    const buildOrderName = tbody.dataset.buildOrderName || '';
    const buildOrder = findLibraryBuildOrder(civId, buildOrderName);
    if (!buildOrder || !buildOrder.steps) return;

    const order = Array.from(tbody.children)
        .map(r => parseInt(r.dataset.stepIndex))
        .filter(n => !isNaN(n));
    if (order.length !== buildOrder.steps.length) return;

    buildOrder.steps = order.map(i => buildOrder.steps[i]);
    buildOrder.steps.forEach((s, i) => { s.step = i + 1; });

    // Re-render so row numbers and data-step-index attributes match the new order
    rerenderLibraryStepsTable(civId, buildOrderName);
};

// Re-renders the step table of a library edit card from its backing data
function rerenderLibraryStepsTable(civId, buildOrderName) {
    const buildOrder = findLibraryBuildOrder(civId, buildOrderName);
    if (!buildOrder || !buildOrder.steps) return;
    const tbody = document.getElementById(`edit-steps-tbody-${civId}-${sanitizeForId(buildOrderName)}`);
    if (tbody) {
        tbody.innerHTML = generateStepsTableHTML(buildOrder.steps, civId, buildOrderName);
    }
}

// Update step data when user edits fields
function updateStepData(inputElement, stepIndex, fieldName) {
    const buildOrderCard = inputElement.closest('.build-order-card');
    const cardId = buildOrderCard.id;

    // Parse card ID more carefully - find the civ ID and build order name
    const cardIdParts = cardId.replace('build-order-', '');

    // Find the matching civilization by checking against all civ IDs
    let civId = null;
    let buildOrderName = null;

    for (const civ of civilizations) {
        if (cardIdParts.startsWith(civ.id + '-')) {
            civId = civ.id;
            buildOrderName = cardIdParts.substring(civ.id.length + 1).replace(/-/g, ' ');
            break;
        }
    }

    if (!civId || !buildOrderName) return;

    // Find the build order in database
    if (buildOrderDatabase[civId] && buildOrderDatabase[civId][buildOrderName]) {
        const buildOrder = buildOrderDatabase[civId][buildOrderName];
        if (buildOrder.steps && buildOrder.steps[stepIndex]) {
            if (fieldName === 'customText' || fieldName === 'notes' || fieldName === 'time') {
                buildOrder.steps[stepIndex][fieldName] = inputElement.value;
            } else if (['food', 'wood', 'gold', 'stone'].includes(fieldName)) {
                // Only set value if field is not empty, to distinguish between empty and 0
                if (inputElement.value.trim() !== '') {
                    buildOrder.steps[stepIndex][fieldName] = parseInt(inputElement.value);
                } else {
                    // Remove the property completely if empty
                    delete buildOrder.steps[stepIndex][fieldName];
                }
            } else {
                buildOrder.steps[stepIndex][fieldName] = inputElement.value;
            }
        }
    }
}

// Add new step to library edit
function addStepToLibraryEdit(civId, buildOrderName, stepType) {
    const buildOrder = buildOrderDatabase[civId]?.[buildOrderName];
    if (!buildOrder) return;

    // Initialize steps array if it doesn't exist
    if (!buildOrder.steps) {
        buildOrder.steps = [];
    }

    let newStep;
    const stepNumber = buildOrder.steps.length + 1;

    if (stepType === 'standard') {
        newStep = {
            step: stepNumber,
            type: 'standard',
            food: '',
            wood: '',
            gold: '',
            stone: '',
            notes: ''
        };
    } else if (stepType === 'custom') {
        newStep = {
            step: stepNumber,
            type: 'custom',
            customText: '',
            food: '',
            wood: '',
            gold: '',
            stone: '',
            notes: ''
        };
    } else if (stepType === 'ageup') {
        // Count existing age ups to determine roman numeral
        const ageUps = buildOrder.steps.filter(s => s.type === 'ageup').length;
        const romanNumerals = ['II', 'III', 'IV', 'V'];
        const nextAge = romanNumerals[ageUps] || 'V+';

        newStep = {
            step: stepNumber,
            type: 'ageup',
            ageRoman: nextAge,
            customText: `Age Up to ${nextAge}`,
            food: 0,
            wood: 0,
            gold: 0,
            stone: 0,
            notes: ''
        };
    }

    buildOrder.steps.push(newStep);

    // Refresh the steps table
    refreshStepsTable(civId, buildOrderName);
}

// Store current library editing context
let currentLibraryEditingRow = null;
let currentLibraryEditContext = null;

// Make library context globally available
window.currentLibraryEditContext = null;

// Insert step after in library edit
function insertStepAfterLibraryEdit(buttonElement, stepIndex) {
    const buildOrderCard = buttonElement.closest('.build-order-card');

    // First try to get values from data attributes (most reliable)
    let civId = buildOrderCard.getAttribute('data-civ-id');
    let buildOrderName = buildOrderCard.getAttribute('data-build-order-name');

    // Fallback to parsing the ID if data attributes are not available
    if (!civId || !buildOrderName) {
        const cardId = buildOrderCard.id;
        console.log('Fallback: parsing from ID:', cardId);

        // Parse card ID more carefully - find the civ ID and build order name
        const cardIdParts = cardId.replace('build-order-', '');

        // Find the matching civilization by checking against all civ IDs
        for (const civ of civilizations) {
            if (cardIdParts.startsWith(civ.id + '-')) {
                civId = civ.id;
                buildOrderName = cardIdParts.substring(civ.id.length + 1).replace(/-/g, ' ');
                break;
            }
        }
    }

    if (!civId || !buildOrderName) {
        console.error('Could not determine civ ID and build order name');
        return;
    }

    console.log('Using civId:', civId, 'buildOrderName:', buildOrderName);

    const buildOrder = buildOrderDatabase[civId]?.[buildOrderName];
    if (!buildOrder || !buildOrder.steps) return;

    // Store context for modal callback
    currentLibraryEditContext = {
        civId: civId,
        buildOrderName: buildOrderName,
        stepIndex: stepIndex,
        buildOrder: buildOrder
    };

    // Also set it globally for the modal
    window.currentLibraryEditContext = currentLibraryEditContext;

    // Show the existing modal
    const modal = document.getElementById('local-row-type-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Remove step from library edit
function removeStepFromLibraryEdit(buttonElement, stepIndex) {
    const buildOrderCard = buttonElement.closest('.build-order-card');

    // First try to get values from data attributes (most reliable)
    let civId = buildOrderCard.getAttribute('data-civ-id');
    let buildOrderName = buildOrderCard.getAttribute('data-build-order-name');

    // Fallback to parsing the ID if data attributes are not available
    if (!civId || !buildOrderName) {
        const cardId = buildOrderCard.id;
        console.log('Fallback: parsing from ID:', cardId);

        // Parse card ID more carefully - find the civ ID and build order name
        const cardIdParts = cardId.replace('build-order-', '');

        // Find the matching civilization by checking against all civ IDs
        for (const civ of civilizations) {
            if (cardIdParts.startsWith(civ.id + '-')) {
                civId = civ.id;
                buildOrderName = cardIdParts.substring(civ.id.length + 1).replace(/-/g, ' ');
                break;
            }
        }
    }

    if (!civId || !buildOrderName) {
        console.error('Could not determine civ ID and build order name');
        return;
    }

    const buildOrder = buildOrderDatabase[civId]?.[buildOrderName];
    if (!buildOrder || !buildOrder.steps) return;

    if (buildOrder.steps.length <= 1) {
        alert('Cannot remove the last step. At least one step must remain.');
        return;
    }

    if (confirm('Remove this step?')) {
        buildOrder.steps.splice(stepIndex, 1);

        // Renumber remaining steps
        buildOrder.steps.forEach((step, index) => {
            step.step = index + 1;
        });

        refreshStepsTable(civId, buildOrderName);
    }
}

// Refresh steps table after modifications
function refreshStepsTable(civId, buildOrderName) {
    const buildOrder = buildOrderDatabase[civId]?.[buildOrderName];
    if (!buildOrder || !buildOrder.steps) return;

    const tbodyId = `edit-steps-tbody-${civId}-${sanitizeForId(buildOrderName)}`;
    const tbody = document.getElementById(tbodyId);
    if (tbody) {
        tbody.innerHTML = generateStepsTableHTML(buildOrder.steps, civId, buildOrderName);
    }
}

// Make library functions globally available
window.insertStepAfterLibraryEdit = insertStepAfterLibraryEdit;
window.removeStepFromLibraryEdit = removeStepFromLibraryEdit;
window.refreshStepsTable = refreshStepsTable;
window.addStepToLibraryEdit = addStepToLibraryEdit;
window.generateStepsTableHTML = generateStepsTableHTML;

// Make buildOrderDatabase globally available (CRITICAL FIX!)
window.buildOrderDatabase = buildOrderDatabase;

// Update footer statistics
function updateFooterStats() {
    let totalBuildOrders = 0;

    Object.values(buildOrderDatabase).forEach(civBuildOrders => {
        totalBuildOrders += Object.keys(civBuildOrders).length;
    });

    const buildOrdersElement = document.getElementById('total-build-orders');
    if (buildOrdersElement) {
        buildOrdersElement.textContent = totalBuildOrders;
    }

    const civsElement = document.getElementById('total-civilizations');
    if (civsElement && typeof civilizations !== 'undefined') {
        civsElement.textContent = civilizations.length;
    }
}

// ============================================================================
// Step row drag & drop (library edit table + local "New Build Order" table)
// Whole rows are draggable; drags from inputs/buttons/links are cancelled.
// For the library edit table the backing steps array is reordered and the
// table re-rendered; the local table is renumbered in place.
// ============================================================================

let stepRowDragContext = null;

document.addEventListener('dragstart', (e) => {
    if (!e.target || typeof e.target.closest !== 'function') return;
    const tr = e.target.closest('tr[draggable="true"]');
    if (!tr) return;
    // Never start a row drag from inputs/buttons/links - keeps text selection intact
    if (e.target.closest('input, textarea, select, button, a, .row-actions')) {
        e.preventDefault();
        return;
    }
    const tbody = tr.closest('tbody');
    if (!tbody) return;

    stepRowDragContext = {
        tr,
        tbody,
        isLibrary: tbody.id.startsWith('edit-steps-tbody-')
    };
    tr.classList.add('row-dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', 'row'); } catch (err) { /* optional */ }
});

document.addEventListener('dragover', (e) => {
    if (!stepRowDragContext) return false;
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const overRow = e.target && typeof e.target.closest === 'function' ? e.target.closest('tr[draggable="true"]') : null;
    if (overRow && overRow.parentNode === stepRowDragContext.tbody && overRow !== stepRowDragContext.tr) {
        const rect = overRow.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height / 2;
        stepRowDragContext.tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drop-before', 'drop-after'));
        overRow.classList.add(before ? 'drop-before' : 'drop-after');
    }
    return false;
});

document.addEventListener('drop', (e) => {
    if (!stepRowDragContext) return;
    if (e.preventDefault) e.preventDefault();

    const ctx = stepRowDragContext;
    const overRow = e.target && typeof e.target.closest === 'function' ? e.target.closest('tr[draggable="true"]') : null;
    clearRowDragIndicators();

    if (overRow && overRow.parentNode === ctx.tbody && overRow !== ctx.tr) {
        const rect = overRow.getBoundingClientRect();
        const before = (e.clientY - rect.top) < rect.height / 2;
        ctx.tbody.removeChild(ctx.tr);
        if (before) {
            ctx.tbody.insertBefore(ctx.tr, overRow);
        } else if (overRow.nextSibling) {
            ctx.tbody.insertBefore(ctx.tr, overRow.nextSibling);
        } else {
            ctx.tbody.appendChild(ctx.tr);
        }

        if (ctx.isLibrary) {
            // Reorder backing data, then re-render for consistent indices
            if (typeof window.reorderLibrarySteps === 'function') {
                window.reorderLibrarySteps(ctx.tbody);
            }
        } else if (ctx.tbody.id === 'local-build-order-tbody' && typeof window.updateLocalRowNumbers === 'function') {
            // "New Build Order" tab (strategy section)
            window.updateLocalRowNumbers();
        }
    }

    stepRowDragContext = null;
    return false;
});

document.addEventListener('dragend', () => {
    clearRowDragIndicators();
    if (stepRowDragContext && stepRowDragContext.tr) {
        stepRowDragContext.tr.classList.remove('row-dragging');
    }
    stepRowDragContext = null;
});

function clearRowDragIndicators() {
    document.querySelectorAll('.drop-before, .drop-after').forEach(el => {
        el.classList.remove('drop-before', 'drop-after');
    });
}

// Make footer update function globally available
window.updateFooterStats = updateFooterStats;
window.toggleBoFilterDropdown = toggleBoFilterDropdown;
window.renderBoExportList = renderBoExportList;
window.exportSelectedBuildOrders = exportSelectedBuildOrders;
window.handleBoImportFiles = handleBoImportFiles;
window.runBoImport = runBoImport;
window.onSortKeyChange = onSortKeyChange;
window.toggleBoValueFilterAll = toggleBoValueFilterAll;
window.renderCivBoFilterPanel = renderCivBoFilterPanel;




