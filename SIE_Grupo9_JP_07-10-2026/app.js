const STORAGE = {
  cart: "planetaFicha.cart.preview.v1",
  orders: "planetaFicha.orders.preview.v1",
  events: "planetaFicha.events.preview.v1",
  tickets: "planetaFicha.tickets.preview.v1",
};

const state = {
  filters: {
    category: "all",
    players: "all",
    difficulty: "all",
    search: "",
  },
  cart: [],
  orders: [],
  events: readStorage(STORAGE.events, []),
  tickets: [],
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
  toast: document.querySelector("#toast"),
};

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("is-visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(
    () => refs.toast.classList.remove("is-visible"),
    2600,
  );
}

function openProduct(productId, index = 0, direction = "next", trackView = true) {
  const parent = products.find(
    (product) => String(product.id) === String(productId),
  );
  if (!parent) return;

  const variants = getVariants(parent);
  const totalVariants = variants.length;
  const selectedIndex = ((Number(index) % totalVariants) + totalVariants) % totalVariants;
  const product = localizeProduct(variants[selectedIndex]);
  const displayParent = localizeProduct(parent);
  const dialogWasOpen = refs.productDialog.open;
  const restoreDialogFocus =
    dialogWasOpen && refs.productDialog.contains(document.activeElement);
  const focusDirection = document.activeElement?.dataset?.direction;
  const previousIndex = Number(refs.productDialog.dataset.variantIndex);
  const isChangingVariant =
    dialogWasOpen &&
    refs.productDialog.dataset.productId === String(parent.id) &&
    previousIndex !== selectedIndex;
  const motionClass = isChangingVariant
    ? ` variant-slide-${direction === "previous" ? "previous" : "next"}`
    : "";

  refs.productDialog.dataset.productId = String(parent.id);
  refs.productDialog.dataset.variantIndex = String(selectedIndex);

  if (trackView) {
    logEvent("product.viewed", {
      productId: String(product.id),
      productName: product.title,
    });
  }

  const variantNavigation =
    totalVariants > 1
      ? `
        <div
          class="variant-nav"
          role="group"
          aria-label="${safeText(t("Ediciones de producto"))} ${safeText(displayParent.title)}"
        >
          <button
            class="variant-arrow"
            type="button"
            data-action="show-product-variant"
            data-id="${safeText(parent.id)}"
            data-index="${selectedIndex - 1}"
            data-direction="previous"
            aria-label="${safeText(t("Edición anterior"))}"
          >‹</button>
          <div class="variant-dots">
            ${variants
              .map(
                (_, variantIndex) => `
                  <button
                    class="variant-dot${variantIndex === selectedIndex ? " is-active" : ""}"
                    type="button"
                    data-action="show-product-variant"
                    data-id="${safeText(parent.id)}"
                    data-index="${variantIndex}"
                    aria-label="${safeText(t("Ver edición"))} ${variantIndex + 1} ${safeText(t("de"))} ${totalVariants}"
                    ${variantIndex === selectedIndex ? 'aria-current="true"' : ""}
                  ></button>
                `,
              )
              .join("")}
          </div>
          <button
            class="variant-arrow"
            type="button"
            data-action="show-product-variant"
            data-id="${safeText(parent.id)}"
            data-index="${selectedIndex + 1}"
            data-direction="next"
            aria-label="${safeText(t("Edición siguiente"))}"
          >›</button>
        </div>
      `
      : "";
  const imageMarkup = product.image
    ? `
      <img
        src="${safeText(product.image)}"
        alt="${safeText(t("Caja del juego"))} ${safeText(product.title)}"
        onerror="this.parentElement.classList.remove('has-image');this.remove()"
      />
    `
    : "";
  const stockLabel =
    product.stock > 0
      ? `${safeText(t("En stock"))} (${product.stock})`
      : safeText(t("Agotado"));
  const disabledWhenOutOfStock = product.stock <= 0 ? " disabled" : "";

  refs.productDialog.innerHTML = `
    <div class="product-dialog-panel${motionClass}">
      <div
        class="dialog-product-image${product.image ? " has-image" : ""}"
        style="--tone:${safeText(product.tone)};--image-text:${safeText(product.text)}"
      >
        ${imageMarkup}
        <span class="dialog-product-origin">
          ${safeText(t("Diseño"))} · ${safeText(product.origin)}
        </span>
        ${variantNavigation}
        <strong>${safeText(product.title)}</strong>
      </div>

      <div class="dialog-product-content">
        <div class="dialog-header">
          <div>
            <p class="eyebrow">
              ${safeText(product.category)} · ${safeText(product.difficulty)}
            </p>
            <h2 id="product-dialog-title">${safeText(product.title)}</h2>
            <p class="product-dialog-subtitle">
              ${safeText(product.subtitle)}
            </p>
          </div>
          <button
            class="icon-button"
            type="button"
            data-action="close-product"
            aria-label="${safeText(t("Cerrar ficha"))}"
          >×</button>
        </div>

        <p class="detail-lead">${safeText(product.description)}</p>
        <dl class="detail-meta">
          <div><dt>${safeText(t("Jugadores"))}</dt><dd>${safeText(product.players)}</dd></div>
          <div><dt>${safeText(t("Duración"))}</dt><dd>${safeText(product.duration)}</dd></div>
          <div><dt>${safeText(t("Autoría"))}</dt><dd>${safeText(product.author)}</dd></div>
          <div><dt>${safeText(t("Idioma"))}</dt><dd>${safeText(product.language)}</dd></div>
          <div><dt>${safeText(t("Mecánicas"))}</dt><dd>${safeText(product.mechanics)}</dd></div>
          <div><dt>${safeText(t("Disponibilidad"))}</dt><dd>${stockLabel}</dd></div>
        </dl>

        <div class="dialog-product-price">
          ${priceBreakdownMarkup(product.price)}
          <button
            class="button button-primary"
            type="button"
            data-action="add-cart"
            data-id="${safeText(product.id)}"${disabledWhenOutOfStock}
          >
            ${safeText(t("Añadir al carrito"))} <span>+</span>
          </button>
        </div>
      </div>
    </div>
  `;

  if (restoreDialogFocus) {
    const focusSelector = focusDirection
      ? `[data-action="show-product-variant"][data-direction="${focusDirection}"]`
      : '[data-action="show-product-variant"][aria-current="true"]';
    refs.productDialog
      .querySelector(focusSelector)
      ?.focus({ preventScroll: true });
  }

  if (!refs.productDialog.open) refs.productDialog.showModal();
}

