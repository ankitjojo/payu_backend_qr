# Source: https://docs.payu.in/docs/customer-experience-and-workflow-recurring-payments

PayU offers recurring payments for the following payment modes, and the following sections describe how will your customer experience and workflow involved for each payment mode.

> 👍
>
> Experience the end-to-end **Subscriptions** flow and instantly generate the complete code for seamless, zero-coding integration into your website.
>
> Experience the flow and get the code

  

## Understanding Consent or Registration Transaction

Consent transaction is obtaining the customer’s explicit permission given to the merchant for charging the preferred payment method for subscribed billing plan. It is a standard guideline for setting up any subscription service and is mandatory for merchants to implement as per RBI regulations.

There are multiple methods to perform the Consent transaction:

1. **Upfront Payment**: Consent transactions can deduct the first Instalment Amount or Deposit Amount depending upon the merchant’s use case and then subsequent transactions can be processed over the recurring interface without the customer’s intervention.

> 📘
>
> **Note**: Method 1 is supported primarily on credit cards, debit cards, UPI, and only selected Net Banking (ICICI and HDFC). It is advisable to interact with the Integration team and understand the different payment methods leveraged in implementing the first instalment flow.

2. **Free Trial**: Consent transaction can be:
   * 0.00 INR transaction in the case of Net Banking
   * Penny transaction of a minimum of 1.00 INR in the case of Cards and UPI where payment instrument and subscription are set up.

This can be considered as a Free trial use case where the subsequent payments are trigged over a recurring interface without the customer’s intervention.

> 📘
>
> **Note**: The difference in amount between the Net Banking (0.00 INR) and cards/UPI (min 1.00 INR) is due to the nature of the architecture behind these payment methods. In the case of Net Banking, the platform is built on top of the existing ESC debit system, so consent is considered as just registration. In Cards/UPI, the transaction still flows through Card schemes or NPCI network where the 0.00 INR transaction is not supported today.

The result of the Consent transaction is to store the customer’s preferred payment instrument in the PayU’s secure vault and generate a unique PayU ID, that is, associated with a subscription in the merchant’s ecosystem.

> 📘
>
> **Note**: The PayU ID is mandatory to charge the customer over the recurring platform for all the subsequent transactions.

From the integration approach perspective, the Consent transaction can be integrated into either of the following approaches:

## PayU Hosted Checkout (Non-Seamless Integration)

For PayU Hosted Checkout integration, you need to pass the standard request parameters in the request as the responsibility of accepting payment details is handled at the PayU’s end.

## Merchant Hosted Checkout (Seamless Integration)

For PayU Hosted Checkout integration, you need to pass the standard request parameters in the request as the responsibility of accepting payment details is handled at the PayU’s end.

For Merchant Hosted Checkout integration, you need to perform the following based on the mode of payment:

* Display a page to collect the card details (in case of cards)
* Display a page to enter the account details along with Bank preference for Net Banking
* Enter the VPA for UPI on your checkout page

You need to get the customer’s consent on your checkout before processing the transaction. This is applicable for PCI DSS compliant merchants so that card details are handled at the merchant’s site directly.

Also, in the case of Merchant Hosted integration flow, the following is recommended:

* Use PayU’s BIN API (**check\_isDomestic** API) to detect the card scheme and card issuer of the credit/debit card entered by the customer. This helps you to filter out not applicable card types for recurring even before calling the consent interface of the PayU. For more information, refer to [Check is Domestic API](/reference-link/check_is_domestic_api).
* Use the **validateVPA API** to validate the UPI handle before making the UPI transaction. For more information, refer to [Validate UPI Handle API](/reference-link/validate_vpa_api).

Updated about 2 months ago

---

Did this page help you?

Yes

No

Copy Page