# Implementation Plan (v2): UPI Subscription S2S Test Page

**Goal:** one test page with 4 steps. Each step sends one PayU `postservice` call and shows two things: the **Postman curl** of the exact PayU call and PayU's **raw response**. Both can be copied with one click. The page does no validation and puts no restrictions on order: you can open any step at any time, type anything and send.

| Step | Button | Backend route | PayU command |
|---|---|---|---|
| ① | Verify Mandate Registration | `POST /api/subscriptions/mandate-status` | `upi_mandate_status` |
| ② | Pre-Debit SI Notification | `POST /api/subscriptions/pre-debit` | `pre_debit_SI` |
| ③ | Recurring Payment Transaction | `POST /api/subscriptions/recurring-payment` | `si_transaction` |
| ④ | Verify Payment / Get Transaction Details | `POST /api/subscriptions/verify-payment` | `verify_payment` or `get_Transaction_Details` |

Reference: https://docs.payu.in/docs/upi-subscriptions-integration-s2s, plus the API reference pages `verify_payment_api`, `pre_debit_notification_api`, `recurring_payment_api` and `get-mandate-status-api-for-upi-only`.

---

## What changed from v1

| v1 | v2 |
|---|---|
| Server validated input and returned 400 | **No validation.** Whatever is typed is sent to PayU as typed |
| PayU failure mapped to HTTP 502 | Always HTTP 200 with PayU's **raw** response, unchanged |
| Routes hidden unless `ENABLE_SUBSCRIPTION_OPS=true`, optional token | **No guard, no token.** The page and routes are always on |
| Timing and amount warnings | Removed |
| One response panel shared by all steps | **Each step has its own result**: curl box and raw response box, each with a Copy button. Results stay when you switch steps |
| Confirm dialog before ③ | Removed |
| — | **Call log** at the bottom: every call this session (time, step, command, curl, response), newest first |

---

## Why the page fails today

1. **`public/subscription-ops.js` does not exist.** The page loads it, the browser gets a 404, and no JavaScript runs. That is why the tabs don't switch, nothing is sent and no response appears.
2. **The API routes return 404.** `subscription.routes.ts` runs the `requireOpsEnabled` guard, and `.env` has no `ENABLE_SUBSCRIPTION_OPS`. Even with a script, every call would return 404.
3. **Duplicate code from two sessions:** `app.ts` imports `subscriptionRoutes` twice and registers `/subscription-ops` and `/api/subscriptions` twice; `config/index.ts` has `subscriptionOps` twice; `payu.enum.ts` lists the 4 commands twice; `payu.service.ts` mixes `PostCommandResult` and `PayUCommandResult`. `tsc` fails.

---

## 1. Clean-up (do first)

- `payu.enum.ts`: keep one copy of `UPI_MANDATE_STATUS`, `PRE_DEBIT_SI`, `SI_TRANSACTION`, `GET_TRANSACTION_DETAILS`.
- `payu.interface.ts`: keep `PayUCommandResult` only, and change it to `{ request, response, curl }`. Delete `PostCommandResult`, plus the duplicate var1 interfaces if two sets exist.
- `config/index.ts`: delete both `subscriptionOps` blocks.
- `app.ts`: keep one import, one `app.use('/api/subscriptions', subscriptionRoutes)` and one `app.get('/subscription-ops', …)` that always renders.
- `subscription.routes.ts`: delete `requireOpsEnabled`.
- `npx tsc --noEmit` must pass before going on.

---

## 2. Backend

### 2.1 `PayUService.postCommand(command, var1, extra?)` (`src/services/payu.service.ts`)
- Same as now: `hash = sha512(key|command|var1|salt)`, POSTed as `application/x-www-form-urlencoded` to `payuConfig.endpoints.apiUrl`.
- **New:** also build `curl`, a Postman-importable string for exactly this call:
  ```
  curl --location '<apiUrl>' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'key=<key>' \
  --data-urlencode 'command=<command>' \
  --data-urlencode 'var1=<var1>' \
  --data-urlencode 'hash=<hash>'
  ```
  For `get_Transaction_Details` it adds `--data-urlencode 'var2=<to>'`. Single quotes inside values are escaped as `'\''`. The salt is never included. The key and hash are included, so the curl runs as is.
- **New:** if PayU returns an HTTP error or the network fails, don't throw. Return `response` as PayU's error body, or `{ error: <message> }` when there is none, so the raw error still reaches the UI.

### 2.2 `SubscriptionService` (`src/services/subscription.service.ts`)
Builds var1 from the form values **as typed**: no trimming rules, no number formatting, no checks.
- Empty fields are left out of the var1 JSON. Nothing else is removed.
- `mandateSeqNo` is sent as a number when it looks like a number, otherwise as the typed text.
- A blank `requestId` or `txnid` is auto-generated (`REQ…` / `TxnSI…`) so the call can still go out. The UI also pre-fills these, so this is only a fallback.

| Step | var1 sent |
|---|---|
| ① | `{"authPayuId","requestId"}` |
| ② | `{"authpayuid","requestId","debitDate","amount","mandateSeqNo"?,"action"?}` |
| ③ | `{"authpayuid","amount","txnid","phone"?,"email"?,"mandateSeqNo"?,"udf1..5"?}` |
| ④ by txnid | plain string `txnid1\|txnid2\|…` (not JSON) |
| ④ by date | var1 = `from`, var2 = `to` |

