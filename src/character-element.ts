/**
 * Web component that renders a pixel art styled character
 * The character's identity is randomly generated from a hash key. If omitted, it will be random
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

function makeRng(seedString: string): () => number {
  return mulberry32(hashString(seedString));
}

/* ============================================================
   Trait Definitions & Tables
   ============================================================ */

interface Trait {
  id: string;
  label: string;
  weight: number;
  requires?: string[];
  excludes?: string[];
  customValid?: (ctx: any) => boolean;
}

function isValidTrait(item: Trait, context: any): boolean {
  if (item.requires) {
    for (const req of item.requires) {
      const [key, val] = req.split(":");
      if (!context[key] || context[key].id !== val) return false;
    }
  }

  if (item.excludes) {
    for (const ex of item.excludes) {
      const [key, val] = ex.split(":");
      if (context[key] && context[key].id === val) return false;
    }
  }

  if (item.customValid && !item.customValid(context)) {
    return false;
  }

  return true;
}

function pickWeighted(items: Trait[], rng: () => number, context: any = {}): Trait {
  const valid = items.filter((item) => isValidTrait(item, context));
  const total = valid.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;

  for (const item of valid) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }

  return valid[valid.length - 1];
}

const speciesTable: Trait[] = [
  { id: "human", label: "Human", weight: 45 },
  { id: "orc", label: "Orc", weight: 18 },
  { id: "robot", label: "Robot", weight: 12 },
  { id: "skeleton", label: "Skeleton", weight: 10 },
  { id: "alien", label: "Alien", weight: 8 },
  { id: "demon", label: "Demon", weight: 7 },
];

const bodyTable: Trait[] = [
  { id: "normal", label: "Normal", weight: 45 },
  { id: "small", label: "Small", weight: 20 },
  { id: "stocky", label: "Stocky", weight: 20 },
  { id: "tall", label: "Tall", weight: 15 },
];

const classTable: Trait[] = [
  { id: "villager", label: "Villager", weight: 35 },
  { id: "fighter", label: "Fighter", weight: 20 },
  { id: "wizard", label: "Wizard", weight: 15 },
  { id: "rogue", label: "Rogue", weight: 15 },
  { id: "royal", label: "Royal", weight: 5 },
  { id: "monk", label: "Monk", weight: 10 },
];

const eyesTable: Trait[] = [
  { id: "dots", label: "Dot Eyes", weight: 35 },
  { id: "sleepy", label: "Sleepy Eyes", weight: 14 },
  { id: "angry", label: "Angry Eyes", weight: 14 },
  { id: "glow", label: "Glowing Eyes", weight: 8 },
  { id: "visor", label: "Robot Visor", weight: 6, requires: ["species:robot"] },
  { id: "hollow", label: "Hollow Sockets", weight: 8, requires: ["species:skeleton"] },
  { id: "oneeye", label: "One Eye", weight: 5, requires: ["species:alien"] },
  { id: "shades", label: "Shades", weight: 10 },
];

const mouthTable: Trait[] = [
  { id: "neutral", label: "Neutral", weight: 35 },
  { id: "smile", label: "Smile", weight: 20 },
  { id: "frown", label: "Frown", weight: 15 },
  { id: "fangs", label: "Fangs", weight: 10, customValid: (ctx) => ["orc", "demon", "alien"].includes(ctx.species.id) },
  { id: "grill", label: "Robot Grill", weight: 8, requires: ["species:robot"] },
  { id: "none", label: "No Mouth", weight: 12 },
];

const hairTable: Trait[] = [
  { id: "none", label: "None", weight: 24 },
  {
    id: "short",
    label: "Short Hair",
    weight: 20,
    customValid: (ctx) => ["human", "orc", "demon"].includes(ctx.species.id),
  },
  { id: "bob", label: "Bob Hair", weight: 12, customValid: (ctx) => ["human", "orc"].includes(ctx.species.id) },
  {
    id: "spiky",
    label: "Spiky Hair",
    weight: 12,
    customValid: (ctx) => ["human", "orc", "demon"].includes(ctx.species.id),
  },
  {
    id: "mohawk",
    label: "Mohawk",
    weight: 8,
    customValid: (ctx) => ["human", "orc", "demon"].includes(ctx.species.id),
  },
  { id: "tendrils", label: "Tendrils", weight: 6, requires: ["species:alien"] },
  { id: "bolts", label: "Head Bolts", weight: 8, requires: ["species:robot"] },
  { id: "flame", label: "Flame Hair", weight: 3, requires: ["species:demon"] },
];

