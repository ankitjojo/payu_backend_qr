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
        if (paymentType.value === 'one-time') {
            qrBtn.click();
            return;
        }
        
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

    const paymentType = document.getElementById('paymentType');
    const siDetailsFields = document.getElementById('siDetailsFields');
    const collectButton = document.getElementById('upiCollectBtn');
    const actionButtons = [submitBtn, qrBtn, collectButton];

    function resetPaymentDisplay() {
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = null;
        responseContainer.classList.add('hidden');
        document.getElementById('qrCodeContainer').style.display = 'none';
        document.getElementById('qrImage').removeAttribute('src');
        document.getElementById('qrIntentText').textContent = '';
        document.getElementById('paymentStatusNotice')?.remove();
    }

    paymentType.addEventListener('change', () => {
        const oneTime = paymentType.value === 'one-time';
        siDetailsFields.hidden = oneTime;
        siDetailsFields.disabled = oneTime;
        document.getElementById('vpa').parentElement.hidden = oneTime;
        submitBtn.hidden = oneTime;
        collectButton.hidden = oneTime;
        qrBtn.textContent = oneTime ? 'Generate One-Time Payment QR' : 'Generate QR Mandate';
        resetPaymentDisplay();
    });

    qrBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (!form.reportValidity()) return;
        const oneTime = paymentType.value === 'one-time';
        resetPaymentDisplay();
        actionButtons.forEach(button => { button.disabled = true; });
        paymentType.disabled = true;
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

        if (oneTime) delete payload.siDetails;

        try {
            // Call backend API
            const response = await fetch(oneTime ? endpoints.generateOneTimeQR : endpoints.generateQR, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                // Show JSON response for debugging
                responseContainer.classList.remove('hidden');
                jsonResponse.textContent = JSON.stringify(result, null, 2);

                const payuResponse = result.data;
                const rawIntent = payuResponse?.result?.intentURIData || payuResponse?.result?.intentUrl || payuResponse?.result?.qrString;
                const intentStr = buildUpiPaymentUri(rawIntent);
                
                if (intentStr) {
                    const redirectText = document.getElementById('redirectText');
                    if (redirectText) redirectText.style.display = 'none';
                    
                    document.getElementById('qrCodeContainer').style.display = 'block';
                    document.getElementById('qrImage').style.display = 'block';
                    document.getElementById('qrHeading').textContent = oneTime
                        ? 'Scan this QR to make a one-time payment:' : 'Scan this QR to setup mandate:';
                    
                    // Generate QR image securely and instantly on the frontend
                    QRCode.toDataURL(intentStr, { width: 250, margin: 2 }, function (err, url) {
                        if (err) {
                            console.error('QR Generation Error:', err);
                            alert('Unable to render the QR code. Please try again.');
                            return;
                        }
                        document.getElementById('qrImage').src = url;
                        document.getElementById('qrIntentText').textContent = intentStr;
                    });

                    // Start polling backend verify API until payment is approved or failed
                    const activeTxnid = result.txnid || (payuResponse && payuResponse.metaData && payuResponse.metaData.txnId);
                    startPolling(activeTxnid, payload.amount, oneTime);
                } else if (typeof payuResponse === 'string' && payuResponse.includes('html')) {
                    // Fallback if UPI Intent S2S is not enabled or returns HTML
                    alert('UPI Intent S2S returned checkout HTML. Falling back to PayU Hosted Checkout.');
                    document.write(payuResponse);
                } else {
                    alert('Failed to generate Intent QR. Check JSON response for details.');
                }
            } else {
                responseContainer.classList.remove('hidden');
                jsonResponse.textContent = JSON.stringify(result, null, 2);
                document.getElementById('redirectText').style.display = 'none';
                alert(result.error || result.message || 'Failed to generate payment QR.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Check console.');
        } finally {
            actionButtons.forEach(button => { button.disabled = false; });
            paymentType.disabled = false;
            qrBtn.textContent = oneTime ? 'Generate One-Time Payment QR' : 'Generate QR Mandate';
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

    function startPolling(txnid, amount, oneTime = false) {
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
        statusNotice.textContent = oneTime
            ? '⏳ Waiting for payment... Complete the payment in your UPI app.'
            : '⏳ Waiting for payment... Approve the mandate on your UPI app.';

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

/** Convert PayU's query-only intent data into a scannable UPI payment URI. */
function buildUpiPaymentUri(intentData) {
    if (typeof intentData !== 'string' || !intentData.trim()) return null;
    const value = intentData.trim();
    const query = value.replace(/^upi:\/\/pay\?/i, '').replace(/^\?/, '');
    const params = new URLSearchParams(query);
    if (!params.get('pa')) return null;
    // Encode spaces and other reserved characters without encoding query separators.
    return `upi://pay?${params.toString().replace(/\+/g, '%20')}`;
}
