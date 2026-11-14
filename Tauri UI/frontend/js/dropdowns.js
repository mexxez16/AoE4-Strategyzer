// Custom dropdown system with flag support
// This file handles all custom dropdown functionality including:
// - Civilization selection dropdowns
// - Map type selection
// - Filter dropdowns

// Flag to prevent duplicate click listeners (memory leak fix)
let dropdownClickListenerAttached = false;

// Cache for active dropdown options to avoid repeated queries
let lastActiveDropdowns = null;

// Toggle custom dropdown
function toggleCustomDropdown(dropdownId) {
    console.log('=== TOGGLE DROPDOWN DEBUG ===');
    console.log('toggleCustomDropdown called for:', dropdownId);
    
    const dropdown = document.getElementById(dropdownId + '-dropdown');
    const options = document.getElementById(dropdownId + '-options');
    const selected = dropdown.querySelector('.dropdown-selected');
    
    console.log('Toggle elements found:');
    console.log('- dropdown:', !!dropdown);
    console.log('- options:', !!options);
    console.log('- selected:', !!selected);
    
    // Close all other dropdowns
    document.querySelectorAll('.dropdown-options.active').forEach(opt => {
        if (opt !== options) {
            opt.classList.remove('active');
            opt.parentElement.querySelector('.dropdown-selected').classList.remove('active');
        }
    });
    
    // Toggle current dropdown
    const isActive = options.classList.contains('active');
    console.log('Dropdown was active:', isActive);
    options.classList.toggle('active');
    selected.classList.toggle('active');
    console.log('Dropdown is now active:', !isActive);
    
    if (!isActive) {
        // Populate options if empty
        console.log('Populating dropdown options...');
        populateCustomDropdownOptions(dropdownId);
    }
}

// Populate custom dropdown options
function populateCustomDropdownOptions(dropdownId) {
    // Maps list filter dropdowns keep their static options from index.html
    // (must be checked BEFORE clearing the container!)
    if (dropdownId === 'maps-type' || dropdownId === 'maps-pool' || dropdownId === 'match-pool') {
        return;
    }

    const optionsContainer = document.getElementById(dropdownId + '-options');

    // Clear existing options
    optionsContainer.innerHTML = '';

    // Handle map-select specifically - it has its own population logic
    if (dropdownId === 'map-select') {
        if (typeof populateMapDropdown === 'function') {
            populateMapDropdown();
        }
        return;
    }

    // Civs tab dropdown - delegates to civs.js for its own select handler
    if (dropdownId === 'civs-select') {
        if (typeof populateCivsSelectDropdown === 'function') {
            populateCivsSelectDropdown();
        }
        return;
    }

    // Handle map-type specifically - static options
    if (dropdownId === 'map-type') {
        optionsContainer.innerHTML = `
            <div class="dropdown-option" onclick="selectMapType('', 'Select map type...')">Select map type...</div>
            <div class="dropdown-option" onclick="selectMapType('land-open', 'Land Open')">Land Open</div>
            <div class="dropdown-option" onclick="selectMapType('land-narrow', 'Land Narrow')">Land Narrow</div>
            <div class="dropdown-option" onclick="selectMapType('hybrid', 'Hybrid')">Hybrid</div>
            <div class="dropdown-option" onclick="selectMapType('water', 'Water')">Water</div>
        `;
        return;
    }
    
    // Handle filter-civ-select specifically - it has its own population logic
    if (dropdownId === 'filter-civ-select') {
        if (typeof populateFilterDropdown === 'function') {
            populateFilterDropdown();
        }
        return;
    }
    
    // Handle filter-active-select specifically - static options  
    if (dropdownId === 'filter-active-select') {
        optionsContainer.innerHTML = `
            <div class="dropdown-option" onclick="selectFilterStatus('', 'All Build Orders')">All Build Orders</div>
            <div class="dropdown-option" onclick="selectFilterStatus('active', 'Active Only')">Active Only</div>
            <div class="dropdown-option" onclick="selectFilterStatus('inactive', 'Inactive Only')">Inactive Only</div>
        `;
        return;
    }
    
    // Add default option
    const defaultOption = document.createElement('div');
    defaultOption.className = 'dropdown-option';
    defaultOption.innerHTML = '<span>Select civilization...</span>';
    defaultOption.onclick = () => selectCustomDropdownOption(dropdownId, '', 'Select civilization...');
    optionsContainer.appendChild(defaultOption);
    
    // Add civilization options
    civilizations.forEach(civ => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.setAttribute('data-value', civ.id);
        
        const flagPath = getCivFlag(civ.id);
        const flagHtml = flagPath ? `<img src="${flagPath}" class="dropdown-flag" alt="${civ.name} flag">` : '';
        
        option.innerHTML = `${flagHtml}<span>${civ.name}</span>`;
        option.onclick = () => selectCustomDropdownOption(dropdownId, civ.id, civ.name, flagPath);
        
        optionsContainer.appendChild(option);
    });
}

