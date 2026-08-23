export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "preorder";

export interface ProductImage {
  id?: string;
  url: string;
  path?: string | null;
  altText?: string | null;
  sortOrder: number;
  isPrimary?: boolean;
}

export interface ProductSpecifications {
  upper: {
    fabric?: string | null;
    work?: string | null;
    print?: string | null;
    length?: string | null;
  };
  bottom: {
    fabric?: string | null;
    length?: string | null;
  };
  dupatta: {
    fabric?: string | null;
    work?: string | null;
    length?: string | null;
    print?: string | null;
  };
}

export interface ProductVariant {
  id: string;
  color: string;
  productCode: string;
  customCode: string;
  stockQuantity: number;
  isPrimary: boolean;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  productCode: string;
  category: string;
  categoryLabel?: string;
  price: number | null;
  stockStatus: StockStatus;
  stockQuantity?: number;
  fabric: string | null;
  work: string | null;
  color?: string | null;
  variants?: ProductVariant[];
  images: ProductImage[];
  specifications: ProductSpecifications;
}


/**
 * Local fallback used only until Supabase is configured.
 * The production source of truth becomes Supabase after setup.
 */
export const products: Product[] = [
  {
    id: "p1",
    name: "Meherunissa Anarkali",
    productCode: "NAG-P001",
    category: "all",
    price: null,
    stockStatus: "in_stock",
    fabric: "Pure Chanderi Silk",
    work: "Zari Embroidery",
    images: [
      { url: "/products/p1-1.png", sortOrder: 0, isPrimary: true },
      { url: "/products/p1-2.png", sortOrder: 1 },
      { url: "/products/p1-3.png", sortOrder: 2 },
    ],
    specifications: { upper: {}, bottom: {}, dupatta: {} },
  },
  {
    id: "p2",
    name: "Zeenat Floor-Length Anarkali",
    productCode: "NAG-P002",
    category: "all",
    price: null,
    stockStatus: "in_stock",
    fabric: "Georgette",
    work: "Thread & Sequin",
    images: [
      { url: "/products/p2-1.png", sortOrder: 0, isPrimary: true },
      { url: "/products/p2-2.png", sortOrder: 1 },
    ],
    specifications: { upper: {}, bottom: {}, dupatta: {} },
  },
  {
    id: "p3",
    name: "Rania Panelled Anarkali",
    productCode: "NAG-P003",
    category: "all",
    price: null,
    stockStatus: "in_stock",
    fabric: "Muslin Silk",
    work: "Gota Patti",
    images: [
      { url: "/products/p3-1.png", sortOrder: 0, isPrimary: true },
      { url: "/products/p3-2.png", sortOrder: 1 },
    ],
    specifications: { upper: {}, bottom: {}, dupatta: {} },
  },
  {
    id: "p4",
    name: "Amira Straight Suit",
    productCode: "NAG-P004",
    category: "all",
    price: null,
    stockStatus: "in_stock",
    fabric: "Cotton Silk",
    work: "Block Print",
    images: [
      { url: "/products/p4-1.png", sortOrder: 0, isPrimary: true },
      { url: "/products/p4-2.png", sortOrder: 1 },
    ],
    specifications: { upper: {}, bottom: {}, dupatta: {} },
  },
  {
    id: "p5",
    name: "Farah Panelled Straight Suit",
    productCode: "NAG-P005",
    category: "all",
    price: null,
    stockStatus: "in_stock",
    fabric: "Modal Satin",
    work: "Mirror Work",
    images: [
      { url: "/products/p5-1.png", sortOrder: 0, isPrimary: true },
      { url: "/products/p5-2.png", sortOrder: 1 },
    ],
    specifications: { upper: {}, bottom: {}, dupatta: {} },
  },
  {
    id: "p6",
    name: "Layla Kurta Set",
    productCode: "NAG-P006",
    category: "all",
    price: null,
    stockStatus: "in_stock",
    fabric: "Chanderi Cotton",
    work: "Hand Block Print",
    images: [
      { url: "/products/p6-1.png", sortOrder: 0, isPrimary: true },
      { url: "/products/p6-2.png", sortOrder: 1 },
    ],
    specifications: { upper: {}, bottom: {}, dupatta: {} },
  },
  {
    id: "p7",
    name: "Noorjahan Festive Suit",
    productCode: "NAG-P007",
    category: "all",
    price: null,
    stockStatus: "in_stock",
    fabric: "Organza Silk",
    work: "Sequin & Zari",
    images: [
      { url: "/products/p7-1.png", sortOrder: 0, isPrimary: true },
      { url: "/products/p7-2.png", sortOrder: 1 },
      { url: "/products/p7-3.png", sortOrder: 2 },
    ],
    specifications: { upper: {}, bottom: {}, dupatta: {} },
  },
  {
    id: "p8",
    name: "Yasmin Ceremonial Set",
    productCode: "NAG-P008",
    category: "all",
    price: null,
    stockStatus: "in_stock",
    fabric: "Silk Blend",
    work: "Dabka Embroidery",
    images: [
      { url: "/products/p8-1.png", sortOrder: 0, isPrimary: true },
      { url: "/products/p8-2.png", sortOrder: 1 },
      { url: "/products/p8-3.png", sortOrder: 2 },
    ],
    specifications: { upper: {}, bottom: {}, dupatta: {} },
  },
  {
    id: "p9",
    name: "Sahiba Radiance Suit",
    productCode: "NAG-P009",
    category: "all",
    price: null,
    stockStatus: "in_stock",
    fabric: "Tissue Silk",
    work: "Kundan & Zari",
    images: [
      { url: "/products/p9-1.png", sortOrder: 0, isPrimary: true },
      { url: "/products/p9-2.png", sortOrder: 1 },
      { url: "/products/p9-3.png", sortOrder: 2 },
    ],
    specifications: { upper: {}, bottom: {}, dupatta: {} },
  },
  {
    id: "p10",
    name: "Gulnaar Heavy Bridal Suit",
    productCode: "NAG-P010",
    category: "all",
    price: null,
    stockStatus: "in_stock",
    fabric: "Velvet",
    work: "Zardozi Embroidery",
    images: [
      { url: "/products/p10-1.png", sortOrder: 0, isPrimary: true },
      { url: "/products/p10-2.png", sortOrder: 1 },
    ],
    specifications: { upper: {}, bottom: {}, dupatta: {} },
  },
  {
    id: "p11",
    name: "Mahira Couture Suit",
    productCode: "NAG-P011",
    category: "all",
    price: null,
    stockStatus: "in_stock",
    fabric: "Raw Silk",
    work: "Hand Embellished",
    images: [
      { url: "/products/p11-1.png", sortOrder: 0, isPrimary: true },
      { url: "/products/p11-2.png", sortOrder: 1 },
      { url: "/products/p11-3.png", sortOrder: 2 },
    ],
    specifications: { upper: {}, bottom: {}, dupatta: {} },
  },
  {
    id: "p12",
    name: "Shireen Regal Suit",
    productCode: "NAG-P012",
    category: "all",
    price: null,
    stockStatus: "in_stock",
    fabric: "Banarasi Silk",
    work: "Zari Weave",
    images: [
      { url: "/products/p12-1.png", sortOrder: 0, isPrimary: true },
      { url: "/products/p12-2.png", sortOrder: 1 },
    ],
    specifications: { upper: {}, bottom: {}, dupatta: {} },
  },
];

export const config = {
  catalogPdfUrl: "https://nagmeenacatalog.my.canva.site/",
  whatsappNumber: "919599502046",
  whatsappMessage:
    "Hello NAGMEENA! I'm interested in inquiring about suit availability and sizing.",
  instagramUrl: "https://www.instagram.com/thenagmeena",
  pinterestUrl: "https://pinterest.com/nagmeena",
};
