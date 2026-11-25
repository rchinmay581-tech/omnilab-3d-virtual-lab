import * as THREE from 'three';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createGraniteTextures(maxAniso = 8): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#1b222c';
  ctx.fillRect(0, 0, 512, 512);

  // Mineral flecks
  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 0.6 + Math.random() * 2.2;
    const v = Math.random();
    if (v < 0.45) ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    else if (v < 0.78) ctx.fillStyle = 'rgba(71, 85, 105, 0.45)';
    else if (v < 0.94) ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    else ctx.fillStyle = 'rgba(203, 213, 225, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle etched grid lines on bench surface
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 512; g += 64) {
    ctx.beginPath();
    ctx.moveTo(g, 0);
    ctx.lineTo(g, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, g);
    ctx.lineTo(512, g);
    ctx.stroke();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 2);
  map.anisotropy = maxAniso;

  const [rCanvas, rCtx] = makeCanvas(256, 256);
  rCtx.fillStyle = '#555555';
  rCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const shade = 65 + Math.floor(Math.random() * 75);
    rCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
    rCtx.fillRect(x, y, 2, 2);
  }
  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 2);

  return { map, roughnessMap };
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createVernierMainScaleTexture(maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(1024, 192);
  ctx.fillStyle = '#cfd8e3';
  ctx.fillRect(0, 0, 1024, 192);

  // Brushed metallic horizontal streaks
  for (let y = 0; y < 192; y += 2) {
    ctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.06)';
    ctx.fillRect(0, y, 1024, 1);
  }

  ctx.strokeStyle = '#0f172a';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';

  // 0 to 12 cm (120 mm)
  const startX = 48;
  const pxPerMm = 7.6;
  for (let mm = 0; mm <= 120; mm++) {
    const x = startX + mm * pxPerMm;
    const isCm = mm % 10 === 0;
    const isHalfCm = mm % 5 === 0;
    const len = isCm ? 52 : isHalfCm ? 36 : 22;
    ctx.lineWidth = isCm ? 2.6 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 192);
    ctx.lineTo(x, 192 - len);
    ctx.stroke();
    if (isCm) {
      ctx.fillText(String(mm / 10), x, 126);
    }
  }
  ctx.font = '600 18px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('cm  LC = 0.01 cm', 52, 46);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createVernierSliderTexture(maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 160);
  ctx.fillStyle = '#dce4ee';
  ctx.fillRect(0, 0, 512, 160);

  ctx.strokeStyle = '#0f172a';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';

  const startX = 36;
  const pxPerDiv = 38;
  for (let i = 0; i <= 10; i++) {
    const x = startX + i * pxPerDiv;
    ctx.lineWidth = i % 5 === 0 ? 2.8 : 1.8;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, i % 5 === 0 ? 52 : 34);
    ctx.stroke();
    if (i === 0 || i === 5 || i === 10) {
      ctx.fillText(String(i), x, 78);
    }
  }
  ctx.font = '600 17px "IBM Plex Mono", monospace';
  ctx.fillText('VERNIER 1/10 mm', 240, 126);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createCircularScaleTexture(divisions = 50, label = 'mm', maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#d8e0ea';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#0f172a';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';

  const stepY = 512 / divisions;
  for (let i = 0; i < divisions; i++) {
    const y = i * stepY;
    const isMajor = i % 10 === 0;
    const isMid = i % 5 === 0;
    const len = isMajor ? 110 : isMid ? 75 : 46;
    ctx.lineWidth = isMajor ? 3 : 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(len, y);
    ctx.stroke();
    if (isMajor) {
      ctx.fillText(String(i), 165, y + 6);
    }
  }
  ctx.font = '600 18px "IBM Plex Mono", monospace';
  ctx.fillText(label, 380, 260);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createBuretteScaleTexture(maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 1024);
  ctx.clearRect(0, 0, 256, 1024);

  ctx.strokeStyle = '#e0f2fe';
  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 20px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';

  // 0 mL near top, 50 mL near bottom
  const topY = 70;
  const botY = 950;
  const span = botY - topY;
  for (let ml = 0; ml <= 50; ml++) {
    const y = topY + (ml / 50) * span;
    const isMajor = ml % 5 === 0;
    ctx.lineWidth = isMajor ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(70, y);
    ctx.lineTo(isMajor ? 132 : 104, y);
    ctx.stroke();
    if (isMajor) {
      ctx.fillText(String(ml), 140, y + 7);
    }
  }
  ctx.font = '600 16px "IBM Plex Mono", monospace';
  ctx.fillText('50 mL', 82, 40);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createMeterDialTexture(
  symbol: 'A' | 'V' | 'G' | 'mA',
  maxVal: number,
  maxAniso = 8
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle meter bezel ring
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(256, 256, 240, 0, Math.PI * 2);
  ctx.stroke();

  const cx = 256;
  const cy = 320;
  const radius = 195;

  // Arc scale from -60 deg to +60 deg around top
  const startAngle = -Math.PI / 2 - Math.PI / 3;
  const endAngle = -Math.PI / 2 + Math.PI / 3;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.stroke();

  const ticks = 30;
  ctx.font = 'bold 20px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= ticks; i++) {
    const t = i / ticks;
    const ang = startAngle + t * (endAngle - startAngle);
    const isMajor = i % 5 === 0;
    const rIn = isMajor ? radius - 22 : radius - 12;
    ctx.lineWidth = isMajor ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * rIn, cy + Math.sin(ang) * rIn);
    ctx.lineTo(cx + Math.cos(ang) * radius, cy + Math.sin(ang) * radius);
    ctx.stroke();

    if (isMajor) {
      const val = symbol === 'G' ? Math.round((t - 0.5) * 2 * maxVal) : Number((t * maxVal).toFixed(1));
      const rTxt = radius - 42;
      ctx.fillText(String(val), cx + Math.cos(ang) * rTxt, cy + Math.sin(ang) * rTxt);
    }
  }

  ctx.font = 'bold 46px "Outfit", sans-serif';
  ctx.fillStyle = symbol === 'A' || symbol === 'mA' ? '#dc2626' : symbol === 'V' ? '#2563eb' : '#059669';
  ctx.fillText(symbol, cx, 245);

  ctx.font = '600 16px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText('CLASS 1.5 DC', cx, 415);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createRulerTexture(lengthCm = 150, maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(1024, 128);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 1024, 128);

  ctx.strokeStyle = '#0f172a';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';

  const pxPerCm = 980 / lengthCm;
  for (let cm = 0; cm <= lengthCm; cm++) {
    const x = 22 + cm * pxPerCm;
    const isTen = cm % 10 === 0;
    const isFive = cm % 5 === 0;
    ctx.lineWidth = isTen ? 2.5 : 1.2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, isTen ? 46 : isFive ? 32 : 18);
    ctx.stroke();
    if (isTen) {
      ctx.fillText(String(cm), x, 72);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

/**
 * Draws detailed procedural biological specimen imagery onto a 2D canvas.
 * Used both for the 3D microscope slide texture AND the interactive Eyepiece Optical View.
 */
export function drawMicroscopeSpecimen(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  specimenType: string,
  power: 10 | 45 | 100 = 45,
  stained = true,
  plasmolysisProgress = 0
): void {
  const cx = w / 2;
  const cy = h / 2;
  const scale = power === 10 ? 0.68 : power === 45 ? 1.0 : 1.45;

  // Illuminated field background
  const bg = ctx.createRadialGradient(cx, cy, w * 0.05, cx, cy, w * 0.52);
  if (specimenType.includes('plasmolysis')) {
    bg.addColorStop(0, '#fdf4ff');
    bg.addColorStop(1, '#e9d5ff');
  } else if (stained) {
    bg.addColorStop(0, '#fff7ed');
    bg.addColorStop(1, '#ffedd5');
  } else {
    bg.addColorStop(0, '#f8fafc');
    bg.addColorStop(1, '#e2e8f0');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  if (specimenType === 'stomata' || specimenType === 'stomata_dist') {
    // Epidermal jigsaw cells
    ctx.strokeStyle = stained ? '#be123c' : '#64748b';
    ctx.lineWidth = 2.2;
    for (let gx = -2; gx <= 2; gx++) {
      for (let gy = -2; gy <= 2; gy++) {
        const px = gx * 78 + (gy % 2) * 35;
        const py = gy * 68;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.1; a += Math.PI / 6) {
          const r = 38 + Math.sin(a * 3 + gx) * 6;
          const x = px + Math.cos(a) * r;
          const y = py + Math.sin(a) * r;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.fillStyle = stained ? 'rgba(251, 113, 133, 0.14)' : 'rgba(148, 163, 184, 0.12)';
        ctx.fill();
        ctx.stroke();
      }
    }
    // Kidney-shaped guard cells & stomatal pores
    const pores =
      specimenType === 'stomata_dist'
        ? [
            [0, 0],
            [-92, -64],
            [94, 58],
            [-76, 72],
          ]
        : [
            [0, 0],
            [-98, -74],
            [102, 70],
          ];
    pores.forEach(([sx, sy]) => {
      ctx.save();
      ctx.translate(sx, sy);
      // Left & right guard cells
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(side * 14, 0, 14, 28, side * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = stained ? '#fb7185' : '#4ade80';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = stained ? '#9f1239' : '#166534';
        ctx.stroke();
        // Chloroplasts
        ctx.fillStyle = '#15803d';
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath();
          ctx.arc(side * 15, k * 8, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Pore opening
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 16, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.restore();
    });
  } else if (specimenType === 'plasmolysis') {
    const shrink = 1 - plasmolysisProgress * 0.45;
    for (let gx = -2; gx <= 2; gx++) {
      for (let gy = -2; gy <= 2; gy++) {
        const px = gx * 74;
        const py = gy * 56;
        // Rigid outer cell wall
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px - 34, py - 24, 68, 48);
        // Shrinking purple protoplast
        ctx.beginPath();
        ctx.ellipse(px, py, 30 * shrink, 20 * shrink, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(147, 51, 234, 0.72)';
        ctx.fill();
        ctx.strokeStyle = '#6b21a8';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }
  } else if (specimenType === 'mitosis') {
    // Onion root tip grid with Interphase, Prophase, Metaphase, Anaphase, Telophase
    const stages = [
      { x: -85, y: -75, kind: 'interphase' },
      { x: 0, y: -75, kind: 'prophase' },
      { x: 85, y: -75, kind: 'metaphase' },
      { x: -45, y: 25, kind: 'anaphase' },
      { x: 55, y: 25, kind: 'telophase' },
    ];
    stages.forEach((st) => {
      ctx.strokeStyle = '#9f1239';
      ctx.lineWidth = 2.2;
      ctx.fillStyle = 'rgba(253, 164, 175, 0.25)';
      ctx.fillRect(st.x - 36, st.y - 42, 72, 84);
      ctx.strokeRect(st.x - 36, st.y - 42, 72, 84);

      ctx.strokeStyle = '#881337';
      ctx.fillStyle = '#881337';
      if (st.kind === 'interphase') {
        ctx.beginPath();
        ctx.arc(st.x, st.y, 16, 0, Math.PI * 2);
        ctx.fill();
      } else if (st.kind === 'prophase') {
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          ctx.moveTo(st.x - 10 + i * 3, st.y - 12);
          ctx.quadraticCurveTo(st.x, st.y + (i % 2 === 0 ? 12 : -10), st.x + 10 - i * 2, st.y + 12);
          ctx.stroke();
        }
      } else if (st.kind === 'metaphase') {
        // Chromosomes aligned at equatorial plate
        for (let i = -3; i <= 3; i++) {
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(st.x + i * 7, st.y - 10);
          ctx.lineTo(st.x + i * 7, st.y + 10);
          ctx.stroke();
        }
      } else if (st.kind === 'anaphase') {
        // Sister chromatids pulled to poles
        for (let i = -2; i <= 2; i++) {
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(st.x + i * 8, st.y - 24);
          ctx.lineTo(st.x + i * 6, st.y - 14);
          ctx.moveTo(st.x + i * 8, st.y + 24);
          ctx.lineTo(st.x + i * 6, st.y + 14);
          ctx.stroke();
        }
      } else if (st.kind === 'telophase') {
        ctx.beginPath();
        ctx.arc(st.x, st.y - 20, 11, 0, Math.PI * 2);
        ctx.arc(st.x, st.y + 20, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(st.x - 32, st.y);
        ctx.lineTo(st.x + 32, st.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  } else if (specimenType === 'ts_dicot_monocot') {
    // Circular stem T.S. with vascular bundle ring
    ctx.beginPath();
    ctx.arc(0, 0, 128, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(253, 186, 116, 0.25)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#9a3412';
    ctx.stroke();

    // Vascular bundles in ring
    const bundles = 10;
    for (let i = 0; i < bundles; i++) {
      const a = (i / bundles) * Math.PI * 2;
      const bx = Math.cos(a) * 82;
      const by = Math.sin(a) * 82;
      ctx.beginPath();
      ctx.ellipse(bx, by, 13, 18, a + Math.PI / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#e11d48';
      ctx.fill();
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Pith
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Rich generalized cellular / tissue / pollen / microbe field
    const count = 14;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const rad = (i % 3) * 44 + 28;
      const px = Math.cos(ang) * rad;
      const py = Math.sin(ang) * rad;

      ctx.beginPath();
      ctx.ellipse(px, py, 24, 18, ang, 0, Math.PI * 2);
      ctx.fillStyle = stained ? 'rgba(225, 29, 72, 0.22)' : 'rgba(16, 185, 129, 0.22)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = stained ? '#be123c' : '#047857';
      ctx.stroke();

      // Nucleus
      ctx.beginPath();
      ctx.arc(px + 3, py - 2, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = stained ? '#881337' : '#065f46';
      ctx.fill();
    }
    if (specimenType.includes('pollen')) {
      // Emerging pollen tube
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(25, 20, 40, -30, 88, 12);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function createMicroscopeSlideTexture(specimenType: string, maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  drawMicroscopeSpecimen(ctx, 512, 512, specimenType, 45, true, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export const PH_CHART_COLORS: { ph: number; hex: string }[] = [
  { ph: 1, hex: '#dc2626' },
  { ph: 2, hex: '#ea580c' },
  { ph: 3, hex: '#f97316' },
  { ph: 4, hex: '#f59e0b' },
  { ph: 5, hex: '#eab308' },
  { ph: 6, hex: '#84cc16' },
  { ph: 7, hex: '#22c55e' },
  { ph: 8, hex: '#14b8a6' },
  { ph: 9, hex: '#06b6d4' },
  { ph: 10, hex: '#3b82f6' },
  { ph: 11, hex: '#4f46e5' },
  { ph: 12, hex: '#6d28d9' },
  { ph: 13, hex: '#5b21b6' },
  { ph: 14, hex: '#4c1d95' },
];

export function createPhChartTexture(maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 320);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 312);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('UNIVERSAL pH INDICATOR PAPER', 256, 44);

  ctx.font = '600 16px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText('FULL RANGE pH 1 – 14', 256, 72);

  const padX = 24;
  const swW = (512 - padX * 2) / 14;
  PH_CHART_COLORS.forEach((entry, idx) => {
    const x = padX + idx * swW;
    ctx.fillStyle = entry.hex;
    ctx.fillRect(x + 2, 102, swW - 4, 130);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px "IBM Plex Mono", monospace';
    ctx.fillText(String(entry.ph), x + swW / 2, 260);
  });

  ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('ACIDIC (1–6)      NEUTRAL (7)      ALKALINE (8–14)', 256, 296);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createSpottingTileTexture(maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 384);
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 512, 384);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 380);

  const labels = ['Dil. HCl', 'Dil. NaOH', 'CH₃COOH', 'Lemon', 'Water', 'NaHCO₃'];
  ctx.font = 'bold 20px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  labels.forEach((lbl, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = 96 + col * 160;
    const cy = 96 + row * 170;
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.fillText(lbl, cx, cy + 72);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createTiledWallTexture(maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#141e30';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  const step = 64;
  for (let x = 0; x <= 512; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 3.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createCheckeredFloorTexture(maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  const size = 64;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#0c1322' : '#111b2e';
      ctx.fillRect(x * size, y * size, size, size);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createChemicalLabelTexture(
  formula: string,
  name: string,
  maxAniso = 8,
  bandHex = '#dc2626'
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 128);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = bandHex;
  ctx.fillRect(0, 0, 256, 24);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 124);

  ctx.fillStyle = '#0f172a';
  const fontSize = formula.length > 9 ? 28 : formula.length > 6 ? 34 : 40;
  ctx.font = `bold ${fontSize}px "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(formula, 128, 72);

  ctx.font = '600 17px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText(name, 128, 106);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createGraphPaperTexture(maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i <= 512; i += 16) {
    const major = i % 64 === 0;
    ctx.strokeStyle = major ? '#10b981' : 'rgba(16, 185, 129, 0.35)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Traced brass lamina outline (12.5 cm²)
  ctx.strokeStyle = '#b45309';
  ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(384, 144);
  ctx.lineTo(368, 368);
  ctx.lineTo(144, 352);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LAMINA AREA = 12.5 cm²', 256, 444);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createStopwatchDialTexture(label = 'STOPWATCH', sub = '00:00.0', maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 240, 240);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 18px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 56);

  ctx.fillStyle = '#064e3b';
  ctx.fillRect(28, 86, 200, 76);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 86, 200, 76);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 34px "IBM Plex Mono", monospace';
  ctx.fillText(sub, 128, 136);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 14px "IBM Plex Mono", monospace';
  ctx.fillText('START / LAP', 128, 205);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createBarometerDialTexture(maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 20; i++) {
    const a = -Math.PI * 1.2 + (i / 20) * Math.PI * 1.4;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 86, 128 + Math.sin(a) * 86);
    ctx.lineTo(128 + Math.cos(a) * 102, 128 + Math.sin(a) * 102);
    ctx.stroke();
  }
  // Needle pointing at 76 cm Hg
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128, 42);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('76 cm Hg', 128, 178);
  ctx.font = '600 14px "Outfit", sans-serif';
  ctx.fillText('BAROMETER', 128, 202);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createPeriodicTableTexture(maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 320);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 312);

  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 20px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PERIODIC TABLE OF ELEMENTS', 256, 34);

  const cellW = 24;
  const cellH = 26;
  const startX = 40;
  const startY = 54;
  const groupColors = ['#ef4444', '#f59e0b', '#3b82f6', '#0ea5e9', '#10b981', '#8b5cf6'];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 18; c++) {
      if (r === 0 && c > 0 && c < 17) continue;
      if ((r === 1 || r === 2) && c > 1 && c < 12) continue;
      const colIdx = c === 0 ? 0 : c === 1 ? 1 : c < 12 ? 2 : c === 17 ? 5 : 4;
      ctx.fillStyle = groupColors[colIdx];
      ctx.fillRect(startX + c * cellW, startY + r * cellH, cellW - 2, cellH - 2);
    }
  }
  // Lanthanide / Actinide rows
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 14; c++) {
      ctx.fillStyle = r === 0 ? '#14b8a6' : '#6366f1';
      ctx.fillRect(startX + (c + 2) * cellW, 250 + r * 24, cellW - 2, 20);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createAnatomyPosterTexture(maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(320, 440);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 320, 440);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 312, 432);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 18px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HUMAN PHYSIOLOGY CHART', 160, 34);

  // Stylized anatomical silhouette + heart + lungs + vasculature
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(160, 95, 28, 0, Math.PI * 2);
  ctx.moveTo(160, 123);
  ctx.lineTo(160, 290);
  ctx.moveTo(100, 155);
  ctx.lineTo(220, 155);
  ctx.stroke();

  // Lungs
  ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.beginPath();
  ctx.ellipse(134, 180, 22, 34, 0.15, 0, Math.PI * 2);
  ctx.ellipse(186, 180, 22, 34, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Heart
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(166, 186, 14, 0, Math.PI * 2);
  ctx.fill();

  // Ribcage lines
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(160, 158 + i * 16, 36, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 12px "IBM Plex Mono", monospace';
  ctx.fillText('RESPIRATORY & CARDIAC ATLAS', 160, 410);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createClockFaceTexture(maxAniso = 8): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let h = 1; h <= 12; h++) {
    const ang = (h / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.fillText(String(h), 128 + Math.cos(ang) * 90, 128 + Math.sin(ang) * 90);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function drawEquationBoardCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  discipline: string,
  badge: string,
  equation: string,
  phenomenon: string,
  accentHex: string,
  stage: 'ready' | 'mixing' | 'formed'
): void {
  ctx.fillStyle = '#070e1c';
  ctx.fillRect(0, 0, w, h);

  // Top accent header bar
  ctx.fillStyle = stage === 'formed' ? accentHex : '#1e293b';
  ctx.fillRect(0, 0, w, 52);

  // Glowing frame border
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = stage === 'formed' ? 6 : 3;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  // Header badge text
  ctx.fillStyle = stage === 'formed' ? '#04111d' : accentHex;
  ctx.font = 'bold 20px "Outfit", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${discipline.toUpperCase()} · ${badge.toUpperCase()}`, 22, 27);

  // Stage indicator on right
  ctx.textAlign = 'right';
  ctx.font = 'bold 16px "IBM Plex Mono", monospace';
  ctx.fillStyle = stage === 'formed' ? '#04111d' : '#94a3b8';
  ctx.fillText(stage === 'formed' ? '● FORMED' : stage === 'mixing' ? '◐ ACTIVE' : '○ READY', w - 22, 27);

  // Equation main lines
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px "IBM Plex Mono", monospace';
  const eqLines = wrapTextLines(ctx, equation, w - 44).slice(0, 3);
  eqLines.forEach((line, i) => {
    ctx.fillText(line, 22, 92 + i * 34);
  });

  // Phenomenon / outcome footer
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  const phenLines = wrapTextLines(ctx, phenomenon, w - 44).slice(0, 2);
  phenLines.forEach((line, i) => {
    ctx.fillText(line, 22, 210 + i * 24);
  });
}
