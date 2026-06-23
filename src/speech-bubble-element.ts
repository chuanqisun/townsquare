/**
 * Use https://developer.chrome.com/docs/css-ui/anchor-positioning-api API to display a speech bubble around the anchor element
 * With transcluded text content in <slot>
 */
export class SpeechBubbleElement extends HTMLElement {
  static define() {
    if (customElements.get("speech-bubble-element")) return;
    customElements.define("speech-bubble-element", SpeechBubbleElement);
  }
}
