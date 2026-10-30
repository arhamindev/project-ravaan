/* ==========================================================================
   main.js — the starting point. Loads the JSON data, then starts every part
   of the website in the right order.
   ========================================================================== */
(function (R) {
  'use strict';

  R.data = {};

  function loadJson(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) throw new Error('Could not load ' + path + ' (' + response.status + ')');
      return response.json();
    });
  }

  function loadAllData() {
    const files = ['men', 'women', 'collections', 'faq', 'business', 'policies', 'sizeguide'];
    return Promise.all(files.map(function (name) { return loadJson('data/' + name + '.json'); })).then(function (results) {
      files.forEach(function (name, index) { R.data[name] = results[index]; });
    });
  }

  function showLoadError(error) {
    const loader = R.qs('#loader');
    const isFileProtocol = location.protocol === 'file:';
    loader.classList.add('has-error');
    loader.innerHTML = '<div class="loader__error">' +
      '<p class="loader__title">RAVAAN could not load its product data.</p>' +
      (isFileProtocol
        ? '<p>Browsers block JSON files when a page is opened by double-clicking it. Run the site through a local server instead: in VS Code, right-click <strong>index.html</strong> and choose <strong>Open with Live Server</strong>, or run <code>python -m http.server</code> in this folder and open <code>http://localhost:8000</code>.</p>'
        : '<p>Please check your connection and refresh the page. If you are the developer, make sure the <code>data</code> folder was uploaded.</p>') +
      '</div>';
    console.error(error);
  }

  function hideLoader() {
    const loader = R.qs('#loader');
    loader.classList.add('is-hidden');
    setTimeout(function () { loader.remove(); }, 700);
  }

  function start() {
    if (R.prefersReducedMotion()) document.documentElement.classList.add('reduced-motion');

    // Order matters: products must exist before the cart reads them.
    R.products.init();
    R.cart.init();
    R.checkout.init();

    R.navigation.init(Object.assign({}, R.products.getPages(), R.faq.getPages(), R.info.getPages()));

    R.hero.init();
    R.story.init();
    R.portal.init();

    hideLoader();
    R.hero.playIntro();

    // Pinned sections measure the page, so re-measure once fonts and images have arrived.
    if (window.ScrollTrigger) {
      const refresh = function () { ScrollTrigger.refresh(); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
      window.addEventListener('load', refresh);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadAllData().then(start).catch(showLoadError);
  });
})(window.Ravaan);