const hatTable: Trait[] = [
  { id: "none", label: "None", weight: 45 },
  { id: "cap", label: "Cap", weight: 16 },
  { id: "hood", label: "Hood", weight: 13 },
  { id: "helmet", label: "Helmet", weight: 10 },
  { id: "crown", label: "Crown", weight: 3, requires: ["class:royal"] },
  { id: "wizard", label: "Wizard Hat", weight: 6, requires: ["class:wizard"] },
  { id: "halo", label: "Halo", weight: 2, customValid: (ctx) => ctx.species.id !== "demon" },
  { id: "horns", label: "Horns", weight: 5, customValid: (ctx) => ["demon", "orc", "alien"].includes(ctx.species.id) },
];

const outfitTable: Trait[] = [
  { id: "shirt", label: "Shirt", weight: 32 },
  { id: "jacket", label: "Jacket", weight: 20 },
  { id: "robe", label: "Robe", weight: 12, customValid: (ctx) => ["wizard", "monk", "royal"].includes(ctx.class.id) },
  { id: "armor", label: "Armor", weight: 12, customValid: (ctx) => ["fighter", "royal"].includes(ctx.class.id) },
  { id: "cloak", label: "Cloak", weight: 12, customValid: (ctx) => ["rogue", "wizard", "monk"].includes(ctx.class.id) },
  { id: "overalls", label: "Overalls", weight: 12 },
];

const itemTable: Trait[] = [
  { id: "none", label: "None", weight: 40 },
  { id: "sword", label: "Sword", weight: 10, customValid: (ctx) => ["fighter", "royal"].includes(ctx.class.id) },
  { id: "staff", label: "Staff", weight: 10, customValid: (ctx) => ["wizard", "monk"].includes(ctx.class.id) },
  { id: "dagger", label: "Dagger", weight: 8, requires: ["class:rogue"] },
  { id: "book", label: "Book", weight: 8, customValid: (ctx) => ["wizard", "monk", "villager"].includes(ctx.class.id) },
  { id: "lantern", label: "Lantern", weight: 8 },
  { id: "shield", label: "Shield", weight: 8, customValid: (ctx) => ["fighter", "royal"].includes(ctx.class.id) },
  {
    id: "orb",
    label: "Orb",
    weight: 3,
    customValid: (ctx) =>
      ["wizard", "alien", "demon"].includes(ctx.class.id) || ["alien", "demon"].includes(ctx.species.id),
  },
  { id: "flower", label: "Flower", weight: 5 },
];

/* ============================================================
   Palettes
   ============================================================ */

const palettes: {
  skin: { [key: string]: string[][] };
  clothes: string[][];
  hair: string[][];
  metal: string[];
  black: string;
  white: string;
  outline: string;
  shadow: string;
} = {
  skin: {
    human: [
      ["#f1c27d", "#c68642", "#8d5524"],
      ["#ffdbac", "#d49a6a", "#8d5524"],
      ["#c68642", "#8d5524", "#5c3420"],
      ["#8d5524", "#5c3420", "#2d1b12"],
    ],
    orc: [
      ["#8bc34a", "#558b2f", "#33691e"],
      ["#6fbf73", "#3d8b40", "#1b5e20"],
      ["#9ccc65", "#689f38", "#33691e"],
    ],
    robot: [
      ["#b0bec5", "#78909c", "#37474f"],
      ["#90a4ae", "#607d8b", "#263238"],
      ["#cfd8dc", "#90a4ae", "#455a64"],
    ],
    skeleton: [
      ["#eeeecc", "#c9c9a3", "#77775f"],
      ["#f5f5dc", "#d6d6b2", "#88886d"],
    ],
    alien: [
      ["#80deea", "#26c6da", "#006064"],
      ["#ce93d8", "#ab47bc", "#4a148c"],
      ["#a5d6a7", "#66bb6a", "#1b5e20"],
    ],
    demon: [
      ["#ef5350", "#c62828", "#7f0000"],
      ["#8e24aa", "#5e35b1", "#311b92"],
      ["#ff7043", "#d84315", "#7f2700"],
    ],
  },
  clothes: [
    ["#42a5f5", "#1976d2", "#0d47a1"],
    ["#ef5350", "#c62828", "#7f0000"],
    ["#66bb6a", "#2e7d32", "#1b5e20"],
    ["#ffee58", "#fbc02d", "#f57f17"],
    ["#ab47bc", "#7b1fa2", "#4a148c"],
    ["#78909c", "#455a64", "#263238"],
    ["#ff8a65", "#e64a19", "#bf360c"],
  ],
  hair: [
    ["#3e2723", "#1b0000"],
    ["#795548", "#3e2723"],
    ["#fdd835", "#f9a825"],
    ["#e53935", "#8e0000"],
    ["#212121", "#000000"],
    ["#ffffff", "#bdbdbd"],
    ["#26c6da", "#00838f"],
  ],
  metal: ["#cfd8dc", "#90a4ae", "#455a64"],
  black: "#111111",
  white: "#f5f5f5",
  outline: "#1a1a1a",
  shadow: "#00000033",
};

