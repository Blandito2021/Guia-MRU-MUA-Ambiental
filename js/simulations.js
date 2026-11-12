/* ==========================================================================
   SIMULADORES — Movimiento uniforme (MRU) y uniformemente acelerado (MUA)
   Guía de Física · Administración del Medio Ambiente · UTP

   Contenido:
     0. GGGraph   — plano cartesiano estilo GeoGebra (cuadrícula mayor y
                    milimetrada, ejes con flechas, escala 1-2-5, barra de
                    herramientas, paleta de estilo, zoom con rueda/pellizco y
                    reescalado de ejes arrastrándolos).
        MotionSim — SimBase + gráficas GeoGebra enlazadas al simulador.
     1. SenderoSim  — posición, desplazamiento, distancia, velocidad media.
     2. RioSim      — MRU: método del flotador en un río.
     3. BusSim      — MUA: bus eléctrico que arranca o frena.
     4. GraficaSim  — interpretación gráfica: v–t editable por tramos.
     5. FaunaSim    — aplicación: distancia de detención ante fauna.

   Unidades SI internas (m, s, m/s, m/s²). Cada simulador tiene UN método de
   geometría (layout) que usan render() y el arrastre. Las ecuaciones son
   exactas (soluciones analíticas del MRU/MUA), no integración numérica.
   ========================================================================== */

/* ---------------------------- utilidades ---------------------------------- */
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const f1 = (v) => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1);
const f2 = (v) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);

