/* ==========================================================================
   faq.js — the FAQ page: an accessible accordion built from data/faq.json.

   Each question is a real <button> with aria-expanded, so it works with a
   keyboard (Tab, Enter, Space) and screen readers. The answer opens with a
   CSS transition on grid-template-rows (see .faq__panel in style.css).
   ========================================================================== */
(function (R) {
  'use strict';

  function buildFaqPage() {
    const items = R.data.faq.items;
    const listHtml = items.map(function (item) {
      return '' +
        '<div class="faq__item">' +
          '<h2 class="faq__heading">' +
            '<button type="button" class="faq__question" id="' + item.id + '-button" aria-expanded="false" aria-controls="' + item.id + '-panel">' +
              '<span>' + R.escapeHTML(item.question) + '</span>' +
              '<i class="fa-solid fa-plus faq__icon" aria-hidden="true"></i>' +
            '</button>' +
          '</h2>' +
          '<div class="faq__panel" id="' + item.id + '-panel" role="region" aria-labelledby="' + item.id + '-button">' +
            '<div class="faq__panel-inner"><p>' + R.escapeHTML(item.answer) + '</p></div>' +
          '</div>' +
        '</div>';
    }).join('');

    const page = R.createElement(
      '<div class="page page--narrow">' +
        '<header class="page-head"><h1 class="page-head__title">FAQ</h1>' +
        '<p class="page-head__lead">Quick answers about ordering, delivery and sizing. Still stuck? <a href="#/contact">Message us on WhatsApp</a>.</p></header>' +
        '<div class="faq">' + listHtml + '</div>' +
        '<p class="page-note">Delivery, exchange and payment answers describe our proposed launch policies and may change once confirmed.</p>' +
      '</div>'
    );

    const buttons = R.qsa('.faq__question', page);

    page.addEventListener('click', function (event) {
      const button = event.target.closest('.faq__question');
      if (!button) return;
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isOpen));
      button.closest('.faq__item').classList.toggle('is-open', !isOpen);
    });

    // Arrow keys move between questions (nice-to-have keyboard support).
    page.addEventListener('keydown', function (event) {
      const current = buttons.indexOf(document.activeElement);
      if (current === -1) return;
      let next = null;
      if (event.key === 'ArrowDown') next = buttons[(current + 1) % buttons.length];
      if (event.key === 'ArrowUp') next = buttons[(current - 1 + buttons.length) % buttons.length];
      if (event.key === 'Home') next = buttons[0];
      if (event.key === 'End') next = buttons[buttons.length - 1];
      if (next) { event.preventDefault(); next.focus(); }
    });

    return page;
  }

  R.faq = { getPages: function () { return { faq: { title: 'FAQ', build: buildFaqPage } }; } };
})(window.Ravaan);
