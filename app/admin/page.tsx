"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Loader2,
  LogOut,
  Pencil,
  Save,
  Search,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import AdminOrders from "@/components/AdminOrders";
import AdminPromotion from "@/components/AdminPromotion";
import NagmeenaLoader from "@/components/NagmeenaLoader";

type AdminImage = {
  id?: string;
  image_url: string;
  image_path?: string | null;
  alt_text?: string | null;
  sort_order: number;
  is_primary: boolean;
};
type AdminSpec = {
  upper_fabric: string;
  upper_work: string;
  upper_print: string;
  upper_length: string;
  bottom_fabric: string;
  bottom_length: string;
  dupatta_fabric: string;
  dupatta_work: string;
  dupatta_length: string;
  dupatta_print: string;
};
type AdminVariant = {
  id?: string;
  color: string;
  product_code: string;
  custom_code: string;
  stock_quantity: number;
  is_primary: boolean;
  is_active: boolean;
};
type AdminProduct = {
  id: string;
  name: string;
  display_order: number | null;
  product_code: string;
  price: number | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | "preorder";
  stock_quantity: number;
  card_fabric: string | null;
  card_work: string | null;
  color: string | null;
  is_active: boolean;
  product_images: AdminImage[];
  product_specifications: AdminSpec[] | AdminSpec | null;
  product_variants?: AdminVariant[];
};
type HeroSlide = {
  id?: string;
  slide_number: number;
  title: string;
  desktop_image_url: string;
  mobile_image_url: string;
  desktop_image_path?: string | null;
  mobile_image_path?: string | null;
};
type FormVariant = {
  id?: string;
  color: string;
  product_code: string;
  custom_code: string;
  stock_quantity: string;
  is_primary: boolean;
  is_active: boolean;
};
type FormState = {
  id: string;
  display_order: number | null;
  product_code: string;
  price: string;
  stock_status: AdminProduct["stock_status"];
  card_fabric: string;
  card_work: string;
  is_active: boolean;
  specifications: AdminSpec;
  images: AdminImage[];
  variants: FormVariant[];
};
type Toast = { type: "success" | "error"; text: string } | null;

const emptySpec: AdminSpec = {
  upper_fabric: "",
  upper_work: "",
  upper_print: "",
  upper_length: "",
  bottom_fabric: "",
  bottom_length: "",
  dupatta_fabric: "",
  dupatta_work: "",
  dupatta_length: "",
  dupatta_print: "",
};
const emptyForm = (): FormState => ({
  id: "",
  display_order: null,
  product_code: "",
  price: "",
  stock_status: "out_of_stock",
  card_fabric: "",
  card_work: "",
  is_active: true,
  specifications: { ...emptySpec },
  images: [],
  variants: [],
});
const fallbackHero: HeroSlide[] = [
  {
    slide_number: 1,
    title: "Anarkali Suits — Festive Silhouettes",
    desktop_image_url: "/desk1.png",
    mobile_image_url: "/mobile1.png",
  },
  {
    slide_number: 2,
    title: "Straight Suits — Everyday Grace",
    desktop_image_url: "/desk 2.png",
    mobile_image_url: "/mobile2.png",
  },
  {
    slide_number: 3,
    title: "Designer Heavy Suits — Bridal Radiance",
    desktop_image_url: "/desk 3.png",
    mobile_image_url: "/mobile3.png",
  },
];

function formatCustomCode(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 20);
  return digits.match(/.{1,4}/g)?.join("-") || "";
}

function productSpec(product: AdminProduct): AdminSpec {
  const raw = product.product_specifications;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return {
    upper_fabric: String(value?.upper_fabric ?? ""),
    upper_work: String(value?.upper_work ?? ""),
    upper_print: String(value?.upper_print ?? ""),
    upper_length: String(value?.upper_length ?? ""),
    bottom_fabric: String(value?.bottom_fabric ?? ""),
    bottom_length: String(value?.bottom_length ?? ""),
    dupatta_fabric: String(value?.dupatta_fabric ?? ""),
    dupatta_work: String(value?.dupatta_work ?? ""),
    dupatta_length: String(value?.dupatta_length ?? ""),
    dupatta_print: String(value?.dupatta_print ?? ""),
  };
}

