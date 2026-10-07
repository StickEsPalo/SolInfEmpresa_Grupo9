function logEvent(type, payload = {}) {
  const event = {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    occurredAt: new Date().toISOString(),
    source: "web-storefront",
    payload,
  };

  state.events.unshift(event);
  state.events = state.events.slice(0, 200);
  persist(STORAGE.events, state.events);
  renderEventPreview();

  const shouldSendToApi =
    typeof currentUser === "function" &&
    (currentUser() || type === "product.viewed");

  if (shouldSendToApi) {
    apiRequest("./api/events/log.php", {
      method: "POST",
      body: JSON.stringify({
        type,
        payload,
        productId: payload.productId || null,
        orderId: payload.orderId || null,
      }),
    }).catch(() => {});
  }

  return event;
}

function renderEventPreview() {
  const sample = state.events.slice(0, 3).map((event) => ({
    event: event.type,
    at: event.occurredAt.slice(11, 19),
    payload: event.payload,
  }));

  refs.eventPreview.textContent = sample.length
    ? JSON.stringify(sample, null, 2)
    : "// Aún no hay eventos.\n// Abre una ficha o añade un juego al carrito.";
  refs.eventCount.textContent = `${state.events.length} ${
    state.events.length === 1 ? "evento" : "eventos"
  }`;
}

function exportEvents() {
  const content = JSON.stringify(state.events, null, 2);
  const file = new Blob([content], { type: "application/json" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(file);
  link.download = "planetaficha-eventos.json";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Exportación JSON preparada.");
}

function clearEvents() {
  if (!isAdmin()) return;

  const confirmed = confirm(
    "¿Eliminar la vista local de eventos? Los registros de la base de datos no se eliminan.",
  );
  if (!confirmed) return;

  state.events = [];
  persist(STORAGE.events, state.events);
  renderEventPreview();
  showToast("Vista local de eventos limpiada.");
}
