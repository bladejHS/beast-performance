// Draws the low-poly art of the app as SVG, in the facet language of the wolf emblem:
// matte graphite planes, crimson light from the left, electric blue from the right.
// Run with: npm run art. Output: public/art/*.svg
import { mkdirSync, writeFileSync } from 'node:fs';
import Delaunator from 'delaunator';

const OUT = 'public/art';
mkdirSync(OUT, { recursive: true });

function rng(seed) { let x = seed; return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; }; }

/** Distance to the shape edge from a boolean mask: negative inside. Two-pass chamfer distance. */
function distanceField(w, h, inside) {
  const INF = 1e9, d = new Float32Array(w * h), e = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = inside(x + 0.5, y + 0.5); d[y * w + x] = i ? INF : 0; e[y * w + x] = i ? 0 : INF; }
  const pass = (f) => {
    const D = 1, Q = Math.SQRT2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = f[y * w + x];
      if (x > 0) v = Math.min(v, f[y * w + x - 1] + D);
      if (y > 0) v = Math.min(v, f[(y - 1) * w + x] + D);
      if (x > 0 && y > 0) v = Math.min(v, f[(y - 1) * w + x - 1] + Q);
      if (x < w - 1 && y > 0) v = Math.min(v, f[(y - 1) * w + x + 1] + Q);
      f[y * w + x] = v;
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      let v = f[y * w + x];
      if (x < w - 1) v = Math.min(v, f[y * w + x + 1] + D);
      if (y < h - 1) v = Math.min(v, f[(y + 1) * w + x] + D);
      if (x < w - 1 && y < h - 1) v = Math.min(v, f[(y + 1) * w + x + 1] + Q);
      if (x > 0 && y < h - 1) v = Math.min(v, f[(y + 1) * w + x - 1] + Q);
      f[y * w + x] = v;
    }
  };
  pass(d); pass(e);
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = e[i] - d[i];
  return (x, y) => {
    const ix = Math.max(0, Math.min(w - 1, Math.round(x - 0.5))), iy = Math.max(0, Math.min(h - 1, Math.round(y - 0.5)));
    return out[iy * w + ix];
  };
}

const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

