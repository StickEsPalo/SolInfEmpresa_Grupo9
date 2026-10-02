function openCheckout() {
  if (!cartLines().length) {
    showToast("Añade al menos una referencia antes de continuar.");
    return;
  }

  closeCart();
  const checkout = refs.checkoutDialog;

  checkout.querySelector("#checkout-items").innerHTML =
    cartLines().map(({ product, quantity }) => `
      <div class="checkout-product">
        <span>${quantity}× ${safeText(product.title)}</span>
        <b>${formatPrice(product.price * quantity)}</b>
      </div>
    `).join("");

  checkout.querySelector("#checkout-totals").innerHTML =
    renderTotals(calculateCart(checkout.querySelector("[name=promo]").value));
  checkout.querySelector("#checkout-error").textContent = "";

  logEvent("checkout.started", {
    cartLines: cartLines().length,
    itemCount: cartLines().reduce((sum, item) => sum + item.quantity, 0)
  });

  checkout.showModal();
}

function updateCheckoutTotals() {
  const promo = refs.checkoutDialog.querySelector("[name=promo]").value;
  refs.checkoutDialog.querySelector("#checkout-totals").innerHTML =
    renderTotals(calculateCart(promo));
}

async function createOrder(form) {
  const fields = new FormData(form);
  const data = Object.fromEntries(fields.entries());
  const error = refs.checkoutDialog.querySelector("#checkout-error");
  const submit = form.querySelector('[type="submit"]');

  const required = ["customerName", "email", "address", "postalCode", "city", "paymentMethod"];
  const invalid =
    required.some(name => !data[name]?.trim()) ||
    !/^\S+@\S+\.\S+$/.test(data.email) ||
    !/^\d{5}$/.test(data.postalCode) ||
    data.customerName.trim().length < 3 ||
    data.address.trim().length < 8;

  if (invalid) {
    error.textContent =
      "Revisa los campos: utiliza datos ficticios válidos, un correo con formato correcto y un código postal de 5 cifras.";
    return;
  }

  if (!cartLines().length) {
    error.textContent = "El carrito está vacío. Añade productos y vuelve a intentarlo.";
    return;
  }

  if (data.website?.trim()) return;

  const totals = calculateCart(data.promo || "");
  const now = new Date();
  const order = {
    id: `PM-${now.getFullYear()}-${String(Date.now()).slice(-6)}`,
    createdAt: now.toISOString(),
    customer: {
      name: data.customerName.trim(),
      email: data.email.trim(),
      address: data.address.trim(),
      postalCode: data.postalCode.trim(),
      city: data.city.trim()
    },
    items: cartLines().map(({ product, quantity }) => ({
      productId: product.id,
      title: product.title,
      unitPrice: product.price,
      quantity
    })),
    payment: {
      method: data.paymentMethod,
      status: "Simulado autorizado",
      reference: `SIM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    },
    totals,
    promoCode: data.promo.trim().toUpperCase() === "YUZU10" ? "YUZU10" : null,
    status: "Pendiente de preparación",
    statusHistory: [
      { status: "Creado", at: now.toISOString() },
      { status: "Pago simulado", at: now.toISOString() },
      { status: "Pendiente de preparación", at: now.toISOString() }
    ]
  };

  submit.disabled = true;
  error.textContent = "Enviando el resumen del pedido…";

  try {
    const response = await fetch("./enviar-pedido.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({
        orderId: order.id,
        customer: order.customer,
        items: order.items.map(({ productId, quantity }) => ({ productId, quantity })),
        paymentMethod: order.payment.method,
        promoCode: order.promoCode || "",
        website: data.website || ""
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "No se pudo enviar el pedido.");

    order.createdAt = result.order.createdAt || order.createdAt;
    order.items = result.order.items.map(item => ({
      productId: item.productId,
      title: item.title,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity)
    }));
    order.totals = result.order.totals;

    state.orders.unshift(order);
    try {
      persist(STORAGE.orders, state.orders);
    } catch (storageError) {
      console.warn("El pedido llegó por correo, pero no se pudo guardar en este navegador.", storageError);
    }

    try {
      logEvent("order.created", {
        orderId: order.id,
        total: Number(order.totals.total.toFixed(2)),
        lineCount: order.items.length
      });
      logEvent("payment.simulated", {
        orderId: order.id,
        method: order.payment.method,
        paymentStatus: order.payment.status,
        reference: order.payment.reference
      });
    } catch (storageError) {
      console.warn("El pedido llegó por correo, pero no se pudieron guardar todos los eventos locales.", storageError);
    }

    state.cart = [];
    try {
      persist(STORAGE.cart, state.cart);
    } catch (storageError) {
      console.warn("El pedido llegó por correo, pero no se pudo guardar el carrito vacío.", storageError);
    }
    renderCart();

    refs.checkoutDialog.close();
    refs.successDialog.querySelector("#success-copy").textContent =
      `El resumen del pedido ${order.id}, por ${formatPrice(order.totals.total)}, se ha enviado a correocorporativo@planetaficha.onl. El pago es solo una simulación; no se ha realizado ningún cobro.`;
    refs.successDialog.showModal();
  } catch (requestError) {
    error.textContent =
      requestError.message ||
      "No se pudo enviar el pedido. El carrito sigue guardado; inténtalo de nuevo más tarde.";
  } finally {
    submit.disabled = false;
  }
}