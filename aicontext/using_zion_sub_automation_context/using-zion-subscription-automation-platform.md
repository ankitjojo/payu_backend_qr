# Source: https://docs.payu.in/docs/using-zion-subscription-automation-platform

PayU Subscription automation platform, “ZION”, allows you to automate the recurring payments or subscriptions of your customers with preferred credit or debit cards, UPI or Net Banking (eNACH) seamlessly over a highly customizable and scalable platform with minimum integration efforts.

The Billing automation can handle the complex cases of free trials, one-time payments, fixed payments, add-on charges, usage-based payments, delayed payments, etc. with simple rest APIs.

After setting up, no further action is required for subsequent payments, and PayU takes care of the regularly charging subscribers in the background and updates the merchant status of the payment over webhooks.

It is convenient to use the APIs and the Intuitive Dashboard provides total control over payment flow at any time of the recurring life cycle.

> 📘
>
> **Activate Zion platform**: To activate the Zion platform, contact your PayU Account Manager.

In this integration, you need to post a Consent Transaction and the rest is taken care by PayU.

Zion brings together the Billing aspects like Subscription, Invoices into a one-stop solution for managing the end-to-end subscription flow of the merchant.

![Zion Platform API Flow](https://devguide.payu.in/wordpress/index.php/wp-json/getobject?keyname=uploads/2021/09/MicrosoftTeams-image-2048x989.png)

Zion is built over the Recurring Payments or Standing Instructions (SI) platform. This section provides the guidelines for Subscription integration with cards, UPI and Net Banking (eNACH).

## Building blocks of ZION

PayU’s Subscription platform can be broken up into three blocks to create a seamless Billing experience for any customer.

* **Subscription** – Subscription is heart of Zion. It allows merchant to define tailored subscription experience for customer by billing plan with preferred payment instrument. If merchant business case supports billing plans which varies as per customer profile, then merchant can create them directly while defining subscription. For example, Insurance segment where billing amount and billing frequency changes for every customer depending upon his age, salary, medical conditions and nature insurance he is buying. For more information on APIs used, refer to [Manage Subscriptions API](/reference-link/manage-subscriptions).
* **Consent flow**: In the Video serving platform example, for both the business cases, merchant has full flexibility to create subscription for the customer before Consent transaction or after Consent transaction but for processing it is mandatory and is the only way to generate `authRefId`. This number in turn represents customer’s preferred payment instrument where Zion executes recurring charges as defined in billing cycle. For more information, refer to [Payment Consent Transaction with Merchant Hosted Checkout](/reference-link/payment-consent-transaction-merchant-hosted).
* **Invoices** – Every (enabled) subscription generates an Invoice on the scheduled billing cycle and charges the customer’s account automatically without any intervention from you or customer. After subscription is set up, Zion automatically charges customer’s payment instrument by generating Invoices. For every successful charge, merchant gets notification over webhook defined by merchant and provided to PayU during Zion onboarding. In some special cases, merchant can also call Invoices himself when billing cycle is of Adhoc nature. After all the invoices respective to all the active plan subscribed by customer are executed, then Subscription gets autocomplete. For more information, refer to [Manage Invoice APIs](/reference-link/manage-invoice-apis-for-zion).

The following flow diagram illustrates how Subscriptions work:

![How Zion Subscriptions work?](https://devguide.payu.in/wordpress/index.php/wp-json/getobject?keyname=uploads/2022/02/image-1-1024x317.png)

The following flow diagram illustrates how a Subscription of the customer opting for 800 INR per month service for a year can be imagined as below.

![Zion Subscriptions Example](https://devguide.payu.in/wordpress/wp-content/uploads/2021/07/image-7.png)

## Guidelines for Payment Instruments

### Cards

SI payments work without the necessity of passing the card’s CVV number and executing Two Factor Authentication (2FA) – 3D Secure (3DS) authentication.

Hence there are strict guidelines on the SI offering as per RBI:

* The first instance is called as ‘Consent transaction’, the customer  provides his/her card details to you and sign up for a Subscription plan, must go through normal 2FA flow (OTP/MasterCard Secure password/Verified by Visa Password).
* At this step, you must obtain the explicit consent of the customer for further recurring payments by presenting all details about the Subscription plan chosen by the customer like billing amount, billing frequency, etc.,
* After a consent is taken, the SI infrastructure can be used to charge the customer’s card on the regular basis through Zion.
* Customers are given an option to opt-out from the Subscription Plan at the your portal or website.

### Net Banking

The customer provides their Net Banking details and signs up for a subscription plan by doing a Net Banking or Debit Card authentication.

## Quickstart integration

To quickstart Zion platform integration:

1. Create Subscription (define billing plan). For more information on APIs used, refer to [Manage Subscriptions API](/reference-link/manage-subscriptions).
2. Execute Consent Transaction (customer authorization → get authRefId). For more information, refer to [Payment Consent Transaction with Merchant Hosted Checkout](/reference-link/payment-consent-transaction-merchant-hosted).
3. Zion auto-charges per billing cycle. For more information, refer to [Manage Invoice APIs](/reference-link/manage-invoice-apis-for-zion).

Updated 3 months ago

---

Did this page help you?

Yes

No

Copy Page