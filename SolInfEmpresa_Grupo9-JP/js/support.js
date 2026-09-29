function supportRequested(form) {
  const data = Object.fromEntries(
    new FormData(form).entries()
  );

  if (
    !/^\S+@\S+\.\S+$/.test(
      data.supportEmail || ""
    ) ||
    !(data.supportMessage || "").trim()
  ) {
    showToast(
      "Introduce un correo de prueba válido y una descripción de la solicitud."
    );

    return;
  }

  const ticket = {
    id: `SUP-${String(Date.now()).slice(-6)}`,
    createdAt: new Date().toISOString(),
    email: data.supportEmail.trim(),
    message: data.supportMessage.trim(),
    status: "Abierta"
  };

  state.tickets.unshift(ticket);

  persist(
    STORAGE.tickets,
    state.tickets
  );

  logEvent("support.requested", {
    ticketId: ticket.id,
    channel: "web-form"
  });

  form.reset();

  showToast(
    `Solicitud ${ticket.id} registrada. Te responderemos en una partida futura.`
  );
}