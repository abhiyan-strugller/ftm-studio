// Data-driven paper-cutout reel (ReelMimic paper-cutout engine, MIT). DOC = reel JSON, TL = timeline.
(() => {
  const DOC = __DOC__, TL = __TL__, CX = 540, CY = 960;
  const BGS = [PC.peach, PC.sky, PC.mint, PC.lilac, PC.blush, PC.cream, PC.aqua];
  const mc = document.createElement('canvas').getContext('2d');
  const w1 = txt => { mc.font = `900 100px ${CAP_FONT}`; return mc.measureText(txt).width / 100; };
  const labSize = (txt, base) => Math.min(base, 980 / (w1(txt) + 1.3));
  const bigSize = (txt, base) => Math.min(base, 980 / (w1(txt) + .12 * txt.length));
  const wedgeUnused = null;
  const cam = (lt, dur) => paperCam(lt, [[0, [CX, CY, 1]], [dur, [CX, CY, 1.05]]]);
  const trans = [t => trSlide(t, 0, {}), 0];
  const caps = [];
  const fmtV = (v, u) => u === '$' ? '$' + Math.round(v).toLocaleString('en-US') : u === '%' ? (Math.round(v * 10) / 10) + '%' : String(Math.round(v * 100) / 100);
  function motif(words, st, y) {
    const up = /\b(up|rise|rose|record|surge|jump|high|gain)\b/i.test(words), down = /\b(down|fall|fell|drop|plunge|crash|low|slump|cut)\b/i.test(words) && !up;
    if (up || down) { const s = down ? -1 : 1, k = backOut(seg(st, .2, 1.0));
      piece(SH.poly([[0, -220 * s], [190, 0], [70, 0], [70, 230 * s], [-70, 230 * s], [-70, 0], [-190, 0]]), { x: CX, y: y - (1 - k) * 500 * s, col: down ? PC.tomato : PC.leaf, depth: 2, seed: 81, rot: -4 });
    } else for (let i = 0; i < 5; i++) { const k = backOut(seg(st, .15 + i * .12, .7 + i * .12)); if (k > 0) piece(SH.round(300, 60, 24), { x: CX + (i % 2 ? 12 : -12), y: y + 120 - i * 62 - (1 - k) * 260, col: i % 2 ? PC.mustard : PC.yellow, depth: 1.4, seed: 60 + i }); }
  }
  function slideShot(i) {
    const sl = DOC.slides[i], tl = TL.slides[i], last = i === DOC.slides.length - 1;
    return (t, lt, dur) => {
      const st = sm(lt); cam(lt, dur);
      backdrop(BGS[i % BGS.length]);
      for (let r = 1; r < 18; r += 2) { const a = (r / 18 * 360 + st * 3) * D2R, b = ((r + .5) / 18 * 360 + st * 3) * D2R; piece(SH.poly([[0, 0], [Math.cos(a) * 2400, Math.sin(a) * 2400], [Math.cos(b) * 2400, Math.sin(b) * 2400]]), { x: CX, y: 860, col: PC.white, alpha: .14, depth: 0, seed: 3000 + r, edge: false, jit: 0 }); }
      if (sl.kind === 'hook') motif((sl.lines || []).join(' ') + ' ' + (DOC.title || ''), st, 520);
      else if (sl.kind === 'body' && !sl.chart) motif((sl.lines || []).join(' '), st, 1330);
      else if (sl.chart) {
        const ch = sl.chart, data = ch.data, mx = Math.max(...data.map(d => d[1])), k = ease(seg(st, .6, 1.8));
        if (ch.type === 'bars') { const n = data.length, bw = Math.min(240, 740 / n - 50), gap = 60, span = n * bw + (n - 1) * gap, x0 = CX - span / 2, base = 1640;
          data.forEach(([lab, v], j) => { const h = Math.max(8, 640 * v / mx * k); piece(SH.rect(bw, h), { x: x0 + bw / 2 + j * (bw + gap), y: base - h / 2, col: lab === ch.highlight ? PC.tomato : PC.cobalt, depth: 1.6, seed: 90 + j, jit: 0 }); }); piece(SH.rect(span + 100, 10), { x: CX, y: base + 8, col: PC.ink, depth: .3, seed: 99, jit: 0 }); }
        else data.forEach(([lab, v], j) => { const w = Math.max(14, 560 * v / mx * k); piece(SH.rect(w, 64), { x: 170 + w / 2, y: 700 + j * 150, col: lab === ch.highlight ? PC.tomato : PC.cobalt, depth: 1.6, seed: 90 + j, jit: 0 }); });
      }
      camEnd();
      if (i === 0) trSlide(t, seg(sm(lt), 0, .5), { dir: 'up' }); else [() => trSlide(t, seg(sm(lt), 0, .6), { dir: 'left' }), () => trTear(t, seg(sm(lt), 0, .7)), () => trFlip(t, seg(sm(lt), 0, .7))][i % 3]();
      if (last) sheetOut(seg(sm(lt), dur - .6, dur), { col: PC.cream });
    };
  }
  shots(TL.slides.map((s, i) => [s.start, slideShot(i)]));
  TL.slides.forEach((tl, i) => {
    const sl = DOC.slides[i], L = sl.lines || [], a = tl.start + .35, e = tl.start + tl.dur - .15;
    if (sl.kind === 'hook') { const b = sl.big || ''; caps.push([a, e, b, { style: 'letters', size: bigSize(b, 260), y: 1000 }]); L.forEach((l, j) => caps.push([a + .5 + j * .3, e, l, { style: 'label', size: labSize(l, 52), y: 1250 + j * 110 }])); }
    else if (sl.kind === 'take') L.forEach((l, j) => caps.push([a + j * .4, e, l, { style: 'label', size: labSize(l, 58), y: 700 + j * 150, col: j === 0 ? PC.forest : PC.ink, bg: j === 0 ? PC.mint : PC.white }]));
    else if (sl.kind === 'end') { L.forEach((l, j) => caps.push([a + j * .3, e, l, { style: 'label', size: labSize(l, 56), y: 640 + j * 140 }])); caps.push([a + .8, e, 'Follow for the money trail.', { style: 'label', size: labSize('Follow for the money trail.', 54), y: 1100, bg: PC.yellow }]); }
    else {
      L.forEach((l, j) => caps.push([a + j * .3, e, l, { style: 'label', size: labSize(l, sl.chart ? 42 : 56), y: (sl.chart ? 300 : 620) + j * (sl.chart ? 100 : 140) }]));
      const ch = sl.chart; if (ch) { const data = ch.data, mx = Math.max(...data.map(d => d[1]));
        if (ch.type === 'bars') { const n = data.length, bw = Math.min(240, 740 / n - 50), gap = 60, span = n * bw + (n - 1) * gap, x0 = CX - span / 2;
          data.forEach(([lab, v], j) => { const cx = x0 + bw / 2 + j * (bw + gap); caps.push([tl.start + 1.9, e, fmtV(v, ch.unit), { style: 'label', size: 44, x: cx, y: 1640 - 640 * v / mx - 70 }]); caps.push([tl.start + 1.2, e, String(lab), { style: 'label', size: 40, x: cx, y: 1730 }]); }); }
        else data.forEach(([lab, v], j) => caps.push([tl.start + 1.9, e, `${lab}  ${fmtV(v, ch.unit)}`, { style: 'label', size: 38, x: CX, y: 640 + j * 150 }])); }
    }
  });
  if (DOC.source_line) caps.push([0, TL.total, DOC.source_line, { style: 'label', size: labSize(DOC.source_line, 26), y: 1860 }]);
  caps.push([0, TL.total, 'FOLLOW THE MONEY', { style: 'label', size: 30, y: 80 }]);
  captionTrack(caps);
})();
