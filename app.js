/*
 * Pangea Meeple - prototipo académico sin backend.
 * La capa de persistencia usa localStorage para que la demostración pueda
 * desplegarse como sitio estático. Véase README para el modelo y límites.
 */

const STORAGE = {
  cart: "pangeaMeeple.cart.v1",
  orders: "pangeaMeeple.orders.v1",
  events: "pangeaMeeple.events.v1",
  tickets: "pangeaMeeple.tickets.v1"
};

const products = [
  { id: "nami", title: "Nami", subtitle: "Rutas de las nubes", category: "Estrategia", players: "1-4", playerFilter: ["solo", "small", "group"], difficulty: "Media", duration: "45-75 min", origin: "Japón", author: "Aya Mori", price: 42.9, tone: "#528daa", text: "#f6f1e6", symbol: "波", description: "Traza rutas aéreas entre islas con dados, cartas de viento y una planificación que cambia cada ronda.", mechanics: "colocación de dados · gestión de ruta", language: "Español / Inglés" },
  { id: "hansa", title: "Hansa", subtitle: "Puertos del Báltico", category: "Estrategia", players: "2-4", playerFilter: ["small", "group"], difficulty: "Experta", duration: "75-110 min", origin: "Alemania", author: "M. Keller", price: 58.5, tone: "#17201e", text: "#e1eeab", symbol: "✦", description: "Construye una red mercante en el Báltico, negocia contratos y controla el ritmo de los puertos.", mechanics: "red de rutas · economía", language: "Alemán / reglamento ES" },
  { id: "kumo", title: "Kumo", subtitle: "El jardín de las estaciones", category: "Familiar", players: "1-5", playerFilter: ["solo", "small", "group"], difficulty: "Iniciación", duration: "25-40 min", origin: "Japón", author: "Keiko Sato", price: 29.95, tone: "#c66c7d", text: "#fff7e8", symbol: "雲", description: "Cultiva un jardín efímero encadenando colores, estaciones y pequeñas decisiones tácticas.", mechanics: "draft de losetas · patrones", language: "Multilingüe" },
  { id: "seoul", title: "Seoul 1988", subtitle: "Mercado nocturno", category: "Familiar", players: "2-5", playerFilter: ["small", "group"], difficulty: "Media", duration: "35-50 min", origin: "Corea del Sur", author: "J. Park", price: 34.5, tone: "#445b78", text: "#f9e8c0", symbol: "밤", description: "Combina puestos, recetas y clientes en un mercado de ritmo ágil y mucha interacción amable.", mechanics: "set collection · programación", language: "Coreano / Inglés" },
  { id: "lumen", title: "Lumen", subtitle: "Mercado de Lisboa", category: "Estrategia", players: "2-4", playerFilter: ["small", "group"], difficulty: "Media", duration: "50-70 min", origin: "Portugal", author: "Inês Duarte", price: 46.0, tone: "#e4a143", text: "#17201e", symbol: "☼", description: "Invierte en talleres de azulejo y lee el mercado antes de que la luz se apague en el barrio.", mechanics: "gestión de recursos · mayorías", language: "Portugués / Inglés" },
  { id: "fjord", title: "Fjord & Fire", subtitle: "Crónicas del norte", category: "Cooperativo", players: "1-4", playerFilter: ["solo", "small", "group"], difficulty: "Media", duration: "60-85 min", origin: "Dinamarca", author: "N. Sørensen", price: 51.9, tone: "#506b65", text: "#f6f1e6", symbol: "ᛊ", description: "La costa se congela: coordinad provisiones, exploración y señales de fuego antes de la tormenta.", mechanics: "cooperativo · gestión de crisis", language: "Inglés / ayuda ES" },
  { id: "firenze", title: "Firenze 1266", subtitle: "Talleres y gremios", category: "Estrategia", players: "2-4", playerFilter: ["small", "group"], difficulty: "Experta", duration: "90-120 min", origin: "Italia", author: "G. Bellini", price: 64.9, tone: "#9b4c3b", text: "#f9e9ca", symbol: "✣", description: "Dirige un gremio de artesanos en una ciudad en transformación y compite por el favor de las familias.", mechanics: "selección de acciones · contratos", language: "Italiano / reglamento ES" },
  { id: "brumes", title: "La Cité", subtitle: "de las Brumes", category: "Cooperativo", players: "2-4", playerFilter: ["small", "group"], difficulty: "Iniciación", duration: "30-45 min", origin: "Francia", author: "L. Moreau", price: 36.5, tone: "#7d7995", text: "#fff7e8", symbol: "☁", description: "Una aventura narrativa accesible para recuperar las luces de una ciudad cubierta por la niebla.", mechanics: "cooperativo · narrativa", language: "Francés / Inglés" },
  { id: "alpen", title: "Alpenwerk", subtitle: "Aldea en ascenso", category: "Estrategia", players: "1-3", playerFilter: ["solo", "small"], difficulty: "Experta", duration: "60-90 min", origin: "Austria", author: "H. Gruber", price: 48.75, tone: "#6c8450", text: "#fff7e8", symbol: "△", description: "Haz crecer una aldea alpina bajo restricciones de terreno y un delicado equilibrio de oficios.", mechanics: "puzle de acciones · motor", language: "Alemán / Inglés" },
  { id: "hanami-puzzle", title: "Hanami", subtitle: "1000 piezas", category: "Puzzle", players: "1", playerFilter: ["solo"], difficulty: "Media", duration: "3-5 h", origin: "Japón", author: "Yuri Akiyama", price: 24.9, tone: "#d78485", text: "#fff7e8", symbol: "桜", description: "Puzzle de autor de 1000 piezas, papel mate antirreflejos y una paleta floral pensada para disfrutar el proceso.", mechanics: "puzzle de observación", language: "Edición japonesa" },
  { id: "tangram-puzzle", title: "Tangram", subtitle: "Arquitecturas imposibles", category: "Puzzle", players: "1-2", playerFilter: ["solo", "small"], difficulty: "Experta", duration: "2-4 h", origin: "Taiwán", author: "Lin Studio", price: 27.5, tone: "#dd9b4b", text: "#17201e", symbol: "△", description: "Puzzle geométrico de 750 piezas con cortes precisos y arquitectura inspirada en el brutalismo asiático.", mechanics: "puzzle geométrico", language: "Edición inglesa" },
  { id: "marais-puzzle", title: "Marais", subtitle: "El invernadero azul", category: "Puzzle", players: "1", playerFilter: ["solo"], difficulty: "Iniciación", duration: "2-3 h", origin: "Bélgica", author: "É. Laurent", price: 22.0, tone: "#517d91", text: "#fff7e8", symbol: "⌘", description: "Un puzzle de 500 piezas para tardes tranquilas: acabado texturizado y una ilustración llena de detalles botánicos.", mechanics: "puzzle ilustrado", language: "Edición francesa" }
];

