/* ============================================================
   CHÉN TRÀ NHỎ — script.js
   Le'Monet Art Café · 2025
============================================================ */



/* ── Mobile hamburger menu ───────────────────────────────── */
const hamburger  = document.getElementById('navHamburger');
const mobileMenu = document.getElementById('navMobile');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });
}

function closeMobileMenu() {
  mobileMenu.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Parallax on scroll ──────────────────────────────────── */
const parallaxLayers = document.querySelectorAll('.parallax-layer[data-speed]');
const teaFieldLayer  = document.querySelector('.teas__field-layer--far');

function onScroll() {
  const y = window.scrollY;

  // Hero parallax layers
  parallaxLayers.forEach(layer => {
    const speed = parseFloat(layer.dataset.speed);
    layer.style.transform = `translateY(${y * speed}px)`;
  });

  // Tea field parallax
  if (teaFieldLayer) {
    const section = document.getElementById('tea');
    const rect    = section.getBoundingClientRect();
    const offset  = (window.innerHeight - rect.top) * 0.12;
    teaFieldLayer.style.transform = `translateY(${offset}px)`;
  }
}

window.addEventListener('scroll', onScroll, { passive: true });

/* ── Reveal on scroll (Intersection Observer) ─────────────── */
const revealEls = document.querySelectorAll('[data-reveal]');

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Stagger children if inside a grid/flex container
        const el = entry.target;
        el.classList.add('revealed');
        revealObserver.unobserve(el);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
);

revealEls.forEach((el, i) => {
  // Slight stagger for sibling elements
  el.style.transitionDelay = `${(i % 4) * 0.1}s`;
  revealObserver.observe(el);
});

/* ── Tea Carousel ────────────────────────────────────────── */
const track  = document.getElementById('carouselTrack');
const dots   = document.querySelectorAll('.carousel__dot');
const prevBtn = document.getElementById('carouselPrev');
const nextBtn = document.getElementById('carouselNext');

let currentIndex = 0;
const cards = track ? track.children : [];
const totalCards = cards.length;

function getVisibleCount() {
  if (window.innerWidth <= 640)  return 1;
  if (window.innerWidth <= 1024) return 3;
  return 4;
}

function updateCarousel(index, animate = true) {
  if (!track || totalCards === 0) return;
  const visible = getVisibleCount();
  const maxIndex = Math.max(0, totalCards - visible);
  currentIndex = Math.max(0, Math.min(index, maxIndex));

  const cardWidth = cards[0].getBoundingClientRect().width + 24; // 24 = gap
  track.style.transition = animate ? 'transform .5s cubic-bezier(.4,0,.2,1)' : 'none';
  track.style.transform  = `translateX(-${currentIndex * cardWidth}px)`;

  dots.forEach((dot, i) => {
    dot.classList.toggle('carousel__dot--active', i === currentIndex);
  });
}

if (prevBtn) prevBtn.addEventListener('click', () => updateCarousel(currentIndex - 1));
if (nextBtn) nextBtn.addEventListener('click', () => updateCarousel(currentIndex + 1));

dots.forEach(dot => {
  dot.addEventListener('click', () => updateCarousel(parseInt(dot.dataset.index)));
});

// Recalculate on resize
window.addEventListener('resize', () => updateCarousel(currentIndex, false));

// Touch / swipe support
let touchStartX = 0;
if (track) {
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) updateCarousel(delta > 0 ? currentIndex + 1 : currentIndex - 1);
  });
}

/* ── Back to top ─────────────────────────────────────────── */
const backToTop = document.getElementById('backToTop');
if (backToTop) {
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── Booking form ────────────────────────────────────────── */
const form    = document.getElementById('bookingForm');
const success = document.getElementById('bookingSuccess');

// Set min date to today
const dateInput = document.getElementById('guestDate');
if (dateInput) {
  const today = new Date();
  // Vietnam UTC+7
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset() + 420);
  dateInput.min = today.toISOString().split('T')[0];
}

