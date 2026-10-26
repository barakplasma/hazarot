const $ = (id) => document.getElementById(id);
const make = (tag, text, className) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; return e; };
const params = new URLSearchParams(location.search);
let room = params.get("room"), invite = params.get("invite"), session = room ? JSON.parse(localStorage.getItem(`rehearsal:${room}`) || "null") : null;
let scenarios = [], selected, snapshot, selectedThread = "coordination", socket, refreshPromise, modalAction;
let lastRender = "", reconnectAttempts = 0, refreshingAgain = false;
const endpoint = () => `/agents/rehearsal/${room}`;

function notice(text) { $("notice").textContent = text; $("notice").hidden = !text; }
async function api(path, options = {}) {
  const res = await fetch(path, { ...options, headers: { "content-type": "application/json", ...(session ? { authorization: `Bearer ${session.token}` } : {}), ...options.headers } });
  const data = await res.json(); if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`); return data;
}
async function command(op, payload = {}) {
  const commandId = crypto.randomUUID();
  const body = JSON.stringify({ op, ...payload, commandId });
  let data;
  try { data = await api(endpoint(), { method: "POST", body }); }
  catch (error) {
    // A network retry must reuse the same command ID. Domain errors are shown.
    if (error instanceof TypeError) data = await api(endpoint(), { method: "POST", body }); else throw error;
  }
  if (data.scenario) { snapshot = data; render(); }
  return data;
}
async function refresh() {
  if (refreshPromise) { refreshingAgain = true; return refreshPromise; }
  refreshPromise = (async () => {
    try { snapshot = await api(endpoint()); render(); }
    catch (error) { notice(error.message); }
    finally { refreshPromise = undefined; if (refreshingAgain) { refreshingAgain = false; refresh(); } }
  })(); return refreshPromise;
}
function connect() {
  if (socket) { socket.onclose = null; socket.close(); }
  socket = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}${endpoint()}?token=${encodeURIComponent(session.token)}`);
  socket.onopen = () => { reconnectAttempts = 0; $("connection").textContent = "● Connected"; refresh(); };
  socket.onmessage = (event) => { try { if (JSON.parse(event.data).type === "refresh") refresh(); } catch {} };
  socket.onclose = () => {
    $("connection").textContent = "Reconnecting…";
    setTimeout(connect, Math.min(1000 * 2 ** reconnectAttempts++, 12000));
  };
  socket.onerror = () => { $("connection").textContent = "Connection interrupted"; };
}

function showSetup(s, joining = false) {
  selected = s;
  $("setup-form").hidden = false;
  $("setup-title").textContent = joining ? `Join ${s.title}` : "Set up your room";
  $("setup-description").textContent = "Choose responsibilities for this round. Combine roles in a small group; rotate them on replay.";
  $("create-room").textContent = joining ? "Join rehearsal room" : "Create rehearsal room";
  $("role-choices").replaceChildren();
  for (const [index, r] of s.roles.entries()) {
    const label = make("label", undefined, "role-choice"), input = make("input"); input.type = "checkbox"; input.name = "roles"; input.value = r.id; input.checked = index === 0;
    const content = make("span", r.name); content.append(make("small", r.responsibility)); label.append(input, content); $("role-choices").append(label);
  }
  $("participant-name").value = localStorage.getItem("rehearsal:name") || "";
  document.querySelectorAll(".scenario-card").forEach(card => { const active = card.dataset.scenario === s.id; card.classList.toggle("selected", active); card.setAttribute("aria-pressed", String(active)); });
}
function saveSession(data, name) {
  room = data.room; session = { token: data.token, name }; localStorage.setItem(`rehearsal:${room}`, JSON.stringify(session)); localStorage.setItem("rehearsal:name", name);
  if (data.invite) invite = data.invite;
  const query = new URLSearchParams({ room }); if (invite) query.set("invite", invite);
  history.replaceState(null, "", `/?${query}`);
}
$("setup-form").onsubmit = async (event) => {
  event.preventDefault(); notice("");
  const roles = [...document.querySelectorAll('input[name="roles"]:checked')].map(e => e.value);
  if (!roles.length) { notice("Choose at least one responsibility."); return; }
  const name = $("participant-name").value.trim(); $("create-room").disabled = true;
  try {
    const data = room
      ? await api(`${endpoint()}`, { method: "POST", body: JSON.stringify({ op: "join", name, roles, invite }) })
      : await api("/api/runs", { method: "POST", body: JSON.stringify({ scenarioId: selected.id, name, roles }) });
    saveSession(data, name); connect(); await refresh();
  } catch (error) { notice(error.message); }
  finally { $("create-room").disabled = false; }
};