function uniqueExistingValues(values: Array<string | null | undefined>) {
  const seen = new Map<string, string>();
  for (const raw of values) {
    const value = String(raw || "").trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase();
    if (!seen.has(key)) seen.set(key, value);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

function SmartSuggestionInput({
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => {
    const query = String(value ?? "")
      .trim()
      .toLocaleLowerCase();
    if (!query) return suggestions.slice(0, 8);
    return suggestions
      .filter((item) => item.toLocaleLowerCase().includes(query))
      .sort((a, b) => {
        const aStarts = a.toLocaleLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.toLocaleLowerCase().startsWith(query) ? 0 : 1;
        return aStarts - bStarts || a.localeCompare(b);
      })
      .slice(0, 8);
  }, [suggestions, value]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | TouchEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <input
        value={value ?? ""}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="field"
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-52 overflow-auto rounded-2xl border border-emerald/10 bg-white p-1.5 shadow-2xl">
          <p className="px-3 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-[.14em] text-emerald/35">
            Existing values
          </p>
          {matches.map((item) => (
            <button
              key={item}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-xs text-emerald hover:bg-emerald/5"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [files, setFiles] = useState<File[]>([]);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<
    "all" | "in_stock" | "out_of_stock"
  >("all");
  const [dragId, setDragId] = useState<string | null>(null);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(fallbackHero);
  const [heroFiles, setHeroFiles] = useState<Record<string, File | undefined>>(
    {},
  );
  const [heroSaving, setHeroSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const formSectionRef = useRef<HTMLElement>(null);
  const inventoryUrl = "https://nagmeena-billing.vercel.app/";

  function notify(type: "success" | "error", text: string) {
    setToast({ type, text });
    window.setTimeout(
      () => setToast((current) => (current?.text === text ? null : current)),
      2800,
    );
  }

  const counts = useMemo(
    () => ({
      total: products.length,
      inStock: products.filter((p) => p.stock_status !== "out_of_stock").length,
      outOfStock: products.filter((p) => p.stock_status === "out_of_stock")
        .length,
    }),
    [products],
  );

  const searchSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .flatMap((p) => [
              p.product_code,
              p.card_fabric,
              p.card_work,
              p.color,
              ...(p.product_variants || []).flatMap((v) => [
                v.color,
                v.product_code,
                v.custom_code,
              ]),
              productSpec(p).upper_fabric,
              productSpec(p).upper_work,
              productSpec(p).upper_print,
            ])
            .filter(Boolean) as string[],
        ),
      ).sort(),
    [products],
  );
  const suggestionSets = useMemo(
    () => ({
      card_fabric: uniqueExistingValues(products.map((p) => p.card_fabric)),
      card_work: uniqueExistingValues(products.map((p) => p.card_work)),
      upper_fabric: uniqueExistingValues(
        products.map((p) => productSpec(p).upper_fabric),
      ),
      upper_work: uniqueExistingValues(
        products.map((p) => productSpec(p).upper_work),
      ),
      upper_print: uniqueExistingValues(
        products.map((p) => productSpec(p).upper_print),
      ),
      upper_length: uniqueExistingValues(
        products.map((p) => productSpec(p).upper_length),
      ),
      bottom_fabric: uniqueExistingValues(
        products.map((p) => productSpec(p).bottom_fabric),
      ),
      bottom_length: uniqueExistingValues(
        products.map((p) => productSpec(p).bottom_length),
      ),
      dupatta_fabric: uniqueExistingValues(
        products.map((p) => productSpec(p).dupatta_fabric),
      ),
      dupatta_work: uniqueExistingValues(
        products.map((p) => productSpec(p).dupatta_work),
      ),
      dupatta_length: uniqueExistingValues(
        products.map((p) => productSpec(p).dupatta_length),
      ),
      dupatta_print: uniqueExistingValues(
        products.map((p) => productSpec(p).dupatta_print),
      ),
    }),
    [products],
  );

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const text = [
        product.product_code,
        product.card_fabric,
        product.card_work,
        product.color,
        ...(product.product_variants || []).flatMap((v) => [
          v.color,
          v.product_code,
          v.custom_code,
        ]),
        productSpec(product).upper_fabric,
        productSpec(product).upper_work,
        productSpec(product).upper_print,
        productSpec(product).dupatta_fabric,
        productSpec(product).dupatta_work,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const stockOk =
        stockFilter === "all" ||
        (stockFilter === "in_stock"
          ? product.stock_status !== "out_of_stock"
          : product.stock_status === "out_of_stock");
      return (!query || text.includes(query)) && stockOk;
    });
  }, [products, search, stockFilter]);

  async function checkAuth() {
    try {
      const response = await fetch("/api/admin/auth", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      setAuthenticated(response.ok && Boolean(data.authenticated));
      if (data.email) setEmail(data.email);
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadData() {
    const [productsResponse, heroResponse] = await Promise.all([
      fetch("/api/admin/products", { cache: "no-store" }),
      fetch("/api/admin/hero", { cache: "no-store" }),
    ]);
    if (!productsResponse.ok) {
      const data = await productsResponse.json().catch(() => ({}));
      if (productsResponse.status === 401) setAuthenticated(false);
      throw new Error(data.error || "Could not load products.");
    }
    const data = await productsResponse.json();
    setProducts(data.products || []);
    const heroData = heroResponse.ok ? await heroResponse.json() : null;
    if (Array.isArray(heroData?.slides) && heroData.slides.length === 3)
      setHeroSlides(heroData.slides);
  }

  useEffect(() => {
    void checkAuth();
  }, []);
  useEffect(() => {
    if (authenticated)
      void loadData().catch((error) =>
        notify(
          "error",
          error instanceof Error ? error.message : "Could not load admin data.",
        ),
      );
  }, [authenticated]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed.");
      setAuthenticated(true);
      setPassword("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthenticated(false);
    setProducts([]);
    setForm(emptyForm());
  }

  async function editProduct(product: AdminProduct) {
    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/products?id=${encodeURIComponent(product.id)}`,
        { cache: "no-store" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          data.error || "Could not load the complete product details.",
        );
      const fullProduct: AdminProduct = data.product || product;
      const spec = productSpec(fullProduct);
      setForm({
        id: fullProduct.id,
        display_order: fullProduct.display_order,
        product_code: String(fullProduct.product_code ?? ""),
        price: fullProduct.price == null ? "" : String(fullProduct.price),
        stock_status: fullProduct.stock_status || "out_of_stock",
        card_fabric: String(fullProduct.card_fabric ?? ""),
        card_work: String(fullProduct.card_work ?? ""),
        is_active: fullProduct.is_active,
        specifications: spec,
        images: [...(fullProduct.product_images || [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
        variants: (fullProduct.product_variants || [])
          .filter((v) => v.is_active !== false)
          .map((v) => ({
            id: v.id,
            color: String(v.color ?? ""),
            product_code: String(v.product_code ?? ""),
            custom_code: String(v.custom_code ?? ""),
            stock_quantity: String(v.stock_quantity ?? 0),
            is_primary: Boolean(v.is_primary),
            is_active: true,
          })),
      });
      setFiles([]);
      setFilePreviews((current) => {
        current.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
      notify(
        "success",
        `Loaded all existing details for ${fullProduct.product_code}.`,
      );
      window.setTimeout(
        () =>
          formSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        80,
      );
    } catch (error) {
      notify(
        "error",
        error instanceof Error
          ? error.message
          : "Could not load product details.",
      );
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setForm(emptyForm());
    setFiles([]);
    setFilePreviews((current) => {
      current.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  }
  function selectProductFiles(nextFiles: File[]) {
    setFilePreviews((current) => {
      current.forEach((url) => URL.revokeObjectURL(url));
      return nextFiles.map((file) => URL.createObjectURL(file));
    });
    setFiles(nextFiles);
  }
  function moveExistingImage(index: number, direction: -1 | 1) {
    setForm((current) => {
      const next = [...current.images];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return {
        ...current,
        images: next.map((image, i) => ({
          ...image,
          sort_order: i,
          is_primary: i === 0,
        })),
      };
    });
  }
  function moveNewImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    setFiles((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setFilePreviews((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function removeNewImage(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
    setFilePreviews((current) => {
      const url = current[index];
      if (url) URL.revokeObjectURL(url);
      return current.filter((_, i) => i !== index);
    });
  }
  function addVariant() {
    setForm((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          color: "",
          product_code: "",
          custom_code: "",
          stock_quantity: "0",
          is_primary: current.variants.length === 0,
          is_active: true,
        },
      ],
    }));
  }
  function updateVariant(index: number, patch: Partial<FormVariant>) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((v, i) =>
        i === index ? { ...v, ...patch } : v,
      ),
    }));
  }
  function removeVariant(index: number) {
    setForm((current) => {
      const next = current.variants.filter((_, i) => i !== index);
      if (next.length && !next.some((v) => v.is_primary))
        next[0] = { ...next[0], is_primary: true };
      return { ...current, variants: next };
    });
  }
  function setPrimaryVariant(index: number) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((v, i) => ({
        ...v,
        is_primary: i === index,
      })),
    }));
  }

  async function uploadProductImages() {
    const uploaded: AdminImage[] = [];
    for (const [index, file] of files.entries()) {
      const body = new FormData();
      body.append("file", file);
      body.append("productCode", form.product_code || "new-product");
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || `Upload failed for ${file.name}`);
      uploaded.push({
        image_url: data.url,
        image_path: data.filePath,
        alt_text: form.product_code,
        sort_order: form.images.length + index,
        is_primary: form.images.length === 0 && index === 0,
      });
    }
    return uploaded;
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const code = String(form.product_code ?? "").trim();
      const normalizedVariants = form.variants.map((v) => ({
        ...v,
        color: String(v.color ?? "").trim(),
        product_code: "",
        custom_code: formatCustomCode(String(v.custom_code ?? "")),
        stock_quantity: Math.max(0, Math.floor(Number(v.stock_quantity || 0))),
        is_active: true,
      }));
      if (!form.id && normalizedVariants.length === 0)
        throw new Error(
          "Add at least one colour variant before saving a new product.",
        );
      if (normalizedVariants.length) {
        if (normalizedVariants.filter((v) => v.is_primary).length !== 1)
          throw new Error("Choose exactly one primary colour.");
        if (
          normalizedVariants.some(
            (v) => !v.color || !/^\d{4}(?:-\d{4}){4}$/.test(v.custom_code),
          )
        )
          throw new Error(
            "Each colour needs a Color and your 20-digit Custom Code.",
          );
        const unique = (values: string[], label: string) => {
          if (
            new Set(values.map((v) => v.toLowerCase())).size !== values.length
          )
            throw new Error(`${label} must be unique.`);
        };
        unique(
          normalizedVariants.map((v) => v.color),
          "Colours",
        );
        unique(
          normalizedVariants.map((v) => v.custom_code),
          "Custom codes",
        );
      }
      const uploaded = files.length ? await uploadProductImages() : [];
      const images = [...form.images, ...uploaded].map((image, index) => ({
        ...image,
        sort_order: index,
        is_primary: index === 0,
      }));
      const existing = products.find((p) => p.id === form.id);
      const payload = {
        id: form.id || undefined,
        display_order: form.id
          ? (existing?.display_order ?? products.length)
          : products.length,
        name: existing?.name || code || "NAGMEENA Suit",
        product_code: code || undefined,
        price: form.price === "" ? null : Number(form.price),
        card_fabric: String(form.card_fabric ?? "").trim() || null,
        card_work: String(form.card_work ?? "").trim() || null,
        color:
          normalizedVariants.find((v) => v.is_primary)?.color ||
          existing?.color ||
          null,
        variants: normalizedVariants,
        is_active: form.is_active,
        specifications: Object.fromEntries(
          Object.entries(form.specifications).map(([key, value]) => [
            key,
            String(value ?? "").trim() || null,
          ]),
        ),
        images,
      };
      const response = await fetch("/api/admin/products", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save product.");
      const wasEditing = Boolean(form.id);
      notify(
        "success",
        wasEditing
          ? "Product updated successfully — all details are live."
          : "Product added successfully — it is now ready in your catalog.",
      );
      resetForm();
      await loadData();
      window.setTimeout(
        () =>
          formSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        80,
      );
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Could not save product.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function reorderProduct(fromId: string, toId: string) {
    if (fromId === toId) return;
    const ordered = [...products];
    const from = ordered.findIndex((p) => p.id === fromId);
    const to = ordered.findIndex((p) => p.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    setProducts(ordered);
    try {
      const response = await fetch("/api/admin/products/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ordered.map((p) => p.id) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save order.");
      notify("success", "Website product order saved.");
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Could not save order.",
      );
      await loadData();
    }
  }

  async function deleteProduct(id: string) {
    if (
      !window.confirm("Delete this product? This removes it from the catalog.")
    )
      return;
    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not delete product.");
      if (form.id === id) resetForm();
      await loadData();
      notify("success", "Product deleted successfully.");
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Could not delete product.",
      );
    }
  }

  function removeImage(index: number) {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, i) => i !== index),
    }));
  }

  async function saveHero() {
    setHeroSaving(true);
    try {
      const nextSlides = [...heroSlides]
        .sort((a, b) => a.slide_number - b.slide_number)
        .map((slide) => ({ ...slide }));
      for (const slide of nextSlides) {
        for (const kind of ["desktop", "mobile"] as const) {
          const file = heroFiles[`${kind}-${slide.slide_number}`];
          if (!file) continue;
          const body = new FormData();
          body.append("file", file);
          body.append("uploadType", "hero");
          body.append("slideNumber", String(slide.slide_number));
          const response = await fetch("/api/admin/upload", {
            method: "POST",
            body,
          });
          const data = await response.json();
          if (!response.ok)
            throw new Error(
              data.error ||
                `Hero upload failed for slide ${slide.slide_number}.`,
            );
          if (kind === "desktop") {
            slide.desktop_image_url = data.url;
            slide.desktop_image_path = data.filePath;
          } else {
            slide.mobile_image_url = data.url;
            slide.mobile_image_path = data.filePath;
          }
        }
      }
      const response = await fetch("/api/admin/hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides: nextSlides }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save hero images.");
      setHeroSlides(nextSlides);
      setHeroFiles({});
      notify("success", "Hero images updated successfully.");
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Could not save hero images.",
      );
    } finally {
      setHeroSaving(false);
    }
  }

  if (loading && authenticated === null)
    return <NagmeenaLoader text="Preparing your dashboard..." />;

  if (authenticated === false)
    return (
      <main className="flex min-h-screen items-center justify-center bg-base px-4 py-12">
        <div className="w-full max-w-md rounded-[32px] border border-white/50 bg-white/55 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.10)] backdrop-blur-2xl sm:p-9">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white/80 ring-1 ring-gold/20">
            <Image
              src="/logo.jpg"
              alt="NAGMEENA"
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-gold">
            Private Access
          </p>
          <h1 className="mt-2 text-center font-heading text-3xl text-emerald">
            NAGMEENA Admin
          </h1>
          <form onSubmit={login} className="mt-7 space-y-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="Email address"
              className="field"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              placeholder="Password"
              className="field"
            />
            {loginError && (
              <p className="rounded-2xl border border-red-500/15 bg-red-500/5 px-4 py-3 text-xs text-red-700">
                {loginError}
              </p>
            )}
            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-sand to-gold py-3.5 text-sm font-semibold text-white shadow-gold disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}{" "}
              Sign in
            </button>
          </form>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen bg-base px-3 py-4 text-emerald sm:px-5 sm:py-6 lg:px-10">
      {toast && (
        <div
          className={`fixed left-1/2 top-4 z-[200] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-3xl border px-4 py-3.5 shadow-[0_18px_55px_rgba(26,59,51,.22)] backdrop-blur-xl sm:left-auto sm:right-5 sm:w-auto sm:translate-x-0 ${toast.type === "success" ? "border-gold/25 bg-base/95 text-emerald" : "border-red-200 bg-red-50/95 text-red-700"}`}
        >
          {toast.type === "success" ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald text-white">
              <CheckCircle2 size={17} />
            </span>
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white">
              <XCircle size={17} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-gold">
              {toast.type === "success" ? "NAGMEENA updated" : "Action needed"}
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-5">
              {toast.text}
            </p>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl min-w-0">
        <header className="mb-5 flex flex-col gap-4 rounded-3xl border border-white/40 bg-white/45 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-2xl sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold">
              NAGMEENA
            </p>
            <h1 className="font-heading text-2xl">Admin Panel</h1>
            <p className="truncate text-xs text-emerald/45">
              Signed in as {email || "authorized administrator"}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <a
              href={inventoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Inventory Management"
              className="group flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald/10 bg-white/65 px-4 py-2.5 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md sm:flex-none"
            >
              <ExternalLink
                size={14}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />{" "}
              Inventory Management
            </a>
            <button
              onClick={logout}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald/10 bg-white/65 px-4 py-2.5 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md sm:flex-none"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </header>

        <AdminOrders onNotify={notify} />

        <AdminPromotion onNotify={notify} />

        <section className="mb-6 rounded-3xl border border-white/40 bg-white/45 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-2xl sm:p-6">
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
              Homepage
            </p>
            <h2 className="mt-1 font-heading text-xl">Hero Section Images</h2>
            <p className="mt-1 text-xs text-emerald/50">
              Manage all 3 hero slides. Each slide supports desktop and mobile
              images.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {heroSlides.map((slide) => (
              <div
                key={slide.slide_number}
                className="rounded-2xl border border-white/50 bg-white/50 p-3"
              >
                <p className="mb-2 text-xs font-semibold text-emerald">
                  Slide {slide.slide_number}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#eee7da]">
                      <Image
                        src={slide.desktop_image_url}
                        alt={slide.title}
                        fill
                        sizes="300px"
                        className="object-cover"
                      />
                    </div>
                    <label className="mt-2 flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-dashed border-emerald/20 bg-white/60 px-2 py-2 text-[10px] font-semibold">
                      <Upload size={12} /> Desktop
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          setHeroFiles((current) => ({
                            ...current,
                            [`desktop-${slide.slide_number}`]:
                              e.target.files?.[0],
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div>
                    <div className="relative aspect-[9/14] overflow-hidden rounded-xl bg-[#eee7da]">
                      <Image
                        src={slide.mobile_image_url}
                        alt={slide.title}
                        fill
                        sizes="200px"
                        className="object-cover"
                      />
                    </div>
                    <label className="mt-2 flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-dashed border-emerald/20 bg-white/60 px-2 py-2 text-[10px] font-semibold">
                      <Upload size={12} /> Mobile
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          setHeroFiles((current) => ({
                            ...current,
                            [`mobile-${slide.slide_number}`]:
                              e.target.files?.[0],
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
                <p className="mt-2 truncate text-[10px] text-emerald/45">
                  {slide.title}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={saveHero}
            disabled={heroSaving}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-sand to-gold py-3.5 text-sm font-semibold text-white shadow-gold disabled:opacity-60"
          >
            {heroSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}{" "}
            Save Hero Images
          </button>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <section className="rounded-3xl border border-white/40 bg-white/45 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-2xl sm:p-6">
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
                Catalog Products
              </p>
              <h2 className="mt-1 font-heading text-xl">
                Product Order & Filters
              </h2>
              <p className="mt-1 text-xs text-emerald/45">
                Drag products to control the website order.
              </p>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <button
                onClick={() => setStockFilter("all")}
                className={`rounded-2xl border px-2 py-3 text-center ${stockFilter === "all" ? "border-gold bg-gold/10" : "border-emerald/8 bg-white/45"}`}
              >
                <span className="block text-lg font-semibold">
                  {counts.total}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-emerald/50">
                  Total
                </span>
              </button>
              <button
                onClick={() => setStockFilter("in_stock")}
                className={`rounded-2xl border px-2 py-3 text-center ${stockFilter === "in_stock" ? "border-emerald/25 bg-emerald/5" : "border-emerald/8 bg-white/45"}`}
              >
                <span className="block text-lg font-semibold text-emerald">
                  {counts.inStock}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-emerald/50">
                  In Stock
                </span>
              </button>
              <button
                onClick={() => setStockFilter("out_of_stock")}
                className={`rounded-2xl border px-2 py-3 text-center ${stockFilter === "out_of_stock" ? "border-red-500/20 bg-red-500/5" : "border-emerald/8 bg-white/45"}`}
              >
                <span className="block text-lg font-semibold text-red-600">
                  {counts.outOfStock}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-emerald/50">
                  Out of Stock
                </span>
              </button>
            </div>
            <div className="relative mb-4">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald/40"
                size={16}
              />
              <input
                list="catalog-search-suggestions"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, fabric, work or color"
                className="field min-w-0 !pl-12 !pr-12 text-xs sm:text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-emerald/45"
                >
                  <X size={14} />
                </button>
              )}
              <datalist id="catalog-search-suggestions">
                {searchSuggestions.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </div>
            <div className="mb-3 flex items-center justify-between text-[11px] text-emerald/45">
              <span>{visibleProducts.length} shown</span>
              <span>
                {search || stockFilter !== "all" ? "Filtered" : "All products"}
              </span>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1 lg:max-h-[720px]">
              {visibleProducts.map((product) => (
                <div
                  key={product.id}
                  draggable
                  onDragStart={() => setDragId(product.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragId) void reorderProduct(dragId, product.id);
                    setDragId(null);
                  }}
                  className={`flex cursor-grab items-center gap-3 rounded-2xl border border-white/50 bg-white/55 p-3 active:cursor-grabbing ${dragId === product.id ? "opacity-60" : ""}`}
                >
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-[#eee7da]">
                    {product.product_images?.[0]?.image_url ? (
                      <Image
                        src={product.product_images[0].image_url}
                        alt={product.product_code}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {product.product_code}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-emerald/50">
                      {product.card_fabric || "No fabric"}{" "}
                      {product.card_work ? `• ${product.card_work}` : ""}
                    </p>
                    <p
                      className={`mt-1 text-[11px] font-medium ${product.stock_quantity <= 0 || product.stock_status === "out_of_stock" ? "text-red-600" : "text-emerald"}`}
                    >
                      {product.stock_quantity} in stock •{" "}
                      {product.stock_status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <button
                    onClick={() => editProduct(product)}
                    aria-label={`Edit ${product.product_code}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald/10 bg-white/70"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    aria-label={`Delete ${product.product_code}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-500/10 bg-red-500/5 text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {!visibleProducts.length && (
                <div className="py-12 text-center text-sm text-emerald/50">
                  No products match these filters.
                </div>
              )}
            </div>
          </section>

          <section
            ref={formSectionRef}
            className="scroll-mt-5 rounded-[32px] border border-white/50 bg-white/55 p-5 shadow-[0_16px_55px_rgba(0,0,0,0.07)] backdrop-blur-2xl sm:p-7 lg:p-8"
          >
            <div className="mb-6 flex flex-col gap-3 border-b border-emerald/8 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
                  {form.id ? `Editing ${form.product_code}` : "Add New Product"}
                </p>
                <h2 className="mt-1 font-heading text-2xl">
                  Product Information
                </h2>
                <p className="mt-1 text-xs leading-5 text-emerald/50">
                  Images → product & colours → suit details → price → save.
                  Editing always loads the complete existing product.
                </p>
              </div>
              {form.id && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700"
                >
                  <X size={14} /> Cancel Edit
                </button>
              )}
            </div>
            <form onSubmit={saveProduct} className="space-y-7">
              <fieldset className="rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/5 to-white/60 p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald/75">
                      1. Product Images
                    </legend>
                    <p className="mt-1 text-[11px] leading-5 text-emerald/50">
                      The image in position <b>1</b> is the primary image shown
                      first on the website. Reorder with the arrows before
                      saving.
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-emerald/15 bg-white px-4 py-2.5 text-[11px] font-semibold shadow-sm">
                    <ImagePlus size={14} /> Add Images
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) =>
                        selectProductFiles(Array.from(e.target.files || []))
                      }
                    />
                  </label>
                </div>
                {form.images.length > 0 || files.length > 0 ? (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {form.images.map((image, index) => (
                      <div
                        key={`${image.image_url}-${index}`}
                        className={`relative overflow-hidden rounded-2xl border bg-[#eee7da] ${index === 0 ? "border-gold ring-2 ring-gold/15" : "border-emerald/10"}`}
                      >
                        <div className="relative aspect-[4/5]">
                          <Image
                            src={image.image_url}
                            alt={
                              image.alt_text ||
                              form.product_code ||
                              `Product image ${index + 1}`
                            }
                            fill
                            sizes="180px"
                            className="object-cover"
                          />
                          <span className="absolute left-2 top-2 rounded-full bg-emerald px-2 py-1 text-[9px] font-bold text-white">
                            {index + 1}
                            {index === 0 ? " · FIRST" : ""}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 bg-white/90 p-2">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveExistingImage(index, -1)}
                            className="flex items-center justify-center rounded-lg border py-1.5 disabled:opacity-25"
                          >
                            <ArrowLeft size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="flex items-center justify-center rounded-lg border border-red-100 py-1.5 text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={index === form.images.length - 1}
                            onClick={() => moveExistingImage(index, 1)}
                            className="flex items-center justify-center rounded-lg border py-1.5 disabled:opacity-25"
                          >
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {filePreviews.map((url, index) => {
                      const absolute = form.images.length + index;
                      return (
                        <div
                          key={url}
                          className={`relative overflow-hidden rounded-2xl border bg-[#eee7da] ${absolute === 0 ? "border-gold ring-2 ring-gold/15" : "border-emerald/10"}`}
                        >
                          <div className="relative aspect-[4/5]">
                            <img
                              src={url}
                              alt={`New upload ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-1 text-[9px] font-bold text-white">
                              {absolute + 1}
                              {absolute === 0 ? " · FIRST" : ""}
                            </span>
                            <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-semibold text-emerald">
                              New preview
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 bg-white/90 p-2">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveNewImage(index, -1)}
                              className="flex items-center justify-center rounded-lg border py-1.5 disabled:opacity-25"
                            >
                              <ArrowLeft size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeNewImage(index)}
                              className="flex items-center justify-center rounded-lg border border-red-100 py-1.5 text-red-600"
                            >
                              <Trash2 size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={index === files.length - 1}
                              onClick={() => moveNewImage(index, 1)}
                              className="flex items-center justify-center rounded-lg border py-1.5 disabled:opacity-25"
                            >
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <label className="mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-emerald/20 bg-white/55 text-center text-xs font-semibold text-emerald/55">
                    <Upload size={22} className="text-gold" />
                    Upload product images
                    <span className="text-[10px] font-normal text-emerald/40">
                      Preview and ordering appear here before save.
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) =>
                        selectProductFiles(Array.from(e.target.files || []))
                      }
                    />
                  </label>
                )}
              </fieldset>

              <fieldset className="rounded-3xl border border-emerald/10 bg-white/60 p-4 sm:p-6">
                <div>
                  <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald/75">
                    2. Product Card + Colour Variants
                  </legend>
                  <p className="mt-1 text-[11px] text-emerald/50">
                    Card information and all sellable colour inventory live
                    together here.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-emerald/45">
                      NAG Product Code
                    </label>
                    <div className="field flex items-center font-mono text-sm text-emerald/60">
                      {form.product_code ||
                        "Generated automatically when you save"}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-emerald/45">
                      Card Fabric
                    </label>
                    <SmartSuggestionInput
                      value={form.card_fabric}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          card_fabric: value,
                        }))
                      }
                      suggestions={suggestionSets.card_fabric}
                      placeholder="Fabric"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-emerald/45">
                      Card Work
                    </label>
                    <SmartSuggestionInput
                      value={form.card_work}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, card_work: value }))
                      }
                      suggestions={suggestionSets.card_work}
                      placeholder="Work (optional)"
                    />
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-emerald/8 pt-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.16em]">
                      Colour Variants & Inventory
                    </p>
                    <p className="mt-1 text-[11px] text-emerald/50">
                      {form.variants.length} colour
                      {form.variants.length === 1 ? "" : "s"} •{" "}
                      {form.variants.reduce(
                        (sum, v) => sum + Number(v.stock_quantity || 0),
                        0,
                      )}{" "}
                      total pieces
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="rounded-full border border-emerald/15 bg-white px-4 py-2 text-[11px] font-semibold"
                  >
                    + Add Colour
                  </button>
                </div>
                {form.variants.length === 0 ? (
                  <button
                    type="button"
                    onClick={addVariant}
                    className="mt-4 w-full rounded-2xl border border-dashed border-emerald/20 bg-white/50 p-5 text-xs font-semibold text-emerald/60"
                  >
                    Add your first colour variant
                  </button>
                ) : (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {form.variants.map((variant, index) => {
                      const qty = Number(variant.stock_quantity || 0);
                      const previewCode =
                        variant.product_code ||
                        (form.product_code && variant.color
                          ? `${form.product_code}-${variant.color
                              .toUpperCase()
                              .replace(/[^A-Z0-9]+/g, "-")
                              .replace(/^-|-$/g, "")}`
                          : "Generated after save");
                      return (
                        <div
                          key={variant.id || index}
                          className={`rounded-2xl border p-4 ${variant.is_primary ? "border-gold/30 bg-gold/5" : "border-emerald/10 bg-white/75"}`}
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-xs font-semibold">
                              <input
                                type="radio"
                                name="primary-variant"
                                checked={variant.is_primary}
                                onChange={() => setPrimaryVariant(index)}
                              />{" "}
                              Primary
                            </label>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${qty <= 0 ? "border-red-200 bg-red-100 text-red-700" : qty <= 2 ? "border-amber-300 bg-amber-100 text-amber-800" : "border-emerald/20 bg-emerald text-white"}`}
                            >
                              {qty <= 0
                                ? "Out of Stock"
                                : qty <= 2
                                  ? `Low Stock · ${qty}`
                                  : `In Stock · ${qty}`}
                            </span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input
                              value={variant.color}
                              onChange={(e) =>
                                updateVariant(index, { color: e.target.value })
                              }
                              placeholder="Colour"
                              className="field"
                            />
                            <div className="field flex items-center font-mono text-xs text-emerald/55">
                              {previewCode}
                            </div>
                            <input
                              value={variant.custom_code}
                              onChange={(e) =>
                                updateVariant(index, {
                                  custom_code: formatCustomCode(e.target.value),
                                })
                              }
                              inputMode="numeric"
                              maxLength={24}
                              placeholder="Custom code"
                              className="field font-mono"
                            />
                            <input
                              value={variant.stock_quantity}
                              onChange={(e) =>
                                updateVariant(index, {
                                  stock_quantity: e.target.value.replace(
                                    /[^0-9]/g,
                                    "",
                                  ),
                                })
                              }
                              type="number"
                              min="0"
                              step="1"
                              placeholder="Quantity"
                              className="field"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="mt-3 w-full rounded-full py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                          >
                            Remove colour
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </fieldset>

              <fieldset className="rounded-3xl border border-emerald/10 bg-white/60 p-4 sm:p-6">
                <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald/75">
                  3. Upper, Bottom & Dupatta
                </legend>
                <p className="mt-1 text-[11px] text-emerald/50">
                  Start typing to reuse values from your existing suits. You can
                  still enter a completely new value.
                </p>
                <div className="mt-4 grid gap-5 lg:grid-cols-3">
                  <div>
                    <p className="mb-3 font-heading text-lg">Upper</p>
                    <div className="space-y-3">
                      <SmartSuggestionInput
                        value={form.specifications.upper_fabric}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            specifications: {
                              ...current.specifications,
                              upper_fabric: value,
                            },
                          }))
                        }
                        suggestions={suggestionSets.upper_fabric}
                        placeholder="Fabric"
                      />
                      <SmartSuggestionInput
                        value={form.specifications.upper_work}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            specifications: {
                              ...current.specifications,
                              upper_work: value,
                            },
                          }))
                        }
                        suggestions={suggestionSets.upper_work}
                        placeholder="Work (optional)"
                      />
                      <SmartSuggestionInput
                        value={form.specifications.upper_print}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            specifications: {
                              ...current.specifications,
                              upper_print: value,
                            },
                          }))
                        }
                        suggestions={suggestionSets.upper_print}
                        placeholder="Print (optional)"
                      />
                      <SmartSuggestionInput
                        value={form.specifications.upper_length}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            specifications: {
                              ...current.specifications,
                              upper_length: value,
                            },
                          }))
                        }
                        suggestions={suggestionSets.upper_length}
                        placeholder="Length"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 font-heading text-lg">Bottom</p>
                    <div className="space-y-3">
                      <SmartSuggestionInput
                        value={form.specifications.bottom_fabric}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            specifications: {
                              ...current.specifications,
                              bottom_fabric: value,
                            },
                          }))
                        }
                        suggestions={suggestionSets.bottom_fabric}
                        placeholder="Fabric"
                      />
                      <SmartSuggestionInput
                        value={form.specifications.bottom_length}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            specifications: {
                              ...current.specifications,
                              bottom_length: value,
                            },
                          }))
                        }
                        suggestions={suggestionSets.bottom_length}
                        placeholder="Length / Type"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 font-heading text-lg">Dupatta</p>
                    <div className="space-y-3">
                      <SmartSuggestionInput
                        value={form.specifications.dupatta_fabric}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            specifications: {
                              ...current.specifications,
                              dupatta_fabric: value,
                            },
                          }))
                        }
                        suggestions={suggestionSets.dupatta_fabric}
                        placeholder="Fabric"
                      />
                      <SmartSuggestionInput
                        value={form.specifications.dupatta_work}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            specifications: {
                              ...current.specifications,
                              dupatta_work: value,
                            },
                          }))
                        }
                        suggestions={suggestionSets.dupatta_work}
                        placeholder="Work (optional)"
                      />
                      <SmartSuggestionInput
                        value={form.specifications.dupatta_length}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            specifications: {
                              ...current.specifications,
                              dupatta_length: value,
                            },
                          }))
                        }
                        suggestions={suggestionSets.dupatta_length}
                        placeholder="Length"
                      />
                      <SmartSuggestionInput
                        value={form.specifications.dupatta_print}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            specifications: {
                              ...current.specifications,
                              dupatta_print: value,
                            },
                          }))
                        }
                        suggestions={suggestionSets.dupatta_print}
                        placeholder="Print (optional)"
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              <fieldset className="rounded-3xl border border-gold/20 bg-gold/5 p-4 sm:p-6">
                <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald/75">
                  4. Price
                </legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-emerald/45">
                      Selling Price
                    </label>
                    <input
                      value={form.price}
                      onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                      }
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="₹ Price"
                      className="field text-lg font-semibold"
                    />
                  </div>
                  <label className="flex min-h-[46px] items-center gap-2 rounded-2xl border border-emerald/10 bg-white/70 px-4 text-xs text-emerald/70">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm({ ...form, is_active: e.target.checked })
                      }
                    />{" "}
                    Show on website
                  </label>
                </div>
              </fieldset>

              <div className="sticky bottom-3 z-20 rounded-3xl border border-white/60 bg-base/90 p-3 shadow-[0_15px_45px_rgba(26,59,51,.18)] backdrop-blur-xl sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div className="mb-2 min-w-0 sm:mb-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-gold">
                    5. Save Product
                  </p>
                  <p className="truncate text-xs text-emerald/50">
                    {form.id
                      ? `Editing ${form.product_code}`
                      : "New catalog product"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  {form.id ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-full border border-emerald/15 bg-white px-5 py-3 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-full border border-emerald/15 bg-white px-5 py-3 text-xs font-semibold"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    disabled={saving}
                    className="flex min-w-40 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-sand to-gold px-6 py-3 text-xs font-semibold text-white shadow-gold disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}{" "}
                    {form.id ? "Update Product" : "Add Product"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