const phoneInput = document.getElementById('guestPhone');
if (phoneInput) {
  phoneInput.addEventListener('input', (e) => {
    // Chỉ cho phép số
    let val = e.target.value.replace(/\D/g, '');
    
    // Giới hạn 10 số
    if (val.length > 10) val = val.substring(0, 10);
    
    // Ép phải bắt đầu bằng số 0 nếu có nhập (Vietnamese phone standard)
    if (val.length > 0 && val[0] !== '0') {
      val = '0' + val;
      if (val.length > 10) val = val.substring(0, 10);
    }
    
    e.target.value = val;
  });
}

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name  = document.getElementById('guestName').value.trim();
    const phone = document.getElementById('guestPhone').value.trim();
    const count = document.getElementById('guestCount').value;
    const date  = document.getElementById('guestDate').value;
    const time  = document.getElementById('guestTime').value;

    if (!name || !phone || !count || !date || !time) {
      // Shake invalid empty fields
      [
        { el: document.getElementById('guestName'),  val: name },
        { el: document.getElementById('guestPhone'), val: phone },
        { el: document.getElementById('guestCount'), val: count },
        { el: document.getElementById('guestDate'),  val: date },
        { el: document.getElementById('guestTime'),  val: time },
      ].forEach(({ el, val }) => {
        if (!val) shakeField(el);
      });
      return;
    }

    const submitBtn = document.getElementById('submitBooking');
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Đang gửi...';

    // Chuẩn bị dữ liệu gửi (Khớp chính xác với Header trên Google Sheet)
    const formData = new FormData();
    formData.append('Tên', name);
    formData.append('SĐT', phone);
    formData.append('Số người', count);
    formData.append('Ngày hẹn', date);
    formData.append('Giờ hẹn', time);
    
    const note = document.getElementById('guestNote').value.trim();
    if (note) formData.append('Ghi chú', note);

    // Bắn request sang Google Apps Script
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz8FPy4OIuMlpLSiuPjwacoNVCvPB7pC0UcHZPjKG-iGrlJvcyNG0VNGosd4rmLC0O2og/exec';

    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: formData
    })
    .then(response => {
      // Thành công
      form.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
      submitBtn.style.display = 'none';
      if (success) success.classList.add('show');
      success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    })
    .catch(error => {
      // Lỗi kết nối
      console.error('Error!', error.message);
      submitBtn.disabled = false;
      submitBtn.querySelector('span').innerHTML = 'Đặt Hẹn Ngay <svg viewBox="0 0 24 24" class="icon-svg"><use href="#svg-sparkle"></use></svg>';
      alert('Rất tiếc! Đã có lỗi xảy ra khi kết nối. Vui lòng liên hệ chúng tôi qua Hotline nhé.');
    });
  });
}

function shakeField(el) {
  if (!el) return;
  el.classList.add('shake');
  el.style.borderColor = '#E05555';
  el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
  el.addEventListener('input', () => {
    el.style.borderColor = '';
  }, { once: true });
}

/* ── Navbar & ToC scroll behaviour ────────────────────────── */
const nav = document.getElementById('nav');
const tpToc = document.getElementById('tpToc');
const backToTop = document.getElementById('backToTop');
const sections = document.querySelectorAll('section, footer');
const tocLinks = document.querySelectorAll('.toc-bar__link');

window.addEventListener('scroll', () => {
  const scrollPos = window.scrollY;
  
  if (nav) nav.classList.toggle('scrolled', scrollPos > 40);
  if (backToTop) backToTop.classList.toggle('visible', scrollPos > 400);
  if (tpToc) tpToc.classList.toggle('scrolled', scrollPos > 500);

  // Highlight active section in ToC
  if (tocLinks.length > 0) {
    let currentId = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 150;
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
}, { passive: true });

/* ── Smooth scroll for anchor links ─────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    
    e.preventDefault();
    
    // Offset for sticky header + TOC bar
    const offset = window.scrollY > 400 ? 150 : 80;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    
    window.scrollTo({ top, behavior: 'smooth' });

    // Close mobile menu if open
    if (typeof closeMobileMenu === 'function') closeMobileMenu();
  });
});

/* ── Step cards hover detail ─────────────────────────────── */
document.querySelectorAll('.step').forEach(step => {
  step.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      step.classList.toggle('step--active');
    }
  });
});

/* ── Floating leaf parallax on mousemove (desktop hero) ──── */
const heroSection = document.querySelector('.hero');
let mouseX = 0, mouseY = 0;

if (heroSection) {
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    heroSection.querySelectorAll('.leaf').forEach((leaf, i) => {
      const depth = (i % 3 + 1) * 6;
      leaf.style.transform = `translate(${mouseX * depth}px, ${mouseY * depth}px) rotate(${mouseX * 5}deg)`;
    });
  });
}

/* ── Lightbox Logic ───────────────────────────────────────── */
const lightbox    = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const galleryImgs = document.querySelectorAll('.gallery__img');
const closeBtn    = lightbox ? lightbox.querySelector('.lightbox__close') : null;
const overlay     = lightbox ? lightbox.querySelector('.lightbox__overlay') : null;

if (lightbox && lightboxImg && galleryImgs.length > 0) {
  // Open lightbox
  galleryImgs.forEach(img => {
    img.addEventListener('click', () => {
      lightboxImg.src = img.src;
      lightbox.classList.add('lightbox--active');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden'; // Lock scroll
    });
  });

  // Close lightbox function
  const closeLightbox = () => {
    lightbox.classList.remove('lightbox--active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // Unlock scroll
    // Optional: clear src after animation
    setTimeout(() => { if(!lightbox.classList.contains('lightbox--active')) lightboxImg.src = ''; }, 400);
  };

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (overlay) overlay.addEventListener('click', closeLightbox);

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('lightbox--active')) {
      closeLightbox();
    }
  });
}

/* ── Init ────────────────────────────────────────────────── */
updateCarousel(0, false);