function button(label, handler, className) {
  const b = make("button", label, className); b.type = "button"; b.onclick = async () => {
    b.disabled = true; notice(""); try { await handler(); } catch (error) { notice(error.message); } finally { b.disabled = false; }
  }; return b;
}
function chooseThread(id) { selectedThread = id; lastRender = ""; render(); $("message").focus(); }
function nav(thread) {
  const b = button(thread.title, () => chooseThread(thread.id), `nav-button${thread.id === selectedThread ? " selected" : ""}`);
  b.setAttribute("aria-current", thread.id === selectedThread ? "page" : "false");
  if (thread.kind === "personal") b.append(make("small", thread.owner === snapshot.me.id ? "Your role and coaching" : "Private by convention"));
  return b;
}
function updateTimer() {
  if (!snapshot) return;
  const remaining = snapshot.phase === "active" ? Math.max(0, snapshot.endsAt - Date.now()) : Math.max(0, snapshot.durationMs - snapshot.elapsedMs);
  const seconds = Math.ceil(remaining / 1000);
  const timer = document.querySelector(".timer"); if (timer) timer.textContent = snapshot.phase === "debrief" ? "Debrief" : `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
function render() {
  if (!snapshot) return;
  $("welcome").hidden = true; $("workspace").hidden = false;
  const s = snapshot, roleNames = roles => s.scenario.roles.filter(r => roles.includes(r.id)).map(r => r.name).join(" + ");
  $("round-heading").replaceChildren(make("span", s.scenario.title), make("span", { lobby: "Waiting room", active: "Live rehearsal", paused: "Paused", debrief: "Debrief" }[s.phase], "phase"));
  const controls = $("top-controls"); controls.replaceChildren(make("span", "", "timer"));
  if (s.me.host && s.phase === "active") controls.append(button("Pause", () => command("pause"), "secondary"));
  if (s.me.host && s.phase === "paused") controls.append(button("Resume", () => command("resume"), "secondary"));
  if (s.phase === "active" || s.phase === "paused") controls.append(button("End round", () => openEnd(), "primary"));
  if (s.phase === "debrief") controls.append(button("Replay", replay, "primary"));
  updateTimer();
  $("room-nav").replaceChildren(...s.threads.filter(t => t.kind === "coordination").map(nav));
  $("personal-nav").replaceChildren(...s.threads.filter(t => t.kind === "personal").map(nav));
  $("work-nav").replaceChildren(...s.threads.filter(t => ["meeting", "investigation"].includes(t.kind)).map(nav));
  $("new-thread").disabled = s.phase === "debrief";
  $("participants").replaceChildren(...s.participants.map(p => {
    const row = make("div", undefined, "participant"), names = make("div"); names.append(make("strong", `${p.name}${p.id === s.me.id ? " (you)" : ""}`), make("small", roleNames(p.roles)));
    row.append(make("span", p.name.slice(0, 1).toUpperCase(), "avatar"), names); return row;
  }));
  $("invite").hidden = !s.me.host; $("invite").disabled = s.phase !== "lobby";
  const thread = s.threads.find(t => t.id === selectedThread) || s.threads[0]; selectedThread = thread.id;
  $("thread-title").textContent = thread.title;
  $("thread-subtitle").textContent = thread.kind === "personal" ? "Visible to everyone. Private by convention; share findings explicitly." : thread.kind === "meeting" ? "State the purpose. Finish with decisions, owners, and next steps." : "Share decisions, owners, and next updates.";
  $("message").placeholder = `Message ${thread.title}…`;
  const fingerprint = `${selectedThread}:${s.messages.at(-1)?.id}`;
  if (lastRender !== fingerprint) {
    const feed = $("messages"), atBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 100;
    const visible = s.messages.filter(m => m.thread === selectedThread);
    const nodes = visible.map(m => {
      const row = make("article", undefined, `message ${m.kind}`); row.id = `message-${m.id}`;
      const content = make("div", undefined, "message-main"), meta = make("div", undefined, "message-meta"), time = make("time", new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      time.dateTime = new Date(m.at).toISOString(); meta.append(make("strong", m.author), time, make("span", `#${m.id}`, "muted"));
      content.append(meta, make("div", m.text, "message-text"));
      if (m.refs?.length) content.append(make("div", `Evidence: ${m.refs.map(id => `#${id}`).join(", ")}`, "refs"));
      row.append(make("span", m.author.slice(0, 1).toUpperCase(), "avatar"), content); return row;
    });
    feed.replaceChildren(...nodes); if (atBottom || !lastRender.startsWith(selectedThread + ":")) feed.scrollTop = feed.scrollHeight;
    lastRender = fingerprint;
  }
  const lobby = $("lobby-banner"); lobby.hidden = s.phase !== "lobby";
  if (!lobby.hidden) {
    lobby.replaceChildren(make("span", "Share the invitation link, agree roles, then start. For a small group, one person can hold several responsibilities."));
    if (s.me.host) lobby.append(button("Start round", () => command("start"), "primary"));
  }
  const ending = $("ending-banner"); ending.hidden = s.phase !== "debrief";
  if (!ending.hidden) { ending.replaceChildren(make("strong", s.ended.label), make("p", "Play has stopped. Discuss the debrief in Coordination, then try a fresh round."), button("Read debrief", () => chooseThread("coordination"), "secondary")); }
  $("role-cards").replaceChildren(...s.roleCards.map(r => { const card = make("div", undefined, "role-card"); card.append(make("h3", r.name), make("p", r.responsibility), make("p", `Authority: ${r.authority}`)); return card; }));
  $("coach-mode").textContent = s.coachMode === "model" ? "AI coaching · internal OpenAI-compatible endpoint" : "Authored coaching · no model endpoint configured";
  $("ask-coach").disabled = s.phase === "lobby";
  $("actions").replaceChildren(...s.actions.filter(a => a.allowed).map(a => {
    const b = button(a.label, () => confirmDialog(a.label, "This commits a fictional action under your role. Review any approvals with teammates first. The result will be recorded in this thread or Coordination.", () => command("action", { actionId: a.id, confirmed: true, thread: selectedThread })), a.done ? "done" : "");
    b.disabled = s.phase !== "active" || !a.ready || a.done;
    if (a.done) b.append(make("small", "Recorded")); else if (!a.ready) b.append(make("small", "Needs evidence or approval")); return b;
  }));
  $("endings").replaceChildren(...s.endings.map(e => {
    const b = button(e.label, () => endDialog(e.id, e.label), "secondary"); b.disabled = !["active", "paused"].includes(s.phase); return b;
  }));
  if (!s.endings.length) $("endings").append(make("p", "Your role cannot declare an ending. Coordinate with the decision owner.", "small muted"));
}

