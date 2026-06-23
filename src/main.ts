import { CharacterElement } from "./character-element";
import { FloorElement } from "./floor-element";
import "./style.css";

// Define the custom elements
CharacterElement.define();
FloorElement.define();

document.addEventListener("DOMContentLoaded", () => {
  const floor = document.getElementById("floor") as FloorElement;
  const board = document.getElementById("gameBoard") as HTMLDivElement;
  const dimensionsLabel = document.getElementById("dimensionsLabel") as HTMLSpanElement;
  const regenFloorBtn = document.getElementById("regenFloorBtn") as HTMLButtonElement;

  const previewChar = document.getElementById("previewChar") as HTMLElement;
  const charPreviewBox = document.getElementById("charPreviewBox") as HTMLDivElement;

  const GRID_SCALE = 2; // Fixed multiplier for pixel art sharpness
  const MAP_WIDTH = 16;
  const MAP_HEIGHT = 10;

  // Initialize CSS Grid variables on the board
  function updateBoardDimensions() {
    const w = MAP_WIDTH;
    const h = MAP_HEIGHT;

    board.style.setProperty("--grid-width", w.toString());
    board.style.setProperty("--grid-height", h.toString());
    board.style.setProperty("--grid-scale", GRID_SCALE.toString());

    // Update floor element attributes
    floor.setAttribute("width", w.toString());
    floor.setAttribute("height", h.toString());

    dimensionsLabel.textContent = `${w * 32 * GRID_SCALE} x ${h * 32 * GRID_SCALE} px (${w}x${h} tiles, ${GRID_SCALE}x scale)`;
  }

  // Update floor seed
  function updateFloorSeed(seed: string) {
    floor.setAttribute("seed", seed);
  }

  // Convert screen coordinates to tile coordinates
  function screenToTile(clientX: number, clientY: number): { tx: number; ty: number } {
    const rect = board.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    const tileSize = 32 * GRID_SCALE;
    const tx = relativeX / tileSize;
    const ty = relativeY / tileSize;
    return { tx, ty };
  }

  // Dragging logic that can be programmatically started
  function startDragging(
    charEl: HTMLElement,
    clientX: number,
    clientY: number,
    startTileX: number,
    startTileY: number,
  ) {
    let isDragging = true;
    let startX = clientX;
    let startY = clientY;

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

      const w = MAP_WIDTH;
      const h = MAP_HEIGHT;

      const displayX = Math.max(-2, Math.min(w + 1, targetTileX));
      const displayY = Math.max(-2, Math.min(h + 1, targetTileY));

      charEl.style.setProperty("--x", displayX.toString());
      charEl.style.setProperty("--y", displayY.toString());

      const isOffMap = targetTileX < -0.4 || targetTileX > w - 0.6 || targetTileY < -0.4 || targetTileY > h - 0.6;
      if (isOffMap) {
        charEl.style.opacity = "0.4";
      } else {
        charEl.style.opacity = "1";
      }
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      charEl.style.cursor = "grab";

      const currentTileX = parseFloat(charEl.style.getPropertyValue("--x") || "0");
      const currentTileY = parseFloat(charEl.style.getPropertyValue("--y") || "0");

      const w = MAP_WIDTH;
      const h = MAP_HEIGHT;

      const isOffMap = currentTileX < -0.4 || currentTileX > w - 0.6 || currentTileY < -0.4 || currentTileY > h - 0.6;

      if (isOffMap) {
        charEl.remove();
      } else {
        charEl.style.opacity = "1";
        charEl.style.setProperty("--x", Math.round(currentTileX).toString());
        charEl.style.setProperty("--y", Math.round(currentTileY).toString());
      }

      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    charEl.style.cursor = "grabbing";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  // Make a character-element draggable on the board
  function makeDraggable(charEl: HTMLElement) {
    charEl.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return; // Only drag with left click
      e.preventDefault();
      const startTileX = parseFloat(charEl.style.getPropertyValue("--x") || "0");
      const startTileY = parseFloat(charEl.style.getPropertyValue("--y") || "0");
      startDragging(charEl, e.clientX, e.clientY, startTileX, startTileY);
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
    return charEl;
  }

  // Randomize preview character seed
  function randomizePreview() {
    const randSeed = "char-" + Math.floor(Math.random() * 1e9);
    previewChar.setAttribute("seed", randSeed);
  }

  // Drag and drop from preview box
  charPreviewBox.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return; // Left click only
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    let hasDragged = false;
    let dragSessionStarted = false;
    let tempChar: HTMLElement | null = null;

    const onMouseMovePreview = (moveEvent: MouseEvent) => {
      if (dragSessionStarted) return;

      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 8) {
        hasDragged = true;
        dragSessionStarted = true;

        const seed = previewChar.getAttribute("seed") || "char-init";
        const { tx, ty } = screenToTile(moveEvent.clientX, moveEvent.clientY);
        const startTileX = tx - 0.5;
        const startTileY = ty - 0.5;

        tempChar = spawnCharacter(seed, startTileX, startTileY);
        startDragging(tempChar, moveEvent.clientX, moveEvent.clientY, startTileX, startTileY);

        randomizePreview();

        window.removeEventListener("mousemove", onMouseMovePreview);
        window.removeEventListener("mouseup", onMouseUpPreview);
      }
    };

    const onMouseUpPreview = () => {
      window.removeEventListener("mousemove", onMouseMovePreview);
      window.removeEventListener("mouseup", onMouseUpPreview);

      if (!hasDragged) {
        randomizePreview();
      }
    };

    window.addEventListener("mousemove", onMouseMovePreview);
    window.addEventListener("mouseup", onMouseUpPreview);
  });

  // Wire up event listeners
  regenFloorBtn.addEventListener("click", () => {
    const randSeed = "townsquare-" + Math.floor(Math.random() * 1e5);
    updateFloorSeed(randSeed);
    updateBoardDimensions();
  });

  // Initialize
  updateBoardDimensions();
  updateFloorSeed("townsquare-001");
  randomizePreview();

  // Spawn initial characters
  spawnCharacter("hero-knight", 4, 3);
  spawnCharacter("wizard-old", 11, 4);
  spawnCharacter("alien-visitor", 7, 7);
  spawnCharacter("orc-warrior", 13, 2);
});
