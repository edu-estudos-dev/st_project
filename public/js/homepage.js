document.addEventListener('DOMContentLoaded', () => {
  const revealTargets = [
    '.vm-hero-left',
    '.vm-panel',
    '.vm-section-heading',
    '.vm-before',
    '.vm-after',
    '.vm-feature-card',
    '.vm-product-card',
    '.vm-module-card',
    '.vm-proof-item',
    '.vm-contact-form',
    '.site-footer .col-md-4'
  ];

  const elements = revealTargets.flatMap((selector) =>
    Array.from(document.querySelectorAll(selector))
  );

  if (!elements.length) {
    return;
  }

  elements.forEach((element, index) => {
    element.classList.add('reveal-on-scroll');
    element.style.setProperty('--reveal-delay', `${Math.min(index * 70, 420)}ms`);

    if (element.classList.contains('vm-proof-item')) {
      const proofItems = Array.from(document.querySelectorAll('.vm-proof-item'));
      const proofIndex = proofItems.indexOf(element);
      element.classList.add(proofIndex % 3 === 1 ? 'reveal-from-right' : 'reveal-from-left');
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -10% 0px'
    }
  );

  elements.forEach((element) => observer.observe(element));
});
