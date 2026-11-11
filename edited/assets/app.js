/* KFUPM Utopia: tiny, dependency-free, works from file:// */
(function () {
  'use strict';
  var d = document;
  d.documentElement.classList.remove('no-js');

  // Logo fallback if the remote image cannot load (e.g. offline)
  var logo = d.querySelector('.logo img');
  if (logo) {
    var useText = function () {
      var a = logo.parentElement;
      a.textContent = 'KFUPM';
      a.style.cssText = 'font-family:var(--font);font-weight:700;font-size:1.5rem;letter-spacing:.06em;color:#00573f';
    };
    logo.addEventListener('error', useText);
    if (logo.complete && logo.naturalWidth === 0) useText();
  }

  // Mobile menu
  var toggle = d.querySelector('.menu-toggle');
  var nav = d.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('.nav-item > button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (window.innerWidth <= 920) b.parentElement.classList.toggle('open');
      });
    });
  }

  // Tabs
  d.querySelectorAll('[data-tabs]').forEach(function (group) {
    var tabs = group.querySelectorAll('.tab');
    var panels = group.querySelectorAll('.tab-panel');
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
        panels.forEach(function (p) { p.classList.remove('on'); });
        t.setAttribute('aria-selected', 'true');
        panels[i].classList.add('on');
      });
    });
  });

  // Reveal on scroll
  var items = d.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Count-up for the numbers in the facts section (e.g. 63rd, 1st, 4th, 58th)
  d.querySelectorAll('.orb b[data-n]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-n'), 10);
    var suffix = el.getAttribute('data-s') || '';
    var played = false;
    function play() {
      if (played) return; played = true;
      var start = null, dur = 1400;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.max(1, Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if ('IntersectionObserver' in window) {
      var o = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { play(); o.disconnect(); }
      }, { threshold: 0.5 });
      o.observe(el);
    }
  });

  // Gentle parallax on the hero mural
  var mural = d.querySelector('.hero-mural');
  if (mural && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('scroll', function () {
      var y = Math.min(window.scrollY, 900);
      mural.style.transform = 'translateY(' + (y * 0.25) + 'px) scale(1.08)';
    }, { passive: true });
  }
})();
