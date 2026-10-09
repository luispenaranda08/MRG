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

(() => {
  const ticker = document.querySelector('.ticker');
  if (!ticker) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const track = ticker.querySelector('.ticker-track');
  const group = ticker.querySelector('.ticker-values');
  const colors = getComputedStyle(ticker);
  const ink = colors.getPropertyValue('--ink').trim();
  const accent = colors.getPropertyValue('--accent-ink').trim();
  const line = colors.getPropertyValue('--line-light').trim();
  const states = Array.from(group.children, (_, i) => ({
    phase: i * 1.3, base: 2.5 + i * .1, heights: [], delta: 0
  }));
  function advance(state) {
    state.phase += .45;
    const last = state.heights.at(-1) || 3;
    const target = Math.round(state.base + Math.sin(state.phase) * 1.8 + (Math.random() - .5) * .5);
    const next = Math.max(1, Math.min(5, last + Math.sign(target - last)));
    state.delta = next - last;
    state.amount = state.delta ? `0,0${1 + Math.round(Math.random())}` : '0,00';
    state.heights.push(next);
    if (state.heights.length > 14) state.heights.shift();
  }
  states.forEach(state => { for (let i = 0; i < 14; i++) advance(state); });
  const charts = Array.from(ticker.querySelectorAll('canvas'), (canvas, i) => ({
    canvas, ctx: canvas.getContext('2d'), state: states[i % states.length],
    change: canvas.parentElement.querySelector('.ticker-change')
  }));
  function draw() {
    const dpr = window.devicePixelRatio || 1;
    charts.forEach(({ canvas, ctx, state, change }) => {
      if (ctx) {
        canvas.width = Math.round(82 * dpr);
        canvas.height = Math.round(28 * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        state.heights.forEach((height, x) => {
          for (let y = 0; y < 5; y++) {
            if (y < height) {
              ctx.fillStyle = x === 13 ? accent : ink;
              ctx.fillRect(x * 6, (4 - y) * 6, 4, 4);
            } else {
              ctx.strokeStyle = line;
              ctx.lineWidth = 1;
              ctx.strokeRect(x * 6 + .5, (4 - y) * 6 + .5, 3, 3);
            }
          }
        });
      }
      change.textContent = `${state.delta < 0 ? '▼' : '▲'} ${state.amount}`;
      change.classList.toggle('is-down', state.delta < 0);
    });
  }
  let visible = !('IntersectionObserver' in window);
  let frame = 0, elapsed = 0, previous = 0;
  function tick(now) {
    if (previous) elapsed += now - previous;
    previous = now;
    if (elapsed >= 600) {
      states.forEach(advance);
      draw();
      elapsed %= 600;
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    const running = visible && !document.hidden && !motion.matches &&
      !ticker.matches(':hover') && !ticker.contains(document.activeElement);
    ticker.classList.toggle('is-running', running);
    if (running && !frame) frame = requestAnimationFrame(tick);
    if (!running) {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    }
  }
  function resize() {
    track.style.setProperty('--ticker-duration', `${group.getBoundingClientRect().width / 40}s`);
    draw();
  }
  resize();
  ticker.classList.add('is-ready');
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(group);
  window.addEventListener('resize', resize);
  if (document.fonts) document.fonts.ready.then(resize);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }).observe(ticker);
  ['mouseenter', 'mouseleave', 'focusin'].forEach(event => ticker.addEventListener(event, sync));
  ticker.addEventListener('focusout', () => queueMicrotask(sync));
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  sync();
})();
