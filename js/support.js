async function supportRequested(form) {
  if (!requireAuth('Para enviar una incidencia debes iniciar sesión.')) return;

  const data = Object.fromEntries(new FormData(form).entries());
  const feedback = form.querySelector('#support-feedback');
  const submit = form.querySelector('[type="submit"]');
  const subject = (data.supportSubject || 'Soporte web').trim();
  const message = (data.supportMessage || '').trim();

  if (subject.length < 3 || message.length < 10 || message.length > 5000) {
    feedback.textContent = 'Revisa el asunto y describe la incidencia con entre 10 y 5.000 caracteres.';
    return;
  }
  if ((data.website || '').trim()) return;

  submit.disabled = true;
  feedback.textContent = 'Guardando la incidencia y enviando el aviso…';
  try {
    const result = await apiRequest('./api/support.php', {
      method: 'POST',
      body: JSON.stringify({ subject, message }),
    });
    form.reset();
    feedback.textContent = result.mailSent
      ? `Incidencia ${result.incidentId} registrada. El servidor de correo aceptó el aviso corporativo.`
      : `Incidencia ${result.incidentId} registrada, pero no se pudo enviar el aviso por correo. Se conserva en la base de datos; avisa al administrador.`;
  } catch (error) {
    feedback.textContent = error.message || 'No se pudo registrar la incidencia.';
  } finally {
    submit.disabled = false;
  }
}
