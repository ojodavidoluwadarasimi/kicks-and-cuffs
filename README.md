# Kicks & Cuffs

A shoe store for small sellers who run on WhatsApp and Instagram. It fixes three daily headaches:

1. "Is this in my size?" Every shoe shows live stock by size.
2. "I have paid, here is the screenshot." Checkout confirms payment automatically.
3. "Where is my order?" Every order gets a tracking page.

Plain HTML, CSS and JavaScript. No install, no build step.

## Run it

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8080
```

Then visit http://localhost:8080

## Make it your own

Almost everything a seller changes lives in one file: `js/data.js`.

- `STORE`: store name, currency, delivery zones and fees, returns window, contact details (WhatsApp number in international format without +, for example `2348012345678`), opening hours.
- `PRODUCTS`: one entry per shoe. Name, price, colours with photos, stock per size, the "about" text, features, specs, care notes and occasions.
- `SIZES` and `SIZE_GUIDE`: the sizes you sell and the size chart.

Replace photos in `assets/img/` and point to them from `data.js`.

The specs, descriptions, prices and policies that ship with this project are placeholders. Check every one against the real stock before you sell anything.

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Home |
| `shop.html` | Browse, filter by category, size, saved |
| `product.html?id=...` | Shoe page with gallery, sizes, details, care |
| `cart.html` | Cart |
| `checkout.html` | Details, delivery zone, payment |
| `track.html` | Order tracking |
| `info.html` | Delivery, returns, size guide, about, contact |
| `admin.html` | Seller dashboard |

## What is real and what is a demo

- Cart, saved shoes, orders and stock are stored in the browser (`localStorage`). They are not shared between devices.
- Payment is a pretend window (`js/payment.js`, provider `mock`). No money moves.
- The dashboard has no login. Anyone who opens `admin.html` can use it.

## Going live: the server step

Real payments need a small server, because secret keys must never sit in browser code and a payment must be confirmed by the payment company, not by the page.

1. A small backend (Node or similar) with: products and stock, orders, seller login.
2. Monnify for Nigeria: create the transaction on the server, open the checkout in the browser, confirm with the webhook, then mark the order paid.
3. Stripe for international sellers: same flow with Checkout Sessions and a webhook.
4. In `js/data.js` set `paymentProvider` to `"monnify"` or `"stripe"`. The provider slots are already in `js/payment.js`.
5. Move orders and stock from `localStorage` to the server, and protect `admin.html` with login.
