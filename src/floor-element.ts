/**
 * Web component that renders a pixel art styled floor
 */

/* ============================================================
   Seeded RNG
   ============================================================ */

function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed: string): () => number {
  return mulberry32(hashString(seed));
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

interface WeightedEntry<T> {
  value: T;
  weight: number;
}

function pickWeighted<T>(rng: () => number, entries: WeightedEntry<T>[]): T {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;

  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e.value;
  }

  return entries[entries.length - 1].value;
}

/* ============================================================
   Color Helpers
   ============================================================ */

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB {
  hex = hex.replace("#", "");
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}

function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.r + (cb.r - ca.r) * t, ca.g + (cb.g - ca.g) * t, ca.b + (cb.b - ca.b) * t);
}

function shade(hex: string, amount: number): string {
  return mix(hex, amount > 0 ? "#ffffff" : "#000000", Math.abs(amount));
}

/* ============================================================
   Low Frequency Value Noise
   ============================================================ */

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function makeNoiseGrid(seed: string, gw: number, gh: number): number[][] {
  const rng = makeRng(seed);
  const grid: number[][] = [];

  for (let y = 0; y < gh; y++) {
    const row: number[] = [];
    for (let x = 0; x < gw; x++) {
      row.push(rng());
    }
    grid.push(row);
  }

  return grid;
}

function valueNoiseWrapped(grid: number[][], x: number, y: number): number {
  const gh = grid.length;
  const gw = grid[0].length;

  const x0 = Math.floor(x) % gw;
  const y0 = Math.floor(y) % gh;
  const x1 = (x0 + 1) % gw;
  const y1 = (y0 + 1) % gh;

  const fx = smoothstep(x - Math.floor(x));
  const fy = smoothstep(y - Math.floor(y));

  const a = grid[y0][x0];
  const b = grid[y0][x1];
  const c = grid[y1][x0];
  const d = grid[y1][x1];

  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

/* ============================================================
   Tileset Design
   ============================================================ */

const TILE_SIZE = 32;

interface GrassPalette {
  base: string;
  base2: string;
  light: string;
  dark: string;
  darker: string;
  tuft: string;
  moss: string;
  path: string;
  pathLight: string;
  flowerA: string;
  flowerB: string;
  flowerC: string;
  pebble: string;
  pebbleDark: string;
}

interface TileKind {
  id: string;
  label: string;
  weight: number;
}

const TILE_KINDS: TileKind[] = [
  { id: "grass_plain", label: "Plain Grass", weight: 40 },
  { id: "grass_short", label: "Short Grass", weight: 22 },
  { id: "grass_tufts", label: "Grass Tufts", weight: 18 },
  { id: "grass_flowers", label: "Tiny Flowers", weight: 6 },
  { id: "grass_clover", label: "Clover", weight: 6 },
  { id: "grass_pebbles", label: "Small Pebbles", weight: 4 },
  { id: "grass_moss", label: "Mossy Grass", weight: 8 },
  { id: "grass_soft_path", label: "Soft Worn Grass", weight: 8 },
];

function generateGrassPalette(rng: () => number): GrassPalette {
  const bases = ["#6faa3f", "#78b84a", "#6ca044", "#7bad4f", "#669c3f"];
  const base = pick(rng, bases);

  return {
    base,
    base2: shade(base, 0.035),
    light: shade(base, 0.1),
    dark: shade(base, -0.11),
    darker: shade(base, -0.18),
    tuft: shade(base, -0.22),
    moss: mix(base, "#8fae5a", 0.35),
    path: mix(base, "#a48c5e", 0.3),
    pathLight: mix(base, "#b7a978", 0.28),
    flowerA: "#f3d46b",
    flowerB: "#e98bb6",
    flowerC: "#d9ecff",
    pebble: "#8a8d7d",
    pebbleDark: "#64685d",
  };
}

interface Tile {
  id: string;
  label: string;
  weight: number;
  canvas: HTMLCanvasElement;
}

interface Tileset {
  seed: string;
  palette: GrassPalette;
  tiles: Tile[];
}

function generateTileset(seed: string): Tileset {
  const rng = makeRng(seed + ":tileset");
  const palette = generateGrassPalette(rng);

  const tiles = TILE_KINDS.map((kind) => {
    const canvas = document.createElement("canvas");
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;

    renderGrassTile(canvas, kind.id, palette, seed + ":tile:" + kind.id);

    return {
      id: kind.id,
      label: kind.label,
      weight: kind.weight,
      canvas,
    };
  });

  return {
    seed,
    palette,
    tiles,
  };
}

/* ============================================================
   Tile Rendering
   ============================================================ */

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

function renderGrassTile(canvas: HTMLCanvasElement, tileId: string, palette: GrassPalette, seed: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  const rng = makeRng(seed);

  drawBaseGrass(ctx, palette);

  if (tileId === "grass_plain") {
    drawFineGrassNoise(ctx, palette, rng, 18);
  }

  if (tileId === "grass_short") {
    drawFineGrassNoise(ctx, palette, rng, 28);
    drawShortGrass(ctx, palette, rng, 12);
  }

  if (tileId === "grass_tufts") {
    drawFineGrassNoise(ctx, palette, rng, 18);
    drawTufts(ctx, palette, rng, 10);
  }

  if (tileId === "grass_flowers") {
    drawFineGrassNoise(ctx, palette, rng, 15);
    drawShortGrass(ctx, palette, rng, 8);
    drawFlowers(ctx, palette, rng, 6);
  }

  if (tileId === "grass_clover") {
    drawFineGrassNoise(ctx, palette, rng, 12);
    drawClover(ctx, palette, rng, 7);
  }

  if (tileId === "grass_pebbles") {
    drawFineGrassNoise(ctx, palette, rng, 12);
    drawPebbles(ctx, palette, rng, 6);
  }

  if (tileId === "grass_moss") {
    drawMossPatches(ctx, palette, rng, 5);
    drawFineGrassNoise(ctx, palette, rng, 12);
  }

  if (tileId === "grass_soft_path") {
    drawSoftPathGrass(ctx, palette, rng);
    drawFineGrassNoise(ctx, palette, rng, 10);
  }

  drawVerySubtleTileBorderNeutralizer(ctx, palette);
}

function drawBaseGrass(ctx: CanvasRenderingContext2D, p: GrassPalette) {
  px(ctx, 0, 0, 32, 32, p.base);

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const v = (x * 17 + y * 31) % 19;
      if (v === 0) px(ctx, x, y, 1, 1, p.base2);
      if (v === 7) px(ctx, x, y, 1, 1, p.dark);
    }
  }
}