interface CharacterPalette {
  skinBase: string;
  skinShade: string;
  skinDark: string;
  clothBase: string;
  clothShade: string;
  clothDark: string;
  hairBase: string;
  hairShade: string;
  outline: string;
  eye: string;
  eyeGlow: string;
  white: string;
  metal0: string;
  metal1: string;
  metal2: string;
}

function pickPalette(character: CharacterTraits, rng: () => number): CharacterPalette {
  const skinList = palettes.skin[character.species.id];
  const skin = skinList[Math.floor(rng() * skinList.length)];
  const clothes = palettes.clothes[Math.floor(rng() * palettes.clothes.length)];
  const hair = palettes.hair[Math.floor(rng() * palettes.hair.length)];

  return {
    skinBase: skin[0],
    skinShade: skin[1],
    skinDark: skin[2],
    clothBase: clothes[0],
    clothShade: clothes[1],
    clothDark: clothes[2],
    hairBase: hair[0],
    hairShade: hair[1],
    outline: palettes.outline,
    eye: character.eyes && character.eyes.id === "glow" ? "#76ff03" : "#111111",
    eyeGlow: "#76ff03",
    white: "#f5f5f5",
    metal0: palettes.metal[0],
    metal1: palettes.metal[1],
    metal2: palettes.metal[2],
  };
}

/* ============================================================
   Character Generation Logic
   ============================================================ */

interface CharacterTraits {
  species: Trait;
  body: Trait;
  class: Trait;
  eyes: Trait;
  mouth: Trait;
  hair: Trait;
  hat: Trait;
  outfit: Trait;
  item: Trait;
  palette: CharacterPalette;
}

interface Character {
  seed: string;
  traits: CharacterTraits;
}

function generateCharacter(seed: string): Character {
  const rng = makeRng(seed);
  const ctx: any = {};

  ctx.species = pickWeighted(speciesTable, rng, ctx);
  ctx.body = pickWeighted(bodyTable, rng, ctx);
  ctx.class = pickWeighted(classTable, rng, ctx);

  ctx.eyes = pickWeighted(eyesTable, rng, ctx);
  ctx.mouth = pickWeighted(mouthTable, rng, ctx);

  ctx.hair = pickWeighted(hairTable, rng, ctx);
  ctx.hat = pickWeighted(hatTable, rng, ctx);

  // Hat compatibility: hard override for big hats.
  if (["hood", "helmet", "wizard"].includes(ctx.hat.id)) {
    if (!["bolts", "tendrils"].includes(ctx.hair.id)) {
      ctx.hair = hairTable.find((h) => h.id === "none") || hairTable[0];
    }
  }

  ctx.outfit = pickWeighted(outfitTable, rng, ctx);
  ctx.item = pickWeighted(itemTable, rng, ctx);
  ctx.palette = pickPalette(ctx as CharacterTraits, rng);

  return {
    seed,
    traits: ctx as CharacterTraits,
  };
}

/* ============================================================
   Pixel Drawing Helpers & Dimensions
   ============================================================ */

interface Dims {
  x: number;
  y: number;
  w: number;
  h: number;
}

function bodyDims(bodyId: string): Dims {
  if (bodyId === "small") return { x: 11, y: 19, w: 10, h: 9 };
  if (bodyId === "stocky") return { x: 8, y: 18, w: 16, h: 10 };
  if (bodyId === "tall") return { x: 10, y: 16, w: 12, h: 12 };
  return { x: 10, y: 18, w: 12, h: 10 };
}

function headDims(bodyId: string): Dims {
  if (bodyId === "small") return { x: 10, y: 8, w: 12, h: 11 };
  if (bodyId === "stocky") return { x: 9, y: 7, w: 14, h: 12 };
  if (bodyId === "tall") return { x: 10, y: 5, w: 12, h: 12 };
  return { x: 10, y: 7, w: 12, h: 12 };
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  px(ctx, x, y, w, h, color);
}

