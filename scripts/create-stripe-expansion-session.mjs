import Stripe from 'stripe';

const required = ['STRIPE_SECRET_KEY', 'SKYGRID_SUCCESS_URL', 'SKYGRID_CANCEL_URL'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(2);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const amountDollars = Number.parseInt(process.env.SKYGRID_EXPANSION_AMOUNT_USD || '25', 10);
if (!Number.isFinite(amountDollars) || amountDollars < 1) {
  console.error('SKYGRID_EXPANSION_AMOUNT_USD must be a positive whole-dollar amount.');
  process.exit(2);
}

const fundingBucket = process.env.SKYGRID_FUNDING_BUCKET || 'expansion_general';
const description = process.env.SKYGRID_PAYMENT_DESCRIPTION || 'SkyGrid / Aura-Core expansion funding';

const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  success_url: process.env.SKYGRID_SUCCESS_URL,
  cancel_url: process.env.SKYGRID_CANCEL_URL,
  line_items: [
    {
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: amountDollars * 100,
        product_data: {
          name: description,
          description: 'Supports SkyGrid expansion, device onboarding, Emergency Memory Window pilot work, building lease planning, hiring assistance, reporting, and reserve.',
        },
      },
    },
  ],
  metadata: {
    project: 'aura-core/skygrid',
    funding_bucket: fundingBucket,
    ledger_model: 'SkyGrid Expansion Funding Rail',
    restricted_grant_funds: 'false',
  },
});

console.log(JSON.stringify({
  id: session.id,
  url: session.url,
  amount_usd: amountDollars,
  funding_bucket: fundingBucket,
  project: 'aura-core/skygrid',
}, null, 2));
