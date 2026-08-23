export function isImageKitUrl(url: string) {
  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  return Boolean(endpoint && url.startsWith(endpoint.replace(/\/$/, "")));
}

export function getImageUrl(url: string, width = 900) {
  if (!url || !isImageKitUrl(url)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tr=w-${width}`;
}
