/**
 * Removes whitespace between tags
 */
export const strip = (html: string) => html.replace(/>\s+</g, "><");

export const tag = (html: string) => {
  return new DOMParser().parseFromString(strip(html), "text/html").body
    .firstChild;
};

export const format = (input: string) => {
  input = input.replace(/\r\n?/, "\n").trim();

  if (input.length > 0) {
    input = input.replace(/\n\n+/g, "</p><p>");
    input = input.replace(/\n/g, "<br />");
    input = `<p>${input}</p>`;
  }

  return input;
};

export const DOM = {
  root: () => document.getElementById("root"),
  contents: () => document.getElementById("contents"),
  sentinel: () => document.getElementById("sentinel"),
  modal: () => document.getElementById("modal"),
  navigation: () => document.getElementById("navigation"),
};
