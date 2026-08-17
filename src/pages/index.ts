import page from "page";
import { tag, format, strip, DOM } from "../util";
import { Content } from "../content";
import { CONTENTS } from "../generated/content";
import { createSearchClient } from "../search";

const STATE = { reset: false };
const SEARCH = createSearchClient();
let SEARCH_REQUEST_ID = 0;

const clearSearchHighlight = () => {
  if (typeof CSS !== "undefined") {
    (CSS as any).highlights?.delete("search");
  }
};

const addEntryRanges = (
  ranges: Range[],
  entry: HTMLElement,
  query: string
) => {
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

  let activeRequestId = 0;
  let applyFrame = 0;
  let highlightFrame = 0;
  let searchDelay = 0;
  let applying = false;
  let activeQuery = "";
  let activeIds = new Set<number>();
  let lastQuery = (<HTMLInputElement>DOM.search()).value
    .trim()
    .toLowerCase();
  const entriesById = new Map<number, HTMLElement>();
  const visibleEntries = new Set<HTMLElement>();

  DOM.contents()
    .querySelectorAll<HTMLElement>(".EntryFilter")
    .forEach((entry) => {
      entriesById.set(Number(entry.dataset.id), entry);
    });

  const entries = Array.from(entriesById.entries());

  const cancelWork = () => {
    cancelAnimationFrame(applyFrame);
    cancelAnimationFrame(highlightFrame);
    window.clearTimeout(searchDelay);
  };

  const scheduleHighlight = (token: number) => {
    cancelAnimationFrame(highlightFrame);
    highlightFrame = requestAnimationFrame(() => {
      if (token !== activeRequestId || applying) return;

      clearSearchHighlight();
      if (activeQuery.length < 2) return;

      const registry = (CSS as any).highlights;
      const Highlight = (window as any).Highlight;
      if (!registry || !Highlight) return;

      const ranges: Range[] = [];
      visibleEntries.forEach((entry) => {
        const id = Number(entry.dataset.id);
        if (activeIds.has(id) && !entry.hidden) {
          addEntryRanges(ranges, entry, activeQuery);
        }
      });

      registry.set("search", new Highlight(...ranges));
    });
  };

  const applyResult = (query: string, ids: number[], token: number) => {
    const matched = new Set(ids);
    activeQuery = query;
    activeIds = matched;
    applying = true;

    cancelWork();
    clearSearchHighlight();
    applyFrame = requestAnimationFrame(() => {
      if (token !== activeRequestId) return;

      for (let i = 0; i < entries.length; i++) {
        const [id, entry] = entries[i];
        const hidden = Boolean(query) && !matched.has(id);
        if (entry.hidden !== hidden) entry.hidden = hidden;
      }

      applying = false;
      scheduleHighlight(token);
    });
  };

  const observer = new IntersectionObserver(
    (observed) => {
      observed.forEach((item) => {
        const entry = item.target as HTMLElement;
        if (item.isIntersecting) {
          visibleEntries.add(entry);
        } else {
          visibleEntries.delete(entry);
        }
      });

      if (activeQuery && !applying) {
        scheduleHighlight(activeRequestId);
      }
    },
    { rootMargin: "200px 0px" }
  );
  entries.forEach(([, entry]) => observer.observe(entry));

  const runSearch = (query: string) => {
    const token = ++SEARCH_REQUEST_ID;
    activeRequestId = token;
    applying = true;
    cancelWork();
    clearSearchHighlight();

    const dispatch = () => {
      SEARCH.query(token, query, (result) => {
        if (result.id !== activeRequestId) return;
        applyResult(result.query, result.ids, token);
      });
    };

    if (query.length === 1) {
      searchDelay = window.setTimeout(dispatch, 120);
    } else {
      dispatch();
    }
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
    runSearch(query);
  };

  DOM.navigation().addEventListener("input", handleSort);
  DOM.search().addEventListener("input", handleSearch);

  if (lastQuery) {
    runSearch(lastQuery);
  }

  ctx.teardown = () => {
    activeRequestId = -1;
    cancelWork();
    clearSearchHighlight();
    observer.disconnect();
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
