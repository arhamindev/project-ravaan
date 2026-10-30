/* ==========================================================================
   products.js — everything about products:
     1. an index so any product can be found by its ID
     2. building the Men / Women / Winter / Summer pages (category strip + grid)
     3. the product detail window (size, quantity, ADD TO CART, BUY NOW)

   All product information comes from the JSON files in /data. Nothing about a
   product is written in the HTML or in this file.
   ========================================================================== */
(function (R) {
  'use strict';

  const productsById = new Map();
  let activeProduct = null;      // the product currently open in the detail window
  let selectedSize = '';
  let quantity = 1;

  /* ---------- 1. Index ---------- */
  function indexProducts() {
    ['men', 'women'].forEach(function (gender) {
      R.data[gender].products.forEach(function (product) {
        product.gender = gender;                       // remember which file it came from
        productsById.set(product.id, product);
      });
    });
  }

  function getById(id) { return productsById.get(id); }

  function genderLabel(product) { return product.gender === 'men' ? 'Men' : 'Women'; }

  /* Which products belong on a page? Men/Women: their own file. Winter/Summer: the IDs listed in collections.json. */
  function getProductsFor(pageKey) {
    if (pageKey === 'men' || pageKey === 'women') return R.data[pageKey].products;
    return R.data.collections[pageKey].productIds.map(getById).filter(Boolean);
  }

  function getCategoriesFor(pageKey) {
    if (pageKey === 'men' || pageKey === 'women') return R.data[pageKey].categories;
    const available = getProductsFor(pageKey).map(function (product) { return product.category; });
    return R.data.collections[pageKey].categories.filter(function (category) { return available.indexOf(category) !== -1; });
  }

  /* ---------- 2. Product grid ---------- */
  function renderProductCard(product, showGender) {
    const price = R.formatPrice(product.price);
    const subline = showGender ? '<p class="product-card__sub">' + genderLabel(product) + ', ' + R.escapeHTML(product.category) + '</p>' : '';
    const altText = product.hasRealPhoto ? product.name : product.name + ' (product photo coming soon)';
    return '' +
      '<li class="product-card" data-product-id="' + R.escapeHTML(product.id) + '">' +
        // The whole image is one button. Hover (desktop) or tap (touch) opens the detail window.
        '<button type="button" class="product-card__media' + (product.hasRealPhoto ? ' has-photo' : ' is-placeholder') + '" data-open-product="' + R.escapeHTML(product.id) + '" aria-label="' + R.escapeHTML(product.name) + ', ' + price + '. View details">' +
          '<img src="' + R.escapeHTML(product.image) + '" alt="' + R.escapeHTML(altText) + '" width="600" height="750" loading="lazy" decoding="async">' +
          '<span class="product-card__hover" aria-hidden="true">' +
            '<span class="product-card__hover-name">' + R.escapeHTML(product.name) + '</span>' +
            '<span class="product-card__hover-price">' + price + '</span>' +
            '<span class="product-card__hover-cta">CLICK TO BUY</span>' +
          '</span>' +
        '</button>' +
        // This text is what touch users see below the image. On desktop it is visually hidden (hover shows it instead).
        '<div class="product-card__meta">' +
          '<p class="product-card__name">' + R.escapeHTML(product.name) + '</p>' + subline +
          '<p class="product-card__price">' + price + '</p>' +
        '</div>' +
      '</li>';
  }

  /* Build one full page: heading, category strip, grid. Returns the element. */
  function buildCollectionPage(pageKey) {
    const info = R.data.collections[pageKey];
    const products = getProductsFor(pageKey);
    const categories = getCategoriesFor(pageKey);
    const showGender = pageKey === 'winter' || pageKey === 'summer';
    const hasCampaignImage = Boolean(info.image);
    const isSummer = pageKey === 'summer';

    const campaign = hasCampaignImage
      ? '<figure class="page-hero__image' + (isSummer ? ' page-hero__image--placeholder' : '') + '"><img src="' + R.escapeHTML(info.image) + '" alt="' +
        (isSummer ? 'Placeholder illustration of a t-shirt and trousers on a hanger. Summer campaign photography coming soon.' : 'Off-white zip hoodie from the Winter collection') +
        '" width="577" height="631" decoding="async"></figure>'
      : '';

    const page = R.createElement(
      '<div class="page page--collection">' +
        '<section class="page-hero' + (hasCampaignImage ? ' page-hero--with-image' : '') + '">' +
          '<div class="page-hero__text">' +
            '<h1 class="page-hero__title"><span class="page-hero__name">' + R.escapeHTML(info.title) + '</span> <span class="page-hero__headline">' + R.escapeHTML(info.headline) + '</span></h1>' +
            '<p class="page-hero__description">' + R.escapeHTML(info.description) + '</p>' +
          '</div>' + campaign +
        '</section>' +
        '<div class="category-bar">' +
          '<nav class="category-nav" aria-label="' + R.escapeHTML(info.title) + ' categories"></nav>' +
          '<p class="category-count" aria-live="polite"></p>' +
        '</div>' +
        '<ul class="product-grid"></ul>' +
        '<div class="empty-state" hidden>' +
          '<p class="empty-state__text">No pieces found in this category.</p>' +
          '<button type="button" class="btn js-view-all">VIEW ALL PRODUCTS</button>' +
        '</div>' +
      '</div>'
    );

    const nav = R.qs('.category-nav', page);
    const grid = R.qs('.product-grid', page);
    const countText = R.qs('.category-count', page);
    const emptyState = R.qs('.empty-state', page);

    // "All" button + one button per category
    const labels = ['All'].concat(categories);
    nav.innerHTML = labels.map(function (label, index) {
      return '<button type="button" class="category-nav__btn' + (index === 0 ? ' is-active' : '') + '" data-category="' + R.escapeHTML(label) + '" aria-pressed="' + (index === 0) + '">' + R.escapeHTML(label) + '</button>';
    }).join('');

    /* Filtering never reloads the page: we just rebuild the grid with the matching products. */
    function applyFilter(category) {
      const visible = category === 'All' ? products : products.filter(function (product) { return product.category === category; });

      R.qsa('.category-nav__btn', nav).forEach(function (button) {
        const isActive = button.dataset.category === category;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });

      grid.innerHTML = visible.map(function (product) { return renderProductCard(product, showGender); }).join('');
      emptyState.hidden = visible.length > 0;
      grid.hidden = visible.length === 0;
      countText.textContent = visible.length + (visible.length === 1 ? ' piece' : ' pieces');

      // Small fade-in so the person can see what changed (skipped for reduced motion).
      if (window.gsap && !R.prefersReducedMotion()) {
        gsap.fromTo(R.qsa('.product-card', grid), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.025, ease: 'power2.out', clearProps: 'opacity,transform' });
      }
    }

    nav.addEventListener('click', function (event) {
      const button = event.target.closest('.category-nav__btn');
      if (button) applyFilter(button.dataset.category);
    });
    R.qs('.js-view-all', page).addEventListener('click', function () { applyFilter('All'); });

    applyFilter('All');
    return page;
  }

  /* ---------- 3. Product detail window ---------- */
  function sizeGuideTableFor(product) {
    const tables = R.data.sizeguide.tables;
    const table = product.gender === 'men' ? tables[0] : tables[1];
    const rows = table.rows.map(function (row) {
      return '<tr><th scope="row">' + row[0] + '</th><td>' + row[1] + '</td><td>' + row[2] + '</td></tr>';
    }).join('');
    return '<details class="size-inline"><summary>Size guide</summary>' +
      '<table class="size-table"><caption class="sr-only">' + R.escapeHTML(table.title) + '</caption>' +
      '<thead><tr><th scope="col">Size</th><th scope="col">' + R.escapeHTML(table.measureLabel) + '</th><th scope="col">Length (inches)</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="size-inline__note">' + R.escapeHTML(R.data.sizeguide.note) + '</p></details>';
  }

  function renderProductDetail(product) {
    const hasSizes = product.sizes && product.sizes.length > 0;
    const hasColours = product.colours && product.colours.length > 0;

    const sizeBlock = hasSizes
      ? '<fieldset class="option-group"><legend class="option-group__legend">Size</legend><div class="size-options">' +
          product.sizes.map(function (size) {
            return '<label class="size-option"><input type="radio" name="product-size" value="' + R.escapeHTML(size) + '"><span>' + R.escapeHTML(size) + '</span></label>';
          }).join('') +
        '</div></fieldset>' + sizeGuideTableFor(product)
      : '<p class="product-detail__sizenote">Sizing for this item has not been listed yet. Message us on WhatsApp for help choosing before we confirm your order.</p>';

    const colourBlock = hasColours
      ? '<fieldset class="option-group"><legend class="option-group__legend">Colour</legend><div class="size-options">' +
          product.colours.map(function (colour, index) {
            return '<label class="size-option"><input type="radio" name="product-colour" value="' + R.escapeHTML(colour) + '"' + (index === 0 ? ' checked' : '') + '><span>' + R.escapeHTML(colour) + '</span></label>';
          }).join('') + '</div></fieldset>'
      : '';

    return '' +
      '<div class="product-detail__media' + (product.hasRealPhoto ? '' : ' is-placeholder') + '">' +
        '<img src="' + R.escapeHTML(product.gallery[0] || product.image) + '" alt="' + R.escapeHTML(product.hasRealPhoto ? product.name : product.name + ' (product photo coming soon)') + '" width="600" height="750">' +
      '</div>' +
      '<div class="product-detail__info">' +
        '<p class="product-detail__category">' + genderLabel(product) + ', ' + R.escapeHTML(product.category) + '</p>' +
        '<h2 class="product-detail__name" id="product-modal-name">' + R.escapeHTML(product.name) + '</h2>' +
        '<p class="product-detail__price">' + R.formatPrice(product.price) + '</p>' +
        '<p class="product-detail__desc">' + R.escapeHTML(product.description) + '</p>' +
        colourBlock + sizeBlock +
        '<div class="option-group"><span class="option-group__legend" id="qty-label">Quantity</span>' +
          '<div class="stepper" role="group" aria-labelledby="qty-label">' +
            '<button type="button" class="stepper__btn" data-detail-action="decrease" aria-label="Decrease quantity"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>' +
            '<span class="stepper__value" id="detail-qty" aria-live="polite">1</span>' +
            '<button type="button" class="stepper__btn" data-detail-action="increase" aria-label="Increase quantity"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>' +
          '</div></div>' +
        '<p class="form-error" id="detail-error" role="alert"></p>' +
        '<div class="product-detail__actions">' +
          '<button type="button" class="btn btn--block" data-detail-action="add">ADD TO CART</button>' +
          '<button type="button" class="btn btn--outline btn--block" data-detail-action="buy">BUY NOW</button>' +
          '<button type="button" class="link-btn" data-detail-action="continue">CONTINUE SHOPPING</button>' +
        '</div>' +
      '</div>';
  }

  function openProduct(productId) {
    const product = getById(productId);
    if (!product) return;
    activeProduct = product;
    selectedSize = '';
    quantity = 1;

    R.qs('#product-detail').innerHTML = renderProductDetail(product);
    R.openLayer(R.qs('#product-modal'), { focusSelector: '.modal__close', requestClose: closeProduct });
  }

  function closeProduct(callback) {
    R.closeLayer(R.qs('#product-modal'), typeof callback === 'function' ? callback : undefined);
  }

  /* Returns true when the item was added. */
  function addActiveProductToCart() {
    const errorBox = R.qs('#detail-error');
    errorBox.textContent = '';
    if (activeProduct.sizes.length && !selectedSize) {
      errorBox.textContent = 'Please choose a size.';
      const firstSize = R.qs('input[name="product-size"]', R.qs('#product-detail'));
      if (firstSize) firstSize.focus();
      return false;
    }
    R.cart.add(activeProduct.id, selectedSize, quantity);
    R.toast('Added to your bag.');
    return true;
  }

  function bindDetailEvents() {
    const detail = R.qs('#product-detail');

    detail.addEventListener('change', function (event) {
      if (event.target.name === 'product-size') {
        selectedSize = event.target.value;
        R.qs('#detail-error').textContent = '';
      }
    });

    detail.addEventListener('click', function (event) {
      const button = event.target.closest('[data-detail-action]');
      if (!button) return;
      const action = button.dataset.detailAction;

      if (action === 'increase' || action === 'decrease') {
        quantity = Math.max(1, Math.min(R.cart.MAX_QUANTITY, quantity + (action === 'increase' ? 1 : -1)));
        R.qs('#detail-qty').textContent = quantity;
      }
      if (action === 'add' && addActiveProductToCart()) {
        const original = button.textContent;
        button.textContent = 'ADDED';
        setTimeout(function () { button.textContent = original; }, 1400);
      }
      if (action === 'buy' && addActiveProductToCart()) {
        closeProduct(function () { R.checkout.open(); });
      }
      if (action === 'continue') closeProduct();
    });

    R.qsa('.js-close-product').forEach(function (element) {
      element.addEventListener('click', function () { closeProduct(); });
    });

    // Anywhere on the site, an element with data-open-product="ID" opens that product.
    document.addEventListener('click', function (event) {
      const trigger = event.target.closest('[data-open-product]');
      if (trigger) openProduct(trigger.dataset.openProduct);
    });
  }

  function init() {
    indexProducts();
    bindDetailEvents();
  }

  /* The pages this file provides. navigation.js turns each one into a full-screen overlay. */
  function getPages() {
    const pages = {};
    ['men', 'women', 'winter', 'summer'].forEach(function (key) {
      pages[key] = { title: R.data.collections[key].title, build: function () { return buildCollectionPage(key); } };
    });
    return pages;
  }

  R.products = { init: init, getById: getById, openProduct: openProduct, closeProduct: closeProduct, getPages: getPages };
})(window.Ravaan);