/* Paso «bonito» 1-2-5 para que las marcas queden separadas ≥ minPx píxeles. */
function ggNice(span, px, minPx) {
  const raw = Math.abs(span) * minPx / Math.max(px, 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / mag;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return { step: m * mag, sub: m === 2 ? 4 : 5 };
}
function ggFmt(v, step) {
  if (Math.abs(v) < step * 1e-6) return '0';
  const d = Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
  return v.toFixed(d);
}
const GG_SWATCHES = ['#1565c0', '#c62828', '#2e7d32', '#6a1b9a', '#ef6c00', '#00838f', '#37474f', '#ad1457', '#f9a825'];
const GG_DASH = { solid: [], dash: [8, 5], dot: [2, 4], dashdot: [9, 4, 2, 4] };
const GG_COL = { bg: '#ffffff', minor: '#eef1f5', major: '#d3d9e1', axis: '#2b2f36', num: '#2b2f36' };
const ggEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ==========================================================================
   0. GGGraph — plano cartesiano estilo GeoGebra
   def = { title, xLabel, yLabel, xVar, yVar, scene: () => ({ view, items }) }
   items: { id, name, type: 'fn'|'poly'|'area'|'points', f?, domain?, data?,
            color, width, dash, size, shape, alpha, legend, drag?(j, x, y) }
   ========================================================================== */
class GGGraph {
  constructor(host, def, owner) {
    this.host = host; this.def = def; this.owner = owner;
    this.mode = 'select'; this.view = null; this.auto = true;
    this.styles = {}; this.opt = { major: true, minor: true, axes: true, nums: true, labels: true };
    this.ptrs = new Map(); this.drag = null; this.sel = null; this._raf = 0;
    this.W = 0; this.H = 0; this.dpr = 1; this.palItem = null; this.sc = null;
    host.innerHTML = `
      <div class="gg-bar" role="toolbar" aria-label="Herramientas: ${ggEsc(def.title)}">
        <span class="gg-title">${ggEsc(def.title)}</span>
        <span class="gg-tools no-print">
          <button type="button" data-a="select" aria-pressed="true" title="Mover y seleccionar objetos (arrastra el fondo para desplazar)" aria-label="Mover y seleccionar"><i class="fas fa-arrow-pointer"></i></button>
          <button type="button" data-a="pan" aria-pressed="false" title="Desplazar la vista gráfica" aria-label="Desplazar la vista"><i class="fas fa-hand"></i></button>
          <button type="button" data-a="in" title="Acercar (+)" aria-label="Acercar"><i class="fas fa-magnifying-glass-plus"></i></button>
          <button type="button" data-a="out" title="Alejar (−)" aria-label="Alejar"><i class="fas fa-magnifying-glass-minus"></i></button>
          <button type="button" data-a="home" title="Vista estándar (Inicio)" aria-label="Vista estándar"><i class="fas fa-house"></i></button>
          <button type="button" data-a="pal" aria-pressed="false" title="Estilo gráfico: color, grosor, tipo de línea, puntos y cuadrícula" aria-label="Estilo gráfico"><i class="fas fa-palette"></i></button>
          <button type="button" data-a="png" title="Descargar la gráfica como imagen PNG" aria-label="Descargar PNG"><i class="fas fa-download"></i></button>
        </span>
      </div>
      <div class="gg-box">
        <canvas tabindex="0" aria-label="Plano cartesiano ${ggEsc(def.title)}. Rueda o pellizco: zoom; arrastra un eje para reescalarlo; flechas: desplazar; Inicio: vista estándar."></canvas>
        <div class="gg-coord" hidden></div><div class="gg-tip" hidden></div><div class="gg-pal" hidden></div>
      </div>
      <div class="gg-legend"></div>`;
    this.box = host.querySelector('.gg-box');
    this.cv = this.box.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    this.coord = host.querySelector('.gg-coord'); this.tip = host.querySelector('.gg-tip');
    this.pal = host.querySelector('.gg-pal'); this.leg = host.querySelector('.gg-legend');
    host.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => this.action(b.dataset.a, b)));
    if ('ResizeObserver' in window) new ResizeObserver(() => this.resize()).observe(this.box);
    else window.addEventListener('resize', () => this.resize());
    this.bind();
    this.resize();
  }

  /* ----- tamaño y redibujo ----- */
  resize() {
    const r = this.box.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.W = r.width; this.H = r.height;
    this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
    this.draw();
  }
  invalidate() { if (!this._raf) this._raf = requestAnimationFrame(() => this.draw()); }

  /* ----- coordenadas ----- */
  X(x) { const v = this.view; return ((x - v.xmin) / (v.xmax - v.xmin)) * this.W; }
  Y(y) { const v = this.view; return this.H - ((y - v.ymin) / (v.ymax - v.ymin)) * this.H; }
  ix(px) { const v = this.view; return v.xmin + (px / this.W) * (v.xmax - v.xmin); }
  iy(py) { const v = this.view; return v.ymin + ((this.H - py) / this.H) * (v.ymax - v.ymin); }
  gx() { return ggNice(this.view.xmax - this.view.xmin, this.W, 58); }
  gy() { return ggNice(this.view.ymax - this.view.ymin, this.H, 30); }
  fx(x) { return ggFmt(x, this.gx().step / 10); }
  fy(y) { return ggFmt(y, this.gy().step / 10); }

  st(it) {
    const o = this.styles[it.id] || {};
    return {
      color: o.color || it.color || '#1565c0', width: o.width ?? it.width ?? 2.5,
      dash: o.dash ?? it.dash ?? 'solid', size: o.size ?? it.size ?? 4.5,
      shape: o.shape ?? it.shape ?? 'circle', hidden: o.hidden ?? it.hidden ?? false,
      alpha: it.alpha ?? 0.22
    };
  }
  setSt(id, patch) { this.styles[id] = Object.assign(this.styles[id] || {}, patch); this.draw(); }

  /* ----- dibujo ----- */
  draw() {
    this._raf = 0;
    if (this.W < 10) return;
    let sc = null;
    try { sc = this.def.scene(); } catch (err) { console.error('[GGGraph] scene:', err); return; }
    if (!sc) return;
    this.sc = sc;
    if (!this.view || (this.auto && !this.drag)) this.view = Object.assign({}, sc.view);
    const c = this.ctx, W = this.W, H = this.H, v = this.view, o = this.opt;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = GG_COL.bg; c.fillRect(0, 0, W, H);
    const gx = this.gx(), gy = this.gy();
    const vlines = (step, color) => {
      c.strokeStyle = color; c.lineWidth = 1; c.beginPath();
      for (let k = Math.ceil(v.xmin / step); k * step <= v.xmax; k++) { const p = Math.round(this.X(k * step)) + 0.5; c.moveTo(p, 0); c.lineTo(p, H); }
      c.stroke();
    };
    const hlines = (step, color) => {
      c.strokeStyle = color; c.lineWidth = 1; c.beginPath();
      for (let k = Math.ceil(v.ymin / step); k * step <= v.ymax; k++) { const p = Math.round(this.Y(k * step)) + 0.5; c.moveTo(0, p); c.lineTo(W, p); }
      c.stroke();
    };
    if (o.minor) { vlines(gx.step / gx.sub, GG_COL.minor); hlines(gy.step / gy.sub, GG_COL.minor); }
    if (o.major) { vlines(gx.step, GG_COL.major); hlines(gy.step, GG_COL.major); }
    const x0 = this.X(0), y0 = this.Y(0);
    const xIn = x0 >= 0 && x0 <= W, yIn = y0 >= 0 && y0 <= H;
    const halo = (t, x, y) => { c.lineWidth = 3; c.strokeStyle = GG_COL.bg; c.lineJoin = 'round'; c.strokeText(t, x, y); c.fillText(t, x, y); };

    /* objetos: áreas, curvas, puntos */
    c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
    const items = sc.items.filter((it) => it && !this.st(it).hidden);
    items.filter((it) => it.type === 'area').forEach((it) => this.drawArea(c, it, this.st(it)));
    items.filter((it) => it.type === 'fn' || it.type === 'poly').forEach((it) => {
      const s = this.st(it);
      if (it.type === 'fn') this.drawFn(c, it, s); else this.drawPoly(c, it.data, s);
    });
    c.restore();

    /* ejes con flechas y marcas */
    if (o.axes) {
      c.strokeStyle = GG_COL.axis; c.fillStyle = GG_COL.axis; c.lineWidth = 1.4;
      if (yIn) {
        c.beginPath(); c.moveTo(0, y0); c.lineTo(W - 2, y0); c.stroke();
        c.beginPath(); c.moveTo(W - 1, y0); c.lineTo(W - 10, y0 - 4); c.lineTo(W - 10, y0 + 4); c.closePath(); c.fill();
      }
      if (xIn) {
        c.beginPath(); c.moveTo(x0, H); c.lineTo(x0, 2); c.stroke();
        c.beginPath(); c.moveTo(x0, 1); c.lineTo(x0 - 4, 10); c.lineTo(x0 + 4, 10); c.closePath(); c.fill();
      }
      c.lineWidth = 1; c.beginPath();
      const msx = gx.step / gx.sub, msy = gy.step / gy.sub;
      if (yIn) for (let k = Math.ceil(v.xmin / msx); k * msx <= v.xmax; k++) { const p = Math.round(this.X(k * msx)) + 0.5, L = k % gx.sub === 0 ? 4 : 2; c.moveTo(p, y0 - L); c.lineTo(p, y0 + L); }
      if (xIn) for (let k = Math.ceil(v.ymin / msy); k * msy <= v.ymax; k++) { const p = Math.round(this.Y(k * msy)) + 0.5, L = k % gy.sub === 0 ? 4 : 2; c.moveTo(x0 - L, p); c.lineTo(x0 + L, p); }
      c.stroke();
    }
    /* números sobre los ejes (se pegan al borde si el eje sale de la vista) */
    if (o.nums) {
      c.font = '500 10px "Fira Code", monospace'; c.fillStyle = GG_COL.num;
      c.textAlign = 'center'; c.textBaseline = 'top';
      const ty = yIn ? Math.min(y0 + 6, H - 14) : (y0 < 0 ? 4 : H - 14);
      for (let k = Math.ceil(v.xmin / gx.step); k * gx.step <= v.xmax; k++) {
        if (k === 0 && xIn) continue;
        const p = this.X(k * gx.step); if (p < 10 || p > W - 14) continue;
        halo(ggFmt(k * gx.step, gx.step), p, ty);
      }
      c.textBaseline = 'middle';
      let tx, al;
      if (xIn) { tx = x0 - 6; al = 'right'; if (tx < 30) { tx = x0 + 6; al = 'left'; } } else if (x0 < 0) { tx = 4; al = 'left'; } else { tx = W - 4; al = 'right'; }
      c.textAlign = al;
      for (let k = Math.ceil(v.ymin / gy.step); k * gy.step <= v.ymax; k++) {
        if (k === 0 && yIn) continue;
        const p = this.Y(k * gy.step); if (p < 16 || p > H - 8) continue;
        halo(ggFmt(k * gy.step, gy.step), tx, p);
      }
      if (xIn && yIn) { c.textAlign = 'right'; c.textBaseline = 'top'; halo('0', x0 - 4, y0 + 4); }
    }
    /* rótulos de los ejes en los extremos, como en GeoGebra */
    if (o.axes) {
      c.font = 'italic 600 12px Inter, sans-serif'; c.fillStyle = GG_COL.axis;
      const yx = clampN(y0, 0, H);
      c.textAlign = 'right'; c.textBaseline = 'bottom'; halo(this.def.xLabel, W - 12, clampN(yx - 6, 16, H - 18));
      const xy = clampN(x0, 0, W);
      c.textAlign = xy > W - 90 ? 'right' : 'left'; c.textBaseline = 'top'; halo(this.def.yLabel, xy > W - 90 ? xy - 10 : xy + 10, 4);
    }

    /* puntos (encima de los ejes) */
    c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
    items.filter((it) => it.type === 'points').forEach((it) => {
      const s = this.st(it);
      it.data.forEach((p) => {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
        const px = this.X(p.x), py = this.Y(p.y);
        this.drawPt(c, px, py, s);
        if (o.labels && p.label) { c.font = '600 10.5px Inter, sans-serif'; c.fillStyle = s.color; c.textAlign = 'left'; c.textBaseline = 'bottom'; halo(p.label, px + s.size + 2, py - s.size); }
      });
    });
    /* selección: halo y proyecciones punteadas a los ejes */
    if (this.sel) {
      const it = sc.items.find((i) => i && i.id === this.sel.item);
      if (it && this.sel.kind === 'pt' && it.data[this.sel.j]) {
        const p = it.data[this.sel.j], s = this.st(it), px = this.X(p.x), py = this.Y(p.y);
        c.strokeStyle = s.color; c.lineWidth = 1.5; c.setLineDash([3, 3]);
        c.beginPath(); c.arc(px, py, s.size + 5, 0, Math.PI * 2); c.stroke();
        c.globalAlpha = 0.55; c.setLineDash([4, 4]); c.lineWidth = 1; c.beginPath();
        c.moveTo(px, py); c.lineTo(px, clampN(y0, 0, H)); c.moveTo(px, py); c.lineTo(clampN(x0, 0, W), py); c.stroke();
        c.setLineDash([]); c.globalAlpha = 1;
      }
    }
    c.restore();
    this.renderLegend();
  }

  drawFn(c, it, s) {
    const v = this.view;
    let a = v.xmin, b = v.xmax;
    if (it.domain) { a = Math.max(a, it.domain[0]); b = Math.min(b, it.domain[1]); }
    if (!(b > a)) return;
    c.strokeStyle = s.color; c.lineWidth = s.width; c.setLineDash(GG_DASH[s.dash] || []);
    c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath();
    const n = Math.max(2, Math.ceil((this.X(b) - this.X(a)) / 1.5));
    let pen = false;
    for (let k = 0; k <= n; k++) {
      const x = a + ((b - a) * k) / n, y = it.f(x);
      if (!Number.isFinite(y)) { pen = false; continue; }
      const px = this.X(x), py = clampN(this.Y(y), -5 * this.H, 6 * this.H);
      if (!pen) { c.moveTo(px, py); pen = true; } else c.lineTo(px, py);
    }
    c.stroke(); c.setLineDash([]);
  }
  drawPoly(c, data, s) {
    c.strokeStyle = s.color; c.lineWidth = s.width; c.setLineDash(GG_DASH[s.dash] || []);
    c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath();
    let pen = false;
    data.forEach((p) => {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) { pen = false; return; }
      const px = this.X(p.x), py = this.Y(p.y);
      if (!pen) { c.moveTo(px, py); pen = true; } else c.lineTo(px, py);
    });
    c.stroke(); c.setLineDash([]);
  }
  drawArea(c, it, s) {
    let pts = [];
    if (it.f) {
      let [a, b] = it.domain; a = Math.max(a, this.view.xmin); b = Math.min(b, this.view.xmax);
      if (!(b > a)) return;
      const n = Math.max(2, Math.ceil((this.X(b) - this.X(a)) / 2));
      for (let k = 0; k <= n; k++) { const x = a + ((b - a) * k) / n; pts.push({ x, y: it.f(x) }); }
    } else pts = it.data;
    if (!pts || pts.length < 2) return;
    c.save(); c.globalAlpha = s.alpha; c.fillStyle = s.color; c.beginPath();
    c.moveTo(this.X(pts[0].x), this.Y(0));
    pts.forEach((p) => c.lineTo(this.X(p.x), this.Y(p.y)));
    c.lineTo(this.X(pts[pts.length - 1].x), this.Y(0)); c.closePath(); c.fill();
    c.restore();
  }
  drawPt(c, x, y, s) {
    const r = s.size;
    c.fillStyle = s.color; c.strokeStyle = GG_COL.bg; c.lineWidth = 1.3; c.beginPath();
    if (s.shape === 'square') c.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
    else if (s.shape === 'diamond') { c.moveTo(x, y - r * 1.25); c.lineTo(x + r * 1.25, y); c.lineTo(x, y + r * 1.25); c.lineTo(x - r * 1.25, y); c.closePath(); }
    else if (s.shape === 'cross') {
      c.strokeStyle = s.color; c.lineWidth = Math.max(1.6, r / 2.4);
      c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r); c.stroke(); return;
    } else c.arc(x, y, r, 0, Math.PI * 2);
    c.fill(); c.stroke();
  }

  /* ----- leyenda (clic: mostrar/ocultar) ----- */
  renderLegend() {
    const its = this.sc.items.filter((i) => i && i.name && i.legend !== false);
    const key = its.map((i) => i.id + this.st(i).color + this.st(i).hidden + this.st(i).dash + i.name).join('|');
    if (key === this._legKey) return;
    this._legKey = key;
    this.leg.innerHTML = its.map((it) => {
      const s = this.st(it);
      const mark = it.type === 'points'
        ? `<span class="lg-pt" style="background:${s.color}"></span>`
        : it.type === 'area'
          ? `<span class="lg-area" style="background:${s.color}"></span>`
          : `<span class="lg-ln" style="border-top:3px ${s.dash === 'solid' ? 'solid' : s.dash === 'dot' ? 'dotted' : 'dashed'} ${s.color}"></span>`;
      return `<button type="button" class="lg-it${s.hidden ? ' off' : ''}" data-id="${it.id}" title="Clic: mostrar u ocultar">${mark}${ggEsc(it.name)}</button>`;
    }).join('');
    this.leg.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => {
      const it = this.sc.items.find((i) => i && i.id === b.dataset.id);
      if (it) { this.setSt(it.id, { hidden: !this.st(it).hidden }); if (!this.pal.hidden) this.buildPal(it.id); }
    }));
  }

  /* ----- selección y tooltip ----- */
  hit(px, py) {
    let best = null, bd = 12;
    this.sc.items.forEach((it) => {
      if (!it || it.type !== 'points' || this.st(it).hidden) return;
      it.data.forEach((p, j) => { const d = Math.hypot(this.X(p.x) - px, this.Y(p.y) - py); if (d < bd) { bd = d; best = { item: it.id, j, kind: 'pt' }; } });
    });
    if (best) return best;
    bd = 7;
    this.sc.items.forEach((it) => {
      if (!it || it.type !== 'fn' || this.st(it).hidden) return;
      const x = this.ix(px);
      if (it.domain && (x < it.domain[0] || x > it.domain[1])) return;
      const y = it.f(x); if (!Number.isFinite(y)) return;
      const d = Math.abs(this.Y(y) - py); if (d < bd) { bd = d; best = { item: it.id, x, y, kind: 'fn' }; }
    });
    return best;
  }
  showTip(h, px, py, pinned) {
    const it = this.sc.items.find((i) => i && i.id === h.item); if (!it) return;
    const s = this.st(it), xv = this.def.xVar || 'x', yv = this.def.yVar || 'y';
    let body;
    if (h.kind === 'pt') { const p = it.data[h.j]; body = `(${xv}, ${yv}) = (${this.fx(p.x)}, ${this.fy(p.y)})${p.info ? '<br>' + p.info : ''}`; }
    else body = `${xv} = ${this.fx(h.x)} → ${yv} = ${this.fy(h.y)}`;
    this.tip.innerHTML = `<span class="sw" style="background:${s.color}"></span><b>${ggEsc(it.name || it.id)}</b><div>${body}</div>${it.drag ? '<div class="tip-pin">Arrastra el punto para modificarlo</div>' : ''}${pinned ? '<div class="tip-pin">Clic en el fondo para soltar</div>' : ''}`;
    this.tip.hidden = false;
    const tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
    this.tip.style.left = clampN(px + 12, 2, this.W - tw - 2) + 'px';
    this.tip.style.top = clampN(py - th - 10, 2, this.H - th - 2) + 'px';
  }
  axisAt(px, py) {
    const x0 = this.X(0), y0 = this.Y(0), W = this.W, H = this.H;
    const yIn = y0 >= 0 && y0 <= H, xIn = x0 >= 0 && x0 <= W;
    const nearX = yIn ? (py > y0 - 7 && py < y0 + 18) : (y0 < 0 ? py < 18 : py > H - 18);
    const nearY = xIn ? (px > x0 - 34 && px < x0 + 7) : (x0 < 0 ? px < 34 : px > W - 34);
    if (nearX && nearY) return Math.abs(py - y0) < Math.abs(px - x0) ? 'ax' : 'ay';
    return nearX ? 'ax' : nearY ? 'ay' : null;
  }
  cur(cs) { this.cv.style.cursor = cs; }

  /* ----- interacción: rueda, arrastre, pellizco, ejes, teclado ----- */
  bind() {
    const cv = this.cv;
    cv.style.touchAction = 'none';
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('wheel', (e) => {
      if (!this.sc) return; e.preventDefault();
      const [px, py] = pos(e); const dd = e.deltaY || e.deltaX;
      const f = Math.exp(Math.sign(dd) * Math.min(Math.abs(dd), 120) * 0.0018);
      this.zoomAt(this.ix(px), this.iy(py), e.altKey ? 1 : f, e.shiftKey ? 1 : f);
    }, { passive: false });
    cv.addEventListener('pointerdown', (e) => {
      if (!this.sc) return;
      try { cv.focus({ preventScroll: true }); } catch (_) { /* */ }
      const [px, py] = pos(e); this.ptrs.set(e.pointerId, [px, py]);
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* */ }
      const v0 = Object.assign({}, this.view);
      if (this.ptrs.size === 2) {
        const [a, b] = [...this.ptrs.values()];
        this.drag = { type: 'pinch', d0: Math.max(20, Math.hypot(a[0] - b[0], a[1] - b[1])), c0: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], v0 };
        return;
      }
      if (this.mode === 'select') {
        const h = this.hit(px, py);
        if (h) {
          this.sel = h; this.showTip(h, px, py, true);
          const it = this.sc.items.find((i) => i && i.id === h.item);
          if (h.kind === 'pt' && it && it.drag) { this.drag = { type: 'pt', it, j: h.j }; this.cur('grabbing'); }
          if (!this.pal.hidden) this.buildPal(h.item);
          this.draw(); return;
        }
        if (this.sel) { this.sel = null; this.tip.hidden = true; }
      }
      const ax = this.axisAt(px, py);
      if (ax) { this.drag = { type: ax, x0: px, y0: py, v0 }; this.cur(ax === 'ax' ? 'ew-resize' : 'ns-resize'); return; }
      this.drag = { type: 'pan', x0: px, y0: py, v0 }; this.cur('grabbing');
    });
    cv.addEventListener('pointermove', (e) => {
      if (!this.sc) return;
      const [px, py] = pos(e);
      if (this.ptrs.has(e.pointerId)) this.ptrs.set(e.pointerId, [px, py]);
      this.coord.hidden = false;
      this.coord.textContent = `(${this.fx(this.ix(px))}, ${this.fy(this.iy(py))})`;
      const d = this.drag;
      if (!d) {
        const h = this.mode === 'select' ? this.hit(px, py) : null;
        if (h) {
          if (!this.sel) this.showTip(h, px, py, false);
          const it = this.sc.items.find((i) => i && i.id === h.item);
          this.cur(it && it.drag && h.kind === 'pt' ? 'grab' : 'pointer');
        } else {
          if (!this.sel) this.tip.hidden = true;
          const ax = this.axisAt(px, py);
          this.cur(ax === 'ax' ? 'ew-resize' : ax === 'ay' ? 'ns-resize' : (this.mode === 'pan' ? 'grab' : 'default'));
        }
        return;
      }
      const v0 = d.v0, W = this.W, H = this.H;
      if (d.type === 'pt') {
        d.it.drag(d.j, this.ix(px), this.iy(py));
        const it = this.sc.items.find((i) => i && i.id === d.it.id);
        if (it) this.showTip({ item: it.id, j: d.j, kind: 'pt' }, px, py, false);
        return;
      }
      if (d.type === 'pan') {
        const dx = ((px - d.x0) / W) * (v0.xmax - v0.xmin), dy = ((py - d.y0) / H) * (v0.ymax - v0.ymin);
        this.setView({ xmin: v0.xmin - dx, xmax: v0.xmax - dx, ymin: v0.ymin + dy, ymax: v0.ymax + dy });
      } else if (d.type === 'ax') {
        const an = v0.xmin < 0 && v0.xmax > 0 ? 0 : (v0.xmin + v0.xmax) / 2;
        const aP = ((an - v0.xmin) / (v0.xmax - v0.xmin)) * W;
        let k;
        if (Math.abs(d.x0 - aP) > 14 && (px - aP) * (d.x0 - aP) > 0 && Math.abs(px - aP) > 4) k = (d.x0 - aP) / (px - aP);
        else k = Math.exp(-(px - d.x0) / 160);
        k = clampN(k, 0.02, 50);
        this.setView(Object.assign({}, v0, { xmin: an + (v0.xmin - an) * k, xmax: an + (v0.xmax - an) * k }));
      } else if (d.type === 'ay') {
        const an = v0.ymin < 0 && v0.ymax > 0 ? 0 : (v0.ymin + v0.ymax) / 2;
        const aP = H - ((an - v0.ymin) / (v0.ymax - v0.ymin)) * H;
        let k;
        if (Math.abs(d.y0 - aP) > 14 && (py - aP) * (d.y0 - aP) > 0 && Math.abs(py - aP) > 4) k = (d.y0 - aP) / (py - aP);
        else k = Math.exp((py - d.y0) / 160);
        k = clampN(k, 0.02, 50);
        this.setView(Object.assign({}, v0, { ymin: an + (v0.ymin - an) * k, ymax: an + (v0.ymax - an) * k }));
      } else if (d.type === 'pinch' && this.ptrs.size >= 2) {
        const [a, b] = [...this.ptrs.values()];
        const f = d.d0 / Math.max(10, Math.hypot(a[0] - b[0], a[1] - b[1]));
        const cc = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const cx = v0.xmin + (d.c0[0] / W) * (v0.xmax - v0.xmin), cy = v0.ymin + ((H - d.c0[1]) / H) * (v0.ymax - v0.ymin);
        const w = (v0.xmax - v0.xmin) * f, hh = (v0.ymax - v0.ymin) * f;
        const xmin = cx - (cc[0] / W) * w, ymin = cy - ((H - cc[1]) / H) * hh;
        this.setView({ xmin, xmax: xmin + w, ymin, ymax: ymin + hh });
      }
    });
    const up = (e) => {
      this.ptrs.delete(e.pointerId);
      if (this.ptrs.size === 0) {
        const wasPt = this.drag && this.drag.type === 'pt';
        this.drag = null; this.cur(this.mode === 'pan' ? 'grab' : 'default');
        if (wasPt) this.draw();
      } else if (this.drag && this.drag.type === 'pinch') {
        const [p] = [...this.ptrs.values()];
        this.drag = { type: 'pan', x0: p[0], y0: p[1], v0: Object.assign({}, this.view) };
      }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', () => { this.coord.hidden = true; if (!this.sel) this.tip.hidden = true; });
    cv.addEventListener('keydown', (e) => {
      if (!this.sc) return;
      const v = this.view, dx = (v.xmax - v.xmin) * 0.08, dy = (v.ymax - v.ymin) * 0.08;
      let handled = true;
      if (e.key === '+' || e.key === '=') this.zoomC(0.8);
      else if (e.key === '-') this.zoomC(1.25);
      else if (e.key === 'ArrowLeft') this.setView(Object.assign({}, v, { xmin: v.xmin - dx, xmax: v.xmax - dx }));
      else if (e.key === 'ArrowRight') this.setView(Object.assign({}, v, { xmin: v.xmin + dx, xmax: v.xmax + dx }));
      else if (e.key === 'ArrowUp') this.setView(Object.assign({}, v, { ymin: v.ymin + dy, ymax: v.ymax + dy }));
      else if (e.key === 'ArrowDown') this.setView(Object.assign({}, v, { ymin: v.ymin - dy, ymax: v.ymax - dy }));
      else if (e.key === 'Home') this.home();
      else if (e.key === 'Escape') { this.sel = null; this.tip.hidden = true; this.draw(); }
      else handled = false;
      if (handled) e.preventDefault();
    });
  }
  setView(v) { this.view = { xmin: v.xmin, xmax: v.xmax, ymin: v.ymin, ymax: v.ymax }; this.auto = false; this.draw(); }
  zoomAt(x, y, fx, fy) { const v = this.view; this.setView({ xmin: x + (v.xmin - x) * fx, xmax: x + (v.xmax - x) * fx, ymin: y + (v.ymin - y) * fy, ymax: y + (v.ymax - y) * fy }); }
  zoomC(f) { const v = this.view; this.zoomAt((v.xmin + v.xmax) / 2, (v.ymin + v.ymax) / 2, f, f); }
  home() { this.auto = true; this.view = null; this.draw(); }

  action(a, b) {
    if (!this.sc) return;
    if (a === 'select' || a === 'pan') {
      this.mode = a;
      this.host.querySelectorAll('[data-a=select],[data-a=pan]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.a === a ? 'true' : 'false'));
      this.cur(a === 'pan' ? 'grab' : 'default');
      if (a === 'pan') { this.sel = null; this.tip.hidden = true; this.draw(); }
    } else if (a === 'in') this.zoomC(0.75);
    else if (a === 'out') this.zoomC(1.33);
    else if (a === 'home') this.home();
    else if (a === 'pal') {
      this.pal.hidden = !this.pal.hidden; b.setAttribute('aria-pressed', this.pal.hidden ? 'false' : 'true');
      if (!this.pal.hidden) this.buildPal(this.sel && this.sel.item);
    } else if (a === 'png') this.png();
  }

  png() {
    try {
      const k = 2, W = this.W, H = this.H, oc = document.createElement('canvas');
      oc.width = W * k; oc.height = (H + 26) * k;
      const c = oc.getContext('2d'); c.scale(k, k);
      c.fillStyle = '#fff'; c.fillRect(0, 0, W, H + 26);
      c.drawImage(this.cv, 0, 0, W, H);
      c.font = '700 12px Inter, sans-serif'; c.fillStyle = '#1f2937'; c.textBaseline = 'middle';
      c.fillText(this.def.title, 8, H + 13);
      const a = document.createElement('a');
      a.href = oc.toDataURL('image/png');
      a.download = `grafica_${(this.def.title || 'plano').toLowerCase().replace(/[^a-z0-9]+/gi, '_')}.png`;
      document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 300);
    } catch (err) { console.error('[GGGraph] png', err); }
  }

  buildPal(focusId) {
    const items = this.sc.items.filter((i) => i && i.name);
    if (focusId) this.palItem = focusId;
    const it = items.find((i) => i.id === this.palItem) || items.find((i) => i.legend !== false) || items[0];
    if (!it) { this.pal.innerHTML = '<p>No hay objetos en esta gráfica.</p>'; return; }
    this.palItem = it.id;
    const s = this.st(it), o = this.opt;
    const seg = (p, opts, cur) => `<div class="gg-seg" data-p="${p}">${opts.map(([k, l, t]) => `<button type="button" data-v="${k}" aria-pressed="${cur === k}" title="${t}">${l}</button>`).join('')}</div>`;
    const lineCtl = it.type === 'points'
      ? `<label>Tamaño del punto: <b data-w>${s.size}</b> px<input type="range" data-p="size" min="2" max="10" step="0.5" value="${s.size}"></label>
         <div class="gg-lbl">Forma del punto</div>${seg('shape', [['circle', '●', 'Círculo'], ['square', '■', 'Cuadrado'], ['diamond', '◆', 'Rombo'], ['cross', '✕', 'Cruz']], s.shape)}`
      : it.type === 'area' ? ''
        : `<label>Grosor: <b data-w>${s.width}</b> px<input type="range" data-p="width" min="0.5" max="7" step="0.5" value="${s.width}"></label>
         <div class="gg-lbl">Tipo de línea</div>${seg('dash', [['solid', '━━', 'Continua'], ['dash', '╺╸╺╸', 'Discontinua'], ['dot', '┈┈', 'Punteada'], ['dashdot', '━·━', 'Raya y punto']], s.dash)}`;
    this.pal.innerHTML = `
      <div class="gg-pal-h"><b><i class="fas fa-palette"></i> Estilo gráfico</b><button type="button" data-x aria-label="Cerrar paleta">✕</button></div>
      <label>Objeto<select data-p="obj">${items.map((i) => `<option value="${i.id}" ${i.id === it.id ? 'selected' : ''}>${ggEsc(i.name)}</option>`).join('')}</select></label>
      <div class="gg-lbl">Color</div>
      <div class="gg-sw">${GG_SWATCHES.map((cl) => `<button type="button" data-c="${cl}" style="background:${cl}" aria-label="Color ${cl}" aria-pressed="${s.color.toLowerCase() === cl}"></button>`).join('')}<input type="color" data-p="color" value="${/^#[0-9a-f]{6}$/i.test(s.color) ? s.color : '#1565c0'}" aria-label="Otro color"></div>
      ${lineCtl}
      <label class="gg-chk"><input type="checkbox" data-p="hidden" ${s.hidden ? 'checked' : ''}> Ocultar este objeto</label>
      <div class="gg-lbl">Vista gráfica</div>
      ${[['major', 'Cuadrícula mayor'], ['minor', 'Cuadrícula menor (milimetrada)'], ['axes', 'Ejes, flechas y rótulos'], ['nums', 'Números sobre los ejes'], ['labels', 'Rótulos de los puntos']].map(([k, l]) => `<label class="gg-chk"><input type="checkbox" data-o="${k}" ${o[k] ? 'checked' : ''}> ${l}</label>`).join('')}
      <button type="button" class="gg-reset" data-reset><i class="fas fa-rotate-left"></i> Restablecer estilos</button>`;
    const P = this.pal, id = it.id;
    P.querySelector('[data-x]').addEventListener('click', () => { P.hidden = true; this.host.querySelector('[data-a=pal]').setAttribute('aria-pressed', 'false'); });
    P.querySelector('[data-p=obj]').addEventListener('change', (e) => this.buildPal(e.target.value));
    P.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { this.setSt(id, { color: b.dataset.c }); this.buildPal(id); }));
    P.querySelector('[data-p=color]').addEventListener('input', (e) => this.setSt(id, { color: e.target.value }));
    P.querySelectorAll('input[type=range]').forEach((r) => r.addEventListener('input', (e) => { this.setSt(id, { [r.dataset.p]: parseFloat(e.target.value) }); P.querySelector('[data-w]').textContent = e.target.value; }));
    P.querySelectorAll('.gg-seg button').forEach((b) => b.addEventListener('click', () => { this.setSt(id, { [b.parentElement.dataset.p]: b.dataset.v }); this.buildPal(id); }));
    P.querySelector('[data-p=hidden]').addEventListener('change', (e) => this.setSt(id, { hidden: e.target.checked }));
    P.querySelectorAll('[data-o]').forEach((cb) => cb.addEventListener('change', () => { this.opt[cb.dataset.o] = cb.checked; this.draw(); }));
    P.querySelector('[data-reset]').addEventListener('click', () => { this.styles = {}; this.opt = { major: true, minor: true, axes: true, nums: true, labels: true }; this.buildPal(id); this.draw(); });
  }
}
window.GGGraph = GGGraph;

