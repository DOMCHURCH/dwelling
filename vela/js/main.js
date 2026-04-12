/* ==========================================================
   Vela Landing Page — main.js
   Three.js particles + GSAP scroll animations + 3D tilt
   ========================================================== */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.innerWidth < 768;

/* ----------------------------------------------------------
   1. THREE.JS PARTICLE FIELD
   ---------------------------------------------------------- */
(function initParticles() {
  if (isMobile || prefersReducedMotion) return;

  const canvas = document.getElementById('particle-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 12;

  // 2000 particles in a sphere
  const count = 2000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * 4;
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * 4;
    positions[i * 3 + 2] = r * Math.cos(phi) + (Math.random() - 0.5) * 4;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.035,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  let rafId;
  function animate() {
    rafId = requestAnimationFrame(animate);
    points.rotation.y += 0.0008;
    points.rotation.x += 0.0002;
    renderer.render(scene, camera);
  }
  animate();

  // Resize
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Fade out particles when user scrolls past hero
  const hero = document.querySelector('.hero');
  if (hero) {
    const obs = new IntersectionObserver(([entry]) => {
      canvas.style.opacity = entry.isIntersecting ? '1' : '0';
      canvas.style.transition = 'opacity 0.6s';
    }, { threshold: 0.1 });
    obs.observe(hero);
  }
})();


/* ----------------------------------------------------------
   2. VIDEO FALLBACK
   ---------------------------------------------------------- */
(function initVideo() {
  const video = document.getElementById('hero-video');
  if (!video) return;

  video.addEventListener('error', () => {
    const wrap = video.closest('.hero-video-wrap');
    if (wrap) {
      wrap.style.background = '#0a0f1f';
      video.style.display = 'none';
    }
  });
})();


/* ----------------------------------------------------------
   3. GSAP ANIMATIONS
   ---------------------------------------------------------- */
(function initGSAP() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  if (prefersReducedMotion) return;

  // --- Hero entrance ---
  const heroItems = ['.hero-badge', '.hero-headline', '.hero-sub', '.hero-cta-group', '.hero-social-proof'];
  gsap.from(heroItems, {
    opacity: 0,
    y: 30,
    duration: 0.9,
    stagger: 0.12,
    ease: 'power3.out',
    delay: 0.2,
    clearProps: 'all',
  });

  // --- Feature cards: fade + slide up on scroll ---
  gsap.from('.feature-card', {
    opacity: 0,
    y: 40,
    duration: 0.7,
    stagger: 0.15,
    ease: 'power3.out',
    clearProps: 'all',
    scrollTrigger: {
      trigger: '.feature-grid',
      start: 'top 80%',
    },
  });

  // --- Logo items ---
  gsap.from('.logo-item', {
    opacity: 0,
    y: 16,
    duration: 0.5,
    stagger: 0.08,
    ease: 'power2.out',
    clearProps: 'all',
    scrollTrigger: { trigger: '.logos-strip', start: 'top 85%' },
  });

  // --- Stats ---
  gsap.from('.stat-item', {
    opacity: 0,
    y: 30,
    duration: 0.6,
    stagger: 0.1,
    ease: 'power3.out',
    clearProps: 'all',
    scrollTrigger: { trigger: '.stats-section', start: 'top 80%' },
  });

  // --- Pricing cards ---
  gsap.from('.pricing-card', {
    opacity: 0,
    y: 40,
    duration: 0.7,
    stagger: 0.15,
    ease: 'power3.out',
    clearProps: 'all',
    scrollTrigger: { trigger: '.pricing-grid', start: 'top 80%' },
  });

  // --- CTA section ---
  gsap.from('.cta-inner', {
    opacity: 0,
    scale: 0.97,
    duration: 0.8,
    ease: 'power3.out',
    clearProps: 'all',
    scrollTrigger: { trigger: '.cta-section', start: 'top 80%' },
  });

  // --- Section headers ---
  gsap.utils.toArray('.section-header').forEach(el => {
    gsap.from(el.children, {
      opacity: 0,
      y: 24,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.out',
      clearProps: 'all',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  // --- Scroll sequence: 3 pinned panels ---
  initScrollSequence();
})();


/* ----------------------------------------------------------
   4. SCROLL SEQUENCE (pinned, scrubbed, 3 panels)
   ---------------------------------------------------------- */
function initScrollSequence() {
  const section = document.querySelector('.scroll-sequence');
  const pinWrap = document.querySelector('.sequence-pin-wrap');
  const panels = gsap.utils.toArray('.sequence-panel');
  if (!section || !pinWrap || panels.length === 0) return;

  const panelCount = panels.length;
  const scrollHeight = window.innerHeight * (panelCount + 0.5);

  pinWrap.style.position = 'relative';
  pinWrap.style.height = scrollHeight + 'px';
  section.style.minHeight = scrollHeight + 'px';

  // Make panels position:absolute within the pin wrap
  panels.forEach(p => {
    p.style.position = 'absolute';
    p.style.inset = '0';
    p.style.minHeight = window.innerHeight + 'px';
  });

  // Pin the section, scrub through panels
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => '+=' + scrollHeight,
    pin: true,
    pinSpacing: false,
    onUpdate: self => {
      const progress = self.progress; // 0 → 1
      const step = 1 / panelCount;

      panels.forEach((panel, i) => {
        const panelStart = i * step;
        const panelEnd = (i + 1) * step;
        const localProgress = Math.max(0, Math.min(1, (progress - panelStart) / step));

        if (localProgress > 0 && localProgress <= 1) {
          // Fade in
          const opacity = Math.min(localProgress * 3, 1);
          const ty = (1 - Math.min(localProgress * 2, 1)) * 40;
          gsap.set(panel, { opacity, y: ty, pointerEvents: opacity > 0.5 ? 'auto' : 'none' });
        } else if (localProgress === 0) {
          gsap.set(panel, { opacity: 0, y: 40, pointerEvents: 'none' });
        }
      });
    },
  });

  // Ensure first panel is visible at start
  gsap.set(panels[0], { opacity: 1, y: 0 });
}


/* ----------------------------------------------------------
   5. CSS 3D TILT ON HOVER
   ---------------------------------------------------------- */
(function initTilt() {
  if (isMobile || prefersReducedMotion) return;

  const MAX_TILT = 15; // degrees

  document.querySelectorAll('.tilt-card').forEach(card => {
    const glare = card.querySelector('.card-glare');

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);   // -1 → 1
      const dy = (e.clientY - cy) / (rect.height / 2);  // -1 → 1

      const rotX = -dy * MAX_TILT;
      const rotY = dx * MAX_TILT;

      card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02,1.02,1.02)`;

      // Glare position (CSS vars)
      if (glare) {
        const mx = ((e.clientX - rect.left) / rect.width) * 100;
        const my = ((e.clientY - rect.top) / rect.height) * 100;
        glare.style.setProperty('--mx', mx + '%');
        glare.style.setProperty('--my', my + '%');
      }
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
      card.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
      setTimeout(() => { card.style.transition = ''; }, 500);
    });

    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.1s ease';
    });
  });
})();


/* ----------------------------------------------------------
   6. NAVBAR SCROLL STATE
   ---------------------------------------------------------- */
(function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;

  const onScroll = () => {
    if (window.scrollY > 20) {
      nav.style.background = 'rgba(10,15,31,0.9)';
    } else {
      nav.style.background = 'rgba(10,15,31,0.65)';
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
})();


/* ----------------------------------------------------------
   7. CTA FORM
   ---------------------------------------------------------- */
(function initForm() {
  const form = document.querySelector('.cta-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const btn = form.querySelector('button');
    if (!input || !btn) return;

    btn.textContent = 'You\'re on the list!';
    btn.style.background = '#10b981';
    btn.disabled = true;
    input.disabled = true;
    input.value = '';
    input.placeholder = 'Thanks — we\'ll be in touch!';
  });
})();
