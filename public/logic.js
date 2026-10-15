document.addEventListener('DOMContentLoaded', () => {
    // Set default dates to today and 1 year from now
    const startDateInput = document.getElementById('paymentStartDate');
    const endDateInput = document.getElementById('paymentEndDate');
    
    const today = new Date();
    startDateInput.value = today.toISOString().split('T')[0];
    
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);
    endDateInput.value = nextYear.toISOString().split('T')[0];

    const form = document.getElementById('mandateForm');
    const responseContainer = document.getElementById('responseContainer');
    const jsonResponse = document.getElementById('jsonResponse');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        // Gather data
        const payload = {
            amount: document.getElementById('amount').value,
            productinfo: document.getElementById('productinfo').value,
            firstname: document.getElementById('firstname').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            siDetails: {
                billingAmount: document.getElementById('billingAmount').value,
                billingCurrency: 'INR',
                billingCycle: document.getElementById('billingCycle').value,
                billingInterval: 1, // Example fixed value
                paymentStartDate: document.getElementById('paymentStartDate').value,
                paymentEndDate: document.getElementById('paymentEndDate').value,
            }
        };

        try {
            // Call backend API
            const response = await fetch(endpoints.initiateMandate, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (result.success) {
                // Show JSON response for debugging
                responseContainer.classList.remove('hidden');
                jsonResponse.textContent = JSON.stringify(result.data, null, 2);

                // Auto-submit form to PayU using the generated payload
                submitPayUForm(result.data);
            } else {
                alert('Failed to initiate mandate.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Check console.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Initiate Mandate Setup';
        }
    });

    const qrBtn = document.getElementById('qrBtn');

    qrBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        qrBtn.disabled = true;
        qrBtn.textContent = 'Processing...';

        // Gather data
        const payload = {
            amount: document.getElementById('amount').value,
            productinfo: document.getElementById('productinfo').value,
            firstname: document.getElementById('firstname').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            siDetails: {
                billingAmount: document.getElementById('billingAmount').value,
                billingCurrency: 'INR',
                billingCycle: document.getElementById('billingCycle').value,
                billingInterval: 1, // Example fixed value
                paymentStartDate: document.getElementById('paymentStartDate').value,
                paymentEndDate: document.getElementById('paymentEndDate').value,
            }
        };

        try {
            // Call backend API
            const response = await fetch(endpoints.generateQR, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (result.success) {
                // Show JSON response for debugging
                responseContainer.classList.remove('hidden');
                jsonResponse.textContent = JSON.stringify(result.data, null, 2);

                const payuResponse = result.data;
                const intentStr = (payuResponse && payuResponse.result) ? (payuResponse.result.intentURIData || payuResponse.result.intentUrl || payuResponse.result.qrString) : null;
                
                if (intentStr) {
                    const redirectText = document.getElementById('redirectText');
                    if (redirectText) redirectText.style.display = 'none';
                    
                    document.getElementById('qrCodeContainer').style.display = 'block';
                    
                    // Generate QR image securely and instantly on the frontend
                    QRCode.toDataURL(intentStr, { width: 250, margin: 2 }, function (err, url) {
                        if (err) {
                            console.error('QR Generation Error:', err);
                            return;
                        }
                        document.getElementById('qrImage').src = url;
                        document.getElementById('qrIntentText').textContent = intentStr;
                    });

                    // Start polling backend verify API until payment is approved or failed
                    const activeTxnid = result.txnid || (payuResponse && payuResponse.metaData && payuResponse.metaData.txnId);
                    startPolling(activeTxnid, payload.amount);
                } else if (typeof payuResponse === 'string' && payuResponse.includes('html')) {
                    // Fallback if UPI Intent S2S is not enabled or returns HTML
                    alert('UPI Intent S2S returned checkout HTML. Falling back to PayU Hosted Checkout.');
                    document.write(payuResponse);
                } else {
                    alert('Failed to generate Intent QR. Check JSON response for details.');
                }
            } else {
                alert('Failed to generate QR mandate.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Check console.');
        } finally {
            qrBtn.disabled = false;
            qrBtn.textContent = 'Generate QR Mandate';
        }
    });

    const upiCollectBtn = document.getElementById('upiCollectBtn');

    upiCollectBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        upiCollectBtn.disabled = true;
        upiCollectBtn.textContent = 'Processing...';

        const payload = {
            amount: document.getElementById('amount').value,
            productinfo: document.getElementById('productinfo').value,
            firstname: document.getElementById('firstname').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            vpa: document.getElementById('vpa').value,
            siDetails: {
                billingAmount: document.getElementById('billingAmount').value,
                billingCurrency: 'INR',
                billingCycle: document.getElementById('billingCycle').value,
                billingInterval: 1,
                paymentStartDate: document.getElementById('paymentStartDate').value,
                paymentEndDate: document.getElementById('paymentEndDate').value,
            }
        };

        try {
            const response = await fetch(endpoints.generateUpiCollect, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (result.success) {
                responseContainer.classList.remove('hidden');
                jsonResponse.textContent = JSON.stringify(result.data, null, 2);
                
                const payuResponse = result.data;
                if (typeof payuResponse === 'string' && payuResponse.includes('html')) {
                    alert('S2S UPI Collect is not enabled. Falling back to Hosted Checkout.');
                    document.write(payuResponse);
                } else {
                    document.getElementById('qrCodeContainer').style.display = 'block';
                    document.getElementById('qrIntentText').textContent = "UPI Collect Request Sent to " + payload.vpa;
                    document.getElementById('qrImage').style.display = 'none'; // hide QR for collect

                    // Start polling backend verify API until customer approves collect request
                    const activeTxnid = result.txnid || (payuResponse && payuResponse.metaData && payuResponse.metaData.txnId);
                    startPolling(activeTxnid, payload.amount);
                }
            } else {
                alert('Failed to setup mandate via UPI ID.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Check console.');
        } finally {
            upiCollectBtn.disabled = false;
            upiCollectBtn.textContent = 'Setup Mandate via UPI ID';
        }
    });

    let pollInterval = null;

    function startPolling(txnid, amount) {
        if (!txnid) return;
        if (pollInterval) clearInterval(pollInterval);

        let statusNotice = document.getElementById('paymentStatusNotice');
        if (!statusNotice) {
            statusNotice = document.createElement('div');
            statusNotice.id = 'paymentStatusNotice';
            statusNotice.style.marginTop = '15px';
            statusNotice.style.padding = '12px';
            statusNotice.style.borderRadius = '6px';
            statusNotice.style.fontWeight = 'bold';
            statusNotice.style.textAlign = 'center';
            document.getElementById('qrCodeContainer').appendChild(statusNotice);
        }
        statusNotice.style.background = '#e3f2fd';
        statusNotice.style.color = '#0d47a1';
        statusNotice.style.border = '1px solid #90caf9';
        statusNotice.textContent = '⏳ Waiting for payment... Approve the mandate on your UPI app.';

        let attempts = 0;
        const maxAttempts = 100; // ~5 minutes

        pollInterval = setInterval(async () => {
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(pollInterval);
                statusNotice.textContent = '⚠️ Payment session timed out. Please try again.';
                statusNotice.style.background = '#fff3e0';
                statusNotice.style.color = '#e65100';
                return;
            }

            try {
                const res = await fetch(endpoints.verifyPayment(txnid));
                const resData = await res.json();
                
                if (resData.success && resData.status) {
                    const status = resData.status.toLowerCase();
                    if (status === 'success' || status === 'captured') {
                        clearInterval(pollInterval);
                        statusNotice.textContent = '✅ Payment Successful! Redirecting to confirmation...';
                        statusNotice.style.background = '#e8f5e9';
                        statusNotice.style.color = '#2e7d32';
                        setTimeout(() => {
                            window.location.href = `/success?txnid=${encodeURIComponent(txnid)}&status=success&amount=${encodeURIComponent(amount || '')}`;
                        }, 1200);
                    } else if (status === 'failure' || status === 'failed') {
                        clearInterval(pollInterval);
                        statusNotice.textContent = '❌ Payment Failed! Redirecting...';
                        statusNotice.style.background = '#ffebee';
                        statusNotice.style.color = '#c62828';
                        setTimeout(() => {
                            window.location.href = `/failure?txnid=${encodeURIComponent(txnid)}&error=Payment+Failed`;
                        }, 1200);
                    }
                }
            } catch (err) {
                console.error('Verify poll error:', err);
            }
        }, 3000);
    }
});

/**
 * Creates a hidden form dynamically and submits it to PayU
 * @param {Object} payuData The payload generated by the backend
 */
function submitPayUForm(payuData) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payuData.url;
    
    // Add all keys from payuData as hidden inputs except 'url'
    for (const key in payuData) {
        if (key !== 'url' && payuData.hasOwnProperty(key)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = payuData[key];
            form.appendChild(input);
        }
    }

    document.body.appendChild(form);
    
    // Small delay to allow user to see the JSON payload before redirect
    setTimeout(() => {
        form.submit();
    }, 2000);
}
