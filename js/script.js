/* ============================================================
   CHÉN TRÀ NHỎ — script.js
   Le'Monet Art Café · 2025
============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  console.log("Le'Monet Script Loaded");

  /* ── Mobile hamburger menu ───────────────────────────────── */
  const hamburger  = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('navMobile');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
  }

  // Global close function
  window.closeMobileMenu = function() {
    if (mobileMenu) {
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  /* ── Navbar & Theme logic ────────────────────────────────── */
  const nav = document.getElementById('nav');
  const tpToc = document.getElementById('tpToc');
  const backToTop = document.getElementById('backToTop');
  const sections = document.querySelectorAll('section, footer');
  const tocLinks = document.querySelectorAll('.toc-bar__link');
  const isTpPage = document.body.classList.contains('tp-page');

  // Parallax layers
  const parallaxLayers = document.querySelectorAll('.parallax-layer[data-speed]');
  const teaFieldLayer  = document.querySelector('.teas__field-layer--far');
  const teaSection     = document.getElementById('tea');

  function handleScroll() {
    const scrollPos = window.scrollY;

    // Navbar scrolled state
    if (nav) {
      nav.classList.toggle('scrolled', scrollPos > 40);
    }
    if (backToTop) backToTop.classList.toggle('visible', scrollPos > 400);
    if (tpToc) tpToc.classList.toggle('scrolled', scrollPos > 500);

    // Parallax logic
    parallaxLayers.forEach(layer => {
      const speed = parseFloat(layer.dataset.speed) || 0;
      layer.style.transform = `translateY(${scrollPos * speed}px)`;
    });

    if (teaFieldLayer && teaSection) {
      const rect = teaSection.getBoundingClientRect();
      const offset = (window.innerHeight - rect.top) * 0.12;
      teaFieldLayer.style.transform = `translateY(${offset}px)`;
    }

    // Highlight active section in ToC
    if (tocLinks.length > 0) {
      let currentId = '';
      sections.forEach(section => {
        const sectionTop = section.offsetTop - 200;
        if (scrollPos >= sectionTop) {
          const id = section.getAttribute('id');
          if (id) currentId = id;
        }
      });
      
      if (currentId) {
        tocLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${currentId}`);
        });
      }
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  /* ── Reveal on scroll (Intersection Observer) ─────────────── */
  const revealEls = document.querySelectorAll('[data-reveal]');
  
  // Custom check to see if an element is currently in viewport
  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
      rect.bottom > 0
    );
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  revealEls.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 0.1}s`;
    revealObserver.observe(el);
    
    // Fallback: If already in view, reveal immediately
    if (isElementInViewport(el)) {
      el.classList.add('revealed');
    }
  });

  /* ── Smooth scroll for anchor links ─────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#' || !href) return;
      const target = document.querySelector(href);
      if (!target) return;
      
      e.preventDefault();
      const offset = window.scrollY > 400 ? 150 : 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      
      window.scrollTo({ top, behavior: 'smooth' });
      window.closeMobileMenu();
    });
  });

  /* ── Tea Carousel ────────────────────────────────────────── */
  const track = document.getElementById('carouselTrack');
  const dots  = document.querySelectorAll('.carousel__dot');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  let currentIndex = 0;

  function updateCarousel(index, animate = true) {
    if (!track || !track.children.length) return;
    const cards = track.children;
    const visible = window.innerWidth <= 640 ? 1 : (window.innerWidth <= 1024 ? 3 : 4);
    const maxIndex = Math.max(0, cards.length - visible);
    currentIndex = Math.max(0, Math.min(index, maxIndex));

    const cardWidth = cards[0].getBoundingClientRect().width + 24;
    track.style.transition = animate ? 'transform .5s cubic-bezier(.4,0,.2,1)' : 'none';
    track.style.transform  = `translateX(-${currentIndex * cardWidth}px)`;

    if (dots.length > 0) {
      dots.forEach((dot, i) => dot.classList.toggle('carousel__dot--active', i === currentIndex));
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', () => updateCarousel(currentIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => updateCarousel(currentIndex + 1));
  dots.forEach(dot => dot.addEventListener('click', () => updateCarousel(parseInt(dot.dataset.index))));
  window.addEventListener('resize', () => updateCarousel(currentIndex, false));

  /* ── Lightbox Logic ───────────────────────────────────────── */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const galleryImgs = document.querySelectorAll('.gallery__img');
  
  if (lightbox && lightboxImg && galleryImgs.length > 0) {
    galleryImgs.forEach(img => {
      img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightbox.classList.add('lightbox--active');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeLightbox = () => {
      lightbox.classList.remove('lightbox--active');
      document.body.style.overflow = '';
      setTimeout(() => { if(!lightbox.classList.contains('lightbox--active')) lightboxImg.src = ''; }, 400);
    };

    lightbox.querySelector('.lightbox__close')?.addEventListener('click', closeLightbox);
    lightbox.querySelector('.lightbox__overlay')?.addEventListener('click', closeLightbox);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('lightbox--active')) closeLightbox();
    });
  }

  /* ── Final Init ─────────────────────────────────────────── */
  updateCarousel(0, false);
  handleScroll();
});
