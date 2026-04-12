/* ===================================================
   Vela — main.js
   GSAP + ScrollTrigger scroll sequence, card 3D tilt,
   Three.js particle field (desktop only)
=================================================== */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.innerWidth < 768;

/* ── Three.js particle field ─────────────────────── */
function initParticles() {
  if (prefersReducedMotion || isMobile()) return;
  if (!window.THREE) return;

  const canvas = document.getElementById('three-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 10;

  // 2000 particles in a sphere
  const count = 2000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 5 * Math.cbrt(Math.random()); // fill volume
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.035,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  let raf;
  function animate() {
    raf = requestAnimationFrame(animate);
    points.rotation.y += 0.0008;
    points.rotation.x += 0.0002;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    if (isMobile()) {
      cancelAnimationFrame(raf);
      canvas.style.display = 'none';
      return;
    }
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ── GSAP hero entrance ──────────────────────────── */
function initHeroAnimation() {
  if (prefersReducedMotion) return;
  if (!window.gsap) return;

  gsap.from('.hero-badge', { opacity: 0, y: 20, duration: 0.7, ease: 'power3.out', delay: 0.3 });
  gsap.from('.hero-title',  { opacity: 0, y: 32, duration: 0.8, ease: 'power3.out', delay: 0.5 });
  gsap.from('.hero-sub',    { opacity: 0, y: 20, duration: 0.7, ease: 'power3.out', delay: 0.7 });
  gsap.from('.hero-actions',{ opacity: 0, y: 20, duration: 0.7, ease: 'power3.out', delay: 0.85 });
  gsap.from('.scroll-hint', { opacity: 0, duration: 1, delay: 1.4 });
}

/* ── GSAP feature cards ──────────────────────────── */
function initCardAnimations() {
  if (prefersReducedMotion) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  gsap.utils.toArray('.feature-card, .testimonial-card').forEach((card, i) => {
    gsap.from(card, {
      opacity: 0,
      y: 40,
      duration: 0.65,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
      delay: (i % 3) * 0.15,
    });
  });

  // stats counter animation
  gsap.utils.toArray('.stat-num').forEach(el => {
    const target = el.dataset.target;
    if (!target) return;
    const isPercent = target.includes('%');
    const isPlus    = target.includes('+');
    const num       = parseFloat(target);

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter() {
        gsap.to({ val: 0 }, {
          val: num,
          duration: 1.5,
          ease: 'power2.out',
          onUpdate() {
            const v = Math.round(this.targets()[0].val);
            el.textContent = v + (isPercent ? '%' : '') + (isPlus ? '+' : '');
          }
        });
      }
    });
  });
}

/* ── Scroll sequence (pin + scrub) ──────────────── */
function initScrollSequence() {
  if (!window.gsap || !window.ScrollTrigger) return;

  const panels = gsap.utils.toArray('.sequence-panel');
  const dots   = gsap.utils.toArray('.seq-dot');
  const total  = panels.length;

  if (!panels.length) return;

  // show first panel initially
  panels[0].classList.add('active');
  dots[0] && dots[0].classList.add('active');

  if (prefersReducedMotion) {
    // static fallback: show all panels stacked
    panels.forEach(p => { p.style.opacity = 1; p.style.position = 'relative'; });
    return;
  }

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#scroll-sequence',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      pin: '.sequence-sticky',
      onUpdate(self) {
        const idx = Math.min(Math.floor(self.progress * total), total - 1);
        panels.forEach((p, i) => {
          p.classList.toggle('active', i === idx);
        });
        dots.forEach((d, i) => {
          d.classList.toggle('active', i === idx);
        });
      }
    }
  });

  // Animate panels in/out via timeline markers
  panels.forEach((panel, i) => {
    if (i > 0) {
      tl.fromTo(panel,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.4 },
        i / total
      );
    }
    if (i < total - 1) {
      tl.to(panel,
        { opacity: 0, y: -50, duration: 0.4 },
        (i + 0.6) / total
      );
    }
  });
}

/* ── 3D card tilt ────────────────────────────────── */
function initCardTilt() {
  if (prefersReducedMotion) return;

  const cards = document.querySelectorAll('.feature-card, .testimonial-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect   = card.getBoundingClientRect();
      const cx     = rect.left + rect.width  / 2;
      const cy     = rect.top  + rect.height / 2;
      const dx     = (e.clientX - cx) / (rect.width  / 2); // -1 to 1
      const dy     = (e.clientY - cy) / (rect.height / 2);
      const rotX   = -dy * 15;
      const rotY   =  dx * 15;

      card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02,1.02,1.02)`;

      // specular highlight position
      const mx = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
      const my = ((e.clientY - rect.top ) / rect.height * 100).toFixed(1);
      card.style.setProperty('--mx', `${mx}%`);
      card.style.setProperty('--my', `${my}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

/* ── Nav background on scroll ───────────────────── */
function initNav() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.style.background = window.scrollY > 40
      ? 'rgba(10,15,31,0.92)'
      : 'rgba(10,15,31,0.72)';
  }, { passive: true });
}

/* ── Init ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initParticles();
  initHeroAnimation();
  initCardAnimations();
  initScrollSequence();
  initCardTilt();
});
