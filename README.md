# Kicks & Cuffs

A real online shoe store for small sellers. Plain HTML, CSS and JavaScript on the front, Supabase (Postgres, Auth, Storage) as the backend. No build step.

## How an order works
1. Customer picks shoes and a delivery state, then sends an order request (or messages the seller on WhatsApp with the full cart).
2. The owner logs in at `/admin.html`, and accepts or declines. Stock is held when the request is made and returned on decline or cancel.
3. After acceptance the customer sees the bank details, transfers, and taps "I have sent the money".
4. The owner taps "Money received". The customer's page shows "Payment received" and a thank-you.
5. Owner moves the order through packing, shipped and delivered. Customers follow it at `/track.html` with order number and phone.

## Owner dashboard
Requests, all orders, products (add and edit with photo upload and live preview, hide or show, stock by size), insights (sales chart, best sellers, low stock), discount codes, customers, and settings (bank details, announcement bar, delivery fees, blocked states, password). Printable packing slips.

The owner logs in with a username and password. The password lives only in Supabase Auth (hashed). To add or change an owner: create the account in Supabase Auth, then run
`update public.profiles set role = 'admin', username = 'Your Name' where id = (select id from auth.users where email = 'you@example.com');`
To change the password, use Settings in the dashboard.

## Setup
- `js/config.js` holds the Supabase URL and publishable key. Never put a secret or service_role key in the front end.
- Storage buckets: `products` (owner uploads) and `avatars` (customers, own folder only).
- Auth, Confirm email: turn it off for instant signup, or add SMTP for reliable emails.
- Free Supabase projects pause when idle. Restore from the dashboard.
- Deploy: push to GitHub, import in Vercel (static, no settings needed).

## Security
Orders are not readable from the browser. Customers use database functions (`create_order`, `track_order`, `submit_payment`, `cancel_order`) that check everything again on the server, including prices, stock, delivery fee and discount codes. Owner actions check `is_admin()`.

## Paystack (online payment)
Two Supabase Edge Functions do the work: `paystack` (starts a payment and verifies it when the customer returns) and `paystack-webhook` (Paystack tells us a payment succeeded; the signature is checked). Their source is in `supabase/functions/`.

1. In Supabase, Edge Functions, Secrets: add `PAYSTACK_SECRET_KEY` (use the `sk_test_...` key first, then `sk_live_...` when Paystack approves your account).
2. In Paystack, Settings, API Keys and Webhooks: set the webhook URL to `https://jjeasilqqkqhcwkojzrh.supabase.co/functions/v1/paystack-webhook` (there is one box for test and one for live).
3. In the dashboard, Settings, turn on "Accept online payments".
Going live later is only swapping the secret key. No code change.
Amounts are checked against the order total on the server before an order is marked paid.
