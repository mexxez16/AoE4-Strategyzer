// UI Helper functions and strategy recommendations

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

// Show notification toast message
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existingNotification = document.getElementById('app-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'app-notification';
    notification.className = `notification notification-${type}`;

    // Set icon based on type
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';

    notification.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;

    // Add styles if not already present
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                background: #333;
                color: white;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
                max-width: 400px;
            }
            .notification-success { background: #2e7d32; }
            .notification-error { background: #c62828; }
            .notification-warning { background: #f57c00; }
            .notification-info { background: #1976d2; }
            .notification-icon { font-size: 1.2em; }
            .notification-message { flex: 1; }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5em;
                cursor: pointer;
                padding: 0;
                margin-left: 10px;
                opacity: 0.7;
            }
            .notification-close:hover { opacity: 1; }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // Add to document
    document.body.appendChild(notification);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

// Make showNotification globally available
window.showNotification = showNotification;

// Manual test function to call autoGetStrategyRecommendation directly
window.testAutoGetStrategy = function() {
    console.log('=== MANUAL TEST CALL ===');
    console.log('Calling autoGetStrategyRecommendation directly...');
    try {
        autoGetStrategyRecommendation();
        console.log('Manual call completed successfully');
    } catch (error) {
        console.error('Manual call failed:', error);
        console.error('Error stack:', error.stack);
    }
}

// Simple debug test
window.simpleTest = function() {
    alert('Simple test works! Now testing function...');
    console.log('Simple test console log works');
    console.log('typeof autoGetStrategyRecommendation:', typeof autoGetStrategyRecommendation);
}

// Manual test function for Fr 18 debugging
window.testFr18BuildOrder = function() {
    console.log('=== FR 18 BUILD ORDER TEST ===');
    console.log('1. Build order database check:');
    console.log('French build orders exist:', !!buildOrderDatabase['french']);
    console.log('Fr 18 build order exists:', !!(buildOrderDatabase['french'] && buildOrderDatabase['french']['Fr 18: Wheelbarrow Opening into PS']));
    
    if (buildOrderDatabase['french'] && buildOrderDatabase['french']['Fr 18: Wheelbarrow Opening into PS']) {
        const fr18 = buildOrderDatabase['french']['Fr 18: Wheelbarrow Opening into PS'];
        console.log('Fr 18 details:', fr18);
        console.log('Map types:', fr18.mapTypes);
        console.log('Opponents:', fr18.opponents);
        
        console.log('2. Current dropdown values:');
        const myCiv = document.getElementById('my-civ').value;
        const opponentCiv = document.getElementById('opponent-civ').value;
        const mapType = document.getElementById('map-type').value;
        console.log('My civ:', myCiv);
        console.log('Opponent civ:', opponentCiv);
        console.log('Map type:', mapType);
        
        console.log('3. Condition checks:');
        console.log('My civ is french:', myCiv === 'french');
        console.log('Map type supported:', fr18.mapTypes.includes(mapType));
        console.log('Opponent supported:', fr18.opponents.includes(opponentCiv));
        
        if (myCiv === 'french' && fr18.mapTypes.includes(mapType) && fr18.opponents.includes(opponentCiv)) {
            console.log('✅ Fr 18 should appear!');
        } else {
            console.log('❌ Fr 18 should NOT appear based on current selections');
        }
    }
}

// Auto get strategy recommendation
function autoGetStrategyRecommendation() {
    // Temporary alert to verify function is called
    console.log('FUNCTION CALLED - autoGetStrategyRecommendation START');
    
    console.log('=== AUTO GET STRATEGY RECOMMENDATION CALLED ===');
    console.log('Function started execution');
    
    const myCivElement = document.getElementById('my-civ');
    const opponentCivElement = document.getElementById('opponent-civ');
    const mapTypeElement = document.getElementById('map-type');
    
    console.log('Elements found:');
    console.log('- my-civ element:', !!myCivElement);
    console.log('- opponent-civ element:', !!opponentCivElement);
    console.log('- map-type element:', !!mapTypeElement);
    
    if (!myCivElement || !opponentCivElement || !mapTypeElement) {
        console.error('ERROR: Required elements not found!');
        return;
    }
    
    const myCiv = myCivElement.value;
    const opponentCiv = opponentCivElement.value;
    const mapType = mapTypeElement.value;
    
    console.log('=== AUTO GET STRATEGY RECOMMENDATION ===');
    console.log('My civ value:', myCiv);
    console.log('Opponent civ value:', opponentCiv);
    console.log('Map type value:', mapType);
    
    // Only show recommendations if all three selections are made
    if (myCiv && opponentCiv && mapType) {
        console.log('All values present, calling getStrategyRecommendation()');
        getStrategyRecommendation();
    } else {
        console.log('Not all values present, hiding results');
        // Hide results if not all selections are made
        const resultDiv = document.getElementById('strategy-result');
        if (resultDiv) {
            resultDiv.classList.add('hidden');
        }
    }
}

// Get strategy recommendation
function getStrategyRecommendation() {
    const myCiv = document.getElementById('my-civ').value;
    const opponentCiv = document.getElementById('opponent-civ').value;
    const mapType = document.getElementById('map-type').value;
    const resultDiv = document.getElementById('strategy-result');
    
    if (!myCiv || !opponentCiv || !mapType) {
        resultDiv.classList.add('hidden');
        return;
    }
    
    // Get build orders for selected civilization
    const civBuildOrders = buildOrderDatabase[myCiv] || {};
    const buildOrdersArray = Object.entries(civBuildOrders);
    
    console.log('=== BUILD ORDER DEBUG ===');
    console.log('Selected civ:', myCiv);
    console.log('Build order database for civ:', civBuildOrders);
    console.log('Build orders array:', buildOrdersArray);
    console.log('Looking for map type:', mapType);
    console.log('Looking for opponent:', opponentCiv);
    
    // Filter build orders by map type and opponent
    const matchingBuildOrders = buildOrdersArray.filter(([name, details]) => {
        // Check if this build order works for the selected map type
        const mapTypeMatch = details.mapTypes && details.mapTypes.includes(mapType);
        
        // Check if this build order works against the opponent (if specified)
        let opponentMatch = true;
        if (details.opponents && details.opponents.length > 0) {
            opponentMatch = details.opponents.includes(opponentCiv);
        }
        
        console.log(`Checking "${name}":`, {
            mapTypeMatch,
            opponentMatch,
            mapTypes: details.mapTypes,
            opponents: details.opponents
        });
        
        return mapTypeMatch && opponentMatch;
    });
    
    console.log('Matching build orders:', matchingBuildOrders);
    
    // Display results
    if (matchingBuildOrders.length > 0) {
        let html = '<h4>General Build Orders</h4>';
        console.log('=== BUILD ORDER GENERATION DEBUG ===');
        
        matchingBuildOrders.forEach(([name, details]) => {
            // Handle local vs external URLs differently
            const isLocalUrl = details.url && details.url.startsWith('local://');
            console.log(`Processing build order "${name}": isLocal=${isLocalUrl}, url=${details.url}`);
            
            const urlDisplay = isLocalUrl ? 'Local Build Order' : details.url;
            
            // COMPLETELY REMOVE href for local URLs to prevent browser handling
            const urlLink = isLocalUrl 
                ? `<span class="local-url" onclick="event.stopPropagation(); event.preventDefault(); handleBuildOrderClick('${details.url}', '${details.civId || ''}', '${name}')" style="color: #28a745; font-weight: bold; cursor: pointer; text-decoration: underline;">${urlDisplay}</span>`
                : `<a href="${details.url}" target="_blank" onclick="event.stopPropagation()">${details.url}</a>`;
            
            // Use data attributes for both local and external URLs
            const itemAttributes = isLocalUrl 
                ? `data-is-local="true" data-url="${details.url}" data-civ-id="${details.civId || ''}" data-name="${name}"`
                : `data-is-local="false" data-url="${details.url}" data-name="${name}"`;
            
            const linkTypeText = isLocalUrl ? 'local' : 'external';
            
            html += `
                <div class="build-order-item" style="cursor: pointer;" ${itemAttributes} onclick="handleBuildOrderItemClick(this, event)">
                    <div class="build-order-header">
                        <h5>${name}</h5>
                        <span class="build-order-link-text ${isLocalUrl ? 'local' : 'external'}">${linkTypeText}</span>
                    </div>
                    ${details.notes ? `<p class="build-order-notes"><strong>Notes:</strong> ${details.notes}</p>` : ''}
                    ${getAdvancedNotesDisplay(details, opponentCiv, mapType)}
                </div>
            `;
            
            console.log(`Generated HTML for "${name}":`, html.substring(html.lastIndexOf('<div class="build-order-item"')));
        });
        
        console.log('=== FINAL HTML BEING INSERTED ===');
        console.log(html);
        
        // Clear existing content first to prevent cache issues
        resultDiv.innerHTML = '';
        
        // Add cache buster timestamp
        html += `<!-- Cache buster: ${Date.now()} -->`;
        
        resultDiv.innerHTML = html;
        resultDiv.classList.remove('hidden');
        
        console.log('✅ HTML inserted into DOM');
        
        // Better approach: Don't destroy the URLs, just ensure they can't be navigated to
        // Add event listeners to all local build order items
        setTimeout(() => {
            const localBuildOrderItems = resultDiv.querySelectorAll('[data-is-local="true"]');
            console.log(`Found ${localBuildOrderItems.length} local build order items`);
            
            localBuildOrderItems.forEach(item => {
                // Ensure clicks are handled properly
                item.style.cursor = 'pointer';
                
                // Remove any href attributes from child elements
                const links = item.querySelectorAll('a[href*="local://"]');
                links.forEach(link => {
                    console.log('Removing local:// href from link:', link.href);
                    link.removeAttribute('href');
                    link.style.cursor = 'pointer';
                });
            });
        }, 10);
    } else {
        resultDiv.innerHTML = '<h4>No specific build orders found for this matchup</h4><p>Consider adding build orders for this civilization and matchup combination.</p>';
        resultDiv.classList.remove('hidden');
    }
}

// Get advanced notes display for strategy recommendation
function getAdvancedNotesDisplay(details, opponentCiv, mapType) {
    if (!details.advancedNotes || !details.advancedNotes[opponentCiv] || !details.advancedNotes[opponentCiv][mapType]) {
        return '';
    }
    
    const note = details.advancedNotes[opponentCiv][mapType];
    return `<div class="notes-display"><strong>Matchup Notes:</strong> ${note}</div>`;
}

// New safer build order item click handler
window.handleBuildOrderItemClick = function(element, event) {
    console.log('=== BUILD ORDER ITEM CLICK ===');
    event.preventDefault();
    event.stopPropagation();
    
    const isLocal = element.getAttribute('data-is-local') === 'true';
    const url = element.getAttribute('data-url');
    const civId = element.getAttribute('data-civ-id');
    const name = element.getAttribute('data-name');
    
    console.log('Click data:', { isLocal, url, civId, name });
    
    if (isLocal && url && url.startsWith('local://')) {
        console.log('✓ Local build order - calling handleBuildOrderClick');
        handleBuildOrderClick(url, civId, name);
    } else if (!isLocal && url) {
        console.log('✓ External URL - opening directly:', url);
        openExternalUrl(url);
    } else {
        console.error('No URL found for build order:', name);
    }
};

// Handle build order click in recommendations
// TAURI: Uses readFileSystemFile which checks APPDATA first, then embedded assets
window.handleBuildOrderClick = async function(url, civId, buildTitle) {
    console.log('=== HANDLE BUILD ORDER CLICK DEBUG ===');
    console.log('URL:', url);
    console.log('civId:', civId);
    console.log('buildTitle:', buildTitle);

    // Check if it's a local build order URL
    if (url && url.startsWith('local://')) {
        console.log('✓ Local build order detected, attempting to load preview');

        // Parse the local URL: local://build-order-data/french/filename.json
        const parts = url.replace('local://', '').split('/');
        console.log('URL parts:', parts);

        if (parts.length >= 3) {
            const civ = parts[1];
            const fileName = parts[2];
            console.log('Parsed - civ:', civ, 'fileName:', fileName);

            try {
                console.log('Loading build order...');

                // TAURI FIX: Use readFileSystemFile which checks APPDATA first, then embedded assets
                // This works for both user-created build orders (in APPDATA) and embedded ones
                const directory = `build-order-data/${civ}`;
                const content = await window.readFileSystemFile(directory, fileName);

                if (content) {
                    const buildOrderData = JSON.parse(content);
                    console.log('✅ Build order data loaded successfully:', buildOrderData.name);

                    // Display in modal
                    showBuildOrderInModal(buildOrderData);

                    // Show modal
                    const modal = document.getElementById('build-order-preview-modal');
                    if (modal) {
                        modal.style.display = 'flex';
                        console.log('✅ Modal displayed');
                    } else {
                        console.error('❌ Modal element not found');
                    }
                } else {
                    // Fallback: Try to get data from in-memory database
                    console.log('File not found, trying in-memory database...');
                    const buildOrderData = window.buildOrderDatabase?.[civ]?.[buildTitle];
                    if (buildOrderData) {
                        console.log('✅ Found in database:', buildOrderData.name);
                        showBuildOrderInModal(buildOrderData);
                        const modal = document.getElementById('build-order-preview-modal');
                        if (modal) modal.style.display = 'flex';
                    } else {
                        throw new Error('Build order not found');
                    }
                }

            } catch (error) {
                console.error('❌ Error loading local build order:', error);
                showNotification(`Could not load build order: ${error.message}`, 'error');
            }
        } else {
            console.error('❌ Invalid local URL format:', url);
            showNotification('Invalid local build order URL format', 'error');
        }
    } else if (url) {
        // External URL - just open in new tab
        console.log('✓ External URL detected, opening in new tab:', url);
        openExternalUrl(url);
    } else {
        console.error('❌ No URL provided');
        showNotification('No URL available for this build order', 'error');
    }
}

// Display build order in modal (inline version)
function showBuildOrderInModal(buildOrderData) {
    const titleElement = document.getElementById('modal-build-title');
    const descriptionDiv = document.getElementById('modal-viewer-description');
    const descriptionText = document.getElementById('modal-viewer-description-text');
    const tbody = document.getElementById('modal-viewer-tbody');
    const table = document.getElementById('modal-build-order-table');
    
    // Set title
    titleElement.textContent = buildOrderData.name || 'Build Order Preview';
    
    // Show/hide description
    if (buildOrderData.description && buildOrderData.description.trim()) {
        descriptionText.textContent = buildOrderData.description;
        descriptionDiv.style.display = 'block';
    } else {
        descriptionDiv.style.display = 'none';
    }
    
    // Check if any step has time data
    const hasTimeData = buildOrderData.steps && buildOrderData.steps.some(step => step.time && step.time.trim() !== '');
    
    // Show/hide time column in header
    const timeHeader = table.querySelector('thead th:nth-child(2)');
    if (timeHeader) {
        timeHeader.style.display = hasTimeData ? '' : 'none';
    }
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Add steps
    buildOrderData.steps.forEach((step) => {
        const row = document.createElement('tr');
        
        if (step.type === 'custom') {
            // Custom text row
            row.className = 'custom-row';
            if (hasTimeData) {
                row.innerHTML = `
                    <td>${step.step}</td>
                    <td>${step.time || ''}</td>
                    <td colspan="5" class="custom-text-cell">${step.customText || ''}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${step.step}</td>
                    <td colspan="5" class="custom-text-cell">${step.customText || ''}</td>
                `;
            }
        } else if (step.type === 'ageup') {
            // Age up row
            row.className = 'age-up-row';
            if (hasTimeData) {
                row.innerHTML = `
                    <td>${step.step}</td>
                    <td>${step.time || ''}</td>
                    <td colspan="4" class="age-up-cell">
                        <span class="age-roman">${step.ageRoman || 'II'}</span>
                        <span class="age-label">Age Up</span>
                    </td>
                    <td class="notes-cell">${step.notes || ''}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${step.step}</td>
                    <td colspan="4" class="age-up-cell">
                        <span class="age-roman">${step.ageRoman || 'II'}</span>
                        <span class="age-label">Age Up</span>
                    </td>
                    <td class="notes-cell">${step.notes || ''}</td>
                `;
            }
        } else {
            // Standard resource row
            const formatValue = (value) => {
                if (value === undefined || value === null || value === '') {
                    return ''; // Field not present in JSON - show empty
                }
                const num = parseInt(value);
                return isNaN(num) ? '' : `<strong>${num}</strong>`; // Show all numbers, including 0
            };
            
            if (hasTimeData) {
                row.innerHTML = `
                    <td>${step.step}</td>
                    <td>${step.time || ''}</td>
                    <td class="resource-cell">${formatValue(step.food)}</td>
                    <td class="resource-cell">${formatValue(step.wood)}</td>
                    <td class="resource-cell">${formatValue(step.gold)}</td>
                    <td class="resource-cell">${formatValue(step.stone)}</td>
                    <td class="notes-cell">${step.notes || ''}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${step.step}</td>
                    <td class="resource-cell">${formatValue(step.food)}</td>
                    <td class="resource-cell">${formatValue(step.wood)}</td>
                    <td class="resource-cell">${formatValue(step.gold)}</td>
                    <td class="resource-cell">${formatValue(step.stone)}</td>
                    <td class="notes-cell">${step.notes || ''}</td>
                `;
            }
        }
        
        tbody.appendChild(row);
    });

    // Content-Adaptation aktivieren wenn verfügbar
    if (window.modalContentAdapter && window.modalContentAdapter.isEnabled()) {
        // Kurze Verzögerung für DOM-Rendering und Layout-Berechnung
        setTimeout(() => {
            window.modalContentAdapter.adaptContent();
        }, 100);
    }
}

// Modal Content Adapter - Passt Inhalte an verfügbaren Platz an
// Memory leak fix: Added animationFrameId for cancellation
class ModalContentAdapter {
    constructor() {
        this.enabled = true;
        this.originalStyles = new Map();
        this.animationFrameId = null; // Track requestAnimationFrame for cleanup
    }

    // Hauptfunktion: Passt Inhalte an verfügbaren Platz an
    adaptContent(modalId = 'build-order-preview-modal') {
        if (!this.enabled) return;

        const modal = document.getElementById(modalId);
        const modalContainer = modal?.querySelector('.modal-container');
        const modalContent = modal?.querySelector('.modal-content');
        
        if (!modal || !modalContainer || !modalContent) {
            console.log('Modal elements not found for content adaptation');
            return;
        }

        // Cancel any previous animation frame
        this.cancelAdaptation();

        // Warte auf DOM-Update
        this.animationFrameId = requestAnimationFrame(() => {
            this.performAdaptation(modalContent);
        });
    }

    // Cancel ongoing adaptation (memory leak fix)
    cancelAdaptation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    performAdaptation(modalContent) {
        let attempts = 0;
        const maxAttempts = 10;

        const adaptStep = () => {
            attempts++;

            // Prüfe ob Scrollbalken erscheinen würde
            const hasVerticalScroll = modalContent.scrollHeight > modalContent.clientHeight;
            const hasHorizontalScroll = modalContent.scrollWidth > modalContent.clientWidth;

            // Debug-Info
            if (attempts === 1) {
                console.log(`Modal adaptation check - Content: ${modalContent.scrollHeight}px, Container: ${modalContent.clientHeight}px`);
            }

            if ((hasVerticalScroll || hasHorizontalScroll) && attempts < maxAttempts) {
                // Schritt-für-Schritt Anpassungen
                this.applyCompactStyles(modalContent, attempts);

                console.log(`Modal content adapted (step ${attempts})`);

                // Rekursive Prüfung nach DOM-Update
                this.animationFrameId = requestAnimationFrame(adaptStep);
            } else {
                console.log(`✅ Content adaptation complete after ${attempts - 1} steps`);
                this.animationFrameId = null;
            }
        };

        adaptStep();
    }

    applyCompactStyles(modalContent, step) {
        const table = modalContent.querySelector('.build-order-table');
        const cells = modalContent.querySelectorAll('.build-order-table th, .build-order-table td');
        const description = modalContent.querySelector('.viewer-description');
        const header = modalContent.closest('.modal-container').querySelector('.modal-header');

        switch(step) {
            case 1:
                // Schritt 1: Kleinere Schriftgröße für Tabelle
                if (table) {
                    table.style.fontSize = '0.85rem';
                }
                break;
                
            case 2:
                // Schritt 2: Weniger Padding in Zellen
                cells.forEach(cell => {
                    cell.style.padding = '0.5rem 0.4rem';
                });
                break;
                
            case 3:
                // Schritt 3: Noch kleinere Schriftgröße
                if (table) {
                    table.style.fontSize = '0.75rem';
                }
                break;
                
            case 4:
                // Schritt 4: Minimales Padding
                cells.forEach(cell => {
                    cell.style.padding = '0.3rem 0.25rem';
                });
                break;
                
            case 5:
                // Schritt 5: Beschreibung minimieren
                if (description) {
                    description.style.fontSize = '0.8rem';
                    description.style.padding = '0.75rem';
                }
                break;
                
            case 6:
                // Schritt 6: Header kompakter
                if (header) {
                    header.style.padding = '0.75rem 1rem';
                }
                break;
                
            case 7:
                // Schritt 7: Sehr kleine Tabellenschrift
                if (table) {
                    table.style.fontSize = '0.65rem';
                }
                break;
                
            case 8:
                // Schritt 8: Minimale Abstände
                modalContent.style.padding = '0.75rem';
                break;
        }
    }

    // Aktivierung/Deaktivierung
    enable() {
        this.enabled = true;
        console.log('Modal content adaptation enabled');
    }

    disable() {
        this.enabled = false;
        this.cancelAdaptation(); // Cancel any ongoing animation
        this.resetAllModals();
        console.log('Modal content adaptation disabled - all styles reset');
    }

    // Status prüfen
    isEnabled() {
        return this.enabled;
    }

    // Reset alle Modals zu ursprünglichen Styles
    resetAllModals() {
        document.querySelectorAll('.modal-content').forEach(content => {
            // Reset modal content
            content.style.padding = '';
            content.style.fontSize = '';
            
            // Reset Tabelle
            const table = content.querySelector('.build-order-table');
            if (table) {
                table.style.fontSize = '';
            }
            
            // Reset Zellen
            const cells = content.querySelectorAll('.build-order-table th, .build-order-table td');
            cells.forEach(cell => {
                cell.style.padding = '';
                cell.style.fontSize = '';
            });
            
            // Reset Beschreibung
            const description = content.querySelector('.viewer-description');
            if (description) {
                description.style.fontSize = '';
                description.style.padding = '';
            }
            
            // Reset Header
            const header = content.closest('.modal-container')?.querySelector('.modal-header');
            if (header) {
                header.style.padding = '';
            }
        });
    }

    // Manueller Compact-Modus
    applyCompactMode() {
        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            this.applyCompactStyles(modalContent, 8); // Alle Compact-Styles anwenden
            console.log('Compact mode applied manually');
        }
    }
}

// Global instance erstellen
window.modalContentAdapter = new ModalContentAdapter();

// Debug/Control Funktionen für Browser Console
window.disableModalAdaptation = () => window.modalContentAdapter.disable();
window.enableModalAdaptation = () => window.modalContentAdapter.enable();
window.applyCompactMode = () => window.modalContentAdapter.applyCompactMode();
window.resetModalContent = () => window.modalContentAdapter.resetAllModals();

// UI Toggle Funktion für den Button in Build Orders Tab

// Close build order preview modal - mit Reset
window.closeBuildOrderPreview = function() {
    const modal = document.getElementById('build-order-preview-modal');
    if (modal) {
        modal.style.display = 'none';
        
        // Reset content adaptation when closing modal
        if (window.modalContentAdapter) {
            window.modalContentAdapter.resetAllModals();
        }
    }
}

// Expose autoGetStrategyRecommendation to window for cross-script access
window.autoGetStrategyRecommendation = autoGetStrategyRecommendation;

// Global loading state manager
window.AppLoadingState = {
    scriptsLoaded: false,
    buildOrdersLoaded: false,
    civilizationsLoaded: false,
    
    checkAllLoaded: function() {
        const allLoaded = this.scriptsLoaded && this.buildOrdersLoaded && this.civilizationsLoaded;
        if (allLoaded) {
            console.log('✅ All components loaded successfully');
            document.body.classList.add('app-loaded');
            
            // Test functions availability
            this.testFunctionsAvailability();
        }
        return allLoaded;
    },
    
    testFunctionsAvailability: function() {
        console.log('=== FUNCTION AVAILABILITY TEST ===');
        console.log('simpleTest:', typeof window.simpleTest === 'function' ? '✅' : '❌');
        console.log('testAutoGetStrategy:', typeof window.testAutoGetStrategy === 'function' ? '✅' : '❌');
        console.log('testFr18BuildOrder:', typeof window.testFr18BuildOrder === 'function' ? '✅' : '❌');
        console.log('autoGetStrategyRecommendation:', typeof window.autoGetStrategyRecommendation === 'function' ? '✅' : '❌');
        console.log('buildOrderDatabase available:', typeof buildOrderDatabase !== 'undefined' ? '✅' : '❌');
        console.log('French build orders:', !!buildOrderDatabase?.french ? '✅' : '❌');
    }
};

// Mark scripts as loaded when this file loads
window.AppLoadingState.scriptsLoaded = true;

// Populate filter dropdown for Build Orders tab
function populateFilterDropdown() {
    const optionsContainer = document.getElementById('filter-civ-select-options');
    if (!optionsContainer) {
        console.log('Filter dropdown options container not found');
        return;
    }
    
    console.log('Populating filter dropdown with', civilizations.length, 'civilizations');
    
    // Clear existing options and add default option
    optionsContainer.innerHTML = '<div class="dropdown-option" onclick="selectFilterCiv(\'\', \'All Civilizations\')">All Civilizations</div>';
    
    // Add civilization options with flags
    civilizations.forEach(civ => {
        const flagPath = getCivFlag(civ.id);
        const flagHtml = flagPath ? `<img src="${flagPath}" class="dropdown-flag" alt="${civ.name}">` : '';
        
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.innerHTML = `${flagHtml}${civ.name}`;
        option.onclick = () => selectFilterCiv(civ.id, civ.name);
        optionsContainer.appendChild(option);
    });
}

// Filter Civilization selection function for custom dropdown
function selectFilterCiv(civId, civName) {
    const filterSelect = document.getElementById('filter-civ-select');
    const filterText = document.getElementById('filter-civ-select-text');
    
    if (filterSelect && filterText) {
        filterSelect.value = civId;
        filterText.textContent = civName;
        closeCustomDropdown('filter-civ-select');
        
        // Update visual selection state
        updateDropdownSelectionVisual('filter-civ-select', civId);
        
        // Secondary panel: build orders of the selected civilization
        if (typeof renderCivBoFilterPanel === 'function') {
            renderCivBoFilterPanel(civId);
        }
        
        // Trigger existing filter function
        if (typeof filterBuildOrders === 'function') {
            filterBuildOrders();
        }
    }
}

// Filter Status selection function for custom dropdown
function selectFilterStatus(statusValue, statusText) {
    const filterSelect = document.getElementById('filter-active-select');
    const filterText = document.getElementById('filter-active-select-text');
    
    if (filterSelect && filterText) {
        filterSelect.value = statusValue;
        filterText.textContent = statusText;
        closeCustomDropdown('filter-active-select');
        
        // Update visual selection state
        updateDropdownSelectionVisual('filter-active-select', statusValue);

        // Trigger existing filter function
        if (typeof filterBuildOrders === 'function') {
            filterBuildOrders();
        }
    }
}


// Dropdown Selection Visual Feedback System
function updateDropdownSelectionVisual(dropdownId, value) {
    console.log(`updateDropdownSelectionVisual called for ${dropdownId} with value: ${value}`);
    
    const dropdownContainer = document.getElementById(`${dropdownId}-dropdown`);
    const dropdownSelected = dropdownContainer?.querySelector('.dropdown-selected');
    
    if (!dropdownContainer) {
        console.warn(`Dropdown container not found for ID: ${dropdownId}-dropdown`);
        return;
    }
    
    if (!dropdownSelected) {
        console.warn(`Dropdown selected element not found in container for ID: ${dropdownId}`);
        return;
    }
    
    if (value && value !== '' && value !== 'Select...') {
        dropdownSelected.classList.add('has-selection');
        console.log(`✅ Dropdown ${dropdownId} marked as selected (golden border)`);
    } else {
        dropdownSelected.classList.remove('has-selection');
        console.log(`⭕ Dropdown ${dropdownId} marked as unselected (normal border)`);
    }
}

// Initialize all dropdowns on page load
function initializeDropdownVisualStates() {
    // List of all dropdown IDs to check
    const dropdownIds = [
        'my-civ',
        'opponent-civ', 
        'map-type',
        'map-select',
        'build-civ-select',
        'filter-civ-select',
        'filter-active-select'
    ];
    
    dropdownIds.forEach(dropdownId => {
        const hiddenInput = document.getElementById(dropdownId);
        if (hiddenInput && hiddenInput.value) {
            updateDropdownSelectionVisual(dropdownId, hiddenInput.value);
        }
    });
    
    console.log('Dropdown visual states initialized');
}

// Enhanced selection functions with visual feedback
function selectCivWithVisual(dropdownId, civId, civName) {
    const hiddenInput = document.getElementById(dropdownId);
    const displayText = document.getElementById(`${dropdownId}-text`);
    
    if (hiddenInput && displayText) {
        hiddenInput.value = civId;
        displayText.textContent = civName;
        
        // Update visual state
        updateDropdownSelectionVisual(dropdownId, civId);
        
        // Close dropdown
        closeCustomDropdown(dropdownId);
        
        return true;
    }
    return false;
}

function selectMapTypeWithVisual(mapTypeValue, mapTypeText) {
    const result = selectMapType(mapTypeValue, mapTypeText);
    if (result !== false) {
        updateDropdownSelectionVisual('map-type', mapTypeValue);
    }
    return result;
}

function selectMapWithVisual(mapId, displayText, mapType) {
    const result = selectMap(mapId, displayText, mapType);
    if (result !== false) {
        updateDropdownSelectionVisual('map-select', mapId);
    }
    return result;
}

// Export new functions to global scope
window.selectFilterCiv = selectFilterCiv;
window.selectFilterStatus = selectFilterStatus;
window.updateDropdownSelectionVisual = updateDropdownSelectionVisual;
window.initializeDropdownVisualStates = initializeDropdownVisualStates;
window.selectCivWithVisual = selectCivWithVisual;