const API_BASE_URL = '/api';

const endpoints = {
    initiateMandate: `${API_BASE_URL}/payments/initiate-mandate`,
    initiatePayment: `${API_BASE_URL}/payments/initiate-payment`,
    generateOneTimeQR: `${API_BASE_URL}/payments/generate-qr-one-time`,
    generateQR: `${API_BASE_URL}/payments/generate-qr`,
    generateUpiIntent: `${API_BASE_URL}/payments/generate-upi-intent`,
    supportedUpiApps: `${API_BASE_URL}/payments/supported-upi-apps`,
    validateVpa: `${API_BASE_URL}/payments/validate-vpa`,
    generateUpiCollect: `${API_BASE_URL}/payments/generate-upi-collect`,
    verifyPayment: (txnid) => `${API_BASE_URL}/payments/verify/${txnid}`
};