/* --------------------------------------------------------------------------
   MotionSim: SimBase + gráficas GeoGebra declaradas en el HTML con
   <div class="gg-graph" data-gg="xt"></div> dentro del .sim-box-wrapper.
   -------------------------------------------------------------------------- */
class MotionSim extends SimBase {
  graphsDef() { return {}; }
  _initGraphs() {
    if (this.gg) return;
    this.gg = {};
    const defs = this.graphsDef();
    this.wrapper.querySelectorAll('.gg-graph[data-gg]').forEach((host) => {
      const d = defs[host.dataset.gg];
      if (d) this.gg[host.dataset.gg] = new GGGraph(host, d, this);
    });
  }
  draw() {
    super.draw();
    if (!this._ready) return;
    this._initGraphs();
    Object.values(this.gg).forEach((g) => g.invalidate());
  }
  refreshPalette() {
    super.refreshPalette();
    if (this.gg) Object.values(this.gg).forEach((g) => g.resize());
  }
  /* Recorrido terminado + Iniciar → vuelve a empezar */
  play() { if (this.finished && this.finished()) { this.t = 0; } super.play(); }
}

/* Ítems típicos de una gráfica temporal: predicción (gris), traza y punto actual. */
function traceItems(id, name, f, tEnd, t, color) {
  return [
    { id: id + '_pred', name: name + ' (modelo completo)', type: 'fn', f, domain: [0, tEnd], color: '#90a4ae', width: 1.5, dash: 'dash', legend: false },
    { id, name, type: 'fn', f, domain: [0, Math.max(1e-6, Math.min(t, tEnd))], color, width: 2.6 },
    { id: id + '_now', name: 'instante actual', type: 'points', data: [{ x: t, y: f(t) }], color: '#c62828', size: 4.5, legend: false }
  ];
}