function drawFineGrassNoise(ctx: CanvasRenderingContext2D, p: GrassPalette, rng: () => number, count: number) {
  for (let i = 0; i < count; i++) {
    const x = randInt(rng, 1, 30);
    const y = randInt(rng, 1, 30);
    const color = rng() < 0.6 ? p.light : p.dark;
    px(ctx, x, y, 1, 1, color);
  }
}

function drawShortGrass(ctx: CanvasRenderingContext2D, p: GrassPalette, rng: () => number, count: number) {
  for (let i = 0; i < count; i++) {
    const x = randInt(rng, 3, 28);
    const y = randInt(rng, 3, 28);

    px(ctx, x, y, 1, 2, p.tuft);
    if (rng() < 0.5) px(ctx, x + 1, y + 1, 1, 1, p.dark);
    if (rng() < 0.35) px(ctx, x - 1, y + 1, 1, 1, p.light);
  }
}

function drawTufts(ctx: CanvasRenderingContext2D, p: GrassPalette, rng: () => number, count: number) {
  for (let i = 0; i < count; i++) {
    const x = randInt(rng, 4, 27);
    const y = randInt(rng, 4, 27);

    px(ctx, x, y, 1, 3, p.tuft);
    px(ctx, x - 1, y + 1, 1, 2, p.dark);
    px(ctx, x + 1, y + 1, 1, 2, p.light);
  }
}

