# NAGMEENA V21 — Final Order UX

- Admin action moved out of the customer navbar and into the hamburger menu.
- Added a customer Orders entry and `/orders` page scoped only to secure order tokens remembered by that browser.
- One shared order status bar now summarizes multiple simultaneous pending/confirmed orders.
- A new order submitted while another confirmation is visible is merged into the same shared status surface.
- Newly confirmed orders retain the 4-second confirmation experience, followed by a 15-second confirmed state in the shared bar.
- Pending orders remain visible even after confirmed items age out.
- Confirmation screen and order bar now use stronger, readable NAGMEENA colors instead of heavy blur.
- Status refreshes on polling, focus, visibility return and order-storage events.
