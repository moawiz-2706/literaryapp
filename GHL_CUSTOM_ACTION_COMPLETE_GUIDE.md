# GHL Custom Workflow Action Setup Guide

This guide provides complete, step-by-step instructions for creating the custom workflow action in the GoHighLevel Developer Portal. Once registered, this action will be available in every sub-account that installs your app.

---

## Step 1: Navigate to the Action Builder

1. Log in to the [GoHighLevel Marketplace Developer Portal](https://marketplace.gohighlevel.com).
2. Open your application from the dashboard.
3. In the left-hand sidebar, click **Modules** and then **Workflow**.
4. Click the **Create Action** button.

---

## Step 2: Action Information (Top Section)

Fill in the fields at the top of the Configuration tab:

| Field | Value |
| :--- | :--- |
| **Name** | Create Lulu Print Job |
| **Key** | `create_lulu_print_job` |
| **Description** | Place a print order on Lulu.com directly from a GHL workflow. Select a book, set quantity and shipping speed. All contact and shipping info is auto-resolved from the GHL contact. |
| **Icon** | Book or Printer icon |
| **Category** | External Communications (or create "Print on Demand") |

---

## Step 3: Manage Fields

Click **Add Field** for each of the following. The form should only have these fields:

### Field 1: Select Book

| Property | Value |
| :--- | :--- |
| **Name** | Select Book |
| **Type** | `Dynamic` |
| **Required** | On |
| **Reference** | `book_id` |

> The Dynamic type is special — it tells GHL to call your `/dynamic-fields` endpoint to populate the book dropdown. Only ONE Dynamic field is needed per action.

### Field 2: Quantity

| Property | Value |
| :--- | :--- |
| **Name** | Quantity |
| **Type** | `Numeric` |
| **Required** | On |
| **Reference** | `quantity` |
| **Default Value** | `1` |

### Field 3: Shipping Speed

| Property | Value |
| :--- | :--- |
| **Name** | Shipping Speed |
| **Type** | `Select` |
| **Required** | On |
| **Reference** | `shipping_level` |
| **Option Type** | `Constants` |

Click **Add Option** for each:

| Label | Value |
| :--- | :--- |
| Standard Mail (3-10 business days) | `MAIL` |
| Priority Mail (1-3 business days) | `PRIORITY_MAIL` |
| Ground (3-5 business days) | `GROUND` |
| Ground HD (2-4 business days) | `GROUND_HD` |
| Ground Business (3-5 business days) | `GROUND_BUS` |
| Expedited (2-3 business days) | `EXPEDITED` |
| Express (1-2 business days) | `EXPRESS` |

### Fields 4-10: Custom Address Override (Optional)

These fields only appear if the user toggles "Use a different shipping address". They are **not required** in the GHL form because the Dynamic Fields endpoint handles them. However, if you want them visible in the static form as well, add them:

| Name | Type | Required | Reference |
| :--- | :--- | :--- | :--- |
| Use Custom Address | Toggle | Off | `use_custom_address` |
| Custom Street Address | String | Off | `custom_street1` |
| Custom Apartment | String | Off | `custom_street2` |
| Custom City | String | Off | `custom_city` |
| Custom State Code | String | Off | `custom_state_code` |
| Custom Postal Code | String | Off | `custom_postcode` |
| Custom Country Code | String | Off | `custom_country_code` |

> **Note:** You do NOT need to add custom_first_name, custom_last_name, custom_email, or custom_phone in the GHL form. Those are auto-resolved from the contact. The custom address fields are only for the street/city/state/postal/country.

---

## Step 4: Action Execution

Scroll down to the **Action execution** section.

| Field | Value |
| :--- | :--- |
| **URL** | `https://literaryapp.onrender.com/workflow-action/create-print-job` |
| **Headers** | Leave empty |
| **Body** | Leave empty |
| **Pause execution** | Off |

---

## Step 5: Manage Custom Variables (Response Data)

Scroll down to the **Manage custom variables** section. Click **Add Variable** for each:

| Name | Type | Reference |
| :--- | :--- | :--- |
| Internal Print Job ID | String | `jobId` |
| Lulu Print Job ID | String | `luluPrintJobId` |
| Print Job Status | String | `status` |
| Total Cost | Numeric | `totalCost` |
| Print Cost | Numeric | `printCost` |
| Shipping Cost | Numeric | `shippingCost` |
| Markup | Numeric | `markup` |
| Retail Price | Numeric | `retailPrice` |
| Reader Name | String | `readerName` |
| Reader Email | String | `readerEmail` |
| Result Message | String | `message` |

---

## Step 6: Test

Scroll down to the **Test section**:

1. **Location ID:** Enter a valid sub-account Location ID that has installed your app.
2. **Test setup** — enter sample data:

| Field | Sample Value |
| :--- | :--- |
| `book_id` | A valid book ID from that location |
| `quantity` | `1` |
| `shipping_level` | `MAIL` |
| `use_custom_address` | `false` |

3. Click **Run test**.
4. If successful, the **Response** section shows the output variables populated.
5. Check the **Response data** section to see the full JSON.

---

## Step 7: Save

Click **Save** in the top right corner.

> **Important Notes:**
> - After saving, it may take 5-10 minutes for the action to propagate to all sub-accounts.
> - The sub-account must have "LC Premium Triggers & Actions" enabled in billing settings.
> - The action appears in workflows under the category you selected (e.g., "Print on Demand").
> - To use it: In the Workflow Builder, add a new action → find "Create Lulu Print Job" → configure the 3 fields → save the workflow.

---

## Troubleshooting

| Problem | Cause | Fix |
| :--- | :--- | :--- |
| "Failed to load fields" | Wrong URL or no OAuth token | Check `APP_BASE_URL` in Render; verify app is installed in the sub-account |
| Action not appearing | Not propagated yet | Wait 5-10 minutes; ensure "LC Premium Triggers & Actions" is enabled |
| "Contact not found" | No contactId in workflow trigger | Use a trigger that fires for a specific contact (e.g., "Tag Added", "Appointment Confirmed") |
| "Missing street address" | Contact has no address in GHL | Add the address to the contact, or enable "Use a different shipping address" in the action config |
| "Lulu not configured" | No Lulu credentials for this sub-account | Go to Lulu Integration in Settings and add the API key |
| Empty book dropdown | No "Ready" books for this location | Add at least one book with status "Ready" |

---

## Data Flow Diagram

```
GHL Workflow Trigger
    │
    ▼
GHL sends: { data: { book_id, quantity, shipping_level }, extras: { locationId, contactId } }
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    YOUR BACKEND                             │
│                                                             │
│  1. Fetch GHL contact → name, email, phone, address         │
│  2. Normalize address (trim, uppercase codes)               │
│  3. Validate all required fields                            │
│  4. Fetch book from database                                │
│  5. Calculate print + shipping cost                         │
│  6. Create print job record in database                     │
│  7. Submit to Lulu.com API                                  │
│  8. Create GHL opportunity + tag contact                    │
│  9. Return output variables                                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
GHL receives: { jobId, luluPrintJobId, status, totalCost, ... }
    │
    ▼
Downstream workflow steps can use: {{workflow.order.jobId}}, etc.
```
