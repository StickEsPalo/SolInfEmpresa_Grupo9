function openCheckout() {
  if (!state.cart.length) {
    showToast(
      "Añade al menos una referencia antes de continuar."
    );
    return;
  }

  closeCart();

  const checkout = refs.checkoutDialog;

  checkout.querySelector("#checkout-items").innerHTML =
    cartLines()
      .map(({ product, quantity }) => `
        <div class="checkout-product">
          <span>
            ${quantity}× ${safeText(product.title)}
          </span>

          <b>
            ${formatPrice(
              product.price * quantity
            )}
          </b>
        </div>
      `)
      .join("");

  checkout.querySelector("#checkout-totals").innerHTML =
    renderTotals(calculateCart());

  checkout.querySelector("#checkout-error").textContent =
    "";

  logEvent("checkout.started", {
    cartLines: state.cart.length,
    itemCount: state.cart.reduce(
      (sum, item) => sum + item.quantity,
      0
    )
  });

  checkout.showModal();
}

function updateCheckoutTotals() {
  const promo =
    refs.checkoutDialog.querySelector(
      "[name=promo]"
    ).value;

  refs.checkoutDialog.querySelector(
    "#checkout-totals"
  ).innerHTML = renderTotals(
    calculateCart(promo)
  );
}

function createOrder(form) {
  const fields = new FormData(form);

  const data = Object.fromEntries(
    fields.entries()
  );

  const error =
    refs.checkoutDialog.querySelector(
      "#checkout-error"
    );

  const required = [
    "customerName",
    "email",
    "address",
    "postalCode",
    "city",
    "paymentMethod"
  ];

  const invalid =
    required.some(
      name => !data[name]?.trim()
    ) ||
    !/^\S+@\S+\.\S+$/.test(data.email) ||
    !/^\d{5}$/.test(data.postalCode) ||
    data.customerName.trim().length < 3 ||
    data.address.trim().length < 8;

  if (invalid) {
    error.textContent =
      "Revisa los campos: utiliza datos ficticios válidos, un correo con formato correcto y un código postal de 5 cifras.";

    return;
  }

  const totals =
    calculateCart(data.promo || "");

  const now = new Date();

  const order = {
    id: `PM-${now.getFullYear()}-${String(
      Date.now()
    ).slice(-6)}`,

    createdAt: now.toISOString(),

    customer: {
      name: data.customerName.trim(),
      email: data.email.trim(),
      address: data.address.trim(),
      postalCode: data.postalCode.trim(),
      city: data.city.trim()
    },

    items: cartLines().map(
      ({ product, quantity }) => ({
        productId: product.id,
        title: product.title,
        unitPrice: product.price,
        quantity
      })
    ),

    payment: {
      method: data.paymentMethod,
      status: "Simulado autorizado",
      reference:
        `SIM-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`
    },

    totals,

    promoCode:
      data.promo.trim().toUpperCase() || null,

    status: "Pendiente de preparación",

    statusHistory: [
      {
        status: "Creado",
        at: now.toISOString()
      },
      {
        status: "Pago simulado",
        at: now.toISOString()
      },
      {
        status: "Pendiente de preparación",
        at: now.toISOString()
      }
    ]
  };

  state.orders.unshift(order);

  persist(
    STORAGE.orders,
    state.orders
  );

  logEvent("order.created", {
    orderId: order.id,
    total: Number(
      totals.total.toFixed(2)
    ),
    lineCount: order.items.length
  });

  logEvent("payment.simulated", {
    orderId: order.id,
    method: order.payment.method,
    paymentStatus:
      order.payment.status,
    reference:
      order.payment.reference
  });

  state.cart = [];

  persist(STORAGE.cart, state.cart);

  renderCart();

  refs.checkoutDialog.close();

  refs.successDialog.querySelector(
    "#success-copy"
  ).textContent =
    `El pedido ${order.id} se ha creado por ${formatPrice(
      totals.total
    )}. El pago ha sido simulado correctamente.`;

  refs.successDialog.showModal();
}