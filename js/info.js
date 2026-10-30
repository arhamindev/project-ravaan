/* ==========================================================================
   info.js — the content pages that are mostly text:
   Contact, Blog, Size Guide, Delivery, Exchange, Cancellation, Privacy.

   Their wording lives in data/policies.json, data/sizeguide.json and
   data/business.json, so you can edit the text without touching this file.
   ========================================================================== */
(function (R) {
  'use strict';

  const PROPOSED_POLICIES = ['delivery', 'exchange', 'cancellation'];   // show the "proposed policy" notice on these

  /* ---------- Policy pages (Delivery, Exchange, Cancellation, Privacy) ---------- */
  function buildPolicyPage(key) {
    const policy = R.data.policies[key];
    const sectionsHtml = policy.sections.map(function (section) {
      const paragraphs = (section.text || []).map(function (text) { return '<p>' + R.escapeHTML(text) + '</p>'; }).join('');
      const list = section.list ? '<ul class="prose__list">' + section.list.map(function (item) { return '<li>' + R.escapeHTML(item) + '</li>'; }).join('') + '</ul>' : '';
      const action = section.action === 'exchange'
        ? '<a class="btn" href="' + R.escapeHTML(R.whatsappUrl(R.data.business.messages.exchange)) + '" target="_blank" rel="noopener">REQUEST AN EXCHANGE ON WHATSAPP</a>'
        : '';
      return '<section class="prose__section"><h2>' + R.escapeHTML(section.heading) + '</h2>' + paragraphs + list + action + '</section>';
    }).join('');

    const notice = PROPOSED_POLICIES.indexOf(key) !== -1
      ? '<p class="notice">' + R.escapeHTML(R.data.policies.proposedNotice) + '</p>' : '';

    return R.createElement(
      '<div class="page page--narrow">' +
        '<header class="page-head"><h1 class="page-head__title">' + R.escapeHTML(policy.title) + '</h1></header>' +
        notice + '<div class="prose">' + sectionsHtml + '</div>' +
      '</div>'
    );
  }

  /* ---------- Size guide ---------- */
  function buildSizeGuidePage() {
    const guide = R.data.sizeguide;
    const tablesHtml = guide.tables.map(function (table) {
      const rows = table.rows.map(function (row) {
        return '<tr><th scope="row">' + row[0] + '</th><td>' + row[1] + '</td><td>' + row[2] + '</td></tr>';
      }).join('');
      return '<section class="prose__section"><h2>' + R.escapeHTML(table.title) + '</h2>' +
        '<div class="table-scroll"><table class="size-table size-table--page">' +
        '<thead><tr><th scope="col">Size</th><th scope="col">' + R.escapeHTML(table.measureLabel) + '</th><th scope="col">Length (inches)</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div></section>';
    }).join('');

    return R.createElement(
      '<div class="page page--narrow">' +
        '<header class="page-head"><h1 class="page-head__title">' + R.escapeHTML(guide.title) + '</h1>' +
        '<p class="page-head__lead">' + R.escapeHTML(guide.note) + '</p></header>' +
        '<div class="prose">' + tablesHtml + '</div>' +
        '<p class="notice">' + R.escapeHTML(guide.scope) + '</p>' +
      '</div>'
    );
  }

  /* ---------- Contact ---------- */
  function buildContactPage() {
    const business = R.data.business;
    return R.createElement(
      '<div class="page page--narrow">' +
        '<header class="page-head"><h1 class="page-head__title">Contact</h1>' +
        '<p class="page-head__lead">The quickest way to reach RAVAAN is WhatsApp. Ask about sizing, an order or an exchange.</p></header>' +
        '<div class="contact">' +
          '<a class="btn contact__cta" href="' + R.escapeHTML(R.whatsappUrl(business.messages.enquiry)) + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> CHAT ON WHATSAPP</a>' +
          '<dl class="contact__details">' +
            '<div><dt>WhatsApp</dt><dd><a href="' + R.escapeHTML(R.whatsappUrl(business.messages.enquiry)) + '" target="_blank" rel="noopener">' + R.escapeHTML(business.whatsappLocal) + '</a></dd></div>' +
            '<div><dt>Location</dt><dd>' + R.escapeHTML(business.location) + '</dd></div>' +
            '<div><dt>Support hours</dt><dd>' + R.escapeHTML(business.supportHours) + '</dd></div>' +
            '<div><dt>Expected response</dt><dd>' + R.escapeHTML(business.expectedResponse) + '</dd></div>' +
          '</dl>' +
          // No email address, shop address or social links are shown because none were supplied.
        '</div>' +
      '</div>'
    );
  }

  /* ---------- Blog (placeholder: no articles were supplied) ---------- */
  function buildBlogPage() {
    return R.createElement(
      '<div class="page page--narrow">' +
        '<header class="page-head"><h1 class="page-head__title">Blog</h1>' +
        '<p class="page-head__lead">Nothing has been published here yet. Stories and notes from RAVAAN will appear on this page.</p></header>' +
        '<p><a class="btn" href="#/men">SEE THE COLLECTION</a></p>' +
      '</div>'
    );
  }

  function getPages() {
    return {
      contact: { title: 'Contact', build: buildContactPage },
      blog: { title: 'Blog', build: buildBlogPage },
      'size-guide': { title: 'Size Guide', build: buildSizeGuidePage },
      delivery: { title: 'Delivery', build: function () { return buildPolicyPage('delivery'); } },
      exchange: { title: 'Exchange Policy', build: function () { return buildPolicyPage('exchange'); } },
      cancellation: { title: 'Cancellation', build: function () { return buildPolicyPage('cancellation'); } },
      privacy: { title: 'Privacy Policy', build: function () { return buildPolicyPage('privacy'); } }
    };
  }

  R.info = { getPages: getPages };
})(window.Ravaan);
