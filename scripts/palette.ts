/**
 * CVD palette validator. Chart series colors must stay separable under
 * protanopia / deuteranopia / tritanopia. Distances are CIE76 ΔE in Lab
 * after CVD simulation — for categorical series, ΔE ≥ 20 reads as clearly
 * distinct, 12–20 is tight, below 12 is a collision.
 *
 *   pnpm exec tsx scripts/check-palette.ts
 */
type RGB = [number, number, number];

const hex = (h: string): RGB =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (c: number) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, v * 255));
};

const apply = (m: number[][], v: RGB): RGB =>
  m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]) as RGB;

/** Machado et al. severity-1.0 CVD matrices, applied in linear RGB. */
const SIM: Record<string, number[][]> = {
  normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};

function toLab(rgb: RGB): [number, number, number] {
  const [r, g, b] = rgb.map(toLinear) as RGB;
  // sRGB D65 -> XYZ
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [x, y, z] = [f(x), f(y), f(z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const deltaE = (a: RGB, b: RGB) => {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

/** Simulate a CVD mode: linearize, transform, back to sRGB bytes. */
const simulate = (mode: string, c: string): RGB =>
  apply(SIM[mode], hex(c).map(toLinear) as RGB).map(toSrgb) as RGB;

export function validate(name: string, colors: Record<string, string>): number {
  const ids = Object.keys(colors);
  let worst = Infinity;
  let pair = "";
  for (const mode of Object.keys(SIM)) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const d = deltaE(simulate(mode, colors[ids[i]]), simulate(mode, colors[ids[j]]));
        if (d < worst) { worst = d; pair = `${ids[i]}/${ids[j]} @${mode}`; }
      }
    }
  }
  const flag = worst < 12 ? "FAIL" : worst < 20 ? "warn" : "ok  ";
  console.log(`${flag} ${name.padEnd(13)} min ΔE ${worst.toFixed(1).padStart(5)}  (${pair})`);
  return worst;
}
