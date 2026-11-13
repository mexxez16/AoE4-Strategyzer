// Unified Strategy Management - New Build Order Integration
let currentBuildOrderType = 'create-local';
let currentLocalEditingRow = null;
let localBuildOrderSteps = [];

// Initialize unified strategy functionality
function initializeStrategyUnified() {
    console.log('Initializing Unified Strategy Management...');

    // Populate civilization dropdowns for all forms
    populateAllCivDropdowns();

    // Populate opponent checkboxes
    populateOpponentCheckboxes();

    // Initialize default form (create-local)
    selectBuildOrderType('create-local');

    // Initialize build order table with default rows
    initializeLocalBuildOrderTable();

    // Check file access status
    checkFileAccessStatus('strategy');
}

// Select build order type and show appropriate form
function selectBuildOrderType(type) {
    console.log('Selecting build order type:', type);

    currentBuildOrderType = type;

    // Update button states
    document.querySelectorAll('.type-selection-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`btn-${type}`).classList.add('active');

    // Hide all forms
    document.querySelectorAll('.build-order-form-container').forEach(form => {
        form.style.display = 'none';
    });

    // Show selected form
    const formId = `${type}-form`;
    const selectedForm = document.getElementById(formId);
    if (selectedForm) {
        selectedForm.style.display = 'block';
    }

    console.log(`Switched to ${type} form`);
}

// Populate all civilization dropdowns
function populateAllCivDropdowns() {
    const dropdownIds = [
        { select: 'local-civ-select', options: 'local-civ-select-options' },
        { select: 'external-civ-select', options: 'external-civ-select-options' },
        { select: 'legacy-civ-select', options: 'legacy-civ-select-options' }
    ];

    dropdownIds.forEach(dropdown => {
        const optionsContainer = document.getElementById(dropdown.options);
        if (optionsContainer) {
            optionsContainer.innerHTML = '';

            civilizations.forEach(civ => {
                const flagPath = getCivFlag(civ.id);
                const flagHtml = flagPath ? `<img src="${flagPath}" class="dropdown-flag" alt="${civ.name}">` : '';

                const option = document.createElement('div');
                option.className = 'dropdown-option';
                option.innerHTML = `${flagHtml}${civ.name}`;
                option.onclick = () => selectCivForDropdown(dropdown.select, civ.id, civ.name);
                optionsContainer.appendChild(option);
            });
        }
    });
}

// Handle civilization selection for custom dropdowns
function selectCivForDropdown(selectId, civId, civName) {
    const selectElement = document.getElementById(selectId);
    const textElement = document.getElementById(`${selectId}-text`);

    if (selectElement && textElement) {
        selectElement.value = civId;
        textElement.textContent = civName;
        closeCustomDropdown(selectId);

        // Update visual selection state
        if (typeof updateDropdownSelectionVisual === 'function') {
            updateDropdownSelectionVisual(selectId, civId);
        }
    }
}

// Populate opponent civilization checkboxes
function populateOpponentCheckboxes() {
    const containers = [
        { id: 'local-opponent-checkboxes', name: 'local-opponent' },
        { id: 'external-opponent-checkboxes', name: 'external-opponent' }
    ];

    containers.forEach(containerInfo => {
        const container = document.getElementById(containerInfo.id);
        if (!container) return;

        container.innerHTML = '';

        civilizations.forEach(civ => {
            const label = document.createElement('label');
            label.className = 'checkbox-label';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = containerInfo.name;
            checkbox.value = civ.id;

            const flagPath = getCivFlag(civ.id);
            const flagHtml = flagPath ? `<img src="${flagPath}" class="civ-flag-checkbox" alt="${civ.name}">` : '';

            label.appendChild(checkbox);
            label.insertAdjacentHTML('beforeend', ` ${flagHtml}${civ.name}`);
            container.appendChild(label);
        });
    });
}

// Initialize local build order table with default rows
function initializeLocalBuildOrderTable() {
    const tbody = document.getElementById('local-build-order-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    localBuildOrderSteps = [];

    // Add initial rows
    for (let i = 0; i < 10; i++) {
        addStandardRowLocal();
    }
}

// Add standard row to local build order
function addStandardRowLocal() {
    const tbody = document.getElementById('local-build-order-tbody');
    if (!tbody) return;

    const rowIndex = tbody.children.length;
    const row = document.createElement('tr');
    row.className = 'standard-row';
    row.draggable = true;
    row.innerHTML = `
        <td class="row-number">${rowIndex + 1}</td>
        <td><input type="text" class="time-input" placeholder="2:30" maxlength="10"></td>
        <td><input type="number" class="resource-input" data-type="food" min="0" value=""></td>
        <td><input type="number" class="resource-input" data-type="wood" min="0" value=""></td>
        <td><input type="number" class="resource-input" data-type="gold" min="0" value=""></td>
        <td><input type="number" class="resource-input" data-type="stone" min="0" value=""></td>
        <td><input type="text" class="notes-input" placeholder="Enter notes..."></td>
        <td class="row-actions">
            <button class="row-btn row-btn-insert" onclick="insertRowAfterLocal(this)" title="Insert row after">+</button>
            <button class="row-btn row-btn-type" onclick="editRowTypeLocal(this)" title="Edit Row Type">&#8646;</button>
            <button class="row-btn row-btn-remove" onclick="removeRowLocal(this)" title="Remove row">×</button>
        </td>
    `;

    tbody.appendChild(row);
    updateLocalRowNumbers();
}

// Add custom row to local build order
function addCustomRowLocal() {
    const tbody = document.getElementById('local-build-order-tbody');
    if (!tbody) return;

    const rowIndex = tbody.children.length;
    const row = document.createElement('tr');
    row.className = 'custom-row';
    row.draggable = true;
    row.innerHTML = `
        <td class="row-number">${rowIndex + 1}</td>
        <td><input type="text" class="time-input" placeholder="2:30" maxlength="10"></td>
        <td colspan="5" class="custom-text-cell">
            <input type="text" class="custom-text-input" placeholder="Enter custom instruction...">
        </td>
        <td class="row-actions">
            <button class="row-btn row-btn-insert" onclick="insertRowAfterLocal(this)" title="Insert row after">+</button>
            <button class="row-btn row-btn-type" onclick="editRowTypeLocal(this)" title="Edit Row Type">&#8646;</button>
            <button class="row-btn row-btn-remove" onclick="removeRowLocal(this)" title="Remove row">×</button>
        </td>
    `;

    tbody.appendChild(row);
    updateLocalRowNumbers();
}

// Add age up row to local build order
function addAgeUpRowLocal() {
    const tbody = document.getElementById('local-build-order-tbody');
    if (!tbody) return;

    // Count existing age up rows to determine next roman numeral
    const existingAgeUps = Array.from(tbody.querySelectorAll('.age-up-row')).length;
    const romanNumerals = ['II', 'III', 'IV', 'V']; // Starting from Age II (Feudal)
    const nextAge = romanNumerals[existingAgeUps] || 'V+';

    const rowIndex = tbody.children.length;
    const row = document.createElement('tr');
    row.className = 'age-up-row';
    row.draggable = true;
    row.innerHTML = `
        <td class="row-number">${rowIndex + 1}</td>
        <td><input type="text" class="time-input" placeholder="4:00" maxlength="10"></td>
        <td colspan="4" class="age-up-cell">
            <span class="age-roman">${nextAge}</span>
            <span class="age-label">Age Up</span>
        </td>
        <td class="notes-cell"><input type="text" class="notes-input age-up-notes" placeholder="Age up notes (e.g., School of Cavalry, build landmarks...)"></td>
        <td class="row-actions">
            <button class="row-btn row-btn-insert" onclick="insertRowAfterLocal(this)" title="Insert row after">+</button>
            <button class="row-btn row-btn-type" onclick="editRowTypeLocal(this)" title="Edit Row Type">&#8646;</button>
            <button class="row-btn row-btn-remove" onclick="removeRowLocal(this)" title="Remove row">×</button>
        </td>
    `;

    tbody.appendChild(row);
    updateLocalRowNumbers();
}

// Add multiple rows
function addMultipleRowsLocal() {
    for (let i = 0; i < 5; i++) {
        addStandardRowLocal();
    }
}

// Insert row after current row (local)
function insertRowAfterLocal(button) {
    const currentRow = button.closest('tr');
    if (!currentRow) return;

    // Store reference to current row for insertion
    currentLocalEditingRow = currentRow;

    // Show row type selection modal
    const modal = document.getElementById('local-row-type-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Close local row type modal
function closeLocalRowTypeModal() {
    const modal = document.getElementById('local-row-type-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentLocalEditingRow = null;
    // Also clear library context if it exists
    if (window.currentLibraryEditContext) {
        window.currentLibraryEditContext = null;
    }
    // Clear any pending "Edit Row Type" request and restore labels
    if (window.pendingStepTypeChange) {
        window.pendingStepTypeChange = null;
        restoreLocalRowTypeModalLabels();
    }
    if (window.pendingStepTypeChangeLocal) {
        window.pendingStepTypeChangeLocal = null;
    }
    restoreLocalRowTypeModalLabels();
}

// Restores the "Insert New Row" labels of the local row type modal
function restoreLocalRowTypeModalLabels() {
    const title = document.getElementById('local-row-type-modal-title');
    const hint = document.getElementById('local-row-type-modal-hint');
    if (title) title.textContent = 'Insert New Row';
    if (hint) hint.textContent = 'Choose the type of row to insert:';
}

// Insert specific row type (local)
function insertLocalRowType(rowType) {
    // "Edit Row Type" mode for the New Build Order tab: convert instead of insert
    if (window.pendingStepTypeChangeLocal) {
        const changeCtx = window.pendingStepTypeChangeLocal;
        window.pendingStepTypeChangeLocal = null;
        if (typeof window.convertRowToTypeLocal === 'function') {
            window.convertRowToTypeLocal(changeCtx.currentRow, rowType);
        }
        const changeModal = document.getElementById('local-row-type-modal');
        if (changeModal) changeModal.style.display = 'none';
        if (typeof restoreLocalRowTypeModalLabels === 'function') restoreLocalRowTypeModalLabels();
        return;
    }

    // "Edit Row Type" mode for library edit: convert instead of insert
    if (window.pendingStepTypeChange) {
        const changeCtx = window.pendingStepTypeChange;
        window.pendingStepTypeChange = null;
        restoreLocalRowTypeModalLabels();
        if (typeof window.convertStepTypeInLibraryEdit === 'function') {
            window.convertStepTypeInLibraryEdit(changeCtx.civId, changeCtx.buildOrderName, changeCtx.stepIndex, rowType);
        }
        const changeModal = document.getElementById('local-row-type-modal');
        if (changeModal) changeModal.style.display = 'none';
        if (window.currentLibraryEditContext) window.currentLibraryEditContext = null;
        return;
    }

    // Insert mode for library edit: restore standard labels
    if (window.currentLibraryEditContext) {
        restoreLocalRowTypeModalLabels();
    }
    // Check if this is for library edit
    if (window.currentLibraryEditContext) {
        const context = window.currentLibraryEditContext;
        const { civId, buildOrderName, stepIndex, buildOrder } = context;

        // Create new step based on type
        let newStep;

        if (rowType === 'standard') {
            newStep = {
                step: stepIndex + 2,
                type: 'standard',
                food: 0,
                wood: 0,
                gold: 0,
                stone: 0,
                notes: ''
            };
        } else if (rowType === 'custom') {
            newStep = {
                step: stepIndex + 2,
                type: 'custom',
                customText: '',
                food: 0,
                wood: 0,
                gold: 0,
                stone: 0,
                notes: ''
            };
        } else if (rowType === 'ageup') {
            const currentAges = buildOrder.steps
                .filter(s => s.type === 'ageup')
                .map(s => s.ageRoman || 'II');

            let nextAge = 'II';
            if (currentAges.includes('III')) nextAge = 'IV';
            else if (currentAges.includes('II')) nextAge = 'III';

            newStep = {
                step: stepIndex + 2,
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

        // Insert the new step
        buildOrder.steps.splice(stepIndex + 1, 0, newStep);

        // Renumber all steps
        buildOrder.steps.forEach((step, idx) => {
            step.step = idx + 1;
        });

        // Refresh and cleanup
        window.refreshStepsTable(civId, buildOrderName);

        closeLocalRowTypeModal();
        showNotification(`${getRowTypeDisplayNameLocal(rowType)} row inserted successfully!`, 'success');
        return;
    }

    // Original logic for New Build Order tab
    if (!currentLocalEditingRow) return;

    const tbody = currentLocalEditingRow.parentNode;
    let newRow;

    if (rowType === 'standard') {
        newRow = createStandardRowLocal();
    } else if (rowType === 'ageup') {
        newRow = createAgeUpRowLocal(tbody);
    } else if (rowType === 'custom') {
        newRow = createCustomRowLocal();
    }

    if (newRow) {
        tbody.insertBefore(newRow, currentLocalEditingRow.nextSibling);
        updateLocalRowNumbers();
    }

    closeLocalRowTypeModal();
    showNotification(`${getRowTypeDisplayNameLocal(rowType)} row inserted successfully!`, 'success');
}

// Create standard row element
function createStandardRowLocal() {
    const newRow = document.createElement('tr');
    newRow.className = 'standard-row';
    newRow.draggable = true;
    newRow.innerHTML = `
        <td class="row-number"></td>
        <td><input type="text" class="time-input" placeholder="2:30" maxlength="10"></td>
        <td><input type="number" class="resource-input" data-type="food" min="0" value=""></td>
        <td><input type="number" class="resource-input" data-type="wood" min="0" value=""></td>
        <td><input type="number" class="resource-input" data-type="gold" min="0" value=""></td>
        <td><input type="number" class="resource-input" data-type="stone" min="0" value=""></td>
        <td><input type="text" class="notes-input" placeholder="Enter notes..."></td>
        <td class="row-actions">
            <button class="row-btn row-btn-insert" onclick="insertRowAfterLocal(this)" title="Insert row after">+</button>
            <button class="row-btn row-btn-type" onclick="editRowTypeLocal(this)" title="Edit Row Type">&#8646;</button>
            <button class="row-btn row-btn-remove" onclick="removeRowLocal(this)" title="Remove row">×</button>
        </td>
    `;
    return newRow;
}

// Create age up row element
function createAgeUpRowLocal(tbody) {
    // Count existing age up rows to determine next roman numeral
    const existingAgeUps = Array.from(tbody.querySelectorAll('.age-up-row')).length;
    const romanNumerals = ['II', 'III', 'IV', 'V'];
    const nextAge = romanNumerals[existingAgeUps] || 'V+';

    const newRow = document.createElement('tr');
    newRow.className = 'age-up-row';
    newRow.draggable = true;
    newRow.innerHTML = `
        <td class="row-number"></td>
        <td><input type="text" class="time-input" placeholder="4:00" maxlength="10"></td>
        <td colspan="4" class="age-up-cell">
            <span class="age-roman">${nextAge}</span>
            <span class="age-label">Age Up</span>
        </td>
        <td class="notes-cell"><input type="text" class="notes-input age-up-notes" placeholder="Enter age up notes..."></td>
        <td class="row-actions">
            <button class="row-btn row-btn-insert" onclick="insertRowAfterLocal(this)" title="Insert row after">+</button>
            <button class="row-btn row-btn-type" onclick="editRowTypeLocal(this)" title="Edit Row Type">&#8646;</button>
            <button class="row-btn row-btn-remove" onclick="removeRowLocal(this)" title="Remove row">×</button>
        </td>
    `;
    return newRow;
}

// Create custom row element
function createCustomRowLocal() {
    const newRow = document.createElement('tr');
    newRow.className = 'custom-row';
    newRow.draggable = true;
    newRow.innerHTML = `
        <td class="row-number"></td>
        <td><input type="text" class="time-input" placeholder="2:30" maxlength="10"></td>
        <td colspan="5" class="custom-text-cell">
            <input type="text" class="custom-text-input" placeholder="Enter custom instruction...">
        </td>
        <td class="row-actions">
            <button class="row-btn row-btn-insert" onclick="insertRowAfterLocal(this)" title="Insert row after">+</button>
            <button class="row-btn row-btn-type" onclick="editRowTypeLocal(this)" title="Edit Row Type">&#8646;</button>
            <button class="row-btn row-btn-remove" onclick="removeRowLocal(this)" title="Remove row">×</button>
        </td>
    `;
    return newRow;
}

// Show the local modal in "Edit Row Type" mode for an existing row
function editRowTypeLocal(button) {
    const currentRow = button.closest('tr');
    if (!currentRow) return;

    currentLocalEditingRow = currentRow;
    window.pendingStepTypeChangeLocal = { currentRow: currentRow };

    const title = document.getElementById('local-row-type-modal-title');
    const hint = document.getElementById('local-row-type-modal-hint');
    if (title) title.textContent = 'Edit Row Type';
    if (hint) hint.textContent = 'Choose the new type of this row (existing content is kept where possible):';
    const modal = document.getElementById('local-row-type-modal');
    if (modal) modal.style.display = 'flex';
}

// Convert a DOM row in place to a new type, preserving content where possible
function convertRowToTypeLocal(row, newType) {
    const tbody = row.parentNode;
    if (!tbody || !row.classList) return;

    const rowIndex = Array.from(tbody.children).indexOf(row);
    const oldNotes = (row.querySelector('.notes-input') || {}).value || '';
    const oldAgeNotes = (row.querySelector('.age-up-notes') || {}).value || '';
    const oldCustomText = (row.querySelector('.custom-text-input') || {}).value || '';
    const carryOver = oldNotes || oldAgeNotes || oldCustomText;
    const wasAgeUp = row.classList.contains('age-up-row');
    const nextAge = wasAgeUp
        ? (((row.querySelector('.age-roman') || {}).textContent || 'II').trim())
        : nextAgeRomanAtIndex(tbody, rowIndex);

    let newRow;
    if (newType === 'standard') {
        newRow = createStandardRowLocal();
        newRow.querySelector('.notes-input').value = carryOver;
    } else if (newType === 'custom') {
        newRow = createCustomRowLocal();
        newRow.querySelector('.custom-text-input').value = carryOver;
    } else if (newType === 'ageup') {
        newRow = createAgeUpRowLocal(tbody);
        const romanEl = newRow.querySelector('.age-roman');
        if (romanEl) romanEl.textContent = nextAge;
        const notesEl = newRow.querySelector('.age-up-notes');
        if (notesEl) notesEl.value = carryOver;
    } else {
        return;
    }

    tbody.replaceChild(newRow, row);
    updateLocalRowNumbers();
}

// Roman numeral for a potential age-up row inserted at rowIndex
function nextAgeRomanAtIndex(tbody, rowIndex) {
    const previousAgeUps = Array.from(tbody.children)
        .slice(0, rowIndex)
        .filter(r => r.classList.contains('age-up-row')).length;
    const romanNumerals = ['II', 'III', 'IV', 'V'];
    return romanNumerals[Math.min(previousAgeUps, 3)] || 'II';
}

// Remove row (local)
function removeRowLocal(button) {
    const row = button.closest('tr');
    const tbody = row.parentNode;

    // Don't allow removing if it's the last row
    if (tbody.children.length <= 1) {
        alert('Cannot remove the last row. At least one row must remain.');
        return;
    }

    if (confirm('Remove this row?')) {
        row.remove();
        updateLocalRowNumbers();
    }
}

// Update row numbers (local)
function updateLocalRowNumbers() {
    const tbody = document.getElementById('local-build-order-tbody');
    if (!tbody) return;

    Array.from(tbody.children).forEach((row, index) => {
        const numberCell = row.querySelector('.row-number');
        if (numberCell) {
            numberCell.textContent = index + 1;
        }
    });
}

// Get display name for row type
function getRowTypeDisplayNameLocal(rowType) {
    switch(rowType) {
        case 'standard': return 'Standard';
        case 'custom': return 'Custom';
        case 'ageup': return 'Age Up';
        default: return 'Unknown';
    }
}


// Collect the selected build order types of the local form
function collectLocalTypes() {
    const types = [];
    document.querySelectorAll('input[name="local-bo-type"]:checked').forEach(cb => {
        if (cb.value === 'Custom') return;
        types.push(cb.value);
    });
    const customInput = document.getElementById('local-custom-type-input');
    if (customInput && customInput.value.trim()) types.push(customInput.value.trim());
    return types;
}

// Show the free-text input when the "Custom" type checkbox is checked
window.toggleCustomTypeInput = function (checkbox) {
    const input = document.getElementById('local-custom-type-input');
    if (input) input.style.display = checkbox.checked ? '' : 'none';
}

// Save local build order
async function saveLocalBuildOrder() {
    console.log('Saving local build order...');

    // Check file access
    const hasAccess = await checkAndRequestFileAccess('save the build order');
    if (!hasAccess) {
        return;
    }

    const civId = document.getElementById('local-civ-select').value;
    const buildOrderName = document.getElementById('local-build-name').value.trim();
    const description = document.getElementById('local-build-description').value.trim();

    if (!civId) {
        showNotification('Please select a civilization', 'error');
        return;
    }

    if (!buildOrderName) {
        showNotification('Please enter a build order name', 'error');
        return;
    }

    // Collect map types
    const mapTypes = [];
    document.querySelectorAll('input[name="local-map-type"]:checked').forEach(checkbox => {
        mapTypes.push(checkbox.value);
    });

    // Collect types (checkbox selection; Custom adds an own free category)
    const types = collectLocalTypes();

    // Collect opponents
    const opponents = [];
    document.querySelectorAll('input[name="local-opponent"]:checked').forEach(checkbox => {
        opponents.push(checkbox.value);
    });

    // Collect build order steps
    const steps = [];
    const tbody = document.getElementById('local-build-order-tbody');
    const rows = Array.from(tbody.getElementsByTagName('tr'));

    rows.forEach((row, index) => {
        if (row.classList.contains('custom-row')) {
            // Handle custom text row
            const timeInput = row.querySelector('.time-input');
            const customTextInput = row.querySelector('.custom-text-input');
            const customTextValue = customTextInput?.value.trim();

            if (customTextValue) {
                const stepData = {
                    step: index + 1,
                    type: 'custom',
                    customText: customTextValue
                };

                const timeValue = timeInput?.value.trim();
                if (timeValue) stepData.time = timeValue;

                steps.push(stepData);
            }
        } else if (row.classList.contains('age-up-row')) {
            // Handle age up row
            const timeInput = row.querySelector('.time-input');
            const ageRomanElement = row.querySelector('.age-roman');
            const ageNotesInput = row.querySelector('.age-up-notes');
            const ageRoman = ageRomanElement?.textContent.trim() || 'II';

            const stepData = {
                step: index + 1,
                type: 'ageup',
                ageRoman: ageRoman,
                customText: `Age Up to ${ageRoman}`
            };

            const timeValue = timeInput?.value.trim();
            if (timeValue) stepData.time = timeValue;

            const ageNotesValue = ageNotesInput?.value.trim();
            if (ageNotesValue) stepData.notes = ageNotesValue;

            steps.push(stepData);
        } else {
            // Handle standard resource row
            const timeInput = row.querySelector('.time-input');
            const foodInput = row.querySelector('[data-type="food"]');
            const woodInput = row.querySelector('[data-type="wood"]');
            const goldInput = row.querySelector('[data-type="gold"]');
            const stoneInput = row.querySelector('[data-type="stone"]');
            const notesInput = row.querySelector('.notes-input');

            const stepData = {
                step: index + 1,
                type: 'standard'
            };

            const timeValue = timeInput?.value.trim();
            if (timeValue) stepData.time = timeValue;

            const foodValue = foodInput?.value.trim();
            if (foodValue) stepData.food = parseInt(foodValue);

            const woodValue = woodInput?.value.trim();
            if (woodValue) stepData.wood = parseInt(woodValue);

            const goldValue = goldInput?.value.trim();
            if (goldValue) stepData.gold = parseInt(goldValue);

            const stoneValue = stoneInput?.value.trim();
            if (stoneValue) stepData.stone = parseInt(stoneValue);

            const notesValue = notesInput?.value.trim();
            if (notesValue) stepData.notes = notesValue;

            // Only save rows that have data beyond step and type
            if (Object.keys(stepData).length > 2) {
                steps.push(stepData);
            }
        }
    });

    if (steps.length === 0) {
        showNotification('Please add at least one step to the build order', 'error');
        return;
    }

    // Create build order data in new format
    const buildOrderData = {
        name: buildOrderName,
        location: 'local',
        url: `local://build-order-data/${civId}/${buildOrderName.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase()}.json`,
        civilization: civId,
        description: description,
        lastModified: new Date().toISOString(),
        notes: '',
        advancedNotes: {},
        mapTypes: mapTypes,
        types: types,
        opponents: opponents,
        steps: steps
    };

    try {
        await saveLocalBuildOrderToFile(civId, buildOrderName, buildOrderData);
        showNotification('Build order saved successfully!', 'success');

        // Reload build orders to update the library
        if (typeof loadAllCivBuildOrders === 'function') {
            await loadAllCivBuildOrders();
        }

        // Refresh the build order library display
        if (typeof filterBuildOrders === 'function') {
            filterBuildOrders();
        }

        // Update footer statistics
        if (typeof updateFooterStats === 'function') {
            updateFooterStats();
        }

        // Optionally clear form
        // clearLocalBuildOrder();
    } catch (error) {
        console.error('Error saving build order:', error);
        showNotification('Error saving build order: ' + error.message, 'error');
    }
}

// Save local build order to build-order-data directory
// TAURI FIX: Use writeFileSystemFile instead of mock directory handles
async function saveLocalBuildOrderToFile(civId, buildOrderName, buildOrderData) {
    if (!window.fileSystemReady) {
        throw new Error('File system access not available');
    }

    try {
        // Create filename (sanitize it)
        const fileName = `${buildOrderName.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase()}.json`;
        const jsonContent = JSON.stringify(buildOrderData, null, 2);

        // TAURI: Use writeFileSystemFile which handles localStorage persistence
        // Path format: build-order-data/civId/filename.json
        const directory = `build-order-data/${civId}`;
        await writeFileSystemFile(directory, fileName, jsonContent);

        console.log(`Saved build order: ${directory}/${fileName}`);

        // Also update the in-memory database immediately
        if (!window.buildOrderDatabase) {
            window.buildOrderDatabase = {};
        }
        if (!window.buildOrderDatabase[civId]) {
            window.buildOrderDatabase[civId] = {};
        }

        // Add to database with the structure expected by filterBuildOrders
        window.buildOrderDatabase[civId][buildOrderName] = {
            url: buildOrderData.url,
            mapTypes: buildOrderData.mapTypes || [],
            opponents: buildOrderData.opponents || [],
            notes: buildOrderData.notes || '',
            advancedNotes: buildOrderData.advancedNotes || {},
            active: buildOrderData.active !== false,
            location: buildOrderData.location,
            description: buildOrderData.description || '',
            lastModified: buildOrderData.lastModified,
            steps: buildOrderData.steps || [],
            fileName: fileName
        };

    } catch (error) {
        console.error('Error saving build order file:', error);
        throw error;
    }
}

// Clear local build order form
function clearLocalBuildOrder() {
    // Clear form fields
    document.getElementById('local-civ-select').value = '';
    document.getElementById('local-civ-select-text').textContent = 'Select civilization...';
    document.getElementById('local-build-name').value = '';
    document.getElementById('local-build-description').value = '';

    // Clear checkboxes
    document.querySelectorAll('input[name="local-map-type"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="local-opponent"]').forEach(cb => cb.checked = false);

    // Reset table
    initializeLocalBuildOrderTable();
}

// Add external build order (legacy functionality)
// Custom-Type input toggle (external form)
function toggleExternalCustomTypeInput(checkbox) {
    const input = document.getElementById('external-custom-type-input');
    if (input) input.style.display = checkbox.checked ? 'block' : 'none';
}

function addExternalBuildOrder() {
    const civId = document.getElementById('external-civ-select').value;
    const title = document.getElementById('external-build-title').value.trim();
    const url = document.getElementById('external-build-url').value.trim();
    const notes = document.getElementById('external-build-notes').value.trim();

    if (!civId) {
        showNotification('Please select a civilization', 'error');
        return;
    }

    if (!title) {
        showNotification('Please enter a build order title', 'error');
        return;
    }

    if (!url) {
        showNotification('Please enter a build order URL', 'error');
        return;
    }

    // Collect map types
    const mapTypes = [];
    document.querySelectorAll('input[name="external-map-type"]:checked').forEach(checkbox => {
        mapTypes.push(checkbox.value);
    });

    if (mapTypes.length === 0) {
        showNotification('Please select at least one map type', 'error');
        return;
    }

    // Collect types (Custom = freie Kategorie aus dem Eingabefeld)
    const types = [];
    document.querySelectorAll('input[name="external-bo-type"]:checked').forEach(checkbox => {
        types.push(checkbox.value);
    });
    const externalCustomTypeInput = document.getElementById('external-custom-type-input');
    if (externalCustomTypeInput && externalCustomTypeInput.style.display !== 'none') {
        const customValue = externalCustomTypeInput.value.trim();
        if (customValue) {
            const i = types.indexOf('Custom');
            if (i !== -1) types[i] = customValue; else types.push(customValue);
        }
    }

    if (types.length === 0) {
        showNotification('Please select at least one type', 'error');
        return;
    }

    // Collect opponents
    const opponents = [];
    document.querySelectorAll('input[name="external-opponent"]:checked').forEach(checkbox => {
        opponents.push(checkbox.value);
    });

    if (opponents.length === 0) {
        showNotification('Please select at least one opponent civilization', 'error');
        return;
    }

    // Create external build order data
    const buildOrderData = {
        name: title,
        location: "external",
        url: url,
        civilization: civId,
        description: "",
        lastModified: new Date().toISOString(),
        notes: notes,
        advancedNotes: {},
        mapTypes: mapTypes,
        opponents: opponents,
        types: types,
        active: true
    };

    // Save external build order
    saveExternalBuildOrder(civId, title, buildOrderData);
}

// Save external build order to build-order-data directory
async function saveExternalBuildOrder(civId, buildOrderName, buildOrderData) {
    // Check file access
    const hasAccess = await checkAndRequestFileAccess('save the external build order');
    if (!hasAccess) {
        return;
    }

    try {
        await saveLocalBuildOrderToFile(civId, buildOrderName, buildOrderData);
        showNotification('External build order saved successfully!', 'success');

        // Reload build orders to update the library
        if (typeof loadAllCivBuildOrders === 'function') {
            await loadAllCivBuildOrders();
        }

        // Refresh the build order library display
        if (typeof filterBuildOrders === 'function') {
            filterBuildOrders();
        }

        // Update footer statistics
        if (typeof updateFooterStats === 'function') {
            updateFooterStats();
        }

        // Clear form after successful save
        clearExternalBuildOrder();
    } catch (error) {
        console.error('Error saving external build order:', error);
        showNotification('Error saving external build order: ' + error.message, 'error');
    }
}

// Clear external build order form
function clearExternalBuildOrder() {
    // Clear form fields
    document.getElementById('external-civ-select').value = '';
    document.getElementById('external-civ-select-text').textContent = 'Select civilization...';
    document.getElementById('external-build-title').value = '';
    document.getElementById('external-build-url').value = '';
    document.getElementById('external-build-notes').value = '';

    // Clear checkboxes
    document.querySelectorAll('input[name="external-map-type"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="external-opponent"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="external-bo-type"]').forEach(cb => cb.checked = false);
    const externalCustomTypeInput = document.getElementById('external-custom-type-input');
    if (externalCustomTypeInput) { externalCustomTypeInput.value = ''; externalCustomTypeInput.style.display = 'none'; }
}

// Legacy functionality placeholders
function loadLegacyBuildOrdersForDropdown(civId) {
    console.log('Loading legacy build orders for:', civId);
    // This would load from the old build-order-creator directory
}

function loadSelectedLegacyBuildOrder() {
    console.log('Loading selected legacy build order');
    // Legacy functionality
}

function addLegacyBuildOrder() {
    console.log('Adding legacy build order');
    showNotification('Legacy build order functionality - please use Create Local instead', 'info');
}

// Export functions to global scope
window.initializeStrategyUnified = initializeStrategyUnified;
window.selectBuildOrderType = selectBuildOrderType;
window.addStandardRowLocal = addStandardRowLocal;
window.addCustomRowLocal = addCustomRowLocal;
window.addAgeUpRowLocal = addAgeUpRowLocal;
window.addMultipleRowsLocal = addMultipleRowsLocal;
window.insertRowAfterLocal = insertRowAfterLocal;
window.closeLocalRowTypeModal = closeLocalRowTypeModal;
window.insertLocalRowType = insertLocalRowType;
window.removeRowLocal = removeRowLocal;
window.updateLocalRowNumbers = updateLocalRowNumbers;
window.editRowTypeLocal = editRowTypeLocal;
window.saveLocalBuildOrder = saveLocalBuildOrder;
window.clearLocalBuildOrder = clearLocalBuildOrder;
window.addExternalBuildOrder = addExternalBuildOrder;
window.toggleExternalCustomTypeInput = toggleExternalCustomTypeInput;
window.clearExternalBuildOrder = clearExternalBuildOrder;
window.loadLegacyBuildOrdersForDropdown = loadLegacyBuildOrdersForDropdown;
window.loadSelectedLegacyBuildOrder = loadSelectedLegacyBuildOrder;
window.addLegacyBuildOrder = addLegacyBuildOrder;