# Bolix ecommerce pages

Open index.html or serve this folder with a local static server. Shop: shop.html. Admin: admin.html.

Added catalog search, family filters and price sorting; fragrance details; wishlist; cart quantities; demo checkout; confirmation; order tracking by reference and email; local customer profile and history; contact email preparation; FAQ, about, shipping, privacy and terms; admin overview, product creation, inventory editing, order status management and customer list.

All data is stored in this browser's local storage. The admin is deliberately labeled public demo and does not provide access control. Existing homepage bag data carries into checkout. No payment is collected, and orders are not transmitted or emailed. Stock values and delivery rates are demonstration values. Homepage product cards retain the original curated presentation; admin product edits appear in the new commerce pages.

Before accepting real customers: connect a persistent backend, secure customer and administrator authentication with role checks, server-validated inventory and pricing, a payment provider and verified payment callbacks, order email delivery, and merchant-approved shipping and legal policies. Serve over HTTPS. Do not store real customer information in this demonstration.

Verification: node --check commerce.js; node --check home-commerce.js; node --check script.js; node verify-commerce.cjs. The smoke check renders 15 pages and exercises cart addition, checkout, order persistence, confirmation and all admin views in a simulated browser environment. Local HTML links and assets were checked. Visual browser verification was not completed in this environment.
