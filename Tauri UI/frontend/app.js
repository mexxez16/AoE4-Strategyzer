// Remaining functions that haven't been modularized yet
// This file contains advanced notes management, edit forms, and tierlist functionality

// Populate advanced notes for add form
function populateAddAdvancedNotes() {
    const civId = document.getElementById('build-civ-select').value;
    const container = document.getElementById('add-advanced-notes');
    
    if (!civId || !container) {
        if (container) container.innerHTML = '';
        return;
    }
    
    const mapTypes = ['land-open', 'land-narrow', 'hybrid', 'water'];
    
    let html = '';
    civilizations.forEach(civ => {
        const isMirror = civ.id === civId;
        const flagPath = getCivFlag(civ.id);
        const flagHtml = flagPath ? `<img src="${flagPath}" class="checkbox-flag" alt="${civ.name}" style="margin-right: 0.5rem;">` : '';
        
        html += `
            <div class="advanced-notes-civ">
                <div class="advanced-notes-header" onclick="toggleAddAdvancedNotes('${civ.id}')">
                    <span class="civ-name">${flagHtml}${civ.name} ${isMirror ? '(Mirror)' : ''}</span>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="advanced-notes-content" id="add-advanced-notes-${civ.id}" style="display: none;">
                    ${mapTypes.map(mapType => `
                        <div class="map-type-notes">
                            <label>${mapType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                            <textarea 
                                class="advanced-note-input" 
                                data-civ="${civ.id}" 
                                data-map="${mapType}"
                                rows="2"
                                placeholder="Notes for ${civ.name} on ${mapType.replace('-', ' ')}"
                            ></textarea>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Toggle advanced notes in add form
function toggleAddAdvancedNotes(civId) {
    const content = document.getElementById(`add-advanced-notes-${civId}`);
    if (content) {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
        
        // Update toggle icon
        const header = content.previousElementSibling;
        const icon = header.querySelector('.toggle-icon');
        if (icon) {
            icon.textContent = content.style.display === 'none' ? '▼' : '▲';
        }
    }
}

// Generate HTML for advanced notes section
function generateAdvancedNotesHTML(civId, buildOrderName, details) {
    const advancedNotes = details.advancedNotes || {};
    const mapTypes = ['land-open', 'land-narrow', 'hybrid', 'water'];
    
    return civilizations.map(civ => {
        const civNotes = advancedNotes[civ.id] || {};
        const hasNotes = Object.values(civNotes).some(note => note);
        const isMirror = civ.id === civId;
        const flagPath = getCivFlag(civ.id);
        const flagHtml = flagPath ? `<img src="${flagPath}" class="checkbox-flag" alt="${civ.name}" style="margin-right: 0.5rem;">` : '';
        
        return `
            <div class="advanced-notes-civ">
                <div class="advanced-notes-header" onclick="toggleAdvancedNotes('${civId}', '${buildOrderName}', '${civ.id}')">
                    <span class="civ-name">${flagHtml}${civ.name} ${isMirror ? '(Mirror)' : ''} ${hasNotes ? '📝' : ''}</span>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="advanced-notes-content" id="advanced-notes-${civId}-${buildOrderName.replace(/[:\s]+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '')}-${civ.id}" style="display: none;">
                    ${mapTypes.map(mapType => `
                        <div class="map-type-notes">
                            <label>${mapType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                            <textarea 
                                class="advanced-note-input" 
                                data-civ="${civ.id}" 
                                data-map="${mapType}"
                                rows="2"
                                placeholder="Notes for ${civ.name} on ${mapType.replace('-', ' ')}"
                            >${civNotes[mapType] || ''}</textarea>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Toggle advanced notes visibility
function toggleAdvancedNotes(civId, buildOrderName, opponentCivId) {
    const contentId = `advanced-notes-${civId}-${buildOrderName.replace(/[:\s]+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '')}-${opponentCivId}`;
    const content = document.getElementById(contentId);
    if (content) {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
        // Update toggle icon
        const header = content.previousElementSibling;
        const icon = header.querySelector('.toggle-icon');
        if (icon) {
            icon.textContent = content.style.display === 'none' ? '▼' : '▲';
        }
    }
}


