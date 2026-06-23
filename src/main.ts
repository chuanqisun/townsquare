import { CharacterElement } from "./character-element";
import { FloorElement } from "./floor-element";
import "./style.css";

// Define the custom elements
CharacterElement.define();
FloorElement.define();

document.addEventListener("DOMContentLoaded", () => {
  const floor = document.getElementById("floor") as FloorElement;
  const board = document.getElementById("gameBoard") as HTMLDivElement;
  const worldSeedInput = document.getElementById("worldSeed") as HTMLInputElement;
  const mapWidthInput = document.getElementById("mapWidth") as HTMLInputElement;
  const mapHeightInput = document.getElementById("mapHeight") as HTMLInputElement;
  const dimensionsLabel = document.getElementById("dimensionsLabel") as HTMLSpanElement;

  const regenFloorBtn = document.getElementById("regenFloorBtn") as HTMLButtonElement;
  const randomFloorBtn = document.getElementById("randomFloorBtn") as HTMLButtonElement;
  const addCharBtn = document.getElementById("addCharBtn") as HTMLButtonElement;
  const clearCharBtn = document.getElementById("clearCharBtn") as HTMLButtonElement;
  const scrambleCharBtn = document.getElementById("scrambleCharBtn") as HTMLButtonElement;

  const GRID_SCALE = 2; // Fixed multiplier for pixel art sharpness

  // Initialize CSS Grid variables on the board
  function updateBoardDimensions() {
    const w = parseInt(mapWidthInput.value, 10) || 16;
    const h = parseInt(mapHeightInput.value, 10) || 10;

    board.style.setProperty("--grid-width", w.toString());
    board.style.setProperty("--grid-height", h.toString());
    board.style.setProperty("--grid-scale", GRID_SCALE.toString());

    // Update floor element attributes
    floor.setAttribute("width", w.toString());
    floor.setAttribute("height", h.toString());

    dimensionsLabel.textContent = `${w * 32 * GRID_SCALE} x ${h * 32 * GRID_SCALE} px (${w}x${h} tiles, ${GRID_SCALE}x scale)`;

    // Keep characters inside the board if size is shrunk
    const chars = board.querySelectorAll("character-element");
    chars.forEach((char) => {
      const charEl = char as HTMLElement;
      const cx = parseInt(charEl.style.getPropertyValue("--x") || "0", 10);
      const cy = parseInt(charEl.style.getPropertyValue("--y") || "0", 10);
      if (cx >= w) charEl.style.setProperty("--x", (w - 1).toString());
      if (cy >= h) charEl.style.setProperty("--y", (h - 1).toString());
    });
  }

  // Update floor seed
  function updateFloorSeed(seed: string) {
    floor.setAttribute("seed", seed);
    worldSeedInput.value = seed;
  }

  // Make a character-element draggable on the board
  function makeDraggable(charEl: HTMLElement) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startTileX = 0;
    let startTileY = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const scale = GRID_SCALE;
      const tileSize = 32 * scale;

      const deltaTileX = dx / tileSize;
      const deltaTileY = dy / tileSize;

      let targetTileX = startTileX + deltaTileX;
      let targetTileY = startTileY + deltaTileY;

      const w = parseInt(mapWidthInput.value, 10) || 16;
      const h = parseInt(mapHeightInput.value, 10) || 10;

      targetTileX = Math.max(0, Math.min(w - 1, targetTileX));
      targetTileY = Math.max(0, Math.min(h - 1, targetTileY));

      charEl.style.setProperty("--x", targetTileX.toString());
      charEl.style.setProperty("--y", targetTileY.toString());
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      charEl.style.cursor = "grab";

      const currentTileX = parseFloat(charEl.style.getPropertyValue("--x") || "0");
      const currentTileY = parseFloat(charEl.style.getPropertyValue("--y") || "0");

      charEl.style.setProperty("--x", Math.round(currentTileX).toString());
      charEl.style.setProperty("--y", Math.round(currentTileY).toString());

      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    charEl.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return; // Only drag with left click
      e.preventDefault();
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startTileX = parseFloat(charEl.style.getPropertyValue("--x") || "0");
      startTileY = parseFloat(charEl.style.getPropertyValue("--y") || "0");
      charEl.style.cursor = "grabbing";

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }

  // Double click to randomize a single character
  function makeInteractive(charEl: HTMLElement) {
    charEl.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const newSeed = "seed-" + Math.floor(Math.random() * 1e9);
      charEl.setAttribute("seed", newSeed);
    });
  }

  // Create a character element and place it
  function spawnCharacter(seed: string, tx: number, ty: number) {
    const charEl = document.createElement("character-element") as HTMLElement;
    charEl.setAttribute("seed", seed);
    charEl.style.setProperty("--x", tx.toString());
    charEl.style.setProperty("--y", ty.toString());
    charEl.style.cursor = "grab";

    makeDraggable(charEl);
    makeInteractive(charEl);

    board.appendChild(charEl);
  }

  // Spawn random character within current dimensions
  function spawnRandomCharacter() {
    const w = parseInt(mapWidthInput.value, 10) || 16;
    const h = parseInt(mapHeightInput.value, 10) || 10;
    const tx = Math.floor(Math.random() * w);
    const ty = Math.floor(Math.random() * h);
    const randSeed = "char-" + Math.floor(Math.random() * 1e9);
    spawnCharacter(randSeed, tx, ty);
  }

  // Wire up event listeners
  regenFloorBtn.addEventListener("click", () => {
    updateBoardDimensions();
    updateFloorSeed(worldSeedInput.value);
  });

  randomFloorBtn.addEventListener("click", () => {
    const randSeed = "townsquare-" + Math.floor(Math.random() * 1e5);
    updateFloorSeed(randSeed);
    updateBoardDimensions();
  });

  addCharBtn.addEventListener("click", () => {
    spawnRandomCharacter();
  });

  clearCharBtn.addEventListener("click", () => {
    const chars = board.querySelectorAll("character-element");
    chars.forEach((char) => char.remove());
  });

  scrambleCharBtn.addEventListener("click", () => {
    const chars = board.querySelectorAll("character-element");
    chars.forEach((char) => {
      const randSeed = "scrambled-" + Math.floor(Math.random() * 1e9);
      char.setAttribute("seed", randSeed);
    });
  });

  // Watch input changes
  mapWidthInput.addEventListener("change", updateBoardDimensions);
  mapHeightInput.addEventListener("change", updateBoardDimensions);

  // Initialize
  updateBoardDimensions();
  updateFloorSeed("townsquare-001");

  // Spawn initial characters
  spawnCharacter("hero-knight", 4, 3);
  spawnCharacter("wizard-old", 11, 4);
  spawnCharacter("alien-visitor", 7, 7);
  spawnCharacter("orc-warrior", 13, 2);
});
