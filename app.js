/*
 * Pangea Meeple - interfaz web conectada a api.php y a la base de DonDominio.
 * El carrito es local; catálogo, pedidos, pagos, incidencias y eventos se
 * leen y guardan en la base de datos juegos_y_puzles.
 */

const API_URL = "api.php";
const CART_STORAGE_KEY = "pangeaMeeple.cart.v1";
const state = {
  filters: { category: "all", players: "all", difficulty: "all", search: "" },
  products: [],
  cart: readCart(),
  orders: [],
  events: [],
  summary: { orders: 0, revenue: 0, events: 0, tickets: 0 },
  backendNoticeShown: false
};

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const refs = {
  grid: document.querySelector("#product-grid"),
  count: document.querySelector("#product-count"),
  empty: document.querySelector("#empty-state"),
  cartCount: document.querySelector("#cart-count"),
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

function fmt(template, ...values) {
  return template.replace(/\{(\d+)\}/g, (match, index) => String(values[Number(index)] ?? ""));
}

function readCart() {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function persistCart() {
  try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart)); } catch { /* El carrito sigue en memoria. */ }
}

async function apiGet(action, params = {}) {
  const query = new URLSearchParams({ action, ...params });
  const response = await fetch(API_URL + "?" + query, { headers: { Accept: "application/json" } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Error del servidor (" + response.status + ").");
  return result;
}

async function apiPost(action, payload) {
  const response = await fetch(API_URL + "?action=" + encodeURIComponent(action), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Error del servidor (" + response.status + ").");
  return result;
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function getProduct(id) {
  return state.products.find(product => String(product.id) === String(id));
}

function formatPrice(value) {
  return euro.format(Number(value) || 0);
}

function cartLines() {
  return state.cart.map(line => ({ ...line, product: getProduct(line.productId) }))
    .filter(line => line.product && Number(line.quantity) > 0);
}

function calculateCart(promoCode = "") {
  const subtotal = cartLines().reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const discount = promoCode.trim().toUpperCase() === "YUZU10" ? subtotal * 0.1 : 0;
  const shipping = subtotal === 0 || subtotal >= 70 ? 0 : 6.9;
  const taxableBase = subtotal - discount + shipping;
  const tax = taxableBase * 0.21;
  return { subtotal, discount, shipping, tax, total: taxableBase + tax };
}

const eventNames = {
  "product.viewed": "producto.visto",
  "cart.item_added": "carrito.producto_anadido",
  "checkout.started": "checkout.iniciado"
};

async function logEvent(type, payload = {}) {
  try {
    await apiPost("event", { type, payload });
    state.events.unshift({
      id: "local-" + Date.now() + "-" + Math.random(),
      type: eventNames[type] || type,
      occurredAt: new Date().toISOString(),
      source: "Base de DonDominio / eventos",
      payload
    });
    state.summary.events += 1;
    renderEventPreview();
  } catch (error) {
    notifyBackendError(error);
  }
}

function notifyBackendError(error) {
  if (state.backendNoticeShown) return;
  state.backendNoticeShown = true;
  showToast(error.message || "No se pudo conectar con la base de datos del hosting DonDominio.");
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("is-visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => refs.toast.classList.remove("is-visible"), 3200);
}

function productColors(product) {
  const colors = [
    ["#528daa", "#f6f1e6"], ["#17201e", "#e1eeab"], ["#c66c7d", "#fff7e8"],
    ["#445b78", "#f9e8c0"], ["#e4a143", "#17201e"], ["#506b65", "#f6f1e6"],
    ["#9b4c3b", "#f9e9ca"], ["#7d7995", "#fff7e8"], ["#6c8450", "#fff7e8"],
    ["#d78485", "#fff7e8"], ["#dd9b4b", "#17201e"], ["#517d91", "#fff7e8"]
  ];
  const index = Math.abs(Number(product.id) || 0) % colors.length;
  return { tone: colors[index][0], text: colors[index][1] };
}

function productSymbol(product) {
  if (product.type === "puzzle") return "▧";
  const symbols = ["✦", "波", "☼", "△", "⌘", "ᛊ"];
  return symbols[(Number(product.id) || 0) % symbols.length];
}

function renderCategoryFilters() {
  const group = document.querySelector('[data-filter-group="category"]');
  if (!group) return;
  const categories = [...new Set(state.products.flatMap(product => product.categories || [product.category]))]
    .sort((a, b) => a.localeCompare(b, "es"));
  group.innerHTML = '<button class="pill is-active" type="button" data-value="all">Todo</button>' + categories.map(category =>
    fmt('<button class="pill" type="button" data-value="{0}">{1}</button>',
      safeText(category), safeText(category === "Puzzle" ? "Puzzles" : category))
  ).join("");
}

function renderCatalog() {
  const { category, players, difficulty, search } = state.filters;
  const query = search.toLocaleLowerCase("es").trim();
  const filtered = state.products.filter(product => {
    const searchable = (product.title + " " + product.description + " "
      + (product.categories || [product.category]).join(" ") + " " + product.origin).toLocaleLowerCase("es");
    const categories = product.categories || [product.category];
    return (category === "all" || categories.includes(category))
      && (players === "all" || product.playerFilter.includes(players))
      && (difficulty === "all" || product.difficulty === difficulty)
      && (!query || searchable.includes(query));
  });

  refs.count.textContent = filtered.length + (filtered.length === 1 ? " producto encontrado" : " productos del catálogo");
  refs.empty.hidden = Boolean(filtered.length);
  refs.empty.textContent = state.products.length
    ? "No encontramos un producto con esos filtros. Prueba a ampliar la búsqueda."
    : "No se pudo cargar el catálogo. Comprueba que el hosting PHP y la conexión con la base de DonDominio estén configuradas.";

  refs.grid.innerHTML = filtered.map(product => {
    const colors = productColors(product);
    const soldOut = product.stock < 1;
    const categoryLabel = (product.categories || [product.category]).join(" · ");
    return fmt('<article class="product-card">' +
      '<div class="product-image" style="--tone:{0};--image-text:{1}" data-symbol="{2}">' +
        '<span class="product-origin">Origen · {3}</span><h3>{4}<small>{5}</small></h3></div>' +
      '<div class="product-info"><div class="product-tags">{6} · {7}</div>' +
        '<div class="product-details"><p>{8} jug. · {9}</p><b class="price">{10}</b></div>' +
        '<div class="card-actions"><button type="button" data-action="view-product" data-id="{11}">Ver ficha</button>' +
        '<button type="button" data-action="add-cart" data-id="{11}" {12}>{13}</button></div></div></article>',
      colors.tone, colors.text, safeText(productSymbol(product)), safeText(product.origin),
      safeText(product.title), safeText(product.subtitle), safeText(categoryLabel),
      safeText(product.difficulty), safeText(product.players), soldOut ? "Agotado" : "Stock: " + product.stock,
      formatPrice(product.price), product.id, soldOut ? "disabled" : "", soldOut ? "Agotado" : "Añadir +");
  }).join("");
}

function renderCart() {
  const lines = cartLines();
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  refs.cartCount.textContent = itemCount;
  if (!lines.length) {
    refs.cartItems.innerHTML = '<p class="cart-empty">Tu caja está vacía.<br />Añade un producto para empezar.</p>';
    refs.cartSummary.innerHTML = "";
    return;
  }
  refs.cartItems.innerHTML = lines.map(({ product, quantity }) => {
    const colors = productColors(product);
    return fmt('<div class="cart-item"><div class="cart-item-thumb" style="--tone:{0};--image-text:{1}">{2}</div>' +
      '<div><h3>{3}</h3><p>{4}</p><small>Stock: {5}</small></div><div><strong>{6}</strong>' +
      '<div class="quantity-control"><button type="button" data-action="change-quantity" data-id="{7}" data-change="-1" aria-label="Quitar una unidad">−</button>' +
      '<span>{8}</span><button type="button" data-action="change-quantity" data-id="{7}" data-change="1" aria-label="Añadir una unidad" {9}>+</button></div></div></div>',
      colors.tone, colors.text, safeText(productSymbol(product)), safeText(product.title),
      safeText(product.subtitle), product.stock, formatPrice(product.price * quantity),
      product.id, quantity, quantity >= product.stock ? "disabled" : "");
  }).join("");
  refs.cartSummary.innerHTML = renderTotals(calculateCart());
}

function renderTotals(totals) {
  const shippingText = totals.shipping === 0 ? "Gratis" : formatPrice(totals.shipping);
  return '<div class="summary-line"><span>Productos</span><b>' + formatPrice(totals.subtotal) + '</b></div>'
    + (totals.discount ? '<div class="summary-line"><span>Descuento YUZU10</span><b>−' + formatPrice(totals.discount) + '</b></div>' : "")
    + '<div class="summary-line"><span>Envío simulado</span><b>' + shippingText + '</b></div>'
    + '<div class="summary-line"><span>IVA (21%)</span><b>' + formatPrice(totals.tax) + '</b></div>'
    + '<div class="total-line"><span>Total</span><b>' + formatPrice(totals.total) + '</b></div>';
}

function renderEventPreview() {
  const sample = state.events.slice(0, 3).map(event => ({
    event: event.type,
    at: String(event.occurredAt || "").slice(11, 19),
    payload: event.payload
  }));
  refs.eventPreview.textContent = sample.length
    ? JSON.stringify(sample, null, 2)
    : "// Aún no hay eventos en la base de datos del hosting.\n// Abre una ficha o añade un producto al carrito.";
  const count = state.summary.events || state.events.length;
  refs.eventCount.textContent = count + (count === 1 ? " evento" : " eventos");
}

function addToCart(productId) {
  const product = getProduct(productId);
  if (!product || product.stock < 1) {
    showToast("Este producto no tiene unidades disponibles.");
    return;
  }
  const line = state.cart.find(item => String(item.productId) === String(productId));
  if (line && line.quantity >= product.stock) {
    showToast("Solo quedan " + product.stock + " unidades de " + product.title + ".");
    return;
  }
  if (line) line.quantity += 1;
  else state.cart.push({ productId: product.id, quantity: 1 });
  persistCart();
  void logEvent("cart.item_added", { productId: product.id, productName: product.title, quantity: line?.quantity ?? 1 });
  renderCart();
  showToast(product.title + " se ha añadido al carrito.");
}

function changeQuantity(productId, change) {
  const line = state.cart.find(item => String(item.productId) === String(productId));
  const product = getProduct(productId);
  if (!line || !product) return;
  const next = line.quantity + Number(change);
  if (next > product.stock) {
    showToast("Solo quedan " + product.stock + " unidades de " + product.title + ".");
    return;
  }
  if (next <= 0) state.cart = state.cart.filter(item => String(item.productId) !== String(productId));
  else line.quantity = next;
  persistCart();
  renderCart();
}

function openCart() {
  renderCart();
  refs.overlay.hidden = false;
  refs.cartDrawer.classList.add("is-open");
  refs.cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  refs.cartDrawer.classList.remove("is-open");
  refs.cartDrawer.setAttribute("aria-hidden", "true");
  refs.overlay.hidden = true;
}

function openProduct(productId) {
  const product = getProduct(productId);
  if (!product) return;
  void logEvent("product.viewed", { productId: product.id, productName: product.title });
  const colors = productColors(product);
  const categories = (product.categories || [product.category]).join(" · ");
  refs.productDialog.innerHTML = fmt('<div><div class="dialog-product-image" style="--tone:{0};--image-text:{1}">' +
    '<span>Origen · {2}</span><strong>{3}</strong></div><div class="dialog-product-content">' +
    '<div class="dialog-header"><div><p class="eyebrow">{4} · {5}</p><h2 id="product-dialog-title">{3}</h2></div>' +
    '<button class="icon-button" type="button" data-action="close-product" aria-label="Cerrar ficha">×</button></div>' +
    '<p class="detail-lead">{6}</p><dl class="detail-meta"><div><dt>Tipo</dt><dd>{7}</dd></div>' +
    '<div><dt>Jugadores</dt><dd>{8}</dd></div><div><dt>Dificultad</dt><dd>{5}</dd></div>' +
    '<div><dt>Origen</dt><dd>{2}</dd></div><div><dt>Disponibilidad</dt><dd>{9}</dd></div></dl>' +
    '<div class="dialog-product-price"><b>{10}</b><button class="button button-primary" type="button" data-action="add-cart" data-id="{11}" {12}>Añadir al carrito <span>+</span></button></div>' +
    '</div></div>',
    colors.tone, colors.text, safeText(product.origin), safeText(product.title),
    safeText(categories), safeText(product.difficulty), safeText(product.description),
    product.type === "puzzle" ? "Puzzle" : "Juego de mesa", safeText(product.players),
    product.stock > 0 ? product.stock + " unidades" : "Agotado", formatPrice(product.price),
    product.id, product.stock < 1 ? "disabled" : "");
  refs.productDialog.showModal();
}

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
}

function openCheckout() {
  if (!state.cart.length) {
    showToast("Añade al menos un producto antes de continuar.");
    return;
  }
  closeCart();
  const checkout = refs.checkoutDialog;
  checkout.querySelector("#checkout-items").innerHTML = cartLines().map(({ product, quantity }) =>
    '<div class="checkout-product"><span>' + quantity + "× " + safeText(product.title) + '</span><b>' + formatPrice(product.price * quantity) + '</b></div>'
  ).join("");
  checkout.querySelector("#checkout-totals").innerHTML = renderTotals(calculateCart());
  checkout.querySelector("#checkout-error").textContent = "";
  void logEvent("checkout.started", {
    cartLines: state.cart.length,
    itemCount: state.cart.reduce((sum, item) => sum + item.quantity, 0)
  });
  checkout.showModal();
}

function updateCheckoutTotals() {
  const promo = refs.checkoutDialog.querySelector("[name=promo]").value;
  refs.checkoutDialog.querySelector("#checkout-totals").innerHTML = renderTotals(calculateCart(promo));
}

async function createOrder(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const error = refs.checkoutDialog.querySelector("#checkout-error");
  const submit = form.querySelector('[type="submit"]');
  const required = ["customerName", "email", "address", "postalCode", "city", "paymentMethod"];
  const invalid = required.some(name => !data[name]?.trim())
    || !/^\S+@\S+\.\S+$/.test(data.email)
    || !/^\d{5}$/.test(data.postalCode)
    || data.customerName.trim().length < 3
    || data.address.trim().length < 8;
  if (invalid) {
    error.textContent = "Revisa los campos: utiliza datos ficticios válidos, un correo con formato correcto y un código postal de 5 cifras.";
    return;
  }

  submit.disabled = true;
  error.textContent = "";
  try {
    const result = await apiPost("order", {
      customerName: data.customerName.trim(),
      email: data.email.trim(),
      address: data.address.trim(),
      postalCode: data.postalCode.trim(),
      city: data.city.trim(),
      promo: data.promo.trim(),
      paymentMethod: data.paymentMethod,
      items: cartLines().map(({ product, quantity }) => ({ productId: product.id, quantity }))
    });
    const order = result.order;
    state.orders.unshift(order);
    state.cart = [];
    persistCart();
    renderCart();
    refs.checkoutDialog.close();
    refs.successDialog.querySelector("#success-copy").textContent =
      "El pedido " + order.id + " se ha guardado en la base de DonDominio por " + formatPrice(order.totals.total) + ". El pago se ha simulado correctamente.";
    refs.successDialog.showModal();
    try {
      const [eventsResult, summaryResult] = await Promise.all([
        apiGet("events", { limit: "1000" }), apiGet("summary")
      ]);
      state.events = eventsResult.events;
      state.summary = summaryResult.summary;
      renderEventPreview();
    } catch { /* El pedido ya quedó confirmado por la API. */ }
  } catch (requestError) {
    error.textContent = requestError.message;
  } finally {
    submit.disabled = false;
  }
}

async function supportRequested(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  if (!/^\S+@\S+\.\S+$/.test(data.supportEmail || "") || !(data.supportMessage || "").trim()) {
    showToast("Introduce un correo de prueba válido y una descripción de la solicitud.");
    return;
  }
  try {
    const result = await apiPost("support", {
      email: data.supportEmail.trim(),
      message: data.supportMessage.trim()
    });
    form.reset();
    showToast("Solicitud #" + result.ticket.id + " guardada en la base de datos del hosting.");
    try {
      const [eventsResult, summaryResult] = await Promise.all([
        apiGet("events", { limit: "1000" }), apiGet("summary")
      ]);
      state.events = eventsResult.events;
      state.summary = summaryResult.summary;
      renderEventPreview();
    } catch { /* La incidencia ya quedó confirmada por la API. */ }
  } catch (error) {
    showToast(error.message);
  }
}

async function loadAdminData() {
  try {
    const [ordersResult, eventsResult, summaryResult] = await Promise.all([
      apiGet("orders", { limit: "500" }),
      apiGet("events", { limit: "1000" }),
      apiGet("summary")
    ]);
    state.orders = ordersResult.orders;
    state.events = eventsResult.events;
    state.summary = summaryResult.summary;
    renderEventPreview();
  } catch (error) {
    notifyBackendError(error);
  }
}

function renderAdmin() {
  const revenue = Number(state.summary.revenue) || state.orders.reduce((sum, order) => sum + Number(order.totals.total), 0);
  document.querySelector("#admin-stats").innerHTML = [
    ["Pedidos", state.summary.orders || state.orders.length],
    ["Facturación simulada", formatPrice(revenue)],
    ["Eventos", state.summary.events || state.events.length],
    ["Incidencias", state.summary.tickets]
  ].map(([label, value]) =>
    '<div class="admin-stat"><span>' + safeText(label) + '</span><b>' + safeText(value) + "</b></div>"
  ).join("");

  document.querySelector("#admin-orders").innerHTML = state.orders.length
    ? '<table class="orders-table"><thead><tr><th>Pedido</th><th>Fecha</th><th>Cliente de prueba</th><th>Importe</th><th>Pago</th><th>Estado</th></tr></thead><tbody>'
      + state.orders.map(order => '<tr><td><b>' + safeText(order.id) + '</b><br /><small>'
        + order.items.map(item => item.quantity + "× " + safeText(item.title)).join(", ")
        + '</small></td><td>' + new Date(order.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })
        + '</td><td>' + safeText(order.customer.name) + '<br /><small>' + safeText(order.customer.email)
        + '</small></td><td>' + formatPrice(order.totals.total) + '</td><td>' + safeText(order.payment.method)
        + '<br /><small>' + safeText(order.payment.reference) + '</small></td><td><span class="status-chip">'
        + safeText(order.status) + "</span></td></tr>").join("")
      + "</tbody></table>"
    : '<p class="empty-admin">Todavía no hay pedidos en la base de datos. Completa el checkout para generar una evidencia persistente.</p>';

  document.querySelector("#admin-events").innerHTML = '<div class="admin-actions"><button type="button" data-action="export-events">Exportar JSON</button></div>'
    + (state.events.length
      ? '<table class="events-table"><thead><tr><th>Hora</th><th>Evento de negocio</th><th>Origen</th><th>Payload</th></tr></thead><tbody>'
        + state.events.map(event => '<tr><td>' + new Date(event.occurredAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "medium" })
          + '</td><td><b>' + safeText(event.type) + '</b></td><td>' + safeText(event.source)
          + '</td><td><code>' + safeText(JSON.stringify(event.payload)) + "</code></td></tr>").join("")
        + "</tbody></table>"
      : '<p class="empty-admin">Aún no hay eventos registrados en la base de datos del hosting.</p>');

  document.querySelector("#admin-model").innerHTML = '<div class="model-grid">'
    + '<article class="model-card"><h3>Catálogo</h3><p>productos · producto_categoria · categorias · producto_origen · origenes</p></article>'
    + '<article class="model-card"><h3>Pedido</h3><p>pedidos · usuarios · direcciones_pedido</p></article>'
    + '<article class="model-card"><h3>Línea de pedido</h3><p>lineas_pedido · producto_id · cantidad · precio_unitario · subtotal</p></article>'
    + '<article class="model-card"><h3>Pago simulado</h3><p>pagos · metodo_pago · estado · importe · referencia</p></article>'
    + '<article class="model-card"><h3>Evento</h3><p>eventos · tipo_evento · fecha_evento · datos · claves a pedido, producto e incidencia</p></article>'
    + '<article class="model-card"><h3>Soporte</h3><p>incidencias · usuarios · pedidos · estado · prioridad</p></article>'
    + "</div>";
}

async function openAdmin() {
  await loadAdminData();
  renderAdmin();
  refs.adminDialog.showModal();
}

function selectAdminTab(tab) {
  document.querySelectorAll("[data-admin-tab]").forEach(button => button.classList.toggle("is-active", button.dataset.adminTab === tab));
  ["orders", "events", "model"].forEach(name => {
    document.querySelector("#admin-" + name).hidden = name !== tab;
  });
}

function exportEvents() {
  const blob = new Blob([JSON.stringify(state.events, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "pangea-meeple-eventos.json";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Exportación JSON preparada.");
}

document.addEventListener("click", event => {
  const target = event.target.closest("[data-action], [data-admin-tab]");
  if (!target) return;
  const { action, id, change, adminTab } = target.dataset;
  if (adminTab) { selectAdminTab(adminTab); return; }
  if (action === "open-cart") openCart();
  if (action === "close-cart" || action === "close-overlays") closeCart();
  if (action === "add-cart") { addToCart(id); if (refs.productDialog.open) closeDialog(refs.productDialog); }
  if (action === "change-quantity") changeQuantity(id, change);
  if (action === "view-product") openProduct(id);
  if (action === "close-product") closeDialog(refs.productDialog);
  if (action === "start-checkout") openCheckout();
  if (action === "close-checkout") closeDialog(refs.checkoutDialog);
  if (action === "finish-order") { closeDialog(refs.successDialog); window.location.hash = "catalogo"; }
  if (action === "open-admin") void openAdmin();
  if (action === "close-admin") closeDialog(refs.adminDialog);
  if (action === "toggle-filters") {
    const filters = document.querySelector("#filters");
    const visible = filters.classList.toggle("is-visible");
    target.setAttribute("aria-expanded", String(visible));
  }
  if (action === "clear-filters") {
    state.filters = { category: "all", players: "all", difficulty: "all", search: "" };
    document.querySelector("#search-input").value = "";
    document.querySelectorAll(".filter-pills").forEach(group =>
      group.querySelectorAll(".pill").forEach((button, index) => button.classList.toggle("is-active", index === 0))
    );
    renderCatalog();
  }
  if (action === "export-events") exportEvents();
});

document.querySelector("#search-input").addEventListener("input", event => {
  state.filters.search = event.target.value;
  renderCatalog();
});

document.querySelectorAll(".filter-pills").forEach(group => group.addEventListener("click", event => {
  const button = event.target.closest(".pill");
  if (!button) return;
  group.querySelectorAll(".pill").forEach(pill => pill.classList.toggle("is-active", pill === button));
  state.filters[group.dataset.filterGroup] = button.dataset.value;
  renderCatalog();
}));

document.querySelector("#checkout-form").addEventListener("submit", event => {
  event.preventDefault();
  void createOrder(event.currentTarget);
});
document.querySelector("#checkout-form [name=promo]").addEventListener("input", updateCheckoutTotals);
document.querySelector("#support-form").addEventListener("submit", event => {
  event.preventDefault();
  void supportRequested(event.currentTarget);
});
[refs.productDialog, refs.checkoutDialog, refs.successDialog, refs.adminDialog].forEach(dialog =>
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); })
);

async function initialize() {
  try {
    const result = await apiGet("products");
    state.products = result.products;
    const availableIds = new Set(state.products.map(product => String(product.id)));
    state.cart = state.cart.filter(line => availableIds.has(String(line.productId)));
    persistCart();
    renderCategoryFilters();
    const factValues = document.querySelectorAll(".hero-facts dt");
    if (factValues[0]) factValues[0].textContent = state.products.length;
    if (factValues[1]) factValues[1].textContent = new Set(state.products.map(product => product.origin)).size;
    renderCatalog();
  } catch (error) {
    refs.empty.textContent = error.message + " Inicia la aplicación mediante PHP y consulta el README.";
    refs.empty.hidden = false;
    refs.count.textContent = "Catálogo no disponible";
    notifyBackendError(error);
  }

  try {
    const [eventsResult, summaryResult] = await Promise.all([
      apiGet("events", { limit: "1000" }),
      apiGet("summary")
    ]);
    state.events = eventsResult.events;
    state.summary = summaryResult.summary;
  } catch { /* Se informa al abrir una acción que necesite persistencia. */ }
  renderCart();
  renderEventPreview();
}

void initialize();


