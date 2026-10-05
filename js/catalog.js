const catalogVariantSelections = new Map();

function getVariants(product) {
  const { variants = [], ...base } = product;

  return [
    base,
    ...variants.map(variant => {
      const merged = { ...base, ...variant, parentId: product.id };
      return { ...merged, ...(PRODUCT_VISUALS[String(merged.id)] || {}) };
    })
  ];
}

function catalogVariantIndex(productId) {
  return catalogVariantSelections.get(String(productId)) || 0;
}

function selectCatalogVariant(productId, index, direction) {
  const product = products.find(item => String(item.id) === String(productId));
  if (!product) return;

  const variants = getVariants(product);
  if (variants.length < 2) return;

  const nextIndex = (Number(index) + variants.length) % variants.length;
  if (nextIndex === catalogVariantIndex(product.id)) return;
  const restoreCardFocus = refs.grid.contains(document.activeElement);
  catalogVariantSelections.set(String(product.id), nextIndex);
  renderCatalog({ productId: String(product.id), direction });

  if (restoreCardFocus) {
    const focusTarget = [...refs.grid.querySelectorAll('[data-action="catalog-variant"]')]
      .find(button => button.dataset.id === String(product.id) && button.dataset.direction === direction);
    focusTarget?.focus({ preventScroll: true });
  }
}

function getProduct(id) {
  for (const product of products) {
    const found = getVariants(product).find(item => item.id === id);
    if (found) return found;
  }
}

function renderCatalog(transition = null) {
  const {
    category,
    players,
    difficulty,
    search
  } = state.filters;

  const query =
    search.toLocaleLowerCase(localeForLanguage()).trim();

  const filtered = products.filter(product => {
    const displayProduct = localizeProduct(product);
    const searchable =
      `${product.title} ${product.subtitle} ${product.author} ${product.origin} ${product.category}
       ${displayProduct.title} ${displayProduct.subtitle} ${displayProduct.author} ${displayProduct.origin} ${displayProduct.category}`
        .toLocaleLowerCase(localeForLanguage());

    return (
      (category === "all" ||
        product.category === category) &&
      (players === "all" ||
        product.playerFilter.includes(players)) &&
      (difficulty === "all" ||
        product.difficulty === difficulty) &&
      (!query ||
        searchable.includes(query))
    );
  });

  refs.count.textContent =
    `${filtered.length} ${
      filtered.length === 1
        ? t("referencia encontrada")
        : t("referencias seleccionadas")
    }`;

  refs.empty.hidden =
    Boolean(filtered.length);

  refs.grid.innerHTML = filtered.map(product => {
    const variants = getVariants(product);
    const selectedIndex = Math.min(catalogVariantIndex(product.id), variants.length - 1);
    const selected = localizeProduct(variants[selectedIndex]);
    const displayParent = localizeProduct(product);
    const changing = transition?.productId === String(product.id);
    const transitionClass = changing
      ? ` is-variant-changing is-variant-${transition.direction === "previous" ? "previous" : "next"}`
      : "";
    const variantControls = variants.length > 1
      ? `<div class="product-variant-nav" role="group" aria-label="${safeText(t("Ediciones de producto"))} ${safeText(displayParent.title)}">
          <button type="button" data-action="catalog-variant" data-id="${safeText(product.id)}" data-index="${selectedIndex - 1}" data-direction="previous" aria-label="${safeText(t("Edición anterior"))}">‹</button>
          <button type="button" data-action="catalog-variant" data-id="${safeText(product.id)}" data-index="${selectedIndex + 1}" data-direction="next" aria-label="${safeText(t("Edición siguiente"))}">›</button>
        </div>`
      : "";

    return `
      <article class="product-card${transitionClass}">
        <div
          class="product-image${selected.image ? " has-image" : ""}"
          style="--tone:${safeText(selected.tone)};--image-text:${safeText(selected.text)}"
          data-symbol="${safeText(selected.symbol)}"
        >
          ${selected.image ? `<img
            src="${safeText(selected.image)}"
            alt="${safeText(t("Caja del juego"))} ${safeText(selected.title)}"
            width="400"
            height="400"
            loading="lazy"
            onerror="this.parentElement.classList.remove('has-image'); this.remove()"
          >` : ""}

          <span class="product-origin">${safeText(t("Diseño"))} · ${safeText(selected.origin)}</span>
          ${variantControls}
          <h3 class="product-title">
            ${safeText(selected.title)}
            <small>${safeText(selected.subtitle)}</small>
          </h3>
        </div>

        <div class="product-info">
          <div class="product-tags">${safeText(selected.category)} · ${safeText(selected.difficulty)}</div>
          <p class="product-description">${safeText(selected.description)}</p>
          <div class="product-details">
            <p>${safeText(selected.players)} ${safeText(t("jug."))} · ${safeText(selected.duration)}</p>
            ${priceBreakdownMarkup(selected.price)}
          </div>
          <div class="card-actions">
            <button type="button" data-action="view-product-variant" data-id="${safeText(product.id)}" data-index="${selectedIndex}">${safeText(t("Ver ficha"))}</button>
            <button type="button" data-action="add-cart" data-id="${safeText(selected.id)}"${selected.stock <= 0 ? " disabled" : ""}>${safeText(t("Añadir +"))}</button>
          </div>
        </div>
      </article>`;
  }).join("");
}

document.addEventListener("click", event => {
  const button = event.target.closest('[data-action="catalog-variant"], [data-action="view-product-variant"], [data-action="show-product-variant"]');
  if (!button) return;
  event.preventDefault();
  const index = Number(button.dataset.index);
  const direction = button.dataset.direction || (index < catalogVariantIndex(button.dataset.id) ? "previous" : "next");

  if (button.dataset.action === "catalog-variant") {
    selectCatalogVariant(button.dataset.id, index, direction);
  } else if (button.dataset.action === "view-product-variant") {
    openProduct(button.dataset.id, index, direction);
  } else {
    selectCatalogVariant(button.dataset.id, index, direction);
    openProduct(button.dataset.id, index, direction);
  }
});
