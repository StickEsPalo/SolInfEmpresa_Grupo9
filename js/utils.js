const CART_USER_PREFIX = "planetaFicha.cart.user.v3.";
const CART_COOKIE_NAME = "planetaficha_cart_v3";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const CURRENCY_STORAGE_KEY = "planetaficha.currency.v1";
// ECB indicative reference, 05/10/2026: units per EUR. Display only; backend remains EUR.
const EUR_REFERENCE_RATES = Object.freeze({ EUR: 1, USD: 1.1204, GBP: 0.8472 });
let csrfToken = "";
let currentCurrency = (() => {
  try {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return Object.hasOwn(EUR_REFERENCE_RATES, saved) ? saved : "EUR";
  } catch {
    return "EUR";
  }
})();

function readCookie(name) {
  const prefix = `${name}=`;
  const part = document.cookie.split(";").map(v=>v.trim()).find(v=>v.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : null;
}
function writeCookie(name,value,maxAge=CART_COOKIE_MAX_AGE){
  try{const encoded=encodeURIComponent(value);const secure=location.protocol==="https:"?"; Secure":"";document.cookie=`${name}=${encoded}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;return true;}catch{return false;}
}
function readLocalStorage(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return v??fallback;}catch{return fallback;}}
function readStorage(key,fallback){return readLocalStorage(key,fallback);}
function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){console.warn("No se pudo guardar en localStorage",e);}}
function safeText(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));}
const priceFormatters = new Map();
function formatPrice(value){
  const currency = currentCurrency;
  const locale = currency === "USD" ? "en-US" : currency === "GBP" ? "en-GB" : localeForLanguage();
  const cacheKey = `${locale}:${currency}`;
  if (!priceFormatters.has(cacheKey)) {
    priceFormatters.set(cacheKey, new Intl.NumberFormat(locale, { style: "currency", currency }));
  }
  return priceFormatters.get(cacheKey).format((Number(value) || 0) * EUR_REFERENCE_RATES[currency]);
}
function updateCurrencyControl(){
  const select=document.querySelector("#currency-select");
  if(select)select.value=currentCurrency;
}
function setSiteCurrency(currency){
  if(!Object.hasOwn(EUR_REFERENCE_RATES,currency))return;
  currentCurrency=currency;
  try{localStorage.setItem(CURRENCY_STORAGE_KEY,currentCurrency);}catch{}
  updateCurrencyControl();
  if(typeof renderCatalog==="function")renderCatalog();
  if(typeof renderCart==="function")renderCart();
  const productDialog=document.querySelector("#product-dialog");
  if(productDialog?.open&&typeof openProduct==="function")openProduct(productDialog.dataset.productId,Number(productDialog.dataset.variantIndex),"next",false);
  if(document.querySelector("#checkout-dialog")?.open){
    if(typeof renderCheckoutItems==="function")renderCheckoutItems();
    if(typeof updateCheckoutTotals==="function")updateCheckoutTotals();
  }
}
document.addEventListener("change",event=>{
  if(event.target.matches("#currency-select"))setSiteCurrency(event.target.value);
});
updateCurrencyControl();
function priceIncludingVat(netAmount){return Math.round(((Number(netAmount)||0)*1.21+Number.EPSILON)*100)/100;}
function priceBreakdownMarkup(netAmount){const net=Number(netAmount)||0;return `<span class="price-breakdown"><strong class="price price-gross">${formatPrice(priceIncludingVat(net))}</strong><small class="price-net">${formatPrice(net)} ${safeText(translateText("sin IVA"))}</small></span>`;}
async function apiRequest(path,options={}){
  const method=(options.method||"GET").toUpperCase();
  const headers=new Headers(options.headers||{});
  if(!headers.has("Accept"))headers.set("Accept","application/json");
  if(method!=="GET"&&method!=="HEAD"){
    if(!headers.has("Content-Type"))headers.set("Content-Type","application/json");
    if(csrfToken)headers.set("X-CSRF-Token",csrfToken);
  }
  const response=await fetch(path,{...options,headers,credentials:"same-origin",cache:"no-store"});
  const data=await response.json().catch(()=>({}));
  if(data.csrfToken)csrfToken=data.csrfToken;
  if(!response.ok)throw new Error(data.error||`Error HTTP ${response.status}`);
  return data;
}
