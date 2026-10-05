const CART_USER_PREFIX = "planetaFicha.cart.user.v3.";
const CART_COOKIE_NAME = "planetaficha_cart_v3";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
let csrfToken = "";

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
const euro = new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"});
function formatPrice(value){return euro.format(Number(value)||0);}
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
