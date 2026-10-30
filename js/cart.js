/* ==========================================================================
   cart.js — ONE shopping cart shared by the whole website.

   What is stored in localStorage:  only [{ key, productId, size, quantity }]
   Prices and names are NOT stored. They are looked up from the JSON data each
   time, so if you change a price in men.json the cart updates automatically.
   ========================================================================== */
(function (R) {
  'use strict';

  const STORAGE_KEY = 'ravaan.cart.v1';
  const MAX_QUANTITY = 10;
  let items = [];              // the cart contents
  const listeners = [];        // functions to call whenever the cart changes

  /* ---------- Storage ---------- */
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      items = Array.isArray(saved) ? saved : [];
    } catch (error) {
      items = [];              // corrupted data or storage blocked: start with an empty cart
    }
    // Drop anything that no longer exists in the catalogue.
    items = items.filter(function (item) { return R.products.getById(item.productId); });
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (error) { /* storage unavailable: cart still works for this visit */ }
  }

  function notify() {
    save();
    listeners.forEach(function (listener) { listener(); });
  }

  function makeKey(productId, size) { return productId + '|' + (size || 'none'); }

  /* ---------- Cart actions ---------- */
  function add(productId, size, quantity) {
    quantity = Math.max(1, Number(quantity) || 1);
    const key = makeKey(productId, size);
    const existing = items.find(function (item) { return item.key === key; });
    if (existing) {
      existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity);
    } else {
      items.push({ key: key, productId: productId, size: size || '', quantity: Math.min(MAX_QUANTITY, quantity) });
    }
    notify();
  }

  function remove(key) {
    items = items.filter(function (item) { return item.key !== key; });
    notify();
  }

  function changeQuantity(key, change) {
    const item = items.find(function (entry) { return entry.key === key; });
    if (!item) return;
    item.quantity = Math.max(1, Math.min(MAX_QUANTITY, item.quantity + change));
    notify();
  }

  function clear() { items = []; notify(); }

  /* ---------- Reading the cart ---------- */

  /* Each line = the stored item + the full product + the line total. */
  function getLines() {
    return items.map(function (item) {
      const product = R.products.getById(item.productId);
      return { key: item.key, product: product, size: item.size, quantity: item.quantity, lineTotal: product.price * item.quantity };
    });
  }

  function getCount() { return items.reduce(function (sum, item) { return sum + item.quantity; }, 0); }
  function getSubtotal() { return getLines().reduce(function (sum, line) { return sum + line.lineTotal; }, 0); }

  /*
    Delivery charge rules come from data/business.json:
      - orders above the free-delivery amount: free
      - Karachi: one charge, every other city: another charge
    `area` is "karachi" or "other".
  */
  function getDeliveryCharge(area, subtotal) {
    const rules = R.data.business.delivery;
    if (subtotal > rules.freeDeliveryAbove) return 0;
    return area === 'karachi' ? rules.karachiCharge : rules.otherCitiesCharge;
  }

  function getTotals(area) {
    const subtotal = getSubtotal();
    const delivery = subtotal > 0 ? getDeliveryCharge(area, subtotal) : 0;
    const discount = 0; // no discounts exist yet; the checkout hides this row while it is 0
    return { subtotal: subtotal, delivery: delivery, discount: discount, total: subtotal + delivery - discount };
  }

  /* ---------- Cart interface (drawer) ---------- */
  const drawer = function () { return R.qs('#cart-drawer'); };

  function renderLine(line) {
    const sizeText = line.size ? 'Size: ' + R.escapeHTML(line.size) : 'Size: to be confirmed';
    const genderText = line.product.gender === 'men' ? 'Men' : 'Women';
    return '' +
      '<li class="cart-line" data-key="' + R.escapeHTML(line.key) + '">' +
        '<img class="cart-line__img" src="' + R.escapeHTML(line.product.image) + '" alt="" width="72" height="80">' +
        '<div class="cart-line__info">' +
          '<p class="cart-line__name">' + R.escapeHTML(line.product.name) + '</p>' +
          '<p class="cart-line__meta">' + genderText + ' · ' + sizeText + '</p>' +
          '<p class="cart-line__price">' + R.formatPrice(line.product.price) + '</p>' +
          '<div class="stepper stepper--small" role="group" aria-label="Quantity for ' + R.escapeHTML(line.product.name) + '">' +
            '<button type="button" class="stepper__btn" data-cart-action="decrease" aria-label="Decrease quantity"' + (line.quantity <= 1 ? ' disabled' : '') + '><i class="fa-solid fa-minus" aria-hidden="true"></i></button>' +
            '<span class="stepper__value" aria-live="polite">' + line.quantity + '</span>' +
            '<button type="button" class="stepper__btn" data-cart-action="increase" aria-label="Increase quantity"' + (line.quantity >= MAX_QUANTITY ? ' disabled' : '') + '><i class="fa-solid fa-plus" aria-hidden="true"></i></button>' +
          '</div>' +
        '</div>' +
        '<div class="cart-line__side">' +
          '<p class="cart-line__total">' + R.formatPrice(line.lineTotal) + '</p>' +
          '<button type="button" class="cart-line__remove" data-cart-action="remove" aria-label="Remove ' + R.escapeHTML(line.product.name) + ' from cart"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></button>' +
        '</div>' +
      '</li>';
  }

  function renderDrawer() {
    const body = R.qs('#cart-body');
    const footer = R.qs('#cart-footer');
    const lines = getLines();

    if (!lines.length) {
      body.innerHTML = '<div class="cart-empty"><p class="cart-empty__text">Your cart is looking a little empty.</p>' +
        '<button type="button" class="btn js-explore-collection">EXPLORE COLLECTION</button></div>';
      footer.innerHTML = '';
      return;
    }

    body.innerHTML = '<ul class="cart-lines">' + lines.map(renderLine).join('') + '</ul>';
    footer.innerHTML = '' +
      '<div class="cart-summary"><span>Subtotal</span><strong>' + R.formatPrice(getSubtotal()) + '</strong></div>' +
      '<p class="cart-note">Delivery charges are calculated at checkout.</p>' +
      '<button type="button" class="btn btn--block js-start-checkout">CHECKOUT</button>' +
      '<button type="button" class="link-btn js-close-cart">CONTINUE SHOPPING</button>';
  }

  /* Update every small cart indicator (navbar, floating button, overlay headers). */
  function renderIndicators() {
    const count = getCount();
    R.qsa('.js-cart-count').forEach(function (badge) {
      badge.textContent = count;
      if (badge.classList.contains('icon-btn__count')) badge.hidden = count === 0;
    });

    // The floating cart only exists while the cart has something in it.
    const floating = R.qs('#floating-cart');
    if (floating) {
      const wasHidden = floating.hidden;
      floating.hidden = count === 0;
      if (count > 0) {
        floating.classList.remove('is-pop');
        void floating.offsetWidth;            // restart the CSS animation
        floating.classList.add('is-pop');
      }
      if (wasHidden && count > 0) floating.classList.add('is-entering');
    }
  }

  /* ---------- Opening / closing the drawer ---------- */
  function openDrawer() {
    renderDrawer();
    const backdrop = R.qs('#cart-backdrop');
    backdrop.hidden = false;
    requestAnimationFrame(function () { backdrop.classList.add('is-open'); });
    R.openLayer(drawer(), { focusSelector: '.js-close-cart', requestClose: closeDrawer });
  }

  function closeDrawer() {
    const backdrop = R.qs('#cart-backdrop');
    backdrop.classList.remove('is-open');
    setTimeout(function () { backdrop.hidden = true; }, 320);
    R.closeLayer(drawer());
  }

  function bindEvents() {
    // Any element with .js-open-cart opens the cart (navbar, floating button, overlay headers).
    document.addEventListener('click', function (event) {
      if (event.target.closest('.js-open-cart')) { event.preventDefault(); openDrawer(); return; }
      if (event.target.closest('.js-close-cart')) { closeDrawer(); return; }
      if (event.target.closest('#cart-backdrop')) { closeDrawer(); return; }

      if (event.target.closest('.js-start-checkout')) {
        closeDrawer();
        setTimeout(function () { R.checkout.open(); }, 200);
        return;
      }
      if (event.target.closest('.js-explore-collection')) {
        closeDrawer();
        setTimeout(function () { R.navigation.goToPortal(); }, 250);
        return;
      }

      // Buttons inside a cart line: + / - / remove
      const actionButton = event.target.closest('[data-cart-action]');
      if (actionButton && drawer().contains(actionButton)) {
        const key = actionButton.closest('.cart-line').dataset.key;
        const action = actionButton.dataset.cartAction;
        if (action === 'increase') changeQuantity(key, 1);
        if (action === 'decrease') changeQuantity(key, -1);
        if (action === 'remove') remove(key);
      }
    });
  }

  function init() {
    load();
    bindEvents();
    // Whenever the cart changes: refresh the indicators, and the drawer if it is open.
    listeners.push(renderIndicators);
    listeners.push(function () { if (R.isLayerOpen(drawer())) renderDrawer(); });
    renderIndicators();
    // A cart that was restored from storage should not "pop" on page load.
    const floating = R.qs('#floating-cart');
    if (floating) floating.classList.remove('is-pop');
  }

  R.cart = {
    init: init, add: add, remove: remove, changeQuantity: changeQuantity, clear: clear,
    getLines: getLines, getCount: getCount, getSubtotal: getSubtotal,
    getDeliveryCharge: getDeliveryCharge, getTotals: getTotals,
    onChange: function (listener) { listeners.push(listener); },
    open: openDrawer, close: closeDrawer, MAX_QUANTITY: MAX_QUANTITY, STORAGE_KEY: STORAGE_KEY
  };
})(window.Ravaan);
