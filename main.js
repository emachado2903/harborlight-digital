/* Harborlight Digital: theme toggle, navigation, plan buttons, and the contact form. */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- Light / dark mode ---------- */
  var toggle = document.querySelector('.theme-toggle');
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function savedTheme() {
    try { return localStorage.getItem('hl-theme'); } catch (e) { return null; }
  }

  function applyTheme(theme, save) {
    root.setAttribute('data-theme', theme);
    if (toggle) toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    if (save) { try { localStorage.setItem('hl-theme', theme); } catch (e) {} }
    document.dispatchEvent(new Event('hl:themechange'));
  }

  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);

  if (toggle) {
    toggle.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }

  // Follow the device setting until the visitor picks a mode themselves.
  var onSystemChange = function (e) { if (!savedTheme()) applyTheme(e.matches ? 'dark' : 'light', false); };
  if (systemDark.addEventListener) systemDark.addEventListener('change', onSystemChange);
  else if (systemDark.addListener) systemDark.addListener(onSystemChange);

  /* ---------- Pages open at the top ---------- */
  // Arriving from a link (like the logo on the privacy page, or the privacy link at the bottom of
  // the home page), a page should start at its top. Browsers usually do this anyway, but some (and
  // some embedded previews) carry the old scroll position over or restore it a moment after the
  // page loads. So: jump to the top now, and for the first moments after loading, undo any scroll
  // the visitor didn't make themselves. Links to a section (like /#faq) and the back button are
  // left alone, so going back still returns you to where you were.
  function jumpToTop() {
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
  }
  function navigationType() {
    try {
      var nav = performance.getEntriesByType('navigation')[0];
      if (nav && nav.type) return nav.type;
    } catch (e) {}
    return (performance.navigation && performance.navigation.type === 2) ? 'back_forward' : 'navigate';
  }
  var alwaysTop = !!(document.body && document.body.hasAttribute('data-open-at-top'));   // the privacy page
  if (alwaysTop && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash && (alwaysTop || navigationType() !== 'back_forward')) {
    var visitorScrolled = false, holdTopUntil = Date.now() + 2000;
    var markVisitor = function () { visitorScrolled = true; };
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (type) {
      window.addEventListener(type, markVisitor, { passive: true, once: true });
    });
    var holdTop = function () {
      if (!visitorScrolled && Date.now() < holdTopUntil && window.pageYOffset > 0) jumpToTop();
    };
    jumpToTop();
    window.addEventListener('scroll', holdTop, { passive: true });
    window.addEventListener('load', function () {
      holdTopUntil = Date.now() + 1500;   // count from when the page has fully loaded
      holdTop();
      setTimeout(holdTop, 60); setTimeout(holdTop, 250); setTimeout(holdTop, 700);
    });
  }
  if (alwaysTop) window.addEventListener('pageshow', function (e) { if (e.persisted) jumpToTop(); });
  // "#top" links (like Privacy Policy in this page's own footer) glide back to the very top.
  // The header is sticky, so the browser alone wouldn't move for them.
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href="#top"]');
    if (!link) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- Header and mobile menu ---------- */
  var header = document.querySelector('.site-header');
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  function setMenu(open) {
    if (!navToggle || !nav) return;
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('is-open', open);
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
    });
  }
  if (nav) {
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Underline the nav link for the section in view.
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.site-nav ul a'));
  function setCurrent(hash) {
    navLinks.forEach(function (a) {
      if (a.getAttribute('href') === hash) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  // After clicking a link on the page, jump the underline straight to the destination
  // and hold it there while the page scrolls, so it doesn't flicker across every
  // section on the way.
  var holdUntil = 0;
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link || link.getAttribute('href').length < 2) return;
    setCurrent(link.getAttribute('href'));
    holdUntil = Date.now() + 1500;
  });
  window.addEventListener('scrollend', function () { holdUntil = 0; });
  if ('IntersectionObserver' in window && navLinks.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      if (Date.now() < holdUntil) return;
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setCurrent('#' + entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) {
      var href = a.getAttribute('href');
      if (href.charAt(0) !== '#') return;   // e.g. "/#about" on the privacy page
      var target = document.querySelector(href);
      if (target) sectionObserver.observe(target);
    });
  }

  /* ---------- Plan buttons pre-select the package ---------- */
  var packageSelect = document.getElementById('f-package');
  var nameField = document.getElementById('f-name');
  Array.prototype.forEach.call(document.querySelectorAll('[data-package]'), function (btn) {
    btn.addEventListener('click', function () {
      if (packageSelect) packageSelect.value = btn.getAttribute('data-package');
      if (nameField) setTimeout(function () { nameField.focus({ preventScroll: true }); }, 700);
    });
  });

  /* ---------- Contact form (Formspree) ---------- */
  var form = document.getElementById('contact-form');
  if (form) {
    var status = form.querySelector('.form-status');
    var submit = form.querySelector('button[type="submit"]');
    var checks = [
      { id: 'f-name', err: 'err-name', test: function (v) { return v.trim().length > 0; } },
      { id: 'f-email', err: 'err-email', test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); } },
      { id: 'f-message', err: 'err-message', test: function (v) { return v.trim().length > 0; } }
    ];

    function setError(check, show) {
      var input = document.getElementById(check.id), msg = document.getElementById(check.err);
      if (!input || !msg) return;
      msg.hidden = !show;
      if (show) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', check.err); }
      else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
    }

    checks.forEach(function (check) {
      var input = document.getElementById(check.id);
      if (input) input.addEventListener('input', function () { if (check.test(input.value)) setError(check, false); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = '';
      status.classList.remove('is-error');

      var firstBad = null;
      checks.forEach(function (check) {
        var input = document.getElementById(check.id);
        var ok = check.test(input.value);
        setError(check, !ok);
        if (!ok && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); return; }

      var gotcha = form.querySelector('[name="_gotcha"]');
      if (gotcha && gotcha.value) return;

      // Preview copies of the page can't reach Formspree; say so instead of pretending to send.
      if (form.hasAttribute('data-preview')) {
        status.textContent = 'This preview doesn\'t send messages. The form sends for real on harborlightdigital.co.';
        return;
      }

      submit.setAttribute('aria-busy', 'true');
      submit.disabled = true;
      var label = submit.textContent;
      submit.textContent = 'Sending…';

      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (res.ok) return showSent();
          return res.json().catch(function () { return {}; }).then(function (data) {
            var detail = data && data.errors ? data.errors.map(function (x) { return x.message; }).join(' ') : '';
            showError(detail || 'Your message didn\'t go through. Try again in a moment.');
          });
        })
        .catch(function () {
          showError('We couldn\'t reach the form service. Check your connection and try again.');
        })
        .then(function () {
          submit.removeAttribute('aria-busy');
          submit.disabled = false;
          submit.textContent = label;
        });
    });

    function showError(text) {
      status.textContent = text;
      status.classList.add('is-error');
    }

    function showSent() {
      var name = (document.getElementById('f-name').value || '').trim().split(/\s+/)[0];
      var done = document.createElement('div');
      done.className = 'form-done';
      done.setAttribute('tabindex', '-1');
      var h = document.createElement('h3');
      h.textContent = 'Message sent.';
      var p = document.createElement('p');
      p.textContent = (name ? 'Thanks, ' + name + '. ' : 'Thanks. ') + 'We\'ll reply within 1–2 business days.';
      done.appendChild(h);
      done.appendChild(p);
      form.replaceWith(done);
      done.focus();
    }
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
