import { CONTENTS } from "./generated/content";

export const SEARCH_INDEX: Array<[number, string]> = CONTENTS.map(
  (content) => {
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
    ];
  }
);

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

export type SearchResult = {
  id: number;
  query: string;
  ids: number[];
};

const matchOnMain = (query: string): number[] => {
  const ids: number[] = [];
  for (let i = 0; i < SEARCH_INDEX.length; i++) {
    const [id, text] = SEARCH_INDEX[i];
    if (!query || text.indexOf(query) !== -1) ids.push(id);
  }
  return ids;
};

export const createSearchClient = () => {
  let worker: Worker | null = null;

  try {
    worker = new Worker(
      URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }))
    );
    worker.postMessage({ type: "init", index: SEARCH_INDEX });
  } catch {
    worker = null;
  }

  return {
    query(id: number, query: string, onResult: (result: SearchResult) => void) {
      if (!worker) {
        onResult({ id, query, ids: matchOnMain(query) });
        return;
      }

      const handleMessage = (event: MessageEvent<SearchResult>) => {
        if (event.data.id !== id) return;
        worker!.removeEventListener("message", handleMessage);
        onResult(event.data);
      };

      worker.addEventListener("message", handleMessage);
      worker.postMessage({ type: "query", id, query });
    },
  };
};
