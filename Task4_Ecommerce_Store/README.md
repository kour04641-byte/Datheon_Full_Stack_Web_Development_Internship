# Kart: E-Commerce Product Catalog & Interactive Shopping Cart

A modern storefront built with HTML, CSS and vanilla JavaScript. Products come from [FakeStoreAPI](https://fakestoreapi.com/products).

## Features
- Product cards with ratings, prices and badges (Top rated, Popular, Deal)
- Category filtering (Electronics, Jewelry, Clothing), live search, sorting by price or rating
- Slide-out cart drawer with a badge counter on the navbar
- Cart actions: `addToCart()`, `removeFromCart()`, `updateQuantity()`, `calculateTotal()`
- Tax (8%), shipping (free over $100, with progress bar) and subtotal calculations
- Coupon code (`SAVE10`), wishlist, simulated checkout modal with order confirmation
- Loading skeletons, error state with retry, offline fallback to cached products
- Quick-view modal with full description, price range slider, hero banner with one-click "Shop top rated"
- Light and dark theme (remembers your choice), `/` shortcut to search
- Cart and wishlist persist in `localStorage`
- Responsive grid, keyboard accessible, respects reduced-motion settings

## Run locally
Open `index.html` in a browser (internet needed on first load to fetch products).

## Tech
JavaScript ES6+ (fetch, async/await), CSS Grid, state management with plain objects, localStorage API
