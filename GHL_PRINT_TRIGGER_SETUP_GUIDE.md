# GHL Marketplace Trigger Setup Guide

## Trigger to create

Create a Marketplace Workflow Trigger named **Lulu Print Job Shipped** with the immutable key:

```text
lulu_print_job_shipped
```

This trigger fires when a customer print job reaches Lulu’s `SHIPPED` status. Lulu documents tracking data at shipment, including a tracking ID, tracking URL, and carrier information. [1]

## Prerequisites

Before creating the trigger, deploy the updated backend and run the database schema in `server/db/production_schema.sql` in the Supabase SQL Editor. Add a strong random value to the Render environment as:

```text
GHL_TRIGGER_SUBSCRIPTION_SECRET=<long-random-secret>
```

The same value must be entered in the trigger’s Subscription URL header. The backend endpoint is:

```text
https://YOUR_BACKEND_DOMAIN/workflow-trigger/subscription
```

The GHL app should request the `workflows.readonly` scope in addition to the scopes already used by LiteraryApp. The sub-account must have LiteraryApp installed and LC Premium Triggers & Actions enabled for Marketplace triggers to appear and execute. [2]

## Developer Portal configuration

Open the GHL Marketplace Developer Portal, select the LiteraryApp app, go to **Modules → Workflow**, choose **Create Trigger**, and complete the following fields.

| Field | Value |
| --- | --- |
| Name | `Lulu Print Job Shipped` |
| Key | `lulu_print_job_shipped` |
| Icon | Printer, package, or book icon |
| Short description | `Fires when a Lulu customer print job ships and tracking information is available.` |
| Summary | `Sends the contact name, tracking ID, tracking URL, carrier, book title, and print-job identifiers into the workflow so native GHL email and SMS actions can notify the customer.` |

The key is immutable after creation, so copy it exactly. HighLevel’s documentation states that a Marketplace trigger key is unique and used to reference the trigger in workflows. [3]

## Sample trigger data

In **Configure Trigger Data**, paste this sample JSON. HighLevel uses the sample to build filters and custom variables.

```json
{
  "event": "LULU_PRINT_JOB_SHIPPED",
  "triggerKey": "lulu_print_job_shipped",
  "status": "SHIPPED",
  "statusChangedAt": "2026-08-21T12:34:56.000Z",
  "locationId": "ghl_location_id",
  "contactId": "ghl_contact_id",
  "contactName": "Jane Doe",
  "firstName": "Jane",
  "lastName": "Doe",
  "trackingId": "3d4a53da-cc42-44c2-b47b-c3da8fa37491_1",
  "trackingIds": ["3d4a53da-cc42-44c2-b47b-c3da8fa37491_1"],
  "trackingUrl": "https://api.lulu.com/tracking/example",
  "trackingUrls": ["https://api.lulu.com/tracking/example"],
  "carrierName": "USPS",
  "carrierNames": ["USPS"],
  "luluPrintJobId": "42776",
  "internalPrintJobId": "local-print-job-uuid",
  "bookTitle": "Example Book",
  "quantity": 1,
  "shippingLevel": "MAIL"
}
```

## Filters

Create a filter named **Status** with the following values:

| Filter property | Value |
| --- | --- |
| Name | `Status` |
| Type | Select |
| Required | Yes |
| Reference | `status` |
| Option type | Constants |
| Option label | `Shipped` |
| Option value | `SHIPPED` |

If the trigger should always mean shipment, the backend already emits `SHIPPED`, so this filter is mainly a user-facing confirmation. Additional filters such as `carrierName`, `shippingLevel`, or `bookTitle` can be added later.

## Custom variables

Create custom variables using the following references. Use the GHL variable picker in the workflow rather than manually typing token syntax, because the exact display token can vary by GHL UI version.

| Label | Reference | Type | Use |
| --- | --- | --- | --- |
| Contact ID | `contactId` | String | Find or associate the GHL contact. |
| Contact Name | `contactName` | String | Personalize the notification. |
| First Name | `firstName` | String | Personalize email/SMS greetings. |
| Last Name | `lastName` | String | Personalization or logging. |
| Tracking ID | `trackingId` | String | Primary tracking identifier to send. |
| Tracking URL | `trackingUrl` | String | Clickable tracking link. |
| Carrier | `carrierName` | String | Tell the reader which carrier is handling delivery. |
| Lulu Print Job ID | `luluPrintJobId` | String | Lulu support/reference value. |
| Internal Print Job ID | `internalPrintJobId` | String | LiteraryApp support/reference value. |
| Book Title | `bookTitle` | String | Identify the shipped book. |
| Status | `status` | String | Current fulfillment status. |
| Status Changed At | `statusChangedAt` | String | Shipment timestamp. |
| Location ID | `locationId` | String | Sub-account reference. |

