/* ==========================================================================
   utils.js — small helpers shared by every other file.

   All of our code lives on one object called `Ravaan` (window.Ravaan).
   Each file adds its own piece to it, e.g. Ravaan.cart, Ravaan.products.
   This keeps things simple: no build tools, no modules, just plain scripts.
   ========================================================================== */
window.Ravaan = window.Ravaan || {};

(function (R) {
  'use strict';

  /* ---------- Tiny DOM shortcuts ---------- */
  R.qs = function (selector, scope) { return (scope || document).querySelector(selector); };
  R.qsa = function (selector, scope) { return Array.from((scope || document).querySelectorAll(selector)); };

  /* Turn an HTML string into a real element. */
  R.createElement = function (html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  };

  /* Escape text before putting it inside an HTML string (prevents broken markup / injection). */
  R.escapeHTML = function (value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  };

  /* 1490 -> "PKR 1,490" */
  R.formatPrice = function (amount) {
    return 'PKR ' + Number(amount).toLocaleString('en-US');
  };

  /* True when the visitor asked their device for less motion. */
  R.prefersReducedMotion = function () {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  /* True on phones/tablets where the main input is a finger, not a mouse. */
  R.isTouchDevice = function () {
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
  };

  /* Build a wa.me link with a prefilled message. */
  R.whatsappUrl = function (message) {
    const number = (R.data && R.data.business && R.data.business.whatsappInternational) || '923152136621';
    return 'https://wa.me/' + number + '?text=' + encodeURIComponent(message);
  };

  /* ---------- Toast ("Added to your bag.") ---------- */
  let toastTimer = null;
  R.toast = function (message) {
    const toast = R.qs('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2200);
  };

  /* ==========================================================================
     LAYERS — one system for everything that opens on top of the page:
     the cart drawer, product modal, checkout modal and the full-screen pages.

     It takes care of:
       - remembering which element had focus, and giving it back on close
       - trapping the Tab key inside the open layer (keyboard accessibility)
       - closing the top layer with the Escape key
       - locking the page scroll behind the layer
       - making the page behind "inert" so screen readers ignore it
     ========================================================================== */
  const layerStack = [];
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

  function updatePageLock() {
    const isOpen = layerStack.length > 0;
    document.documentElement.classList.toggle('is-locked', isOpen);
    ['#main', '#site-nav', '#main-footer'].forEach(function (selector) {
      const element = R.qs(selector);
      if (!element) return;
      if (isOpen) { element.setAttribute('inert', ''); } else { element.removeAttribute('inert'); }
    });
  }

  function focusableInside(element) {
    return R.qsa(FOCUSABLE, element).filter(function (item) { return item.offsetParent !== null || item === document.activeElement; });
  }

  /*
    options:
      show(element, done)   custom opening animation (optional)
      hide(element, done)   custom closing animation (optional)
      onClose()             called after the layer is fully closed (optional)
      requestClose()        what Escape should do (defaults to closing this layer)
      focusSelector         what to focus first (defaults to first focusable element)
  */
  R.openLayer = function (element, options) {
    options = options || {};
    if (layerStack.some(function (layer) { return layer.element === element; })) return;

    const layer = { element: element, options: options, returnFocus: document.activeElement };
    layerStack.push(layer);
    updatePageLock();

    element.hidden = false;
    element.setAttribute('aria-hidden', 'false');

    function afterShow() {
      const target = (options.focusSelector && R.qs(options.focusSelector, element)) || focusableInside(element)[0] || element;
      if (target) { target.focus({ preventScroll: true }); }
    }

    if (options.show) {
      options.show(element, afterShow);
    } else {
      // Default: add a CSS class on the next frame so the CSS transition runs.
      requestAnimationFrame(function () { element.classList.add('is-open'); });
      setTimeout(afterShow, 30);
    }
  };

  R.closeLayer = function (element, callback, silent) {
    const index = layerStack.findIndex(function (layer) { return layer.element === element; });
    if (index === -1) { if (callback) callback(); return; }
    const layer = layerStack[index];
    layerStack.splice(index, 1);
    updatePageLock();

    function finish() {
      element.hidden = true;
      element.setAttribute('aria-hidden', 'true');
      element.classList.remove('is-open');
      if (!silent && layer.returnFocus && document.contains(layer.returnFocus) && layer.returnFocus.focus) {
        layer.returnFocus.focus({ preventScroll: true });
      }
      if (layer.options.onClose) layer.options.onClose();
      if (callback) callback();
    }

    if (layer.options.hide) {
      layer.options.hide(element, finish);
    } else {
      element.classList.remove('is-open');
      setTimeout(finish, R.prefersReducedMotion() ? 0 : 320);
    }
  };

  R.isLayerOpen = function (element) {
    return layerStack.some(function (layer) { return layer.element === element; });
  };

  document.addEventListener('keydown', function (event) {
    if (!layerStack.length) return;
    const top = layerStack[layerStack.length - 1];

    if (event.key === 'Escape') {
      event.preventDefault();
      if (top.options.requestClose) { top.options.requestClose(); } else { R.closeLayer(top.element); }
      return;
    }

    if (event.key === 'Tab') {
      const items = focusableInside(top.element);
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !top.element.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !top.element.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
  });
})(window.Ravaan);
