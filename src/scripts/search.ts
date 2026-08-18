import type { SearchIndex } from "../lib/search-index";

export type SearchResult = {
  id: number;
  query: string;
  ids: number[];
};

const WORKER_SOURCE = `"use strict";
var index = [];
onmessage = function (event) {
  var data = event.data;
  if (data.type === "init") {
    index = data.index;
    return;
  }
  if (data.type === "query") {
    var query = data.query;
    var ids = [];
    for (var i = 0; i < index.length; i++) {
      if (!query || index[i][1].indexOf(query) !== -1) {
        ids.push(index[i][0]);
      }
    }
    postMessage({ id: data.id, query: query, ids: ids });
  }
};
`;

const matchOnMain = (index: SearchIndex, query: string): number[] => {
  const ids: number[] = [];
  for (let i = 0; i < index.length; i++) {
    const [id, text] = index[i];
    if (!query || text.indexOf(query) !== -1) ids.push(id);
  }
  return ids;
};

export const createSearchClient = (index: SearchIndex) => {
  let worker: Worker | null = null;
  const callbacks: Record<number, (result: SearchResult) => void> =
    Object.create(null);

  try {
    worker = new Worker(
      URL.createObjectURL(
        new Blob([WORKER_SOURCE], { type: "text/javascript" })
      )
    );
    worker.addEventListener("message", (event: MessageEvent<SearchResult>) => {
      const callback = callbacks[event.data.id];
      if (!callback) return;

      delete callbacks[event.data.id];
      callback(event.data);
    });
    worker.postMessage({ type: "init", index });
  } catch {
    worker = null;
  }

  const query = (
    id: number,
    value: string,
    onResult: (result: SearchResult) => void
  ) => {
    if (!worker) {
      onResult({ id, query: value, ids: matchOnMain(index, value) });
      return;
    }

    callbacks[id] = onResult;
    worker.postMessage({ type: "query", id, query: value });
  };

  return { query };
};