## Subscription URL

In **Set Up Subscription URL**, enter:

```text
https://YOUR_BACKEND_DOMAIN/workflow-trigger/subscription
```

Add this header:

| Header name | Header value |
| --- | --- |
| `X-LiteraryApp-Trigger-Secret` | The exact value of `GHL_TRIGGER_SUBSCRIPTION_SECRET` configured on Render |

HighLevel sends `CREATED`, `UPDATED`, and `DELETED` configuration events to the Subscription URL. The payload includes the trigger instance ID, filters, workflow ID, location ID, and a workflow-specific `targetUrl`; LiteraryApp stores those values so it knows where to send future SHIPPED events. [3]

## Submit and publish

Save the trigger as a draft, use the Developer Portal test facility if available, then select **Submit for Review**. After approval, create a new version for future changes rather than changing the immutable key. HighLevel states that new versions must be submitted and approved before they become live. [3]

## Create the customer-notification workflow

In the target GHL sub-account, open **Automation → Workflows**, create a new workflow, and select **Lulu Print Job Shipped** as the trigger. Set the Status filter to `SHIPPED` if GHL displays the filter.

The workflow should use the contact context supplied by the trigger. If the workflow does not automatically associate the incoming `contactId` with a contact, add a **Find Contact** step first and use the trigger’s `contactId` variable. HighLevel documents that Marketplace triggers can run without contact data, so this fallback is important for workflows that must send native contact-based messages. [3]

Then add the native **Email** action. Use the GHL variable picker to insert the contact’s first name and the trigger’s tracking values. A suitable email body is:

```text
Hi {{First Name}},

Your book "{{Book Title}}" has shipped.

Carrier: {{Carrier}}
Tracking ID: {{Tracking ID}}
Track your package here: {{Tracking URL}}

Thank you.
```

Add a native **SMS** action after the email if desired:

```text
Hi {{First Name}} — your book "{{Book Title}}" has shipped. Tracking ID: {{Tracking ID}}. Track it here: {{Tracking URL}}
```

Use the variable picker to replace the illustrative braces with the actual trigger variables displayed by your GHL account. Do not hard-code a tracking ID in the workflow.

## Testing checklist

First test the Subscription URL by creating the trigger in a test workflow and confirming that the backend returns HTTP 200 and creates a row in `ghl_trigger_subscriptions`. Update the trigger filters and confirm the row changes. Delete the trigger and confirm the row becomes inactive rather than being removed.

Next use Lulu Sandbox. Place a test order and use Lulu’s webhook test facility or wait for a real sandbox status update. Confirm that the app receives `PRINT_JOB_STATUS_CHANGED`, verifies the HMAC, records a `SHIPPED` status transition, extracts `trackingId`, and delivers one event to the GHL workflow. Send the same Lulu webhook twice and confirm that only one row reaches `delivered` for the subscription/event key.

Finally verify that the existing **Create Lulu Print Job** action still creates only one Lulu job on replay, that CRM stage updates still occur, that reconciliation can recover a missed webhook, and that sample orders do not send customer shipment messages.

## Troubleshooting

| Symptom | Likely cause | Check |
| --- | --- | --- |
| Trigger does not appear in GHL | App not installed in the sub-account or LC Premium Triggers & Actions disabled. | Confirm installation and workflow feature access. |
| Subscription callback returns 401 | Secret mismatch. | Compare the GHL header value with Render’s `GHL_TRIGGER_SUBSCRIPTION_SECRET`. |
| Subscription callback returns 500 | Database migration missing. | Run `server/db/production_schema.sql` in Supabase. |
| Workflow exists but no notification arrives | No active subscription, filter mismatch, or failed delivery. | Inspect `ghl_trigger_subscriptions` and `ghl_trigger_deliveries`; check Render logs. |
| Email/SMS has no contact | Workflow did not bind the contact. | Add Find Contact using the trigger’s `contactId` before the native message action. |
| Tracking ID is empty | Lulu event had not reached shipment or webhook payload had no line-item tracking information. | Confirm status is `SHIPPED`, inspect the raw webhook log, and check the parser output. |

## References

[1]: https://api.lulu.com/docs/ "LULU Print API Documentation"
[2]: https://marketplace.gohighlevel.com/docs/marketplace-modules/WorkflowActionsAndTriggers/ "HighLevel Marketplace Workflow Triggers & Actions"
[3]: https://marketplace.gohighlevel.com/docs/marketplace-modules/CustomTriggers/ "Creating a Marketplace Workflow Trigger"
