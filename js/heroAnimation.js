/* ==========================================================================
   heroAnimation.js — the pinned, scroll-controlled hero.

   THE IDEA
   Three image frames sit on a diagonal "escalator":
        slot A (upper-left, small)
        slot B (centre, large)
        slot C (lower-right, small)

   While the visitor scrolls, the hero stays pinned to the screen and the
   scroll position drives a GSAP timeline ("scrub"). One STEP of the timeline:
        the frame in B  moves into A
        the frame in C  moves into B
        the frame in A  keeps travelling up-left, leaves the screen, then
                        comes back in from beyond the lower-right edge and
                        settles in C
   So nothing ever teleports across the screen: the frame that leaves at the
   top-left re-enters from the opposite corner while it is out of sight, like
   a conveyor belt. Scrolling up plays the same timeline backwards.

   We play two steps, so every frame gets a turn in the centre.
   The "Look 01/02/03" buttons simply scroll to the matching point of the timeline.
   ========================================================================== */
(function (R) {
  'use strict';

  const STEPS = 2;                 // how many escalator steps the scroll plays
  const SCROLL_PER_STEP = 0.9;     // scroll distance per step, as a multiple of the screen height

  // Which "look" does each frame show when it is in the centre? (frame letter -> look number)
  const LOOK_OF_FRAME = { b: 0, c: 1, a: 2 };
  const LOOK_NAMES = ['Full view', 'Front detail', 'Sleeve detail'];

  /*
    Slot positions are fractions of the hero stage: cx = centre x, cy = centre y.
    `scale` is the size relative to the centre frame.
    The desktop and mobile layouts are different compositions, not just a smaller copy.
  */
  const LAYOUTS = {
    desktop: {
      slots: [{ cx: 0.18, cy: 0.47, scale: 0.62 }, { cx: 0.5, cy: 0.57, scale: 1 }, { cx: 0.82, cy: 0.77, scale: 0.62 }],
      exit: { cx: -0.2, cy: 0.2, scale: 0.62 },     // beyond the upper-left edge
      enter: { cx: 1.2, cy: 1.15, scale: 0.62 }     // beyond the lower-right edge
    },
    mobile: {
      slots: [{ cx: 0.27, cy: 0.4, scale: 0.6 }, { cx: 0.52, cy: 0.58, scale: 1 }, { cx: 0.76, cy: 0.77, scale: 0.6 }],
      exit: { cx: -0.3, cy: 0.3, scale: 0.6 },
      enter: { cx: 1.3, cy: 1.1, scale: 0.6 }
    }
  };

  let stage, frames, scrollTrigger = null, currentLook = -1;

  /* ---------- Product info + look controls ---------- */
  function fillProductInfo() {
    const product = R.products.getById(R.data.business.heroProduct.productId);
    if (!product) return;
    R.qs('#hero-product-name').textContent = product.name;
    R.qs('#hero-product-price').textContent = R.formatPrice(product.price);
  }

  function setLook(lookIndex) {
    if (lookIndex === currentLook) return;
    currentLook = lookIndex;
    const nameElement = R.qs('#hero-look-name');
    const indexElement = R.qs('#hero-look-index');
    nameElement.textContent = LOOK_NAMES[lookIndex];
    indexElement.textContent = '0' + (lookIndex + 1) + ' / 03';
    R.qsa('.hero__look').forEach(function (button) {
      const isActive = Number(button.dataset.look) === lookIndex;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function bindLookButtons() {
    R.qsa('.hero__look').forEach(function (button) {
      button.addEventListener('click', function () {
        const lookIndex = Number(button.dataset.look);
        if (scrollTrigger) {
          // Scroll to the point of the timeline where this look is in the centre.
          const progress = lookIndex / STEPS;
          const target = scrollTrigger.start + (scrollTrigger.end - scrollTrigger.start) * progress;
          window.scrollTo({ top: target, behavior: R.prefersReducedMotion() ? 'auto' : 'smooth' });
        } else {
          setLook(lookIndex);
        }
      });
    });
  }

  /* ---------- Geometry ---------- */

  /* Converts a slot (fractions of the stage) into the x / y / scale GSAP should animate to. */
  function positionFor(frame, slot) {
    return {
      x: slot.cx * stage.clientWidth - frame.offsetWidth / 2,
      y: slot.cy * stage.clientHeight - frame.offsetHeight / 2,
      scale: slot.scale
    };
  }

  /* Function-based values are re-calculated whenever ScrollTrigger refreshes (e.g. on resize). */
  function liveTarget(frame, slot, extra) {
    return Object.assign({
      x: function () { return positionFor(frame, slot).x; },
      y: function () { return positionFor(frame, slot).y; },
      scale: slot.scale
    }, extra || {});
  }

  function placeFramesStatically(layout) {
    const order = [frames.a, frames.b, frames.c];
    order.forEach(function (frame, index) { gsap.set(frame, positionFor(frame, layout.slots[index])); });
  }

  /* ---------- The timeline ---------- */
  function buildTimeline(layout) {
    const timeline = gsap.timeline({
      defaults: { ease: 'power1.inOut', duration: 1 },   // each plain move lasts one unit = one step
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '+=' + Math.round(STEPS * SCROLL_PER_STEP * 100) + '%',
        pin: true,                    // keep the hero on screen while the timeline plays
        scrub: 0.8,                   // the animation "catches up" smoothly with the scrollbar
        anticipatePin: 1,
        invalidateOnRefresh: true,    // recalculate pixel positions after a resize
        onUpdate: function (self) { setLook(Math.round(self.progress * STEPS)); }
      },
      onUpdate: updateStacking
    });

    // `inSlots` always lists which frame currently sits in slot A, B and C.
    let inSlots = [frames.a, frames.b, frames.c];

    for (let step = 0; step < STEPS; step++) {
      const start = step;               // each step occupies one unit of timeline time
      const inA = inSlots[0], inB = inSlots[1], inC = inSlots[2];

      // 1. B -> A  and  C -> B  (simple moves along the diagonal)
      timeline.to(inB, liveTarget(inB, layout.slots[0]), start);
      timeline.to(inC, liveTarget(inC, layout.slots[1]), start);

      // 2. The frame in A continues up-left and leaves through the corner (first 45% of the step)...
      timeline.to(inA, liveTarget(inA, layout.exit, { ease: 'power1.in', duration: 0.45 }), start);

      // 3. ...then re-enters from beyond the lower-right edge and settles in C (remaining 55%).
      //    fromTo() states the start position explicitly, so the frame is already waiting
      //    outside the screen when it starts to move. It is never visible while jumping.
      timeline.fromTo(inA,
        liveTarget(inA, layout.enter),
        liveTarget(inA, layout.slots[2], { ease: 'power2.out', duration: 0.55, immediateRender: false }),
        start + 0.45
      );

      // New arrangement for the next step: B moved to A, C moved to B, A moved to C.
      inSlots = [inB, inC, inA];
    }

    // Make sure the timeline is exactly STEPS long (so progress 1 = final arrangement).
    timeline.set({}, {}, STEPS);
    return timeline;
  }

  /* The biggest frame (the one in the centre) is drawn on top of the others. */
  function updateStacking() {
    ['a', 'b', 'c'].forEach(function (letter) {
      const frame = frames[letter];
      frame.style.zIndex = Math.round(Number(gsap.getProperty(frame, 'scale')) * 10);
    });
  }

  /* ---------- One orchestrated moment on page load ---------- */
  function playIntro() {
    if (!window.gsap || R.prefersReducedMotion()) return;
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    timeline
      .from('.hero__title-line > span', { yPercent: 110, duration: 1, stagger: 0.12 }, 0)
      .from('.hero-frame', { opacity: 0, duration: 0.9, stagger: 0.12 }, 0.25)
      .from('.hero__label, .hero__side, .hero__info', { opacity: 0, duration: 0.8, stagger: 0.08 }, 0.6);
  }

  /* ---------- Setup ---------- */
  function init() {
    stage = R.qs('#hero-stage');
    frames = { a: R.qs('[data-frame="a"]'), b: R.qs('[data-frame="b"]'), c: R.qs('[data-frame="c"]') };

    fillProductInfo();
    setLook(0);
    bindLookButtons();

    if (!window.gsap) return;

    // Reduced motion (or no ScrollTrigger): show the first arrangement and do not animate.
    if (R.prefersReducedMotion() || !window.ScrollTrigger) {
      const layoutFor = function () { return window.matchMedia('(max-width: 860px)').matches ? LAYOUTS.mobile : LAYOUTS.desktop; };
      placeFramesStatically(layoutFor());
      window.addEventListener('resize', function () { placeFramesStatically(layoutFor()); });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });   // stops the layout jumping when the mobile address bar hides

    // matchMedia builds a different animation for desktop and mobile, and cleans up when the screen size class changes.
    const mm = gsap.matchMedia();
    mm.add({ desktop: '(min-width: 861px)', mobile: '(max-width: 860px)' }, function (context) {
      const layout = context.conditions.desktop ? LAYOUTS.desktop : LAYOUTS.mobile;
      placeFramesStatically(layout);
      const timeline = buildTimeline(layout);
      scrollTrigger = timeline.scrollTrigger;
      updateStacking();
      return function () { scrollTrigger = null; };   // cleanup when the media query stops matching
    });
  }

  R.hero = { init: init, playIntro: playIntro };
})(window.Ravaan);
