import page from "page";
import { tag, format, strip, DOM } from "../util";
import { Content } from "../content";
import { CONTENTS } from "../generated/content";
import { createSearchClient } from "../search";

const STATE = { reset: false };
const SEARCH = createSearchClient();
const APPLY_CHUNK = 64;
const HIGHLIGHT_LIMIT = 40;

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

const scheduleIdle = (work: () => void) => {
  if (typeof requestIdleCallback === "function") {
    return requestIdleCallback(work, { timeout: 80 });
  }

  return window.setTimeout(work, 0);
};

const cancelIdle = (handle: number) => {
  if (typeof cancelIdleCallback === "function") {
    cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
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

  let requestId = 0;
  let applyFrame = 0;
  let highlightIdle = 0;
  let lastQuery = "";
  const entriesById = new Map<number, HTMLElement>();

  DOM.contents()
    .querySelectorAll<HTMLElement>(".EntryFilter")
    .forEach((entry) => {
      entriesById.set(Number(entry.dataset.id), entry);
    });

  const entries = Array.from(entriesById.entries());

  const cancelWork = () => {
    cancelAnimationFrame(applyFrame);
    cancelIdle(highlightIdle);
  };

  const applyResult = (query: string, ids: number[], token: number) => {
    const matched = new Set(ids);
    let offset = 0;

    const step = () => {
      if (token !== requestId) return;

      const end = Math.min(offset + APPLY_CHUNK, entries.length);
      for (let i = offset; i < end; i++) {
        const [id, entry] = entries[i];
        const hidden = Boolean(query) && !matched.has(id);
        if (entry.hidden !== hidden) entry.hidden = hidden;
      }

      offset = end;
      if (offset < entries.length) {
        applyFrame = requestAnimationFrame(step);
        return;
      }

      if (query && ids.length <= HIGHLIGHT_LIMIT) {
        const visible = ids
          .map((id) => entriesById.get(id))
          .filter((entry): entry is HTMLElement => Boolean(entry));
        highlightIdle = scheduleIdle(() => {
          if (token !== requestId) return;
          highlightMatches(visible, query);
        });
        return;
      }

      clearSearchHighlight();
    };

    cancelWork();
    applyFrame = requestAnimationFrame(step);
  };

  const handleSort = (event: Event) => {
    const { value } = <HTMLSelectElement>event.currentTarget;
    STATE.reset = true;
    page(`/?sort=${value}`);
  };

  const handleSearch = (event: Event) => {
    const query = (<HTMLInputElement>event.currentTarget).value
      .trim()
      .toLowerCase();

    if (query === lastQuery) return;
    lastQuery = query;

    const token = ++requestId;
    cancelWork();
    SEARCH.query(token, query, (result) => {
      if (result.id !== requestId) return;
      applyResult(result.query, result.ids, token);
    });
  };

  DOM.navigation().addEventListener("input", handleSort);
  DOM.search().addEventListener("input", handleSearch);

  ctx.teardown = () => {
    requestId += 1;
    cancelWork();
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
