import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SECRET_KEY;

function headers(extra?: Record<string, string>) {
  return {
    apikey: supabaseAdminKey || "",
    Authorization: `Bearer ${supabaseAdminKey || ""}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function db(path: string, init?: RequestInit) {
  if (!supabaseUrl || !supabaseAdminKey) throw new Error("Supabase admin environment variables are not configured.");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
    cache: "no-store",
  });
}

const productSelect = "id,name,display_order,product_code,price,stock_status,stock_quantity,card_fabric,card_work,color,is_active,product_images(id,image_url,image_path,alt_text,sort_order,is_primary),product_specifications(upper_fabric,upper_work,upper_print,upper_length,bottom_fabric,bottom_length,dupatta_fabric,dupatta_work,dupatta_length,dupatta_print)";

type CleanVariant = {
  id: string | null;
  color: string;
  custom_code: string;
  stock_quantity: number;
  is_primary: boolean;
  is_active: boolean;
};

function variantSlug(color: string, index: number) {
  const slug = String(color || "")
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18);
  return slug || `COLOR${index + 1}`;
}

function cleanVariants(input: unknown): CleanVariant[] {
  if (!Array.isArray(input)) return [];
  const rows = input
    .map((raw: any) => ({
      id: raw?.id ? String(raw.id) : null,
      color: String(raw?.color || "").trim(),
      custom_code: String(raw?.custom_code || "").trim(),
      stock_quantity: Math.max(0, Math.floor(Number(raw?.stock_quantity) || 0)),
      is_primary: Boolean(raw?.is_primary),
      is_active: raw?.is_active !== false,
    }))
    .filter((v) => v.color || v.custom_code || v.id);

  if (!rows.length) return [];
  if (rows.filter((v) => v.is_primary).length !== 1) throw new Error("Choose exactly one primary colour variant.");

  for (const v of rows) {
    if (!v.color) throw new Error("Every colour variant needs a colour name.");
    if (!v.custom_code) throw new Error(`Enter your Custom Code for ${v.color}.`);
    if (!/^\d{4}(?:-\d{4}){4}$/.test(v.custom_code)) {
      throw new Error(`Custom Code for ${v.color} must look like 0000-1111-2222-0000-3333.`);
    }
  }

  const assertUnique = (values: string[], label: string) => {
    const set = new Set(values.map((x) => x.toLowerCase()));
    if (set.size !== values.length) throw new Error(`${label} must be unique for every colour variant.`);
  };
  assertUnique(rows.map((v) => v.color), "Colour");
  assertUnique(rows.map((v) => v.custom_code), "Custom Code");
  return rows;
}

async function nextBaseCode() {
  // Preferred path: DB sequence. If the migration is not present yet, fall back to a guarded scan.
  const rpc = await db("rpc/nagmeena_next_product_code", { method: "POST", body: "{}" });
  if (rpc.ok) {
    const value = await rpc.json();
    const code = Array.isArray(value) ? value[0] : value;
    if (typeof code === "string" && /^NAG-P\d+$/.test(code)) return code;
  }

  const response = await db("products?select=product_code&product_code=like.NAG-P*&limit=1000");
  if (!response.ok) throw new Error("Could not generate a NAG product code. Run the latest Supabase migration and try again.");
  const rows = await response.json();
  let max = 0;
  for (const row of rows) {
    const match = String(row.product_code || "").match(/^NAG-P(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `NAG-P${String(max + 1).padStart(3, "0")}`;
}

async function validateGlobalCustomCodes(productId: string | undefined, variants: CleanVariant[]) {
  for (const v of variants) {
    const response = await db(`product_variants?custom_code=eq.${encodeURIComponent(v.custom_code)}&select=id,product_id,color,is_active&limit=2`);
    if (!response.ok) {
      const text = await response.text();
      if (response.status === 404 || text.includes("product_variants")) throw new Error("Colour inventory is not ready in Supabase. Run the latest migration first.");
      throw new Error("Could not validate Custom Codes right now.");
    }
    const rows = await response.json();
    for (const row of rows) {
      if (v.id && row.id === v.id) continue;
      if (productId && row.product_id === productId && String(row.color).toLowerCase() === v.color.toLowerCase()) continue;
      throw new Error(`Custom Code ${v.custom_code} is already used by ${row.color || "another variant"}.`);
    }
  }
}

async function upsertSpecifications(productId: string, spec: Record<string, unknown>) {
  const response = await db("product_specifications?on_conflict=product_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ product_id: productId, ...spec }),
  });
  if (!response.ok) throw new Error(`Specifications could not be saved: ${await response.text()}`);
}

async function saveImages(productId: string, images: any[]) {
  const del = await db(`product_images?product_id=eq.${encodeURIComponent(productId)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!del.ok) throw new Error(`Existing images could not be updated: ${await del.text()}`);
  if (!images.length) return;
  const response = await db("product_images", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(images.map((x, i) => ({
      product_id: productId,
      image_url: x.image_url,
      image_path: x.image_path || null,
      alt_text: x.alt_text || null,
      sort_order: x.sort_order ?? i,
      is_primary: x.is_primary ?? i === 0,
    }))),
  });
  if (!response.ok) throw new Error(`Product images could not be saved: ${await response.text()}`);
}

