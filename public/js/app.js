/* VitorOS A0 — Auth + shell 3 camadas */
(function () {
  "use strict";

  var cfg = window.VITOROS_CONFIG;
  if (!cfg || !cfg.supabaseUrl || !cfg.supabaseKey) {
    document.body.innerHTML = "<p style='color:#f87171;padding:2rem'>Config ausente. Copie js/config.example.js → js/config.js</p>";
    return;
  }

  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      flowType: "implicit"
    }
  });
  var loginScreen = document.getElementById("login-screen");
  var appShell = document.getElementById("app-shell");
  var loginForm = document.getElementById("login-form");
  var loginMsg = document.getElementById("login-msg");
  var loginBtn = document.getElementById("login-btn");

  function showLogin() {
    loginScreen.classList.remove("hidden");
    appShell.classList.add("hidden");
  }

  function showApp() {
    loginScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    loadSnapshot();
  }

  function setLayer(n) {
    var id = String(n);
    document.querySelectorAll(".layer-panel").forEach(function (el) {
      el.classList.toggle("active", el.id === "layer-" + id);
    });
    document.querySelectorAll(".layer-tab").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-layer") === id);
    });
    document.querySelectorAll(".bottom-nav button").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-layer") === id);
    });
  }

  document.querySelectorAll(".layer-tab, .bottom-nav button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLayer(btn.getAttribute("data-layer"));
    });
  });

  document.getElementById("logout-btn").addEventListener("click", function () {
    sb.auth.signOut().then(showLogin);
  });

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    loginMsg.textContent = "";
    loginMsg.className = "msg";
    loginBtn.disabled = true;
    loginBtn.textContent = "Entrando…";
    var email = document.getElementById("email").value.trim();
    var password = document.getElementById("password").value;
    sb.auth.signInWithPassword({ email: email, password: password })
      .then(function (res) {
        if (res.error) throw res.error;
        showApp();
      })
      .catch(function (err) {
        var msg = err.message || "Falha no login";
        if (msg.indexOf("Invalid login credentials") !== -1) {
          msg = "E-mail ou senha incorretos. Use “Esqueci a senha” se precisar redefinir.";
        }
        if (msg.indexOf("Email not confirmed") !== -1) {
          msg = "E-mail ainda não confirmado — use “Esqueci a senha” ou peça novo link.";
        }
        loginMsg.textContent = msg;
        loginMsg.className = "msg error";
      })
      .finally(function () {
        loginBtn.disabled = false;
        loginBtn.textContent = "Entrar";
      });
  });

  function loadSnapshot() {
    sb.rpc("snapshot_estado").then(function (res) {
      if (res.error || !res.data) return;
      var d = res.data;
      setKpi("kpi-projetos", d.projetos_ativos);
      setKpi("kpi-tasks", d.tasks_abertas);
      setKpi("kpi-criticas", d.tasks_criticas);
      setKpi("kpi-rabiscos", d.rabiscos_soltos);
      setKpi("kpi-sugestoes", d.sugestoes_pendentes);
    });
  }

  function setKpi(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val != null ? String(val) : "0";
  }

  var forgotBtn = document.getElementById("forgot-btn");
  if (forgotBtn) {
    forgotBtn.addEventListener("click", function () {
      var email = document.getElementById("email").value.trim();
      if (!email) {
        loginMsg.textContent = "Digite seu e-mail acima e clique em Esqueci a senha.";
        loginMsg.className = "msg error";
        return;
      }
      loginMsg.textContent = "Enviando link de redefinição…";
      loginMsg.className = "msg";
      forgotBtn.disabled = true;
      sb.auth.resetPasswordForEmail(email, { redirectTo: "https://vitoroliv.com" })
        .then(function (res) {
          if (res.error) throw res.error;
          loginMsg.textContent = "Link enviado! Confira o e-mail (e spam). Depois entre com a nova senha.";
          loginMsg.className = "msg ok";
        })
        .catch(function (err) {
          loginMsg.textContent = err.message || "Não foi possível enviar o link.";
          loginMsg.className = "msg error";
        })
        .finally(function () { forgotBtn.disabled = false; });
    });
  }

  function handleAuthCallback() {
    var hash = window.location.hash || "";
    var params = new URLSearchParams(window.location.search);
    var isCallback = hash.indexOf("access_token") !== -1 ||
      hash.indexOf("type=recovery") !== -1 ||
      params.get("code") ||
      params.get("error_description");
    if (!isCallback) return Promise.resolve(false);
    return sb.auth.getSession().then(function (res) {
      if (res.data.session) {
        window.history.replaceState({}, document.title, window.location.pathname);
        showApp();
        return true;
      }
      if (params.get("error_description")) {
        loginMsg.textContent = decodeURIComponent(params.get("error_description"));
        loginMsg.className = "msg error";
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      return false;
    });
  }

  handleAuthCallback().then(function (handled) {
    if (handled) return;
    sb.auth.getSession().then(function (res) {
      if (res.data.session) showApp();
      else showLogin();
    });
  });

  sb.auth.onAuthStateChange(function (event, session) {
    if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session) showApp();
    if (event === "SIGNED_OUT") showLogin();
  });
})();
