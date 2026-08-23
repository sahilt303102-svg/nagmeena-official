/**
 * Upload the current /public/products images to ImageKit and replace the
 * corresponding product image URLs in Supabase.
 *
 * Run after creating the Supabase schema and adding .env.local:
 *   node scripts/migrate-local-images.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";


// Load .env.local without adding a runtime dependency.
try {
  const envText = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
} catch {}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "IMAGEKIT_PUBLIC_KEY",
  "IMAGEKIT_PRIVATE_KEY",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Add it to .env.local before running this script.`);
    process.exit(1);
  }
}

const root = process.cwd();
const productsDir = path.join(root, "public", "products");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const secretKey = process.env.SUPABASE_SECRET_KEY;
const imageKitPublicKey = process.env.IMAGEKIT_PUBLIC_KEY;
const imageKitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;

const productCodeByLegacyId = Object.fromEntries(
  Array.from({ length: 12 }, (_, index) => [
    `p${index + 1}`,
    `NAG-P${String(index + 1).padStart(3, "0")}`,
  ]),
);

async function supabase(pathname, init = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function uploadToImageKit(buffer, fileName, productCode) {
  const form = new FormData();
  form.append("file", new Blob([buffer]));
  form.append("fileName", fileName);
  form.append("publicKey", imageKitPublicKey);
  form.append("useUniqueFileName", "true");
  form.append("folder", `/nagmeena/products/${productCode}`);

  const credentials = Buffer.from(`${imageKitPrivateKey}:`).toString("base64");
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: form,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`ImageKit ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

const files = (await fs.readdir(productsDir)).filter((name) => /\.(png|jpe?g|webp)$/i.test(name));
files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

for (const fileName of files) {
  const match = fileName.match(/^(p\d+)-\d+\.(png|jpe?g|webp)$/i);
  if (!match) continue;
  const productCode = productCodeByLegacyId[match[1]];
  if (!productCode) continue;

  console.log(`Uploading ${fileName} → ${productCode}`);
  const buffer = await fs.readFile(path.join(productsDir, fileName));
  const uploaded = await uploadToImageKit(buffer, fileName, productCode);
  const sortOrder = Number(fileName.match(/-(\d+)\./)?.[1] || 1) - 1;

  const products = await supabase(`products?select=id&product_code=eq.${encodeURIComponent(productCode)}`);
  if (!products?.[0]?.id) {
    console.warn(`Skipping DB update: ${productCode} is not present in Supabase.`);
    continue;
  }

  const existing = await supabase(`product_images?select=id&product_id=eq.${products[0].id}&sort_order=eq.${sortOrder}`);
  const body = {
    image_url: uploaded.url,
    image_path: uploaded.filePath,
    alt_text: productCode,
    sort_order: sortOrder,
    is_primary: sortOrder === 0,
  };

  if (existing?.[0]?.id) {
    await supabase(`product_images?id=eq.${existing[0].id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(body),
    });
  } else {
    await supabase("product_images", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ product_id: products[0].id, ...body }),
    });
  }
}

console.log("\nImage migration complete. The catalog now points at ImageKit for the migrated images.");