function drawFlowers(ctx: CanvasRenderingContext2D, p: GrassPalette, rng: () => number, count: number) {
  const colors = [p.flowerA, p.flowerB, p.flowerC];

  for (let i = 0; i < count; i++) {
    const x = randInt(rng, 4, 27);
    const y = randInt(rng, 4, 27);
    const c = pick(rng, colors);

    px(ctx, x, y + 1, 1, 2, p.tuft);
    px(ctx, x, y, 1, 1, c);

    if (rng() < 0.35) {
      px(ctx, x - 1, y, 1, 1, c);
    }
  }
}

function drawClover(ctx: CanvasRenderingContext2D, p: GrassPalette, rng: () => number, count: number) {
  for (let i = 0; i < count; i++) {
    const x = randInt(rng, 4, 27);
    const y = randInt(rng, 4, 27);
    const c = shade(p.base, 0.13);

    px(ctx, x, y, 1, 1, c);
    px(ctx, x + 1, y, 1, 1, c);
    px(ctx, x, y + 1, 1, 1, c);
    px(ctx, x + 1, y + 1, 1, 1, p.dark);
  }
}

function drawPebbles(ctx: CanvasRenderingContext2D, p: GrassPalette, rng: () => number, count: number) {
  for (let i = 0; i < count; i++) {
    const x = randInt(rng, 4, 27);
    const y = randInt(rng, 4, 27);

    px(ctx, x, y, 2, 1, p.pebble);
    px(ctx, x, y + 1, 1, 1, p.pebbleDark);
  }
}

function drawMossPatches(ctx: CanvasRenderingContext2D, p: GrassPalette, rng: () => number, count: number) {
  for (let i = 0; i < count; i++) {
    const x = randInt(rng, 4, 24);
    const y = randInt(rng, 4, 24);
    const w = randInt(rng, 3, 6);
    const h = randInt(rng, 2, 4);

    px(ctx, x, y, w, h, p.moss);
    px(ctx, x + 1, y, Math.max(1, w - 2), 1, shade(p.moss, 0.06));
    px(ctx, x, y + h - 1, w, 1, shade(p.moss, -0.05));
  }
}

function drawSoftPathGrass(ctx: CanvasRenderingContext2D, p: GrassPalette, rng: () => number) {
  const cx = randInt(rng, 12, 20);
  const cy = randInt(rng, 12, 20);

  for (let y = 5; y <= 26; y++) {
    for (let x = 5; x <= 26; x++) {
      const dx = (x - cx) / 10;
      const dy = (y - cy) / 7;
      const d = dx * dx + dy * dy;

      if (d < 1.0 && rng() < 0.72) {
        px(ctx, x, y, 1, 1, d < 0.45 ? p.pathLight : p.path);
      }
    }
  }
}

function drawVerySubtleTileBorderNeutralizer(ctx: CanvasRenderingContext2D, p: GrassPalette) {
  for (let i = 0; i < 32; i++) {
    px(ctx, i, 0, 1, 1, p.base);
    px(ctx, i, 31, 1, 1, p.base);
    px(ctx, 0, i, 1, 1, p.base);
    px(ctx, 31, i, 1, 1, p.base);
  }
}

/* ============================================================
   Map Generation
   ============================================================ */

