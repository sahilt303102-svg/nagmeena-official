import crypto from "crypto";

export function getImageKitAuth() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is not configured.");

  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 30 * 60;
  const signature = crypto
    .createHmac("sha1", privateKey)
    .update(token + expire)
    .digest("hex");

  return { token, expire, signature };
}

export function getImageKitEndpoint() {
  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (!endpoint) throw new Error("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT is not configured.");
  return endpoint.replace(/\/$/, "");
}
