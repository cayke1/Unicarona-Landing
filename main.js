/* ============================================================
   UniCarona — interações da landing
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- NAV scroll state ---------- */
  var nav = document.getElementById('nav');
  function onScrollNav() {
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Animated counters ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    var dur = 1400, start = null;
    if (reduce) { el.innerHTML = prefix + target + suffix; return; }
    function frame(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.innerHTML = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if (reduce || !('IntersectionObserver' in window)) {
    counters.forEach(animateCount);
  } else {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- Route path draw + car motion ---------- */
  var routePath = document.getElementById('routePath');
  var carDot = document.getElementById('carDot');
  var routeStarted = false;
  function startRoute() {
    if (routeStarted) return; routeStarted = true;
    if (reduce) { if (routePath) routePath.style.strokeDashoffset = '0'; return; }
    if (routePath) {
      routePath.style.transition = 'stroke-dashoffset 2.2s cubic-bezier(.4,0,.2,1)';
      requestAnimationFrame(function () { routePath.style.strokeDashoffset = '0'; });
    }
    if (carDot) {
      carDot.animate(
        [{ offsetDistance: '0%' }, { offsetDistance: '100%' }],
        { duration: 3600, iterations: Infinity, easing: 'ease-in-out' }
      );
    }
  }
  if ('IntersectionObserver' in window && routePath) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { startRoute(); rio.disconnect(); } });
    }, { threshold: 0.4 });
    rio.observe(routePath.closest('.s-map'));
  } else { startRoute(); }

  /* ---------- Parallax (mouse + scroll) ---------- */
  var parEls = Array.prototype.slice.call(document.querySelectorAll('[data-par]'));
  var heroRect = document.querySelector('.hero');
  var mx = 0, my = 0, sy = 0, raf = null;
  function applyPar() {
    raf = null;
    parEls.forEach(function (el) {
      var f = parseFloat(el.getAttribute('data-par')) || 0;
      var tx = mx * f * 40;
      var ty = my * f * 40 + sy * f * -1.1;
      el.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
    });
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(applyPar); }
  if (!reduce) {
    window.addEventListener('mousemove', function (e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      schedule();
    }, { passive: true });
    window.addEventListener('scroll', function () {
      if (!heroRect) return;
      var b = heroRect.getBoundingClientRect();
      if (b.bottom > 0) { sy = -b.top; schedule(); }
    }, { passive: true });
  }

  /* ---------- Savings calculator ---------- */
  var rDays = document.getElementById('rDays');
  var rKm = document.getElementById('rKm');
  var rSeats = document.getElementById('rSeats');
  var oDays = document.getElementById('oDays');
  var oKm = document.getElementById('oKm');
  var oSeats = document.getElementById('oSeats');
  var seg = document.getElementById('modeSeg');
  var mode = 'app';

  var saveBig = document.getElementById('saveBig');
  var saveYear = document.getElementById('saveYear');
  var soloAmt = document.getElementById('soloAmt');
  var carAmt = document.getElementById('carAmt');
  var soloBar = document.getElementById('soloBar');
  var carBar = document.getElementById('carBar');
  var soloLabel = document.getElementById('soloLabel');

  var animStart = null, animFrom = 0, animTo = 0, animEl = saveBig;
  function brl(v) { return v.toLocaleString('pt-BR'); }

  function animateBig(to) {
    if (reduce) { saveBig.textContent = brl(to); return; }
    animFrom = parseInt(saveBig.textContent.replace(/\D/g, ''), 10) || 0;
    animTo = to; animStart = null;
    function f(t) {
      if (!animStart) animStart = t;
      var p = Math.min((t - animStart) / 600, 1);
      var e = 1 - Math.pow(1 - p, 3);
      saveBig.textContent = brl(Math.round(animFrom + (animTo - animFrom) * e));
      if (p < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }

  function calc() {
    var days = +rDays.value;       // dias/semana
    var km = +rKm.value;           // km ida
    var seats = +rSeats.value;     // pessoas dividindo
    var tripsMonth = days * 2 * 4.3; // ida e volta, ~4.3 semanas

    // custo "sozinho"
    var solo;
    if (mode === 'app') {
      // app de transporte: bandeira + por km (ida e volta já no tripsMonth)
      solo = tripsMonth * (5.5 + km * 2.2);
      soloLabel.textContent = 'Sozinho de app';
    } else {
      // carro próprio: combustível + desgaste por km
      solo = tripsMonth * (km * 0.95);
      soloLabel.textContent = 'Sozinho de carro';
    }

    // custo na carona: combustível dividido entre os ocupantes + taxa simbólica
    var fuelTrip = km * 0.85;
    var carona = tripsMonth * (fuelTrip / seats + 0.8);

    solo = Math.round(solo);
    carona = Math.round(carona);
    var saved = Math.max(0, solo - carona);

    animateBig(saved);
    saveYear.textContent = 'R$ ' + brl(saved * 10); // ~10 meses de ano letivo
    soloAmt.textContent = 'R$ ' + brl(solo);
    carAmt.textContent = 'R$ ' + brl(carona);

    var max = Math.max(solo, carona, 1);
    soloBar.style.width = (solo / max * 100) + '%';
    carBar.style.width = (carona / max * 100) + '%';
  }

  function syncOutputs() {
    oDays.textContent = rDays.value;
    oKm.textContent = rKm.value + ' km';
    oSeats.textContent = rSeats.value;
  }

  if (rDays && rKm && rSeats) {
    [rDays, rKm, rSeats].forEach(function (r) {
      r.addEventListener('input', function () { syncOutputs(); calc(); });
    });
    seg.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-mode]');
      if (!btn) return;
      mode = btn.getAttribute('data-mode');
      seg.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === btn); });
      calc();
    });
    syncOutputs();
    // run once when section first visible (so bars animate in)
    if ('IntersectionObserver' in window) {
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { calc(); sio.disconnect(); } });
      }, { threshold: 0.3 });
      sio.observe(document.getElementById('economia'));
    } else { calc(); }
  }

  /* ---------- Smooth-scroll offset for fixed nav ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      var y = t.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    });
  });
})();
