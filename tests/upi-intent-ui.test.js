const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup(deviceType, userAgent, providerResult) {
    const elements = new Map();
    function element() {
        const classes = new Set();
        return {
            value: '', style: {}, children: [], listeners: {},
            classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
            addEventListener(event, handler) { this.listeners[event] = handler; },
            appendChild(child) { this.children.push(child); },
            setAttribute() {}, reportValidity: () => true,
            scrollIntoView() { this.scrolled = true; }, focus() { this.focused = true; },
        };
    }
    const get = id => {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
    };
    const calls = [];
    const qrValues = [];
    let initialize;
    const context = vm.createContext({
        URLSearchParams, console, navigator: { userAgent },
        document: { getElementById: get, createElement: element, addEventListener: (_, fn) => { initialize = fn; } },
        window: { location: { origin: 'http://localhost', href: '' } },
        fetch: async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return { ok: true, json: async () => providerResult }; },
        QRCode: { toDataURL: (uri, options, callback) => { qrValues.push(uri); callback(null, 'data:image/png;base64,test'); } },
        setInterval: () => 1, clearInterval() {}, alert: message => { throw new Error(message); },
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/endpoints.js'), 'utf8'), context);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/logic.js'), 'utf8'), context);
    get('deviceType').value = deviceType;
    get('selectedMethod').value = 'upi-intent';
    get('selectedType').value = 'one-time';
    get('amount').value = '1.00';
    initialize();
    return { get, calls, qrValues, context, submit: () => get('paymentJourneyForm').listeners.submit({ preventDefault() {} }) };
}

const uri = 'upi://pay?pa=merchant%40bank&am=1.00';
const app = { name: 'Any UPI App', shortName: 'All', isUniversal: true, deepLink: uri, androidIntent: 'intent://pay?pa=merchant%40bank&am=1.00#Intent;scheme=upi;end' };
const staticApp = { name: 'Google Pay', shortName: 'G', isUniversal: false, deepLink: 'tez://upi/pay?pa=merchant%40bank' };
const result = { success: true, txnid: 'test', intentUri: uri, supportedApps: [app, staticApp] };

test('template defaults device selection to Web', () => {
    const template = fs.readFileSync(path.join(__dirname, '../views/index.ejs'), 'utf8');
    assert.match(template, /<option value="web" selected>Web<\/option>/);
});

test('Web opens app chooser and QR without launching an app automatically', async () => {
    const ui = setup('web', 'Desktop', result);
    await ui.submit();
    assert.equal(ui.calls[0].url, '/api/payments/generate-upi-intent');
    assert.equal(ui.calls[0].body.deviceType, undefined);
    assert.equal(ui.get('upiIntentContainer').classList.contains('hidden'), false);
    assert.equal(ui.get('upiIntentContainer').focused, true);
    assert.equal(ui.get('upiAppsGrid').children.length, 1);
    assert.equal(ui.get('upiAppsGrid').children[0].children[1].textContent, 'Pay by any UPI app');
    assert.deepEqual(ui.qrValues, [uri]);
    assert.equal(ui.context.window.location.href, '');
    ui.get('upiAppsGrid').children[0].listeners.click({ preventDefault() {} });
    assert.equal(ui.context.window.location.href, '');
});

test('does not render static provider app names because the browser cannot verify installation', async () => {
    const ui = setup('android', 'Android', result);
    await ui.submit();
    assert.equal(ui.get('upiAppsGrid').children.length, 1);
    assert.equal(ui.get('upiAppsGrid').children[0].children[1].textContent, 'Pay by any UPI app');
});

test('Android launches generic chooser only on app-button click', async () => {
    const ui = setup('android', 'Android', result);
    await ui.submit();
    assert.equal(ui.context.window.location.href, '');
    assert.deepEqual(ui.qrValues, []);
    ui.get('upiAppsGrid').children[0].listeners.click({ preventDefault() {} });
    assert.equal(ui.context.window.location.href, app.androidIntent);
});

test('Web on mobile uses UPI deep links and keeps QR available', async () => {
    const ui = setup('web', 'Android', result);
    await ui.submit();
    ui.get('upiAppsGrid').children[0].listeners.click({ preventDefault() {} });
    assert.equal(ui.context.window.location.href, uri);
    assert.deepEqual(ui.qrValues, [uri]);
});

test('iOS does not open the generic UPI scheme and uses the QR fallback', async () => {
    const ui = setup('web', 'iPhone', result);
    await ui.submit();
    assert.equal(ui.get('upiAppsGrid').children[0].children[1].textContent, 'Show QR to Pay');
    assert.deepEqual(ui.qrValues, [uri]);
    ui.get('upiAppsGrid').children[0].listeners.click({ preventDefault() {} });
    assert.equal(ui.context.window.location.href, '');
    assert.ok(ui.qrValues.includes(uri));
});

test('selecting Android on desktop keeps QR fallback', async () => {
    const ui = setup('android', 'Desktop', result);
    await ui.submit();
    ui.get('upiAppsGrid').children[0].listeners.click({ preventDefault() {} });
    assert.equal(ui.context.window.location.href, '');
    assert.ok(ui.qrValues.includes(uri));
});