function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}

function handleActionClick(event) {
  const target = event.target.closest("[data-action], [data-admin-tab]");
  if (!target) return;

  const { action, id, change, adminTab, index } = target.dataset;
  if (adminTab) {
    selectAdminTab(adminTab);
    return;
  }

  if (action === "toggle-mobile-menu") {
    const menu = document.querySelector("#mobile-menu");
    const isOpen = menu.classList.toggle("is-open");
    target.setAttribute("aria-expanded", String(isOpen));
    return;
  }

  if (action === "open-cart") return openCart();
  if (action === "close-cart" || action === "close-overlays") return closeCart();

  if (action === "add-cart") {
    const wasAdded = addToCart(id);
    if (wasAdded && refs.productDialog.open) closeDialog(refs.productDialog);
    return;
  }

  if (action === "change-quantity") return changeQuantity(id, change);
  if (action === "view-product") return openProduct(id);
  if (action === "show-variant") return openProduct(id, Number(index));
  if (action === "close-product") return closeDialog(refs.productDialog);
  if (action === "start-checkout") return openCheckout();
  if (action === "close-checkout") return closeDialog(refs.checkoutDialog);

  if (action === "finish-order") {
    closeDialog(refs.successDialog);
    if (typeof renderAccountOrders === "function") renderAccountOrders();
    window.location.hash = "catalogo";
    return;
  }

  if (action === "open-admin") return openAdmin();
  if (action === "close-admin") return closeDialog(refs.adminDialog);
  if (action === "open-auth") return openAuth();
  if (action === "close-auth") return closeAuth();
  if (action === "show-register") return showRegister();
  if (action === "show-login") return showLogin();
  if (action === "logout") return logoutUser();

  if (action === "open-admin-from-account" && isAdmin()) {
    closeAuth();
    openAdmin();
    return;
  }

  if (action === "toggle-filters") {
    const filters = document.querySelector("#filters");
    const isVisible = filters.classList.toggle("is-visible");
    target.setAttribute("aria-expanded", String(isVisible));
    return;
  }

  if (action === "clear-filters") {
    state.filters = {
      category: "all",
      players: "all",
      difficulty: "all",
      search: "",
    };
    document.querySelector("#search-input").value = "";

    document.querySelectorAll(".filter-pills").forEach((group) => {
      group.querySelectorAll(".pill").forEach((button, buttonIndex) => {
        button.classList.toggle("is-active", buttonIndex === 0);
      });
    });

    renderCatalog();
    return;
  }

  if (action === "export-events") return exportEvents();
  if (action === "clear-events") clearEvents();
}

document.addEventListener("click", handleActionClick);

document.querySelectorAll("#mobile-menu a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelector("#mobile-menu").classList.remove("is-open");
    document
      .querySelector(".mobile-menu-toggle")
      .setAttribute("aria-expanded", "false");
  });
});

document.querySelector("#search-input").addEventListener("input", (event) => {
  state.filters.search = event.target.value;
  renderCatalog();
});

document.querySelectorAll(".filter-pills").forEach((group) => {
  group.addEventListener("click", (event) => {
    const selectedButton = event.target.closest(".pill");
    if (!selectedButton) return;

    group.querySelectorAll(".pill").forEach((button) => {
      button.classList.toggle("is-active", button === selectedButton);
    });
    state.filters[group.dataset.filterGroup] = selectedButton.dataset.value;
    renderCatalog();
  });
});

document.querySelector("#checkout-form").addEventListener("submit", (event) => {
  event.preventDefault();
  createOrder(event.currentTarget);
});

document
  .querySelector("#checkout-form [name=promo]")
  .addEventListener("input", updateCheckoutTotals);

document
  .querySelector("#checkout-form [name=paymentMethod]")
  .addEventListener("change", (event) => togglePayPal(event.target.form));


document.querySelector("#support-form").addEventListener("submit", (event) => {
  event.preventDefault();
  supportRequested(event.currentTarget);
});

[refs.productDialog, refs.checkoutDialog, refs.successDialog, refs.adminDialog]
  .forEach((dialog) => {
    dialog?.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

renderCatalog();
syncCartForCurrentUser();
renderEventPreview();
initFloatingCart();
updateRoleUI();
