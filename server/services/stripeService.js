'use strict';
// Stripe Connect Service
// LiteraryApp is the Platform Account.
// Each author is a Connected Account (Express).
// All book sales are destination charges with application_fee_amount = print cost + actual shipping.

const Stripe = require('stripe');
const db = require('../db/database');
const ghl = require('./ghlService');

let stripeClient = null;

function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// ── Author Onboarding ─────────────────────────────────────────────────────────
// Creates a Stripe Express account for the author and returns the onboarding URL.

async function createConnectAccountLink(locationId, authorEmail, returnUrl, refreshUrl) {
  const stripe = getStripe();

  // Check if account already exists
  const existing = await db.getStripeAccount(locationId);
  let accountId = existing?.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: authorEmail,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { ghl_location_id: locationId }
    });
    accountId = account.id;
    await db.upsertStripeAccount(locationId, accountId, false);
    await ghl.setStripeAccountId(locationId, accountId);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding'
  });

  return { url: accountLink.url, accountId };
}

// ── Check Onboarding Status ───────────────────────────────────────────────────

async function checkAccountStatus(locationId) {
  const stripe = getStripe();
  const record = await db.getStripeAccount(locationId);
  if (!record) return { connected: false, onboardingComplete: false };

  const account = await stripe.accounts.retrieve(record.stripe_account_id);
  const onboardingComplete = account.details_submitted && account.charges_enabled;

  if (onboardingComplete && !record.onboarding_complete) {
    await db.upsertStripeAccount(locationId, record.stripe_account_id, true);
  }

  return {
    connected: true,
    onboardingComplete,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    stripeAccountId: record.stripe_account_id
  };
}

// ── Create PaymentIntent (Destination Charge) ─────────────────────────────────
// Spec: application_fee_amount = print cost + actual Lulu shipping cost (in cents)
// The flat-rate shipping surplus is additional margin for LiteraryApp.
//
// Money flow per book:
// 1. Reader pays retail + flat-rate shipping -> Author Stripe
// 2. Stripe fee deducted (~2.9% + $0.30)
// 3. application_fee_amount routed to LiteraryApp platform Stripe account
// 4. Author nets: retail - Stripe fee - application_fee_amount
// 5. LiteraryApp pays Lulu: print cost + actual shipping
// 6. LiteraryApp margin: application_fee_amount - Lulu cost

async function createDestinationCharge(params) {
  const stripe = getStripe();
  const {
    locationId,
    amountCents,          // retail price + flat-rate shipping in cents
    applicationFeeCents,  // print cost + actual Lulu shipping in cents
    currency = 'usd',
    metadata = {}
  } = params;

  const record = await db.getStripeAccount(locationId);
  if (!record || !record.stripe_account_id) {
    throw new Error('Author has not connected their Stripe account. Cannot process payment.');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    application_fee_amount: applicationFeeCents,
    transfer_data: { destination: record.stripe_account_id },
    metadata: {
      ghl_location_id: locationId,
      ...metadata
    }
  });

  return paymentIntent;
}

// ── Webhook Signature Verification ───────────────────────────────────────────

function constructStripeEvent(rawBody, signature) {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

module.exports = {
  createConnectAccountLink,
  checkAccountStatus,
  createDestinationCharge,
  constructStripeEvent
};