function facet({ w, h, inside, spacing, seed, depth, name, bumps = null, symmetric = false, noiseAmt = 0.16 }) {
  const r = rng(seed);
  const sd = distanceField(w, h, inside);
  const mid = w / 2;
  const pts = [];
  const push = (x, y) => { pts.push([x, y]); if (symmetric && Math.abs(x - mid) > spacing * 0.3) pts.push([w - x, y]); };
  const maxX = symmetric ? mid : w;
  // Interior: a jittered lattice.
  for (let y = 0; y <= h; y += spacing) for (let x = 0; x <= maxX; x += spacing) {
    const px = Math.min(x + (r() - 0.5) * spacing * 0.75, maxX), py = y + (r() - 0.5) * spacing * 0.75;
    if (sd(px, py) < -spacing * 0.4) push(px, py);
  }
  // Outline: lattice points pulled onto the edge, so the silhouette stays clean.
  const step = spacing * 0.42;
  for (let y = 0; y <= h; y += step) for (let x = 0; x <= maxX; x += step) {
    let px = x, py = y;
    if (Math.abs(sd(px, py)) > step) continue;
    for (let i = 0; i < 6; i++) {
      const gx = sd(px + 1.5, py) - sd(px - 1.5, py), gy = sd(px, py + 1.5) - sd(px, py - 1.5);
      const g = Math.hypot(gx, gy) || 1, v = sd(px, py);
      px -= (gx / g) * v; py -= (gy / g) * v;
    }
    if (Math.abs(sd(px, py)) < 1.6 && !pts.some(([a, b]) => Math.hypot(a - px, b - py) < spacing * 0.5)) push(px, py);
  }
  const del = Delaunator.from(pts);
  // Height: a dome from the distance field, plus muscle relief, plus a little mirrored noise so the planes break the way the emblem does.
  const noiseOf = new Map();
  const noiseAt = (x, y) => { const k = `${Math.round(Math.abs(x - mid))}:${Math.round(y)}`; if (!noiseOf.has(k)) noiseOf.set(k, (r() - 0.5) * depth * noiseAmt); return noiseOf.get(k); };
  const z = pts.map(([x, y]) => {
    const v = Math.max(0, -sd(x, y));
    let q = Math.sqrt(v * depth) + noiseAt(x, y);
    if (bumps) for (const [bx, by, sx, sy, amp] of bumps) { const X = Math.abs(x - mid) - Math.abs(bx - mid), Y = y - by; q += amp * Math.exp(-(X * X) / (2 * sx * sx) - (Y * Y) / (2 * sy * sy)); }
    return q;
  });
  const polys = [];
  for (let i = 0; i < del.triangles.length; i += 3) {
    const [a, b, c] = [del.triangles[i], del.triangles[i + 1], del.triangles[i + 2]];
    const A = pts[a], B = pts[b], C = pts[c];
    const cx = (A[0] + B[0] + C[0]) / 3, cy = (A[1] + B[1] + C[1]) / 3;
    if (sd(cx, cy) > -0.4) continue;
    const u = [B[0] - A[0], B[1] - A[1], z[b] - z[a]], v = [C[0] - A[0], C[1] - A[1], z[c] - z[a]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const len = Math.hypot(...n) || 1; n = n.map((q) => q / len); if (n[2] < 0) n = n.map((q) => -q);
    const dot = (l) => { const L = Math.hypot(...l); return Math.max(0, (n[0] * l[0] + n[1] * l[1] + n[2] * l[2]) / L); };
    const key = dot([0, -0.62, 0.78]) ** 3;
    const red = dot([-1, -0.15, 0.3]) ** 2.4, blue = dot([1, -0.15, 0.3]) ** 2.4;
    const edge = Math.max(0, 1 + sd(cx, cy) / (spacing * 2.6)) ** 1.4;
    const left = Math.max(0, Math.min(1, (mid - cx) / (w * 0.06) + 0.5));
    const rr = red * (0.1 + edge * 1.05) * left, bb = blue * (0.1 + edge * 1.05) * (1 - left);
    const grey = 16 + key * 104;
    const col = [grey * 0.96 + rr * 255, grey * 0.98 + rr * 40 + bb * 118, grey * 1.1 + rr * 28 + bb * 255];
    polys.push(`<path fill="${hex(col)}" d="M${A[0].toFixed(1)} ${A[1].toFixed(1)}L${B[0].toFixed(1)} ${B[1].toFixed(1)}L${C[0].toFixed(1)} ${C[1].toFixed(1)}Z"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="geometricPrecision"><g stroke-width=".5" stroke="#c9d2e6" stroke-opacity=".09">${polys.join('')}</g></svg>`;
  writeFileSync(`${OUT}/${name}.svg`, svg);
  console.log(name, polys.length, 'facets', Math.round(svg.length / 1024), 'KB');
}

// ---- Shape helpers ----
const seg = (x, y, a, b) => { const [ax, ay] = a, [bx, by] = b; const dx = bx - ax, dy = by - ay; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - ax - t * dx, y - ay - t * dy); };
const cap = (x, y, a, b, r0, r1 = r0) => { const [ax, ay] = a, [bx, by] = b; const dx = bx - ax, dy = by - ay; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - ax - t * dx, y - ay - t * dy) <= r0 + (r1 - r0) * t; };
const circle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) <= r;
function inPoly(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }

/** The figure, mirrored around x = 300. The wolf emblem sits on top of it in the page. */
function body(px, py) {
  const x = 300 - Math.abs(px - 300), y = py;
  if (cap(x, y, [300, 165], [300, 240], 42, 52)) return true; // neck and traps
  if (cap(x, y, [158, 282], [300, 238], 42, 40)) return true; // shoulder line
  if (cap(x, y, [150, 284], [144, 330], 52, 44)) return true; // deltoid
  if (cap(x, y, [218, 304], [300, 304], 76, 82)) return true; // chest
  if (cap(x, y, [222, 340], [246, 486], 60, 42)) return true; // lats into the waist
  if (cap(x, y, [300, 380], [300, 540], 74, 70)) return true; // abdomen
  if (cap(x, y, [262, 560], [300, 570], 62, 66)) return true; // pelvis
  if (cap(x, y, [130, 340], [112, 462], 38, 30)) return true; // upper arm
  if (cap(x, y, [112, 462], [100, 600], 31, 20)) return true; // forearm
  if (circle(x, y, 96, 626, 23)) return true; // hand
  if (cap(x, y, [252, 630], [244, 800], 56, 42)) return true; // thigh
  if (cap(x, y, [244, 800], [240, 930], 42, 34)) return true; // knee and shin
  return false;
}

