const ENDPOINT =
  "https://atlas.auspic.es/graph/32e9271f-95b6-4541-9f79-50161d595cf9";

export type Entity =
  | { kind: "Text"; body: string }
  | {
      kind: "Link";
      url: string;
    }
  | {
      kind: "Image";
      resized: {
        width: number;
        height: number;
        urls: {
          _1x: string;
          _2x: string;
        };
      };
    };

export type IndexQuery = {
  strata: {
    contents: {
      id: number;
      title?: string;
      entity: Entity;
    }[];
  };
};

export const INDEX_QUERY = `
  query IndexQuery($page: Int, $sort: ContentsSort) {
    strata: object {
      ... on Collection {
        contents(page: $page, per: 50, sortBy: $sort) {
          id
          title: value(key: "title")
          entity {
            kind: __typename
            ... on Image {
              resized(width: 1000, height: 16, quality: 75, sharpen: 1) {
                width
                height
                urls {
                  _1x
                  _2x
                }
              }
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

export type ShowQuery = {
  strata: {
    content: {
      id: number;
      title?: string;
      createdAt: string;
      timestamp: string;
      metadata: Record<string, string>;
      entity: Entity;
    };
  };
};

export const SHOW_QUERY = `
  query ShowQuery($id: ID!) {
    strata: object {
      ... on Collection {
        content(id: $id) {
          title: value
          createdAt(relative: true)
          timestamp: createdAt
          metadata
          entity {
            kind: __typename
            ... on Image {
              resized(width: 1000, height: 1000, quality: 75) {
                width
                height
                urls {
                  _1x
                  _2x
                }
              }
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

export const request = async <T>({
  query,
  variables,
}: {
  query: string;
  variables?: any;
}): Promise<T> => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  const { data, errors } = await res.json();

  if (errors?.length > 0) {
    throw new Error(errors[0].message);
  }

  return data;
};
