// Civs Tab - Civilization-specific information and strength timeline
(function() {
    const AGES = ['Dark Age', 'Feudal Age', 'Castle Age', 'Imperial Age'];
    const PHASES = ['Early', 'Mid', 'Late'];
    const LEVELS = ['Strong', 'Middle', 'Low'];
    const COLS = 12;
    const ROWS = 9;

    const SECTION_KEYS = ['generalApproach', 'alternativeApproaches', 'strengths', 'weaknesses'];

    let currentCivId = null;
    let currentData = null;
    let saveTimeout = null;
    let dragState = null;
    let matchSetupHome = null;
    let buildOrdersHome = null;
    const compareCivIds = new Set();
    const compareDataCache = new Map();
    let compareShowPoints = false;

    function defaultData(civId) {
        const base = { civId, timelinePoints: [] };
        SECTION_KEYS.forEach(k => { base[k] = ''; });
        return base;
    }

    function invoke(cmd, args) {
        if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
            return window.__TAURI__.core.invoke(cmd, args);
        }
        return Promise.reject(new Error('Tauri invoke not available'));
    }

    function initializeCivs() {
        populateCivsSelectDropdown();
        attachSectionButtonHandlers();
        attachCompareHandlers();
        console.log('Civs tab initialized');
    }

    // Colors keyed to the dominant color of each civilization's flag
    const CIV_COMPARE_COLORS = {
        'abbasid':             '#d4a935', // black/gold
        'ayyubids':            '#eab62b', // yellow on black
        'byzantines':          '#7a2f8f', // imperial purple
        'chinese':             '#c92a2a', // imperial red
        'zhu-xi':              '#a8212a', // darker red
        'delhi':               '#2b8a44', // green
        'english':             '#e34040', // St. George red
        'french':              '#2c4a9c', // royal blue
        'french-jd':           '#5d7fcf', // Joan of Arc lighter blue
        'golden-horde':        '#e8b32a', // gold
        'hre':                 '#dcb02a', // yellow (black eagle)
        'house-of-lancaster':  '#a42030', // Lancaster red
        'japanese':            '#e84a4a', // rising sun red
        'knights-templar':     '#c02828', // templar cross red
        'mali':                '#2ea85a', // green
        'mongols':             '#3a8ed4', // Mongol blue
        'order-of-the-dragon': '#8a1818', // dragon dark wine
        'ottoman':             '#b22030', // crimson
        'rus':                 '#3a4d90', // navy
        'macedonian-dynasty':  '#5e2b78', // violet
        'sengoku-daimyo':      '#d04040', // red on white
        'tughlaq-dynasty':     '#23653a', // forest green
        'vikings':             '#a83c34', // raven red on black
        'scots':               '#3b6cb4'  // St. Andrew's blue
    };

    function getCompareColor(civId) {
        if (CIV_COMPARE_COLORS[civId]) return CIV_COMPARE_COLORS[civId];
        // Fallback for unknown civ IDs: deterministic HSL derived from index
        const idx = typeof civilizations !== 'undefined'
            ? civilizations.findIndex(c => c.id === civId)
            : 0;
        const total = typeof civilizations !== 'undefined' ? civilizations.length : 22;
        let hue = (idx * 360 / total) % 360;
        if (hue >= 25 && hue <= 55) hue = (hue + 180) % 360;
        return `hsl(${hue}, 68%, 62%)`;
    }

    function attachCompareHandlers() {
        const toggle = document.getElementById('civs-compare-toggle');
        const selectAll = document.getElementById('civs-compare-all');
        const clearAll = document.getElementById('civs-compare-clear');
        const showPoints = document.getElementById('civs-compare-show-points');
        if (toggle) toggle.addEventListener('click', togglleComparePanel);
        if (selectAll) selectAll.addEventListener('click', selectAllCompare);
        if (clearAll) clearAll.addEventListener('click', clearAllCompare);
        if (showPoints) {
            showPoints.checked = compareShowPoints;
            showPoints.addEventListener('change', () => {
                compareShowPoints = showPoints.checked;
                renderTimelineGrid();
            });
        }
    }

    function togglleComparePanel() {
        const panel = document.getElementById('civs-compare-panel');
        const all = document.getElementById('civs-compare-all');
        const clear = document.getElementById('civs-compare-clear');
        const toggle = document.getElementById('civs-compare-toggle');
        const showPoints = document.querySelector('.civs-compare-points-toggle');
        if (!panel) return;
        const opening = panel.style.display === 'none';
        if (opening) renderComparePanel();
        panel.style.display = opening ? 'grid' : 'none';
        if (all) all.style.display = opening ? 'inline-block' : 'none';
        if (clear) clear.style.display = opening ? 'inline-block' : 'none';
        if (showPoints) showPoints.style.display = opening ? 'inline-flex' : 'none';
        if (toggle) toggle.textContent = opening ? 'Hide comparison panel' : 'Compare with other civs';
    }

    function renderComparePanel() {
        const panel = document.getElementById('civs-compare-panel');
        if (!panel || typeof civilizations === 'undefined') return;
        panel.innerHTML = '';
        civilizations.forEach(civ => {
            if (civ.id === currentCivId) return;
            const isChecked = compareCivIds.has(civ.id);
            const flagPath = getCivFlag(civ.id);
            const flagHtml = flagPath
                ? `<img src="${flagPath}" class="civs-compare-flag" alt="${civ.name}">`
                : '';
            const label = document.createElement('label');
            label.className = 'civs-compare-option';
            label.innerHTML = `
                <input type="checkbox" data-civ="${civ.id}" ${isChecked ? 'checked' : ''}>
                <span class="civs-compare-swatch" style="background:${getCompareColor(civ.id)}"></span>
                ${flagHtml}
                <span class="civs-compare-name">${civ.name}</span>
            `;
            const input = label.querySelector('input');
            input.addEventListener('change', () => onCompareToggle(civ.id, input.checked));
            panel.appendChild(label);
        });
    }

    async function onCompareToggle(civId, checked) {
        if (checked) {
            compareCivIds.add(civId);
            await loadCompareData(civId);
        } else {
            compareCivIds.delete(civId);
        }
        renderCompareLegend();
        renderTimelineGrid();
    }

    async function selectAllCompare() {
        if (typeof civilizations === 'undefined') return;
        const ids = civilizations.filter(c => c.id !== currentCivId).map(c => c.id);
        ids.forEach(id => compareCivIds.add(id));
        await Promise.all(ids.map(id => loadCompareData(id)));
        renderComparePanel();
        renderCompareLegend();
        renderTimelineGrid();
    }

    function clearAllCompare() {
        compareCivIds.clear();
        renderComparePanel();
        renderCompareLegend();
        renderTimelineGrid();
    }

    async function loadCompareData(civId) {
        if (compareDataCache.has(civId)) return;
        const raw = await readCivDataFile(civId);
        compareDataCache.set(civId, {
            timelinePoints: Array.isArray(raw?.timelinePoints) ? raw.timelinePoints : []
        });
    }

    function renderCompareLegend() {
        const legend = document.getElementById('civs-compare-legend');
        if (!legend) return;
        legend.innerHTML = '';
        if (compareCivIds.size === 0) return;
        if (typeof civilizations === 'undefined') return;

        compareCivIds.forEach(civId => {
            const civ = civilizations.find(c => c.id === civId);
            if (!civ) return;
            const flagPath = getCivFlag(civ.id);
            const flagHtml = flagPath
                ? `<img src="${flagPath}" class="civs-compare-flag" alt="${civ.name}">`
                : '';
            const chip = document.createElement('span');
            chip.className = 'civs-compare-chip';
            chip.innerHTML = `
                <span class="civs-compare-swatch" style="background:${getCompareColor(civ.id)}"></span>
                ${flagHtml}
                <span class="civs-compare-name">${civ.name}</span>
                <button type="button" class="civs-compare-remove" aria-label="Remove ${civ.name}">×</button>
            `;
            chip.querySelector('.civs-compare-remove').addEventListener('click', () => {
                onCompareToggle(civ.id, false);
                renderComparePanel();
            });
            legend.appendChild(chip);
        });
    }

    // Draw ribbons + small circles for a compare civ at reduced emphasis
    function renderCompareLayer(svg, points, color) {
        if (!points || points.length === 0) return;
        const ns = 'http://www.w3.org/2000/svg';

        const byX = new Map();
        points.forEach(pt => {
            if (!byX.has(pt.x)) byX.set(pt.x, []);
            byX.get(pt.x).push(pt);
        });
        const columns = [...byX.keys()].sort((a, b) => a - b).map(x => {
            const ys = byX.get(x).map(p => p.y);
            return { x, yMin: Math.min(...ys), yMax: Math.max(...ys) };
        });
        const colX = c => LABEL_LEFT + c * CELL + CELL / 2;
        const rowY = r => LABEL_TOP + r * CELL + CELL / 2;

        for (let i = 0; i < columns.length - 1; i++) {
            const a = columns[i];
            const b = columns[i + 1];
            const aSingle = a.yMin === a.yMax;
            const bSingle = b.yMin === b.yMax;
            if (aSingle && bSingle) {
                const line = document.createElementNS(ns, 'line');
                line.setAttribute('x1', colX(a.x));
                line.setAttribute('y1', rowY(a.yMin));
                line.setAttribute('x2', colX(b.x));
                line.setAttribute('y2', rowY(b.yMin));
                line.setAttribute('stroke', color);
                line.setAttribute('stroke-width', '2');
                line.setAttribute('stroke-linecap', 'round');
                line.setAttribute('opacity', '0.75');
                line.setAttribute('pointer-events', 'none');
                svg.appendChild(line);
            } else {
                const polygon = document.createElementNS(ns, 'polygon');
                polygon.setAttribute('points', [
                    `${colX(a.x)},${rowY(a.yMin)}`,
                    `${colX(b.x)},${rowY(b.yMin)}`,
                    `${colX(b.x)},${rowY(b.yMax)}`,
                    `${colX(a.x)},${rowY(a.yMax)}`
                ].join(' '));
                polygon.setAttribute('fill', color);
                polygon.setAttribute('opacity', '0.18');
                polygon.setAttribute('pointer-events', 'none');
                svg.appendChild(polygon);
            }
        }

        if (compareShowPoints) {
            points.forEach(pt => {
                const circle = document.createElementNS(ns, 'circle');
                circle.setAttribute('cx', colX(pt.x));
                circle.setAttribute('cy', rowY(pt.y));
                circle.setAttribute('r', 5);
                circle.setAttribute('fill', color);
                circle.setAttribute('stroke', '#1a1a1a');
                circle.setAttribute('stroke-width', '1.5');
                circle.setAttribute('opacity', '0.9');
                circle.setAttribute('pointer-events', 'none');
                svg.appendChild(circle);
            });
        }
    }

    function populateCivsSelectDropdown() {
        const optionsContainer = document.getElementById('civs-select-options');
        if (!optionsContainer || typeof civilizations === 'undefined') return;

        optionsContainer.innerHTML = '';

        const placeholder = document.createElement('div');
        placeholder.className = 'dropdown-option';
        placeholder.innerHTML = '<span>Select civilization...</span>';
        placeholder.onclick = () => selectCivForCivsTab('', 'Select civilization...');
        optionsContainer.appendChild(placeholder);

        civilizations.forEach(civ => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.setAttribute('data-value', civ.id);
            const flagPath = getCivFlag(civ.id);
            const flagHtml = flagPath
                ? `<img src="${flagPath}" class="dropdown-flag" alt="${civ.name} flag">`
                : '';
            option.innerHTML = `${flagHtml}<span>${civ.name}</span>`;
            option.onclick = () => selectCivForCivsTab(civ.id, civ.name);
            optionsContainer.appendChild(option);
        });
    }

    async function selectCivForCivsTab(civId, civName) {
        closeCivsDropdown();

        const hiddenInput = document.getElementById('civs-select');
        const selectedText = document.getElementById('civs-select-text');
        const headerFlag = document.getElementById('civs-header-flag');
        const headerName = document.getElementById('civs-header-name');
        const body = document.getElementById('civs-body');

        if (hiddenInput) hiddenInput.value = civId;

        if (!civId) {
            if (selectedText) selectedText.innerHTML = 'Select civilization...';
            if (headerFlag) headerFlag.style.display = 'none';
            if (headerName) headerName.textContent = 'Select a civilization';
            if (body) body.style.display = 'none';
            const buildOrdersSlot = document.getElementById('civs-build-orders-slot');
            if (buildOrdersSlot) buildOrdersSlot.style.display = 'none';
            const header = headerFlag ? headerFlag.closest('.civs-header') : null;
            if (header) {
                header.style.removeProperty('background-image');
                header.style.removeProperty('background-size');
                header.style.removeProperty('background-position');
            }
            currentCivId = null;
            currentData = null;
            return;
        }

        const buildOrdersSlot = document.getElementById('civs-build-orders-slot');
        if (buildOrdersSlot) buildOrdersSlot.style.display = '';

        const flagPath = getCivFlag(civId);
        const flagHtml = flagPath
            ? `<img src="${flagPath}" class="dropdown-flag" alt="${civName} flag" style="margin-right: 0.5rem;">`
            : '';
        if (selectedText) selectedText.innerHTML = `${flagHtml}${civName}`;

        if (headerFlag) {
            if (flagPath) {
                headerFlag.src = flagPath;
                headerFlag.alt = civName;
                headerFlag.style.display = 'inline-block';
            } else {
                headerFlag.style.display = 'none';
            }
        }

        // Large flag as header backdrop once a civ is selected
        const header = headerFlag ? headerFlag.closest('.civs-header') : null;
        if (header) {
            const largeFlag = typeof getLargeCivFlag === 'function' ? getLargeCivFlag(civId) : null;
            if (largeFlag) {
                header.style.setProperty(
                    'background-image',
                    `linear-gradient(rgba(10, 32, 56, 0.55), rgba(10, 32, 56, 0.8)), url('Flags/Flags Large/${largeFlag}')`
                );
                header.style.backgroundSize = 'cover';
                header.style.backgroundPosition = 'center';
            } else {
                header.style.removeProperty('background-image');
                header.style.removeProperty('background-size');
                header.style.removeProperty('background-position');
            }
        }
        if (headerName) headerName.textContent = civName;
        if (body) body.style.display = 'flex';

        currentCivId = civId;
        // When switching main civ, drop it from the compare set if present
        if (compareCivIds.has(civId)) compareCivIds.delete(civId);
        await loadCivData(civId);
        renderCivsContent();
        renderComparePanel();
        renderCompareLegend();
        syncMyCivDropdown(civId, civName);
        syncBuildOrdersFilter(civId, civName);
    }

    function closeCivsDropdown() {
        const dropdown = document.getElementById('civs-select-dropdown');
        const options = document.getElementById('civs-select-options');
        if (options) options.classList.remove('active');
        if (dropdown) {
            const selectedEl = dropdown.querySelector('.dropdown-selected');
            if (selectedEl) selectedEl.classList.remove('active');
        }
    }

    function normalizeCivData(parsed) {
        const data = parsed || {};
        data.timelinePoints = Array.isArray(data.timelinePoints) ? data.timelinePoints : [];
        // Migrate legacy combined "strengthsWeaknesses" into "strengths"
        if (typeof data.strengthsWeaknesses === 'string' && data.strengthsWeaknesses.trim()) {
            if (!data.strengths) data.strengths = data.strengthsWeaknesses;
            delete data.strengthsWeaknesses;
        }
        SECTION_KEYS.forEach(k => { if (typeof data[k] !== 'string') data[k] = ''; });
        return data;
    }

    // Tries the user-writable location first (via Rust invoke), then falls
    // back to the embedded asset shipped inside the bundle.
    async function readCivDataFile(civId) {
        try {
            const content = await invoke('read_civ_data', { fileName: `${civId}.json` });
            if (content) return JSON.parse(content);
        } catch (err) {
            console.warn(`invoke read_civ_data failed for ${civId}:`, err);
        }
        try {
            const response = await fetch(`civ-data/${civId}.json`);
            if (response.ok) return await response.json();
        } catch (err) {
            console.warn(`fetch civ-data/${civId}.json failed:`, err);
        }
        return null;
    }

    async function loadCivData(civId) {
        const raw = await readCivDataFile(civId);
        currentData = raw ? normalizeCivData(raw) : defaultData(civId);
        if (!currentData.civId) currentData.civId = civId;
    }

    async function saveCivData() {
        if (!currentCivId || !currentData) return false;
        try {
            const content = JSON.stringify(currentData, null, 2);
            await invoke('write_civ_data', { fileName: `${currentCivId}.json`, content });
            console.log(`Saved civ data for ${currentCivId}`);
            return true;
        } catch (err) {
            console.error('Error saving civ data:', err);
            alert('Error saving: ' + err);
            return false;
        }
    }

    function scheduleTimelineSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveCivData, 300);
    }

    // --- Section rendering (View / Edit mode) ---

    function renderCivsContent() {
        if (!currentData) return;
        SECTION_KEYS.forEach(key => renderSection(key));
        renderTimelineGrid();
        renderNotesList();
    }

    function getSectionEl(key) {
        return document.querySelector(`.civs-section[data-section="${key}"]`);
    }

    function renderSection(key) {
        const section = getSectionEl(key);
        if (!section) return;
        const value = currentData?.[key] || '';
        const view = section.querySelector('[data-role="view"]');
        const edit = section.querySelector('[data-role="edit"]');
        const btnEdit = section.querySelector('[data-action="edit"]');
        const btnSave = section.querySelector('[data-action="save"]');

        if (value.trim().length > 0) {
            // View mode: saved content exists
            if (view) {
                view.innerHTML = renderMarkdown(value);
                view.style.display = 'block';
            }
            if (edit) edit.style.display = 'none';
            if (btnEdit) btnEdit.style.display = 'inline-block';
            if (btnSave) btnSave.style.display = 'none';
        } else {
            // Edit mode: empty, let user fill in
            if (view) view.style.display = 'none';
            if (edit) {
                edit.value = '';
                edit.style.display = 'block';
            }
            if (btnEdit) btnEdit.style.display = 'none';
            if (btnSave) btnSave.style.display = 'inline-block';
        }
    }

    function setSectionEditMode(key) {
        const section = getSectionEl(key);
        if (!section || !currentData) return;
        const view = section.querySelector('[data-role="view"]');
        const edit = section.querySelector('[data-role="edit"]');
        const btnEdit = section.querySelector('[data-action="edit"]');
        const btnSave = section.querySelector('[data-action="save"]');

        if (view) view.style.display = 'none';
        if (edit) {
            edit.value = currentData[key] || '';
            edit.style.display = 'block';
            edit.focus();
        }
        if (btnEdit) btnEdit.style.display = 'none';
        if (btnSave) btnSave.style.display = 'inline-block';
    }

    async function setSectionSaveMode(key) {
        const section = getSectionEl(key);
        if (!section || !currentData) return;
        const edit = section.querySelector('[data-role="edit"]');
        if (edit) currentData[key] = edit.value;
        const ok = await saveCivData();
        if (!ok) return;
        renderSection(key);
    }

    function attachSectionButtonHandlers() {
        document.querySelectorAll('.civs-section').forEach(section => {
            const key = section.getAttribute('data-section');
            if (!key) return;
            const btnEdit = section.querySelector('[data-action="edit"]');
            const btnSave = section.querySelector('[data-action="save"]');
            if (btnEdit) btnEdit.addEventListener('click', () => setSectionEditMode(key));
            if (btnSave) btnSave.addEventListener('click', () => setSectionSaveMode(key));
        });
    }

    // --- Timeline Grid ---

    const CELL = 56;
    const LABEL_LEFT = 90;
    const LABEL_TOP = 50;

    function renderTimelineGrid() {
        const svg = document.getElementById('civs-timeline-svg');
        if (!svg) return;

        const gridW = COLS * CELL;
        const gridH = ROWS * CELL;
        const W = LABEL_LEFT + gridW + 10;
        const H = LABEL_TOP + gridH + 10;

        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);
        svg.innerHTML = '';

        const ns = 'http://www.w3.org/2000/svg';

        // Highlight + dim overlays appended last so they sit on top of all other layers
        const highlightOverlays = [];
        const dimOverlays = [];

        function makeDimRect(x, y, w, h) {
            if (w <= 0 || h <= 0) return null;
            const r = document.createElementNS(ns, 'rect');
            r.setAttribute('x', x);
            r.setAttribute('y', y);
            r.setAttribute('width', w);
            r.setAttribute('height', h);
            r.setAttribute('class', 'civs-timeline-dim');
            r.setAttribute('opacity', '0');
            r.setAttribute('pointer-events', 'none');
            return r;
        }

        AGES.forEach((age, i) => {
            const x = LABEL_LEFT + i * 3 * CELL + (3 * CELL) / 2;
            const text = document.createElementNS(ns, 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', 18);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('class', 'civs-axis-label civs-axis-label-clickable');
            text.textContent = age;

            const highlight = document.createElementNS(ns, 'rect');
            highlight.setAttribute('x', LABEL_LEFT + i * 3 * CELL);
            highlight.setAttribute('y', LABEL_TOP);
            highlight.setAttribute('width', 3 * CELL);
            highlight.setAttribute('height', ROWS * CELL);
            highlight.setAttribute('class', 'civs-timeline-highlight');
            highlight.setAttribute('opacity', '0');
            highlight.setAttribute('pointer-events', 'none');
            highlightOverlays.push(highlight);

            const dims = [];
            const dimLeft = makeDimRect(LABEL_LEFT, LABEL_TOP, i * 3 * CELL, ROWS * CELL);
            const dimRight = makeDimRect(LABEL_LEFT + (i + 1) * 3 * CELL, LABEL_TOP, (COLS - (i + 1) * 3) * CELL, ROWS * CELL);
            if (dimLeft) { dims.push(dimLeft); dimOverlays.push(dimLeft); }
            if (dimRight) { dims.push(dimRight); dimOverlays.push(dimRight); }

            text.addEventListener('mouseenter', () => {
                highlight.setAttribute('opacity', '1');
                dims.forEach(d => d.setAttribute('opacity', '1'));
            });
            text.addEventListener('mouseleave', () => {
                highlight.setAttribute('opacity', '0');
                dims.forEach(d => d.setAttribute('opacity', '0'));
            });

            svg.appendChild(text);
        });

        for (let c = 0; c < COLS; c++) {
            const phase = PHASES[c % 3];
            const x = LABEL_LEFT + c * CELL + CELL / 2;
            const text = document.createElementNS(ns, 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', 40);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('class', 'civs-axis-sublabel');
            text.textContent = phase;
            svg.appendChild(text);
        }

        LEVELS.forEach((level, i) => {
            const y = LABEL_TOP + i * 3 * CELL + (3 * CELL) / 2;
            const text = document.createElementNS(ns, 'text');
            text.setAttribute('x', LABEL_LEFT - 12);
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', 'end');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('class', 'civs-axis-label civs-axis-label-clickable');
            text.textContent = level;

            const highlight = document.createElementNS(ns, 'rect');
            highlight.setAttribute('x', LABEL_LEFT);
            highlight.setAttribute('y', LABEL_TOP + i * 3 * CELL);
            highlight.setAttribute('width', COLS * CELL);
            highlight.setAttribute('height', 3 * CELL);
            highlight.setAttribute('class', 'civs-timeline-highlight');
            highlight.setAttribute('opacity', '0');
            highlight.setAttribute('pointer-events', 'none');
            highlightOverlays.push(highlight);

            const dims = [];
            const dimAbove = makeDimRect(LABEL_LEFT, LABEL_TOP, COLS * CELL, i * 3 * CELL);
            const dimBelow = makeDimRect(LABEL_LEFT, LABEL_TOP + (i + 1) * 3 * CELL, COLS * CELL, (ROWS - (i + 1) * 3) * CELL);
            if (dimAbove) { dims.push(dimAbove); dimOverlays.push(dimAbove); }
            if (dimBelow) { dims.push(dimBelow); dimOverlays.push(dimBelow); }

            text.addEventListener('mouseenter', () => {
                highlight.setAttribute('opacity', '1');
                dims.forEach(d => d.setAttribute('opacity', '1'));
            });
            text.addEventListener('mouseleave', () => {
                highlight.setAttribute('opacity', '0');
                dims.forEach(d => d.setAttribute('opacity', '0'));
            });

            svg.appendChild(text);
        });

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const rect = document.createElementNS(ns, 'rect');
                rect.setAttribute('x', LABEL_LEFT + c * CELL);
                rect.setAttribute('y', LABEL_TOP + r * CELL);
                rect.setAttribute('width', CELL);
                rect.setAttribute('height', CELL);
                rect.setAttribute('class', 'civs-timeline-cell');
                rect.setAttribute('data-col', c);
                rect.setAttribute('data-row', r);

                rect.addEventListener('click', () => onCellClick(c, r));
                rect.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    onCellRightClick(c, r);
                });
                rect.addEventListener('mouseenter', (e) => showCellTooltip(c, r, e.target));
                rect.addEventListener('mouseleave', hideCellTooltip);

                svg.appendChild(rect);
            }
        }

        const border = document.createElementNS(ns, 'rect');
        border.setAttribute('x', LABEL_LEFT);
        border.setAttribute('y', LABEL_TOP);
        border.setAttribute('width', gridW);
        border.setAttribute('height', gridH);
        border.setAttribute('class', 'civs-timeline-border');
        svg.appendChild(border);

        // Render comparison civs first so the main civ stays on top
        compareCivIds.forEach(civId => {
            const data = compareDataCache.get(civId);
            if (!data) return;
            renderCompareLayer(svg, data.timelinePoints, getCompareColor(civId));
        });

        // Group points by X column to derive Y-ranges per column
        const byX = new Map();
        (currentData?.timelinePoints || []).forEach(pt => {
            if (!byX.has(pt.x)) byX.set(pt.x, []);
            byX.get(pt.x).push(pt);
        });
        const columns = [...byX.keys()].sort((a, b) => a - b).map(x => {
            const ys = byX.get(x).map(p => p.y);
            return { x, yMin: Math.min(...ys), yMax: Math.max(...ys) };
        });

        const colX = c => LABEL_LEFT + c * CELL + CELL / 2;
        const rowY = r => LABEL_TOP + r * CELL + CELL / 2;

        // Connect consecutive columns: line if both are single points, ribbon otherwise
        for (let i = 0; i < columns.length - 1; i++) {
            const a = columns[i];
            const b = columns[i + 1];
            const aSingle = a.yMin === a.yMax;
            const bSingle = b.yMin === b.yMax;

            if (aSingle && bSingle) {
                const line = document.createElementNS(ns, 'line');
                line.setAttribute('x1', colX(a.x));
                line.setAttribute('y1', rowY(a.yMin));
                line.setAttribute('x2', colX(b.x));
                line.setAttribute('y2', rowY(b.yMin));
                line.setAttribute('class', 'civs-timeline-line');
                line.setAttribute('pointer-events', 'none');
                svg.appendChild(line);
            } else {
                const polygon = document.createElementNS(ns, 'polygon');
                polygon.setAttribute('points', [
                    `${colX(a.x)},${rowY(a.yMin)}`,
                    `${colX(b.x)},${rowY(b.yMin)}`,
                    `${colX(b.x)},${rowY(b.yMax)}`,
                    `${colX(a.x)},${rowY(a.yMax)}`
                ].join(' '));
                polygon.setAttribute('class', 'civs-timeline-ribbon');
                polygon.setAttribute('pointer-events', 'none');
                svg.appendChild(polygon);
            }
        }

        (currentData?.timelinePoints || []).forEach(pt => {
            const circle = document.createElementNS(ns, 'circle');
            circle.setAttribute('cx', LABEL_LEFT + pt.x * CELL + CELL / 2);
            circle.setAttribute('cy', LABEL_TOP + pt.y * CELL + CELL / 2);
            circle.setAttribute('r', 9);
            const cls = pt.note
                ? 'civs-timeline-point civs-timeline-point-note'
                : 'civs-timeline-point';
            circle.setAttribute('class', cls);
            circle.addEventListener('mousedown', (e) => onPointMouseDown(e, pt, circle, svg));
            circle.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                onCellRightClick(pt.x, pt.y);
            });
            circle.addEventListener('mouseenter', () => showCellTooltip(pt.x, pt.y, circle));
            circle.addEventListener('mouseleave', hideCellTooltip);
            svg.appendChild(circle);
        });

        // Dim overlays sit above the data layers; highlight outlines on top of dims
        dimOverlays.forEach(rect => svg.appendChild(rect));
        highlightOverlays.forEach(rect => svg.appendChild(rect));
    }

    function svgPointFromEvent(svg, clientX, clientY) {
        const rect = svg.getBoundingClientRect();
        const vb = svg.viewBox.baseVal;
        return {
            x: (clientX - rect.left) * (vb.width / rect.width),
            y: (clientY - rect.top) * (vb.height / rect.height)
        };
    }

    function onPointMouseDown(e, pt, circle, svg) {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        dragState = {
            point: pt,
            circle,
            svg,
            originX: pt.x,
            originY: pt.y,
            moved: false
        };

        circle.classList.add('civs-timeline-point-dragging');

        const move = (ev) => onDragMove(ev);
        const up = (ev) => {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
            onDragEnd(ev);
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    }

    function onDragMove(e) {
        if (!dragState) return;
        const p = svgPointFromEvent(dragState.svg, e.clientX, e.clientY);
        dragState.circle.setAttribute('cx', p.x);
        dragState.circle.setAttribute('cy', p.y);
        dragState.moved = true;
    }

    function onDragEnd(e) {
        if (!dragState) return;
        const { point, circle, svg, originX, originY, moved } = dragState;
        circle.classList.remove('civs-timeline-point-dragging');

        if (!moved) {
            // Treat as click -> remove point
            const idx = currentData.timelinePoints.indexOf(point);
            if (idx >= 0) currentData.timelinePoints.splice(idx, 1);
        } else {
            const p = svgPointFromEvent(svg, e.clientX, e.clientY);
            const col = Math.floor((p.x - LABEL_LEFT) / CELL);
            const row = Math.floor((p.y - LABEL_TOP) / CELL);
            const inGrid = col >= 0 && col < COLS && row >= 0 && row < ROWS;
            const occupied = inGrid && currentData.timelinePoints.some(
                p2 => p2 !== point && p2.x === col && p2.y === row
            );
            if (inGrid && !occupied) {
                point.x = col;
                point.y = row;
            } else {
                // Revert to origin
                point.x = originX;
                point.y = originY;
            }
        }

        dragState = null;
        renderTimelineGrid();
        renderNotesList();
        scheduleTimelineSave();
    }

    function onCellClick(col, row) {
        if (!currentData) return;
        const idx = currentData.timelinePoints.findIndex(p => p.x === col && p.y === row);
        if (idx >= 0) {
            currentData.timelinePoints.splice(idx, 1);
        } else {
            currentData.timelinePoints.push({ x: col, y: row, note: '' });
        }
        renderTimelineGrid();
        renderNotesList();
        scheduleTimelineSave();
    }

    function onCellRightClick(col, row) {
        if (!currentData) return;
        let pt = currentData.timelinePoints.find(p => p.x === col && p.y === row);
        const currentNote = pt?.note || '';
        const note = prompt(`Note for ${getCellLabel(col, row)}:`, currentNote);
        if (note === null) return;
        if (!pt) {
            pt = { x: col, y: row, note };
            currentData.timelinePoints.push(pt);
        } else {
            pt.note = note;
        }
        renderTimelineGrid();
        renderNotesList();
        scheduleTimelineSave();
    }

    function getCellLabel(col, row) {
        const age = AGES[Math.floor(col / 3)];
        const phase = PHASES[col % 3];
        const level = LEVELS[Math.floor(row / 3)];
        const sub = (row % 3) + 1;
        return `${age} / ${phase} · ${level} (${sub}/3)`;
    }

    function showCellTooltip(col, row, cellEl) {
        if (!currentData) return;
        const pt = currentData.timelinePoints.find(p => p.x === col && p.y === row);
        if (!pt || !pt.note) return;
        const tooltip = document.getElementById('civs-timeline-tooltip');
        const wrapper = document.getElementById('civs-timeline-wrapper');
        if (!tooltip || !wrapper) return;
        tooltip.textContent = pt.note;
        tooltip.style.display = 'block';
        const rect = cellEl.getBoundingClientRect();
        const wrapRect = wrapper.getBoundingClientRect();
        tooltip.style.left = (rect.left - wrapRect.left + rect.width / 2) + 'px';
        tooltip.style.top = (rect.top - wrapRect.top - 8) + 'px';
    }

    function hideCellTooltip() {
        const tooltip = document.getElementById('civs-timeline-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }

    function renderNotesList() {
        const list = document.getElementById('civs-notes-list');
        if (!list) return;
        const withNotes = (currentData?.timelinePoints || [])
            .filter(p => p.note)
            .sort((a, b) => a.x - b.x || a.y - b.y);

        if (withNotes.length === 0) {
            list.innerHTML = '<p class="civs-notes-empty">No notes yet. Right-click a cell to add one.</p>';
            return;
        }

        list.innerHTML = withNotes.map(p => `
            <div class="civs-note-entry">
                <div class="civs-note-label">${escapeHtml(getCellLabel(p.x, p.y))}</div>
                <div class="civs-note-text">${escapeHtml(p.note)}</div>
            </div>
        `).join('');
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function formatInlineMarkdown(escaped) {
        return escaped.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    }

    // Render plain text with two markdown rules: lines starting with `-` become
    // bullets; **text** becomes bold. Input is escaped before transforming.
    function renderMarkdown(text) {
        const escaped = escapeHtml(text);
        const lines = escaped.split('\n');
        const out = [];
        let inList = false;
        const flushList = () => { if (inList) { out.push('</ul>'); inList = false; } };

        for (const line of lines) {
            const trimmed = line.trim();
            const bullet = /^-\s*(.*)$/.exec(trimmed);
            if (bullet) {
                if (!inList) { out.push('<ul class="civs-md-list">'); inList = true; }
                out.push(`<li>${formatInlineMarkdown(bullet[1])}</li>`);
            } else if (trimmed === '') {
                flushList();
            } else {
                flushList();
                out.push(`<div class="civs-md-line">${formatInlineMarkdown(line)}</div>`);
            }
        }
        flushList();
        return out.join('');
    }

    function moveMatchSetupToCivs() {
        const setup = document.querySelector('.quick-match-setup');
        const slot = document.getElementById('civs-match-setup-slot');
        if (!setup || !slot) return;
        if (setup.parentNode === slot) return;
        if (!matchSetupHome) {
            matchSetupHome = {
                parent: setup.parentNode,
                next: setup.nextSibling
            };
        }
        slot.appendChild(setup);
    }

    function moveMatchSetupBackToHome() {
        const setup = document.querySelector('.quick-match-setup');
        if (!setup || !matchSetupHome) return;
        if (setup.parentNode === matchSetupHome.parent) return;
        const { parent, next } = matchSetupHome;
        if (next && next.parentNode === parent) {
            parent.insertBefore(setup, next);
        } else {
            parent.appendChild(setup);
        }
    }

    // When the civ changes in the Civs tab header, also pre-select it
    // in the shared Match Setup (my-civ dropdown).
    function syncMyCivDropdown(civId, civName) {
        if (!civId) return;
        if (typeof selectCustomDropdownOption !== 'function') return;
        const flagPath = typeof getCivFlag === 'function' ? getCivFlag(civId) : null;
        // Ensure the Match Setup DOM is attached to the Civs tab before we touch it
        moveMatchSetupToCivs();
        try {
            selectCustomDropdownOption('my-civ', civId, civName, flagPath);
        } catch (err) {
            console.error('Error syncing my-civ:', err);
        }
    }

    function moveBuildOrdersToCivs() {
        const filter = document.querySelector('.build-orders-filter');
        const results = document.getElementById('filtered-build-orders');
        const slot = document.getElementById('civs-build-orders-slot');
        if (!filter || !results || !slot) return;
        if (!(filter.parentNode === slot && results.parentNode === slot)) {
            if (!buildOrdersHome) {
                buildOrdersHome = {
                    filterParent: filter.parentNode,
                    filterNext: filter.nextSibling,
                    resultsParent: results.parentNode,
                    resultsNext: results.nextSibling
                };
            }
            slot.appendChild(filter);
            slot.appendChild(results);
        }
        slot.style.display = currentCivId ? '' : 'none';
    }

    function moveBuildOrdersBackToHome() {
        const filter = document.querySelector('.build-orders-filter');
        const results = document.getElementById('filtered-build-orders');
        const slot = document.getElementById('civs-build-orders-slot');
        if (slot) slot.style.display = '';
        if (!filter || !results || !buildOrdersHome) return;
        const { filterParent, filterNext, resultsParent, resultsNext } = buildOrdersHome;
        if (filter.parentNode !== filterParent) {
            if (filterNext && filterNext.parentNode === filterParent) {
                filterParent.insertBefore(filter, filterNext);
            } else {
                filterParent.appendChild(filter);
            }
        }
        if (results.parentNode !== resultsParent) {
            if (resultsNext && resultsNext.parentNode === resultsParent) {
                resultsParent.insertBefore(results, resultsNext);
            } else {
                resultsParent.appendChild(results);
            }
        }
    }

    function syncBuildOrdersFilter(civId, civName) {
        if (!civId) return;
        if (typeof selectFilterCiv !== 'function') return;
        moveBuildOrdersToCivs();
        try {
            selectFilterCiv(civId, civName);
        } catch (err) {
            console.error('Error syncing build-orders filter:', err);
        }
    }

    window.initializeCivs = initializeCivs;
    window.populateCivsSelectDropdown = populateCivsSelectDropdown;
    window.moveMatchSetupToCivs = moveMatchSetupToCivs;
    window.getCompareColor = getCompareColor;
    window.moveMatchSetupBackToHome = moveMatchSetupBackToHome;
    window.moveBuildOrdersToCivs = moveBuildOrdersToCivs;
    window.moveBuildOrdersBackToHome = moveBuildOrdersBackToHome;
    window.syncCivsTabMyCiv = syncMyCivDropdown;
})();
