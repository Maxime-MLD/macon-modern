/* ===========================================================================
   Maçon Modern — comportements
   =========================================================================== */
(function () {
  'use strict';

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => {
    const t = clamp01((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };

  /* ------------------------------------------------------------------ *
   *  HERO — scroll-expand avec fondu d'étapes de chantier
   * ------------------------------------------------------------------ */
  const Hero = (function () {
    const hero = document.querySelector('.hero');
    if (!hero) return null;

    const media   = hero.querySelector('.hero__media');
    const layers  = [...hero.querySelectorAll('.hero__layer')];
    const tint    = hero.querySelector('.hero__media-tint');
    const bg      = hero.querySelector('.hero__bg');
    const w1      = hero.querySelector('.hero__title .w1');
    const w2      = hero.querySelector('.hero__title .w2');
    const title   = hero.querySelector('.hero__title');
    const lead    = hero.querySelector('.hero__lead');
    const pbar    = hero.querySelector('.hero__pbar i');
    const capNum  = hero.querySelector('.hero__cap .num');
    const capVal  = hero.querySelector('.hero__cap .meta .v');
    const capKey  = hero.querySelector('.hero__cap .meta .k');

    const STAGES = [
      { k: 'Étape 01', v: 'Les fondations' },
      { k: 'Étape 02', v: 'Élévation des murs' },
      { k: 'Étape 03', v: 'Maison livrée' },
    ];

    let progress = 0;
    let expanded = false;
    let touchY = 0;
    let vw = window.innerWidth, vh = window.innerHeight;

    function dims() { vw = window.innerWidth; vh = window.innerHeight; }

    function render() {
      const p = progress;

      // media size: petite carte -> plein écran
      const startW = Math.min(vw * 0.86, 360);
      const startH = Math.min(vh * 0.62, 560);
      const wPx = lerp(startW, vw, p);
      const hPx = lerp(startH, vh, p);
      media.style.width  = wPx + 'px';
      media.style.height = hPx + 'px';
      media.style.borderRadius = lerp(18, 0, smooth(0.55, 1, p)) + 'px';
      media.style.boxShadow = `0 ${lerp(40, 0, p)}px ${lerp(90, 0, p)}px -30px rgba(0,0,0,${lerp(0.6, 0, p)})`;

      // fondu des étapes
      layers[0].style.opacity = 1;
      layers[1].style.opacity = smooth(0.30, 0.50, p);
      layers[2].style.opacity = smooth(0.62, 0.82, p);

      // assombrissement (s'éclaircit en s'ouvrant)
      tint.style.opacity = (0.34 - p * 0.16).toFixed(3);

      // fond qui s'efface
      bg.style.opacity = (1 - smooth(0, 0.7, p)).toFixed(3);

      // titre qui s'écarte puis disparaît
      const tx = p * (vw < 768 ? 64 : 52);
      w1.style.transform = `translateX(-${tx}vw)`;
      w2.style.transform = `translateX(${tx}vw)`;
      title.style.opacity = (1 - smooth(0.45, 0.92, p)).toFixed(3);
      lead.style.opacity = (1 - smooth(0.05, 0.45, p)).toFixed(3);

      // barre de progression + légende d'étape
      pbar.style.width = (p * 100).toFixed(1) + '%';
      pbar.style.opacity = (1 - smooth(0.85, 1, p));

      const si = p < 0.4 ? 0 : p < 0.75 ? 1 : 2;
      const st = STAGES[si];
      if (capVal.textContent !== st.v) {
        capNum.textContent = String(si + 1).padStart(2, '0');
        capVal.textContent = st.v;
        capKey.textContent = st.k;
      }
    }

    function setProgress(np) {
      progress = clamp01(np);
      if (progress >= 1) { expanded = true; document.body.classList.add('hero-open'); }
      render();
    }

    function collapse() {
      expanded = false;
      document.body.classList.remove('hero-open');
      window.scrollTo(0, 0);
    }

    function onWheel(e) {
      if (expanded) {
        if (e.deltaY < 0 && window.scrollY <= 2) { collapse(); e.preventDefault(); }
        return;
      }
      e.preventDefault();
      setProgress(progress + e.deltaY * 0.0009);
    }
    function onTouchStart(e) { touchY = e.touches[0].clientY; }
    function onTouchMove(e) {
      if (!touchY) return;
      const y = e.touches[0].clientY;
      const d = touchY - y;
      if (expanded) {
        if (d < -24 && window.scrollY <= 2) { collapse(); e.preventDefault(); }
        return;
      }
      e.preventDefault();
      const factor = d < 0 ? 0.0075 : 0.005;
      setProgress(progress + d * factor);
      touchY = y;
    }
    function onTouchEnd() { touchY = 0; }
    function onScroll() { if (!expanded) window.scrollTo(0, 0); }

    function smoothExpand() {
      if (expanded) return;
      const start = progress, t0 = performance.now(), dur = 900;
      (function step(now) {
        const k = clamp01((now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        setProgress(lerp(start, 1, e));
        if (k < 1) requestAnimationFrame(step);
      })(performance.now());
    }

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', () => { dims(); render(); });

    const scrollBtn = hero.querySelector('.hero__scroll');
    if (scrollBtn) scrollBtn.addEventListener('click', smoothExpand);

    dims();
    render();

    return {
      ensureExpanded() {
        if (!expanded) {
          progress = 1;
          expanded = true;
          document.body.classList.add('hero-open');
          render();
        }
      },
      isExpanded() { return expanded; },
    };
  })();
  window.MMHero = Hero;

  /* ------------------------------------------------------------------ *
   *  HEADER — état plein au défilement
   * ------------------------------------------------------------------ */
  const header = document.querySelector('.header');
  function syncHeader() {
    if (!header) return;
    const past = window.scrollY > 40 || (Hero && Hero.isExpanded() && window.scrollY > 10);
    header.classList.toggle('is-solid', !!past);
  }
  window.addEventListener('scroll', syncHeader);
  syncHeader();

  /* ------------------------------------------------------------------ *
   *  NAV — ancres
   * ------------------------------------------------------------------ */
  function go(target) {
    const el = document.querySelector(target);
    if (!el) return;
    if (Hero) Hero.ensureExpanded();
    requestAnimationFrame(() => {
      const y = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    });
  }
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('#')) { e.preventDefault(); closeMenu(); go(href); }
    });
  });

  /* ------------------------------------------------------------------ *
   *  MENU MOBILE
   * ------------------------------------------------------------------ */
  const mmenu = document.querySelector('.mmenu');
  function openMenu() { mmenu && mmenu.classList.add('open'); }
  function closeMenu() { mmenu && mmenu.classList.remove('open'); }
  const burger = document.querySelector('.burger');
  if (burger) burger.addEventListener('click', openMenu);
  const mclose = document.querySelector('.mmenu__close');
  if (mclose) mclose.addEventListener('click', closeMenu);

  /* ------------------------------------------------------------------ *
   *  COMPTEURS animés (stats)
   * ------------------------------------------------------------------ */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const dec = el.dataset.count.indexOf('.') > -1;
    const dur = 1500, t0 = Date.now();
    const tick = () => {
      const k = clamp01((Date.now() - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const val = target * e;
      el.textContent = dec ? val.toFixed(1) : Math.round(val).toLocaleString('fr-FR');
      if (k >= 1) clearInterval(id);
    };
    const id = setInterval(tick, 33);
    tick();
  }

  /* ------------------------------------------------------------------ *
   *  REVEAL + déclenchement compteurs — IntersectionObserver
   * ------------------------------------------------------------------ */
  const revealEls = [...document.querySelectorAll('.reveal')];

  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        el.classList.add('in');
        el.querySelectorAll('[data-count]').forEach((c) => {
          if (!c.dataset.done) { c.dataset.done = '1'; animateCount(c); }
        });
        revealObserver.unobserve(el);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
  );

  revealEls.forEach((el) => revealObserver.observe(el));

  /* ------------------------------------------------------------------ *
   *  FORMULAIRE — simulation d'envoi
   * ------------------------------------------------------------------ */
  const form = document.querySelector('.form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.classList.add('sent');
      const btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.textContent = 'Demande envoyée'; btn.disabled = true; }
    });
  }
})();