### 2.3 `SubscriptionController` (`src/api/controllers/subscription.controller.ts`)
Replace the current validating controller with a pass-through:
- Read the body, call the service, and **always** reply `200`:
  ```json
  { "step": "preDebit", "command": "pre_debit_SI", "sentAt": "<ISO time>",
    "curl": "<curl string>", "request": { key, command, var1, hash }, "response": <PayU raw> }
  ```
- If something throws on our side, reply `200` with `response: { error: <message> }`, so the UI always has a result to show.
- No 400 or 502 responses.

---

## 3. UI: `views/subscription-ops.ejs` + new `public/subscription-ops.js`

### Layout
```
┌───────────────────────────────────────────────────────────────┐
│ authpayuid (shared, optional prefill)  [__________]            │
│ [① Verify Mandate] [② Pre-Debit] [③ Recurring] [④ Verify]      │  ← always clickable
├───────────────────────────────────────────────────────────────┤
│ form for selected step                         [ Send ]        │
├───────────────────────────────────────────────────────────────┤
│ Postman curl                               [📋 Copy curl]      │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ curl --location 'https://test.payu.in/...'                │  │
│ └───────────────────────────────────────────────────────────┘  │
│ Raw response                               [📋 Copy response]  │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ { "status": 1, ... }                                      │  │
│ └───────────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────────┤
│ Call log (all steps, newest first)              [Clear log]    │
│ 12:41:03  ③ si_transaction   [Copy curl] [Copy response] ▸     │
│ 12:40:10  ② pre_debit_SI     [Copy curl] [Copy response] ▸     │
└───────────────────────────────────────────────────────────────┘
```

### Behaviour
- **Switching steps:** a tab click shows that step's form and **that step's last result** (curl and response). Nothing is cleared, nothing is locked, and steps can be done in any order.
- **Send:** sends the form as typed. The browser does no checks: remove `required`, `min`, `max` and `pattern` from inputs, and use `type="text"` for amount and seq so any value can be sent.
- **Result:** fills the step's curl box and raw response box. The response is pretty-printed JSON, or plain text if PayU returns text.
- **Copy buttons:** `navigator.clipboard.writeText`. If that fails (for example over plain http), select the text and show a `prompt()` with it. The button shows "✅ Copied" for 2 seconds.
- **Call log:** kept in page memory (an array). Each row can be expanded to show the full curl and response, with its own copy buttons. A "Clear log" button empties it.
- **Shared authpayuid:** typing it fills the authpayuid field of ①–③. Each field can still be edited separately. It is saved in `localStorage`, wrapped in try/catch.
- **Shortcuts (no restriction, just help):**
  - In ④'s result, each `mihpayid` gets a "Use as authpayuid" button.
  - In ③'s result, a "Verify this txnid" button opens ④ with that txnid filled in.
- **Errors:** a network or fetch error is shown in the raw response box as `{ "error": "<message>" }` and also logged.
- **Remove** the `opsToken` field from the page.

### Form fields (all optional, sent as typed)
| Step | Fields |
|---|---|
| ① | authPayuId, requestId (↻ generates one) |
| ② | authpayuid, requestId (↻), debitDate (default today+2), amount (default 1.00), mandateSeqNo, action (— / Retrieve / Delete) |
| ③ | authpayuid, txnid (↻), amount (default 1.00), phone, email, mandateSeqNo, udf1–udf5 |
| ④ | mode (by txnid / by date), txnids (one per line), from, to |

`public/endpoints.js` gets:
```js
subscription: {
  mandateStatus: '/api/subscriptions/mandate-status',
  preDebit: '/api/subscriptions/pre-debit',
  recurringPayment: '/api/subscriptions/recurring-payment',
  verifyPayment: '/api/subscriptions/verify-payment',
}
```

---

## 4. Tests

`src/services/__tests__/subscription-ops.test.ts`: rewrite for v2. Mock `HttpHelper.postForm`, then check:
1. Each route sends the right `command`, and var1 carries the typed values with empty fields left out.
2. `hash === sha512(key|command|var1|salt)` over the exact var1 sent.
3. `curl` contains the URL, the 4 (or 5) `--data-urlencode` lines and the same var1 and hash, and never the salt.
4. Bad input (amount `abc`, missing authpayuid) is **still sent** and returns 200, with no 400.
5. PayU returns `status:0`: reply is 200 with the raw response unchanged.
6. `postForm` throws: reply is 200 with `response.error`.
7. ④ with 3 txnids gives var1 `a|b|c`; date mode sends var2.

`tests/subscription-ops-ui.test.js` (node:test + vm, same style as `tests/upi-intent-ui.test.js`):
- Switching tabs keeps each step's last result.
- Copy buttons write the right text.
- The call log grows with each send.

---

## 5. Order of work
1. Clean-up (§1); `tsc` passes.
2. Backend pass-through and curl (§2); Jest passes.
3. `public/subscription-ops.js` and view edits (§3); UI test passes.
4. Restart the server on 4000 and open `https://42nxvjgc-4000.inc1.devtunnels.ms/subscription-ops`.

## 6. Risk you accept with v2
With no guard and no token, anyone who has the tunnel URL can call ③ `si_transaction` and debit a customer who has an active mandate. Close the tunnel when not testing.

## 7. Open points (unchanged, check on test.payu.in)
- `pre_debit_SI` vs `pre_debit_si`; `authpayuid` vs `authPayuId`.
- Whether `upi_mandate_status` works on test.payu.in. The docs show only info.payu.in.
- Whether `mandateSeqNo` is required for UPI.
- The `get_Transaction_Details` command name and date format (reference page not read).