const MUSCLES = [
  [246, 300, 46, 30, 16], [160, 290, 26, 30, 14], [206, 262, 34, 14, 7],
  [272, 392, 17, 13, 7], [272, 426, 17, 13, 7], [272, 460, 17, 13, 7], [272, 498, 16, 16, 6],
  [214, 390, 12, 40, 7], [124, 392, 15, 34, 10], [108, 520, 12, 40, 7], [240, 680, 30, 60, 12], [232, 852, 20, 34, 6],
];
facet({ w: 600, h: 900, inside: body, spacing: 19, seed: 11, depth: 90, name: 'body', bumps: MUSCLES, symmetric: true, noiseAmt: 0.2 });

const R = 100;
const glyphs = {
  overview: (x, y) => { const a = (x - R) / 74, b = -(y - 108) / 74; return (a * a + b * b - 1) ** 3 - a * a * b ** 3 <= 0; },
  blood: (x, y) => { const t = (y - 14) / 172; if (t < 0 || t > 1) return false; return Math.abs(x - R) <= 96 * t ** 0.86 * Math.sqrt(1 - t) * 1.02; },
  recovery: (x, y) => circle(x, y, R, R, 80) && !circle(x, y, 132, 80, 66),
  performance: (x, y) => inPoly(x, y, [[118, 8], [38, 116], [92, 116], [72, 192], [164, 74], [106, 74], [140, 8]]),
  protocol: (x, y) => { const d = Math.hypot(x - R, y - R); return (d >= 66 && d <= 88) || seg(x, y, [R, R], [R, 46]) <= 8 || seg(x, y, [R, R], [142, 124]) <= 8 || circle(x, y, R, R, 13); },
  tracking: (x, y) => { const d = Math.hypot(x - R, y - R); const ecg = [[34, 104], [68, 104], [82, 66], [102, 142], [118, 86], [128, 104], [166, 104]]; for (let i = 0; i < ecg.length - 1; i++) if (seg(x, y, ecg[i], ecg[i + 1]) <= 7) return true; return d >= 76 && d <= 92; },
  hormones: (x, y) => {
    const rings = [[60, 128], [108, 128], [134, 84]].flatMap(([cx, cy]) => { const p = Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return [cx + 30 * Math.cos(a), cy + 30 * Math.sin(a)]; }); return p.map((q, i) => [q, p[(i + 1) % 6]]); });
    for (const [a, b] of rings) if (seg(x, y, a, b) <= 6.5) return true;
    const pent = Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [168 + 24 * Math.cos(a), 56 + 24 * Math.sin(a)]; });
    for (let i = 0; i < 5; i++) if (seg(x, y, pent[i], pent[(i + 1) % 5]) <= 6.5) return true;
    return circle(x, y, 60, 128, 9) || circle(x, y, 134, 84, 9);
  },
  endocrine: (px, py) => {
    const x = R - Math.abs(px - R), y = py;
    return cap(x, y, [R, 32], [R, 58], 20, 22) || cap(x, y, [36, 66], [R, 60], 22, 26) || cap(x, y, [R, 70], [R, 150], 58, 40) || cap(x, y, [34, 68], [22, 138], 19, 13) || cap(x, y, [72, 170], [68, 198], 30, 24);
  },
  ai: (x, y) => {
    const nodes = [[R, 26], [168, 62], [168, 138], [R, 174], [32, 138], [32, 62], [R, R]];
    for (const [a, b] of [[0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]]) if (seg(x, y, nodes[a], nodes[b]) <= 5.5) return true;
    return nodes.some(([a, b], i) => circle(x, y, a, b, i === 6 ? 21 : 15));
  },
};
let seed = 23;
for (const [name, inside] of Object.entries(glyphs)) facet({ w: 200, h: 200, inside, spacing: 12, seed: seed += 7, depth: 30, name, noiseAmt: 0.5 });