// Select custom dropdown option
function selectCustomDropdownOption(dropdownId, value, text, flagPath = null) {
    console.log('=== DROPDOWN SELECTION DEBUG ===');
    console.log('dropdownId:', dropdownId);
    console.log('value:', value);
    console.log('text:', text);
    
    const dropdown = document.getElementById(dropdownId + '-dropdown');
    const hiddenInput = document.getElementById(dropdownId);
    const selectedElement = dropdown.querySelector('.dropdown-selected span');
    const optionsContainer = document.getElementById(dropdownId + '-options');
    
    console.log('Elements found:');
    console.log('- dropdown:', !!dropdown);
    console.log('- hiddenInput:', !!hiddenInput);  
    console.log('- selectedElement:', !!selectedElement);
    console.log('- optionsContainer:', !!optionsContainer);
    
    // Update hidden input value
    hiddenInput.value = value;
    console.log('Hidden input value set to:', hiddenInput.value);
    
    // Update displayed text
    const flagHtml = flagPath ? `<img src="${flagPath}" class="dropdown-flag" alt="${text} flag" style="margin-right: 0.5rem;">` : '';
    selectedElement.innerHTML = `${flagHtml}${text}`;
    
    // Update selected state in options
    optionsContainer.querySelectorAll('.dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.getAttribute('data-value') === value || (value === '' && opt.textContent.includes('Select civilization'))) {
            opt.classList.add('selected');
        }
    });
    
    // Close dropdown
    optionsContainer.classList.remove('active');
    dropdown.querySelector('.dropdown-selected').classList.remove('active');
    
    // Trigger appropriate update based on dropdown type
    if (dropdownId === 'my-civ' || dropdownId === 'opponent-civ' || dropdownId === 'map-type' || dropdownId === 'map-select') {
        console.log('Triggering autoGetStrategyRecommendation for:', dropdownId);
        console.log('autoGetStrategyRecommendation function exists:', typeof autoGetStrategyRecommendation);
        
        try {
            console.log('About to call autoGetStrategyRecommendation...');
            console.log('window.autoGetStrategyRecommendation exists:', typeof window.autoGetStrategyRecommendation);
            
            // Try both ways
            if (typeof autoGetStrategyRecommendation === 'function') {
                autoGetStrategyRecommendation();
            } else if (typeof window.autoGetStrategyRecommendation === 'function') {
                console.log('Using window.autoGetStrategyRecommendation instead');
                window.autoGetStrategyRecommendation();
            } else {
                console.error('autoGetStrategyRecommendation not found in either scope!');
            }
            console.log('autoGetStrategyRecommendation call completed');
        } catch (error) {
            console.error('ERROR calling autoGetStrategyRecommendation:', error);
            console.error('Error stack:', error.stack);
        }
        
        // Also check and load matchup info if all values are present
        if (typeof checkAndLoadMatchupInfo === 'function') {
            checkAndLoadMatchupInfo();
        }
    } else if (dropdownId === 'build-civ-select') {
        // Trigger change event for build order form
        const changeEvent = new Event('change', { bubbles: true });
        hiddenInput.dispatchEvent(changeEvent);
        
        // Load local build orders for dropdown will be triggered by onchange in HTML
    } else if (dropdownId === 'viewer-civ-select') {
        console.log('=== VIEWER CIV SELECT TRIGGERED ===');
        console.log('Selected civilization:', value);
        console.log('File system ready:', window.fileSystemReady);
        console.log('Directory handle exists:', !!window.directoryHandle);
        
        // Call function directly (more reliable than event dispatch)
        if (typeof loadCivBuildOrdersList === 'function') {
            console.log('loadCivBuildOrdersList function found, calling now...');
            loadCivBuildOrdersList();
        } else {
            console.error('loadCivBuildOrdersList function not available');
            // Fallback: try event dispatch
            const changeEvent = new Event('change', { bubbles: true });
            hiddenInput.dispatchEvent(changeEvent);
            console.log('Fallback: Change event dispatched');
        }
    }
    
    // Update visual selection state for dropdown
    if (typeof updateDropdownSelectionVisual === 'function') {
        updateDropdownSelectionVisual(dropdownId, value);
        console.log(`Visual state updated for ${dropdownId}`);
    }
}

// Handler function for click outside dropdowns (stored for potential cleanup)
// Performance optimization: Only query active dropdowns when needed
function handleDropdownOutsideClick(event) {
    if (!event.target.closest('.custom-dropdown')) {
        // Query once and close all active dropdowns
        const activeOptions = document.querySelectorAll('.dropdown-options.active');
        activeOptions.forEach(opt => {
            opt.classList.remove('active');
            const selectedElement = opt.parentElement.querySelector('.dropdown-selected');
            if (selectedElement) {
                selectedElement.classList.remove('active');
            }
        });
    }
}

// Populate civilization dropdowns
// Memory leak fix: Use flag to prevent duplicate click listeners
function populateCivDropdowns() {
    // Custom dropdowns will be populated when clicked
    // Just add the change listeners to hidden inputs
    const myCivInput = document.getElementById('my-civ');
    const opponentCivInput = document.getElementById('opponent-civ');

    if (myCivInput) {
        myCivInput.addEventListener('change', autoGetStrategyRecommendation);
    }
    if (opponentCivInput) {
        opponentCivInput.addEventListener('change', autoGetStrategyRecommendation);
    }

    // Add click outside listener to close dropdowns (only once)
    if (!dropdownClickListenerAttached) {
        dropdownClickListenerAttached = true;
        document.addEventListener('click', handleDropdownOutsideClick);
    }
}