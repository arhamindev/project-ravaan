/* ==========================================================================
   storyAnimation.js — the editorial brand story (three short moments).

   HOW IT WORKS
   #story is a very tall section (about 3.6 screens). Inside it, .story__sticky
   is `position: sticky`, so it stays on screen while the visitor scrolls
   through the tall section. We do NOT hijack the scroll: the page scrolls
   normally and the scroll position simply drives one GSAP timeline.

   Timeline (scrubbed):
        hold on moment 1 -> cross-fade to moment 2 -> hold -> cross-fade to moment 3 -> hold
   Each cross-fade changes the text AND the picture together. Scrolling up
   plays the timeline in reverse, so later content disappears naturally.
   ========================================================================== */
(function (R) {
  'use strict';

  function init() {
    const section = R.qs('#story');
    const moments = R.qsa('.story-moment', section);
    const images = R.qsa('.story-image', section);
    const progressBar = R.qs('.story__progress-bar', section);

    // Reduced motion: no timeline. CSS (html.reduced-motion) stacks the three moments normally.
    if (!window.gsap || !window.ScrollTrigger || R.prefersReducedMotion()) return;
    gsap.registerPlugin(ScrollTrigger);

    // Starting state: only the first moment is visible. (autoAlpha = opacity + visibility)
    gsap.set(moments.slice(1), { autoAlpha: 0, y: 48 });
    gsap.set(images.slice(1), { autoAlpha: 0, scale: 1.06 });

    const timeline = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',          // when the section reaches the top of the screen...
        end: 'bottom bottom',      // ...until its bottom reaches the bottom of the screen
        scrub: 0.6
      }
    });

    const HOLD = 0.8;              // how long each moment rests on screen (timeline units)
    const FADE = 0.5;              // how long each cross-fade takes

    // Moves from moment `from` to moment `to`, text and image together.
    function crossFade(from, to, at) {
      timeline.to(moments[from], { autoAlpha: 0, y: -48, duration: FADE }, at);
      timeline.to(images[from], { autoAlpha: 0, scale: 0.96, duration: FADE }, at);
      timeline.to(moments[to], { autoAlpha: 1, y: 0, duration: FADE }, at + FADE * 0.35);
      timeline.to(images[to], { autoAlpha: 1, scale: 1, duration: FADE }, at + FADE * 0.35);
    }

    crossFade(0, 1, HOLD);                         // moment 1 rests, then becomes moment 2
    crossFade(1, 2, HOLD + FADE * 1.35 + HOLD);    // moment 2 rests, then becomes moment 3
    timeline.set({}, {}, HOLD + FADE * 1.35 + HOLD + FADE * 1.35 + HOLD);   // moment 3 rests at the end

    // A thin progress line at the bottom grows with the whole timeline.
    timeline.to(progressBar, { scaleX: 1, ease: 'none', duration: timeline.duration() }, 0);
  }

  R.story = { init: init };
})(window.Ravaan);
