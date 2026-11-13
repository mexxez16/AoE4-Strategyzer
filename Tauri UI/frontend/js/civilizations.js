// Civilization data and related functions

// Load default civilizations
function loadDefaultCivs() {
    civilizations = [
        { id: 'abbasid', name: 'Abbasid', difficulty: 2, strengths: ['House of Wisdom', 'Economic bonuses'], weaknesses: ['Slow start'], playstyle: 'Technology and economic focus' },
        { id: 'ayyubids', name: 'Ayyubid', difficulty: 2, strengths: ['Strong military', 'Unique mechanics'], weaknesses: ['Complex strategy'], playstyle: 'Military focused' },
        { id: 'byzantines', name: 'Byzantine', difficulty: 2, strengths: ['Strong defensive', 'Religious units'], weaknesses: ['Limited mobility'], playstyle: 'Defensive religious focus' },
        { id: 'chinese', name: 'China', difficulty: 2, strengths: ['Dynasty system', 'Versatile units'], weaknesses: ['Complex mechanics'], playstyle: 'Adaptable strategy' },
        { id: 'zhu-xi', name: 'China Zhu Xi', difficulty: 3, strengths: ['Scholar abilities', 'Economic bonuses'], weaknesses: ['Complex management'], playstyle: 'Scholar-focused development' },
        { id: 'delhi', name: 'Delhi', difficulty: 3, strengths: ['Free technologies', 'Strong elephants'], weaknesses: ['Vulnerable early game'], playstyle: 'Technology advantage late game' },
        { id: 'english', name: 'English', difficulty: 1, strengths: ['Strong defensive capabilities', 'Powerful longbowmen'], weaknesses: ['Limited early aggression'], playstyle: 'Defensive and economic focused' },
        { id: 'french', name: 'French', difficulty: 1, strengths: ['Strong early knights', 'Economic bonuses from trade'], weaknesses: ['Expensive units', 'Vulnerable to spearmen'], playstyle: 'Aggressive early game with knight raids' },
        { id: 'french-jd', name: 'French JD', difficulty: 2, strengths: ['Joan of Arc abilities', 'Enhanced cavalry'], weaknesses: ['Complex mechanics'], playstyle: 'Hero-focused aggressive strategy' },
        { id: 'golden-horde', name: 'Golden Horde', difficulty: 3, strengths: ['Superior cavalry archers', 'Mobile warfare'], weaknesses: ['Weak defensive structures'], playstyle: 'Hit-and-run tactics with cavalry' },
        { id: 'hre', name: 'HRE', difficulty: 2, strengths: ['Strong economy', 'Powerful infantry'], weaknesses: ['Slow early game'], playstyle: 'Economic boom into military' },
        { id: 'house-of-lancaster', name: 'House of Lancaster', difficulty: 2, strengths: ['Enhanced English abilities'], weaknesses: ['Similar to English'], playstyle: 'Enhanced defensive strategy' },
        { id: 'japanese', name: 'Japan', difficulty: 2, strengths: ['Strong naval', 'Unique units'], weaknesses: ['Limited early options'], playstyle: 'Naval and siege focused' },
        { id: 'knights-templar', name: 'Knights Templar', difficulty: 2, strengths: ['Elite military units'], weaknesses: ['Limited economic bonuses'], playstyle: 'Elite military focus' },
        { id: 'macedonian-dynasty', name: 'Macedonian Dynasty', difficulty: 3, strengths: ['Elite phalanx units', 'Strong siege weapons'], weaknesses: ['High unit costs'], playstyle: 'Combined arms with heavy infantry' },
        { id: 'mali', name: 'Mali', difficulty: 2, strengths: ['Gold generation', 'Strong infantry'], weaknesses: ['Limited cavalry'], playstyle: 'Economic advantage' },
        { id: 'mongols', name: 'Mongols', difficulty: 3, strengths: ['Mobile buildings', 'Strong cavalry'], weaknesses: ['No walls'], playstyle: 'Highly aggressive and mobile' },
        { id: 'order-of-the-dragon', name: 'Order of the Dragon', difficulty: 3, strengths: ['Unique mechanics'], weaknesses: ['Complex strategy'], playstyle: 'Specialized tactics' },
        { id: 'ottoman', name: 'Ottoman', difficulty: 2, strengths: ['Strong military production', 'Janissaries'], weaknesses: ['Economic weaknesses'], playstyle: 'Military focused expansion' },
        { id: 'rus', name: 'RUS', difficulty: 2, strengths: ['Strong economy from hunting', 'Powerful cavalry'], weaknesses: ['Slow early game'], playstyle: 'Economic powerhouse' },
        { id: 'sengoku-daimyo', name: 'Sengoku Daimyo', difficulty: 3, strengths: ['Samurai units', 'Castle age bonuses'], weaknesses: ['Vulnerable to early aggression'], playstyle: 'Castle-focused defensive expansion' },
        { id: 'tughlaq-dynasty', name: 'Tughlaq Dynasty', difficulty: 2, strengths: ['Gunpowder units', 'Economic flexibility'], weaknesses: ['Weak early military'], playstyle: 'Economic boom into gunpowder units' },
        { id: 'vikings', name: 'Vikings', difficulty: 2, strengths: ['Strong naval raids', 'Powerful infantry'], weaknesses: ['Limited defenses'], playstyle: 'Aggressive raiding and expansion' },
        { id: 'scots', name: 'Scots', difficulty: 2, strengths: ['Strong spearmen', 'Economic bonuses'], weaknesses: ['Limited cavalry'], playstyle: 'Defensive with strong infantry pushes' }
    ];
    renderCivGrid();
    
    console.log('Civilizations loaded:', civilizations.length, 'civilizations');
    
    // Mark civilizations as loaded
    if (window.AppLoadingState) {
        window.AppLoadingState.civilizationsLoaded = true;
        window.AppLoadingState.checkAllLoaded();
    }
}

