/** @type {import('next').NextConfig} */
const imageKitEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
const remotePatterns = [
  // ImageKit's standard delivery hostname. Keep this enabled even when the
  // endpoint env var is missing so existing Supabase image URLs still render.
  {
    protocol: "https",
    hostname: "ik.imagekit.io",
    pathname: "/**",
  },
];

if (imageKitEndpoint) {
  try {
    const url = new URL(imageKitEndpoint);
    const pathname = url.pathname.replace(/\/$/, "");
    const pattern = {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      pathname: `${pathname || ""}/**`,
    };

    if (!remotePatterns.some((item) => item.protocol === pattern.protocol && item.hostname === pattern.hostname && item.pathname === pattern.pathname)) {
      remotePatterns.push(pattern);
    }
  } catch {
    // The ImageKit endpoint is validated by the upload/image helpers at runtime.
  }
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns,
  },
};

module.exports = nextConfig;
