import { createSearchClient } from "./search";
import { renderModal } from "../lib/render";
import type { Content } from "../lib/types";

const DOM = {
  root: () => document.getElementById("root")!,
  contents: () => document.getElementById("contents")!,
  entries: () => document.querySelector<HTMLElement>(".Entries")!,
  navigation: () => document.getElementById("navigation") as HTMLSelectElement,
  search: () => document.getElementById("search") as HTMLInputElement,
};

const CONTENTS = JSON.parse(
  document.getElementById("contents-data")!.textContent!
) as Content[];
const CONTENTS_BY_ID = new Map(
  CONTENTS.map((content) => [String(content.id), content])
);
const SEARCH = createSearchClient(CONTENTS);
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

const setupSearch = () => {
  let activeRequestId = 0;
  let applyFrame = 0;
  let highlightFrame = 0;
  let searchDelay = 0;
  let applying = false;
  let activeQuery = "";
  let activeIds = new Set<number>();
  let lastQuery = DOM.search().value.trim().toLowerCase();
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

  const handleSearch = (event: Event) => {
    const query = (<HTMLInputElement>event.currentTarget).value
      .trim()
      .toLowerCase();

    if (query === lastQuery) return;
    lastQuery = query;
    runSearch(query);
  };

  DOM.search().addEventListener("input", handleSearch);

  if (lastQuery) {
    runSearch(lastQuery);
  }
};

const sortFromLocation = () =>
  new URLSearchParams(location.search).get("sort") === "CREATED_AT_ASC"
    ? "CREATED_AT_ASC"
    : "CREATED_AT_DESC";

const applySort = (sort: string) => {
  const container = DOM.entries();
  const current = container.dataset.sort || "CREATED_AT_DESC";

  if (current !== sort) {
    const reversed = Array.from(container.children).reverse();
    reversed.forEach((child) => container.appendChild(child));
    container.dataset.sort = sort;
  }

  DOM.navigation().value = sort;
};

const setupSort = () => {
  applySort(sortFromLocation());

  DOM.navigation().addEventListener("input", (event) => {
    const { value } = <HTMLSelectElement>event.currentTarget;
    history.pushState({}, "", `/?sort=${value}`);
    applySort(value);
  });
};

let teardownModal: (() => void) | null = null;

const closeModal = () => {
  teardownModal?.();
  teardownModal = null;
};

const openModal = (id: string, push: boolean) => {
  const content = CONTENTS_BY_ID.get(id);
  if (!content) return false;

  const visibleIds = Array.from(
    document.querySelectorAll<HTMLElement>(
      "#contents .EntryFilter:not([hidden])"
    )
  ).map((entry) => entry.dataset.id!);
  const allIds = Array.from(
    document.querySelectorAll<HTMLElement>("#contents .EntryFilter")
  ).map((entry) => entry.dataset.id!);
  const navigationIds = visibleIds.includes(id) ? visibleIds : allIds;
  const position = navigationIds.indexOf(id);
  const previousId = position > 0 ? navigationIds[position - 1] : null;
  const nextId =
    position < navigationIds.length - 1 ? navigationIds[position + 1] : null;

  const modal = new DOMParser().parseFromString(
    renderModal(content, previousId, nextId),
    "text/html"
  ).body.firstElementChild as HTMLElement;
  const previous = modal.querySelector<HTMLButtonElement>("#previous")!;
  const next = modal.querySelector<HTMLButtonElement>("#next")!;

  const navigate = (target: string | null) => {
    if (target) {
      history.pushState({}, "", `/${target}`);
      openModal(target, false);
    }
  };
  const handlePrevious = () => navigate(previousId);
  const handleNext = () => navigate(nextId);
  const returnToIndex = () => {
    history.pushState({}, "", "/");
    closeModal();
  };

  const handleClose = (event: Event) => {
    event.preventDefault();
    returnToIndex();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") returnToIndex();
    if (event.key === "ArrowLeft" && previousId) {
      event.preventDefault();
      navigate(previousId);
    }
    if (event.key === "ArrowRight" && nextId) {
      event.preventDefault();
      navigate(nextId);
    }
  };

  const close = modal.querySelector<HTMLAnchorElement>(".Modal__close")!;
  close.addEventListener("click", handleClose);
  previous.addEventListener("click", handlePrevious);
  next.addEventListener("click", handleNext);
  window.addEventListener("keydown", handleKeydown);

  closeModal();
  DOM.root().appendChild(modal);
  document.title = content.title ? `${content.title} — Strata` : "Strata";
  if (push) history.pushState({}, "", `/${id}`);

  teardownModal = () => {
    window.removeEventListener("keydown", handleKeydown);
    modal.remove();
    document.title = "Strata";
  };

  return true;
};

const setupModal = () => {
  DOM.contents().addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
      "a.Entry"
    );
    if (!link) return;

    const id = link.closest<HTMLElement>(".EntryFilter")?.dataset.id;
    if (!id) return;

    event.preventDefault();
    if (!openModal(id, true)) location.href = `/${id}`;
  });

  window.addEventListener("popstate", () => {
    applySort(sortFromLocation());

    const match = location.pathname.match(/^\/([^/]+)$/);
    if (match) {
      openModal(match[1], false);
    } else {
      closeModal();
    }
  });
};

setupSearch();
setupSort();
setupModal();
