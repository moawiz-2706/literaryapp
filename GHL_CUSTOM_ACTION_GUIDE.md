# GHL Custom Workflow Action: Registration Guide

To make the "Create Lulu Print Job" action available in the GoHighLevel workflow builder, you must register it in your GHL Developer Portal.

This guide provides the exact configuration needed.

## Step 1: Navigate to the Action Builder

1. Log in to the [GoHighLevel Marketplace Developer Portal](https://marketplace.gohighlevel.com).
2. Open your App.
3. In the left sidebar, click **Modules** > **Workflow**.
4. Click **Create Action**.

## Step 2: Basic Configuration

Fill out the basic details for the action:

- **Action Name:** Create Lulu Print Job
- **Action Description:** Submits an order to the Lulu print network and charges a $10 service fee.
- **Action Icon:** Choose an appropriate icon (e.g., a book or printer).
- **Category:** External Communications (or create a custom category like "Print on Demand").

## Step 3: Action Execution URL

This is the webhook endpoint where GHL will send the payload when the action fires.

- **Action Execution URL:** `https://[YOUR_RENDER_URL]/workflow-action/create-print-job`

*(Replace `[YOUR_RENDER_URL]` with your actual deployed backend URL, e.g., `https://literaryapp-backend.onrender.com`)*

## Step 4: Configure the Form Fields

This defines the UI the user sees when they add the action to a workflow.

We will configure the action to use **Dynamic Fields** so it automatically pulls the list of available books from your backend.

1. Under the Form Configuration section, select **Dynamic Fields**.
2. **Dynamic Fields URL:** `https://[YOUR_RENDER_URL]/workflow-action/dynamic-fields`

*(When the user opens the action, GHL will ping this URL to fetch the dropdown list of books and the shipping speed options).*

### Fallback Manual Fields (Optional)

If you prefer not to use Dynamic Fields, you can manually define the following fields:

| Field Label | Field Key | Field Type | Required | Options (if select) |
| :--- | :--- | :--- | :--- | :--- |
| Select Book | `product_id` | Select | Yes | (Map to GHL Products) |
| Shipping Speed | `shipping_level` | Select | Yes | Standard Mail (MAIL)<br>Priority Mail (PRIORITY_MAIL)<br>Ground (GROUND)<br>Expedited (EXPEDITED) |
| Quantity | `quantity` | Number | Yes | |

## Step 5: Output Variables (Action Responses)

When the backend successfully submits the print job, it returns a JSON object. You must map these keys in the Developer Portal so they can be used as variables in subsequent workflow steps (e.g., sending an SMS to the reader).

Add the following Custom Output Variables:

1. **Key:** `jobId` | **Label:** Internal Print Job ID
2. **Key:** `luluPrintJobId` | **Label:** Lulu Print Job ID
3. **Key:** `walletChargeId` | **Label:** Wallet Charge ID
4. **Key:** `serviceFeeCharged` | **Label:** Service Fee Charged
5. **Key:** `status` | **Label:** Print Job Status
6. **Key:** `message` | **Label:** Result Message

## Step 6: Save and Test

1. Click **Save**.
2. Go to a sub-account where your app is installed.
3. Open **Automation** > **Workflows**.
4. Create a new workflow triggered by **Order Submitted**.
5. Add an action. You should now see **Create Lulu Print Job** in the action list.
6. Configure it, save the workflow, and submit a test order to verify the webhook fires.
