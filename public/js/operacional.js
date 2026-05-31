/* VitorOS A1 — Camada Operacional: tasks, rabiscos, projetos */
(function () {
  "use strict";

  var TASK_COLS = ["Backlog", "Planejando", "Executando", "Revisão", "Concluído", "Arquivado"];
  var sb = null;
  var userId = null;
  var activeOp = "tasks";
  var tasks = [];
  var rabiscos = [];
  var projetos = [];
  var editingId = null;
  var editingType = null;

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  function toast(msg, isErr) {
    var el = $("op-toast");
    if (!el) return;
    el.textContent = msg;
    el.className = "op-toast" + (isErr ? " error" : "");
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.add("hidden"); }, 3200);
  }

  function nowIso() { return new Date().toISOString(); }

  function init(client) {
    sb = client;
    bindUi();
    sb.auth.getUser().then(function (res) {
      if (res.data.user) {
        userId = res.data.user.id;
        refreshAll();
      }
    });
  }

  function bindUi() {
    document.querySelectorAll(".op-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setOpTab(btn.getAttribute("data-op"));
      });
    });
    $("fab-add").addEventListener("click", onFab);
    $("modal-close").addEventListener("click", closeModal);
    $("modal-overlay").addEventListener("click", function (e) {
      if (e.target === $("modal-overlay")) closeModal();
    });
    $("modal-form").addEventListener("submit", onModalSave);
    $("modal-delete").addEventListener("click", onModalDelete);
  }

  function setOpTab(op) {
    activeOp = op;
    document.querySelectorAll(".op-tab").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-op") === op);
    });
    $("op-panel-tasks").classList.toggle("hidden", op !== "tasks");
    $("op-panel-rabiscos").classList.toggle("hidden", op !== "rabiscos");
    $("op-panel-projetos").classList.toggle("hidden", op !== "projetos");
    var labels = { tasks: "Nova task", rabiscos: "Novo rabisco", projetos: "Novo projeto" };
    $("fab-add").setAttribute("aria-label", labels[op] || "Adicionar");
  }

  function refreshAll() {
    if (!userId) return;
    Promise.all([loadTasks(), loadRabiscos(), loadProjetos()]).then(function () {
      renderKanban();
      renderRabiscos();
      renderProjetos();
      if (window.VitorOSApp && window.VitorOSApp.loadSnapshot) {
        window.VitorOSApp.loadSnapshot();
      }
    });
  }

  function loadTasks() {
    return sb.from("tasks").select("*").order("updated_at", { ascending: false })
      .then(function (res) {
        if (res.error) throw res.error;
        tasks = res.data || [];
      })
      .catch(function (e) { toast(e.message || "Erro ao carregar tasks", true); });
  }

  function loadRabiscos() {
    return sb.from("rabiscos").select("*").order("created_at", { ascending: false })
      .then(function (res) {
        if (res.error) throw res.error;
        rabiscos = res.data || [];
      })
      .catch(function (e) { toast(e.message || "Erro ao carregar rabiscos", true); });
  }

  function loadProjetos() {
    return sb.from("projetos").select("*").order("updated_at", { ascending: false })
      .then(function (res) {
        if (res.error) throw res.error;
        projetos = res.data || [];
      })
      .catch(function (e) { toast(e.message || "Erro ao carregar projetos", true); });
  }

  function prioClass(p) {
    if (p === "alta" || p === "critica" || p === "crítica") return "prio-alta";
    if (p === "baixa") return "prio-baixa";
    return "prio-media";
  }

  function renderKanban() {
    var board = $("kanban-board");
    if (!board) return;
    board.innerHTML = "";
    TASK_COLS.forEach(function (col) {
      var colEl = document.createElement("div");
      colEl.className = "kanban-col";
      colEl.innerHTML = "<div class=\"kanban-col-head\"><span>" + esc(col) + "</span><span class=\"kanban-count\">0</span></div><div class=\"kanban-cards\" data-status=\"" + esc(col) + "\"></div>";
      var cardsEl = colEl.querySelector(".kanban-cards");
      var colTasks = tasks.filter(function (t) { return t.status === col; });
      colEl.querySelector(".kanban-count").textContent = String(colTasks.length);
      if (!colTasks.length) {
        cardsEl.innerHTML = "<p class=\"kanban-empty\">Nenhuma task aqui</p>";
      } else {
        colTasks.forEach(function (t) {
          cardsEl.appendChild(taskCard(t));
        });
      }
      board.appendChild(colEl);
    });
  }

  function taskCard(t) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = "task-card";
    el.innerHTML = "<span class=\"prio-dot " + prioClass(t.prioridade) + "\"></span><span class=\"task-card-title\">" + esc(t.titulo) + "</span>";
    el.addEventListener("click", function () { openTaskModal(t); });
    return el;
  }

  function renderRabiscos() {
    var list = $("rabiscos-list");
    if (!list) return;
    var soltos = rabiscos.filter(function (r) { return r.status === "Solto"; });
    if (!soltos.length) {
      list.innerHTML = "<p class=\"empty-msg\">Nenhum rabisco solto. Toque + para capturar.</p>";
      return;
    }
    list.innerHTML = "";
    soltos.forEach(function (r) {
      var item = document.createElement("div");
      item.className = "rabisco-item";
      item.innerHTML = "<div class=\"rabisco-titulo\">" + esc(r.titulo) + "</div>" +
        (r.texto ? "<div class=\"rabisco-texto\">" + esc(r.texto) + "</div>" : "") +
        "<div class=\"rabisco-actions\">" +
        "<button type=\"button\" class=\"btn btn-ghost btn-sm\" data-act=\"edit\">Editar</button>" +
        "<button type=\"button\" class=\"btn btn-ghost btn-sm\" data-act=\"archive\">Arquivar</button>" +
        "</div>";
      item.querySelector("[data-act=edit]").addEventListener("click", function () { openRabiscoModal(r); });
      item.querySelector("[data-act=archive]").addEventListener("click", function () {
        updateRabisco(r.id, { status: "Arquivado" });
      });
      list.appendChild(item);
    });
  }

  function renderProjetos() {
    var list = $("projetos-list");
    if (!list) return;
    if (!projetos.length) {
      list.innerHTML = "<p class=\"empty-msg\">Nenhum projeto. Toque + para criar.</p>";
      return;
    }
    list.innerHTML = "";
    projetos.forEach(function (p) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "projeto-card";
      item.innerHTML = "<div class=\"projeto-nome\">" + esc(p.nome) + "</div>" +
        "<div class=\"projeto-meta\">" + esc(p.status || "Ideia") +
        (p.frente ? " · " + esc(p.frente) : "") + "</div>";
      item.addEventListener("click", function () { openProjetoModal(p); });
      list.appendChild(item);
    });
  }

  function onFab() {
    if (activeOp === "tasks") openTaskModal(null);
    else if (activeOp === "rabiscos") openRabiscoModal(null);
    else openProjetoModal(null);
  }

  function openModal(title, type, id) {
    editingType = type;
    editingId = id;
    $("modal-title").textContent = title;
    $("modal-delete").classList.toggle("hidden", !id);
    $("modal-overlay").classList.remove("hidden");
  }

  function closeModal() {
    $("modal-overlay").classList.add("hidden");
    editingId = null;
    editingType = null;
    $("modal-form").reset();
  }

  function fillProjetoSelect(selected) {
    var sel = $("modal-projeto-id");
    if (!sel) return;
    sel.innerHTML = "<option value=\"\">— Sem projeto —</option>";
    projetos.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.nome;
      if (selected === p.id) o.selected = true;
      sel.appendChild(o);
    });
  }

  function openTaskModal(t) {
    $("modal-task-fields").classList.remove("hidden");
    $("modal-rabisco-fields").classList.add("hidden");
    $("modal-projeto-fields").classList.add("hidden");
    fillProjetoSelect(t ? t.projeto_id : null);
    $("modal-titulo").value = t ? t.titulo : "";
    $("modal-status").value = t ? t.status : "Backlog";
    $("modal-prioridade").value = t ? (t.prioridade || "media") : "media";
    $("modal-observacoes").value = t ? (t.observacoes || "") : "";
    openModal(t ? "Editar task" : "Nova task", "task", t ? t.id : null);
  }

  function openRabiscoModal(r) {
    $("modal-task-fields").classList.add("hidden");
    $("modal-rabisco-fields").classList.remove("hidden");
    $("modal-projeto-fields").classList.add("hidden");
    $("modal-rabisco-titulo").value = r ? r.titulo : "";
    $("modal-rabisco-texto").value = r ? (r.texto || "") : "";
    openModal(r ? "Editar rabisco" : "Novo rabisco", "rabisco", r ? r.id : null);
  }

  function openProjetoModal(p) {
    $("modal-task-fields").classList.add("hidden");
    $("modal-rabisco-fields").classList.add("hidden");
    $("modal-projeto-fields").classList.remove("hidden");
    $("modal-projeto-nome").value = p ? p.nome : "";
    $("modal-projeto-status").value = p ? (p.status || "Ideia") : "Ideia";
    $("modal-projeto-frente").value = p ? (p.frente || "") : "";
    $("modal-projeto-desc").value = p ? (p.descricao || "") : "";
    openModal(p ? "Editar projeto" : "Novo projeto", "projeto", p ? p.id : null);
  }

  function onModalSave(e) {
    e.preventDefault();
    if (editingType === "task") saveTask();
    else if (editingType === "rabisco") saveRabisco();
    else if (editingType === "projeto") saveProjeto();
  }

  function saveTask() {
    var payload = {
      titulo: $("modal-titulo").value.trim(),
      status: $("modal-status").value,
      prioridade: $("modal-prioridade").value,
      observacoes: $("modal-observacoes").value.trim() || null,
      projeto_id: $("modal-projeto-id").value || null,
      updated_at: nowIso()
    };
    if (!payload.titulo) { toast("Título obrigatório", true); return; }
    var req = editingId
      ? sb.from("tasks").update(payload).eq("id", editingId)
      : sb.from("tasks").insert(Object.assign({ user_id: userId }, payload));
    req.then(function (res) {
      if (res.error) throw res.error;
      closeModal();
      refreshAll();
      toast("Task salva");
    }).catch(function (err) { toast(err.message || "Erro ao salvar", true); });
  }

  function saveRabisco() {
    var titulo = $("modal-rabisco-titulo").value.trim();
    var texto = $("modal-rabisco-texto").value.trim() || null;
    if (!titulo) { toast("Título obrigatório", true); return; }
    var payload = { titulo: titulo, texto: texto, status: "Solto" };
    var req = editingId
      ? sb.from("rabiscos").update(payload).eq("id", editingId)
      : sb.from("rabiscos").insert(Object.assign({ user_id: userId }, payload));
    req.then(function (res) {
      if (res.error) throw res.error;
      closeModal();
      refreshAll();
      toast("Rabisco salvo");
    }).catch(function (err) { toast(err.message || "Erro ao salvar", true); });
  }

  function saveProjeto() {
    var payload = {
      nome: $("modal-projeto-nome").value.trim(),
      status: $("modal-projeto-status").value,
      frente: $("modal-projeto-frente").value.trim() || null,
      descricao: $("modal-projeto-desc").value.trim() || null,
      updated_at: nowIso()
    };
    if (!payload.nome) { toast("Nome obrigatório", true); return; }
    var req = editingId
      ? sb.from("projetos").update(payload).eq("id", editingId)
      : sb.from("projetos").insert(Object.assign({ user_id: userId }, payload));
    req.then(function (res) {
      if (res.error) throw res.error;
      closeModal();
      refreshAll();
      toast("Projeto salvo");
    }).catch(function (err) { toast(err.message || "Erro ao salvar", true); });
  }

  function updateRabisco(id, patch) {
    sb.from("rabiscos").update(patch).eq("id", id).then(function (res) {
      if (res.error) throw res.error;
      refreshAll();
      toast("Rabisco atualizado");
    }).catch(function (err) { toast(err.message || "Erro", true); });
  }

  function onModalDelete() {
    if (!editingId || !editingType) return;
    if (!confirm("Excluir este item?")) return;
    var table = editingType === "task" ? "tasks" : editingType === "rabisco" ? "rabiscos" : "projetos";
    sb.from(table).delete().eq("id", editingId).then(function (res) {
      if (res.error) throw res.error;
      closeModal();
      refreshAll();
      toast("Excluído");
    }).catch(function (err) { toast(err.message || "Erro ao excluir", true); });
  }

  window.VitorOSOperacional = { init: init, refresh: refreshAll };
})();
