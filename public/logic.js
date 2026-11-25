document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const form = document.getElementById('paymentJourneyForm');
    const selectedMethodInput = document.getElementById('selectedMethod');
    const selectedTypeInput = document.getElementById('selectedType');
    const methodsGrid = document.getElementById('methodsGrid');
    const typeSelector = document.getElementById('typeSelector');
    const deviceTypeSelect = document.getElementById('deviceType');
    const vpaSection = document.getElementById('vpaSection');
    const vpaInput = document.getElementById('vpa');
    const verifyVpaBtn = document.getElementById('verifyVpaBtn');
    const vpaStatus = document.getElementById('vpaStatus');
    const siDetailsFields = document.getElementById('siDetailsFields');
    const mainPayBtn = document.getElementById('mainPayBtn');
    const responseContainer = document.getElementById('responseContainer');
    const collectAlertBox = document.getElementById('collectAlertBox');
    const upiIntentContainer = document.getElementById('upiIntentContainer');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const jsonResponse = document.getElementById('jsonResponse');
    const paymentStatusNoticeContainer = document.getElementById('paymentStatusNoticeContainer');

    // Tunnel host indicator
    const tunnelHost = document.getElementById('tunnelHost');
    if (tunnelHost && window.location.origin) {
        tunnelHost.textContent = window.location.origin;
    }

    // Initialize Default Dates
    const today = new Date();
    const startDateStr = today.toISOString().split('T')[0];
    const endDate = new Date(today);
    endDate.setFullYear(today.getFullYear() + 3);
    const endDateStr = endDate.toISOString().split('T')[0];

    const startDateInput = document.getElementById('paymentStartDate');
    const endDateInput = document.getElementById('paymentEndDate');
    if (startDateInput && !startDateInput.value) startDateInput.value = startDateStr;
    if (endDateInput && !endDateInput.value) endDateInput.value = endDateStr;

    let pollInterval = null;

    function resetDisplay() {
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = null;
        if (responseContainer) responseContainer.classList.add('hidden');
        if (collectAlertBox) collectAlertBox.classList.add('hidden');
        if (upiIntentContainer) upiIntentContainer.classList.add('hidden');
        if (qrCodeContainer) qrCodeContainer.classList.add('hidden');
        const upiAppsGrid = document.getElementById('upiAppsGrid');
        if (upiAppsGrid) upiAppsGrid.innerHTML = '';
        if (paymentStatusNoticeContainer) paymentStatusNoticeContainer.innerHTML = '';
    }

    function updateJourneyUI() {
        const method = selectedMethodInput.value;
        const type = selectedTypeInput.value;
        const isSubscription = type === 'subscription';

        // 1. VPA Section: Only visible for UPI Collect
        if (method === 'upi-collect') {
            vpaSection.classList.remove('hidden');
        } else {
            vpaSection.classList.add('hidden');
        }

        // 2. SI Details: Only visible for Subscription
        if (isSubscription) {
            siDetailsFields.classList.remove('hidden');
        } else {
            siDetailsFields.classList.add('hidden');
        }

        // 3. Update Main Button Text & Style
        const typeLabel = isSubscription ? 'Mandate' : 'One-Time';
        let btnText = '';
        let btnBg = '#007bff';

        switch (method) {
            case 'upi-intent':
                btnText = `📱 Pay via UPI Intent (${typeLabel})`;
                btnBg = '#0288d1';
                break;
            case 'upi-qr':
                btnText = `📲 Generate ${typeLabel} QR Code`;
                btnBg = '#28a745';
                break;
            case 'upi-collect':
                btnText = `🆔 Send ${typeLabel} Collect Request`;
                btnBg = '#805ad5';
                break;
            case 'payu-hosted':
                btnText = `💳 Proceed to PayU Checkout (${typeLabel})`;
                btnBg = '#1a365d';
                break;
            default:
                btnText = `Pay (${typeLabel})`;
                btnBg = '#007bff';
        }

        mainPayBtn.textContent = btnText;
        mainPayBtn.style.backgroundColor = btnBg;
        resetDisplay();
    }

    deviceTypeSelect?.addEventListener('change', updateJourneyUI);

    // Step 1: Payment Method selection click handler
    methodsGrid?.addEventListener('click', (e) => {
        const card = e.target.closest('.method-card');
        if (!card) return;

        document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedMethodInput.value = card.getAttribute('data-method');
        updateJourneyUI();
    });

    // Step 2: Payment Type selection click handler
    typeSelector?.addEventListener('click', (e) => {
        const card = e.target.closest('.type-card');
        if (!card) return;

        document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedTypeInput.value = card.getAttribute('data-type');
        updateJourneyUI();
    });

    // VPA Verification
    verifyVpaBtn?.addEventListener('click', async () => {
        const vpa = vpaInput.value.trim();
        if (!vpa) {
            vpaStatus.className = 'vpa-status-text invalid';
            vpaStatus.textContent = '❌ Please enter a VPA handle to verify.';
            vpaInput.focus();
            return;
        }

        verifyVpaBtn.disabled = true;
        verifyVpaBtn.textContent = 'Verifying...';
        vpaStatus.className = 'vpa-status-text';
        vpaStatus.textContent = '⏳ Checking VPA handle with PayU...';

        try {
            const res = await fetch(endpoints.validateVpa, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vpa }),
            });
            const data = await res.json();

            if (res.ok && data.success && data.data?.isValid) {
                const info = data.data;
                const payerName = info.payerAccountName ? ` (${info.payerAccountName})` : '';
                vpaStatus.className = 'vpa-status-text valid';
                vpaStatus.textContent = `✅ Valid VPA handle${payerName}! Ready to receive collect request.`;
            } else {
                const msg = data.data?.message || data.error || 'VPA verification failed.';
                vpaStatus.className = 'vpa-status-text invalid';
                vpaStatus.textContent = `❌ ${msg}`;
            }
        } catch (err) {
            console.error('VPA verify error:', err);
            vpaStatus.className = 'vpa-status-text invalid';
            vpaStatus.textContent = '❌ Verification call failed. Please check connection.';
        } finally {
            verifyVpaBtn.disabled = false;
            verifyVpaBtn.textContent = '🔍 Verify UPI ID';
        }
    });

    // Main Form Submit Handler
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!form.reportValidity()) return;

        const method = selectedMethodInput.value;
        const type = selectedTypeInput.value;
        const isOneTime = type === 'one-time';
        const vpaValue = vpaInput ? vpaInput.value.trim() : '';

        if (method === 'upi-collect') {
            if (!vpaValue || !vpaValue.includes('@')) {
                alert('Please enter a valid UPI ID (e.g. success@ybl) for UPI Collect.');
                vpaInput.focus();
                return;
            }
        }

        resetDisplay();
        mainPayBtn.disabled = true;
        const originalBtnText = mainPayBtn.textContent;
        mainPayBtn.textContent = 'Initiating Payment...';

        const payload = {
            paymentType: type,
            amount: document.getElementById('amount').value.trim(),
            productinfo: document.getElementById('productinfo').value.trim(),
            firstname: document.getElementById('firstname').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            vpa: vpaValue,
            siDetails: {
                billingAmount: document.getElementById('billingAmount').value.trim(),
                billingCurrency: 'INR',
                billingCycle: document.getElementById('billingCycle').value,
                billingInterval: 1,
                paymentStartDate: startDateInput.value,
                paymentEndDate: endDateInput.value,
            },
        };

        if (isOneTime) {
            delete payload.siDetails;
        }

        try {
            if (method === 'upi-intent') {
                await handleUpiIntentJourney(payload, isOneTime, deviceTypeSelect?.value || 'web');
            } else if (method === 'upi-qr') {
                await handleUpiQrJourney(payload, isOneTime);
            } else if (method === 'upi-collect') {
                await handleUpiCollectJourney(payload, isOneTime);
            } else if (method === 'payu-hosted') {
                await handleHostedCheckoutJourney(payload, isOneTime);
            }
        } catch (err) {
            console.error('Payment Error:', err);
            alert('An error occurred during payment initiation. Check the browser console.');
        } finally {
            mainPayBtn.disabled = false;
            mainPayBtn.textContent = originalBtnText;
        }
    });

    // 1. UPI Intent Journey Flow
    async function handleUpiIntentJourney(payload, isOneTime, deviceType) {
        const response = await fetch(endpoints.generateUpiIntent, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();

        responseContainer.classList.remove('hidden');
        jsonResponse.textContent = JSON.stringify(result, null, 2);

        if (response.ok && result.success) {
            const intentUri = result.intentUri || buildUpiPaymentUri(
                result.data?.result?.intentURIData ||
                result.data?.result?.intentUrl ||
                result.data?.result?.qrString
            );

            if (!intentUri) {
                alert('PayU did not return a usable UPI intent. See the response for details.');
                return;
            }
            upiIntentContainer.classList.remove('hidden');

            const isAndroid = /android/i.test(navigator.userAgent);
            const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
            const isMobile = isAndroid || isIos;
            const deviceBadge = document.getElementById('deviceBadge');
            deviceBadge.className = 'device-badge ' + (deviceType === 'android' ? 'mobile' : 'desktop');
            deviceBadge.textContent = deviceType === 'android' ? 'Android' : 'Web';
            document.getElementById('intentHelp').textContent = isIos
                ? 'iPhone and iPad browsers cannot reliably show a UPI app chooser. Use the QR code with your preferred UPI app.'
                : isMobile
                ? 'Tap “Pay by any UPI app” to open your device chooser showing only the UPI apps installed on this phone.'
                : 'Desktop Web detected. Mobile UPI apps cannot run directly on a computer. Scan the QR code below with any UPI app on your phone.';

            const upiAppsGrid = document.getElementById('upiAppsGrid');
            upiAppsGrid.innerHTML = '';
            const apps = result.supportedApps || [];
            const universalApps = apps.filter(app => app.isUniversal);

            // Browsers cannot enumerate installed UPI apps. The universal handler delegates
            // the choice to the device, which can show only compatible installed apps.
            const primaryApps = universalApps.length > 0 ? universalApps : apps;

            // Static well-known UPI apps shown on web so users know which apps they can open
            const upiQuery = intentUri.includes('?') ? intentUri.slice(intentUri.indexOf('?') + 1) : '';
            const STATIC_UPI_APPS = [
                { name: 'PhonePe',    emoji: '💜', bgColor: '#5f259f', color: '#fff', deepLink: `phonepe://pay?${upiQuery}` },
                { name: 'Google Pay', emoji: '🔵', bgColor: '#1a73e8', color: '#fff', deepLink: `tez://upi/pay?${upiQuery}` },
                { name: 'Paytm',      emoji: '🔷', bgColor: '#00BAF2', color: '#fff', deepLink: `paytmmp://pay?${upiQuery}` },
                { name: 'BHIM UPI',   emoji: '🇮🇳', bgColor: '#FF6B00', color: '#fff', deepLink: `bhim://pay?${upiQuery}` },
                { name: 'CRED',       emoji: '⚫', bgColor: '#1a1a1a', color: '#fff', deepLink: `credpay://?${upiQuery}` },
            ];

            function createAppCard(app, isStatic = false) {
                const card = document.createElement('a');
                card.className = 'upi-app-card' + (app.isUniversal ? ' universal' : '');
                const launchUrl = isStatic ? app.deepLink : getUpiLaunchUrl(app, deviceType, navigator.userAgent);
                card.href = launchUrl;
                card.setAttribute('role', 'button');

                const icon = document.createElement('div');
                icon.className = 'upi-app-icon';
                icon.style.backgroundColor = app.bgColor || '#eee';
                icon.style.color = app.color || '#333';
                icon.textContent = isStatic ? app.emoji : (app.isUniversal ? '⚡' : app.shortName.charAt(0));

                const label = document.createElement('span');
                label.textContent = isIos && app.isUniversal ? 'Show QR to Pay' :
                    app.isUniversal ? 'Pay by any UPI app' : app.name;

                card.appendChild(icon);
                card.appendChild(label);

                card.addEventListener('click', (evt) => {
                    evt.preventDefault();
                    if (!isMobile) {
                        renderQrCode(intentUri, isOneTime);
                        updateNotice(
                            `Scan the QR below with ${app.name || 'any UPI app'} on your phone to pay.`,
                            'info',
                        );
                        return;
                    }
                    if (isIos) {
                        renderQrCode(intentUri, isOneTime);
                        updateNotice(
                            'Use the QR code with your preferred UPI app. iOS may send generic UPI links to an arbitrary app.',
                            'info',
                        );
                        return;
                    }
                    updateNotice(`🚀 Launching ${app.name}... Please complete the payment.`, 'info');
                    window.location.href = launchUrl;
                });
                return card;
            }

            primaryApps.forEach(app => {
                upiAppsGrid.appendChild(createAppCard(app, false));
            });

            // On web mode show static branded app tiles so users know their options
            if (deviceType === 'web' || !isMobile) {
                const divider = document.createElement('p');
                divider.style.cssText = 'font-size:12px;color:#718096;margin:12px 0 6px;font-weight:600;';
                divider.textContent = 'Or open directly in a specific app (tap on phone, or scan QR on desktop):';
                upiAppsGrid.after(divider);

                const staticGrid = document.createElement('div');
                staticGrid.className = 'upi-apps-grid';
                staticGrid.style.marginTop = '0';
                STATIC_UPI_APPS.forEach(app => staticGrid.appendChild(createAppCard(app, true)));
                divider.after(staticGrid);
            }

            // Wire Copy Intent Link
            const copyBtn = document.getElementById('copyIntentBtn');
            if (copyBtn) {
                // Show a tooltip on desktop explaining the link only works on mobile
                if (!isMobile) {
                    copyBtn.title = 'upi:// links only open on Android/iOS. Paste this link on your phone, or scan the QR code above.';
                }
                copyBtn.onclick = () => {
                    if (intentUri) {
                        navigator.clipboard?.writeText(intentUri).then(() => {
                            const orig = copyBtn.textContent;
                            copyBtn.textContent = '✅ Copied!';
                            if (!isMobile) {
                                updateNotice(
                                    '📋 UPI link copied. Note: paste it on your Android phone (WhatsApp, SMS, any app), not in a browser — browsers cannot open upi:// links. Use the QR above if you\'re on desktop.',
                                    'info',
                                );
                            }
                            setTimeout(() => { copyBtn.textContent = orig; }, 2000);
                        }).catch(() => {
                            prompt('Copy UPI Intent URI (open on your phone, not in a browser):', intentUri);
                        });
                    }
                };
            }

            // Wire Toggle QR Code
            const toggleQrBtn = document.getElementById('toggleQrFallbackBtn');
            if (toggleQrBtn) {
                toggleQrBtn.onclick = () => {
                    const isHidden = qrCodeContainer.classList.contains('hidden');
                    if (isHidden && intentUri) {
                        renderQrCode(intentUri, isOneTime);
                    } else {
                        qrCodeContainer.classList.add('hidden');
                    }
                };
            }

            // Web mode always offers QR alongside the app chooser.
            if (deviceType === 'web' || !isAndroid) {
                renderQrCode(intentUri, isOneTime);
            }

            upiIntentContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            upiIntentContainer.focus({ preventScroll: true });

            const activeTxnid = result.txnid || result.data?.metaData?.txnId;
            startPolling(activeTxnid, payload.amount, isOneTime);
        } else {
            alert(result.error || 'Failed to generate UPI intent.');
        }
    }

    // 2. UPI QR Journey Flow
    async function handleUpiQrJourney(payload, isOneTime) {
        const endpoint = isOneTime ? endpoints.generateOneTimeQR : endpoints.generateQR;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();

        responseContainer.classList.remove('hidden');
        jsonResponse.textContent = JSON.stringify(result, null, 2);

        if (response.ok && result.success) {
            const payuResponse = result.data;
            const rawIntent = payuResponse?.result?.intentURIData || payuResponse?.result?.intentUrl || payuResponse?.result?.qrString;
            const intentStr = buildUpiPaymentUri(rawIntent);

            if (intentStr) {
                renderQrCode(intentStr, isOneTime);
                const activeTxnid = result.txnid || payuResponse?.metaData?.txnId;
                startPolling(activeTxnid, payload.amount, isOneTime);
            } else if (typeof payuResponse === 'string' && payuResponse.includes('html')) {
                alert('Hosted checkout fallback returned by PayU.');
                document.write(payuResponse);
            } else {
                const errorMsg =
                    payuResponse?.metaData?.message ||
                    payuResponse?.message ||
                    result.error ||
                    'Failed to extract QR intent string from PayU response.';
                alert(errorMsg);
                updateNotice(`❌ ${errorMsg}`, 'error');
            }
        } else {
            const errorMsg = result.error || result.message || 'Failed to generate QR payment.';
            alert(errorMsg);
            updateNotice(`❌ ${errorMsg}`, 'error');
        }
    }

    // 3. UPI Collect (VPA) Journey Flow
    async function handleUpiCollectJourney(payload, isOneTime) {
        const response = await fetch(endpoints.generateUpiCollect, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();

        responseContainer.classList.remove('hidden');
        jsonResponse.textContent = JSON.stringify(result, null, 2);

        if (response.ok && result.success) {
            // Show Collect notification card
            collectAlertBox.classList.remove('hidden');
            const targetVpa = document.getElementById('collectTargetVpa');
            const targetAmount = document.getElementById('collectTargetAmount');
            if (targetVpa) targetVpa.textContent = payload.vpa;
            if (targetAmount) targetAmount.textContent = payload.amount;

            updateNotice(
                `📲 Push request sent to ${payload.vpa}. Please check your phone notification and approve in your UPI app.`,
                'info'
            );

            const activeTxnid = result.txnid || result.data?.metaData?.txnId;
            startPolling(activeTxnid, payload.amount, isOneTime);
        } else {
            alert(result.error || result.message || 'Failed to send UPI collect request.');
        }
    }

    // 4. PayU Hosted Checkout Journey Flow
    async function handleHostedCheckoutJourney(payload, isOneTime) {
        const response = await fetch(endpoints.initiatePayment, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();

        responseContainer.classList.remove('hidden');
        jsonResponse.textContent = JSON.stringify(result, null, 2);

        if (response.ok && result.success && result.data) {
            updateNotice('🚀 Form payload generated. Redirecting to PayU Checkout...', 'info');
            submitPayUForm(result.data);
        } else {
            alert(result.error || 'Failed to initiate PayU hosted checkout.');
        }
    }

    // Helper: Render QR Code on screen
    function renderQrCode(intentStr, isOneTime) {
        qrCodeContainer.classList.remove('hidden');
        const qrHeading = document.getElementById('qrHeading');
        const qrImage = document.getElementById('qrImage');
        const qrIntentText = document.getElementById('qrIntentText');

        if (qrHeading) {
            qrHeading.textContent = isOneTime
                ? 'Scan QR with any UPI app to make One-Time Payment:'
                : 'Scan QR with any UPI app to setup Subscription Mandate:';
        }
        if (qrIntentText) qrIntentText.textContent = intentStr;

        QRCode.toDataURL(intentStr, { width: 220, margin: 2 }, (err, url) => {
            if (!err && qrImage) {
                qrImage.src = url;
            }
        });
    }

    // Helper: Update Dynamic Notice Pill
    function updateNotice(text, type = 'info') {
        let box = document.getElementById('paymentStatusNotice');
        if (!box) {
            box = document.createElement('div');
            box.id = 'paymentStatusNotice';
            box.style.padding = '12px 16px';
            box.style.borderRadius = '8px';
            box.style.fontWeight = '600';
            box.style.textAlign = 'center';
            box.style.fontSize = '14px';
            paymentStatusNoticeContainer.appendChild(box);
        }

        if (type === 'success') {
            box.style.background = '#e6ffed';
            box.style.color = '#22863a';
            box.style.border = '1px solid #acf2bd';
        } else if (type === 'error') {
            box.style.background = '#ffeef0';
            box.style.color = '#cb2431';
            box.style.border = '1px solid #f97583';
        } else {
            box.style.background = '#f1f8ff';
            box.style.color = '#0366d6';
            box.style.border = '1px solid #c8e1ff';
        }

        box.textContent = text;
    }

    // Polling function for transaction verification
    function startPolling(txnid, amount, isOneTime = false) {
        if (!txnid) return;
        if (pollInterval) clearInterval(pollInterval);

        updateNotice(
            isOneTime
                ? '⏳ Waiting for payment confirmation... Complete payment in your UPI app.'
                : '⏳ Waiting for mandate approval... Approve the recurring mandate in your UPI app.',
            'info'
        );

        let attempts = 0;
        const maxAttempts = 120; // 6 minutes max

        pollInterval = setInterval(async () => {
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(pollInterval);
                updateNotice('⚠️ Payment session timed out. Please try again.', 'error');
                return;
            }

            try {
                const res = await fetch(endpoints.verifyPayment(txnid));
                const resData = await res.json();

                if (resData.success && resData.status) {
                    const status = resData.status.toLowerCase();
                    if (status === 'success' || status === 'captured') {
                        clearInterval(pollInterval);
                        updateNotice('✅ Payment Successful! Redirecting to confirmation...', 'success');
                        setTimeout(() => {
                            window.location.href = `/success?txnid=${encodeURIComponent(txnid)}&status=success&amount=${encodeURIComponent(amount || '')}`;
                        }, 1200);
                    } else if (status === 'failure' || status === 'failed') {
                        clearInterval(pollInterval);
                        updateNotice('❌ Payment Failed! Redirecting...', 'error');
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

    // Initialize UI on load
    updateJourneyUI();
});

/**
 * Creates a hidden form dynamically and submits it to PayU
 * @param {Object} payuData The payload generated by the backend
 */
function submitPayUForm(payuData) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payuData.url;

    for (const key in payuData) {
        if (key !== 'url' && Object.prototype.hasOwnProperty.call(payuData, key)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = payuData[key];
            form.appendChild(input);
        }
    }

    document.body.appendChild(form);
    setTimeout(() => {
        form.submit();
    }, 1500);
}

/** Normalize query-only intents and preserve PayU payment/mandate URIs. */
function buildUpiPaymentUri(intentData) {
    if (typeof intentData !== 'string' || !intentData.trim()) return null;
    const value = intentData.trim();
    const prefix = value.match(/^upi:\/\/(pay|mandate)\?/i);
    if (!prefix && /^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
    const query = (prefix ? value.slice(prefix[0].length) : value).replace(/^\?/, '');
    const params = new URLSearchParams(query);
    if (!params.get('pa')) return null;
    // Keep mandate URIs intact; retain existing normalization for one-time payments.
    if (prefix?.[1]?.toLowerCase() === 'mandate') return value;
    return `upi://pay?${params.toString().replace(/\+/g, '%20')}`;
}


/** Choose presentation links without changing the real device information sent to PayU. */
function getUpiLaunchUrl(app, deviceType, userAgent) {
    if (deviceType === 'android' && /android/i.test(userAgent)) {
        return app.androidIntent || app.deepLink;
    }
    return app.deepLink;
}
