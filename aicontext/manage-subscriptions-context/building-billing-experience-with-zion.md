# Source: https://docs.payu.in/docs/building-billing-experience-with-zion

Zion is an API-driven approach and offers complete flexibility over building different use cases. It is important to perform a Consent transaction where the customers provide preferred card details, UPI or eNACH applicable for SI and agree to the subscription plan chosen during the registration.

![](https://devguide.payu.in/wordpress/index.php/wp-json/getobject?keyname=uploads/2022/02/image-1024x1007.png)

The following process flow can be referred for building a tailored experience for the customer:

1. Customer navigates through your website, selects the preferred subscription plan.
2. Present a checkout page to the customer and takes an explicit consent by furnishing all the details regarding chosen Subscription Plan (amount, billing frequency, start date, end date, etc.)
3. Call the **Consent Transaction** API, that is, **\_payments** API which is used for all other types of products. For more information, refer to any of the following sections:
   * [Payment Consent Transaction using PayU Hosted Checkout](https://docs.payu.in/reference/payment-consent-transaction-payu-hosted)
   * [Payment Consent Transaction with Merchant Hosted Checkout](https://docs.payu.in/reference/payment-consent-transaction-merchant-hosted)
     + [Net Banking Recurring Payment Consent Transaction](https://docs.payu.in/reference/netbanking-recurring-payment-consent-transaction)
     + [Cards Recurring Payment Consent Transaction](https://docs.payu.in/reference/credit-card-recurring-payment-consent-transaction)
     + [UPI Recurring Payment Consent Transaction](https://docs.payu.in/reference/upi-recurring-payment-consent-transaction)

> **Note**: To activate the Zion platform, contact the PayU Onboarding Team.

The Subscription of the customer is defined, and it is associated with the chosen plan. Now, it is time to accept the preferred card details of the customer charged regularly as per the Subscription Plan.

4. Call the **Consent Transaction** API that results in redirection of the customer from your website to PayU’s interface. This step captures the customer’s card information and stores it in the secure vault of PayU. If card details are taken at your website, then PayU will directly take the customer to the 3DS page otherwise PayU will present the card entry page to the customer. The methods to perform a Consent transaction are:
   * The consent transaction deducts first Instalments Amount/Deposit Amount/Registration Amount of the subscription depending upon the use case from your side and then the subsequent transactions are processed automatically by Zion.
   * A consent transaction can be a penny transaction (5 INR) where the card is taken on the file along with the consent and the amount is refunded back from your side by calling the **Refund Transaction** API. This can be considered as a Free trial use case and then and then subsequent transactions can be processed automatically by Zion. For more information on Refund API, refer to [Refund Transaction API](/reference-link/refund_transaction_api).

In both scenarios, it is important to pass the **Subscription ID** received from the Consent Transaction API response as one of the request parameters in the consent transaction interface. Also, the **payment\_source** parameter in response is **sist**.

The above step helps the PayU to associate the customer’s card details with provided Subscription ID to automatically process the charge over subsequent payment after the **Start Date** for a given Subscription is reached.

When the consent transaction is completed successfully, the success response is posted back to your return URL. If the response is a success, then the Subscription is successfully set up on the customer’s account, and no further action is required from your end.

5. If the response of the consent transaction is unsuccessful, then you need to retry as in Step 4 and try to perform the Consent flow again.
6. PayU will attempt to charge the customer’s card, UPI or eNACH after the start date of the subscription reached. The response of the charge will be notified over pre-configured “Webhook” exposed by you over the Server-to-Server interface in JSON format.

> 📘
>
> ### Note:
>
> For Net Banking, the amount cannot be deducted through NPCI supported banks, but with direct integrations for HDFC and ICICI, the amount can be deducted.

Updated 12 months ago

---

Did this page help you?

Yes

No

Copy Page