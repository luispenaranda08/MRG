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
  const canvas = ticker.querySelector('.ticker-wave');
  const ctx = canvas.getContext('2d');
  const line = getComputedStyle(ticker).getPropertyValue('--line-light').trim();
  // Sprites at maximum DPR, built once; no paths or gradients in the frame loop.
  function sprite(kind) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 20;
    const pen = tile.getContext('2d');
    pen.scale(2, 2);
    pen.beginPath();
    pen.moveTo(5, 1); pen.lineTo(9, 5);
    pen.lineTo(5, 9); pen.lineTo(1, 5); pen.closePath();
    if (kind === 'outline') {
      pen.strokeStyle = line; pen.lineWidth = .5; pen.stroke();
    } else {
      const steel = pen.createLinearGradient(1, 1, 9, 9);
      ['#5E636B', '#C9CDD2', '#8A9097', '#E9EBED', '#6B7077']
        .forEach((color, i) => steel.addColorStop(i / 4, color));
      pen.fillStyle = kind === 'shine' ? '#E9EBED' : steel;
      pen.fill();
    }
    return tile;
  }
  const tiles = ctx ? ['steel', 'shine', 'outline'].map(sprite) : [];
  let width = 0, height = 0, time = 0, previous = null, frame = 0;
  let visible = !('IntersectionObserver' in window);
  function draw() {
    if (!ctx || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const step = 9.5;
    const glint = (time % 4) / 4 * (width + height + 160) - 80;
    for (let row = 0, y = 5; y < height + 4; row++, y += step) {
      for (let x = 5 + (row % 2) * step / 2; x < width + 4; x += step) {
        const phase = x + time * 15;
        const crest = height * (.6 + .17 * Math.sin(phase * Math.PI * 2 / 400) +
          .08 * Math.sin(phase * Math.PI * 2 / 550 + 1.2));
        const filled = y >= crest;
        ctx.drawImage(tiles[filled ? 0 : 2], x - 5, y - 5, 10, 10);
        if (!filled) continue;
        const top = y - step * 2 < crest ? .2 : 0;
        const flash = motion.matches ? 0 : Math.max(0, 1 - Math.abs(x - y * .8 - glint) / 38) * .5;
        if (top || flash) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(.7, top + flash);
          ctx.drawImage(tiles[1], x - 5, y - 5, 10, 10);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    }
  }
  function tick(now) {
    if (previous !== null) time += Math.min(now - previous, 100) / 1000;
    previous = now;
    draw();
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    const running = visible && !document.hidden && !motion.matches &&
      !ticker.matches(':hover') && !ticker.contains(document.activeElement);
    ticker.classList.toggle('is-running', running);
    if (running && !frame && ctx) frame = requestAnimationFrame(tick);
    if (!running) {
      cancelAnimationFrame(frame);
      frame = 0; previous = null;
    }
    if (motion.matches) { time = 0; draw(); }
  }
  function resize() {
    width = ticker.clientWidth; height = ticker.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    track.style.setProperty('--ticker-width', `${ticker.querySelector('.ticker-scroll').clientWidth}px`);
    track.style.setProperty('--ticker-duration', `${group.getBoundingClientRect().width / 40}s`);
    draw();
  }
  resize();
  ticker.classList.add('is-ready');
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(resize);
    observer.observe(ticker); observer.observe(group);
  }
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

/* Indicadores en vivo desde la API pública de Mirage; si no carga, quedan las cifras escritas en la página. */
(() => {
  const spans = document.querySelectorAll('.ticker [data-k]');
  if (!spans.length || !window.fetch) return;
  const API = 'https://mirage.hypertarget.tech/api/v1/';
  const pct = v => (v * 100).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
  const mes = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  Promise.all(['meta', 'parametros', 'sectores'].map(n => fetch(API + n + '.json').then(r => { if (!r.ok) throw new Error(n); return r.json(); })))
    .then(([meta, par, sec]) => {
      const w = sec.sectores.map(s => s.wacc_cop_nominal && s.wacc_cop_nominal.v).filter(v => typeof v === 'number').sort((a, b) => a - b);
      const val = { wacc: w.length ? (w.length % 2 ? w[(w.length - 1) / 2] : (w[w.length / 2 - 1] + w[w.length / 2]) / 2) : null };
      Object.keys(par.parametros).forEach(k => { val[k] = par.parametros[k].v; });
      spans.forEach(s => { const v = val[s.dataset.k]; if (typeof v === 'number') s.textContent = pct(v); });
      const [y, m, d] = String(meta.corte).split('-');
      const nota = document.querySelector('.ticker [data-nota]');
      if (nota && y) nota.textContent = `[ MIRAGE V${String(meta.version).toUpperCase()} · CORTE ${Number(d)} ${mes[Number(m) - 1]} ${y} ]`;
    })
    .catch(() => {});
})();
