import page from "page";
import { tag, format, strip, DOM } from "../util";
import { Content } from "../content";
import { CONTENTS } from "../generated/content";

const STATE = { reset: false };

const SEARCH_INDEX = new Map(
  CONTENTS.map((content) => {
    const { id, title, entity, metadata } = content;
    const metadataText = Object.keys(metadata)
      .map((key) => `${key} ${metadata[key]}`)
      .join(" ");
    const entityText =
      entity.kind === "Text"
        ? entity.body
        : entity.kind === "Link"
        ? entity.url
        : "";

    return [
      id,
      [title || "", entityText, metadataText].join(" ").toLowerCase(),
    ] as const;
  })
);

const clearSearchHighlight = () => {
  if (typeof CSS !== "undefined") {
    (CSS as any).highlights?.delete("search");
  }
};

const highlightMatches = (matching: HTMLElement[], query: string) => {
  clearSearchHighlight();

  const registry = (CSS as any).highlights;
  const Highlight = (window as any).Highlight;
  if (!query || !registry || !Highlight) return;

  const ranges: Range[] = [];

  matching.forEach((entry) => {
    const walker = document.createTreeWalker(entry, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      const text = node.nodeValue || "";
      const normalized = text.toLowerCase();
      let index = normalized.indexOf(query);

      while (index !== -1) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + query.length);
        ranges.push(range);
        index = normalized.indexOf(query, index + query.length);
      }

      node = walker.nextNode();
    }
  });

  registry.set("search", new Highlight(...ranges));
};

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
              <a href="${id}" class="Entry Entry--index Acknowledge">
                ${html}
              </a>
            </div>
          `;
        })
        .join("")}</div>`
    );
  };

  const reset = () => {
    STATE.reset = false;

    DOM.root().innerHTML = strip(`
      <input
        id="search"
        type="search"
        placeholder="Search"
        aria-label="Search entries" />
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

  let searchFrame = 0;
  let lastQuery = "";
  const entriesById = new Map<number, HTMLElement>();
  const matching = new Set<HTMLElement>();

  DOM.contents()
    .querySelectorAll<HTMLElement>(".EntryFilter")
    .forEach((entry) => {
      entriesById.set(Number(entry.dataset.id), entry);
      matching.add(entry);
    });

  const handleSort = (event: Event) => {
    const { value } = <HTMLSelectElement>event.currentTarget;
    STATE.reset = true;
    page(`/?sort=${value}`);
  };

  const handleSearch = (event: Event) => {
    const query = (<HTMLInputElement>event.currentTarget).value
      .trim()
      .toLowerCase();

    cancelAnimationFrame(searchFrame);
    searchFrame = requestAnimationFrame(() => {
      if (query === lastQuery) return;
      lastQuery = query;

      const nextMatching = new Set<HTMLElement>();

      entriesById.forEach((entry, id) => {
        const text = SEARCH_INDEX.get(id) || "";
        if (query && !text.includes(query)) {
          if (matching.has(entry)) entry.hidden = true;
          return;
        }

        nextMatching.add(entry);
        if (!matching.has(entry)) entry.hidden = false;
      });

      matching.clear();
      nextMatching.forEach((entry) => matching.add(entry));
      highlightMatches(Array.from(matching), query);
    });
  };

  DOM.navigation().addEventListener("input", handleSort);
  DOM.search().addEventListener("input", handleSearch);

  ctx.teardown = () => {
    cancelAnimationFrame(searchFrame);
    clearSearchHighlight();
    DOM.navigation().removeEventListener("input", handleSort);
    DOM.search().removeEventListener("input", handleSearch);
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
