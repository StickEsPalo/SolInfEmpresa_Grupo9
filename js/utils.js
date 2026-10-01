const CART_STORAGE_KEY = "planetaFicha.cart.v1";
const CART_COOKIE_NAME = "planetaFicha_cart";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function readCookie(name) {
  const prefix = `${name}=`;
  const part = document.cookie
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith(prefix));

  return part ? decodeURIComponent(part.slice(prefix.length)) : null;
}

function writeCartCookie(cart) {
  try {
    const json = JSON.stringify(cart);
    const encoded = encodeURIComponent(json);
    if (encoded.length > 3800) {
      expireCartCookie();
      return false;
    }

    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CART_COOKIE_NAME}=${encoded}; Max-Age=${CART_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    return readCookie(CART_COOKIE_NAME) === json;
  } catch {
    return false;
  }
}

function expireCartCookie() {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CART_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
  } catch {
    // The localStorage copy remains available if browser cookies are disabled.
  }
}

function readLocalStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function readStorage(key, fallback) {
  if (key === CART_STORAGE_KEY) {
    try {
      const cookieValue = readCookie(CART_COOKIE_NAME);
      if (cookieValue !== null) {
        const cart = JSON.parse(cookieValue);
        if (Array.isArray(cart)) return cart;
        expireCartCookie();
      }
    } catch {
      expireCartCookie();
    }

    const savedCart = readLocalStorage(key, fallback);
    if (Array.isArray(savedCart)) writeCartCookie(savedCart);
    return savedCart;
  }

  return readLocalStorage(key, fallback);
}

function persist(key, value) {
  const cookieSaved = key === CART_STORAGE_KEY && Array.isArray(value)
    ? writeCartCookie(value)
    : false;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (!cookieSaved) throw error;
  }
}

function safeText(value) {
  return String(value).replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]
  );
}

const euro = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR"
});

function formatPrice(value) {
  return euro.format(value);
}
