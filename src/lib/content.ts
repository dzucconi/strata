import type { Content } from "./types";

const ENDPOINT =
  "https://atlas.auspic.es/graph/32e9271f-95b6-4541-9f79-50161d595cf9";
const PER_PAGE = 50;

const QUERY = `
  query ContentQuery($page: Int) {
    strata: object {
      ... on Collection {
        contents(page: $page, per: ${PER_PAGE}, sortBy: CREATED_AT_DESC) {
          id
          title: value(key: "title")
          createdAt(relative: true)
          timestamp: createdAt
          metadata
          entity {
            kind: __typename
            ... on Image {
              thumbnail: resized(
                width: 1000
                height: 16
                quality: 75
                sharpen: 1
              ) {
                width
                height
                urls {
                  _1x
                }
              }
              resized(width: 1000, height: 1000, quality: 75) {
                width
                height
                urls {
                  _1x
                }
              }
            }
            ... on Link {
              url
            }
            ... on Text {
              body
            }
          }
        }
      }
    }
  }
`;

const flattenImage = (entity: any) => {
  if (entity.kind !== "Image") return entity;

  return {
    kind: "Image",
    thumbnail: {
      width: entity.thumbnail.width,
      height: entity.thumbnail.height,
      url: entity.thumbnail.urls._1x,
    },
    resized: {
      width: entity.resized.width,
      height: entity.resized.height,
      url: entity.resized.urls._1x,
    },
  };
};

const fetchPage = async (page: number): Promise<Content[]> => {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { page } }),
  });

  if (!response.ok) {
    throw new Error(`Content request failed: ${response.status}`);
  }

  const { data, errors } = await response.json();

  if (errors?.length) {
    throw new Error(errors[0].message);
  }

  return data.strata.contents.map((content: any) => ({
    ...content,
    entity: flattenImage(content.entity),
  }));
};

const fetchAll = async (): Promise<Content[]> => {
  const contents: Content[] = [];

  for (let page = 1; ; page++) {
    const next = await fetchPage(page);
    contents.push(...next);

    if (next.length < PER_PAGE) break;
  }

  console.log(`Fetched ${contents.length} records.`);

  return contents;
};

const PROCESS_CACHE_MS = 30_000;

type CacheEntry = {
  promise: Promise<Content[]>;
  expiresAt: number | null;
};

let cache: CacheEntry | null = null;

export const getContents = (): Promise<Content[]> => {
  if (cache && (cache.expiresAt === null || cache.expiresAt > Date.now())) {
    return cache.promise;
  }

  const promise = fetchAll()
    .then((contents) => {
      if (cache?.promise === promise) {
        cache.expiresAt = Date.now() + PROCESS_CACHE_MS;
      }
      return contents;
    })
    .catch((error) => {
      if (cache?.promise === promise) cache = null;
      throw error;
    });

  cache = { promise, expiresAt: null };
  return promise;
};

export const getContentById = async (id: string) => {
  const contents = await getContents();
  const position = contents.findIndex((entry) => String(entry.id) === id);
  if (position === -1) return null;

  return {
    content: contents[position],
    previousId: position > 0 ? String(contents[position - 1].id) : null,
    nextId:
      position < contents.length - 1
        ? String(contents[position + 1].id)
        : null,
  };
};
