/**
 * Use https://developer.chrome.com/docs/css-ui/anchor-positioning-api API to display a speech bubble around the anchor element
 * With transcluded text content in <slot>
 */
export class SpeechBubbleElement extends HTMLElement {
  static define() {
    if (customElements.get("speech-bubble-element")) return;
    customElements.define("speech-bubble-element", SpeechBubbleElement);
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block;
        container-type: anchored;
      }
      
      .bubble-container {
        display: inline-block;
        background: white;
        color: #111;
        border: 3px solid #111;
        border-radius: 4px;
        padding: 8px 14px;
        box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.25);
        font-family: ui-monospace, Consolas, "Fira Code", monospace;
        font-size: 13px;
        font-weight: bold;
        line-height: 1.4;
        white-space: pre-wrap;
        position: relative;
        pointer-events: auto; /* Allow clicking the bubble itself if needed */
        max-width: 220px;
        text-align: center;
      }
      
      .bubble-arrow {
        position: absolute;
        bottom: -11px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 8px 6px 0 6px;
        border-color: #111 transparent transparent transparent;
      }
      
      .bubble-arrow::after {
        content: '';
        position: absolute;
        top: -11px;
        left: -4px;
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 6px 4px 0 4px;
        border-color: white transparent transparent transparent;
      }
      
      /* Below styling for when the bubble flips to the bottom of the character */
      @container anchored(fallback: flip-block) {
        .bubble-container {
          box-shadow: 4px -4px 0px rgba(0, 0, 0, 0.25);
        }
        
        .bubble-arrow {
          bottom: auto;
          top: -11px;
          border-width: 0 6px 8px 6px;
          border-color: transparent transparent #111 transparent;
        }
        
        .bubble-arrow::after {
          top: 5px;
          left: -4px;
          border-width: 0 4px 6px 4px;
          border-color: transparent transparent white transparent;
        }
      }
    `;

    const container = document.createElement("div");
    container.className = "bubble-container";

    const content = document.createElement("div");
    content.className = "bubble-content";
    const slot = document.createElement("slot");
    content.appendChild(slot);

    const arrow = document.createElement("div");
    arrow.className = "bubble-arrow";

    container.appendChild(content);
    container.appendChild(arrow);
    shadow.appendChild(style);
    shadow.appendChild(container);
  }

  connectedCallback() {
    this.updatePositioning();
  }

  static get observedAttributes() {
    return ["anchor"];
  }

  attributeChangedCallback(name: string) {
    if (name === "anchor") {
      this.updatePositioning();
    }
  }

  private updatePositioning() {
    const anchorId = this.getAttribute("anchor");
    if (!anchorId) return;

    // Set CSS custom property for position-anchor
    this.style.setProperty("--character-anchor", `--${anchorId}`);
  }
}