function drawBackground(ctx: CanvasRenderingContext2D, t: CharacterTraits) {
  const bgBySpecies: { [key: string]: string } = {
    human: "#d7ccc8",
    orc: "#c5e1a5",
    robot: "#cfd8dc",
    skeleton: "#eeeeee",
    alien: "#d1c4e9",
    demon: "#ffcdd2",
  };

  rect(ctx, 0, 0, 32, 32, bgBySpecies[t.species.id] || "#ddd");

  rect(ctx, 0, 0, 32, 1, "#00000010");
  rect(ctx, 0, 31, 32, 1, "#00000018");
  rect(ctx, 0, 0, 1, 32, "#00000010");
  rect(ctx, 31, 0, 1, 32, "#00000010");
}

function drawShadow(ctx: CanvasRenderingContext2D) {
  rect(ctx, 10, 28, 12, 2, "#00000030");
  rect(ctx, 8, 29, 16, 1, "#00000020");
}

function drawBody(ctx: CanvasRenderingContext2D, t: CharacterTraits, p: CharacterPalette) {
  const b = bodyDims(t.body.id);

  // legs
  rect(ctx, b.x + 2, b.y + b.h - 1, 3, 4, p.outline);
  rect(ctx, b.x + b.w - 5, b.y + b.h - 1, 3, 4, p.outline);
  rect(ctx, b.x + 2, b.y + b.h - 1, 2, 3, p.clothDark);
  rect(ctx, b.x + b.w - 4, b.y + b.h - 1, 2, 3, p.clothDark);

  // arms
  rect(ctx, b.x - 2, b.y + 2, 2, 6, p.outline);
  rect(ctx, b.x + b.w, b.y + 2, 2, 6, p.outline);
  rect(ctx, b.x - 1, b.y + 3, 1, 4, p.skinShade);
  rect(ctx, b.x + b.w, b.y + 3, 1, 4, p.skinShade);

  // torso outline
  rect(ctx, b.x, b.y, b.w, b.h, p.outline);
  rect(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 1, p.clothBase);
  rect(ctx, b.x + 1, b.y + b.h - 3, b.w - 2, 2, p.clothShade);
}

function drawOutfit(ctx: CanvasRenderingContext2D, t: CharacterTraits, p: CharacterPalette) {
  const b = bodyDims(t.body.id);

  if (t.outfit.id === "jacket") {
    rect(ctx, b.x + 1, b.y + 1, 3, b.h - 1, p.clothDark);
    rect(ctx, b.x + b.w - 4, b.y + 1, 3, b.h - 1, p.clothDark);
    rect(ctx, b.x + 5, b.y + 2, 2, b.h - 3, "#eeeeee");
  }

  if (t.outfit.id === "robe") {
    rect(ctx, b.x + 1, b.y + 1, b.w - 2, b.h + 2, p.clothDark);
    rect(ctx, b.x + 3, b.y + 1, b.w - 6, b.h + 2, p.clothBase);
    rect(ctx, b.x + Math.floor(b.w / 2), b.y + 2, 1, b.h + 1, "#00000055");
  }

  if (t.outfit.id === "armor") {
    rect(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 1, p.metal1);
    rect(ctx, b.x + 2, b.y + 2, b.w - 4, 2, p.metal0);
    rect(ctx, b.x + 2, b.y + 5, b.w - 4, 1, p.metal2);
  }

  if (t.outfit.id === "cloak") {
    rect(ctx, b.x - 1, b.y + 1, b.w + 2, b.h + 2, p.clothDark);
    rect(ctx, b.x + 2, b.y + 1, b.w - 4, b.h, p.clothBase);
  }

  if (t.outfit.id === "overalls") {
    rect(ctx, b.x + 3, b.y + 1, 2, b.h - 1, p.clothDark);
    rect(ctx, b.x + b.w - 5, b.y + 1, 2, b.h - 1, p.clothDark);
    rect(ctx, b.x + 2, b.y + 5, b.w - 4, b.h - 5, p.clothShade);
  }
}

