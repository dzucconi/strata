import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { applyCacheHeaders } from "../lib/cache";
import { getContents } from "../lib/content";
import type { Content } from "../lib/types";

export const prerender = false;

const descriptionFor = (content: Content) => {
  switch (content.entity.kind) {
    case "Text":
      return content.entity.body;
    case "Link":
      return content.entity.url;
    case "Image":
      return content.entity.resized.url;
  }
};

export const GET: APIRoute = async (context) => {
  const contents = await getContents();
  const response = await rss({
    title: "Strata",
    description: "Strata",
    site: context.site!,
    trailingSlash: false,
    items: contents.slice(0, 50).map((content) => ({
      title: content.title || "Not titled",
      pubDate: new Date(content.timestamp),
      link: `/${content.id}`,
      description: descriptionFor(content),
    })),
    customData: `<language>en-us</language>`,
  });

  applyCacheHeaders(response.headers);
  return response;
};
