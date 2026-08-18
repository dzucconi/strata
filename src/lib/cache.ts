export const CDN_CACHE_CONTROL =
  "public, durable, s-maxage=300, stale-while-revalidate=86400";

export const applyCacheHeaders = (headers: Headers) => {
  headers.set("Netlify-CDN-Cache-Control", CDN_CACHE_CONTROL);
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
};
