/* ==========================================================================
   portal.js — the dark "shop portal":
     1. the giant RAVAAN wordmark that scales up as you scroll
        (it feels like walking through the word)
     2. a light-weight canvas of white dots that react to the cursor

   Like the story section, the portal intro is a tall section with a sticky
   panel, so the page scrolls normally and scroll progress drives the zoom.
   ========================================================================== */
(function (R) {
  'use strict';

  /* ---------- 1. Wordmark zoom ---------- */
  function initWordmarkZoom() {
    const wordmark = R.qs('#portal-wordmark');
    const phrase = R.qs('#portal-phrase');
    if (!window.gsap || !window.ScrollTrigger || R.prefersReducedMotion()) return;   // CSS shows a static version
    gsap.registerPlugin(ScrollTrigger);

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: '#portal-intro',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6
      }
    });

    // The word grows from its centre (set with transform-origin in CSS) until the letters fill the screen...
    timeline.to(wordmark, { scale: 38, ease: 'power2.in', duration: 1 }, 0);
    // ...then fades away, and the quiet phrase appears in the dark space behind it.
    timeline.to(wordmark, { autoAlpha: 0, ease: 'none', duration: 0.22 }, 0.78);
    timeline.fromTo(phrase, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.22 }, 0.8);
  }

  /* ---------- 2. Particles ---------- */
  function initParticles() {
    const canvas = R.qs('#portal-canvas');
    const portal = R.qs('#portal');
    const context = canvas.getContext('2d');
    if (!context) return;

    const isTouch = R.isTouchDevice();
    const reduced = R.prefersReducedMotion();
    const pointer = { x: -9999, y: -9999, active: false };
    const INFLUENCE_RADIUS = 150;     // how far (px) the cursor affects the dots
    let width = 0, height = 0, pixelRatio = 1;
    let dots = [];
    let animationFrame = null;
    let isVisible = false;

    function createDots() {
      // The number of dots depends on the screen area, but is kept small for performance.
      const count = Math.max(60, Math.min(220, Math.round((width * height) / 9500)));
      dots = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        dots.push({
          homeX: x, homeY: y, x: x, y: y,
          radius: 0.6 + Math.random() * 1.1,
          phase: Math.random() * Math.PI * 2,         // makes each dot drift out of step with the others
          speed: 0.0004 + Math.random() * 0.0006
        });
      }
    }

    function resize() {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);   // cap the resolution: sharper is not worth the cost here
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      createDots();
      drawFrame(performance.now());
    }

    function drawFrame(time) {
      context.clearRect(0, 0, width, height);

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        // Gentle ambient drift (this alone is the touch-device version).
        const driftX = reduced ? 0 : Math.cos(time * dot.speed + dot.phase) * 10;
        const driftY = reduced ? 0 : Math.sin(time * dot.speed * 1.3 + dot.phase) * 10;
        let targetX = dot.homeX + driftX;
        let targetY = dot.homeY + driftY;
        let alpha = 0.22 + 0.18 * Math.sin(time * 0.001 + dot.phase);   // slow twinkle

        // Cursor proximity (mouse only): dots near the pointer are pushed away and glow brighter.
        if (pointer.active && !isTouch) {
          const dx = dot.x - pointer.x;
          const dy = dot.y - pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < INFLUENCE_RADIUS && distance > 0.1) {
            const strength = 1 - distance / INFLUENCE_RADIUS;
            targetX += (dx / distance) * strength * 46;
            targetY += (dy / distance) * strength * 46;
            alpha += strength * 0.65;
          }
        }

        // Ease towards the target so movement is smooth rather than snapping.
        dot.x += (targetX - dot.x) * 0.09;
        dot.y += (targetY - dot.y) * 0.09;

        context.fillStyle = 'rgba(255,255,255,' + Math.max(0.05, Math.min(1, alpha)).toFixed(3) + ')';
        context.beginPath();
        context.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    function loop(time) {
      drawFrame(time);
      animationFrame = requestAnimationFrame(loop);
    }

    function start() {
      if (reduced || animationFrame || !isVisible || document.hidden) return;
      animationFrame = requestAnimationFrame(loop);
    }

    function stop() {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    // Only animate while the portal is actually on screen (saves battery and CPU).
    new IntersectionObserver(function (entries) {
      isVisible = entries[0].isIntersecting;
      if (isVisible) { start(); } else { stop(); }
    }, { threshold: 0 }).observe(portal);

    document.addEventListener('visibilitychange', function () { if (document.hidden) { stop(); } else { start(); } });

    if (!isTouch) {
      window.addEventListener('pointermove', function (event) {
        if (event.pointerType && event.pointerType !== 'mouse') return;
        pointer.x = event.clientX;       // the canvas is sticky and fills the screen, so screen coordinates = canvas coordinates
        pointer.y = event.clientY;
        pointer.active = true;
      }, { passive: true });
      document.addEventListener('mouseleave', function () { pointer.active = false; });
    }

    let resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    resize();
  }

  function init() {
    initWordmarkZoom();
    initParticles();
  }

  R.portal = { init: init };
})(window.Ravaan);
