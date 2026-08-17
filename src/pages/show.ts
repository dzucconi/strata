import page from "page";
import { tag, format, strip, DOM } from "../util";
import { CONTENTS, CONTENTS_BY_ID } from "../generated/content";

type ShowContext = PageJS.Context & {
  query?: Record<string, string>;
  teardown: () => void;
};

export const show = (ctx: ShowContext) => {
  const {
    params: { id },
  } = ctx;
  const content = CONTENTS_BY_ID.get(id);

  if (!content) {
    page("/");
    return;
  }

  const visibleIds = Array.from(
    document.querySelectorAll<HTMLElement>(
      "#contents .EntryFilter:not([hidden])"
    )
  ).map((entry) => entry.dataset.id!);
  const navigationIds = visibleIds.includes(id)
    ? visibleIds
    : CONTENTS.map((entry) => String(entry.id));
  const position = navigationIds.indexOf(id);
  const previousId = position > 0 ? navigationIds[position - 1] : null;
  const nextId =
    position < navigationIds.length - 1 ? navigationIds[position + 1] : null;

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

  const { title, entity, metadata, createdAt, timestamp } = content;

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
    }
  })();

  DOM.modal().innerHTML = strip(`
    <a class="Modal__close Ignore" href="/"></a>
    <div class="Modal__content Ignore">
      <div class="Modal__body Ignore">
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

      <nav class="Modal__navigation Ignore" aria-label="Entry navigation">
        <button id="previous" type="button" ${
          previousId ? "" : "disabled"
        }>previous</button>
        <button id="next" type="button" ${
          nextId ? "" : "disabled"
        }>next</button>
      </nav>
    </div>
  `);

  const previous = DOM.modal().querySelector<HTMLButtonElement>("#previous")!;
  const next = DOM.modal().querySelector<HTMLButtonElement>("#next")!;
  const navigate = (target: string | null) => {
    if (target) page(`/${target}`);
  };
  const handlePrevious = () => navigate(previousId);
  const handleNext = () => navigate(nextId);

  previous.addEventListener("click", handlePrevious);
  next.addEventListener("click", handleNext);

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") page("/");
    if (event.key === "ArrowLeft" && previousId) {
      event.preventDefault();
      navigate(previousId);
    }
    if (event.key === "ArrowRight" && nextId) {
      event.preventDefault();
      navigate(nextId);
    }
  };

  window.addEventListener("keydown", handleKeydown);

  ctx.teardown = () => {
    previous.removeEventListener("click", handlePrevious);
    next.removeEventListener("click", handleNext);
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
