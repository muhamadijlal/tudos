// Textarea gak punya API buat tau posisi pixel dari caret-nya. Teknik
// "mirror div" standar: bikin <div> tersembunyi yang di-styling PERSIS
// kayak textarea (font, padding, border, wrapping), isi teksnya cuma
// sampe posisi caret, terus ukur posisi node terakhirnya. Dipakai buat
// naro popover slash-command tepat di bawah karakter "/" yang diketik.
const MIRRORED_PROPERTIES = [
  "boxSizing",
  "width",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
];

export function getCaretCoordinates(textarea, position) {
  const div = document.createElement("div");
  const computed = window.getComputedStyle(textarea);

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.overflowWrap = "break-word";

  for (const prop of MIRRORED_PROPERTIES) {
    div.style[prop] = computed[prop];
  }

  document.body.appendChild(div);
  div.textContent = textarea.value.slice(0, position);

  const span = document.createElement("span");
  span.textContent = textarea.value.slice(position) || ".";
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop,
    left: span.offsetLeft,
    height: span.offsetHeight,
  };

  document.body.removeChild(div);
  return coordinates;
}
