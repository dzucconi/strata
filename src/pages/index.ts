import page from "page";
import { tag, format, strip, DOM } from "../util";
import { Content } from "../content";
import { CONTENTS } from "../generated/content";

const STATE = { reset: false };

interface IndexContext extends PageJS.Context {
  query?: Record<string, string>;
  teardown: () => void;
}

const index = (ctx: IndexContext) => {
  const render = (contents: Content[]) => {
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
                    src="${entity.thumbnail.urls._1x}"
                    width="${entity.thumbnail.width}"
                    height="${entity.thumbnail.height}" />
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

  const reset = () => {
    STATE.reset = false;

    DOM.root().innerHTML = strip(`
      <select id="navigation">
        <option value="CREATED_AT_DESC" ${
          ctx.query?.sort === "CREATED_AT_DESC" ? "selected" : ""
        }>
          descending
        </option>
        <option value="CREATED_AT_ASC" ${
          ctx.query?.sort === "CREATED_AT_ASC" ? "selected" : ""
        }>
          ascending
        </option>
      </select>
      <div class="Ignore" id="contents"></div>
    `);

    const contents =
      ctx.query?.sort === "CREATED_AT_ASC"
        ? CONTENTS.slice().reverse()
        : CONTENTS;
    DOM.contents().appendChild(render(contents));
  };

  if (DOM.contents() === null || STATE.reset) {
    reset();
  }

  const handleInput = (event: Event) => {
    const { value } = <HTMLSelectElement>event.currentTarget;
    STATE.reset = true;
    page(`/?sort=${value}`);
  };

  DOM.navigation().addEventListener("input", handleInput);

  ctx.teardown = () => {
    DOM.navigation().removeEventListener("input", handleInput);
  };
};

export const routes = () => {
  // FIXME: Correct context typing
  // @ts-ignore
  page("/", index);

  // @ts-ignore
  page.exit("/", (ctx: IndexContext, next) => {
    ctx.teardown();
    next();
  });
};