function drawHead(ctx: CanvasRenderingContext2D, t: CharacterTraits, p: CharacterPalette) {
  const h = headDims(t.body.id);

  if (t.species.id === "robot") {
    rect(ctx, h.x, h.y, h.w, h.h, p.outline);
    rect(ctx, h.x + 1, h.y + 1, h.w - 2, h.h - 2, p.metal0);
    rect(ctx, h.x + 2, h.y + h.h - 3, h.w - 4, 2, p.metal1);
    return;
  }

  if (t.species.id === "skeleton") {
    rect(ctx, h.x + 1, h.y, h.w - 2, h.h, p.outline);
    rect(ctx, h.x + 2, h.y + 1, h.w - 4, h.h - 2, p.skinBase);
    rect(ctx, h.x + 3, h.y + h.h - 2, h.w - 6, 2, p.skinShade);
    return;
  }

  // rounded-ish head
  rect(ctx, h.x + 1, h.y, h.w - 2, 1, p.outline);
  rect(ctx, h.x, h.y + 1, h.w, h.h - 2, p.outline);
  rect(ctx, h.x + 1, h.y + h.h - 1, h.w - 2, 1, p.outline);

  rect(ctx, h.x + 2, h.y + 1, h.w - 4, 1, p.skinBase);
  rect(ctx, h.x + 1, h.y + 2, h.w - 2, h.h - 4, p.skinBase);
  rect(ctx, h.x + 2, h.y + h.h - 2, h.w - 4, 1, p.skinShade);

  // nose-ish pixel
  rect(ctx, h.x + Math.floor(h.w / 2), h.y + 6, 1, 2, p.skinShade);
}

function drawSpeciesFeatures(ctx: CanvasRenderingContext2D, t: CharacterTraits, p: CharacterPalette) {
  const h = headDims(t.body.id);

  if (t.species.id === "orc") {
    // ears
    rect(ctx, h.x - 2, h.y + 4, 2, 3, p.outline);
    rect(ctx, h.x + h.w, h.y + 4, 2, 3, p.outline);
    rect(ctx, h.x - 1, h.y + 5, 1, 1, p.skinBase);
    rect(ctx, h.x + h.w, h.y + 5, 1, 1, p.skinBase);

    // tusks
    rect(ctx, h.x + 4, h.y + 9, 1, 2, p.white);
    rect(ctx, h.x + h.w - 5, h.y + 9, 1, 2, p.white);
  }

  if (t.species.id === "alien") {
    // antennae
    rect(ctx, h.x + 3, h.y - 2, 1, 3, p.outline);
    rect(ctx, h.x + h.w - 4, h.y - 2, 1, 3, p.outline);
    rect(ctx, h.x + 2, h.y - 3, 2, 1, p.skinBase);
    rect(ctx, h.x + h.w - 4, h.y - 3, 2, 1, p.skinBase);
  }

  if (t.species.id === "demon") {
    // small inherent horns if not wearing horn trait
    if (t.hat.id !== "horns") {
      rect(ctx, h.x + 2, h.y - 1, 2, 2, p.outline);
      rect(ctx, h.x + h.w - 4, h.y - 1, 2, 2, p.outline);
      rect(ctx, h.x + 3, h.y - 2, 1, 1, "#fff3e0");
      rect(ctx, h.x + h.w - 3, h.y - 2, 1, 1, "#fff3e0");
    }
  }

  if (t.species.id === "robot") {
    // side bolts
    rect(ctx, h.x - 1, h.y + 4, 1, 4, p.metal2);
    rect(ctx, h.x + h.w, h.y + 4, 1, 4, p.metal2);
  }

  if (t.species.id === "skeleton") {
    // jaw teeth
    for (let x = h.x + 4; x < h.x + h.w - 3; x += 2) {
      rect(ctx, x, h.y + h.h - 3, 1, 2, p.outline);
    }
  }
}

