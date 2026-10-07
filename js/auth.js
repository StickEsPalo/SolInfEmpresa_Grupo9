let authUser = null;

const authRefs = {
  dialog: document.querySelector("#auth-dialog"),
  title: document.querySelector("#auth-title"),
  eyebrow: document.querySelector("#auth-eyebrow"),
  gateMessage: document.querySelector("#auth-gate-message"),
  loginLead: document.querySelector("#auth-login-lead"),
  loginView: document.querySelector("#auth-login-view"),
  registerView: document.querySelector("#auth-register-view"),
  accountView: document.querySelector("#auth-account-view"),
  loginForm: document.querySelector("#login-form"),
  registerForm: document.querySelector("#register-form"),
  loginError: document.querySelector("#login-error"),
  registerError: document.querySelector("#register-error"),
  accountButtonLabel: document.querySelector("#account-button-label"),
  accountName: document.querySelector("#account-name"),
  accountEmail: document.querySelector("#account-email"),
  accountRole: document.querySelector("#account-role"),
  accountOrders: document.querySelector("#account-orders"),
  accountAdminButton: document.querySelector("#account-admin-button"),
  adminAccess: document.querySelector("#admin-access"),
};

function currentUser() {
  return authUser;
}

function isAuthenticated() {
  return Boolean(authUser);
}

function isAdmin() {
  return authUser?.role === "administrador";
}

function userDisplayName(user) {
  return user ? `${user.firstName} ${user.lastName}`.trim() : "Usuario";
}

function setAuthError(element, message) {
  if (element) element.textContent = message;
}

function clearAuthErrors() {
  setAuthError(authRefs.loginError, "");
  setAuthError(authRefs.registerError, "");
}

function updateRoleUI() {
  const admin = isAdmin();

  if (authRefs.accountButtonLabel) {
    authRefs.accountButtonLabel.textContent = isAuthenticated()
      ? "Mi cuenta"
      : "Iniciar sesión";
  }

  if (authRefs.adminAccess) {
    authRefs.adminAccess.hidden = !admin;
    authRefs.adminAccess.setAttribute("aria-hidden", String(!admin));
  }

  document.querySelectorAll("[data-admin-only]").forEach((element) => {
    element.hidden = !admin;
    element.setAttribute("aria-hidden", String(!admin));
  });

  if (authRefs.accountAdminButton) {
    authRefs.accountAdminButton.hidden = !admin;
  }
}

async function renderAccountOrders() {
  if (!authUser || !authRefs.accountOrders) return;

  authRefs.accountOrders.innerHTML =
    '<p class="account-orders-empty">Cargando tus compras…</p>';

  try {
    const result = await apiRequest("./api/orders/my-orders.php");
    const orders = result.orders || [];

    if (!orders.length) {
      authRefs.accountOrders.innerHTML = `
        <div class="account-orders-empty">
          <p class="eyebrow">Mis compras</p>
          <p>Todavía no tienes compras registradas con esta cuenta.</p>
        </div>
      `;
      return;
    }

    const orderCards = orders
      .map((order) => {
        const items = (order.items || [])
          .map(
            (item) =>
              `<span>${item.quantity}× ${safeText(t(item.title))}</span>`,
          )
          .join("");
        const orderDate = new Date(order.createdAt).toLocaleString(
          localeForLanguage(),
          { dateStyle: "short", timeStyle: "short" },
        );

        return `
          <article class="account-order-card">
            <div class="account-order-topline">
              <b>${safeText(order.id)}</b>
              <span class="status-chip">
                ${safeText(orderStatusLabel(order.status))}
              </span>
            </div>
            <p class="account-order-date">${orderDate}</p>
            <div class="account-order-products">${items}</div>
            <div class="account-order-total">
              <span>Total</span>
              <b>${formatPrice(order.totals.total)}</b>
            </div>
          </article>
        `;
      })
      .join("");

    authRefs.accountOrders.innerHTML = `
      <div class="account-orders-heading">
        <p class="eyebrow">Mis compras</p>
        <span>${orders.length} ${orders.length === 1 ? "pedido" : "pedidos"}</span>
      </div>
      <div class="account-order-list">${orderCards}</div>
    `;
  } catch (error) {
    const message = error.message || "No se pudieron cargar tus compras.";
    authRefs.accountOrders.innerHTML =
      `<p class="form-error">${safeText(message)}</p>`;
  }
}

function renderAuthView(view) {
  authRefs.loginView.hidden = view !== "login";
  authRefs.registerView.hidden = view !== "register";
  authRefs.accountView.hidden = view !== "account";

  if (view === "login") {
    authRefs.eyebrow.textContent = "Acceso a tu cuenta";
    authRefs.title.textContent = "Iniciar sesión";
    authRefs.loginLead.textContent =
      "Inicia sesión para acceder al carrito, comprar y consultar tus pedidos.";
  }

  if (view === "register") {
    authRefs.eyebrow.textContent = "Nuevo usuario";
    authRefs.title.textContent = "Crear cuenta";
  }

  if (view === "account") {
    authRefs.eyebrow.textContent = "Cuenta activa";
    authRefs.title.textContent = "Mi cuenta";
    authRefs.accountName.textContent = userDisplayName(authUser);
    authRefs.accountEmail.textContent = authUser.email;
    authRefs.accountRole.textContent = isAdmin() ? "Administrador" : "Usuario";
    renderAccountOrders();
  }

  updateRoleUI();
  clearAuthErrors();
}