async function saveVariants(productId: string, baseCode: string, variants: CleanVariant[]) {
  const currentResponse = await db(`product_variants?product_id=eq.${encodeURIComponent(productId)}&select=id,color,product_code,custom_code,is_active,is_primary`);
  if (!currentResponse.ok) {
    const text = await currentResponse.text();
    throw new Error(text.includes("product_variants") ? "Colour inventory is not ready in Supabase. Run the latest migration first." : `Variants could not be loaded: ${text}`);
  }
  const current: any[] = await currentResponse.json();
  const byId = new Map(current.map((v) => [v.id, v]));
  const inactiveByColor = new Map(current.filter((v) => !v.is_active).map((v) => [String(v.color).toLowerCase(), v]));
  const keepIds = new Set<string>();

  // Avoid the one-primary partial unique index while switching primary colour.
  const clearPrimary = await db(`product_variants?product_id=eq.${encodeURIComponent(productId)}&is_primary=eq.true`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ is_primary: false, updated_at: new Date().toISOString() }),
  });
  if (!clearPrimary.ok) throw new Error(`Primary colour could not be updated: ${await clearPrimary.text()}`);

  for (let index = 0; index < variants.length; index++) {
    const v = variants[index];
    const generatedCode = `${baseCode}-${variantSlug(v.color, index)}`;
    let targetId = v.id && byId.has(v.id) ? v.id : null;
    if (!targetId) targetId = inactiveByColor.get(v.color.toLowerCase())?.id || null;

    const payload = {
      product_id: productId,
      color: v.color,
      product_code: generatedCode,
      custom_code: v.custom_code,
      stock_quantity: v.stock_quantity,
      is_primary: v.is_primary,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const response = targetId
      ? await db(`product_variants?id=eq.${encodeURIComponent(targetId)}&product_id=eq.${encodeURIComponent(productId)}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(payload),
        })
      : await db("product_variants", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(payload),
        });

    if (!response.ok) {
      const text = await response.text();
      if (text.includes("product_variants_product_code_unique") || text.includes("product_code")) throw new Error(`The generated NAG code ${generatedCode} conflicts with an existing colour. Please save again or rename the colour.`);
      if (text.includes("custom_code")) throw new Error(`Custom Code ${v.custom_code} is already in use.`);
      if (text.includes("color_per_product")) throw new Error(`The colour ${v.color} already exists for this product.`);
      throw new Error(`Could not save ${v.color}: ${text}`);
    }
    const row = (await response.json())[0];
    if (row?.id) keepIds.add(row.id);
  }

  // Keep historical variants for order/return references, but make removed colours unsellable.
  for (const old of current) {
    if (!keepIds.has(old.id) && old.is_active) {
      const response = await db(`product_variants?id=eq.${encodeURIComponent(old.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ is_active: false, is_primary: false, stock_quantity: 0, updated_at: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error(`Removed colour ${old.color} could not be archived: ${await response.text()}`);
    }
  }
}

async function attachVariants(products: any[]) {
  if (!products.length) return products;
  const ids = products.map((p) => p.id).join(",");
  const response = await db(`product_variants?product_id=in.(${ids})&select=id,product_id,color,product_code,custom_code,stock_quantity,is_primary,is_active&order=is_primary.desc,created_at.asc`);
  const variants = response.ok ? await response.json() : [];
  const map = new Map<string, any[]>();
  variants.forEach((v: any) => { const list = map.get(v.product_id) || []; list.push(v); map.set(v.product_id, list); });
  return products.map((p) => ({ ...p, product_variants: map.get(p.id) || [] }));
}

function friendlyDatabaseError(raw: string) {
  if (raw.includes("category_id") && raw.includes("not-null")) return "Your Supabase products table still requires a category. Run the V17 migration once, then save again.";
  if (raw.includes("product_variants") && (raw.includes("schema cache") || raw.includes("does not exist"))) return "Colour inventory is not ready in Supabase. Run the V17 migration once, then save again.";
  if (raw.includes("42804") || (raw.includes("stock_status") && raw.includes("type text"))) return "Your Supabase stock-status function is from an older migration. Run the V19 inventory type-safety migration once, then save again.";
  if (raw.includes("custom_code")) return "That Custom Code is already being used. Please enter a unique Custom Code.";
  if (raw.includes("product_code")) return "A generated NAG code conflicted with an existing record. Please save again.";
  return raw;
}

export async function GET(request: Request) {
  if (!(await getAuthenticatedAdmin(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    const path = id
      ? `products?id=eq.${encodeURIComponent(id)}&select=${productSelect}&limit=1`
      : `products?select=${productSelect}&order=display_order.asc.nullslast,created_at.desc`;
    const response = await db(path);
    if (!response.ok) return NextResponse.json({ error: friendlyDatabaseError(await response.text()) }, { status: response.status });
    const products = await attachVariants(await response.json());
    if (id) {
      if (!products[0]) return NextResponse.json({ error: "Product not found." }, { status: 404 });
      return NextResponse.json({ product: products[0] });
    }
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load products." }, { status: 500 });
  }
}

async function save(request: Request, isUpdate: boolean) {
  if (!(await getAuthenticatedAdmin(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const id = body.id ? String(body.id) : "";
    if (isUpdate && !id) return NextResponse.json({ error: "Product id is required." }, { status: 400 });

    const variants = cleanVariants(body.variants);
    if (!isUpdate && variants.length === 0) return NextResponse.json({ error: "Add at least one colour variant before saving a new product." }, { status: 400 });
    await validateGlobalCustomCodes(isUpdate ? id : undefined, variants);

    let baseCode = isUpdate ? String(body.product_code || "").trim() : "";
    let existing: any = null;
    if (isUpdate) {
      const current = await db(`products?id=eq.${encodeURIComponent(id)}&select=id,name,product_code,stock_quantity,color,display_order&limit=1`);
      if (!current.ok) return NextResponse.json({ error: friendlyDatabaseError(await current.text()) }, { status: current.status });
      existing = (await current.json())[0];
      if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });
      baseCode = existing.product_code || baseCode;
    } else {
      baseCode = await nextBaseCode();
    }
    if (!baseCode) throw new Error("Could not generate a NAG product code. Run the latest migration and try again.");

    const total = variants.length ? variants.reduce((sum, v) => sum + v.stock_quantity, 0) : Math.max(0, Number(existing?.stock_quantity || 0));
    const primary = variants.find((v) => v.is_primary);
    const productPayload = {
      name: existing?.name || baseCode,
      product_code: baseCode,
      display_order: body.display_order ?? existing?.display_order ?? 0,
      price: body.price === null || body.price === "" || body.price === undefined ? null : Number(body.price),
      stock_quantity: total,
      card_fabric: String(body.card_fabric || "").trim() || null,
      card_work: String(body.card_work || "").trim() || null,
      color: primary?.color || existing?.color || null,
      is_active: body.is_active !== false,
    };

    let productId = id;
    if (isUpdate) {
      const response = await db(`products?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(productPayload),
      });
      if (!response.ok) return NextResponse.json({ error: friendlyDatabaseError(await response.text()) }, { status: response.status });
    } else {
      let created: any = null;
      let lastError = "";
      for (let attempt = 0; attempt < 3 && !created; attempt++) {
        if (attempt > 0) {
          baseCode = await nextBaseCode();
          productPayload.product_code = baseCode;
          productPayload.name = baseCode;
        }
        const response = await db("products", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(productPayload),
        });
        if (response.ok) created = (await response.json())[0];
        else {
          lastError = await response.text();
          if (!lastError.includes("product_code") && !lastError.includes("duplicate")) return NextResponse.json({ error: friendlyDatabaseError(lastError) }, { status: response.status });
        }
      }
      if (!created) throw new Error(friendlyDatabaseError(lastError || "Could not create product."));
      productId = created.id;
    }

    try {
      if (body.specifications) await upsertSpecifications(productId, body.specifications);
      if (Array.isArray(body.images)) await saveImages(productId, body.images);
      await saveVariants(productId, baseCode, variants);
    } catch (childError) {
      // New products are rolled back if child records fail, avoiding half-created catalog entries.
      if (!isUpdate && productId) await db(`products?id=eq.${encodeURIComponent(productId)}`, { method: "DELETE" }).catch(() => null);
      throw childError;
    }

    const result = await db(`products?id=eq.${encodeURIComponent(productId)}&select=${productSelect}&limit=1`);
    if (!result.ok) throw new Error(`Product was saved but could not be reloaded: ${await result.text()}`);
    const rows = await result.json();
    return NextResponse.json({ product: (await attachVariants(rows))[0] }, { status: isUpdate ? 200 : 201 });
  } catch (error) {
    const message = friendlyDatabaseError(error instanceof Error ? error.message : (isUpdate ? "Could not update product." : "Could not create product."));
    console.error("[admin/products] save failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) { return save(request, false); }
export async function PUT(request: Request) { return save(request, true); }

export async function DELETE(request: Request) {
  if (!(await getAuthenticatedAdmin(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string" && Boolean(id)) : (body.id ? [String(body.id)] : []);
    if (!ids.length) return NextResponse.json({ error: "Product id is required." }, { status: 400 });
    // Validate every selected product before deleting any of them, preventing partial bulk deletion.
    if (ids.length > 1) {
      for (const id of ids) {
        const variantsResponse = await db(`product_variants?product_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=stock_quantity`);
        if (!variantsResponse.ok) return NextResponse.json({ error: friendlyDatabaseError(await variantsResponse.text()) }, { status: variantsResponse.status });
        const variants = await variantsResponse.json();
        if (variants.some((variant: any) => Number(variant.stock_quantity || 0) > 0)) return NextResponse.json({ error: "One of the selected products is back in stock. Refresh the catalog and select again." }, { status: 409 });
      }
    }
    let deleted = 0;
    for (const id of ids) {
      const response = await db(`products?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      if (!response.ok) return NextResponse.json({ error: friendlyDatabaseError(await response.text()) }, { status: response.status });
      deleted += 1;
    }
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete product." }, { status: 500 });
  }
}
