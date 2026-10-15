# Source: https://docs.payu.in/reference-link/get-invoice-interfaces-api-zion

This API is used to retrieve invoice details. You can fetch invoice details either using:

* [Invoice ID](#using-invoice-id)
* [Subscription ID](#using-subscription-id)

## Using Invoice ID

**HTTP Method**: GET

**Path**: \_{base\_url}/\_api/sub/v1/merchant/invoices/`{invoiceId}`

**Environment**

|  |  |
| --- | --- |
| Test | <[https://subscriptiontest.citruspay.com/>](https://subscriptiontest.citruspay.com/%3E) |
| Production | <[https://subscription.citruspay.com/>](https://subscription.citruspay.com/%3E) |

### Request parameters

| Parameter | Description |
| --- | --- |
| merchantId **mandatory** | Merchant key received during onboarding. **Example**: YQeVda |

### Sample request

```
https://subscriptiontest.citruspay.com/api/sub/v1/merchant/invoices/5c9902082fc4f831c8b4ac71
```

### Sample response body

```
{
  "invoiceId": "5c9902082fc4f831c8b4ac70",
  "subscriptionId": "5c988769652d405ed9834f67",
  "planId": "ZION155350000928619",
  "planName": "AMEXSI_155350000928610",
  "status": "Due",
  "amount": {
    "value": 1,
    "currency": "INR"
  },
  "createdOn": "2019-03-25T16:30:00.069Z",
  "modifiedOn": "2019-03-25T16:30:00.069Z",
  "retryLeft": 3,
  "authRefId": "737534002",
  "customParameter": {
    "udf1": "value"
  }
}
```

## Using Subscription ID

All the invoices for a Subscription Id can be also fetched through using Subscription ID as query string.

**Path**: \_{base\_url}/\_api/sub/v1/merchant/invoices/`{invoiceId}`

**Environment**

|  |  |
| --- | --- |
| Test | <[https://subscriptiontest.citruspay.com/>](https://subscriptiontest.citruspay.com/%3E) |
| Production | <[https://subscription.citruspay.com/>](https://subscription.citruspay.com/%3E) |

### Request parameters

#### Header

| Parameter | Description |
| --- | --- |
| merchantId **mandatory** | Merchant key received during onboarding. **Example**: YQeVda |

#### Body

| Parameter | Description |
| --- | --- |
| subscriptionId **mandatory** | Subscription ID for which invoices needs to be fetched. |
| skip **mandatory** | Skip is the number of subscriptions to be skip from the data-set fetched from database for given merchantId before applying the limit on it. It should be greater than or equal to zero. |
| limit **mandatory** | Number of subscriptions to be fetch. It should be greater than zero. Max value of limit is 20 |

### Sample request

```
curl --location 'https://subscription.payu.in/api/sub/v1/merchant/invoices/6522d9af2fc4f8dee476695c' \
--header 'Authorization: Bearer 810aa8723c4a626bf2c157e50204aebca72d33e9f2bf350e29eade8ae912c703' \
--header 'merchantId: aTh61r' \
--header 'X-PayU-Subscription-Signature: 36c0c4b22d1c616237d518c939107e3b01ed14c32147f2c79232444392e0656b040782af69cef7e0640a3f7868145695be3903eb2692a8ef5b68e4bf0a1803ff' \
--header 'Content-Type: application/json' \
--header 'Cookie: PHPSESSID=jp38t4gvop7ami1ksncksj398v; USERTXNINFO=68ed4df291d9b7.27710642'
```

### Sample response

```
{
    "invoiceId": "6522d9af2fc4f8dee476695c",
    "subscriptionId": "5cbe8d982fc4f8bf774d43af",
    "planId": "ZION155599196011028",
    "status": "Failed",
    "amount": {
        "value": 99.00,
        "currency": "INR"
    },
    "createdOn": "2023-10-08 16:32:47.375",
    "modifiedOn": "2023-10-11 18:25:58.894",
    "retryLeft": 0,
    "authRefId": "8347443919",
    "subscriberEmail": "[email protected]",
    "subscriberMobile": "91-8879211929",
    "customParameter": {},
    "refId": ""
}
```

Updated 6 months ago

---

Did this page help you?

Yes

No