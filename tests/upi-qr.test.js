const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const context = vm.createContext({ URLSearchParams, document: { addEventListener() {} } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/logic.js'), 'utf8'), context);
const buildUri = context.buildUpiPaymentUri;

test('turns PayU query-only data into a UPI URI and preserves transaction values', () => {
    const raw = 'pa=merchant@bank&pn=MERCHANT NAME&tr=31654005833&tid=PPPL123&am=1.00&cu=INR&tn=UPIIntent';
    const uri = buildUri(raw);
    assert.ok(uri.startsWith('upi://pay?'));
    assert.ok(uri.includes('pn=MERCHANT%20NAME'));
    assert.deepEqual([...new URL(uri).searchParams], [...new URLSearchParams(raw)]);
});

test('does not double-prefix or double-encode a complete UPI URI', () => {
    const uri = 'upi://pay?pa=merchant%40bank&pn=Merchant%20%26%20Co&am=1.00';
    assert.equal(buildUri(uri), uri);
});

test('rejects missing or invalid intent data', () => {
    for (const value of [undefined, null, {}, '', '   ', 'not a payment', 'am=1.00']) {
        assert.equal(buildUri(value), null);
    }
});


test('preserves PayU subscription mandate URI for QR rendering', () => {
    const uri = 'upi://mandate?pa=merchant@icici&pn=Merchant%20Name&mn=UPISubscription&am=2.00&fam=1.00&amrule=MAX&recur=MONTHLY&recurvalue=1&recurtype=AFTER&validitystart=05112026&validityend=05112029&txnType=CREATE';
    assert.equal(buildUri(uri), uri);
});

test('rejects unsupported schemes and mandates without a payee', () => {
    for (const uri of ['https://example.com?pa=merchant@bank', 'upi://unknown?pa=merchant@bank', 'upi://mandate?am=2.00']) {
        assert.equal(buildUri(uri), null);
    }
});


test('retains one-time normalization for query-only and complete payment URIs', () => {
    for (const raw of [
        'pa=merchant@bank&pn=Merchant Name&am=1.00',
        '?pa=merchant@bank&pn=Merchant+Name&am=1.00',
        'upi://pay?pa=merchant@bank&pn=Merchant%20Name&am=1.00',
        'UPI://PAY?pa=merchant@bank&pn=Merchant+Name&am=1.00',
    ]) {
        assert.equal(buildUri(raw), 'upi://pay?pa=merchant%40bank&pn=Merchant%20Name&am=1.00');
    }
});
