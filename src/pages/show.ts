import page from "page";
import { tag, format, strip, DOM } from "../util";
import { SHOW_QUERY, ShowQuery, request } from "../request";

type ShowContext = PageJS.Context & {
  query?: Record<string, string>;
  teardown: () => void;
};

export const show = async (ctx: ShowContext) => {
  const {
    params: { id },
  } = ctx;

  DOM.root().appendChild(
    tag(`
      <div id="modal" class="Modal Ignore">
        <a class="Modal__close Ignore" href="/"></a>
        <div class="Modal__content Ignore">
          <div class="Entry">
            a sentinel
          </div>
        </div>
      </div>
    `)
  );

  let data: ShowQuery;

  try {
    data = await request<ShowQuery>({ query: SHOW_QUERY, variables: { id } });
  } catch (err) {
    console.error(err);
    page("/");
    return;
  }

  const {
    strata: {
      content: { title, entity, metadata, createdAt, timestamp },
    },
  } = data;

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
            src="${entity.resized.urls._1x}"
            width="${entity.resized.width}"
            height="${entity.resized.height}" />
        `;
    }
  })();

  DOM.modal().innerHTML = strip(`
    <a class="Modal__close Ignore" href="/"></a>
    <div class="Modal__content Ignore">
      <div class="Entry Entry--show">
        <h1 class="Entry__title" href="${id}">${title || "Not titled"}</h1>
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
  `);

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") page("/");
  };

  window.addEventListener("keydown", handleKeydown);

  ctx.teardown = () => {
    DOM.root().removeChild(DOM.modal());
    window.removeEventListener("keydown", handleKeydown);
  };
};

export const routes = () => {
  // FIXME: Correct context typing
  // @ts-ignore
  page("/:id", show);

  // @ts-ignore
  page.exit("/:id", (ctx: ShowContext, next) => {
    ctx.teardown();
    next();
  });
};
