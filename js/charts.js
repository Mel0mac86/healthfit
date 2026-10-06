// Grafici SVG senza librerie. Restituiscono stringhe HTML.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function lineChart(points, { height = 190, unit = '', label = 'Grafico' } = {}) {
  if (points.length === 0) return '<p class="empty">Nessun dato ancora.</p>';
  const W = 400, H = height, pl = 34, pr = 10, pt = 12, pb = 26;
  const ys = points.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (max - min < 2) { min -= 1; max += 1; }
  const pad = (max - min) * 0.1; min -= pad; max += pad;
  const x = (i) => pl + (points.length === 1 ? (W - pl - pr) / 2 : (i / (points.length - 1)) * (W - pl - pr));
  const y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${x(points.length - 1).toFixed(1)},${H - pb} L${x(0).toFixed(1)},${H - pb} Z`;
  const ticks = [min + pad, (min + max) / 2, max - pad];
  const step = Math.max(1, Math.ceil(points.length / 6));
  const xl = points.map((p, i) => (i % step === 0 || i === points.length - 1)
    ? `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(p.label)}</text>` : '').join('');
  const dots = points.length <= 40 ? points.map((p, i) => `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="3.5"><title>${esc(p.label)}: ${p.y} ${unit}</title></circle>`).join('') : '';
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
    ${ticks.map((t) => `<line class="axis" x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"/><text x="${pl - 6}" y="${y(t) + 4}" text-anchor="end">${t.toFixed(1)}</text>`).join('')}
    <path class="area" d="${area}"/><path class="line" d="${d}"/>${dots}${xl}</svg></div>`;
}

export function barChart(bars, { height = 170, goal = null, label = 'Grafico', unit = '' } = {}) {
  const W = 400, H = height, pl = 34, pr = 6, pt = 12, pb = 26;
  const max = Math.max(goal || 0, ...bars.map((b) => b.v), 1) * 1.1;
  const bw = (W - pl - pr) / bars.length;
  const y = (v) => pt + (1 - v / max) * (H - pt - pb);
  const rects = bars.map((b, i) => {
    const h = (H - pb) - y(b.v);
    const over = goal && b.overIsBad && b.v > goal;
    return `<rect class="barr${over ? ' over' : ''}" x="${(pl + i * bw + bw * 0.18).toFixed(1)}" y="${y(b.v).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="4"><title>${esc(b.label)}: ${b.v} ${unit}</title></rect>
      <text x="${(pl + i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(b.label)}</text>`;
  }).join('');
  const g = goal ? `<line class="goal" x1="${pl}" x2="${W - pr}" y1="${y(goal)}" y2="${y(goal)}"/><text x="${pl - 6}" y="${y(goal) + 4}" text-anchor="end">${Math.round(goal)}</text>` : '';
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
    <line class="axis" x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}"/>${rects}${g}</svg></div>`;
}

export function ring(value, max, { size = 170, stroke = 14, over = false } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${over ? 'var(--danger)' : 'var(--accent)'}" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}" style="transition: stroke-dashoffset .4s"/>
  </svg>`;
}
