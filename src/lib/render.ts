import type { Content } from "./types";

/**
 * Removes whitespace between tags
 */
export const strip = (html: string) => html.replace(/>\s+</g, "><");

export const format = (input: string) => {
  input = input.replace(/\r\n?/, "\n").trim();

  if (input.length > 0) {
    input = input.replace(/\n\n+/g, "</p><p>");
    input = input.replace(/\n/g, "<br />");
    input = `<p>${input}</p>`;
  }

  return input;
};

export const renderIndexEntries = (contents: Content[]) => {
  return strip(
    `<div class="Entries Ignore">${contents
      .map((content) => {
        const { id, title, entity } = content;
        const html = [
          // Text
          ...(entity.kind === "Text"
            ? [
                `<h3 class="Entry__title">${title || "Not titled"}</h3>`,
                format(entity.body),
              ]
            : []),

          // Image
          ...(entity.kind === "Image"
            ? [
                `<img
                  class="Entry__thumb"
                  src="${entity.thumbnail.url}"
                  width="${entity.thumbnail.width}"
                  height="${entity.thumbnail.height}"
                  loading="lazy"
                  decoding="async"
                  fetchpriority="low" />
                `,
              ]
            : []),
        ].join("");

        return `
          <div class="EntryFilter Ignore" data-id="${id}">
            <a href="/${id}" class="Entry Entry--index Acknowledge">
              ${html}
            </a>
          </div>
        `;
      })
      .join("")}</div>`
  );
};

export const renderModal = (
  content: Content,
  previousId: string | null,
  nextId: string | null
) => {
  const { id, title, entity, metadata, createdAt, timestamp } = content;

  const html = (() => {
    switch (entity.kind) {
      case "Text":
        return `
          ${format(entity.body)}
          <a
            class="Entry__find"
            rel="nofollow"
            target="_blank"
            href="https://www.google.com/search?q=${encodeURIComponent(
              entity.body
            )}">
            Find source
          </a>
        `;
      case "Image":
        return `
          <img
            class="Entry__thumb"
            src="${entity.resized.url}"
            width="${entity.resized.width}"
            height="${entity.resized.height}" />
        `;
      case "Link":
        return "";
    }
  })();

  return strip(`
    <div id="modal" class="Modal Ignore" data-id="${id}">
      <a class="Modal__close Ignore" href="/"></a>
      <div class="Modal__content Ignore">
        <div class="Modal__body Ignore">
          <div class="Entry Entry--show">
            <h1 class="Entry__title">${title || "Not titled"}</h1>
            ${html}
          </div>

          ${
            metadata.imported_created_at
              ? ""
              : `<time datetime="${timestamp}" title="${timestamp}">${createdAt}</time>`
          }

          ${
            Object.keys(metadata).length === 0
              ? ""
              : `
              <table class="Table Ignore">
                ${Object.keys(metadata)
                  .map((key, i) => {
                    return `
                    <tr>
                      <td>${i}</td>
                      <td>${key}</td>
                      <td>${metadata[key]}</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </table>
          `
          }
        </div>

        <nav class="Modal__navigation Ignore" aria-label="Entry navigation">
          <button id="previous" type="button" ${
            previousId ? `data-id="${previousId}"` : "disabled"
          }>previous</button>
          <button id="next" type="button" ${
            nextId ? `data-id="${nextId}"` : "disabled"
          }>next</button>
        </nav>
      </div>
    </div>
  `);
};
