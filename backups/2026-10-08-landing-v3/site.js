(() => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const target = entry.target;
      target.classList.add(target.hasAttribute('data-lineage') ? 'is-drawing' : 'reveal-in');
      observer.unobserve(target);
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('[data-lineage] li').forEach((node, index) => {
    node.style.setProperty('--node-index', index);
  });
  document.querySelectorAll('[data-reveal], [data-lineage]').forEach((target) => observer.observe(target));

  motion.addEventListener('change', (event) => {
    if (!event.matches) return;
    observer.disconnect();
    document.querySelectorAll('.reveal-in, .is-drawing').forEach((target) => {
      target.classList.remove('reveal-in', 'is-drawing');
    });
  });
})();
