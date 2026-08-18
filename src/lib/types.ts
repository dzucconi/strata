export type Entity =
  | { kind: "Text"; body: string }
  | { kind: "Link"; url: string }
  | {
      kind: "Image";
      thumbnail: {
        width: number;
        height: number;
        url: string;
      };
      resized: {
        width: number;
        height: number;
        url: string;
      };
    };

export type Content = {
  id: number;
  title: string | null;
  createdAt: string;
  timestamp: string;
  metadata: Record<string, string>;
  entity: Entity;
};
