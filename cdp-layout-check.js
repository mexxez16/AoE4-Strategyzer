const http = require('http');

function getTargets() {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json/list', res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
    });
}

async function evaluate(ws, expr) {
    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 1e6);
        const onMessage = event => {
            const msg = JSON.parse(event.data);
            if (msg.id === id) {
                ws.removeEventListener('message', onMessage);
                if (msg.result?.exceptionDetails) return resolve('EXC: ' + (msg.result.exceptionDetails.exception?.description || msg.result.exceptionDetails.text));
                resolve(msg.result?.result?.value);
            }
        };
        ws.addEventListener('message', onMessage);
        ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
        setTimeout(() => reject(new Error('timeout')), 20000);
    });
}

(async () => {
    const targets = await getTargets();
    const page = targets.find(t => t.type === 'page' && /tauri\.localhost|http/.test(t.url) && !t.url.startsWith('devtools'));
    if (!page) { console.log('NO PAGE'); process.exit(1); }
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));
    await new Promise(r => setTimeout(r, 3000));

    // Switch to New Build Orders, show local form
    console.log('check local form layout:', await evaluate(ws, `
        (function() {
            selectBuildOrderType('create-local');
            const form = document.getElementById('create-local-form');
            const box = el => {
                if (!el) return 'MISSING';
                const r = el.getBoundingClientRect();
                return 'y ' + Math.round(r.top) + '..' + Math.round(r.bottom) + ' x ' + Math.round(r.left) + '..' + Math.round(r.right);
            };
            return JSON.stringify({
                formVisible: form && form.style.display,
                stepsTable: box(document.querySelector('#create-local-form .build-order-table-container')),
                saveBtn: box(Array.from(document.querySelectorAll('#create-local-form .form-actions .btn-primary')).find(b => b.textContent.includes('Save'))),
                clearBtn: box(Array.from(document.querySelectorAll('#create-local-form .form-actions .btn-secondary')).find(b => b.textContent.includes('Clear'))),
                saveParent: (document.querySelector('#create-local-form .form-actions').parentElement.className),
                saveParentBox: box(document.querySelector('#create-local-form .form-actions'))
            });
        })()`));

    // External form: what exists vs the edit-card (status)
    console.log('external form fields:', await evaluate(ws, `
        (function() {
            selectBuildOrderType('external');
            const formIds = Array.from(document.querySelectorAll('#external-form label, #external-form .group-label')).map(el => (el.getAttribute && el.getAttribute('for')) || el.textContent.trim());
            const btnSave = Array.from(document.querySelectorAll('#external-form .form-actions button')).map(b => b.textContent.trim());
            return JSON.stringify({ fields: formIds, buttons: btnSave });
        })()`));

    // edit card (library): fields present there
    console.log('edit card status field sample:', await evaluate(ws, `
        (function() {
            const help = document.querySelector('.form-help');
            return help ? help.textContent.trim() : 'no sample in DOM';
        })()`));
    
    ws.close();
    process.exit(0);
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
