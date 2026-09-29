function logEvent(type, payload = {}) {
  const event = {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    occurredAt: new Date().toISOString(),
    source: "web-storefront",
    payload
  };

  state.events.unshift(event);

  persist(STORAGE.events, state.events);

  renderEventPreview();

  return event;
}

function renderEventPreview() {
  const sample = state.events
    .slice(0, 3)
    .map(event => ({
      event: event.type,
      at: event.occurredAt.slice(11, 19),
      payload: event.payload
    }));

  refs.eventPreview.textContent = sample.length
    ? JSON.stringify(sample, null, 2)
    : "// Aún no hay eventos.\n// Abre una ficha o añade un juego al carrito.";

  refs.eventCount.textContent =
    `${state.events.length} ${
      state.events.length === 1 ? "evento" : "eventos"
    }`;
}

function exportEvents() {
  const blob = new Blob(
    [JSON.stringify(state.events, null, 2)],
    {
      type: "application/json"
    }
  );

  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);

  link.download = "pangea-meeple-eventos.json";

  link.click();

  URL.revokeObjectURL(link.href);

  showToast("Exportación JSON preparada.");
}

function clearEvents() {
  if (
    !confirm(
      "¿Eliminar los eventos de prueba de este navegador? Los pedidos no se eliminarán."
    )
  ) {
    return;
  }

  state.events = [];

  persist(STORAGE.events, state.events);

  renderEventPreview();

  renderAdmin();

  selectAdminTab("events");

  showToast("Registros de eventos eliminados.");
}