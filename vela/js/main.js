/* ============================================================
   Vela — main.js
   Scroll-synced video scrub + progressive text spawning
   GSAP ScrollTrigger  |  single scrubbed timeline
============================================================ */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Nav background ───────────────────────────────────────── */
(function initNav() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
})();

/* ── 3D card tilt ─────────────────────────────────────────── */
(function initCardTilt() {
  if (prefersReducedMotion) return;
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
      const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
      card.style.transform = `perspective(800px) rotateX(${-dy*12}deg) rotateY(${dx*12}deg) scale3d(1.02,1.02,1.02)`;
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top ) / r.height * 100).toFixed(1) + '%');
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
})();

/* ── Main scroll logic ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Guard — GSAP must be loaded */
  if (!window.gsap || !window.ScrollTrigger) {
    console.warn('Vela: GSAP or ScrollTrigger not available');
    // Fallback: just show section-1
    const s1 = document.getElementById('section-1');
    if (s1) { s1.style.opacity = '1'; s1.style.pointerEvents = 'auto'; }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const video      = document.getElementById('hero-video');
  const viewport   = document.getElementById('scroll-viewport');
  const fill       = document.getElementById('scroll-progress-fill');
  const sections   = ['section-1','section-2','section-3','section-4'].map(id => document.getElementById(id));

  /* ── Inject nav dots ── */
  const dotsWrap = document.createElement('div');
  dotsWrap.id = 'section-dots';
  dotsWrap.setAttribute('aria-hidden', 'true');
  sections.forEach((_, i) => {
    const d = document.createElement('span');
    d.className = 's-dot';
    d.dataset.idx = i;
    dotsWrap.appendChild(d);
  });
  document.getElementById('sticky-frame').appendChild(dotsWrap);
  const dots = dotsWrap.querySelectorAll('.s-dot');

  /* ── Helpers ── */
  function setActiveSection(idx) {
    sections.forEach((s, i) => s && s.classList.toggle('gsap-active', i === idx));
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  /* ── Reduced-motion fallback: no animation, just show section-1 ── */
  if (prefersReducedMotion) {
    sections[0] && (sections[0].style.opacity = '1', sections[0].style.pointerEvents = 'auto');
    setActiveSection(0);
    return;
  }

  /* ══════════════════════════════════════════════════
     VIDEO SCRUB
     We need to know the video duration before building
     the timeline. We handle both "already loaded" and
     "needs to load" cases.
  ══════════════════════════════════════════════════ */
  function buildTimeline() {
    const dur = video.duration;

    /* ── Master timeline pinned to scroll-viewport ── */
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger:  viewport,
        start:    'top top',
        end:      'bottom bottom',
        scrub:    1,           /* smooth 1 s lag — plays in reverse on scroll up */
        onUpdate(self) {
          /* progress bar */
          if (fill) fill.style.width = (self.progress * 100).toFixed(2) + '%';
        },
      }
    });

    /* ── 1. VIDEO SCRUB — map duration to full timeline ── */
    if (dur && isFinite(dur)) {
      /*
        We set currentTime directly via a GSAP tween on a proxy object
        because <video> currentTime isn't a tweeable DOM property.
      */
      const proxy = { t: 0 };
      tl.to(proxy, {
        t:        dur,
        ease:     'none',
        duration: 1,          /* normalised — ScrollTrigger maps this to scroll distance */
        onUpdate() { video.currentTime = proxy.t; }
      }, 0);
    }

    /* ── 2. TEXT SPAWNING SEQUENCE ── */
    /*
      Timeline runs from 0 to 1 (normalised).
      Section windows:
        sec-1  0.00 – 0.25
        sec-2  0.26 – 0.50
        sec-3  0.51 – 0.75
        sec-4  0.76 – 1.00

      Each inner has a y:50→0 spawn + opacity fade.
      We tween the *section* opacity independently so the inner
      elements animate relative to their parent.
    */

    const FADE = 0.04;   /* duration (normalised) for fade in / out */
    const SPAWN = 0.05;  /* duration for y spawn */

    const windows = [
      { id: 'section-1', start: 0.00, end: 0.25 },
      { id: 'section-2', start: 0.26, end: 0.50 },
      { id: 'section-3', start: 0.51, end: 0.75 },
      { id: 'section-4', start: 0.76, end: 1.00 },
    ];

    windows.forEach(({ id, start, end }, i) => {
      const section = document.getElementById(id);
      if (!section) return;
      const inner = section.querySelector('.text-section-inner');

      /* Fade IN section opacity */
      tl.fromTo(section,
        { opacity: 0 },
        { opacity: 1, duration: FADE, ease: 'power2.out',
          onStart()    { setActiveSection(i); section.classList.add('gsap-active'); },
          onReverseComplete() { section.classList.remove('gsap-active'); }
        },
        start
      );

      /* Spawn — inner slides up */
      tl.fromTo(inner,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: SPAWN, ease: 'power3.out' },
        start
      );

      /* For sections 1–3: fade OUT near the end of their window */
      if (i < windows.length - 1) {
        const fadeOutAt = end - FADE;
        tl.to(section,
          { opacity: 0, duration: FADE, ease: 'power2.in',
            onStart()           { section.classList.remove('gsap-active'); },
            onReverseComplete() { section.classList.add('gsap-active'); setActiveSection(i); }
          },
          fadeOutAt
        );
        tl.to(inner,
          { y: -30, opacity: 0, duration: FADE, ease: 'power2.in' },
          fadeOutAt
        );
      }
    });

    /* Set first section visible at page load (progress = 0) */
    gsap.set('#section-1', { opacity: 1 });
    gsap.set('#section-1 .text-section-inner', { y: 0, opacity: 1 });
    setActiveSection(0);
    document.getElementById('section-1')?.classList.add('gsap-active');
  }

  /* ── Wait for video metadata ── */
  if (video.readyState >= 1) {
    buildTimeline();
  } else {
    video.addEventListener('loadedmetadata', buildTimeline, { once: true });
    /* Fallback: if video never loads, build without scrub after 2 s */
    setTimeout(() => {
      if (!ScrollTrigger.getAll().length) buildTimeline();
    }, 2000);
  }

  /* ── Dot clicks scroll to section midpoint ── */
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const win     = [0.00, 0.26, 0.51, 0.76];
      const vpRect  = viewport.getBoundingClientRect();
      const vpTop   = window.scrollY + vpRect.top;
      const vpH     = viewport.offsetHeight;
      const target  = vpTop + win[i] * vpH;
      window.scrollTo({ top: target, behavior: 'smooth' });
    });
  });

  /* ── Feature card entrance (below fold) ── */
  gsap.utils.toArray('.feature-card').forEach((card, i) => {
    gsap.from(card, {
      opacity: 0, y: 40, duration: .65, ease: 'power3.out',
      delay: (i % 3) * 0.15,
      scrollTrigger: { trigger: card, start: 'top 80%', toggleActions: 'play none none none' }
    });
  });
});