function drawFace(ctx: CanvasRenderingContext2D, t: CharacterTraits, p: CharacterPalette) {
  const h = headDims(t.body.id);
  const cy = h.y + 5;

  // eyes
  if (t.eyes.id === "dots") {
    rect(ctx, h.x + 3, cy, 1, 1, p.eye);
    rect(ctx, h.x + h.w - 4, cy, 1, 1, p.eye);
  }

  if (t.eyes.id === "sleepy") {
    rect(ctx, h.x + 3, cy, 3, 1, p.eye);
    rect(ctx, h.x + h.w - 6, cy, 3, 1, p.eye);
  }

  if (t.eyes.id === "angry") {
    rect(ctx, h.x + 3, cy, 2, 1, p.eye);
    rect(ctx, h.x + 4, cy + 1, 1, 1, p.eye);
    rect(ctx, h.x + h.w - 5, cy, 2, 1, p.eye);
    rect(ctx, h.x + h.w - 5, cy + 1, 1, 1, p.eye);
  }

  if (t.eyes.id === "glow") {
    rect(ctx, h.x + 3, cy, 2, 2, p.eyeGlow);
    rect(ctx, h.x + h.w - 5, cy, 2, 2, p.eyeGlow);
    rect(ctx, h.x + 2, cy - 1, 4, 4, "#76ff0333");
    rect(ctx, h.x + h.w - 6, cy - 1, 4, 4, "#76ff0333");
  }

  if (t.eyes.id === "visor") {
    rect(ctx, h.x + 2, cy - 1, h.w - 4, 3, p.outline);
    rect(ctx, h.x + 3, cy, h.w - 6, 1, "#00e5ff");
  }

  if (t.eyes.id === "hollow") {
    rect(ctx, h.x + 3, cy - 1, 3, 3, p.outline);
    rect(ctx, h.x + h.w - 6, cy - 1, 3, 3, p.outline);
  }

  if (t.eyes.id === "oneeye") {
    rect(ctx, h.x + Math.floor(h.w / 2) - 1, cy - 1, 3, 3, p.white);
    rect(ctx, h.x + Math.floor(h.w / 2), cy, 1, 1, p.eye);
  }

  if (t.eyes.id === "shades") {
    rect(ctx, h.x + 2, cy - 1, 4, 3, p.outline);
    rect(ctx, h.x + h.w - 6, cy - 1, 4, 3, p.outline);
    rect(ctx, h.x + 6, cy, h.w - 12, 1, p.outline);
  }

  // mouth
  const my = h.y + 9;

  if (t.mouth.id === "neutral") {
    rect(ctx, h.x + 5, my, h.w - 10, 1, p.outline);
  }

  if (t.mouth.id === "smile") {
    rect(ctx, h.x + 4, my, 1, 1, p.outline);
    rect(ctx, h.x + 5, my + 1, h.w - 10, 1, p.outline);
    rect(ctx, h.x + h.w - 5, my, 1, 1, p.outline);
  }

  if (t.mouth.id === "frown") {
    rect(ctx, h.x + 4, my + 1, 1, 1, p.outline);
    rect(ctx, h.x + 5, my, h.w - 10, 1, p.outline);
    rect(ctx, h.x + h.w - 5, my + 1, 1, 1, p.outline);
  }

  if (t.mouth.id === "fangs") {
    rect(ctx, h.x + 4, my, h.w - 8, 1, p.outline);
    rect(ctx, h.x + 5, my + 1, 1, 2, p.white);
    rect(ctx, h.x + h.w - 6, my + 1, 1, 2, p.white);
  }

  if (t.mouth.id === "grill") {
    rect(ctx, h.x + 4, my - 1, h.w - 8, 3, p.outline);
    for (let x = h.x + 5; x < h.x + h.w - 4; x += 2) {
      rect(ctx, x, my, 1, 1, p.metal0);
    }
  }
}

function drawHair(ctx: CanvasRenderingContext2D, t: CharacterTraits, p: CharacterPalette) {
  const h = headDims(t.body.id);

  if (t.hair.id === "none") return;

  if (t.hair.id === "short") {
    rect(ctx, h.x + 1, h.y, h.w - 2, 3, p.hairShade);
    rect(ctx, h.x + 2, h.y + 1, h.w - 4, 2, p.hairBase);
  }

  if (t.hair.id === "bob") {
    rect(ctx, h.x, h.y, h.w, 4, p.hairShade);
    rect(ctx, h.x, h.y + 3, 2, 7, p.hairShade);
    rect(ctx, h.x + h.w - 2, h.y + 3, 2, 7, p.hairShade);
    rect(ctx, h.x + 2, h.y + 1, h.w - 4, 2, p.hairBase);
  }

  if (t.hair.id === "spiky") {
    for (let x = h.x + 1; x < h.x + h.w - 1; x += 3) {
      rect(ctx, x, h.y - 2, 2, 3, p.hairShade);
      rect(ctx, x + 1, h.y - 3, 1, 1, p.hairBase);
    }
    rect(ctx, h.x + 1, h.y, h.w - 2, 2, p.hairShade);
  }

  if (t.hair.id === "mohawk") {
    rect(ctx, h.x + Math.floor(h.w / 2) - 1, h.y - 5, 2, 6, p.hairShade);
    rect(ctx, h.x + Math.floor(h.w / 2), h.y - 5, 1, 5, p.hairBase);
  }

  if (t.hair.id === "tendrils") {
    rect(ctx, h.x + 2, h.y - 1, 2, 4, p.skinDark);
    rect(ctx, h.x + h.w - 4, h.y - 1, 2, 4, p.skinDark);
    rect(ctx, h.x + 4, h.y - 2, 1, 4, p.skinShade);
    rect(ctx, h.x + h.w - 5, h.y - 2, 1, 4, p.skinShade);
  }

  if (t.hair.id === "bolts") {
    rect(ctx, h.x + 2, h.y - 2, 2, 2, p.metal2);
    rect(ctx, h.x + h.w - 4, h.y - 2, 2, 2, p.metal2);
    rect(ctx, h.x + 2, h.y - 3, 2, 1, "#ffeb3b");
    rect(ctx, h.x + h.w - 4, h.y - 3, 2, 1, "#ffeb3b");
  }

  if (t.hair.id === "flame") {
    rect(ctx, h.x + 5, h.y - 5, 2, 6, "#ffeb3b");
    rect(ctx, h.x + 4, h.y - 3, 4, 4, "#ff9800");
    rect(ctx, h.x + 3, h.y - 1, 6, 3, "#f44336");
  }
}

