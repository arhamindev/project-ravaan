# RAVAAN — Streetwear website

Plain HTML, CSS and JavaScript (no frameworks). Products, policies and FAQ live in JSON files, so you can change content without touching the code.

## 1. Run it (important)

The site loads its data from the `data/` folder using `fetch()`. Browsers block that if you double-click `index.html`, so run a tiny local server:

- **VS Code:** install "Live Server", right-click `index.html`, choose *Open with Live Server*.
- **Or:** open a terminal in this folder and run `python -m http.server 8000`, then visit `http://localhost:8000`.

If you open it by double-click, the page tells you this on screen.

## 2. Folder map

| Path | What it does |
|---|---|
| `index.html` | Page structure, SEO tags, hero / story / portal markup, cart + modal shells |
| `css/style.css` | Design system and all components |
| `css/responsive.css` | Tablet and phone layouts (hero is recomposed under 860px) |
| `css/animations.css` | CSS-only motion and the reduced-motion rules |
| `js/utils.js` | Shared helpers and the "layer" system (focus trap, Escape, scroll lock) |
| `js/main.js` | Loads the JSON, starts everything |
| `js/navigation.js` | `#/men`-style routing and the bottom-to-top page transition |
| `js/heroAnimation.js` | Pinned hero: the scroll-scrubbed three-frame escalator |
| `js/storyAnimation.js` | Three story moments driven by scroll |
| `js/portal.js` | Wordmark zoom + cursor-reactive dots |
| `js/products.js` | Grids, category filter, product window |
| `js/cart.js` | Shared cart, drawer, floating button, localStorage |
| `js/checkout.js` | Form validation and WhatsApp message |
| `js/faq.js`, `js/info.js` | FAQ accordion; Contact, Blog, Size Guide, policy pages |
| `data/*.json` | `men`, `women`, `collections`, `faq`, `business`, `policies`, `sizeguide` |
| `assets/images` | Your original files (unchanged) plus optimised copies |
| `assets/vendor` | Local GSAP copies, used only if the CDN cannot be reached |

## 3. Editing content

- **Products:** `data/men.json`, `data/women.json`. Each product has `id` (must be unique), `name`, `category`, `price`, `image`, `gallery`, `colours`, `sizes`, `description`.
  - An empty `sizes` list means "size confirmed on WhatsApp". An empty `colours` list hides colour choice. Only add real values.
  - Set `"hasRealPhoto": true` when you replace `image` with a real photo (this changes the alt text and image padding).
- **Winter / Summer:** `data/collections.json` lists product IDs for each. Add IDs there.
- **Prices, delivery charges, free-delivery limit, WhatsApp number, support hours:** `data/business.json`.
- **Policies and FAQ wording:** `data/policies.json`, `data/faq.json`. Delivery, exchange, cancellation and payment are *proposed* policies from your brief, and those pages say so. Remove `proposedNotice` handling in `js/info.js` once confirmed.
- **Size guide:** `data/sizeguide.json` (tops only, as specified).

## 4. About your images

You supplied three files, so the site is honest about it:

- `hero-section-img.jpg` had a checkerboard baked into the picture. A cut-out copy was made (`hero-jacket-cutout.webp`). The edges are automatic and slightly rough at the cuffs; a clean transparent PNG from your source would look better.
- The three hero frames are three framings (full, front detail, sleeve detail) of that one jacket. The "Look 01/02/03" buttons replace colour swatches because no colours were supplied.
- The jacket is mapped to **one** product only: Men's *Essential Zip Hoodie* (`men-014`). Every other product uses `sample-img-for-items-in-shop.png` as a placeholder.
- The sewing-machine illustration is used as story art only. It makes no claim about how anything is made.
- The Men, Women, Winter, Summer and FAQ portal cards reuse these assets as navigation art.

## 5. Before launch

1. Replace placeholder images and add real sizes/colours.
2. Confirm delivery, exchange, cancellation and payment details, then update the JSON.
3. In `index.html`, add the `canonical` and `og:url` lines (see the TODO comment), and make `og:image` / `twitter:image` full URLs.
4. Add `sitemap.xml` and the `Sitemap:` line in `robots.txt`.
5. Pages such as `#/men` are overlays inside one HTML page, so search engines see the homepage only. Separate pages are a later, backend-era improvement.
6. Checkout only opens a prefilled WhatsApp message. It does not place, confirm or take payment for an order.

## 6. Accessibility and motion

Keyboard focus is visible, dialogs trap focus and close with Escape, the FAQ and category strip are real buttons, and nothing depends on hover (touch users see names and prices under each image). With "reduce motion" enabled, pinning and scrubbing are turned off and the story shows as a simple stacked section.

## 7. Tested

Chromium at 1440x900, 1024x640, 820x1180 and 390x844: hero rotation forwards and backwards, story, portal, all page routes, category filtering, size validation, cart maths, localStorage persistence, checkout validation, WhatsApp message text, FAQ and keyboard, reduced motion, and no console errors. Not tested on real iOS Safari or Firefox: please check there, especially the sticky/pinned sections.
