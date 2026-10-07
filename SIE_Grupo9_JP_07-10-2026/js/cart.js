function activeCartStorageKey() {
  const user = currentUser();
  return user ? `${CART_USER_PREFIX}${user.id}` : null;
}

function persistCartForUser(cart) {
  const key = activeCartStorageKey();
  if (!key) return;

  persist(key, Array.isArray(cart) ? cart : []);
}

function readCartForUser(user) {
  return user ? readStorage(`${CART_USER_PREFIX}${user.id}`, []) : [];
}

function syncCartForCurrentUser() {
  const user = currentUser();
  state.cart = user ? readCartForUser(user) : [];
  renderCart();
}

function cartLines() {
  return state.cart
    .map((line) => ({
      ...line,
      product: getProduct(line.productId),
    }))
    .filter((line) => line.product);
}

function calculateCart(promoCode = "") {
  const subtotal = cartLines().reduce(
    (sum, line) => sum + Number(line.product.price) * Number(line.quantity),
    0,
  );
  const hasDiscount = promoCode.trim().toUpperCase() === "YUZU10";
  const discount = hasDiscount ? subtotal * 0.1 : 0;
  const shipping = subtotal === 0 || subtotal >= 70 ? 0 : 6.9;
  const taxableBase = subtotal - discount + shipping;
  const tax = taxableBase * 0.21;

  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: taxableBase + tax,
  };
}

function renderTotals(totals) {
  const shippingText =
    totals.shipping === 0
      ? translateText("Gratis")
      : formatPrice(totals.shipping);
  const discountMarkup = totals.discount
    ? `<div class="summary-line">
        <span>${safeText(translateText("Descuento YUZU10 (sin IVA)"))}</span>
        <b>−${formatPrice(totals.discount)}</b>
      </div>`
    : "";

  return `
    <div class="summary-line">
      <span>${safeText(translateText("Productos (sin IVA)"))}</span>
      <b>${formatPrice(totals.subtotal)}</b>
    </div>
    ${discountMarkup}
    <div class="summary-line">
      <span>${safeText(translateText("Envío simulado (sin IVA)"))}</span>
      <b>${shippingText}</b>
    </div>
    <div class="summary-line">
      <span>${safeText(translateText("IVA (21%)"))}</span>
      <b>${formatPrice(totals.tax)}</b>
    </div>
    <div class="total-line">
      <span>${safeText(translateText("Total"))}</span>
      <b>${formatPrice(totals.total)}</b>
    </div>
  `;
}

function renderCart() {
  const lines = cartLines();
  const count = lines.reduce((sum, line) => sum + Number(line.quantity), 0);

  if (refs.cartCount) refs.cartCount.textContent = count;
  if (refs.floatingCartCount) refs.floatingCartCount.textContent = count;

  if (!lines.length) {
    refs.cartItems.innerHTML = `
      <p class="cart-empty">
        ${safeText(translateText("Tu caja está vacía."))}<br />
        ${safeText(translateText("Añade una referencia para empezar."))}
      </p>
    `;
    refs.cartSummary.innerHTML = "";
    return;
  }

  refs.cartItems.innerHTML = lines
    .map(({ product, quantity }) => {
      const displayProduct = localizeProduct(product);
      const imageMarkup = product.image
        ? `<img src="${safeText(product.image)}" alt="" loading="lazy" onerror="this.remove()">`
        : "";

      return `
        <div class="cart-item">
          <div
            class="cart-item-thumb"
            style="--tone:${product.tone};--image-text:${product.text}"
          >
            ${safeText(product.symbol)}
            ${imageMarkup}
          </div>
          <div>
            <h3>${safeText(displayProduct.title)}</h3>
            <p>${safeText(displayProduct.subtitle)}</p>
          </div>
          <div class="cart-item-price">
            ${priceBreakdownMarkup(product.price * quantity)}
            <div class="quantity-control">
              <button
                type="button"
                data-action="change-quantity"
                data-id="${product.id}"
                data-change="-1"
                aria-label="${safeText(translateText("Quitar una unidad"))}"
              >−</button>
              <span>${quantity}</span>
              <button
                type="button"
                data-action="change-quantity"
                data-id="${product.id}"
                data-change="1"
                aria-label="${safeText(translateText("Añadir una unidad"))}"
              >+</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  refs.cartSummary.innerHTML = renderTotals(calculateCart());
}

function addToCart(productId) {
  const loginMessage = translateText(
    "Para añadir productos al carrito necesitas registrarte o iniciar sesión.",
  );
  if (!requireAuth(loginMessage)) return false;

  const product = getProduct(productId);
  if (!product) return false;

  const line = state.cart.find(
    (item) => String(item.productId) === String(productId),
  );

  if (line) {
    line.quantity += 1;
  } else {
    state.cart.push({ productId: String(productId), quantity: 1 });
  }

  persistCartForUser(state.cart);
  logEvent("cart.item_added", {
    productId: String(productId),
    productName: product.title,
    quantity: line?.quantity ?? 1,
  });
  renderCart();

  const productName = localizeProduct(product).title;
  showToast(`${productName} ${translateText("se ha añadido al carrito.")}`);
  return true;
}

function changeQuantity(productId, change) {
  const loginMessage = translateText(
    "Necesitas iniciar sesión para modificar tu carrito.",
  );
  if (!requireAuth(loginMessage)) return;

  const line = state.cart.find(
    (item) => String(item.productId) === String(productId),
  );
  if (!line) return;

  line.quantity += Number(change);
  if (line.quantity <= 0) {
    state.cart = state.cart.filter(
      (item) => String(item.productId) !== String(productId),
    );
  }

  persistCartForUser(state.cart);
  renderCart();
}

function openCart() {
  const loginMessage = translateText(
    "Para acceder al carrito primero debes registrarte o iniciar sesión.",
  );
  if (!requireAuth(loginMessage)) return;

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

function initFloatingCart() {
  const headerButton = document.querySelector(".cart-button");
  if (
    !headerButton ||
    !refs.floatingCartButton ||
    typeof IntersectionObserver !== "function"
  ) {
    return;
  }

  const observer = new IntersectionObserver(([entry]) => {
    refs.floatingCartButton.classList.toggle(
      "is-visible",
      !entry.isIntersecting,
    );
  });
  observer.observe(headerButton);
}
