import type { Content } from "./types";

export type SearchIndex = Array<[number, string]>;

export const buildSearchIndex = (contents: Content[]): SearchIndex => {
  return contents.map((content) => {
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
  });
};
