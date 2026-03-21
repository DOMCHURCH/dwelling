/**
 * MASTER ANIMATIONS - DWELLING HIGH-END EXPERIENCE
 * GSAP 3.x + ScrollTrigger + Lenis Smooth Scroll
 * High-End, Organic, Cinematic Movement
 */

(function() {
  'use strict';

  // --- 1. INITIALISATION & CORE ENGINE ---
  const initCore = () => {
    // GSAP ScrollTrigger Global Configuration
    gsap.registerPlugin(ScrollTrigger);

    // Inertial Smooth Scrolling (Lenis)
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Smooth Out
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync GSAP with Lenis
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return lenis;
  };

  // --- 2. TYPOGRAPHY REVEAL (STAGGERED) ---
  const initTypography = () => {
    const headers = document.querySelectorAll('h1, h2');
    
    headers.forEach(header => {
      // Wrapper for clip-path animation
      header.classList.add('reveal-text-mask');
      
      gsap.to(header, {
        scrollTrigger: {
          trigger: header,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        clipPath: 'inset(0 0 0% 0)',
        y: 0,
        opacity: 1,
        duration: 1.4,
        ease: 'power4.out',
        stagger: 0.1
      });
      
      // Initial state
      gsap.set(header, { y: 40, opacity: 0 });
    });
  };

  // --- 3. PARALLAXE DE PROFONDEUR (Z-AXIS) ---
  const initParallax = () => {
    // Background images zoom out effect
    const bgImages = document.querySelectorAll('.liquid-glass img, section div[style*="backgroundImage"]');
    
    bgImages.forEach(img => {
      gsap.fromTo(img, 
        { scale: 1.2, y: -20 },
        { 
          scale: 1.0, 
          y: 20,
          ease: 'none',
          scrollTrigger: {
            trigger: img,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      );
    });

    // Foreground text moving faster (multidimensional parallax)
    const floatingElements = document.querySelectorAll('.liquid-glass-strong, h3, p');
    floatingElements.forEach(el => {
      gsap.to(el, {
        y: -30,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.2
        }
      });
    });
  };

  // --- 4. MAGNETIC ELEMENTS & CURSOR ---
  const initMagnetic = () => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    // Cursor Follower
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const mouse = { x: pos.x, y: pos.y };
    const speed = 0.15;

    const xSet = gsap.quickSetter(cursor, "x", "px");
    const ySet = gsap.quickSetter(cursor, "y", "px");

    window.addEventListener("mousemove", e => {    
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    gsap.ticker.add(() => {
      const dt = 1.0 - Math.pow(1.0 - speed, gsap.ticker.deltaRatio()); 
      pos.x += (mouse.x - pos.x) * dt;
      pos.y += (mouse.y - pos.y) * dt;
      xSet(pos.x);
      ySet(pos.y);
    });

    // Magnetic logic for buttons and links
    const magnetics = document.querySelectorAll('button, a, .liquid-glass');
    magnetics.forEach(el => {
      el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        gsap.to(el, {
          x: x * 0.3,
          y: y * 0.3,
          duration: 0.4,
          ease: 'power2.out'
        });
        
        // Cursor interaction
        gsap.to(cursor, { scale: 3, opacity: 0.2, duration: 0.3 });
      });

      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
        gsap.to(cursor, { scale: 1, opacity: 1, duration: 0.3 });
      });
    });
  };

  // --- 5. IMAGE CURTAIN REVEAL ---
  const initImageReveal = () => {
    const images = document.querySelectorAll('.liquid-glass img');
    
    images.forEach(img => {
      const parent = img.parentElement;
      if (!parent) return;
      
      parent.classList.add('curtain-reveal-container');
      const curtain = document.createElement('div');
      curtain.className = 'curtain-reveal-overlay';
      parent.appendChild(curtain);

      gsap.to(curtain, {
        xPercent: 100,
        ease: 'power3.inOut',
        duration: 1.2,
        scrollTrigger: {
          trigger: parent,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      });
    });
  };

  // --- 6. ATMOSPHERIC MICRO-INTERACTIONS ---
  const initAtmosphere = () => {
    // Grain Cinematic Overlay
    const grain = document.createElement('div');
    grain.className = 'film-grain';
    document.body.appendChild(grain);
  };

  // --- BOOTSTRAP ---
  const init = () => {
    // Wait for GSAP and Lenis to be available in the window
    if (typeof gsap === 'undefined' || typeof Lenis === 'undefined') {
      console.warn('GSAP or Lenis missing. Retrying in 100ms...');
      setTimeout(init, 100);
      return;
    }

    initCore();
    initAtmosphere();
    initTypography();
    initParallax();
    initMagnetic();
    initImageReveal();
    
    console.log('✨ Dwelling High-End Experience initialized.');
  };

  // DOM Ready check
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 500); // Slight delay for React mount
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
