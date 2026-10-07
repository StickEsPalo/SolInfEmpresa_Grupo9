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

function showOrderSuccess(result) {
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
    showOrderSuccess(result);
  } catch (requestError) {
    error.textContent = requestError.message || 'No se pudo crear el pedido.';
  } finally {
    submit.disabled = false;
  }
}

let paypalButtonsRendered = false;

async function loadPayPalSdk() {
  if (window.paypal) return;
  const settings = await apiRequest('./api/paypal/settings.php');
  if (!settings.enabled) throw new Error('PayPal no está disponible en este momento.');
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(settings.clientId)}&currency=${settings.currency}&intent=capture&components=buttons`;
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar PayPal.'));
    document.head.appendChild(script);
  });
}

function readCheckoutData(form) {
  const user = currentUser();
  const error = refs.checkoutDialog.querySelector('#checkout-error');
  const data = Object.fromEntries(new FormData(form).entries());
  const name = (data.customerName || '').trim() || `${user.firstName} ${user.lastName}`.trim();
  if (!data.address?.trim() || !/^\d{5}$/.test(data.postalCode || '')
    || (data.city || '').trim().length < 2 || !name) {
    error.textContent = 'Revisa los campos de entrega antes de pagar.';
    return null;
  }
  error.textContent = '';
  return {
    customer: { name, email: user.email, address: data.address.trim(), postalCode: data.postalCode.trim(), city: data.city.trim() },
    items: cartLines().map(({ product, quantity }) => ({ productId: Number(product.id), quantity: Number(quantity) })),
    promoCode: (data.promo || '').trim().toUpperCase() === 'YUZU10' ? 'YUZU10' : '',
  };
}

async function togglePayPal(form) {
  const usePayPal = form.querySelector('[name="paymentMethod"]').value === 'PayPal';
  const container = form.querySelector('#paypal-button-container');
  const error = refs.checkoutDialog.querySelector('#checkout-error');
  form.querySelector('[type="submit"]').hidden = usePayPal;
  container.hidden = !usePayPal;
  if (!usePayPal || paypalButtonsRendered) return;

  try {
    await loadPayPalSdk();
    await paypal.Buttons({
      // Valida el formulario antes de abrir la ventana de PayPal
      onClick: (data, actions) => (readCheckoutData(form) ? actions.resolve() : actions.reject()),
      createOrder: async () => {
        const result = await apiRequest('./api/paypal/create-order.php', {
          method: 'POST',
          body: JSON.stringify(readCheckoutData(form)),
        });
        return result.id;
      },
      onApprove: async (data) => {
        error.textContent = 'Confirmando el pago con PayPal…';
        const result = await apiRequest('./api/paypal/capture-order.php', {
          method: 'POST',
          body: JSON.stringify({ orderID: data.orderID }),
        });
        showOrderSuccess(result);
      },
      onCancel: () => { error.textContent = 'Has cancelado el pago en PayPal.'; },
      onError: (err) => { error.textContent = err?.message || 'PayPal no pudo completar el pago.'; },
    }).render('#paypal-button-container');
    paypalButtonsRendered = true;
  } catch (loadError) {
    error.textContent = loadError.message;
  }
}
