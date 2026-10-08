/* Harborlight Digital: living line-waves.
   Thin lines drift like a soft harbor swell while a glint of light rides along them.
   Three wave fields share one animation loop: the hero ribbon, the About ribbon, and the Why contours.
   Each field only draws while it's on screen. */
(function () {
  'use strict';

  /* ---- Settings you may want to adjust ---- */
  var RESPECT_REDUCED_MOTION = false; // true = hold everything still for visitors whose device asks for less motion
  var MOBILE_MOTION_MS = 60000;       // phones: waves move for 1 minute, then settle; scrolling wakes them again
  var WAVE_SPEED = 1;                 // overall wave speed (0.5 = half speed, 2 = double)
  var GLINT_PERIOD = 13;              // seconds for a glint to travel the full hero wave
  var HERO_STRANDS = 7;               // number of lines in the hero ribbon

  var TAU = Math.PI * 2;
  var mobileMQ = window.matchMedia('(max-width: 768px), (pointer: coarse)');
  var reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  var clock = { wave: 0, glint: 0, motion: 1, motionUntil: 0, last: 0 };
  var colors = {};
  var fields = [];
  var raf = 0;

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    colors.line = cs.getPropertyValue('--wave-rgb').trim() || '19, 49, 66';
    colors.alpha = parseFloat(cs.getPropertyValue('--wave-alpha')) || 0.9;
    colors.glint = cs.getPropertyValue('--wave-glint-rgb').trim() || '255, 255, 255';
    colors.glintStrength = parseFloat(cs.getPropertyValue('--wave-glint-strength')) || 1;
    colors.blend = cs.getPropertyValue('--wave-glint-blend').trim() || 'source-over';
    colors.contour = parseFloat(cs.getPropertyValue('--contour-alpha')) || 0.5;
  }

  /* ---------- Geometry helpers ---------- */
  function smoothstep(a, b, x) {
    var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  // Catmull-Rom spline through points [[x,y],...] -> flat [x0,y0,x1,y1,...]
  function spline(points, perSeg) {
    var out = [];
    var n = points.length;
    for (var i = 0; i < n - 1; i++) {
      var p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || points[i + 1];
      for (var s = 0; s < perSeg; s++) {
        var t = s / perSeg, t2 = t * t, t3 = t2 * t;
        out.push(
          0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3)
        );
      }
    }
    out.push(points[n - 1][0], points[n - 1][1]);
    return out;
  }

  function arcLengths(pts) {
    var n = pts.length / 2, cum = new Float32Array(n);
    for (var k = 1; k < n; k++) {
      var dx = pts[2 * k] - pts[2 * k - 2], dy = pts[2 * k + 1] - pts[2 * k - 1];
      cum[k] = cum[k - 1] + Math.sqrt(dx * dx + dy * dy);
    }
    return cum;
  }

  /* ---------- Drawing ---------- */
  function strokeLine(ctx, pts, width, alpha) {
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (var k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
    ctx.stroke();
  }

  // Draw a soft highlight centered `center` px along the line, fading out over `half` px each side.
  // Built from runs of equal brightness so joins stay smooth on curves and loops.
  function glintRuns(ctx, pts, cum, center, half, strength, width) {
    var n = cum.length;
    if (n < 2 || center + half < 0 || center - half > cum[n - 1]) return;
    var lo = 0, hi = n - 1, start = center - half;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (cum[mid] < start) lo = mid + 1; else hi = mid; }
    var k0 = Math.max(0, lo - 1);
    var LEVELS = 12, runStart = -1, runLevel = 0;
    ctx.lineWidth = width;

    function flush(endIdx) {
      if (runLevel > 0 && endIdx > runStart) {
        ctx.globalAlpha = (runLevel / LEVELS) * strength;
        ctx.beginPath();
        ctx.moveTo(pts[2 * runStart], pts[2 * runStart + 1]);
        for (var j = runStart + 1; j <= endIdx; j++) ctx.lineTo(pts[2 * j], pts[2 * j + 1]);
        ctx.stroke();
      }
    }

    for (var k = k0; k < n - 1; k++) {
      var m = (cum[k] + cum[k + 1]) * 0.5;
      if (m > center + half) break;
      var d = Math.abs(m - center) / half;
      var level = d < 1 ? Math.round(smoothstep(0, 1, 1 - d) * LEVELS) : 0;
      if (level !== runLevel) { flush(k); runStart = k; runLevel = level; }
    }
    flush(k);
  }

  function drawGlint(ctx, pts, cum, center, half, strength) {
    var s = strength * colors.glintStrength;
    ctx.save();
    ctx.globalCompositeOperation = colors.blend;
    ctx.strokeStyle = 'rgb(' + colors.glint + ')';
    ctx.lineCap = 'butt';
    glintRuns(ctx, pts, cum, center, half * 1.25, s * 0.16, 7);   // soft halo
    glintRuns(ctx, pts, cum, center, half, s * 0.95, 1.7);         // bright core
    ctx.restore();
  }

  /* ---------- Field: one canvas, one painter ---------- */
  function Field(canvas, painter) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.painter = painter;
    this.visible = false;
    this.w = 0; this.h = 0;
    this.resize();
  }
  Field.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  Field.prototype.render = function () {
    if (this.w < 2 || this.h < 2) return;
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgb(' + colors.line + ')';
    this.painter(ctx, this.w, this.h, clock.wave, clock.glint, this.canvas);
    ctx.globalAlpha = 1;
  };

  /* ---------- Hero ribbon ---------- */
  // Crests and troughs of the swell, left to right (x as a fraction of width, y as a fraction of height).
  var HERO_KEYS = [[-0.14, 1.05], [0.21, 0.47], [0.35, 0.74], [0.55, 0.10], [0.77, 0.60], [1.03, 0.04], [1.26, 0.55]];

  function heroPainter(ctx, w, h, t, g) {
    var keys = [];
    for (var i = 0; i < HERO_KEYS.length; i++) {
      keys.push([
        HERO_KEYS[i][0] + 0.012 * Math.sin(0.23 * t + i * 1.3),
        HERO_KEYS[i][1] + 0.05 * Math.sin(0.31 * t + i * 1.9)
      ]);
    }
    var padT = h * 0.05, span = h - padT;
    var step = Math.max(3, w / 340);
    // On narrow screens show a slice of a wider swell so the crests stay gentle.
    var vw = Math.max(w, 1000), offX = (vw - w) * 0.42;
    var mid = (HERO_STRANDS - 1) / 2;

    for (var s = 0; s < HERO_STRANDS; s++) {
      var pts = [], seg = 0, kOff = s - mid;
      for (var x = -24; x <= w + 24; x += step) {
        var u = (x + offX) / vw;
        while (seg < keys.length - 2 && u > keys[seg + 1][0]) seg++;
        var a = keys[seg], b = keys[seg + 1];
        var f = Math.max(0, Math.min(1, (u - a[0]) / (b[0] - a[0])));
        var y = a[1] + (b[1] - a[1]) * (1 - Math.cos(Math.PI * f)) * 0.5;
        // traveling swell
        y += 0.035 * Math.sin(TAU * 1.7 * u - 0.55 * t) + 0.018 * Math.sin(TAU * 3.1 * u + 0.4 * t + 1.3);
        // strands fan out toward the crests and gather at the left
        var gather = 0.25 + 0.75 * smoothstep(-0.1, 0.3, u);
        var spread = 0.018 * (0.55 + 0.45 * Math.sin(TAU * 1.25 * u - 0.3 * t + 0.6));
        var wobble = 0.0045 * Math.sin(TAU * 2.4 * u - 0.45 * t + s * 0.85);
        y += (kOff * spread + wobble) * gather;
        pts.push(x, padT + y * span);
      }
      strokeLine(ctx, pts, 1, colors.alpha);
      var cum = arcLengths(pts), L = cum[cum.length - 1];
      var half = Math.max(70, L * 0.075);
      for (var gi = 0; gi < 2; gi++) {
        var phase = (g / GLINT_PERIOD + gi * 0.5 + s * 0.006) % 1;
        drawGlint(ctx, pts, cum, (phase * 1.3 - 0.15) * L, half, gi === 0 ? 1 : 0.6);
      }
    }
  }

  /* ---------- About ribbon ---------- */
  // One twisting ribbon of fine lines on the left-hand side: it enters from the left edge and falls away
  // off the bottom. Its path is built from where the heading and text actually sit, and it's clipped to
  // the empty space around them, so the lines never cross the words at any screen size.
  var RIBBON_SPACING = 6;   // px between lines at the ribbon's widest

  function aboutRibbons(canvas, w, h) {
    var band = canvas.parentElement;
    var title = band.querySelector('.about-title'), copy = band.querySelector('.about-copy');
    if (!title || !copy) return [];
    var cb = canvas.getBoundingClientRect();
    function rel(el) {
      var r = el.getBoundingClientRect();
      return { l: r.left - cb.left, r: r.right - cb.left, t: r.top - cb.top, b: r.bottom - cb.top };
    }
    var T = rel(title), C = rel(copy);
    var stripTop = C.b + 24 + RIBBON_SPACING * 2, stripH = h - stripTop;   // open space under the text
    var style = { strands: 9, spacing: RIBBON_SPACING, wob: 1.4, twists: 1.3, sway: 5, alpha: 0.72 };
    function ribbon(clip, ctrl) { return { strands: style.strands, spacing: style.spacing, wob: style.wob, twists: style.twists, sway: style.sway, alpha: style.alpha, clip: clip, ctrl: ctrl }; }

    // Heading and text side by side: the ribbon runs down the left margin.
    var xL = Math.min(T.l, C.l) - 48;
    if (C.l > T.r && xL >= 90) {
      var WL = Math.min(xL, Math.max(160, w * 0.16));
      return [ribbon([[0, 0, xL, h]], [
        [-30, 0.26 * h], [0.2 * WL, 0.36 * h], [0.45 * WL, 0.46 * h], [0.6 * WL, 0.6 * h],
        [0.62 * WL, 0.76 * h], [0.8 * WL, 0.92 * h], [0.98 * WL, h + 30]
      ])];
    }
    // Stacked (phones) or no left margin: the ribbon enters from the left under the text.
    if (stripH >= 60) {
      return [ribbon([[0, C.b + 6, w, h - C.b - 6]], [
        [-30, stripTop + 0.12 * stripH], [0.14 * w, stripTop + 0.24 * stripH], [0.3 * w, stripTop + 0.48 * stripH],
        [0.42 * w, stripTop + 0.8 * stripH], [0.52 * w, h + 30]
      ])];
    }
    return [];
  }

  function drawRibbon(ctx, R, t, g, seed) {
    ctx.save();
    ctx.beginPath();
    for (var c = 0; c < R.clip.length; c++) ctx.rect(R.clip[c][0], R.clip[c][1], R.clip[c][2], R.clip[c][3]);
    ctx.clip();

    var moved = [];
    for (var j = 0; j < R.ctrl.length; j++) {
      moved.push([
        R.ctrl[j][0] + R.sway * Math.sin(0.35 * t + j * 1.3 + seed),
        R.ctrl[j][1] + R.sway * Math.cos(0.3 * t + j * 0.9 + seed)
      ]);
    }
    var base = spline(moved, 26), n = base.length / 2;
    var cum = arcLengths(base), L = cum[n - 1];
    var nx = new Float32Array(n), ny = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      var tx = base[2 * b] - base[2 * a], ty = base[2 * b + 1] - base[2 * a + 1];
      var len = Math.sqrt(tx * tx + ty * ty) || 1;
      nx[i] = -ty / len; ny[i] = tx / len;
    }

    var mid = (R.strands - 1) / 2;
    for (var k = 0; k < R.strands; k++) {
      var pts = [];
      for (var q = 0; q < n; q++) {
        var u = cum[q] / L;
        // the ribbon slowly twists, so its lines gather and fan out as it moves
        var twist = Math.cos(TAU * R.twists * u - 0.4 * t + seed + k * 0.05);
        var off = (k - mid) * R.spacing * twist + R.wob * Math.sin(TAU * 2.2 * u + 0.5 * t + k * 0.7 + seed);
        pts.push(base[2 * q] + nx[q] * off, base[2 * q + 1] + ny[q] * off);
      }
      var depth = 0.75 + 0.25 * Math.sin(k * 1.7 + seed);
      strokeLine(ctx, pts, 0.85, colors.alpha * R.alpha * depth);
      var c2 = arcLengths(pts), L2 = c2[c2.length - 1];
      var phase = (g / 10 + k * 0.012 + seed * 0.21) % 1;
      drawGlint(ctx, pts, c2, (phase * 1.3 - 0.15) * L2, Math.max(40, L2 * 0.1), 0.8);
    }
    ctx.restore();
  }

  function aboutPainter(ctx, w, h, t, g, canvas) {
    var ribbons = aboutRibbons(canvas, w, h);
    for (var i = 0; i < ribbons.length; i++) drawRibbon(ctx, ribbons[i], t, g, i * 2.3);
  }

  /* ---------- Why contours ---------- */
  // Each bundle: base path, line count, and how successive lines nest (shift in px, or scale toward a point).
  var BUNDLES = [
    { path: [[-0.06, 0.0], [0.05, 0.10], [0.11, 0.25], [0.07, 0.42], [-0.05, 0.55]], lines: 12, shift: [10, 0] },
    { path: [[0.16, 1.1], [0.25, 0.9], [0.36, 0.85], [0.47, 0.95], [0.57, 0.85], [0.67, 0.92], [0.76, 1.1]], lines: 11, scaleTo: [0.46, 1.12], scaleStep: 0.075 },
    { path: [[1.06, 0.22], [0.96, 0.36], [0.92, 0.55], [0.97, 0.72], [1.07, 0.84]], lines: 12, shift: [10, 0] }
  ];

  function contourPainter(ctx, w, h, t, g) {
    for (var b = 0; b < BUNDLES.length; b++) {
      var B = BUNDLES[b];
      for (var k = 0; k < B.lines; k++) {
        var ptsIn = [];
        for (var j = 0; j < B.path.length; j++) {
          var px = B.path[j][0] * w, py = B.path[j][1] * h;
          if (B.shift) { px += B.shift[0] * k; py += B.shift[1] * k; }
          if (B.scaleTo) {
            var c = 1 - B.scaleStep * k, cx = B.scaleTo[0] * w, cy = B.scaleTo[1] * h;
            px = cx + (px - cx) * c; py = cy + (py - cy) * c;
          }
          var ph = j * 1.1 + k * 0.35 + b * 2.1;
          px += 6 * Math.sin(0.3 * t + ph);
          py += 6 * Math.cos(0.26 * t + ph * 0.8);
          ptsIn.push([px, py]);
        }
        var pts = spline(ptsIn, 18);
        strokeLine(ctx, pts, 0.9, colors.contour);
        var cum = arcLengths(pts), L = cum[cum.length - 1];
        var phase = (g / 16 + b * 0.33 + k * 0.015) % 1;
        drawGlint(ctx, pts, cum, (phase * 1.4 - 0.2) * L, Math.max(50, L * 0.08), 0.55);
      }
    }
  }

  var PAINTERS = {
    'hero': heroPainter,
    'about': aboutPainter,
    'contours': contourPainter
  };

  /* ---------- Loop ---------- */
  function frame(now) {
    var dt = clock.last ? Math.min(0.05, (now - clock.last) / 1000) : 0;
    clock.last = now;

    var still = RESPECT_REDUCED_MOTION && reducedMQ.matches;
    var target = (still || (mobileMQ.matches && now > clock.motionUntil)) ? 0 : 1;
    clock.motion += (target - clock.motion) * Math.min(1, dt * 0.9); // ease in and out over a few seconds
    clock.wave += dt * clock.motion * WAVE_SPEED;
    if (!still) clock.glint += dt;

    var any = false;
    for (var i = 0; i < fields.length; i++) {
      if (fields[i].visible) { fields[i].render(); any = true; }
    }
    raf = (any && !document.hidden) ? requestAnimationFrame(frame) : 0;
  }

  function start() {
    if (!raf) { clock.last = 0; raf = requestAnimationFrame(frame); }
  }

  function renderAll() { for (var i = 0; i < fields.length; i++) fields[i].render(); }

  function init() {
    readColors();
    clock.motionUntil = performance.now() + MOBILE_MOTION_MS;

    var canvases = document.querySelectorAll('canvas[data-wave]');
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var f = e.target.__field;
        if (f) f.visible = e.isIntersecting;
      });
      start();
    }, { rootMargin: '80px 0px' }) : null;

    var ro = 'ResizeObserver' in window ? new ResizeObserver(function (entries) {
      entries.forEach(function (e) { var f = e.target.__field; if (f) { f.resize(); f.render(); } });
    }) : null;

    Array.prototype.forEach.call(canvases, function (c) {
      var painter = PAINTERS[c.getAttribute('data-wave')];
      if (!painter || !c.getContext) return;
      var f = new Field(c, painter);
      c.__field = f;
      fields.push(f);
      f.render();
      if (io) io.observe(c); else f.visible = true;
      if (ro) ro.observe(c);
    });
    if (!ro) window.addEventListener('resize', function () { fields.forEach(function (f) { f.resize(); f.render(); }); });

    // Scrolling wakes the waves on phones for another minute.
    window.addEventListener('scroll', function () {
      clock.motionUntil = performance.now() + MOBILE_MOTION_MS;
    }, { passive: true });

    document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
    document.addEventListener('hl:themechange', function () { readColors(); renderAll(); });

    start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
