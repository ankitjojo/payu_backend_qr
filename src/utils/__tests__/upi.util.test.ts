import {
  buildUpiPaymentUri,
  extractUpiQuery,
  detectDevice,
  getSupportedUpiApps,
} from '../upi.util';

describe('UPI Utility', () => {
  describe('buildUpiPaymentUri', () => {
    it('normalizes query-only intent into upi://pay URI', () => {
      const raw = 'pa=merchant@icici&pn=Test%20Merchant&am=10.00&cu=INR&tr=TXN123';
      const uri = buildUpiPaymentUri(raw);
      expect(uri).toBe('upi://pay?pa=merchant%40icici&pn=Test%20Merchant&am=10.00&cu=INR&tr=TXN123');
    });

    it('preserves existing upi://pay URI', () => {
      const uri = 'upi://pay?pa=merchant%40icici&pn=Test&am=5.00&cu=INR';
      expect(buildUpiPaymentUri(uri)).toBe(uri);
    });

    it('returns null if pa is missing', () => {
      expect(buildUpiPaymentUri('pn=Test&am=5.00')).toBeNull();
      expect(buildUpiPaymentUri('')).toBeNull();
    });
  });

  describe('extractUpiQuery', () => {
    it('extracts query string from upi://pay URI', () => {
      const uri = 'upi://pay?pa=demo@bank&pn=Demo&am=1.00';
      const query = extractUpiQuery(uri);
      expect(query).toContain('pa=demo%40bank');
      expect(query).toContain('am=1.00');
    });
  });

  describe('detectDevice', () => {
    it('detects Android Chrome', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';
      const info = detectDevice(ua);
      expect(info.isMobile).toBe(true);
      expect(info.os).toBe('android');
      expect(info.browser).toBe('chrome');
    });

    it('detects iPhone Safari', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1';
      const info = detectDevice(ua);
      expect(info.isMobile).toBe(true);
      expect(info.os).toBe('ios');
      expect(info.browser).toBe('safari');
    });

    it('detects Desktop Chrome', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
      const info = detectDevice(ua);
      expect(info.isMobile).toBe(false);
      expect(info.os).toBe('desktop');
      expect(info.browser).toBe('chrome');
    });
  });

  describe('getSupportedUpiApps', () => {
    const upiUri = 'upi://pay?pa=payu@icici&pn=PayU&am=1.00&cu=INR&tr=TXN001';

    it('generates app links for major UPI apps', () => {
      const apps = getSupportedUpiApps(upiUri, 'desktop');
      const appIds = apps.map(a => a.id);
      expect(appIds).toContain('generic');
      expect(appIds).toContain('gpay');
      expect(appIds).toContain('phonepe');
      expect(appIds).toContain('paytm');
      expect(appIds).toContain('bhim');
      expect(appIds).toContain('cred');
      expect(appIds).toContain('amazonpay');
      expect(appIds).toContain('whatsapp');
    });

    it('formats Google Pay tez scheme and Android intent on Android user agent', () => {
      const androidUa = 'Mozilla/5.0 (Linux; Android 14; Mobile) Chrome/120.0';
      const apps = getSupportedUpiApps(upiUri, androidUa);
      const gpay = apps.find(a => a.id === 'gpay');
      expect(gpay).toBeDefined();
      expect(gpay?.scheme).toBe('tez://upi/pay');
      expect(gpay?.packageName).toBe('com.google.android.apps.nbu.paisa.user');
      expect(gpay?.androidIntent).toContain('intent://pay?');
      expect(gpay?.androidIntent).toContain('package=com.google.android.apps.nbu.paisa.user');
      expect(gpay?.recommendedLaunchUrl).toBe(gpay?.androidIntent);
    });

    it('recommends custom scheme on iOS user agent', () => {
      const iosUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)';
      const apps = getSupportedUpiApps(upiUri, iosUa);
      const phonepe = apps.find(a => a.id === 'phonepe');
      expect(phonepe).toBeDefined();
      expect(phonepe?.recommendedLaunchUrl).toBe(phonepe?.deepLink);
      expect(phonepe?.deepLink).toContain('phonepe://pay?');
    });
  });
});

const mandateUri = 'upi://mandate?pa=merchant@icici&pn=Merchant%20Name&am=2.00&fam=1.00&recur=MONTHLY&validitystart=05112026&validityend=05112029&txnType=CREATE';

it('preserves a complete PayU mandate URI and its billing parameters', () => {
  expect(buildUpiPaymentUri(mandateUri)).toBe(mandateUri);
  expect(extractUpiQuery(mandateUri)).toBe(mandateUri.split('?')[1]);
});

it('keeps mandate app launches on the mandate action', () => {
  const apps = getSupportedUpiApps(mandateUri, 'Android');
  expect(apps).toHaveLength(1);
  expect(apps[0]?.deepLink).toBe(mandateUri);
  expect(apps[0]?.recommendedLaunchUrl).toBe(
    `intent://mandate?${mandateUri.split('?')[1]}#Intent;scheme=upi;end`,
  );
});

it.each(['https://example.com?pa=merchant@bank', 'upi://unknown?pa=merchant@bank']) (
  'rejects unsupported intent schemes: %s', uri => {
    expect(buildUpiPaymentUri(uri)).toBeNull();
  },
);


it.each([
  'pa=merchant@bank&pn=Merchant Name&am=1.00',
  '?pa=merchant@bank&pn=Merchant+Name&am=1.00',
  'upi://pay?pa=merchant@bank&pn=Merchant%20Name&am=1.00',
  'UPI://PAY?pa=merchant@bank&pn=Merchant+Name&am=1.00',
])('retains one-time URI normalization: %s', raw => {
  expect(buildUpiPaymentUri(raw)).toBe('upi://pay?pa=merchant%40bank&pn=Merchant%20Name&am=1.00');
});
