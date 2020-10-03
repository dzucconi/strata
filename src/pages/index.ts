import page from "page";
import { tag, format, strip, DOM } from "../util";
import { INDEX_QUERY, request, IndexQuery } from "../request";

const STATE = { page: 0, reset: false };

type IndexContext = PageJS.Context & {
  query?: Record<string, string>;
  teardown: () => void;
};

const index = (ctx: IndexContext) => {
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.intersectionRatio > 0)) {
      STATE.page++;
      next(STATE.page);
    }
  });

  const render = ({ strata: { contents } }: IndexQuery) => {
    return tag(
      `<div class="Entries Ignore">${contents
        .map((content) => {
          const { id, title, entity } = content;
          const html = [
            // Text
            ...(entity.kind === "Text"
              ? [
                  `<h3 class="Entry__title" href="${id}">${
                    title || "Not titled"
                  }</h3>`,
                  format(entity.body),
                ]
              : []),

            // Image
            ...(entity.kind === "Image"
              ? [
                  `<img
                    class="Entry__thumb"
                    src="${entity.resized.urls._1x}"
                    width="${entity.resized.width}"
                    height="${entity.resized.height}" />
                  `,
                ]
              : []),
          ].join("");

          return `
            <a href="${id}" class="Entry Entry--index Acknowledge">
              ${html}
            </a>
          `;
        })
        .join("")}</div>`
    );
  };

  const next = async (page: number) => {
    const data = await request<IndexQuery>({
      query: INDEX_QUERY,
      variables: { page, sort: ctx.query.sort || "CREATED_AT_DESC" },
    });

    if (data.strata.contents.length === 0) {
      observer.disconnect();
      DOM.root().removeChild(DOM.sentinel());
      return;
    }

    DOM.contents().appendChild(render(data));
  };

  const init = () => {
    if (document.body.clientHeight < document.documentElement.clientHeight) {
      STATE.page++;
      next(STATE.page).then(init);
      return;
    }

    observer.observe(DOM.sentinel());
  };

  const reset = () => {
    STATE.page = 0;
    STATE.reset = false;

    DOM.root().innerHTML = strip(`
      <select id="navigation">
        <option value="CREATED_AT_DESC" ${
          ctx.query.sort === "CREATED_AT_DESC" ? "selected" : ""
        }>
          descending
        </option>
        <option value="CREATED_AT_ASC" ${
          ctx.query.sort === "CREATED_AT_ASC" ? "selected" : ""
        }>
          ascending
        </option>
      </select>
      <div class="Ignore" id="contents"></div>
      <div class="Ignore" id="sentinel">a sentinel</div>
    `);
  };

  if (DOM.contents() === null || STATE.reset) {
    reset();
  }

  init();

  const handleInput = (event: Event) => {
    const { value } = <HTMLSelectElement>event.currentTarget;
    STATE.reset = true;
    page(`/?sort=${value}`);
  };

  DOM.navigation().addEventListener("input", handleInput);

  ctx.teardown = () => {
    observer.disconnect();
    DOM.navigation().removeEventListener("input", handleInput);
  };
};

export const routes = () => {
  page("/", index);
  page.exit("/", (ctx: IndexContext, next) => {
    ctx.teardown();
    next();
  });
};
