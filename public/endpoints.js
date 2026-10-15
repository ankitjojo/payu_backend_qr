const API_BASE_URL = '/api';

const endpoints = {
    initiateMandate: `${API_BASE_URL}/payments/initiate-mandate`,
    generateQR: `${API_BASE_URL}/payments/generate-qr`,
    generateUpiCollect: `${API_BASE_URL}/payments/generate-upi-collect`,
    verifyPayment: (txnid) => `${API_BASE_URL}/payments/verify/${txnid}`
};