function dialog(title, description, action, input = false, threadKind = false) {
  $("modal-title").textContent = title; $("modal-description").textContent = description;
  $("modal-input-label").hidden = !input; $("modal-kind-label").hidden = !threadKind;
  $("modal-input").value = ""; $("modal-input").required = input; $("modal-confirm").disabled = false;
  modalAction = action; $("modal").showModal(); if (input) $("modal-input").focus();
}
function confirmDialog(title, description, action) { dialog(title, description, action); }
function endDialog(id, label) { confirmDialog(label, "This ends play immediately and starts the debrief. Ending the round does not automatically mean success. Pending developments will no longer affect the round.", () => command("end", { endingId: id, confirmed: true })); }
function openEnd() {
  const endings = snapshot.endings;
  if (endings.length) {
    dialog("Choose an ending", "Use your scenario ending below, or cancel to continue. The facilitator can also stop a round.", () => command("end", { endingId: $("modal-kind").value, confirmed: true }), false, true);
    $("modal-kind-label").firstChild.textContent = "Ending";
    $("modal-kind").replaceChildren(...[...endings, ...(snapshot.me.host ? [{ id: "facilitator-stop", label: "Facilitator stop" }] : [])].map(e => { const o = make("option", e.label); o.value = e.id; return o; }));
  } else if (snapshot.me.host) endDialog("facilitator-stop", "Stop the round as facilitator");
  else notice("Ask the decision owner to confirm an ending, or establish the scenario's verified outcome through its action cards.");
}
$("modal-cancel").onclick = () => $("modal").close();
$("modal-form").onsubmit = async (event) => {
  event.preventDefault(); $("modal-confirm").disabled = true;
  try { await modalAction(); $("modal").close(); }
  catch (error) { notice(error.message); }
  finally { $("modal-confirm").disabled = false; }
};
$("new-thread").onclick = () => {
  $("modal-kind-label").firstChild.textContent = "Thread type";
  $("modal-kind").replaceChildren(...["investigation", "meeting"].map(k => { const o = make("option", k[0].toUpperCase() + k.slice(1)); o.value = k; return o; }));
  dialog("Create a work thread", "Give the investigation or meeting a clear purpose. Tell teammates in Coordination where to join you.", async () => { const before = snapshot.threads.length; await command("thread", { title: $("modal-input").value, kind: $("modal-kind").value }); if (snapshot.threads.length > before) chooseThread(snapshot.threads.at(-1).id); }, true, true);
};
$("ask-coach").onclick = () => dialog("Ask your coach", "Coaching appears in your own thread. Ask about communication, responsibilities, or a decision you are considering.", async () => { await command("coach", { question: $("modal-input").value || "What should I communicate next?" }); chooseThread(`personal-${snapshot.me.id}`); }, true);
$("template").onclick = () => { $("message").value = snapshot.template; $("message").focus(); };
$("role-toggle").onclick = () => { const open = $("role-panel").classList.toggle("open"); $("role-toggle").setAttribute("aria-expanded", String(open)); };
$("role-close").onclick = () => { $("role-panel").classList.remove("open"); $("role-toggle").setAttribute("aria-expanded", "false"); $("role-toggle").focus(); };
$("composer").onsubmit = async (event) => {
  event.preventDefault(); const input = $("message"), value = input.value; if (!value.trim()) return;
  const send = event.submitter; send.disabled = true;
  try { await command("message", { thread: selectedThread, text: value }); if (input.value === value) input.value = ""; input.focus(); notice(""); }
  catch (error) { notice(error.message); } finally { send.disabled = false; }
};
$("message").onkeydown = event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); $("composer").requestSubmit($("composer").querySelector("button")); } };
$("invite").onclick = () => {
  const url = `${location.origin}/?room=${encodeURIComponent(room)}&invite=${encodeURIComponent(snapshot.invite)}`;
  dialog("Invite your teammates", "Share this invitation before starting. Each teammate chooses their name and responsibilities. Keep the link within your group.", async () => {} , true);
  $("modal-input").value = url; $("modal-input").readOnly = true; $("modal-confirm").textContent = "Done";
};
$("modal").addEventListener("close", () => { $("modal-input").readOnly = false; $("modal-confirm").textContent = "Confirm"; });
$("export").onclick = () => {
  const data = { scenario: snapshot.scenario.title, room, phase: snapshot.phase, ended: snapshot.ended, threads: snapshot.threads, messages: snapshot.messages };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = make("a"); a.href = url; a.download = `rehearsal-${room}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
async function replay() {
  confirmDialog("Start a fresh rehearsal?", "A new room starts with empty history, reset knowledge, and a fresh clock. Invite the team again and choose different responsibilities if you want to rotate roles.", async () => {
    const scenarioId = snapshot.scenario.id, name = snapshot.me.name;
    if (socket) { socket.onclose = null; socket.close(); }
    session = null; room = null; snapshot = undefined; selectedThread = "coordination"; lastRender = "";
    history.replaceState(null, "", "/"); $("workspace").hidden = true; $("welcome").hidden = false;
    $("round-heading").textContent = "Practice working together."; $("top-controls").replaceChildren();
    $("scenarios").hidden = false; $("choose-title").textContent = "Choose a rehearsal";
    showSetup(scenarios.find(s => s.id === scenarioId)); $("participant-name").value = name;
  });
}

async function initialize() {
  const config = await api("/api/scenarios"); scenarios = config.scenarios;
  $("backend-mode").textContent = config.coachMode === "model" ? "Coaching uses a configured model endpoint. All scenario effects remain fictional." : "Runs without external services. Authored coaching is active; an optional internal model endpoint can enrich it.";
  $("scenarios").replaceChildren(...scenarios.map(s => {
    const card = button("", () => showSetup(s), "scenario-card"); card.dataset.scenario = s.id; card.setAttribute("aria-pressed", "false");
    card.append(make("span", s.category, "category"), make("h3", s.title), make("p", s.summary), make("span", `${s.exercise_minutes} min practice + ${s.debrief_minutes} min debrief`, "duration")); return card;
  }));
  if (room && session) {
    try { snapshot = await api(endpoint()); render(); connect(); return; }
    catch { session = null; localStorage.removeItem(`rehearsal:${room}`); }
  }
  if (room) {
    const info = await api(`${endpoint()}?invite=${encodeURIComponent(invite || "")}`);
    $("scenarios").hidden = true; $("choose-title").textContent = "You’ve been invited to rehearse";
    showSetup(info.scenario, true);
    if (info.phase !== "lobby") { $("create-room").disabled = true; notice("This round has already started. Ask the facilitator for a fresh invitation on replay."); }
  }
}
setInterval(() => { updateTimer(); if (snapshot?.phase === "active" && snapshot.endsAt <= Date.now()) refresh(); }, 1000);
setInterval(() => { if (snapshot && document.visibilityState === "visible") refresh(); }, 15000);
initialize().catch(error => notice(error.message));
