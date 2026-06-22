/**
 * Web component that renders a pixel art styled character
 * The character's identity is randomly generated from a hash key. If omitted, it will be random
 */
export class CharacterElement extends HTMLElement {
  static define() {
    if (customElements.get("character-element")) return;
    customElements.define("character-element", CharacterElement);
  }
}
