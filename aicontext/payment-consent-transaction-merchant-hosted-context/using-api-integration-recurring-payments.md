# Source: https://docs.payu.in/docs/using-api-integration-recurring-payments

The following APIs are used to integrate subscription for Net Banking, Cards, and UPI. These APIs are mandatory for any merchant to go live and comply with all the standing instruction guidelines:

* **\_payment** API: The Payment Consent Transaction using \_payment API is used. For integrating using various integrations, refer to:
  + [Payment Consent Transaction using PayU Hosted Checkout](/reference-link/payment-consent-transaction-payu-hosted)
  + [Payment Consent Transaction with Merchant Hosted Checkout](/reference-link/payment-consent-transaction-merchant-hosted)
  + [UPI Recurring Payment Consent Transaction](/reference-link/upi-recurring-payment-consent-transaction)

> 👍
>
> Experience the end-to-end **PayU Hosted > Subscriptions** flow and instantly generate the complete code for seamless, zero-coding integration into your website.
>
> Experience the flow and get the code

* **pre\_debit\_SI** API: The [Pre-Debit Notification API](/reference-link/pre_debit_notification_api) section describes how to use this API to notify the customers before a recurring transaction.
* **si\_transaction** API: The [Recurring Payment Transaction API](/reference-link/recurring_payment_api) section describes how to use this API to initiate a recurring transaction for a customer.
* **mandate\_revoke** API : The [Cancel the Recurring Payment for Cards](/reference-link/cancel-the-recurring-payment-for-cards) API allows the merchants to cancel the card mandate at bank's end. After the registration is canceled for a customer, the merchant cannot restore it, and the customer must register a fresh mandate with the merchant. For cancelling or revoking UPI mandates, refer to [Cancel the Recurring Payment for UPI](/reference-link/cancel-the-recurring-payment-for-upi).

## Manage Recurring Payment for Cards

The following sections describe how to cancel or modify the recurring payment for cards:

* [Check Mandate Status API](/reference-link/check-mandate-status-api)
* [Modify the Recurring Payments for a Card](/reference-link/modify-the-recurring-payments-for-a-card)
* [Cancel the Recurring Payment for Cards](/reference-link/cancel-the-recurring-payment-for-cards)

## Manage Recurring Payment for Net Banking

The following sections describe how to check or cancel the recurring payment for Net Banking:

* [Cancel the Recurring Payment for Net Banking](https://docs.payu.in/reference/cancel-the-recurring-payment-for-net-banking)
* [Check the Net Banking Mandate Status API](https://docs.payu.in/reference/net_banking_mandate_status_api)

## Manage Recurring Payment for UPI

The following API commands are applicable only for UPI:

* **upi\_mandate\_status**: Used to understand the current state of the UPI mandate at any time. For more information, refer to [Get Mandate Status API (for UPI only)](/reference-link/get-mandate-status-api-for-upi-only).
* **upi\_mandate\_modify**: Used to modify an existing UPI Recurring Payment Registration. For more information, [Modify the Recurring Payment for UPI](/reference-link/modify-the-recurring-payment-for-upi).
* **upi\_mandate\_revoke**: Used to cancel a UPI Recurring Payment Registration. For more information, refer to [Cancel the Recurring Payment for UPI](/reference-link/cancel-the-recurring-payment-for-upi).

> 📘
>
> **Handle Guest Checkout Transaction**: You can handle Guest Checkout transactions for EMI integration. For more information, refer to [Cards Integration > Handling Guest Checkout Transactions](/docs/collect-payments-with-cards-seamless#handling-guest-checkout-transactions).

Updated 6 months ago

---

Did this page help you?

Yes

No

Copy Page