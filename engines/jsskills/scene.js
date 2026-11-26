// ---------- data-driven film: reel JSON (DOC) + timeline (TL), appended after the iart-ai starter's drawing library ----------
const CX = W / 2, ACCENT = ({ gold: '#f2b632', green: '#2a9d5c', red: '#d2325f' })[(DOC.style || {}).accent] || '#f2b632';
const total = TL.total;
function tw(text, size) { ctx.save(); ctx.font = FONT.replace('{s}', size); const w = ctx.measureText(text).width; ctx.restore(); return w; }
function fit(text, y, size, col, alpha = 1, maxw = 940, x = CX) { const w = tw(text, size); note(text, x, y, { size: w > maxw ? size * maxw / w : size, col, alpha }); }
function lineStack(lines, y0, size, col, a, first) {
  const k = Math.min(1, ...lines.map(l => 940 / tw(l, size)));   // one shared size so the block reads evenly
  lines.forEach((l, i) => note(l, CX, y0 + i * size * k * 1.45, { size: size * k, col: i === 0 && first ? first : col, alpha: a }));
}
const fmtV = (v, unit) => unit === '$' ? '$' + Math.round(v).toLocaleString('en-US') : unit === '%' ? (Math.round(v * 10) / 10) + '%' : String(Math.round(v * 100) / 100);
function motif(words, p, y) {
  const up = /\b(up|rise|rose|record|surge|jump|high|gain)\b/i.test(words), down = /\b(down|fall|fell|drop|plunge|crash|low|slump|cut)\b/i.test(words) && !up;
  if (down || up) {
    const s = down ? -1 : 1, a = [[CX, y - 220 * s], [CX + 190, y + 20 * s], [CX + 70, y + 20 * s], [CX + 70, y + 230 * s], [CX - 70, y + 230 * s], [CX - 70, y + 20 * s], [CX - 190, y + 20 * s]];
    const ap = resample(a, 10, true); ctx.save(); ctx.globalAlpha = clamp(p * 2); fill(ap, down ? RED : BLUE); drawOn(ap, p, { w: 7, closed: true }); ctx.restore();
  } else {
    for (let i = 0; i < 5; i++) { const q = prog(p, i * .12, i * .12 + .5); if (q > 0) { const e = circle(CX + (i % 2 ? 14 : -14), y + 120 - i * 64 + (1 - ease(q)) * -200, 150, 40); fill(e, YELLOW); drawOn(e, 1, { w: 6, closed: true }); } }
  }
}
function chart(ch, lt, y0) {
  const data = ch.data, mx = Math.max(...data.map(d => d[1])), unit = ch.unit || '', hl = ch.highlight, k = ease(prog(lt, .5, 1.8));
  if (ch.type === 'bars') {
    const n = data.length, bw = Math.min(260, 760 / n - 50), gap = 60, span = n * bw + (n - 1) * gap, x0 = CX - span / 2, base = y0 + 760;
    ink(line(x0 - 40, base, x0 + span + 40, base), { w: 6 });
    data.forEach(([lab, v], i) => { const h = Math.max(6, 640 * v / mx * k), x = x0 + i * (bw + gap), col = lab === hl ? RED : BLUE, r = rect(x, base - h, bw, h);
      fill(r, col); drawOn(r, 1, { w: 5, closed: true }); fit(fmtV(v * k, unit), base - h - 40, 54, col, 1, bw + gap, x + bw / 2); fit(String(lab), base + 56, 44, INK, 1, bw + gap, x + bw / 2); });
  } else {
    data.forEach(([lab, v], i) => { const w = Math.max(14, 560 * v / mx * k), y = y0 + 40 + i * 150, col = lab === hl ? RED : BLUE, r = rect(170, y, w, 62);
      fill(r, col); drawOn(r, 1, { w: 5, closed: true }); note(String(lab), 170, y - 28, { size: 40, col: INK, align: 'left' }); note(fmtV(v * k, unit), 170 + w + 20, y + 31, { size: 46, col, align: 'left' }); });
  }
}
function draw(frame) {
  const t = frame / FPS;
  BOIL = LOOK.boil ? Math.floor(frame / LOOK.boil) : 0; LAYOUT = [];
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1;
  ctx.drawImage(paper, 0, 0);
  ctx.save(); ctx.strokeStyle = 'rgba(29,42,71,.07)'; ctx.lineWidth = 2; for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } ctx.restore();
  note('FOLLOW THE MONEY', CX, 70, { size: 28, col: INK, alpha: .6 });
  ctx.fillStyle = ACCENT; ctx.fillRect(0, 0, W * clamp(t / total), 10);
  if (DOC.source_line) fit(DOC.source_line, 1860, 22, INK, .6, 1000);
  let i = TL.slides.findIndex(s => t >= s.start && t < s.start + s.dur); if (i < 0) i = TL.slides.length - 1;
  const s = TL.slides[i], sl = DOC.slides[i], lt = t - s.start, a = clamp(lt / .35) * clamp((s.start + s.dur - t) / .3);
  const L = sl.lines || [];
  ctx.save(); ctx.globalAlpha = 1;
  if (sl.kind === 'hook') {
    let big = sl.big || '';
    const m = sl.countup && big.match(/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/);
    if (m) { const dec = (m[2].split('.')[1] || '').length, v = parseFloat(m[2].replace(/,/g, '')) * ease(prog(lt, .3, Math.min(2.8, s.dur * .5))); big = m[1] + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[3]; }
    motif(L.join(' ') + ' ' + (DOC.title || ''), prog(lt, .2, 1.2), 520);
    fit(big, 1010, 250, INK, a, 1000); lineStack(L, 1230, 54, INK, a);
  } else if (sl.kind === 'take') {
    lineStack(L, 760, 62, INK, a, '#2a9d5c');
  } else if (sl.kind === 'end') {
    lineStack(L, 640, 58, INK, a); fit('Follow for the money trail.', 1000, 54, RED, a);
  } else {
    if (sl.chart) { lineStack(L, 300, 46, INK, a); ctx.globalAlpha = a; chart(sl.chart, lt, 520); }
    else { lineStack(L, 640, 58, INK, a); ctx.globalAlpha = a; motif(L.join(' '), prog(lt, .3, 1.3), 1250); }
  }
  ctx.restore();
  window.LAYOUT = LAYOUT;
}
window.draw = draw; window.FRAMES = FRAMES; window.FPS = FPS;
window.CUES = TL.slides.slice(1).map(s => s.start);
if (!new URLSearchParams(location.search).has('render')) {
  let start = performance.now();
  const loop = () => { draw(Math.floor((performance.now() - start) / 1000 * FPS) % FRAMES); requestAnimationFrame(loop); };
  loop();
}
</script>
</body>
</html>
