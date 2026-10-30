/* ==========================================================================
   navigation.js — moves between the main page and the full-screen pages
   (Men, Women, Winter, Summer, FAQ, Contact, policies...).

   HOW IT WORKS
   - Every internal link looks like  <a href="#/men">.  Clicking it changes the
     URL hash, which fires a "hashchange" event, which calls showRoute().
   - Because the hash is the single source of truth, the browser's Back and
     Forward buttons work, and a page can be linked directly (index.html#/faq).
   - Each page is an "overlay": a full-screen <section> that slides up from
     the bottom (GSAP), covering the main page. Overlays are built the first
     time they are opened and then reused.
   ========================================================================== */
(function (R) {
  'use strict';

  const pages = {};          // route name -> { title, build() }
  const overlays = {};       // route name -> overlay element (created lazily)
  let currentRoute = null;   // the overlay currently open, or null
  let stackingOrder = 300;   // each newly opened overlay goes on top of the previous one

  /* ---------- Building an overlay ---------- */
  function addFooter(container) {
    const template = R.qs('#footer-template');
    container.appendChild(template.content.cloneNode(true));
    // The WhatsApp number comes from data/business.json, not from the HTML.
    R.qsa('.js-whatsapp-link', container).forEach(function (link) {
      link.href = R.whatsappUrl(R.data.business.messages.enquiry);
      link.textContent = R.data.business.whatsappLocal;
    });
  }

  function createOverlay(route) {
    const page = pages[route];
    const overlay = R.createElement(
      '<section class="overlay" id="overlay-' + route + '" role="dialog" aria-modal="true" aria-label="' + R.escapeHTML(page.title) + '" aria-hidden="true" hidden>' +
        '<div class="overlay__scroll">' +
          '<header class="overlay__bar">' +
            '<button type="button" class="overlay__back" data-overlay-close aria-label="Back to RAVAAN">' +
              '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i><span>BACK</span>' +
            '</button>' +
            '<a class="overlay__brand" href="#/home" aria-label="RAVAAN home">RAVAAN</a>' +
            '<button type="button" class="icon-btn js-open-cart" aria-label="Open shopping cart">' +
              '<i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>' +
              '<span class="icon-btn__count js-cart-count" hidden>0</span>' +
            '</button>' +
          '</header>' +
          '<div class="overlay__content"></div>' +
        '</div>' +
      '</section>'
    );
    const content = R.qs('.overlay__content', overlay);
    content.appendChild(page.build());
    addFooter(content);
    R.qs('#overlay-root').appendChild(overlay);
    return overlay;
  }

  /* ---------- Slide animations (bottom -> top) ---------- */
  function slideIn(overlay, done) {
    const scroller = R.qs('.overlay__scroll', overlay);
    scroller.scrollTop = 0;

    if (!window.gsap || R.prefersReducedMotion()) {
      overlay.style.transform = 'none';
      done();
      return;
    }
    // The new background slides up from the bottom of the screen...
    gsap.fromTo(overlay, { yPercent: 100 }, {
      yPercent: 0, duration: 0.95, ease: 'power3.inOut',
      onComplete: function () { gsap.set(overlay, { clearProps: 'transform' }); done(); }
    });
    // ...and once it is mostly covering the page, the page title rises into place.
    const title = R.qs('.page-hero__title, .page-head__title', overlay);
    if (title) {
      gsap.fromTo(title, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.55, ease: 'power3.out', clearProps: 'transform,opacity' });
    }
  }

  function slideOut(overlay, done) {
    // When one overlay replaces another, the old one just disappears behind the new one.
    if (overlay.dataset.instantHide === 'true' || !window.gsap || R.prefersReducedMotion()) {
      overlay.dataset.instantHide = '';
      done();
      return;
    }
    gsap.to(overlay, { yPercent: 100, duration: 0.8, ease: 'power3.inOut', onComplete: done });
  }

  /* ---------- Opening and closing ---------- */
  function showRoute(route) {
    if (!pages[route]) { closeCurrent(); return; }
    if (route === currentRoute) return;

    const previous = currentRoute ? overlays[currentRoute] : null;
    const overlay = overlays[route] || (overlays[route] = createOverlay(route));

    // Put it last in the DOM + give it a higher layer so it appears on top of the previous overlay.
    R.qs('#overlay-root').appendChild(overlay);
    overlay.style.zIndex = ++stackingOrder;

    R.openLayer(overlay, { show: slideIn, hide: slideOut, requestClose: closeToMain, focusSelector: '.overlay__back' });
    currentRoute = route;
    document.title = pages[route].title + ' | RAVAAN';

    if (previous) {
      previous.dataset.instantHide = 'true';
      // Wait for the new page to cover the old one, then quietly remove the old one.
      setTimeout(function () { R.closeLayer(previous, null, true); }, R.prefersReducedMotion() ? 0 : 1000);
    }
  }

  function closeCurrent() {
    if (!currentRoute) return;
    const overlay = overlays[currentRoute];
    currentRoute = null;
    document.title = R.originalTitle;
    R.closeLayer(overlay);
  }

  /* Back button / Escape: return to the main page and clear the hash from the address bar. */
  function closeToMain() {
    if (location.hash) history.pushState(null, '', location.pathname + location.search);
    closeCurrent();
  }

  function getRouteFromHash() {
    const match = location.hash.match(/^#\/([a-z-]+)/);
    return match ? match[1] : null;
  }

  function onRouteChange() {
    const route = getRouteFromHash();
    if (route && route !== 'home') { showRoute(route); } else { closeCurrent(); }
  }

  /* Scroll helpers used by buttons ("EXPLORE COLLECTION" etc.) */
  function scrollToElement(element) {
    element.scrollIntoView({ behavior: R.prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function goToPortal() {
    if (currentRoute) closeToMain();
    scrollToElement(R.qs('#portal-cards'));
  }

  /* ---------- Link handling ---------- */
  function onDocumentClick(event) {
    // 1. Back button inside an overlay
    if (event.target.closest('[data-overlay-close]')) { closeToMain(); return; }

    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');

    // 2. "Home" always means: close any page and go to the very top
    if (href === '#/home') {
      event.preventDefault();
      if (currentRoute) closeToMain();
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    // 3. Page links (#/men ...): the hashchange event does the work. Same-page clicks need a nudge.
    if (href.indexOf('#/') === 0) {
      if (href === location.hash) { event.preventDefault(); onRouteChange(); }
      return;
    }

    // 4. Section links on the main page (#story, #portal-cards)
    const target = href.length > 1 ? R.qs(href) : null;
    if (target) {
      event.preventDefault();
      if (currentRoute) closeToMain();
      scrollToElement(target);
    }
  }

  function init(allPages) {
    Object.assign(pages, allPages);
    R.originalTitle = document.title;
    addFooter(R.qs('#main-footer'));

    document.addEventListener('click', onDocumentClick);
    window.addEventListener('hashchange', onRouteChange);
    window.addEventListener('popstate', onRouteChange);

    // The hero's "Shop this piece" button
    const shopButton = R.qs('#hero-shop-btn');
    if (shopButton) shopButton.addEventListener('click', function () { R.products.openProduct(R.data.business.heroProduct.productId); });

    onRouteChange();   // if the page was opened with a hash (index.html#/faq), open it now
  }

  R.navigation = { init: init, goToPortal: goToPortal, closeToMain: closeToMain, hasPage: function (route) { return Boolean(pages[route]); } };
})(window.Ravaan);