const state = {
  filters: { category: "all", players: "all", difficulty: "all", search: "" },
  cart: readStorage(STORAGE.cart, []),
  orders: readStorage(STORAGE.orders, []),
  events: readStorage(STORAGE.events, []),
  tickets: readStorage(STORAGE.tickets, [])
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

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function safeText(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function getProduct(id) { return products.find(product => product.id === id); }

function formatPrice(value) { return euro.format(value); }

function cartLines() {
  return state.cart.map(line => ({ ...line, product: getProduct(line.productId) })).filter(line => line.product);
}

function calculateCart(promoCode = "") {
  const subtotal = cartLines().reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const discount = promoCode.trim().toUpperCase() === "YUZU10" ? subtotal * .1 : 0;
  const shipping = subtotal === 0 || subtotal >= 70 ? 0 : 6.9;
  const taxableBase = subtotal - discount + shipping;
  const tax = taxableBase * .21;
  return { subtotal, discount, shipping, tax, total: taxableBase + tax };
}

function logEvent(type, payload = {}) {
  const event = {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    occurredAt: new Date().toISOString(),
    source: "web-storefront",
    payload
  };
  state.events.unshift(event);
  persist(STORAGE.events, state.events);
  renderEventPreview();
  return event;
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("is-visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => refs.toast.classList.remove("is-visible"), 2600);
}

function renderCatalog() {
  const { category, players, difficulty, search } = state.filters;
  const query = search.toLocaleLowerCase("es").trim();
  const filtered = products.filter(product => {
    const searchable = `${product.title} ${product.subtitle} ${product.author} ${product.origin} ${product.category}`.toLocaleLowerCase("es");
    return (category === "all" || product.category === category)
      && (players === "all" || product.playerFilter.includes(players))
      && (difficulty === "all" || product.difficulty === difficulty)
      && (!query || searchable.includes(query));
  });
  refs.count.textContent = `${filtered.length} ${filtered.length === 1 ? "referencia encontrada" : "referencias seleccionadas"}`;
  refs.empty.hidden = Boolean(filtered.length);
  refs.grid.innerHTML = filtered.map(product => `
    <article class="product-card">
      <div class="product-image" style="--tone:${product.tone};--image-text:${product.text}" data-symbol="${safeText(product.symbol)}">
        <span class="product-origin">Diseño · ${safeText(product.origin)}</span>
        <h3>${safeText(product.title)}<small>${safeText(product.subtitle)}</small></h3>
      </div>
      <div class="product-info">
        <div class="product-tags">${safeText(product.category)} · ${safeText(product.difficulty)}</div>
        <div class="product-details"><p>${safeText(product.players)} jug. · ${safeText(product.duration)}</p><b class="price">${formatPrice(product.price)}</b></div>
        <div class="card-actions"><button type="button" data-action="view-product" data-id="${product.id}">Ver ficha</button><button type="button" data-action="add-cart" data-id="${product.id}">Añadir +</button></div>
      </div>
    </article>`).join("");
}

function renderCart() {
  const lines = cartLines();
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  refs.cartCount.textContent = itemCount;
  if (!lines.length) {
    refs.cartItems.innerHTML = `<p class="cart-empty">Tu caja está vacía.<br />Añade una referencia para empezar.</p>`;
    refs.cartSummary.innerHTML = "";
    return;
  }
  refs.cartItems.innerHTML = lines.map(({ product, quantity }) => `
    <div class="cart-item">
      <div class="cart-item-thumb" style="--tone:${product.tone};--image-text:${product.text}">${safeText(product.symbol)}</div>
      <div><h3>${safeText(product.title)}</h3><p>${safeText(product.subtitle)}</p></div>
      <div><strong>${formatPrice(product.price * quantity)}</strong><div class="quantity-control"><button type="button" data-action="change-quantity" data-id="${product.id}" data-change="-1" aria-label="Quitar una unidad">−</button><span>${quantity}</span><button type="button" data-action="change-quantity" data-id="${product.id}" data-change="1" aria-label="Añadir una unidad">+</button></div></div>
    </div>`).join("");
  refs.cartSummary.innerHTML = renderTotals(calculateCart());
}

function renderTotals(totals) {
  const shippingText = totals.shipping === 0 ? "Gratis" : formatPrice(totals.shipping);
  return `<div class="summary-line"><span>Productos</span><b>${formatPrice(totals.subtotal)}</b></div>
    ${totals.discount ? `<div class="summary-line"><span>Descuento YUZU10</span><b>−${formatPrice(totals.discount)}</b></div>` : ""}
    <div class="summary-line"><span>Envío simulado</span><b>${shippingText}</b></div>
    <div class="summary-line"><span>IVA (21%)</span><b>${formatPrice(totals.tax)}</b></div>
    <div class="total-line"><span>Total</span><b>${formatPrice(totals.total)}</b></div>`;
}

function renderEventPreview() {
  const sample = state.events.slice(0, 3).map(event => ({ event: event.type, at: event.occurredAt.slice(11, 19), payload: event.payload }));
  refs.eventPreview.textContent = sample.length ? JSON.stringify(sample, null, 2) : "// Aún no hay eventos.\n// Abre una ficha o añade un juego al carrito.";
  refs.eventCount.textContent = `${state.events.length} ${state.events.length === 1 ? "evento" : "eventos"}`;
}

function addToCart(productId) {
  const line = state.cart.find(item => item.productId === productId);
  if (line) line.quantity += 1;
  else state.cart.push({ productId, quantity: 1 });
  persist(STORAGE.cart, state.cart);
  const product = getProduct(productId);
  logEvent("cart.item_added", { productId, productName: product.title, quantity: line?.quantity ?? 1 });
  renderCart();
  showToast(`${product.title} se ha añadido al carrito.`);
}

function changeQuantity(productId, change) {
  const line = state.cart.find(item => item.productId === productId);
  if (!line) return;
  line.quantity += Number(change);
  if (line.quantity <= 0) state.cart = state.cart.filter(item => item.productId !== productId);
  persist(STORAGE.cart, state.cart);
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

function openCheckout() {
  if (!state.cart.length) { showToast("Añade al menos una referencia antes de continuar."); return; }
  closeCart();
  const checkout = refs.checkoutDialog;
  checkout.querySelector("#checkout-items").innerHTML = cartLines().map(({ product, quantity }) => `<div class="checkout-product"><span>${quantity}× ${safeText(product.title)}</span><b>${formatPrice(product.price * quantity)}</b></div>`).join("");
  checkout.querySelector("#checkout-totals").innerHTML = renderTotals(calculateCart());
  checkout.querySelector("#checkout-error").textContent = "";
  logEvent("checkout.started", { cartLines: state.cart.length, itemCount: state.cart.reduce((sum, item) => sum + item.quantity, 0) });
  checkout.showModal();
}

function updateCheckoutTotals() {
  const promo = refs.checkoutDialog.querySelector("[name=promo]").value;
  refs.checkoutDialog.querySelector("#checkout-totals").innerHTML = renderTotals(calculateCart(promo));
}

function createOrder(form) {
  const fields = new FormData(form);
  const data = Object.fromEntries(fields.entries());
  const error = refs.checkoutDialog.querySelector("#checkout-error");
  const required = ["customerName", "email", "address", "postalCode", "city", "paymentMethod"];
  const invalid = required.some(name => !data[name]?.trim()) || !/^\S+@\S+\.\S+$/.test(data.email) || !/^\d{5}$/.test(data.postalCode) || data.customerName.trim().length < 3 || data.address.trim().length < 8;
  if (invalid) {
    error.textContent = "Revisa los campos: utiliza datos ficticios válidos, un correo con formato correcto y un código postal de 5 cifras.";
    return;
  }
  const totals = calculateCart(data.promo || "");
  const now = new Date();
  const order = {
    id: `PM-${now.getFullYear()}-${String(Date.now()).slice(-6)}`,
    createdAt: now.toISOString(),
    customer: { name: data.customerName.trim(), email: data.email.trim(), address: data.address.trim(), postalCode: data.postalCode.trim(), city: data.city.trim() },
    items: cartLines().map(({ product, quantity }) => ({ productId: product.id, title: product.title, unitPrice: product.price, quantity })),
    payment: { method: data.paymentMethod, status: "Simulado autorizado", reference: `SIM-${Math.random().toString(36).slice(2, 8).toUpperCase()}` },
    totals,
    promoCode: data.promo.trim().toUpperCase() || null,
    status: "Pendiente de preparación",
    statusHistory: [
      { status: "Creado", at: now.toISOString() },
      { status: "Pago simulado", at: now.toISOString() },
      { status: "Pendiente de preparación", at: now.toISOString() }
    ]
  };
  state.orders.unshift(order);
  persist(STORAGE.orders, state.orders);
  logEvent("order.created", { orderId: order.id, total: Number(totals.total.toFixed(2)), lineCount: order.items.length });
  logEvent("payment.simulated", { orderId: order.id, method: order.payment.method, paymentStatus: order.payment.status, reference: order.payment.reference });
  state.cart = [];
  persist(STORAGE.cart, state.cart);
  renderCart();
  refs.checkoutDialog.close();
  refs.successDialog.querySelector("#success-copy").textContent = `El pedido ${order.id} se ha creado por ${formatPrice(totals.total)}. El pago ha sido simulado correctamente.`;
  refs.successDialog.showModal();
}

function supportRequested(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  if (!/^\S+@\S+\.\S+$/.test(data.supportEmail || "") || !(data.supportMessage || "").trim()) {
    showToast("Introduce un correo de prueba válido y una descripción de la solicitud.");
    return;
  }
  const ticket = { id: `SUP-${String(Date.now()).slice(-6)}`, createdAt: new Date().toISOString(), email: data.supportEmail.trim(), message: data.supportMessage.trim(), status: "Abierta" };
  state.tickets.unshift(ticket);
  persist(STORAGE.tickets, state.tickets);
  logEvent("support.requested", { ticketId: ticket.id, channel: "web-form" });
  form.reset();
  showToast(`Solicitud ${ticket.id} registrada. Te responderemos en una partida futura.`);
}

function renderAdmin() {
  const revenue = state.orders.reduce((sum, order) => sum + order.totals.total, 0);
  document.querySelector("#admin-stats").innerHTML = [
    ["Pedidos", state.orders.length], ["Facturación simulada", formatPrice(revenue)], ["Eventos", state.events.length], ["Soporte", state.tickets.length]
  ].map(([label, value]) => `<div class="admin-stat"><span>${label}</span><b>${value}</b></div>`).join("");

  document.querySelector("#admin-orders").innerHTML = state.orders.length ? `<table class="orders-table"><thead><tr><th>Pedido</th><th>Fecha</th><th>Cliente de prueba</th><th>Importe</th><th>Pago</th><th>Estado</th></tr></thead><tbody>${state.orders.map(order => `<tr><td><b>${safeText(order.id)}</b><br /><small>${order.items.map(item => `${item.quantity}× ${safeText(item.title)}`).join(", ")}</small></td><td>${new Date(order.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</td><td>${safeText(order.customer.name)}<br /><small>${safeText(order.customer.email)}</small></td><td>${formatPrice(order.totals.total)}</td><td>${safeText(order.payment.method)}<br /><small>${safeText(order.payment.reference)}</small></td><td><span class="status-chip">${safeText(order.status)}</span><br /><small>Creado → Pago simulado → Preparación</small></td></tr>`).join("")}</tbody></table>` : `<p class="empty-admin">Todavía no hay pedidos. Completa el checkout para generar una evidencia persistida.</p>`;

  document.querySelector("#admin-events").innerHTML = `<div class="admin-actions"><button type="button" data-action="export-events">Exportar JSON</button><button type="button" data-action="clear-events">Limpiar registros</button></div>${state.events.length ? `<table class="events-table"><thead><tr><th>Hora</th><th>Evento de negocio</th><th>Origen</th><th>Payload</th></tr></thead><tbody>${state.events.map(event => `<tr><td>${new Date(event.occurredAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "medium" })}</td><td><b>${safeText(event.type)}</b></td><td>${safeText(event.source)}</td><td><code>${safeText(JSON.stringify(event.payload))}</code></td></tr>`).join("")}</tbody></table>` : `<p class="empty-admin">Aún no hay eventos registrados.</p>`}`;

  document.querySelector("#admin-model").innerHTML = `<div class="model-grid">
    <article class="model-card"><h3>Producto</h3><p>id · title · category · players · difficulty · price · origin · author · mechanics</p></article>
    <article class="model-card"><h3>Pedido</h3><p>id · createdAt · customer · items[] · totals · status · promoCode</p></article>
    <article class="model-card"><h3>Línea de pedido</h3><p>productId · title · unitPrice · quantity</p></article>
    <article class="model-card"><h3>Pago simulado</h3><p>method · status · reference · asociado a un pedido</p></article>
    <article class="model-card"><h3>Evento</h3><p>id · type · occurredAt · source · payload</p></article>
    <article class="model-card"><h3>Soporte</h3><p>id · createdAt · email de prueba · message · status</p></article>
  </div>`;
}

function openAdmin() { renderAdmin(); refs.adminDialog.showModal(); }

function selectAdminTab(tab) {
  document.querySelectorAll("[data-admin-tab]").forEach(button => button.classList.toggle("is-active", button.dataset.adminTab === tab));
  ["orders", "events", "model"].forEach(name => document.querySelector(`#admin-${name}`).hidden = name !== tab);
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

function clearEvents() {
  if (!confirm("¿Eliminar los eventos de prueba de este navegador? Los pedidos no se eliminarán.")) return;
  state.events = [];
  persist(STORAGE.events, state.events);
  renderEventPreview();
  renderAdmin();
  selectAdminTab("events");
  showToast("Registros de eventos eliminados.");
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
