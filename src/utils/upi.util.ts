import { DeviceInfo, UpiAppInfo } from '../core/interfaces/payu.interface';

/**
 * Normalizes a raw PayU intent string (or complete URI) into a valid upi://pay URI.
 */
export function buildUpiPaymentUri(intentData: string): string | null {
  if (typeof intentData !== 'string' || !intentData.trim()) return null;
  const value = intentData.trim();
  const query = value.replace(/^upi:\/\/pay\?/i, '').replace(/^\?/, '');
  const params = new URLSearchParams(query);
  if (!params.get('pa')) return null;
  return `upi://pay?${params.toString().replace(/\+/g, '%20')}`;
}

/**
 * Extracts query parameters from a UPI payment URI.
 */
export function extractUpiQuery(upiUri: string): string {
  const normalized = buildUpiPaymentUri(upiUri) || upiUri;
  return normalized.replace(/^upi:\/\/pay\?/i, '').replace(/^\?/, '');
}

/**
 * Detects device information from user-agent string.
 */
export function detectDevice(userAgent: string = ''): DeviceInfo {
  const ua = userAgent.toLowerCase();
  const isAndroid = ua.includes('android');
  const isIos = ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod');
  const isMobile = isAndroid || isIos || ua.includes('mobile');

  let os: DeviceInfo['os'] = 'other';
  if (isAndroid) os = 'android';
  else if (isIos) os = 'ios';
  else if (!isMobile) os = 'desktop';

  let browser = 'unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'safari';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('edge') || ua.includes('edg')) browser = 'edge';

  return { isMobile, os, browser };
}

interface AppDefinition {
  id: string;
  name: string;
  shortName: string;
  scheme: string;
  packageName?: string | undefined;
  color: string;
  bgColor: string;
  isUniversal?: boolean | undefined;
}

const UPI_APP_DEFINITIONS: AppDefinition[] = [
  {
    id: 'generic',
    name: 'Any UPI App (System Chooser)',
    shortName: 'All UPI Apps',
    scheme: 'upi://pay',
    color: '#2e7d32',
    bgColor: '#e8f5e9',
    isUniversal: true,
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    shortName: 'GPay',
    scheme: 'tez://upi/pay',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    color: '#1a73e8',
    bgColor: '#e8f0fe',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    shortName: 'PhonePe',
    scheme: 'phonepe://pay',
    packageName: 'com.phonepe.app',
    color: '#5f259f',
    bgColor: '#f3e8fd',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    shortName: 'Paytm',
    scheme: 'paytmmp://pay',
    packageName: 'net.one97.paytm',
    color: '#00b9f5',
    bgColor: '#e6f7ff',
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    shortName: 'BHIM',
    scheme: 'bhim://pay',
    packageName: 'in.org.npci.upiapp',
    color: '#005a9c',
    bgColor: '#e1f0fa',
  },
  {
    id: 'cred',
    name: 'CRED UPI',
    shortName: 'CRED',
    scheme: 'cred://pay',
    packageName: 'com.dreamplug.androidapp',
    color: '#121212',
    bgColor: '#f0f0f0',
  },
  {
    id: 'amazonpay',
    name: 'Amazon Pay',
    shortName: 'Amazon Pay',
    scheme: 'amazonpay://upi/pay',
    packageName: 'in.amazon.mShop.android.shopping',
    color: '#ff9900',
    bgColor: '#fff8e6',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Pay',
    shortName: 'WhatsApp',
    scheme: 'whatsapp://pay',
    packageName: 'com.whatsapp',
    color: '#25d366',
    bgColor: '#e8f8f0',
  },
  {
    id: 'navi',
    name: 'Navi UPI',
    shortName: 'Navi',
    scheme: 'navi://upi/pay',
    packageName: 'com.navi.mutualfunds',
    color: '#0066cc',
    bgColor: '#e6f2ff',
  },
];

/**
 * Builds the supported payment apps list and their custom deep links from a UPI URI.
 */
export function getSupportedUpiApps(upiUri: string, userAgent: string = ''): UpiAppInfo[] {
  const query = extractUpiQuery(upiUri);
  const device = detectDevice(userAgent);

  return UPI_APP_DEFINITIONS.map(app => {
    let deepLink = `${app.scheme}?${query}`;
    let androidIntent: string | undefined;

    if (app.isUniversal) {
      deepLink = `upi://pay?${query}`;
      androidIntent = `intent://pay?${query}#Intent;scheme=upi;end`;
    } else if (app.packageName) {
      androidIntent = `intent://pay?${query}#Intent;scheme=upi;package=${app.packageName};end`;
    }

    // Determine the recommended launch URL based on device OS
    const recommendedLaunchUrl = device.os === 'android' && androidIntent
      ? androidIntent
      : deepLink;

    return {
      id: app.id,
      name: app.name,
      shortName: app.shortName,
      packageName: app.packageName,
      scheme: app.scheme,
      deepLink,
      androidIntent,
      recommendedLaunchUrl,
      color: app.color,
      bgColor: app.bgColor,
      isUniversal: app.isUniversal,
    };
  });
}
