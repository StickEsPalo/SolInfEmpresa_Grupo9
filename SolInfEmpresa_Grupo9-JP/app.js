/*
 * PlanetaFicha - prototipo académico sin backend.
 * La capa de persistencia usa localStorage para que la demostración pueda
 * desplegarse como sitio estático. Véase README para el modelo y límites.
 */

const STORAGE = {
  cart: "planetaFicha.cart.v1",
  orders: "planetaFicha.orders.v1",
  events: "planetaFicha.events.v1",
  tickets: "planetaFicha.tickets.v1"
};



const state = {
  filters: { category: "all", players: "all", difficulty: "all", search: "" },
  cart: readStorage(STORAGE.cart, []),
  orders: readStorage(STORAGE.orders, []),
  events: readStorage(STORAGE.events, []),
  tickets: readStorage(STORAGE.tickets, [])
};


const refs = {
  grid: document.querySelector("#product-grid"),
  count: document.querySelector("#product-count"),
  empty: document.querySelector("#empty-state"),
  cartCount: document.querySelector("#cart-count"),
  floatingCartButton: document.querySelector("#floating-cart-button"),
  floatingCartCount: document.querySelector("#floating-cart-count"),
  cartDrawer: document.querySelector("#cart-drawer"),
  cartItems: document.querySelector("#cart-items"),
  cartSummary: document.querySelector("#cart-summary"),
  overlay: document.querySelector(".overlay"),
  productDialog: document.querySelector("#product-dialog"),
  checkoutDialog: document.querySelector("#checkout-dialog"),
  successDialog: document.querySelector("#success-dialog"),
  adminDialog: document.querySelector("#admin-dialog"),
  eventPreview: document.querySelector("#event-preview-content"),
  eventCount: document.querySelector("#event-count"),
  toast: document.querySelector("#toast")
};

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("is-visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => refs.toast.classList.remove("is-visible"), 2600);
}

function openProduct(productId) {
  const product = getProduct(productId);
  if (!product) return;
  logEvent("product.viewed", { productId, productName: product.title });
  refs.productDialog.innerHTML = `<div>
    <div class="dialog-product-image" style="--tone:${product.tone};--image-text:${product.text}"><span>Diseño · ${safeText(product.origin)}</span><strong>${safeText(product.title)}</strong></div>
    <div class="dialog-product-content"><div class="dialog-header"><div><p class="eyebrow">${safeText(product.category)} · ${safeText(product.difficulty)}</p><h2 id="product-dialog-title">${safeText(product.title)}</h2></div><button class="icon-button" type="button" data-action="close-product" aria-label="Cerrar ficha">×</button></div>
      <p class="detail-lead">${safeText(product.description)}</p>
      <dl class="detail-meta"><div><dt>Jugadores</dt><dd>${safeText(product.players)}</dd></div><div><dt>Duración</dt><dd>${safeText(product.duration)}</dd></div><div><dt>Autoría</dt><dd>${safeText(product.author)}</dd></div><div><dt>Idioma</dt><dd>${safeText(product.language)}</dd></div><div><dt>Mecánicas</dt><dd>${safeText(product.mechanics)}</dd></div><div><dt>Disponibilidad</dt><dd>Catálogo permanente</dd></div></dl>
      <div class="dialog-product-price"><b>${formatPrice(product.price)}</b><button class="button button-primary" type="button" data-action="add-cart" data-id="${product.id}">Añadir al carrito <span>+</span></button></div>
    </div></div>`;
  refs.productDialog.showModal();
}

function closeDialog(dialog) { if (dialog.open) dialog.close(); }

document.addEventListener("click", event => {
  const target = event.target.closest("[data-action], [data-admin-tab]");
  if (!target) return;
  const { action, id, change, adminTab } = target.dataset;
  if (adminTab) { selectAdminTab(adminTab); return; }
  if (action === "toggle-mobile-menu") {
  const menu = document.querySelector("#mobile-menu");
  const open = menu.classList.toggle("is-open");
  target.setAttribute("aria-expanded", String(open));
  }
  if (action === "open-cart") openCart();
  if (action === "close-cart" || action === "close-overlays") closeCart();
  if (action === "add-cart") { addToCart(id); if (refs.productDialog.open) closeDialog(refs.productDialog); }
  if (action === "change-quantity") changeQuantity(id, change);
  if (action === "view-product") openProduct(id);
  if (action === "close-product") closeDialog(refs.productDialog);
  if (action === "start-checkout") openCheckout();
  if (action === "close-checkout") closeDialog(refs.checkoutDialog);
  if (action === "finish-order") { closeDialog(refs.successDialog); window.location.hash = "catalogo"; }
  if (action === "open-admin") openAdmin();
  if (action === "close-admin") closeDialog(refs.adminDialog);
  if (action === "toggle-filters") {
    const filters = document.querySelector("#filters");
    const visible = filters.classList.toggle("is-visible");
    target.setAttribute("aria-expanded", String(visible));
  }
  if (action === "clear-filters") {
    state.filters = { category: "all", players: "all", difficulty: "all", search: "" };
    document.querySelector("#search-input").value = "";
    document.querySelectorAll(".filter-pills").forEach(group => group.querySelectorAll(".pill").forEach((button, index) => button.classList.toggle("is-active", index === 0)));
    renderCatalog();
  }
  if (action === "export-events") exportEvents();
  if (action === "clear-events") clearEvents();
});

document.querySelectorAll("#mobile-menu a").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelector("#mobile-menu").classList.remove("is-open");
    document.querySelector(".mobile-menu-toggle")
      .setAttribute("aria-expanded", "false");
  });
});

document.querySelector("#search-input").addEventListener("input", event => { state.filters.search = event.target.value; renderCatalog(); });
document.querySelectorAll(".filter-pills").forEach(group => group.addEventListener("click", event => {
  const button = event.target.closest(".pill");
  if (!button) return;
  group.querySelectorAll(".pill").forEach(pill => pill.classList.toggle("is-active", pill === button));
  state.filters[group.dataset.filterGroup] = button.dataset.value;
  renderCatalog();
}));
document.querySelector("#checkout-form").addEventListener("submit", event => { event.preventDefault(); createOrder(event.currentTarget); });
document.querySelector("#checkout-form [name=promo]").addEventListener("input", updateCheckoutTotals);
document.querySelector("#support-form").addEventListener("submit", event => { event.preventDefault(); supportRequested(event.currentTarget); });
[refs.productDialog, refs.checkoutDialog, refs.successDialog, refs.adminDialog].forEach(dialog => dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); }));

renderCatalog();
renderCart();
renderEventPreview();
initFloatingCart();