function drawHat(ctx: CanvasRenderingContext2D, t: CharacterTraits, p: CharacterPalette) {
  const h = headDims(t.body.id);

  if (t.hat.id === "none") return;

  if (t.hat.id === "cap") {
    rect(ctx, h.x + 1, h.y - 2, h.w - 2, 3, p.clothDark);
    rect(ctx, h.x + 2, h.y - 3, h.w - 5, 2, p.clothBase);
    rect(ctx, h.x + h.w - 2, h.y - 1, 4, 1, p.clothDark);
  }

  if (t.hat.id === "hood") {
    rect(ctx, h.x - 1, h.y - 1, h.w + 2, h.h + 2, p.clothDark);
    rect(ctx, h.x + 1, h.y + 1, h.w - 2, h.h - 1, p.clothBase);
    rect(ctx, h.x + 2, h.y + 2, h.w - 4, h.h - 3, p.skinBase);
  }

  if (t.hat.id === "helmet") {
    rect(ctx, h.x, h.y - 2, h.w, 6, p.metal2);
    rect(ctx, h.x + 1, h.y - 1, h.w - 2, 4, p.metal0);
    rect(ctx, h.x + 3, h.y + 1, h.w - 6, 1, p.metal2);
  }

  if (t.hat.id === "crown") {
    rect(ctx, h.x + 2, h.y - 2, h.w - 4, 3, "#fbc02d");
    rect(ctx, h.x + 2, h.y - 4, 2, 3, "#fbc02d");
    rect(ctx, h.x + Math.floor(h.w / 2) - 1, h.y - 5, 2, 4, "#fbc02d");
    rect(ctx, h.x + h.w - 4, h.y - 4, 2, 3, "#fbc02d");
    rect(ctx, h.x + Math.floor(h.w / 2), h.y - 3, 1, 1, "#e53935");
  }

  if (t.hat.id === "wizard") {
    rect(ctx, h.x + 3, h.y - 8, h.w - 6, 7, p.clothDark);
    rect(ctx, h.x + 5, h.y - 11, h.w - 10, 4, p.clothBase);
    rect(ctx, h.x + 1, h.y - 2, h.w - 2, 2, p.clothDark);
    rect(ctx, h.x + 2, h.y - 1, h.w - 4, 1, p.clothBase);
  }

  if (t.hat.id === "halo") {
    rect(ctx, h.x + 3, h.y - 5, h.w - 6, 1, "#fff176");
    rect(ctx, h.x + 2, h.y - 4, 2, 1, "#fff176");
    rect(ctx, h.x + h.w - 4, h.y - 4, 2, 1, "#fff176");
  }

  if (t.hat.id === "horns") {
    rect(ctx, h.x + 1, h.y - 1, 3, 3, p.outline);
    rect(ctx, h.x + h.w - 4, h.y - 1, 3, 3, p.outline);
    rect(ctx, h.x + 2, h.y - 3, 2, 3, "#fff3e0");
    rect(ctx, h.x + h.w - 4, h.y - 3, 2, 3, "#fff3e0");
  }
}