/* ==========================================================================
   1. SenderoSim — sendero ecológico recto: ida A→B, pausa de observación de
      aves en B y regreso parcial a C. Distancia vs desplazamiento.
   ========================================================================== */
class SenderoSim extends MotionSim {
  setup() { this.params = { xA: 50, xB: 350, xC: 200, vc: 1.0, tObs: 60 }; this.L = 400; this.t = 0; }
  reset() { this.pause(); this.t = 0; this.draw(); }
  onParamChange() { if (this.running) this.pause(); this.t = 0; this.draw(); }
  times() {
    const { xA, xB, xC, vc, tObs } = this.params;
    const t1 = Math.abs(xB - xA) / vc, t2 = t1 + tObs, t3 = t2 + Math.abs(xC - xB) / vc;
    return { t1, t2, t3 };
  }
  finished() { return this.t >= this.times().t3 - 1e-9; }
  pos(t) {
    const { xA, xB, xC, vc } = this.params, { t1, t2, t3 } = this.times();
    if (t <= t1) return xA + Math.sign(xB - xA) * vc * t;
    if (t <= t2) return xB;
    if (t <= t3) return xB + Math.sign(xC - xB) * vc * (t - t2);
    return xC;
  }
  dist(t) {
    const { xA, xB, vc } = this.params, { t1, t2, t3 } = this.times();
    if (t <= t1) return vc * t;
    if (t <= t2) return Math.abs(xB - xA);
    return Math.abs(xB - xA) + vc * (Math.min(t, t3) - t2);
  }
  update(dt) {
    const T = this.times().t3;
    this.t = Math.min(T, this.t + dt * Math.max(1, T / 9));   // el recorrido completo dura ≈ 9 s en pantalla
    return this.t < T;
  }
  layout() {
    const left = 30, right = this.width - 30, scale = (right - left) / this.L;
    return { left, right, scale, yT: Math.round(this.height * 0.66), X: (x) => left + x * scale, inv: (px) => (px - left) / scale };
  }
  flagHit(p) {
    const L = this.layout();
    let best = null, bd = 18;
    ['xA', 'xB', 'xC'].forEach((k) => {
      const fx = L.X(this.params[k]);
      if (p.y > L.yT - 50 && p.y < L.yT + 6) { const d = Math.abs(p.x - fx - 6); if (d < bd) { bd = d; best = k; } }
    });
    return best;
  }
  hitTest(p) { return !this.running && !!this.flagHit(p); }
  onPointerDown(p) { if (this.running) return false; this._dragFlag = this.flagHit(p); return !!this._dragFlag; }
  onPointerMove(p) {
    if (!this._dragFlag) return;
    const L = this.layout(), x = clampN(Math.round(L.inv(p.x) / 10) * 10, 0, this.L);
    SimKit.reflectParam(this, this._dragFlag, x); this.t = 0;
  }
  onPointerUp() { this._dragFlag = null; }

