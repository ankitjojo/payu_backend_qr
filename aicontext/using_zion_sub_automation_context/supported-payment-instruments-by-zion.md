# Source: https://docs.payu.in/docs/supported-payment-instruments-by-zion

## Credit Cards

The following credit cards issued in India are supported:

* Visa
* Master

The following cards will be supported soon by Zion:

* Amex Cards

## Debit Cards

The VISA and MasterCard debit cards issued by the following banks are supported:

* American Express Banking Corporation
* Andhra Bank
* AU Small Finance Bank Limited
* Australia and New Zealand Banking Group Limited
* Axis Bank Ltd.
* Bank of Baroda
* Bank of India
* Bank of Maharashtra
* Canara Bank
* Central Bank of India
* Citibank
* Corporation Bank
* City Union Bank Ltd.
* Dhanlaxmi Bank Ltd.
* DBS Bank Ltd.
* DCB Bank Ltd.
* DCB Bank Business Banking
* Equitas Small Finance Bank Limited or Equitas Bank (same bank)
* ESAF Small Finance Bank Limited
* Federal Bank Ltd.
* HDFC Bank Ltd.
* HSBC Bank
* ICICI Bank Ltd.
* IDBI Bank Ltd.
* IDFC First Bank Ltd.
* IDFC Bank Ltd. (merged with IDFB)
* IndusInd Bank (same bank)
* Indian Overseas Bank
* Jammu & Kashmir Bank Ltd.
* Karur Vysya Bank Ltd.
* Kotak Mahindra Bank Ltd.
* Punjab National Bank
* Paytm Bank
* RBL Bank Ltd.
* State Bank of India
* State bank of Mysore
* Standard Chartered Bank
* South Indian Bank Ltd.
* State Trading Corporation of Bhutan Limited
* Union Bank of India
* YES Bank

## Net Banking

Net Banking standing instructions using Zion integration is supported through ENACH (consent transaction) is supported by Zion. For the list of banks supported, refer to [Net Banking Codes for Subscription](/docs/bank-codes-recurring-payments).

## UPI

UPI standing instructions using Zion integration is supported.

> 📘
>
> ### Notes:
>
> * When you make the consent transaction for UPI, **DAILY** frequency is not supported.
> * The start date needs to be today's date (when the Consent Transaction is called) only.

## Points to Remember

1. While building the Subscription experience with different card schemes and issuers mentioned above, often a cross-verify final list with your PayU Account Manager. PayU recommends to contact your Account Manager because allocation some of the schemes is at “Discretion” of respective Issuer and Acquirers.
2. During the Consent transaction, if you are accepting card details on your website, use PayU’s BIN API to detect the card scheme and card issuer associated with the card entered. So that the if the card details entered by Customer is NOT supported for SI, it gets filtered out there itself rather than getting rejected at PayU’s end after customer is redirected to PayU.
3. Since PayU is working closely with more debit card issuers to offer SI regularly, the list of issuers supported for debit card SI can change over time. In this case, please maintain implementation of “Validating Card to support SI – Yes or No” flexible so that you can quickly offer new Issuers going ahead.
4. If you are redirecting the customer to PayU for accepting Card details during the Consent transaction, then only #1 is applicable because #2 and #3 are taken care at PayU’s end.

Updated 12 months ago

---

Did this page help you?

Yes

No

Copy Page