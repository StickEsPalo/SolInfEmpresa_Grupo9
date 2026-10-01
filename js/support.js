async function supportRequested(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const feedback = form.querySelector("#support-feedback");
  const submit = form.querySelector('[type="submit"]');

  if (!/^\S+@\S+\.\S+$/.test((data.supportEmail || "").trim())) {
    feedback.textContent = "Introduce un correo válido para poder responderte.";
    return;
  }

  const message = (data.supportMessage || "").trim();
  if (message.length < 10 || message.length > 5000) {
    feedback.textContent = "Describe la incidencia con entre 10 y 5.000 caracteres.";
    return;
  }

  if ((data.website || "").trim()) return;

  submit.disabled = true;
  feedback.textContent = "Enviando la incidencia…";

  try {
    const response = await fetch("./enviar-incidencia.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({
        email: data.supportEmail.trim(),
        message
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "No se pudo enviar la incidencia.");
    }

    const ticket = {
      id: result.ticketId,
      createdAt: result.createdAt,
      email: data.supportEmail.trim(),
      message,
      status: "Abierta"
    };

    try {
      state.tickets.unshift(ticket);
      persist(STORAGE.tickets, state.tickets);
      logEvent("support.requested", {
        ticketId: ticket.id,
        channel: "web-form"
      });
    } catch (storageError) {
      console.warn("La incidencia se envió por correo, pero no se pudo guardar localmente.", storageError);
    }

    form.reset();
    feedback.textContent = `Incidencia ${ticket.id} enviada correctamente. Te responderemos en ${ticket.email}.`;
  } catch (requestError) {
    feedback.textContent = requestError.message || "No se pudo enviar la incidencia. Inténtalo de nuevo.";
  } finally {
    submit.disabled = false;
  }
}