  render(ctx, w, h) {
    const P = this.palette, D = this.D, L = this.layout(), { xA, xB, xC } = this.params, { t1, t2 } = this.times();
    // vegetación de fondo
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = P.good;
    for (let i = 0; i < 26; i++) { const tx = 12 + i * (w / 26), th = 16 + ((i * 37) % 17); ctx.beginPath(); ctx.moveTo(tx, L.yT - 6); ctx.lineTo(tx + 9, L.yT - 6 - th); ctx.lineTo(tx + 18, L.yT - 6); ctx.fill(); }
    ctx.restore();
    // sendero y regla
    D.roundRect(ctx, L.left - 10, L.yT - 5, L.right - L.left + 20, 10, 5, P.ground, null);
    D.dashedLine(ctx, L.left, L.yT, L.right, L.yT, P.muted, 1, [6, 6]);
    for (let x = 0; x <= this.L; x += 50) {
      const px = L.X(x);
      ctx.strokeStyle = P.axis; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, L.yT + 6); ctx.lineTo(px, L.yT + 12); ctx.stroke();
      D.label(ctx, `${x}`, px, L.yT + 24, { color: P.muted, size: 10, align: 'center', font: '"Fira Code", monospace' });
    }
    D.label(ctx, 'x (m)', L.right + 4, L.yT + 24, { color: P.muted, size: 10, align: 'right' });
    // trayectoria recorrida (ida y regreso a distinta altura)
    const xNow = this.pos(this.t), yIda = L.yT - 66, yVuelta = L.yT - 54;
    if (this.t > 0) D.arrow(ctx, L.X(xA), yIda, L.X(this.t <= t1 ? xNow : xB), yIda, P.primary, 2.5, 8);
    if (this.t > t2) D.arrow(ctx, L.X(xB), yVuelta, L.X(xNow), yVuelta, P.secondary, 2.5, 8);
    // banderas A, B, C (arrastrables)
    const flag = (x, txt, col) => {
      const px = L.X(x);
      ctx.strokeStyle = P.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, L.yT); ctx.lineTo(px, L.yT - 42); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(px, L.yT - 42); ctx.lineTo(px + 18, L.yT - 36); ctx.lineTo(px, L.yT - 30); ctx.fill();
      D.label(ctx, txt, px + 4, L.yT - 33, { color: '#0b1220', size: 10, weight: '800' });
    };
    flag(xA, 'A', P.good); flag(xB, 'B', P.warn); flag(xC, 'C', P.bad);
    // desplazamiento Δx (desde A hasta la posición actual)
    if (Math.abs(xNow - xA) > 0.5) {
      D.arrow(ctx, L.X(xA), L.yT + 38, L.X(xNow), L.yT + 38, P.accent, 3, 9);
      D.label(ctx, `Δx = ${f1(xNow - xA)} m`, (L.X(xA) + L.X(xNow)) / 2, L.yT + 54, { color: P.accent, size: 11, weight: '700', align: 'center' });
    }
    // caminante
    const wx = L.X(xNow), wy = L.yT - 8;
    ctx.strokeStyle = P.text; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(wx, wy - 14); ctx.lineTo(wx, wy - 2); ctx.moveTo(wx, wy - 2); ctx.lineTo(wx - 5, wy + 6); ctx.moveTo(wx, wy - 2); ctx.lineTo(wx + 5, wy + 6);
    ctx.moveTo(wx - 6, wy - 9); ctx.lineTo(wx + 6, wy - 9); ctx.stroke();
    ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(wx, wy - 19, 5, 0, Math.PI * 2); ctx.fill();
    if (this.t > t1 && this.t <= t2) D.label(ctx, 'observando aves (v = 0)', wx, wy - 30, { color: P.warn, size: 11, weight: '700', align: 'center' });
    if (!this.running && this.t === 0) D.label(ctx, 'Arrastra las banderas A, B y C', w - 12, h - 8, { color: P.muted, size: 11, align: 'right' });
  }
  telemetry() {
    const x = this.pos(this.t), d = this.dist(this.t), dx = x - this.params.xA;
    const vm = this.t > 0 ? f2(dx / this.t) : '—', rm = this.t > 0 ? f2(d / this.t) : '—';
    return `t = <b>${f1(this.t)} s</b> · x = <b>${f1(x)} m</b><br>
      distancia d = <b>${f1(d)} m</b> · Δx = x − x<sub>A</sub> = <b>${f1(dx)} m</b><br>
      v̄ = Δx/Δt = <b>${vm} m/s</b><br>rapidez media = d/Δt = <b>${rm} m/s</b>`;
  }
  graphsDef() {
    return {
      xt: {
        title: 'Posición vs tiempo (x–t)', xLabel: 't (s)', yLabel: 'x (m)', xVar: 't', yVar: 'x',
        scene: () => {
          const { xA, xB, xC } = this.params, { t1, t2, t3 } = this.times(), f = (t) => this.pos(t);
          return {
            view: { xmin: -0.07 * t3, xmax: 1.08 * t3, ymin: -45, ymax: 445 },
            items: [
              ...traceItems('xt', 'x(t) del caminante', f, t3, this.t, '#1565c0'),
              { id: 'hitos', name: 'hitos A, B, C', type: 'points', color: '#2e7d32', size: 4, shape: 'square',
                data: [{ x: 0, y: xA, label: 'A' }, { x: t1, y: xB, label: 'B' }, { x: t2, y: xB }, { x: t3, y: xC, label: 'C' }] }
            ]
          };
        }
      }
    };
  }
}
SimKit.register('SenderoSim', SenderoSim);

/* ==========================================================================
   2. RioSim — MRU: flotador arrastrado por la corriente (método del flotador).
      s: coordenada física río abajo; x: coordenada del observador
      (x = s si el eje apunta río abajo; x = −s si apunta río arriba).
   ========================================================================== */
class RioSim extends MotionSim {
  setup() {
    this.params = { x0: 0, v: 0.8, flip: false };
    this.T = 40; this.Ltr = 20; this.sMin = -15; this.sMax = 85; this.t = 0;
    this.options.timeScale = 4;                     // 40 s del modelo en 10 s reales
  }
  get vx() { return this.params.flip ? -this.params.v : this.params.v; }
  get s0() { return this.params.flip ? -this.params.x0 : this.params.x0; }
  get tEnd() { return Math.min(this.T, (this.sMax - 4 - this.s0) / this.params.v); }
  finished() { return this.t >= this.tEnd - 1e-9; }
  reset() { this.pause(); this.t = 0; this.draw(); }
  onParamChange() { if (this.running) this.pause(); this.t = 0; this.draw(); }
  xAt(t) { return this.params.x0 + this.vx * t; }
  sAt(t) { return this.s0 + this.params.v * t; }
  update(dt) { this.t = Math.min(this.tEnd, this.t + dt); return this.t < this.tEnd; }
  layout() {
    const left = 18, right = this.width - 18, scale = (right - left) / (this.sMax - this.sMin);
    const top = Math.round(this.height * 0.40), bot = Math.round(this.height * 0.78);
    return { left, right, scale, top, bot, mid: (top + bot) / 2, X: (s) => left + (s - this.sMin) * scale, inv: (px) => this.sMin + (px - left) / scale };
  }
  hitTest(p) { if (this.running) return false; const L = this.layout(); return Math.hypot(p.x - L.X(this.sAt(this.t)), p.y - L.mid) < 18; }
  onPointerDown(p) { return this.hitTest(p); }
  onPointerMove(p) {
    const L = this.layout(), s = L.inv(p.x);
    const x0 = clampN(Math.round(this.params.flip ? -s : s), -10, 10);
    SimKit.reflectParam(this, 'x0', x0); this.t = 0;
  }
  stationTimes() {
    const v = this.params.v, s0 = this.s0;
    return { tA: s0 <= 0 ? (0 - s0) / v : null, tB: s0 <= this.Ltr ? (this.Ltr - s0) / v : null };
  }
  render(ctx, w, h) {
    const P = this.palette, D = this.D, L = this.layout(), sgn = this.params.flip ? -1 : 1;
    // orillas y agua
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = P.good; ctx.fillRect(0, L.top - 16, w, 16); ctx.fillRect(0, L.bot, w, 14); ctx.restore();
    ctx.fillStyle = 'rgba(14,116,144,0.55)'; ctx.fillRect(0, L.top, w, L.bot - L.top);
    // ondas que avanzan con la corriente (decorativas)
    ctx.save(); ctx.strokeStyle = 'rgba(186,230,253,0.55)'; ctx.lineWidth = 1.5;
    const off = (this.params.v * this.t * L.scale) % 46;
    for (let r = 0; r < 3; r++) {
      const yy = L.top + (r + 0.6) * (L.bot - L.top) / 3.4;
      for (let x = -46 + off + r * 15; x < w; x += 46) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + 7, yy - 4, x + 14, yy); ctx.stroke(); }
    }
    ctx.restore();
    D.label(ctx, 'sentido de la corriente →', 10, L.bot - 6, { color: '#e0f2fe', size: 10, weight: '600' });
    // estaciones A y B (tramo L = 20 m)
    [[0, 'A'], [this.Ltr, 'B']].forEach(([s, n]) => {
      const px = L.X(s);
      D.dashedLine(ctx, px, L.top - 18, px, L.bot, P.text, 1.2, [4, 4]);
      D.label(ctx, `${n} (x = ${sgn * s} m)`, px + 3, L.top - 20, { color: P.text, size: 10, weight: '700' });
    });
    // eje x del observador (orientación según la casilla)
    const ya = L.bot + 30;
    const xa = sgn > 0 ? [L.left, L.right] : [L.right, L.left];
    D.arrow(ctx, xa[0], ya, xa[1], ya, P.axis, 1.5, 8);
    for (let s = -10; s <= 80; s += 10) {
      const px = L.X(s);
      ctx.strokeStyle = P.axis; ctx.beginPath(); ctx.moveTo(px, ya - 3); ctx.lineTo(px, ya + 3); ctx.stroke();
      if (s % 20 === 0) D.label(ctx, `${sgn * s}`, px, ya + 14, { color: P.muted, size: 10, align: 'center', font: '"Fira Code", monospace' });
    }
    D.label(ctx, 'x (m)', sgn > 0 ? L.right : L.left, ya - 6, { color: P.muted, size: 10, align: sgn > 0 ? 'right' : 'left' });
    // estroboscopia: posición cada 4 s
    for (let k = 0; k * 4 <= this.t + 1e-9; k++) {
      const px = L.X(this.sAt(k * 4));
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(px, L.mid, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(px, L.bot - 6); ctx.lineTo(px, L.bot); ctx.stroke();
    }
    // flotador y vector velocidad
    const fx = L.X(this.sAt(this.t));
    ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(fx, L.mid, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff7ed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(fx, L.mid, 5, 0.3, 2.6); ctx.stroke();
    D.arrow(ctx, fx, L.mid - 16, fx + 26 * this.params.v, L.mid - 16, P.accent, 3, 8);
    D.label(ctx, `v = ${f2(this.vx)} m/s`, fx + 2, L.mid - 22, { color: P.accent, size: 11, weight: '700' });
    if (!this.running && this.t === 0) D.label(ctx, 'Arrastra el flotador para elegir x₀', 10, 18, { color: P.muted, size: 11 });
  }
  telemetry() {
    const { tA, tB } = this.stationTimes();
    const crono = tA !== null && tB !== null && this.t >= tB
      ? `A→B: Δt = <b>${f1(tB - tA)} s</b> → v = L/Δt = <b>${f2(this.Ltr / (tB - tA))} m/s</b>`
      : 'cronómetro A→B: esperando el paso por B…';
    return `x = x₀ + v·t = ${f1(this.params.x0)} + (${f2(this.vx)})(${f1(this.t)}) = <b>${f1(this.xAt(this.t))} m</b><br>
      v = <b>${f2(this.vx)} m/s</b> (constante) · a = <b>0</b><br>
      Δx = v·t = área bajo v–t = <b>${f1(this.vx * this.t)} m</b><br>${crono}`;
  }
  graphsDef() {
    const view = (lo, hi) => { const span = Math.max(hi - lo, 1); return { xmin: -3, xmax: 43, ymin: lo - 0.12 * span, ymax: hi + 0.15 * span }; };
    return {
      xt: {
        title: 'Posición vs tiempo (x–t)', xLabel: 't (s)', yLabel: 'x (m)', xVar: 't', yVar: 'x',
        scene: () => {
          const te = this.tEnd, f = (t) => this.xAt(t), sgn = this.params.flip ? -1 : 1;
          const ends = [0, f(0), f(te), sgn * this.Ltr];
          return {
            view: view(Math.min(...ends), Math.max(...ends)),
            items: [
              { id: 'estA', name: 'estación A', type: 'poly', data: [{ x: -5, y: 0 }, { x: 60, y: 0 }], color: '#78909c', width: 1, dash: 'dot', legend: false },
              { id: 'estB', name: 'estación B', type: 'poly', data: [{ x: -5, y: sgn * this.Ltr }, { x: 60, y: sgn * this.Ltr }], color: '#78909c', width: 1.2, dash: 'dot' },
              ...traceItems('xt', 'x = x₀ + v·t', f, te, this.t, '#1565c0')
            ]
          };
        }
      },
      vt: {
        title: 'Velocidad vs tiempo (v–t)', xLabel: 't (s)', yLabel: 'v (m/s)', xVar: 't', yVar: 'v',
        scene: () => {
          const te = this.tEnd, vx = this.vx, f = () => vx;
          return {
            view: { xmin: -3, xmax: 43, ymin: Math.min(-0.4, vx * 1.45), ymax: Math.max(0.4, vx * 1.45) },
            items: [
              { id: 'area', name: 'área = Δx', type: 'area', f, domain: [0, Math.min(this.t, te)], color: vx >= 0 ? '#2e7d32' : '#c62828', alpha: 0.25 },
              ...traceItems('vt', 'v constante', f, te, this.t, '#6a1b9a')
            ]
          };
        }
      }
    };
  }
}
SimKit.register('RioSim', RioSim);

