"use client";
export type RememberedOrder={token:string;lastStatus?:string;celebrationSeen?:boolean;confirmedSeenAt?:number;rejectionSeen?:boolean;rejectedSeenAt?:number};
const KEY="nagmeena-orders-v16";
const LEGACY="nagmeena-active-order-token";
export function readRememberedOrders():RememberedOrder[]{try{const raw=localStorage.getItem(KEY);const arr=raw?JSON.parse(raw):[];const out:Array<RememberedOrder>=Array.isArray(arr)?arr.filter(x=>x&&typeof x.token==="string"):[];const legacy=localStorage.getItem(LEGACY);if(legacy&&!out.some(x=>x.token===legacy))out.push({token:legacy});return out.slice(-12);}catch{return [];}}
export function writeRememberedOrders(rows:RememberedOrder[]){localStorage.setItem(KEY,JSON.stringify(rows.slice(-12)));localStorage.removeItem(LEGACY);window.dispatchEvent(new Event("nagmeena-orders-change"));}
export function rememberOrder(token:string,status?:string){const rows=readRememberedOrders();const i=rows.findIndex(x=>x.token===token);if(i>=0)rows[i]={...rows[i],lastStatus:status||rows[i].lastStatus};else rows.push({token,lastStatus:status});writeRememberedOrders(rows);}
export function updateRememberedOrder(token:string,patch:Partial<RememberedOrder>){const rows=readRememberedOrders();const i=rows.findIndex(x=>x.token===token);if(i<0)return;rows[i]={...rows[i],...patch};writeRememberedOrders(rows);}
export function forgetOrder(token:string){writeRememberedOrders(readRememberedOrders().filter(x=>x.token!==token));}
