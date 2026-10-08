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
  if ('IntersectionObserver' in window && navLinks.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          if (a.getAttribute('href') === '#' + entry.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) {
      var target = document.querySelector(a.getAttribute('href'));
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