function openAuth(view = isAuthenticated() ? "account" : "login", message = "") {
  renderAuthView(view);

  if (authRefs.gateMessage) {
    authRefs.gateMessage.textContent = message;
    authRefs.gateMessage.hidden = !message;
  }

  if (!authRefs.dialog.open) authRefs.dialog.showModal();
}

function promptAuth(message) {
  openAuth("login", message);
}

function resetAuthForms() {
  if (authRefs.loginForm) authRefs.loginForm.reset();
  if (authRefs.registerForm) authRefs.registerForm.reset();
}

function closeAuth() {
  if (authRefs.dialog.open) authRefs.dialog.close();
  resetAuthForms();
  clearAuthErrors();

  if (authRefs.gateMessage) {
    authRefs.gateMessage.textContent = "";
    authRefs.gateMessage.hidden = true;
  }
}

function requireAuth(message = "Para continuar necesitas registrarte o iniciar sesión.") {
  if (isAuthenticated()) return true;

  promptAuth(message);
  return false;
}

function showRegister() {
  renderAuthView("register");
  authRefs.registerForm.reset();
  authRefs.registerForm.querySelector("[name=firstName]").focus();
}

function showLogin() {
  renderAuthView("login");
  authRefs.loginForm.reset();
  authRefs.loginForm.querySelector("[name=email]").focus();
}

function syncCartAfterAuthChange() {
  if (typeof syncCartForCurrentUser === "function") {
    syncCartForCurrentUser();
  }
  if (typeof renderCart === "function") renderCart();
}

async function loadSession() {
  try {
    const result = await apiRequest("./api/auth/session.php");
    csrfToken = result.csrfToken || csrfToken;
    authUser = result.user || null;
    updateRoleUI();
  } catch (error) {
    authUser = null;
    updateRoleUI();
    console.warn("Sesión no disponible", error);
  }
}

const authReady = loadSession();

if (authRefs.dialog) {
  authRefs.dialog.addEventListener("close", resetAuthForms);
}

async function loginUser(form) {
  const formData = Object.fromEntries(new FormData(form).entries());
  const email = String(formData.email || "").trim();
  const password = String(formData.password || "");

  if (!/^\S+@\S+\.com$/i.test(email) || !password) {
    setAuthError(
      authRefs.loginError,
      "Introduce un correo .com válido y tu contraseña.",
    );
    return;
  }

  try {
    const result = await apiRequest("./api/auth/login.php", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    authUser = result.user;
    csrfToken = result.csrfToken;
    resetAuthForms();
    syncCartAfterAuthChange();
    renderAuthView("account");
    showToast(`Bienvenido/a, ${authUser.firstName}.`);
  } catch (error) {
    setAuthError(authRefs.loginError, error.message);
  }
}

async function createUser(form) {
  const formData = Object.fromEntries(new FormData(form).entries());
  const data = {
    firstName: String(formData.firstName || "").trim(),
    lastName: String(formData.lastName || "").trim(),
    email: String(formData.email || "").trim().toLowerCase(),
    password: String(formData.password || ""),
  };
  const validName = /^[A-ZÁÉÍÓÚÜÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]*$/u;
  const validPassword = /^[A-ZÁÉÍÓÚÜÑ](?=.*\d).{5,}$/u;

  if (!validName.test(data.firstName) || !validName.test(data.lastName)) {
    setAuthError(
      authRefs.registerError,
      "El nombre y los apellidos deben empezar por mayúscula.",
    );
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.com$/i.test(data.email)) {
    setAuthError(
      authRefs.registerError,
      "El correo debe contener @ y terminar en .com.",
    );
    return;
  }

  if (!validPassword.test(data.password)) {
    setAuthError(
      authRefs.registerError,
      "La contraseña debe empezar por mayúscula, tener al menos 6 caracteres y contener un número.",
    );
    return;
  }

  try {
    const result = await apiRequest("./api/auth/register.php", {
      method: "POST",
      body: JSON.stringify(data),
    });
    authUser = result.user;
    csrfToken = result.csrfToken;
    resetAuthForms();
    syncCartAfterAuthChange();
    renderAuthView("account");
    showToast("Cuenta creada correctamente.");
  } catch (error) {
    setAuthError(authRefs.registerError, error.message);
  }
}

async function logoutUser() {
  try {
    await apiRequest("./api/auth/logout.php", {
      method: "POST",
      body: "{}",
    });
  } catch (error) {
    console.warn(error);
  }

  authUser = null;
  resetAuthForms();
  syncCartAfterAuthChange();
  updateRoleUI();
  closeAuth();
  closeCart();
  showToast("Has cerrado la sesión.");
}

authRefs.loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  loginUser(event.currentTarget);
});

authRefs.registerForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  createUser(event.currentTarget);
});

authRefs.dialog?.addEventListener("click", (event) => {
  if (event.target === authRefs.dialog) closeAuth();
});
