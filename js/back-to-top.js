(function () {
  const backToTop = document.getElementById('backToTop');
  if (!backToTop) return;

  function getHalfPageScrollThreshold() {
    const doc = document.documentElement;
    const scrollableHeight = Math.max(0, doc.scrollHeight - window.innerHeight);
    return scrollableHeight / 2;
  }

  function updateBackToTop() {
    backToTop.classList.toggle('visible', window.scrollY > getHalfPageScrollThreshold());
  }

  window.addEventListener('scroll', updateBackToTop, { passive: true });
  window.addEventListener('resize', updateBackToTop);
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  updateBackToTop();
})();
