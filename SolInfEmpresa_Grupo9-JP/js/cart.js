function cartLines() {
  return state.cart
    .map(line => ({
      ...line,
      product: getProduct(line.productId)
    }))
    .filter(line => line.product);
}

function calculateCart(promoCode = "") {
  const subtotal = cartLines().reduce(
    (sum, line) =>
      sum + line.product.price * line.quantity,
    0
  );

  const discount =
    promoCode.trim().toUpperCase() === "YUZU10"
      ? subtotal * 0.1
      : 0;

  const shipping =
    subtotal === 0 || subtotal >= 70
      ? 0
      : 6.9;

  const taxableBase =
    subtotal - discount + shipping;

  const tax =
    taxableBase * 0.21;

  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: taxableBase + tax
  };
}

function renderTotals(totals) {
  const shippingText =
    totals.shipping === 0
      ? "Gratis"
      : formatPrice(totals.shipping);

  return `
    <div class="summary-line">
      <span>Productos</span>
      <b>${formatPrice(totals.subtotal)}</b>
    </div>

    ${
      totals.discount
        ? `
      <div class="summary-line">
        <span>Descuento YUZU10</span>
        <b>−${formatPrice(totals.discount)}</b>
      </div>
    `
        : ""
    }

    <div class="summary-line">
      <span>Envío simulado</span>
      <b>${shippingText}</b>
    </div>

    <div class="summary-line">
      <span>IVA (21%)</span>
      <b>${formatPrice(totals.tax)}</b>
    </div>

    <div class="total-line">
      <span>Total</span>
      <b>${formatPrice(totals.total)}</b>
    </div>
  `;
}

function renderCart() {
  const lines = cartLines();

  const itemCount = lines.reduce(
    (sum, line) => sum + line.quantity,
    0
  );

  refs.cartCount.textContent = itemCount;
  refs.floatingCartCount.textContent = itemCount;

  if (!lines.length) {
    refs.cartItems.innerHTML = `
      <p class="cart-empty">
        Tu caja está vacía.<br />
        Añade una referencia para empezar.
      </p>
    `;

    refs.cartSummary.innerHTML = "";

    return;
  }

  refs.cartItems.innerHTML = lines
    .map(({ product, quantity }) => `
      <div class="cart-item">

        <div
          class="cart-item-thumb"
          style="--tone:${product.tone};--image-text:${product.text}"
        >
          ${safeText(product.symbol)}
          ${
            product.image
              ? `<img
                  src="${safeText(product.image)}"
                  alt=""
                  loading="lazy"
                  onerror="this.remove()"
                >`
              : ""
          }
        </div>

        <div>
          <h3>${safeText(product.title)}</h3>
          <p>${safeText(product.subtitle)}</p>
        </div>

        <div>

          <strong>
            ${formatPrice(product.price * quantity)}
          </strong>

          <div class="quantity-control">

            <button
              type="button"
              data-action="change-quantity"
              data-id="${product.id}"
              data-change="-1"
              aria-label="Quitar una unidad"
            >
              −
            </button>

            <span>${quantity}</span>

            <button
              type="button"
              data-action="change-quantity"
              data-id="${product.id}"
              data-change="1"
              aria-label="Añadir una unidad"
            >
              +
            </button>

          </div>

        </div>

      </div>
    `)
    .join("");

  refs.cartSummary.innerHTML =
    renderTotals(calculateCart());
}

function addToCart(productId) {
  const line = state.cart.find(
    item => item.productId === productId
  );

  if (line) {
    line.quantity += 1;
  } else {
    state.cart.push({
      productId,
      quantity: 1
    });
  }

  persist(STORAGE.cart, state.cart);

  const product = getProduct(productId);

  logEvent("cart.item_added", {
    productId,
    productName: product.title,
    quantity: line?.quantity ?? 1
  });

  renderCart();

  showToast(
    `${product.title} se ha añadido al carrito.`
  );
}

function changeQuantity(productId, change) {
  const line = state.cart.find(
    item => item.productId === productId
  );

  if (!line) {
    return;
  }

  line.quantity += Number(change);

  if (line.quantity <= 0) {
    state.cart = state.cart.filter(
      item => item.productId !== productId
    );
  }

  persist(STORAGE.cart, state.cart);

  renderCart();
}

function openCart() {
  renderCart();

  refs.overlay.hidden = false;

  refs.cartDrawer.classList.add("is-open");

  refs.cartDrawer.setAttribute(
    "aria-hidden",
    "false"
  );
}

function closeCart() {
  refs.cartDrawer.classList.remove("is-open");

  refs.cartDrawer.setAttribute(
    "aria-hidden",
    "true"
  );

  refs.overlay.hidden = true;
}

function initFloatingCart() {
  const headerButton = document.querySelector(".cart-button");
  
  if (!headerButton || !refs.floatingCartButton) {
    return;
  }

  const observer = new IntersectionObserver(([entry]) => {
    refs.floatingCartButton.classList.toggle(
      "is-visible",
      !entry.isIntersecting
    );
  });

  observer.observe(headerButton);
}