function getProduct(id) {
  return products.find(
    product => product.id === id
  );
}

function renderCatalog() {
  const {
    category,
    players,
    difficulty,
    search
  } = state.filters;

  const query =
    search.toLocaleLowerCase("es").trim();

  const filtered = products.filter(product => {
    const searchable =
      `${product.title}
       ${product.subtitle}
       ${product.author}
       ${product.origin}
       ${product.category}`
        .toLocaleLowerCase("es");

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
        ? "referencia encontrada"
        : "referencias seleccionadas"
    }`;

  refs.empty.hidden =
    Boolean(filtered.length);

  refs.grid.innerHTML =
    filtered
      .map(product => `
    <article class="product-card">
      <div
        class="product-image"
        style="--tone:${product.tone};--image-text:${product.text}"
        data-symbol="${safeText(product.symbol)}"
      >
        <span class="product-origin">
          Diseño · ${safeText(product.origin)}
        </span>

        <h3>
          ${safeText(product.title)}
          <small>
            ${safeText(product.subtitle)}
          </small>
        </h3>
      </div>

      <div class="product-info">

        <div class="product-tags">
          ${safeText(product.category)}
          ·
          ${safeText(product.difficulty)}
        </div>

        <div class="product-details">
          <p>
            ${safeText(product.players)}
            jug. ·
            ${safeText(product.duration)}
          </p>

          <b class="price">
            ${formatPrice(product.price)}
          </b>
        </div>

        <div class="card-actions">
          <button
            type="button"
            data-action="view-product"
            data-id="${product.id}"
          >
            Ver ficha
          </button>

          <button
            type="button"
            data-action="add-cart"
            data-id="${product.id}"
          >
            Añadir +
          </button>
        </div>

      </div>
    </article>
  `)
      .join("");
}