function drawBackItem(ctx: CanvasRenderingContext2D, t: CharacterTraits, p: CharacterPalette) {
  const b = bodyDims(t.body.id);

  if (t.item.id === "staff") {
    rect(ctx, b.x + b.w + 3, 8, 1, 20, "#5d4037");
    rect(ctx, b.x + b.w + 2, 7, 3, 3, "#7e57c2");
    rect(ctx, b.x + b.w + 3, 6, 1, 1, "#d1c4e9");
  }

  if (t.item.id === "sword") {
    rect(ctx, b.x + b.w + 2, 13, 1, 12, p.metal0);
    rect(ctx, b.x + b.w + 1, 24, 3, 1, "#795548");
    rect(ctx, b.x + b.w + 2, 25, 1, 3, "#5d4037");
  }

  if (t.item.id === "lantern") {
    rect(ctx, b.x + b.w + 3, 17, 1, 3, "#5d4037");
    rect(ctx, b.x + b.w + 2, 20, 3, 5, p.outline);
    rect(ctx, b.x + b.w + 3, 21, 1, 3, "#ffd54f");
  }
}

function drawFrontItem(ctx: CanvasRenderingContext2D, t: CharacterTraits, p: CharacterPalette) {
  const b = bodyDims(t.body.id);

  if (t.item.id === "dagger") {
    rect(ctx, b.x - 3, 21, 1, 5, p.metal0);
    rect(ctx, b.x - 4, 25, 3, 1, "#795548");
  }

  if (t.item.id === "book") {
    rect(ctx, b.x - 4, 20, 5, 5, p.outline);
    rect(ctx, b.x - 3, 21, 3, 3, "#8d6e63");
    rect(ctx, b.x - 1, 21, 1, 3, "#efebe9");
  }

  if (t.item.id === "shield") {
    rect(ctx, b.x - 5, 19, 5, 7, p.outline);
    rect(ctx, b.x - 4, 20, 3, 5, p.metal1);
    rect(ctx, b.x - 3, 21, 1, 3, p.metal0);
  }

  if (t.item.id === "orb") {
    rect(ctx, b.x + b.w + 1, 20, 4, 4, "#7e57c2");
    rect(ctx, b.x + b.w + 2, 21, 2, 2, "#d1c4e9");
  }

  if (t.item.id === "flower") {
    rect(ctx, b.x + b.w + 2, 20, 1, 6, "#2e7d32");
    rect(ctx, b.x + b.w + 1, 19, 3, 3, "#ec407a");
    rect(ctx, b.x + b.w + 2, 20, 1, 1, "#fff176");
  }
}

function drawHighlights(ctx: CanvasRenderingContext2D, t: CharacterTraits) {
  const h = headDims(t.body.id);
  rect(ctx, h.x + 3, h.y + 2, 2, 1, "#ffffff55");
}

/* ============================================================
   Web Component Definition
   ============================================================ */

export class CharacterElement extends HTMLElement {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;

  static get observedAttributes() {
    return ["seed", "background"];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: inline-block;
        width: 32px;
        height: 32px;
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
    this.canvas.width = 32;
    this.canvas.height = 32;
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
    return this.getAttribute("seed") || "punk-001";
  }

  set seed(value: string) {
    this.setAttribute("seed", value);
  }

  get background(): boolean {
    return this.hasAttribute("background");
  }

  set background(value: boolean) {
    if (value) {
      this.setAttribute("background", "");
    } else {
      this.removeAttribute("background");
    }
  }

  private render() {
    if (!this.isConnected || !this.ctx) return;

    this.ctx.clearRect(0, 0, 32, 32);

    const char = generateCharacter(this.seed);
    const t = char.traits;
    const p = t.palette;

    if (this.background) {
      drawBackground(this.ctx, t);
    }
    drawShadow(this.ctx);

    if (["staff", "sword", "lantern"].includes(t.item.id)) {
      drawBackItem(this.ctx, t, p);
    }

    drawBody(this.ctx, t, p);
    drawOutfit(this.ctx, t, p);
    drawHead(this.ctx, t, p);
    drawSpeciesFeatures(this.ctx, t, p);
    drawHair(this.ctx, t, p);
    drawHat(this.ctx, t, p);
    drawFace(this.ctx, t, p);

    if (!["staff", "sword", "lantern"].includes(t.item.id)) {
      drawFrontItem(this.ctx, t, p);
    }

    drawHighlights(this.ctx, t);
  }

  static define() {
    if (customElements.get("character-element")) return;
    customElements.define("character-element", CharacterElement);
  }
}
