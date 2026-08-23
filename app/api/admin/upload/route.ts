import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await getAuthenticatedAdmin(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  if (!privateKey || !publicKey) return NextResponse.json({ error: "ImageKit is not configured." }, { status: 500 });

  const incoming = await request.formData();
  const file = incoming.get("file");
  const uploadType = String(incoming.get("uploadType") || "product").trim();
  const productCode = String(incoming.get("productCode") || "product").trim();
  const slideNumber = String(incoming.get("slideNumber") || "1").trim();

  if (!(file instanceof File)) return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Image must be 25MB or smaller." }, { status: 400 });

  const folder = uploadType === "hero"
    ? `/nagmeena/hero/slide-${slideNumber.replace(/[^0-9]/g, "") || "1"}`
    : uploadType === "promotion"
      ? "/nagmeena/promotions"
      : `/nagmeena/products/${productCode.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  const form = new FormData();
  form.append("file", file, file.name);
  form.append("fileName", file.name);
  form.append("publicKey", publicKey);
  form.append("useUniqueFileName", "true");
  form.append("folder", folder);

  const credentials = Buffer.from(`${privateKey}:`).toString("base64");
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Basic ${credentials}` },
    body: form,
  });

  const payload = await response.json();
  if (!response.ok) return NextResponse.json({ error: payload?.message || "ImageKit upload failed.", details: payload }, { status: response.status });

  return NextResponse.json({ url: payload.url, fileId: payload.fileId, filePath: payload.filePath, name: payload.name });
}
