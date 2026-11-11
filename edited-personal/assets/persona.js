/* KFUPM personalised site: asks who the visitor is, then rearranges the page for them.

   Markup the pages use (all optional):
     data-for="parent graduate"   shown only for those audiences ("default" = Just exploring)
     data-not-for="parent"        shown for every audience except those
     data-key="fees"              names a block so it can be reordered
     <body data-reorder='{"parent":["fees","life"]}'>  (or any container) puts the named
                                  children first, in that order, for that audience; the
                                  rest keep their original order after them.
   The visitor's choice is kept in localStorage. ?as=parent in the address opens that
   view directly, and ?as=ask shows the question again.
   After every change the document gets a "persona:change" event (detail = audience key),
   and <html data-persona="..."> holds the current one. */
(function () {
  'use strict';
  var d = document, html = d.documentElement, STORE = 'kfupm-persona';

  var ICON = {
    undergrad: '<path d="M2 9.5 12 4.5l10 5-10 5z"/><path d="M6 11.5v4.5c3.5 2.6 8.5 2.6 12 0v-4.5"/><path d="M22 9.5v5"/>',
    graduate: '<path d="M4 4.5h6.5A2.5 2.5 0 0 1 13 7v13a2 2 0 0 0-2-2H4z"/><path d="M20 4.5h-6.5A2.5 2.5 0 0 0 11 7v13a2 2 0 0 1 2-2h7z"/>',
    international: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3.2 3.2 3.2 14.8 0 18"/><path d="M12 3c-3.2 3.2-3.2 14.8 0 18"/>',
    parent: '<circle cx="8.5" cy="7.5" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M2.5 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M14.5 20c0-2.3 1.2-4 3.5-4s3.5 1.7 3.5 4"/>',
    faculty: '<path d="M9 3h6"/><path d="M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3"/><path d="M7.2 15h9.6"/>',
    default: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z"/>'
  };

  var PERSONAS = {
    undergrad: { label: 'Future undergraduate', short: 'Future undergraduate', desc: 'Finishing high school and choosing a degree.',
      nav: [['Undergraduate admission', 'undergraduate.html'], ['Bachelor programs', 'programs-list.html'], ['Olympiad track', 'olympiad.html'], ['Colleges', 'colleges.html'], ['Apply', 'apply.html']] },
    graduate: { label: 'Graduate applicant', short: 'Graduate applicant', desc: 'Looking at a master’s, executive master’s or PhD.',
      nav: [['Find a program', 'programs-search.html'], ['Tuition calculator', 'tuition-calculator.html'], ['Admissions', 'admissions-hub.html'], ['Research centers', 'https://www.kfupm.edu.sa/research/our-research/our-research-centers'], ['Apply', 'apply.html']] },
    international: { label: 'International student', short: 'International student', desc: 'Applying to KFUPM from outside Saudi Arabia.',
      nav: [['International students', 'https://www.kfupm.edu.sa/study/international-students'], ['Study in Saudi Arabia', 'https://www.kfupm.edu.sa/study/international-students/study-in-saudi-arabia'], ['Visa requirements', 'https://www.kfupm.edu.sa/study/international-students/visa-requirements'], ['Tuition calculator', 'tuition-calculator.html'], ['Apply', 'apply.html']] },
    parent: { label: 'Parent or guardian', short: 'Parent or guardian', desc: 'Supporting a son or daughter through admission.',
      nav: [['Admissions overview', 'admissions-hub.html'], ['Fees and scholarships', 'apply.html#scholarships'], ['Student housing and dining', 'https://www.kfupm.edu.sa/about-us/campus-life/student-housing-dining'], ['Health and safety', 'https://www.kfupm.edu.sa/about-us/campus-life/health-and-safety'], ['Contact us', 'https://www.kfupm.edu.sa/about-us/connect/contact-us']] },
    faculty: { label: 'Faculty and researchers', short: 'Faculty and researchers', desc: 'Considering a teaching or research role.',
      nav: [['Careers at KFUPM', 'https://www.kfupm.edu.sa/about-us/connect/careers'], ['Research pillars', 'https://www.kfupm.edu.sa/research/our-research/our-research-pillars'], ['Research centers', 'https://www.kfupm.edu.sa/research/our-research/our-research-centers'], ['Colleges', 'colleges.html'], ['Leadership', 'leaders.html']] },
    'default': { label: 'Just exploring', short: 'Visitor', desc: 'Show me everything KFUPM has.',
      nav: [['Study at KFUPM', 'study.html'], ['Admissions', 'admissions-hub.html'], ['Colleges', 'colleges.html'], ['News', 'news.html'], ['Apply', 'apply.html']] }
  };
  var ORDER = ['undergrad', 'graduate', 'international', 'parent', 'faculty', 'default'];

  function qa(sel, root) { return Array.prototype.slice.call((root || d).querySelectorAll(sel)); }
  function icon(k, cls) { return '<svg class="' + (cls || 'p-icon') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICON[k] + '</svg>'; }
  function words(s) { return (s || '').split(/\s+/).filter(Boolean); }
  function store(k) { try { if (k) localStorage.setItem(STORE, k); return localStorage.getItem(STORE); } catch (e) { return null; } }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Managed elements ---------- */
  // Every audience-specific element keeps a comment placeholder at its home position,
  // so it can be taken out of the page and put back exactly where it was.
  var managed = qa('[data-for],[data-not-for]').map(function (el) {
    var mark = d.createComment('persona');
    el.parentNode.insertBefore(mark, el);
    return { el: el, mark: mark, only: words(el.getAttribute('data-for')), not: words(el.getAttribute('data-not-for')) };
  });
  var containers = qa('[data-reorder]').map(function (c) {
    var spec = {};
    try { spec = JSON.parse(c.getAttribute('data-reorder')); } catch (e) {}
    return { el: c, spec: spec, home: Array.prototype.slice.call(c.children) };
  });

  function visibleFor(m, k) {
    if (m.only.length) return m.only.indexOf(k) !== -1;
    return m.not.indexOf(k) === -1;
  }

  /* ---------- Header chip and the "For you" menu ---------- */
  var navWrap = d.querySelector('.nav-wrap');
  var chip = d.createElement('button');
  chip.type = 'button';
  chip.className = 'persona-chip';
  chip.setAttribute('aria-haspopup', 'dialog');
  if (navWrap) navWrap.appendChild(chip);

  var mainNav = d.querySelector('.main-nav');
  var forYou = d.createElement('div');
  forYou.className = 'nav-item persona-nav';
  if (mainNav) mainNav.insertBefore(forYou, mainNav.firstChild);

  function paintChrome(k) {
    var p = PERSONAS[k];
    chip.innerHTML = icon(k) + '<span class="persona-chip-text"><small>Viewing as</small><b>' + p.short + '</b></span><span class="persona-chip-change">Change</span>';
    chip.setAttribute('aria-label', 'Viewing as ' + p.label + '. Change who you are');
    var links = p.nav.map(function (l) { return '<a href="' + l[1] + '">' + l[0] + '</a>'; }).join('');
    forYou.innerHTML = '<button type="button" aria-haspopup="true">For you</button><div class="dropdown"><div class="dd-col"><h6>' + p.label + '</h6>' + links + '</div></div>';
    forYou.querySelector('button').addEventListener('click', function () {
      if (window.innerWidth <= 920) forYou.classList.toggle('open');
    });
  }

  /* ---------- Applying an audience ---------- */
  function applyPersona(k) {
    html.setAttribute('data-persona', k);
    managed.forEach(function (m) {
      var show = visibleFor(m, k);
      if (show && !m.el.parentNode) {
        m.mark.parentNode.insertBefore(m.el, m.mark.nextSibling);
        qa('.reveal', m.el).concat(m.el.classList.contains('reveal') ? [m.el] : []).forEach(function (r) { r.classList.add('in'); });
      } else if (!show && m.el.parentNode) {
        m.el.parentNode.removeChild(m.el);
      }
    });
    containers.forEach(function (c) {
      // Only the named (data-key) children move; they are put back as one run, in the
      // audience's order, just after whatever unnamed element comes before the run.
      var want = c.spec[k] || [];
      var keyed = c.home.filter(function (el) { return el.parentNode === c.el && el.hasAttribute('data-key'); });
      if (!keyed.length) return;
      var current = Array.prototype.slice.call(c.el.children).filter(function (el) { return keyed.indexOf(el) !== -1; });
      var after = current[current.length - 1].nextSibling;
      var first = [];
      want.forEach(function (key) {
        keyed.forEach(function (el) { if (el.getAttribute('data-key') === key && first.indexOf(el) === -1) first.push(el); });
      });
      var rest = keyed.filter(function (el) { return first.indexOf(el) === -1; });
      first.concat(rest).forEach(function (el) { c.el.insertBefore(el, after); });
    });
    paintChrome(k);
    // pages with their own behaviour (e.g. the tuition calculator) listen for this
    d.dispatchEvent(new CustomEvent('persona:change', { detail: k }));
    // sections that just moved into view should not wait for the scroll fade-in
    qa('.reveal').forEach(function (r) {
      var b = r.getBoundingClientRect();
      if (b.top < window.innerHeight && b.bottom > 0) r.classList.add('in');
    });
  }

  /* ---------- The animated swap ---------- */
  var names = new WeakMap(), seq = 0;
  function nameFor(el) { if (!names.has(el)) names.set(el, 'p' + (++seq)); return names.get(el); }
  function candidates() {
    return qa('body > section:not(.hero), .section-head, .grid > *, .facts-grid > *, .college-grid > *, .hub-cards > *, [data-key], [data-for], [data-not-for], .hero-inner h1, .hero-inner .lead, .hero-inner .btn');
  }
  function tagAll(list) {
    list.forEach(function (el) { el.style.viewTransitionName = nameFor(el); });
  }
  function untagAll() {
    qa('[style*="view-transition-name"]').forEach(function (el) { el.style.viewTransitionName = ''; });
  }
  var staggerStyle = d.createElement('style');
  d.head.appendChild(staggerStyle);

  function swap(k, fromEl) {
    if (reduce || !d.startViewTransition) {
      applyPersona(k);
      if (!reduce) fallbackFlyIn();
      return Promise.resolve();
    }
    managed.forEach(function (m) { names.has(m.el) || nameFor(m.el); });
    tagAll(candidates().concat(managed.map(function (m) { return m.el; })));
    if (fromEl) fromEl.style.viewTransitionName = 'persona-pick';
    chip.style.viewTransitionName = '';
    var t = d.startViewTransition(function () {
      if (fromEl) fromEl.style.viewTransitionName = '';
      closeGate(true);
      applyPersona(k);
      chip.style.viewTransitionName = 'persona-pick';
      // stagger: things nearer the top of the screen move first
      var vis = candidates().filter(function (el) {
        var b = el.getBoundingClientRect();
        return b.bottom > -200 && b.top < window.innerHeight + 400;
      });
      tagAll(vis);
      vis.sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top; });
      staggerStyle.textContent = vis.slice(0, 60).map(function (el, i) {
        return '::view-transition-group(' + nameFor(el) + '),::view-transition-new(' + nameFor(el) + '){animation-delay:' + Math.min(i * 28, 520) + 'ms}';
      }).join('\n');
    });
    return t.finished.then(function () {
      untagAll();
      chip.style.viewTransitionName = '';
      staggerStyle.textContent = '';
    }, function () { untagAll(); });
  }
  function fallbackFlyIn() {
    if (!d.body.animate) return;
    qa('body > section:not(.hero)').forEach(function (s, i) {
      s.animate([{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }],
        { duration: 520, delay: i * 70, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    });
  }

  /* ---------- The "Who are you?" card ---------- */
  var gate = null;
  function openGate(first) {
    if (gate) return;
    gate = d.createElement('div');
    gate.className = 'persona-gate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'persona-gate-title');
    var current = html.getAttribute('data-persona');
    gate.innerHTML =
      '<div class="persona-card">' +
        '<p class="persona-eyebrow">Welcome to KFUPM</p>' +
        '<h2 id="persona-gate-title">Who are you?</h2>' +
        '<p class="persona-sub">We’ll tailor the pages to you. You can change this at any time.</p>' +
        '<div class="persona-options">' +
          ORDER.map(function (k) {
            var p = PERSONAS[k];
            return '<button type="button" class="persona-option' + (k === current && !first ? ' is-current' : '') + '" data-pick="' + k + '">' +
              icon(k, 'persona-option-icon') + '<span><b>' + p.label + '</b><small>' + p.desc + '</small></span></button>';
          }).join('') +
        '</div>' +
        (first ? '' : '<button type="button" class="persona-close" aria-label="Close">×</button>') +
      '</div>';
    d.body.appendChild(gate);
    html.classList.add('persona-locked');
    requestAnimationFrame(function () { gate.classList.add('is-open'); });
    qa('[data-pick]', gate).forEach(function (b) {
      b.addEventListener('click', function () { choose(b.getAttribute('data-pick'), b); });
    });
    var x = gate.querySelector('.persona-close');
    if (x) x.addEventListener('click', function () { closeGate(false); });
    gate.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !first) closeGate(false); });
    var focus = gate.querySelector('.is-current') || gate.querySelector('[data-pick]');
    if (focus) focus.focus();
  }
  function closeGate(instant) {
    if (!gate) return;
    var g = gate;
    gate = null;
    html.classList.remove('persona-locked');
    if (instant || reduce) { g.remove(); return; }
    g.classList.remove('is-open');
    setTimeout(function () { g.remove(); }, 300);
  }
  function choose(k, fromEl) {
    store(k);
    swap(k, fromEl).then(function () { chip.focus({ preventScroll: true }); });
  }
  chip.addEventListener('click', function () { openGate(false); });

  /* ---------- Start ---------- */
  var asked = (new URLSearchParams(location.search)).get('as');
  var saved = store();
  if (asked && PERSONAS[asked]) { store(asked); applyPersona(asked); }
  else if (saved && PERSONAS[saved] && asked !== 'ask') { applyPersona(saved); }
  else { applyPersona('default'); openGate(true); }
})();
