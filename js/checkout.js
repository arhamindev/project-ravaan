/* ==========================================================================
   checkout.js — collects the customer's details, validates them, and builds
   the WhatsApp message.

   IMPORTANT: this only PREPARES a WhatsApp message. It does not place,
   confirm or take payment for an order. RAVAAN confirms the order manually
   on WhatsApp, and payment is Cash on Delivery.
   ========================================================================== */
(function (R) {
  'use strict';

  let deliveryArea = 'karachi';   // "karachi" or "other"

  /* ---------- Pure helper: builds the message text (easy to test and edit) ---------- */
  function buildMessage(customer, lines, totals, areaLabel) {
    const messageSettings = R.data.business.orderMessage;
    const orderLines = lines.map(function (line, index) {
      const genderText = line.product.gender === 'men' ? 'Men' : 'Women';
      return (index + 1) + '. ' + line.product.name + ' (' + genderText + ')\n' +
        '   Quantity: ' + line.quantity + '\n' +
        '   Size: ' + (line.size || 'To be confirmed') + '\n' +
        '   Unit Price: ' + R.formatPrice(line.product.price) + '\n' +
        '   Subtotal: ' + R.formatPrice(line.lineTotal);
    }).join('\n\n');

    const deliveryText = totals.delivery === 0 ? 'PKR 0 (free delivery)' : R.formatPrice(totals.delivery);
    const discountLine = totals.discount > 0 ? 'Discount: -' + R.formatPrice(totals.discount) + '\n' : '';

    return messageSettings.intro + '\n\n' +
      'CUSTOMER DETAILS\n' +
      'Name: ' + customer.name + '\n' +
      'Phone: ' + customer.phone + '\n' +
      'Address: ' + customer.address + '\n' +
      'Delivery area: ' + areaLabel + '\n\n' +
      'ORDER DETAILS\n' + orderLines + '\n\n' +
      'Items subtotal: ' + R.formatPrice(totals.subtotal) + '\n' +
      'Delivery: ' + deliveryText + '\n' + discountLine +
      'Total: ' + R.formatPrice(totals.total) + '\n' +
      'Payment: ' + R.data.business.paymentMethod + '\n\n' +
      messageSettings.outro;
  }

  /* ---------- Validation ---------- */
  function validateName(value) { return value.trim().length >= 2 ? '' : 'Please enter your full name.'; }

  function validatePhone(value) {
    const cleaned = value.replace(/[\s\-()]/g, '');
    return /^\+?\d{10,13}$/.test(cleaned) ? '' : 'Please enter a valid phone number, for example 03XX XXXXXXX.';
  }

  function validateAddress(value) { return value.trim().length >= 10 ? '' : 'Please enter your full delivery address, including area and city.'; }

  function setFieldError(input, message) {
    const errorBox = R.qs('#' + input.id + '-error');
    errorBox.textContent = message;
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', errorBox.id);
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
    return !message;
  }

  /* Validate all fields, show messages, and focus the first problem. */
  function validateForm(form) {
    const fields = [
      { input: form.elements.name, check: validateName },
      { input: form.elements.phone, check: validatePhone },
      { input: form.elements.address, check: validateAddress }
    ];
    let firstInvalid = null;
    fields.forEach(function (field) {
      const isValid = setFieldError(field.input, field.check(field.input.value));
      if (!isValid && !firstInvalid) firstInvalid = field.input;
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  /* ---------- Rendering ---------- */
  function renderSummary() {
    const lines = R.cart.getLines();
    const totals = R.cart.getTotals(deliveryArea);
    const rules = R.data.business.delivery;

    const itemsHtml = lines.map(function (line) {
      const genderText = line.product.gender === 'men' ? 'Men' : 'Women';
      return '<li class="summary-line"><span class="summary-line__name">' + R.escapeHTML(line.product.name) +
        '<small>' + genderText + (line.size ? ' · Size ' + R.escapeHTML(line.size) : '') + ' · Qty ' + line.quantity + '</small></span>' +
        '<span>' + R.formatPrice(line.lineTotal) + '</span></li>';
    }).join('');

    const remaining = rules.freeDeliveryAbove - totals.subtotal;
    const freeHint = totals.subtotal <= rules.freeDeliveryAbove
      ? '<p class="summary-hint">Add ' + R.formatPrice(remaining + 1) + ' more for free delivery.</p>'
      : '<p class="summary-hint">Your order qualifies for free delivery.</p>';

    return '' +
      '<h3 class="summary__title">YOUR BAG</h3>' +
      '<ul class="summary-lines">' + itemsHtml + '</ul>' +
      '<dl class="summary-totals">' +
        '<div><dt>Product subtotal</dt><dd>' + R.formatPrice(totals.subtotal) + '</dd></div>' +
        '<div><dt>Delivery charges</dt><dd>' + (totals.delivery === 0 ? 'Free' : R.formatPrice(totals.delivery)) + '</dd></div>' +
        (totals.discount > 0 ? '<div><dt>Discount</dt><dd>-' + R.formatPrice(totals.discount) + '</dd></div>' : '') +
        '<div class="summary-totals__final"><dt>Final payable total</dt><dd>' + R.formatPrice(totals.total) + '</dd></div>' +
      '</dl>' + freeHint;
  }

  function renderCheckout() {
    const content = R.qs('#checkout-content');
    const rules = R.data.business.delivery;
    content.innerHTML = '' +
      '<div class="checkout">' +
        '<section class="checkout__form-col" id="checkout-form-col">' +
          '<h2 class="checkout__title" id="checkout-title">YOUR DETAILS</h2>' +
          '<p class="checkout__desc">Enter your information so we can prepare your order.</p>' +
          '<form id="checkout-form" novalidate>' +
            '<div class="field"><label for="co-name">Full name</label>' +
              '<input id="co-name" name="name" type="text" autocomplete="name" required>' +
              '<p class="field__error" id="co-name-error" role="alert"></p></div>' +
            '<div class="field"><label for="co-phone">Phone number</label>' +
              '<input id="co-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="03XX XXXXXXX" required>' +
              '<p class="field__error" id="co-phone-error" role="alert"></p></div>' +
            '<fieldset class="field field--radios"><legend>Delivery area</legend>' +
              '<label class="radio-pill"><input type="radio" name="area" value="karachi" checked><span>Karachi (PKR ' + rules.karachiCharge + ')</span></label>' +
              '<label class="radio-pill"><input type="radio" name="area" value="other"><span>Other city (PKR ' + rules.otherCitiesCharge + ')</span></label>' +
            '</fieldset>' +
            '<div class="field"><label for="co-address">Full delivery address</label>' +
              '<textarea id="co-address" name="address" rows="3" autocomplete="street-address" required></textarea>' +
              '<p class="field__error" id="co-address-error" role="alert"></p></div>' +
            '<p class="checkout__payment"><strong>Payment:</strong> ' + R.escapeHTML(R.data.business.paymentMethod) + '. You pay the courier when your order arrives.</p>' +
            '<button type="submit" class="btn btn--block">CONTINUE TO WHATSAPP</button>' +
            '<p class="checkout__fineprint">This opens WhatsApp with your order summary. It does not place, confirm or pay for an order. Your order is only confirmed once RAVAAN replies to you.</p>' +
          '</form>' +
        '</section>' +
        '<aside class="checkout__summary" id="checkout-summary" aria-label="Order summary">' + renderSummary() + '</aside>' +
      '</div>';

    const form = R.qs('#checkout-form');
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('change', function (event) {
      if (event.target.name === 'area') {
        deliveryArea = event.target.value;
        R.qs('#checkout-summary').innerHTML = renderSummary();
      }
    });
    // Clear a field's error as soon as the person starts correcting it.
    form.addEventListener('input', function (event) {
      if (event.target.getAttribute('aria-invalid')) {
        const checks = { name: validateName, phone: validatePhone, address: validateAddress };
        const check = checks[event.target.name];
        if (check && !check(event.target.value)) setFieldError(event.target, '');
      }
    });
  }

  function showConfirmation(whatsappUrl) {
    R.qs('#checkout-form-col').innerHTML = '' +
      '<h2 class="checkout__title" id="checkout-title">ALMOST THERE</h2>' +
      '<p class="checkout__desc">WhatsApp should now be open with your order summary. Please press send in WhatsApp to share your order with us.</p>' +
      '<p class="checkout__fineprint">Nothing is confirmed or paid yet. RAVAAN will reply on WhatsApp to confirm your order, and you pay by Cash on Delivery when it arrives.</p>' +
      '<p class="checkout__fineprint">WhatsApp did not open? <a href="' + R.escapeHTML(whatsappUrl) + '" target="_blank" rel="noopener">Open it here</a>.</p>' +
      '<div class="checkout__after">' +
        '<button type="button" class="btn js-checkout-done">BACK TO SHOP</button>' +
        '<button type="button" class="btn btn--outline js-checkout-clear">CLEAR MY BAG</button>' +
      '</div>';
    const done = R.qs('.js-checkout-done');
    if (done) done.focus();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateForm(form)) return;

    const customer = {
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      address: form.elements.address.value.trim().replace(/\s*\n\s*/g, ', ')
    };
    const lines = R.cart.getLines();
    const totals = R.cart.getTotals(deliveryArea);
    const areaLabel = deliveryArea === 'karachi' ? 'Karachi' : 'Other city';
    const url = R.whatsappUrl(buildMessage(customer, lines, totals, areaLabel));

    window.open(url, '_blank', 'noopener');
    showConfirmation(url);
  }

  /* ---------- Open / close ---------- */
  function open() {
    if (!R.cart.getCount()) { R.cart.open(); return; }
    deliveryArea = 'karachi';
    renderCheckout();
    R.openLayer(R.qs('#checkout-modal'), { focusSelector: '#co-name', requestClose: close });
  }

  function close() { R.closeLayer(R.qs('#checkout-modal')); }

  function init() {
    R.qsa('.js-close-checkout').forEach(function (element) { element.addEventListener('click', close); });
    document.addEventListener('click', function (event) {
      if (event.target.closest('.js-checkout-done')) close();
      if (event.target.closest('.js-checkout-clear')) { R.cart.clear(); close(); }
    });
  }

  R.checkout = { init: init, open: open, close: close, buildMessage: buildMessage, validatePhone: validatePhone };
})(window.Ravaan);