function generateMap(seed: string, width: number, height: number): string[][] {
  const rng = makeRng(seed + ":map");
  const map: string[][] = [];

  const noiseGrid = makeNoiseGrid(seed + ":noise", 6, 6);

  for (let y = 0; y < height; y++) {
    const row: string[] = [];

    for (let x = 0; x < width; x++) {
      const nx = (x / Math.max(1, width)) * 6;
      const ny = (y / Math.max(1, height)) * 6;
      const n = valueNoiseWrapped(noiseGrid, nx, ny);

      let tileId: string;

      if (n < 0.22) {
        tileId = "grass_moss";
      } else if (n < 0.36) {
        tileId = "grass_short";
      } else if (n < 0.62) {
        tileId = pickWeighted(rng, [
          { value: "grass_plain", weight: 60 },
          { value: "grass_short", weight: 20 },
          { value: "grass_tufts", weight: 15 },
          { value: "grass_clover", weight: 5 },
        ]);
      } else if (n < 0.78) {
        tileId = pickWeighted(rng, [
          { value: "grass_plain", weight: 45 },
          { value: "grass_tufts", weight: 30 },
          { value: "grass_clover", weight: 15 },
          { value: "grass_flowers", weight: 10 },
        ]);
      } else {
        tileId = pickWeighted(rng, [
          { value: "grass_tufts", weight: 35 },
          { value: "grass_flowers", weight: 15 },
          { value: "grass_pebbles", weight: 10 },
          { value: "grass_plain", weight: 40 },
        ]);
      }

      if (rng() < 0.035) {
        tileId = "grass_soft_path";
      }

      row.push(tileId);
    }

    map.push(row);
  }

  addFlowerClusters(seed, map, width, height);
  addSoftPathPatches(seed, map, width, height);

  return map;
}

function addFlowerClusters(seed: string, map: string[][], width: number, height: number) {
  const rng = makeRng(seed + ":flower-clusters");
  const clusterCount = Math.max(1, Math.floor((width * height) / 140));

  for (let c = 0; c < clusterCount; c++) {
    const cx = randInt(rng, 0, width - 1);
    const cy = randInt(rng, 0, height - 1);
    const radius = randInt(rng, 1, 2);

    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;

        const dx = x - cx;
        const dy = y - cy;

        if (dx * dx + dy * dy <= radius * radius + 0.5 && rng() < 0.55) {
          map[y][x] = "grass_flowers";
        }
      }
    }
  }
}

function addSoftPathPatches(seed: string, map: string[][], width: number, height: number) {
  const rng = makeRng(seed + ":path-patches");
  const patchCount = Math.max(1, Math.floor((width * height) / 180));

  for (let c = 0; c < patchCount; c++) {
    const cx = randInt(rng, 0, width - 1);
    const cy = randInt(rng, 0, height - 1);

    for (let i = 0; i < randInt(rng, 3, 7); i++) {
      const x = cx + randInt(rng, -2, 2);
      const y = cy + randInt(rng, -2, 2);

      if (x < 0 || y < 0 || x >= width || y >= height) continue;

      if (rng() < 0.65) {
        map[y][x] = "grass_soft_path";
      }
    }
  }
}

/* ============================================================
   Web Component Definition
   ============================================================ */

export class FloorElement extends HTMLElement {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;

  static get observedAttributes() {
    return ["seed", "width", "height"];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: inline-block;
        width: 100%;
        height: 100%;
      }
      canvas {
        display: block;
        width: 100%;
        height: 100%;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
      }
    `;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    shadow.appendChild(style);
    shadow.appendChild(this.canvas);
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  get seed(): string {
    return this.getAttribute("seed") || "grassland-001";
  }

  set seed(value: string) {
    this.setAttribute("seed", value);
  }

  get width(): number {
    return parseInt(this.getAttribute("width") || "16", 10);
  }

  set width(value: number) {
    this.setAttribute("width", value.toString());
  }

  get height(): number {
    return parseInt(this.getAttribute("height") || "10", 10);
  }

  set height(value: number) {
    this.setAttribute("height", value.toString());
  }

  private render() {
    if (!this.isConnected || !this.ctx) return;

    const seed = this.seed;
    const w = this.width;
    const h = this.height;

    this.canvas.width = w * TILE_SIZE;
    this.canvas.height = h * TILE_SIZE;

    const tileset = generateTileset(seed);
    const map = generateMap(seed, w, h);

    const tileLookup: { [id: string]: HTMLCanvasElement } = {};
    for (const tile of tileset.tiles) {
      tileLookup[tile.id] = tile.canvas;
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const id = map[y][x];
        const tileCanvas = tileLookup[id];
        if (tileCanvas) {
          this.ctx.drawImage(tileCanvas, x * TILE_SIZE, y * TILE_SIZE);
        }
      }
    }
  }

  static define() {
    if (customElements.get("floor-element")) return;
    customElements.define("floor-element", FloorElement);
  }
}