/* ==========================================================================
   3. BusSim — MUA: bus eléctrico con aceleración constante a durante 10 s.
      Si a < 0 y el bus llega a v = 0, se detiene (el freno no lo hace
      retroceder): desde ese instante a = 0 y x es constante.
   ========================================================================== */
class BusSim extends MotionSim {
  setup() { this.params = { v0: 2, a: 1.2 }; this.T = 10; this.t = 0; }
  reset() { this.pause(); this.t = 0; this.draw(); }
  onParamChange() { if (this.running) this.pause(); this.t = 0; this.draw(); }
  get tStop() { const { v0, a } = this.params; return a < 0 ? v0 / -a : Infinity; }
  get stops() { return this.tStop < this.T; }
  finished() { return this.t >= this.T - 1e-9; }
  x(t) { const { v0, a } = this.params, tt = Math.min(t, this.tStop); return v0 * tt + 0.5 * a * tt * tt; }
  v(t) { const { v0, a } = this.params; return t < this.tStop ? v0 + a * t : 0; }
  acc(t) { return t < this.tStop ? this.params.a : 0; }
  update(dt) { this.t = Math.min(this.T, this.t + dt); return this.t < this.T; }
  layout() {
    const left = 58, right = this.width - 26, span = Math.max(20, this.x(this.T) * 1.12);
    const scale = (right - left) / span, yR = Math.round(this.height * 0.66);
    return { left, right, span, scale, yR, X: (x) => left + x * scale };
  }
  drawBus(ctx, px, y, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    this.D.roundRect(ctx, px - 46, y - 24, 46, 20, 5, '#059669', '#a7f3d0', 1.5);
    ctx.fillStyle = '#d1fae5'; for (let k = 0; k < 4; k++) ctx.fillRect(px - 42 + k * 10, y - 20, 7, 7);
    ctx.fillStyle = '#0f172a'; [px - 36, px - 10].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, y - 3, 4.5, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }
  render(ctx, w, h) {
    const P = this.palette, D = this.D, L = this.layout();
    // vía
    ctx.fillStyle = P.ground; ctx.fillRect(0, L.yR, w, 18);
    D.dashedLine(ctx, 0, L.yR + 9, w, L.yR + 9, P.muted, 1.5, [14, 10]);
    const st = ggNice(L.span, L.right - L.left, 60).step;
    for (let x = 0; x <= L.span; x += st) {
      const px = L.X(x);
      ctx.strokeStyle = P.axis; ctx.beginPath(); ctx.moveTo(px, L.yR + 18); ctx.lineTo(px, L.yR + 24); ctx.stroke();
      D.label(ctx, `${ggFmt(x, st)}`, px, L.yR + 36, { color: P.muted, size: 10, align: 'center', font: '"Fira Code", monospace' });
    }
    D.label(ctx, 'x (m)', L.right, L.yR + 50, { color: P.muted, size: 10, align: 'right' });
    // estroboscopia: una imagen por segundo
    for (let k = 0; k <= Math.floor(this.t + 1e-9) && k <= this.T; k++) {
      const px = L.X(this.x(k));
      this.drawBus(ctx, px, L.yR, 0.18);
      ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(px, L.yR + 13, 2.6, 0, Math.PI * 2); ctx.fill();
      if (k % 2 === 0) D.label(ctx, `${k} s`, px, L.yR - 30, { color: P.muted, size: 9, align: 'center' });
    }
    // bus actual y vectores
    const bx = L.X(this.x(this.t)), v = this.v(this.t), a = this.acc(this.t);
    this.drawBus(ctx, bx, L.yR, 1);
    if (v > 0.05) { D.arrow(ctx, bx - 23, L.yR - 48, bx - 23 + 4 * v, L.yR - 48, P.primary, 3, 8); D.label(ctx, 'v', bx - 23 + 4 * v + 4, L.yR - 44, { color: P.primary, size: 12, weight: '700' }); }
    if (Math.abs(a) > 0.01) { D.arrow(ctx, bx - 23, L.yR - 64, bx - 23 + 22 * a, L.yR - 64, P.accent, 3, 8); D.label(ctx, 'a', bx - 23 + 22 * a + (a > 0 ? 4 : -12), L.yR - 60, { color: P.accent, size: 12, weight: '700' }); }
    if (this.params.v0 === 0 && this.params.a <= 0) D.label(ctx, '⚠ Con v₀ = 0 y a ≤ 0 el bus no avanza: elige a > 0', w - 10, h - 6, { color: P.warn, size: 11, weight: '700', align: 'right' });
    else if (this.stops && this.t >= this.tStop) D.label(ctx, `■ v = 0 en t = ${f2(this.tStop)} s: el bus se detiene`, w - 10, h - 6, { color: P.warn, size: 11, weight: '700', align: 'right' });
    else if (this.params.a < 0) D.label(ctx, 'a < 0 y v > 0: sentidos opuestos → el bus frena', w - 10, h - 6, { color: P.warn, size: 11, weight: '700', align: 'right' });
  }
  telemetry() {
    const { v0 } = this.params, t = this.t, x = this.x(t), v = this.v(t), a = this.acc(t);
    return `x = v₀t + ½at² = <b>${f1(x)} m</b> · t = ${f1(t)} s<br>
      v = v₀ + at = <b>${f2(v)} m/s</b> · a = <b>${f2(a)} m/s²</b><br>
      v² = <b>${f1(v * v)}</b> ≈ v₀² + 2aΔx = <b>${f1(v0 * v0 + 2 * this.params.a * x)}</b> m²/s²`;
  }
  graphsDef() {
    const tv = { xmin: -0.7, xmax: 10.7 };
    return {
      xt: {
        title: 'Posición vs tiempo (x–t)', xLabel: 't (s)', yLabel: 'x (m)', xVar: 't', yVar: 'x',
        scene: () => {
          const X = Math.max(this.x(this.T), 1), t = this.t, xt = this.x(t), vt = this.v(t);
          return {
            view: Object.assign({ ymin: -0.1 * X, ymax: 1.15 * X }, tv),
            items: [
              ...traceItems('xt', 'x(t): parábola', (s) => this.x(s), this.T, t, '#1565c0'),
              { id: 'tan', name: 'tangente: pendiente = v', type: 'fn', f: (s) => xt + vt * (s - t), domain: [t - 2, t + 2], color: '#ef6c00', width: 2, dash: 'dash' }
            ]
          };
        }
      },
      vt: {
        title: 'Velocidad vs tiempo (v–t)', xLabel: 't (s)', yLabel: 'v (m/s)', xVar: 't', yVar: 'v',
        scene: () => {
          const vs = [this.v(0), this.v(this.T), 0], lo = Math.min(...vs), hi = Math.max(...vs, 1), sp = hi - lo;
          return {
            view: Object.assign({ ymin: lo - 0.12 * sp, ymax: hi + 0.15 * sp }, tv),
            items: [
              { id: 'area', name: 'área = Δx', type: 'area', f: (s) => this.v(s), domain: [0, this.t], color: '#2e7d32', alpha: 0.25 },
              ...traceItems('vt', 'v = v₀ + at', (s) => this.v(s), this.T, this.t, '#6a1b9a')
            ]
          };
        }
      },
      at: {
        title: 'Aceleración vs tiempo (a–t)', xLabel: 't (s)', yLabel: 'a (m/s²)', xVar: 't', yVar: 'a',
        scene: () => ({
          view: Object.assign({ ymin: -2.5, ymax: 2.5 }, tv),
          items: [
            { id: 'area', name: 'área = Δv', type: 'area', f: (s) => this.acc(s), domain: [0, this.t], color: '#ef6c00', alpha: 0.25 },
            ...traceItems('at', 'a constante', (s) => this.acc(s), this.T, this.t, '#c62828')
          ]
        })
      }
    };
  }
}
SimKit.register('BusSim', BusSim);

