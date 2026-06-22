/**
 * Web component that renders a pixel art styled floor
 */
export class FloorElement extends HTMLElement {
  static define() {
    if (customElements.get("floor-element")) return;
    customElements.define("floor-element", FloorElement);
  }
}