// Render civilization grid - no longer needed since we removed civ-container
function renderCivGrid() {
    // Grid element no longer exists - skip rendering
    return;
}

// Select civilization - no longer needed since we removed civ-details
function selectCiv(civ) {
    selectedCiv = civ;
    // No longer render grid or details since elements were removed
    return;
}

// Civilization flags mapping
const civFlags = {
    'abbasid': 'ab.png',
    'ayyubids': 'ay.png', 
    'byzantines': 'by.png',
    'chinese': 'ch.png',
    'zhu-xi': 'zx.png',
    'delhi': 'de.png',
    'english': 'en.png',
    'french': 'fr.png',
    'french-jd': 'je.png',
    'hre': 'hr.png',
    'house-of-lancaster': 'hl.png',
    'japanese': 'ja.png',
    'knights-templar': 'kt.png',
    'mali': 'ma.png',
    'mongols': 'mo.png',
    'order-of-the-dragon': 'od.png',
    'ottoman': 'ot.png',
    'rus': 'ru.png',
    'golden-horde': 'goh.png',
    'macedonian-dynasty': 'mac.png',
    'sengoku-daimyo': 'sen.png',
    'tughlaq-dynasty': 'tug.png',
    'vikings': 'vik.webp',
    'scots': 'sco.webp'
};

// Get civilization flag path
function getCivFlag(civId) {
    const flagFile = civFlags[civId];
    return flagFile ? `Flags/${flagFile}` : null;
}

// High-resolution flag files (Flags/Flags Large) keyed by civ id
const civLargeFlags = {
    'abbasid': 'abb-large.webp',
    'ayyubids': 'ayy-large.webp',
    'byzantines': 'byz-large.webp',
    'chinese': 'chi-large.webp',
    'delhi': 'del-large.webp',
    'english': 'eng-large.webp',
    'french': 'fre-large.webp',
    'french-jd': 'jda-large.webp',
    'golden-horde': 'goh-large.webp',
    'house-of-lancaster': 'hol-large.webp',
    'hre': 'hre-large.webp',
    'japanese': 'jap-large.webp',
    'knights-templar': 'kte-large.webp',
    'macedonian-dynasty': 'mac-large.webp',
    'mali': 'mal-large.webp',
    'mongols': 'mon-large.webp',
    'order-of-the-dragon': 'dra-large.webp',
    'ottoman': 'ott-large.webp',
    'rus': 'rus-large.webp',
    'scots': 'sco-large.webp',
    'sengoku-daimyo': 'sen-large.webp',
    'tughlaq-dynasty': 'tug-large.webp',
    'vikings': 'vik-large.webp',
    'zhu-xi': 'zxl-large.webp'
};

function getLargeCivFlag(civId) {
    const file = civLargeFlags[civId];
    return file ? `Flags/Flags Large/${file}` : null;
}

// Import civilization data
function importCivData() {
    document.getElementById('fileInput').click();
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Check if it's a single civ or array
            if (Array.isArray(data)) {
                civilizations = data;
            } else if (data.id && data.name) {
                // Single civ - add or update
                const index = civilizations.findIndex(c => c.id === data.id);
                if (index >= 0) {
                    civilizations[index] = data;
                } else {
                    civilizations.push(data);
                }
            }
            
            renderCivGrid();
            populateCivDropdowns();
            populateBuildOrderForm();
            populateFilterDropdown();
            alert('Civilization data imported successfully!');
        } catch (err) {
            alert('Error importing file: Invalid JSON format');
        }
    };
    reader.readAsText(file);
}

// Export civilization data
function exportCivData() {
    if (civilizations.length === 0) {
        alert('No civilizations to export!');
        return;
    }
    
    const dataStr = JSON.stringify(civilizations, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aoe4-civilizations.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}