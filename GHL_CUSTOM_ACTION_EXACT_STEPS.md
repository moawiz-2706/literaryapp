# GHL Custom Action Setup Guide: Exact UI Steps

Based on the exact UI you shared from the GoHighLevel Developer Portal, here are the precise step-by-step instructions to configure the "Create Lulu Print Job" action.

You are currently on the **Configuration** tab. You need to fill out the following sections exactly as shown below.

---

## 1. Action Information

At the very top of the page, you'll see the Action Information section.

| Field | Value to Enter |
| :--- | :--- |
| **Name** | `Create Lulu Print Job` |
| **Key** | `create_lulu_print_job` |
| **Description** | `Place a print order on Lulu.com directly from a GHL workflow. Select a book, configure shipping, and submit the order. Lulu handles payment directly.` |
| **Icon** | Select a Printer or Book icon from the list. |
| **Category** | Select `External Communications` (or create a new one called "Print on Demand"). |

---

## 2. Manage Fields

Scroll down to the **Manage fields** section. You must click **Add Field** (or the `+` button) to add the following fields one by one.

### Field 1: Select Book
| Field | Value |
| :--- | :--- |
| **Name** | `Select Book` |
| **Type** | `Dynamic` |
| **Required** | `On` |
| **Reference** | `book_id` |

> **Note:** Since we are using Dynamic fields to pull the book list from your database, you only need to add ONE Dynamic field here. The dynamic-fields endpoint will handle generating the rest of the form UI (shipping options, address, etc.).

### Field 2: Quantity
| Field | Value |
| :--- | :--- |
| **Name** | `Quantity` |
| **Type** | `Numeric` |
| **Required** | `On` |
| **Reference** | `quantity` |
| **Default Value** | `1` |

### Field 3: Shipping Speed
| Field | Value |
| :--- | :--- |
| **Name** | `Shipping Speed` |
| **Type** | `Select` |
| **Required** | `On` |
| **Reference** | `shipping_level` |
| **Option Type** | `Constants` |

*Click **Add Option** for each of the following:*
- Label: `Standard Mail (3-10 business days)` | Value: `MAIL`
- Label: `Priority Mail (1-3 business days)` | Value: `PRIORITY_MAIL`
- Label: `Ground (3-5 business days)` | Value: `GROUND`
- Label: `Ground HD (2-4 business days)` | Value: `GROUND_HD`
- Label: `Ground Business (3-5 business days)` | Value: `GROUND_BUS`
- Label: `Expedited (2-3 business days)` | Value: `EXPEDITED`
- Label: `Express (1-2 business days)` | Value: `EXPRESS`

### Fields 4-13: Shipping Address (Optional)
You can add these as standard fields, but because your backend's `/dynamic-fields` endpoint handles the address fields dynamically, you can actually skip adding them manually here if you prefer. However, if you want them to appear in the static form as well, add them as `String` types with these References:
- `ship_first_name`
- `ship_last_name`
- `ship_email`
- `ship_phone`
- `ship_street1`
- `ship_street2`
- `ship_city`
- `ship_state_code`
- `ship_postcode`
- `ship_country_code`

---

## 3. Action Execution

Scroll down to the **Action execution** section. This tells GHL where to send the data when the workflow runs.

| Field | Value |
| :--- | :--- |
| **URL** | `https://literaryapp.onrender.com/workflow-action/create-print-job` |
| **Headers** | Leave empty (or add `Content-Type: application/json` if you prefer). |
| **Body** | Leave empty (GHL sends the data automatically). |
| **Pause execution** | `Off` |

---

## 4. Manage Custom Variables (Response Data)

This is the most important step for users who want to use the output of this action in subsequent workflow steps (like sending an SMS to the customer).

Scroll down to the **Manage custom variables** section. Click **Add Variable** for each of the following:

| Name | Type | Reference |
| :--- | :--- | :--- |
| Internal Print Job ID | `String` | `jobId` |
| Lulu Print Job ID | `String` | `luluPrintJobId` |
| Print Job Status | `String` | `status` |
| Total Cost | `Numeric` | `totalCost` |
| Print Cost | `Numeric` | `printCost` |
| Shipping Cost | `Numeric` | `shippingCost` |
| Markup | `Numeric` | `markup` |
| Retail Price | `Numeric` | `retailPrice` |
| Reader Name | `String` | `readerName` |
| Reader Email | `String` | `readerEmail` |
| Result Message | `String` | `message` |

---

## 5. Test Section

Scroll down to the **Test section** at the bottom of the page.

1. In the **Location ID** box, enter a valid sub-account Location ID that has installed your app and has a valid OAuth token.
2. In the **Test setup** box, enter sample data for the fields you created:
   - `book_id`: A valid book ID from that location
   - `quantity`: `1`
   - `shipping_level`: `MAIL`
   - `ship_first_name`: `John`
   - `ship_last_name`: `Doe`
   - `ship_email`: `john@example.com`
   - `ship_phone`: `5551234567`
   - `ship_street1`: `123 Main St`
   - `ship_city`: `Austin`
   - `ship_state_code`: `TX`
   - `ship_postcode`: `78701`
   - `ship_country_code`: `US`
3. Click **Run test**.
4. If successful, the **Response** section will show `status: "Submitted"` and the custom variables will be populated.

---

## 6. Save

Once the test is successful, click **Save** in the top right corner.

> **Important Note:** After saving, it may take 5-10 minutes for the action to propagate to the sub-accounts. Also, ensure that the sub-accounts have the "LC Premium Triggers & Actions" enabled in their billing settings, as Marketplace actions are chargeable per execution.
