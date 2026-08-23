import { products as fallbackProducts, Product, ProductVariant } from "@/lib/products";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseConfigured() { return Boolean(supabaseUrl && supabaseKey); }

async function supabaseFetch<T>(path: string): Promise<T> {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase environment variables are not configured.");
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers: { apikey: supabaseKey }, cache: "no-store" });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${await response.text()}`);
  return response.json() as Promise<T>;
}

type SupabaseProduct = {
  id:string; name:string; display_order:number|null; product_code:string; price:number|null;
  stock_status:Product["stockStatus"]; stock_quantity?:number|null; card_fabric:string|null; card_work:string|null; color:string|null;
  product_images:Array<{id:string;image_url:string;image_path:string|null;alt_text:string|null;sort_order:number;is_primary:boolean}>;
  product_specifications:Array<{upper_fabric:string|null;upper_work:string|null;upper_print:string|null;upper_length:string|null;bottom_fabric:string|null;bottom_length:string|null;dupatta_fabric:string|null;dupatta_work:string|null;dupatta_length:string|null;dupatta_print:string|null}>;
  product_variants?:Array<{id:string;color:string;product_code:string;custom_code:string;stock_quantity:number;is_primary:boolean;is_active:boolean}>;
};

function mapVariant(row:any):ProductVariant { return { id:row.id, color:row.color, productCode:row.product_code, customCode:row.custom_code, stockQuantity:Number(row.stock_quantity||0), isPrimary:Boolean(row.is_primary), isActive:row.is_active!==false }; }
function mapProduct(row:SupabaseProduct):Product {
  const spec=row.product_specifications?.[0];
  const variants=(row.product_variants||[]).filter(v=>v.is_active!==false).map(mapVariant).sort((a,b)=>Number(b.isPrimary)-Number(a.isPrimary)||a.color.localeCompare(b.color));
  const total=variants.length?variants.reduce((s,v)=>s+v.stockQuantity,0):(row.stock_quantity??undefined);
  const stockStatus:Product["stockStatus"] = variants.length ? (total!<=0?"out_of_stock":total!<=2?"low_stock":"in_stock") : row.stock_status;
  return {
    id:row.id,name:row.name,productCode:row.product_code,category:"all",price:row.price,color:variants.find(v=>v.isPrimary)?.color||row.color,
    variants,stockStatus,stockQuantity:total,fabric:row.card_fabric,work:row.card_work,
    images:(row.product_images||[]).sort((a,b)=>a.sort_order-b.sort_order).map(i=>({id:i.id,url:i.image_url,path:i.image_path,altText:i.alt_text,sortOrder:i.sort_order,isPrimary:i.is_primary})),
    specifications:{upper:{fabric:spec?.upper_fabric,work:spec?.upper_work,print:spec?.upper_print,length:spec?.upper_length},bottom:{fabric:spec?.bottom_fabric,length:spec?.bottom_length},dupatta:{fabric:spec?.dupatta_fabric,work:spec?.dupatta_work,length:spec?.dupatta_length,print:spec?.dupatta_print}},
  };
}

export async function getCatalog():Promise<{products:Product[]}> {
  if(!isSupabaseConfigured()) return {products:fallbackProducts};
  try{
    const productRows=await supabaseFetch<SupabaseProduct[]>("products?select=id,name,display_order,product_code,price,stock_status,stock_quantity,card_fabric,card_work,color&is_active=eq.true&order=display_order.asc.nullslast,created_at.desc");
    const ids=productRows.map(p=>p.id); if(!ids.length)return {products:[]}; const inIds=ids.join(",");
    const [images,specs,variants]=await Promise.all([
      supabaseFetch<any[]>(`product_images?select=id,product_id,image_url,image_path,alt_text,sort_order,is_primary&product_id=in.(${inIds})&order=sort_order.asc`),
      supabaseFetch<any[]>(`product_specifications?select=product_id,upper_fabric,upper_work,upper_print,upper_length,bottom_fabric,bottom_length,dupatta_fabric,dupatta_work,dupatta_length,dupatta_print&product_id=in.(${inIds})`),
      supabaseFetch<any[]>(`product_variants?select=id,product_id,color,product_code,custom_code,stock_quantity,is_primary,is_active&product_id=in.(${inIds})&is_active=eq.true&order=is_primary.desc,created_at.asc`).catch(()=>[]),
    ]);
    const imageMap=new Map<string,any[]>(); images.forEach(i=>{const a=imageMap.get(i.product_id)||[];a.push(i);imageMap.set(i.product_id,a)});
    const specMap=new Map(specs.map(s=>[s.product_id,s])); const variantMap=new Map<string,any[]>(); variants.forEach(v=>{const a=variantMap.get(v.product_id)||[];a.push(v);variantMap.set(v.product_id,a)});
    return {products:productRows.map(row=>mapProduct({...row,product_images:imageMap.get(row.id)||[],product_specifications:specMap.get(row.id)?[specMap.get(row.id)]:[],product_variants:variantMap.get(row.id)||[]}))};
  }catch(error){console.error("Catalog load failed; using local fallback:",error);return {products:fallbackProducts};}
}
