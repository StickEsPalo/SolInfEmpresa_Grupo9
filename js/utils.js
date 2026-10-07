const CART_USER_PREFIX = "planetaFicha.cart.user.v3.";
const CART_COOKIE_NAME = "planetaficha_cart_v3";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

// Indicative ECB reference rates dated 5 October 2026, in units per EUR.
// These rates are for display only; the backend stores all amounts in EUR.
const EUR_REFERENCE_RATES = Object.freeze({
  EUR: 1,
  USD: 1.1204,
});

let csrfToken = "";
function currentCurrency() {
  return currentLanguage === "en" ? "USD" : "EUR";
}

function readCookie(name) {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function writeCookie(name, value, maxAge = CART_COOKIE_MAX_AGE) {
  try {
    const encodedValue = encodeURIComponent(value);
    const secureAttribute = location.protocol === "https:" ? "; Secure" : "";

    document.cookie =
      `${name}=${encodedValue}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secureAttribute}`;
    return true;
  } catch {
    return false;
  }
}

function readLocalStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function readStorage(key, fallback) {
  return readLocalStorage(key, fallback);
}

function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("No se pudo guardar en localStorage", error);
  }
}

function safeText(value) {
  const escapedCharacters = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return String(value).replace(/[&<>"']/g, (character) => {
    return escapedCharacters[character];
  });
}

const priceFormatters = new Map();

function formatPrice(value) {
  const currency = currentCurrency();
  const locale =
    currency === "USD" ? "en-US" : localeForLanguage();
  const cacheKey = `${locale}:${currency}`;

  if (!priceFormatters.has(cacheKey)) {
    priceFormatters.set(
      cacheKey,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }),
    );
  }

  const amount = (Number(value) || 0) * EUR_REFERENCE_RATES[currency];
  return priceFormatters.get(cacheKey).format(amount);
}

function priceIncludingVat(netAmount) {
  const amount = Number(netAmount) || 0;
  return Math.round((amount * 1.21 + Number.EPSILON) * 100) / 100;
}

function priceBreakdownMarkup(netAmount) {
  const netPrice = Number(netAmount) || 0;
  const grossPrice = priceIncludingVat(netPrice);

  return `
    <span class="price-breakdown">
      <strong class="price price-gross">${formatPrice(grossPrice)}</strong>
      <small class="price-net">
        ${formatPrice(netPrice)} ${safeText(translateText("sin IVA"))}
      </small>
    </span>
  `;
}

async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (method !== "GET" && method !== "HEAD") {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));

  if (data.csrfToken) csrfToken = data.csrfToken;
  if (!response.ok) {
    throw new Error(data.error || `Error HTTP ${response.status}`);
  }

  return data;
}