/* ==========================================================================
   4. GraficaSim — camión recolector: v–t por tramos rectos con vértices
      arrastrables. Se deducen a–t (pendientes) y x–t (áreas acumuladas).
   ========================================================================== */
class GraficaSim extends MotionSim {
  setup() {
    this.params = { preset: 1 };
    this.presets = {
      1: [[0, 0], [4, 8], [12, 8], [16, 0], [22, 0]],     // arranque, crucero, frenado, parada
      2: [[0, 6], [6, 6], [9, 0], [13, 0], [17, -2]],     // crucero, frenado, parada, reversa
      3: [[0, 0], [5, 3], [10, 6], [15, 9], [20, 12]]     // aceleración constante (MUA puro)
    };
    this.load(1); this.t = 0; this.options.timeScale = 1.5;
  }
  load(p) { this.nodes = (this.presets[p] || this.presets[1]).map(([t, v]) => ({ t, v })); }
  reset() { this.pause(); this.t = 0; this.draw(); }
  onParamChange(name, val) { if (name === 'preset') this.load(val); if (this.running) this.pause(); this.t = 0; this.draw(); }
  get T() { return this.nodes[this.nodes.length - 1].t; }
  finished() { return this.t >= this.T - 1e-9; }
  seg(t) { const n = this.nodes; let i = 0; while (i < n.length - 2 && t > n[i + 1].t) i++; return i; }
  aSeg(i) { const n = this.nodes; return (n[i + 1].v - n[i].v) / (n[i + 1].t - n[i].t); }
  v(t) { const i = this.seg(t), n = this.nodes; return n[i].v + this.aSeg(i) * (clampN(t, n[i].t, n[i + 1].t) - n[i].t); }
  a(t) { return this.aSeg(this.seg(t)); }
  x(t) {
    const n = this.nodes; let X = 0;
    for (let i = 0; i < n.length - 1; i++) {
      const a = this.aSeg(i), tau = clampN(t, n[i].t, n[i + 1].t) - n[i].t;
      X += n[i].v * tau + 0.5 * a * tau * tau;
      if (t <= n[i + 1].t) break;
    }
    return X;
  }
  dist(t) {                                   // ∫|v| dt, separando donde v cambia de signo
    const n = this.nodes; let d = 0;
    for (let i = 0; i < n.length - 1 && t > n[i].t; i++) {
      const a = this.aSeg(i), v0 = n[i].v, tau = Math.min(t, n[i + 1].t) - n[i].t;
      const disp = (s) => v0 * s + 0.5 * a * s * s;
      const tr = a !== 0 ? -v0 / a : -1;
      if (tr > 0 && tr < tau) d += Math.abs(disp(tr)) + Math.abs(disp(tau) - disp(tr));
      else d += Math.abs(disp(tau));
    }
    return d;
  }
  update(dt) { this.t = Math.min(this.T, this.t + dt); return this.t < this.T; }
  dragNode(j, t, v) {
    if (this.running) this.pause();
    const n = this.nodes;
    n[j].v = clampN(Math.round(v * 2) / 2, -5, 12);
    if (j > 0) {
      const lo = n[j - 1].t + 0.5, hi = j < n.length - 1 ? n[j + 1].t - 0.5 : 30;
      n[j].t = clampN(Math.round(t * 2) / 2, lo, hi);
    }
    this.t = Math.min(this.t, this.T);
    this.draw();
  }
  xRange() { let lo = 0, hi = 0; for (let k = 0; k <= 120; k++) { const x = this.x((this.T * k) / 120); lo = Math.min(lo, x); hi = Math.max(hi, x); } return [lo, hi]; }
  layout() {
    const [lo, hi] = this.xRange(), span = Math.max(20, hi - lo), xmin = lo - 0.06 * span, xmax = hi + 0.1 * span;
    const left = 30, right = this.width - 24, scale = (right - left) / (xmax - xmin), yR = Math.round(this.height * 0.68);
    return { xmin, xmax, scale, left, right, yR, X: (x) => left + (x - xmin) * scale };
  }
  drawTruck(ctx, px, y, alpha, back) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(px, 0); if (back) ctx.scale(1, 1);
    this.D.roundRect(ctx, -54, y - 28, 38, 24, 3, '#ea580c', '#fed7aa', 1.5);
    this.D.roundRect(ctx, -16, y - 22, 16, 18, 3, '#f97316', '#fed7aa', 1.5);
    ctx.fillStyle = '#e0f2fe'; ctx.fillRect(-12, y - 19, 9, 7);
    ctx.fillStyle = '#0f172a'; [-44, -10].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, y - 3, 5, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }
  render(ctx, w, h) {
    const P = this.palette, D = this.D, L = this.layout();
    ctx.fillStyle = P.ground; ctx.fillRect(0, L.yR, w, 18);
    D.dashedLine(ctx, 0, L.yR + 9, w, L.yR + 9, P.muted, 1.5, [14, 10]);
    const st = ggNice(L.xmax - L.xmin, L.right - L.left, 60).step;
    for (let x = Math.ceil(L.xmin / st) * st; x <= L.xmax; x += st) {
      const px = L.X(x);
      ctx.strokeStyle = P.axis; ctx.beginPath(); ctx.moveTo(px, L.yR + 18); ctx.lineTo(px, L.yR + 24); ctx.stroke();
      D.label(ctx, ggFmt(x, st), px, L.yR + 36, { color: P.muted, size: 10, align: 'center', font: '"Fira Code", monospace' });
    }
    D.label(ctx, 'x (m)', L.right, L.yR + 50, { color: P.muted, size: 10, align: 'right' });
    // contenedores de residuos en los tramos de reposo
    const n = this.nodes;
    for (let i = 0; i < n.length - 1; i++) {
      if (n[i].v === 0 && n[i + 1].v === 0) {
        const px = L.X(this.x(n[i].t));
        D.roundRect(ctx, px + 6, L.yR - 18, 12, 16, 2, '#16a34a', '#bbf7d0', 1);
        D.label(ctx, 'parada', px + 12, L.yR - 22, { color: P.good, size: 9, align: 'center', weight: '700' });
      }
    }
    // estroboscopia (1 s)
    for (let k = 0; k <= Math.floor(this.t + 1e-9); k++) {
      const px = L.X(this.x(k));
      ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(px, L.yR + 13, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    const px = L.X(this.x(this.t)), v = this.v(this.t);
    this.drawTruck(ctx, px, L.yR, 1);
    if (Math.abs(v) > 0.05) { D.arrow(ctx, px - 27, L.yR - 40, px - 27 + 5 * v, L.yR - 40, P.primary, 3, 8); }
    if (v < -0.05) D.label(ctx, 'reversa (v < 0)', px - 27, L.yR - 48, { color: P.bad, size: 11, weight: '700', align: 'center' });
    if (!this.running && this.t === 0) D.label(ctx, 'Arrastra los vértices P₁…P₄ en la gráfica v–t', w - 10, 18, { color: P.muted, size: 11, align: 'right' });
  }
  telemetry() {
    const i = this.seg(this.t), n = this.nodes, a = this.aSeg(i);
    const tipo = Math.abs(a) < 1e-9 ? (n[i].v === 0 ? 'reposo' : 'MRU') : 'MUA';
    return `Tramo ${i + 1} (${f1(n[i].t)}–${f1(n[i + 1].t)} s): a = Δv/Δt = <b>${f2(a)} m/s²</b> → <b>${tipo}</b><br>
      t = ${f1(this.t)} s · v = <b>${f2(this.v(this.t))} m/s</b> · x = <b>${f1(this.x(this.t))} m</b><br>
      Δx total = Σ áreas = <b>${f1(this.x(this.T))} m</b> · distancia = <b>${f1(this.dist(this.T))} m</b>`;
  }
  graphsDef() {
    const tview = () => ({ xmin: -0.06 * this.T - 0.3, xmax: this.T * 1.06 + 0.5 });
    return {
      vt: {
        title: 'v–t editable (arrastra los vértices)', xLabel: 't (s)', yLabel: 'v (m/s)', xVar: 't', yVar: 'v',
        scene: () => {
          const vs = this.nodes.map((p) => p.v), lo = Math.min(0, ...vs), hi = Math.max(1, ...vs), sp = hi - lo;
          return {
            view: Object.assign({ ymin: lo - 0.15 * sp - 0.5, ymax: hi + 0.18 * sp + 0.5 }, tview()),
            items: [
              { id: 'apos', name: 'área + (avanza)', type: 'area', f: (s) => Math.max(0, this.v(s)), domain: [0, this.t], color: '#2e7d32', alpha: 0.25 },
              { id: 'aneg', name: 'área − (retrocede)', type: 'area', f: (s) => Math.min(0, this.v(s)), domain: [0, this.t], color: '#c62828', alpha: 0.25 },
              { id: 'vt', name: 'v(t) por tramos', type: 'poly', data: this.nodes.map((p) => ({ x: p.t, y: p.v })), color: '#6a1b9a', width: 2.6 },
              { id: 'cursor', name: 'instante t', type: 'poly', data: [{ x: this.t, y: -50 }, { x: this.t, y: 50 }], color: '#c62828', width: 1, dash: 'dash', legend: false },
              { id: 'nodos', name: 'vértices P₀…P₄', type: 'points', color: '#1565c0', size: 5.5,
                data: this.nodes.map((p, k) => ({ x: p.t, y: p.v, label: 'P' + ['₀', '₁', '₂', '₃', '₄'][k] })),
                drag: (j, x, y) => this.dragNode(j, x, y) }
            ]
          };
        }
      },
      xt: {
        title: 'x–t deducida (área acumulada)', xLabel: 't (s)', yLabel: 'x (m)', xVar: 't', yVar: 'x',
        scene: () => {
          const [lo, hi] = this.xRange(), sp = Math.max(hi - lo, 1);
          return {
            view: Object.assign({ ymin: lo - 0.12 * sp, ymax: hi + 0.15 * sp }, tview()),
            items: traceItems('xt', 'x(t)', (s) => this.x(s), this.T, this.t, '#1565c0')
          };
        }
      },
      at: {
        title: 'a–t deducida (pendientes)', xLabel: 't (s)', yLabel: 'a (m/s²)', xVar: 't', yVar: 'a',
        scene: () => {
          const n = this.nodes, data = []; let lo = -1, hi = 1;
          for (let i = 0; i < n.length - 1; i++) {
            const a = this.aSeg(i); lo = Math.min(lo, a); hi = Math.max(hi, a);
            data.push({ x: n[i].t, y: a }, { x: n[i + 1].t, y: a }, { x: NaN, y: NaN });
          }
          const sp = hi - lo;
          return {
            view: Object.assign({ ymin: lo - 0.2 * sp, ymax: hi + 0.25 * sp }, tview()),
            items: [
              { id: 'at', name: 'a(t) por tramos', type: 'poly', data, color: '#c62828', width: 2.6 },
              { id: 'at_now', name: 'instante actual', type: 'points', data: [{ x: this.t, y: this.a(this.t) }], color: '#c62828', size: 4.5, legend: false }
            ]
          };
        }
      }
    };
  }
}
SimKit.register('GraficaSim', GraficaSim);

/* ==========================================================================
   5. FaunaSim — distancia de detención ante un animal en la vía.
      Fase 1 (0 ≤ t ≤ t_r): MRU a v₀ (percepción–reacción).
      Fase 2: MUA con desaceleración de magnitud a hasta v = 0.
   ========================================================================== */
class FaunaSim extends MotionSim {
  setup() { this.params = { v0k: 60, tr: 1.5, af: 7, D: 50 }; this.t = 0; this.options.timeScale = 0.6; }
  reset() { this.pause(); this.t = 0; this.draw(); }
  onParamChange() { if (this.running) this.pause(); this.t = 0; this.draw(); }
  calc() {
    const v0 = this.params.v0k / 3.6, { tr, af, D } = this.params;
    const dr = v0 * tr, df = (v0 * v0) / (2 * af), ds = dr + df, ts = tr + v0 / af;
    let hit = null;
    if (ds > D) {
      if (D <= dr) hit = { t: D / v0, v: v0 };
      else { const vi = Math.sqrt(Math.max(0, v0 * v0 - 2 * af * (D - dr))); hit = { t: tr + (v0 - vi) / af, v: vi }; }
    }
    return { v0, dr, df, ds, ts, hit, tEnd: hit ? hit.t : ts };
  }
  vel(t) { const c = this.calc(), { tr, af } = this.params; return t <= tr ? c.v0 : Math.max(0, c.v0 - af * (t - tr)); }
  pos(t) {
    const c = this.calc(), { tr, af } = this.params;
    if (t <= tr) return c.v0 * t;
    const tau = Math.min(t - tr, c.v0 / af);
    return c.dr + c.v0 * tau - 0.5 * af * tau * tau;
  }
  finished() { return this.t >= this.calc().tEnd - 1e-9; }
  update(dt) { const te = this.calc().tEnd; this.t = Math.min(te, this.t + dt); return this.t < te; }
  layout() {
    const c = this.calc(), M = Math.max(this.params.D + 4, c.ds) * 1.12, xmin = -0.06 * M;
    const left = 16, right = this.width - 16, scale = (right - left) / (M - xmin), yR = Math.round(this.height * 0.6);
    return { M, xmin, scale, left, right, yR, X: (x) => left + (x - xmin) * scale, inv: (px) => xmin + (px - left) / scale };
  }
  hitTest(p) { if (this.running) return false; const L = this.layout(), ax = L.X(this.params.D) + 14; return Math.abs(p.x - ax) < 22 && Math.abs(p.y - (L.yR - 10)) < 22; }
  onPointerDown(p) { return this.hitTest(p); }
  onPointerMove(p) { const L = this.layout(); SimKit.reflectParam(this, 'D', clampN(Math.round(L.inv(p.x - 14)), 15, 120)); this.t = 0; }
  render(ctx, w, h) {
    const P = this.palette, D = this.D, L = this.layout(), c = this.calc();
    // berma con vegetación y vía
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = P.good; ctx.fillRect(0, L.yR - 40, w, 22); ctx.restore();
    ctx.fillStyle = P.ground; ctx.fillRect(0, L.yR - 18, w, 30);
    D.dashedLine(ctx, 0, L.yR - 3, w, L.yR - 3, P.warn, 1.5, [14, 10]);
    // zonas: reacción (MRU) y frenado (MUA)
    const zy = L.yR + 22;
    ctx.save(); ctx.globalAlpha = 0.75;
    ctx.fillStyle = P.warn; ctx.fillRect(L.X(0), zy, L.X(c.dr) - L.X(0), 9);
    ctx.fillStyle = P.bad; ctx.fillRect(L.X(c.dr), zy, L.X(c.ds) - L.X(c.dr), 9);
    ctx.restore();
    D.label(ctx, `reacción ${f1(c.dr)} m`, (L.X(0) + L.X(c.dr)) / 2, zy + 23, { color: P.warn, size: 11, weight: '700', align: 'center' });
    D.label(ctx, `frenado ${f1(c.df)} m`, (L.X(c.dr) + L.X(c.ds)) / 2, zy + 23, { color: P.bad, size: 11, weight: '700', align: 'center' });
    D.dashedLine(ctx, L.X(0), L.yR - 44, L.X(0), zy + 9, P.text, 1, [3, 3]);
    D.label(ctx, 've al animal', L.X(0) + 3, L.yR - 46, { color: P.text, size: 10 });
    // animal (arrastrable)
    const ax = L.X(this.params.D) + 14, ay = L.yR - 10;
    ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.ellipse(ax, ay, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ax + 13, ay - 5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2.5; ctx.beginPath();
    [-8, -3, 4, 9].forEach((dx) => { ctx.moveTo(ax + dx, ay + 4); ctx.lineTo(ax + dx, ay + 12); }); ctx.moveTo(ax - 13, ay - 1); ctx.lineTo(ax - 20, ay - 6); ctx.stroke();
    D.label(ctx, `D = ${f1(this.params.D)} m`, ax, ay - 16, { color: P.text, size: 10, weight: '700', align: 'center' });
    // automóvil: su frente está en x(t)
    const cx = L.X(this.pos(this.t));
    D.roundRect(ctx, cx - 44, L.yR - 22, 44, 15, 5, '#2563eb', '#bfdbfe', 1.5);
    D.roundRect(ctx, cx - 34, L.yR - 32, 22, 11, 4, '#1d4ed8', '#bfdbfe', 1.5);
    ctx.fillStyle = '#0f172a'; [cx - 34, cx - 10].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, L.yR - 6, 4.5, 0, Math.PI * 2); ctx.fill(); });
    // mensajes de fase y resultado
    const { tr } = this.params;
    let msg = 'Iniciar: el conductor ve al animal en x = 0', col = P.muted;
    if (this.t > 0 && this.t < tr) { msg = 'Percepción–reacción: v constante (MRU)'; col = P.warn; }
    else if (this.t >= tr && !this.finished()) { msg = `Frenado: aceleración −${f1(this.params.af)} m/s² (MUA)`; col = P.bad; }
    if (this.finished() && this.t > 0) {
      if (c.hit) { msg = `✗ Impacto a ${f1(c.hit.v * 3.6)} km/h`; col = P.bad; }
      else { msg = `✓ Se detiene a ${f1(this.params.D - c.ds)} m del animal`; col = P.good; }
    }
    D.label(ctx, msg, w - 10, h - 8, { color: col, size: 12, weight: '700', align: 'right' });
  }
  telemetry() {
    const c = this.calc();
    return `v₀ = ${f1(this.params.v0k)} km/h = <b>${f2(c.v0)} m/s</b> · t = ${f2(this.t)} s<br>
      d<sub>r</sub> = v₀·t<sub>r</sub> = <b>${f1(c.dr)} m</b> · d<sub>f</sub> = v₀²/(2a) = <b>${f1(c.df)} m</b><br>
      d<sub>detención</sub> = d<sub>r</sub> + d<sub>f</sub> = <b>${f1(c.ds)} m</b> (D = ${f1(this.params.D)} m)`;
  }
  graphsDef() {
    return {
      vt: {
        title: 'Velocidad vs tiempo (v–t)', xLabel: 't (s)', yLabel: 'v (m/s)', xVar: 't', yVar: 'v',
        scene: () => {
          const c = this.calc(), tr = this.params.tr, f = (s) => this.vel(s);
          return {
            view: { xmin: -0.08 * c.ts, xmax: c.ts * 1.1, ymin: -0.14 * c.v0, ymax: c.v0 * 1.2 },
            items: [
              { id: 'ar', name: 'área: reacción', type: 'area', f, domain: [0, Math.min(this.t, tr)], color: '#f59e0b', alpha: 0.35 },
              { id: 'af', name: 'área: frenado', type: 'area', f, domain: [tr, Math.max(tr, this.t)], color: '#c62828', alpha: 0.25 },
              ...traceItems('vt', 'v(t)', f, c.ts, this.t, '#6a1b9a')
            ]
          };
        }
      },
      xt: {
        title: 'Posición vs tiempo (x–t)', xLabel: 't (s)', yLabel: 'x (m)', xVar: 't', yVar: 'x',
        scene: () => {
          const c = this.calc(), M = Math.max(this.params.D, c.ds);
          return {
            view: { xmin: -0.08 * c.ts, xmax: c.ts * 1.1, ymin: -0.1 * M, ymax: M * 1.18 },
            items: [
              { id: 'animal', name: 'posición del animal (x = D)', type: 'poly', data: [{ x: -1, y: this.params.D }, { x: c.ts * 2, y: this.params.D }], color: '#92400e', width: 1.8, dash: 'dash' },
              ...traceItems('xt', 'x(t)', (s) => this.pos(s), c.ts, this.t, '#1565c0')
            ]
          };
        }
      }
    };
  }
}
SimKit.register('FaunaSim', FaunaSim);
