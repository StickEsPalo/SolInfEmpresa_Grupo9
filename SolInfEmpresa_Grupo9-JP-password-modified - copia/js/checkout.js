function orderStatusLabel(status) {
  return ({
    pendiente: 'Pendiente',
    pagado: 'Pago confirmado',
    preparando: 'En preparación',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  })[status] || status || 'Pendiente';
}

function renderCheckoutItems() {
  const items = refs.checkoutDialog.querySelector('#checkout-items');
  if (!items) return;
  items.innerHTML = cartLines()
    .map(({ product, quantity }) => {
      const displayProduct = localizeProduct(product);
      return `<div class="checkout-product"><span>${quantity}× ${safeText(displayProduct.title)}</span>${priceBreakdownMarkup(product.price * quantity)}</div>`;
    })
    .join('');
}

function openCheckout() {
  const user = currentUser();
  if (!user) {
    promptAuth('Para realizar una compra primero debes registrarte o iniciar sesión.');
    return;
  }
  if (!cartLines().length) {
    showToast('Añade al menos una referencia antes de continuar.');
    return;
  }

  closeCart();
  const checkout = refs.checkoutDialog;
  const form = checkout.querySelector('#checkout-form');
  const name = form.querySelector('[name="customerName"]');
  const email = form.querySelector('[name="email"]');
  if (!name.value.trim()) name.value = `${user.firstName} ${user.lastName}`.trim();
  email.value = user.email;
  renderCheckoutItems();
  checkout.querySelector('#checkout-totals').innerHTML = renderTotals(calculateCart(form.querySelector('[name="promo"]').value));
  checkout.querySelector('#checkout-error').textContent = '';
  logEvent('checkout.started', {
    cartLines: cartLines().length,
    itemCount: cartLines().reduce((sum, item) => sum + item.quantity, 0),
  });
  checkout.showModal();
}

function updateCheckoutTotals() {
  const promo = refs.checkoutDialog.querySelector('[name="promo"]').value;
  refs.checkoutDialog.querySelector('#checkout-totals').innerHTML = renderTotals(calculateCart(promo));
}

async function createOrder(form) {
  const user = currentUser();
  const error = refs.checkoutDialog.querySelector('#checkout-error');
  if (!user) {
    promptAuth('Tu sesión ha terminado. Regístrate o inicia sesión para continuar con la compra.');
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  if (data.website?.trim()) return;
  const name = (data.customerName || '').trim() || `${user.firstName} ${user.lastName}`.trim();
  if (!data.address?.trim() || !/^\d{5}$/.test(data.postalCode || '')
    || (data.city || '').trim().length < 2 || !name || !data.paymentMethod) {
    error.textContent = 'Revisa los campos de entrega y el método de pago.';
    return;
  }
  if (!cartLines().length) {
    error.textContent = 'El carrito está vacío.';
    return;
  }

  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  error.textContent = 'Guardando el pedido y enviando el aviso…';
  try {
    const result = await apiRequest('./api/orders/create.php', {
      method: 'POST',
      body: JSON.stringify({
        customer: {
          name,
          email: user.email,
          address: data.address.trim(),
          postalCode: data.postalCode.trim(),
          city: data.city.trim(),
        },
        items: cartLines().map(({ product, quantity }) => ({
          productId: Number(product.id),
          quantity: Number(quantity),
        })),
        paymentMethod: data.paymentMethod,
        promoCode: (data.promo || '').trim().toUpperCase() === 'YUZU10' ? 'YUZU10' : '',
      }),
    });

    state.cart = [];
    persistCartForUser([]);
    renderCart();
    if (typeof renderAccountOrders === 'function') renderAccountOrders();
    refs.checkoutDialog.close();

    const order = result.order;
    const notification = result.mailSent
      ? 'El servidor de correo aceptó el aviso corporativo.'
      : 'El pedido está guardado, pero no se pudo enviar el aviso por correo. Se conserva en la base de datos; avisa al administrador.';
    refs.successDialog.querySelector('#success-copy').textContent =
      `El pedido ${order.id} se ha guardado correctamente. Total: ${formatPrice(order.totals.total)}. El pago es una simulación y no se ha realizado ningún cobro. ${notification}`;
    refs.successDialog.showModal();
  } catch (requestError) {
    error.textContent = requestError.message || 'No se pudo crear el pedido.';
  } finally {
    submit.disabled = false;
  }
}
