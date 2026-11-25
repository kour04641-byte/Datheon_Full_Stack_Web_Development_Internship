// ---------- State ----------
const KEY = "taskManager.tasks", PKEY = "taskManager.pomodoro", TKEY = "taskManager.theme";
const CATS = ["Work", "Personal", "Study", "Health"], PRIS = ["Low", "Medium", "High"];
const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);
const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };

let tasks = read(KEY, []).map((t) => ({ priority: "Medium", ...t }));
let filter = "all", query = "", sort = "manual", cat = "All";
let editingId = null, dragId = null, deleted = null, toastTimer;

const commit = () => { localStorage.setItem(KEY, JSON.stringify(tasks)); render(); };

// ---------- Create / Update ----------
$("task-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = $("title").value.trim();
  if (!title) return;
  const data = { title, category: $("category").value, priority: $("priority").value, due: $("due").value };
  if (editingId) {
    Object.assign(tasks.find((t) => t.id === editingId), data);
    toast("Task updated");
    stopEditing();
  } else {
    tasks.unshift({ id: Date.now(), done: false, created: Date.now(), ...data });
    toast("Task added");
  }
  $("task-form").reset(); $("priority").value = "Medium";
  commit();
});
function stopEditing() {
  editingId = null; $("submit-btn").textContent = "Add task"; $("cancel-btn").hidden = true;
}
$("cancel-btn").onclick = () => { stopEditing(); $("task-form").reset(); $("priority").value = "Medium"; };
function startEditing(t) {
  editingId = t.id;
  $("title").value = t.title; $("category").value = t.category; $("priority").value = t.priority; $("due").value = t.due || "";
  $("submit-btn").textContent = "Save changes"; $("cancel-btn").hidden = false; $("title").focus();
}

// ---------- Filters, search, sort ----------
$("filters").addEventListener("click", (e) => {
  if (!e.target.dataset.filter) return;
  filter = e.target.dataset.filter;
  document.querySelectorAll("#filters button").forEach((b) => b.classList.toggle("active", b === e.target));
  render();
});
$("search").addEventListener("input", (e) => { query = e.target.value.toLowerCase(); render(); });
$("sort").addEventListener("change", (e) => { sort = e.target.value; render(); });
$("cats").addEventListener("click", (e) => { if (e.target.dataset.cat) { cat = e.target.dataset.cat; render(); } });

function sorted(list) {
  const l = [...list], rank = { High: 0, Medium: 1, Low: 2 };
  if (sort === "due") l.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  if (sort === "priority") l.sort((a, b) => rank[a.priority] - rank[b.priority]);
  if (sort === "newest") l.sort((a, b) => b.id - a.id);
  return l;
}

// ---------- Render ----------
function render() {
  const visible = sorted(tasks.filter((t) =>
    (filter === "all" || (filter === "completed" ? t.done : !t.done)) &&
    (cat === "All" || t.category === cat) && t.title.toLowerCase().includes(query)));

  const list = $("task-list");
  list.innerHTML = "";
  if (!visible.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = tasks.length ? "No tasks match this view. Try another filter." : "Your list is empty. Add your first task above.";
    list.appendChild(li);
  }
  visible.forEach((t) => list.appendChild(buildItem(t)));

  $("cats").innerHTML = "";
  ["All", ...CATS].forEach((c) => {
    const b = document.createElement("button");
    b.textContent = c; b.dataset.cat = c;
    b.style.setProperty("--c", `var(--${c})`);
    b.classList.toggle("active", c === cat);
    $("cats").appendChild(b);
  });
  updateStats();
}

function updateStats() {
  const t0 = today(), total = tasks.length, done = tasks.filter((t) => t.done).length;
  const open = tasks.filter((t) => !t.done);
  const over = open.filter((t) => t.due && t.due < t0).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $("n-active").textContent = open.length; $("n-done").textContent = done; $("n-over").textContent = over;
  $("n-today").textContent = open.filter((t) => t.due === t0).length;
  $("pct").textContent = pct + "%";
  $("arc").style.strokeDashoffset = 213.6 * (1 - pct / 100);
  $("stats").textContent = total && !open.length ? "All done. Nice work!" : `${open.length} to do, ${done} completed`;
}

function buildItem(t) {
  const li = document.createElement("li");
  li.className = `task ${t.category}${t.done ? " done" : ""} enter`;
  li.draggable = sort === "manual";

  const overdue = t.due && !t.done && t.due < today();
  li.innerHTML = `<input type="checkbox" aria-label="Mark complete">
    <div class="body"><span class="title" title="Double-click to edit"></span><span class="meta"></span></div>
    <div class="actions"><button class="edit">Edit</button><button class="del">Delete</button></div>`;
  li.querySelector("input").checked = t.done;
  li.querySelector(".title").textContent = t.title;           // textContent prevents HTML injection

  const meta = li.querySelector(".meta");
  const add = (cls, text) => { const s = document.createElement("span"); if (cls) s.className = cls; s.textContent = text; meta.appendChild(s); };
  add("", t.category); add(`pri ${t.priority}`, t.priority);
  if (t.due) add(overdue ? "overdue" : "", (overdue ? "Overdue: " : t.due === today() ? "Due today" : "Due ") + (t.due === today() && !overdue ? "" : t.due));

  li.querySelector("input").addEventListener("change", (e) => {
    t.done = !t.done; if (t.done) confetti(e.target); commit();
  });
  li.querySelector(".edit").onclick = () => startEditing(t);
  li.querySelector(".title").ondblclick = () => startEditing(t);
  li.querySelector(".del").onclick = () => {
    deleted = { task: t, index: tasks.indexOf(t) };
    tasks = tasks.filter((x) => x.id !== t.id); commit();
    toast("Task deleted", "Undo", () => { tasks.splice(deleted.index, 0, deleted.task); commit(); });
  };

  // Drag-and-drop reordering (manual order only)
  li.addEventListener("dragstart", () => { dragId = t.id; li.classList.add("dragging"); });
  li.addEventListener("dragend", () => li.classList.remove("dragging"));
  li.addEventListener("dragover", (e) => { e.preventDefault(); li.classList.add("over"); });
  li.addEventListener("dragleave", () => li.classList.remove("over"));
  li.addEventListener("drop", () => {
    if (dragId === t.id) return;
    const [moved] = tasks.splice(tasks.findIndex((x) => x.id === dragId), 1);
    tasks.splice(tasks.findIndex((x) => x.id === t.id), 0, moved);
    commit();
  });
  return li;
}

// ---------- Toast, confetti ----------
function toast(msg, action, fn) {
  const el = $("toast"); el.innerHTML = ""; el.hidden = false;
  el.append(msg);
  if (action) { const b = document.createElement("button"); b.textContent = action; b.onclick = () => { fn(); el.hidden = true; }; el.append(b); }
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 4000);
}
function confetti(from) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = from.getBoundingClientRect(), colors = ["#3b3ee8", "#e08a00", "#8a3fe0", "#12a37a", "#d6334a"];
  for (let i = 0; i < 22; i++) {
    const p = document.createElement("span"); p.className = "confetti";
    p.style.left = r.left + "px"; p.style.top = r.top + "px"; p.style.background = colors[i % 5];
    p.style.setProperty("--x", (Math.random() - .5) * 220 + "px"); p.style.setProperty("--y", Math.random() * 160 - 40 + "px");
    document.body.appendChild(p); setTimeout(() => p.remove(), 900);
  }
}

// ---------- Footer actions: clear, export, import ----------
$("clear").onclick = () => {
  const n = tasks.filter((t) => t.done).length;
  if (!n) return toast("No completed tasks to clear");
  tasks = tasks.filter((t) => !t.done); commit(); toast(`Cleared ${n} completed`);
};
$("export").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" }));
  a.download = "tasks.json"; a.click(); URL.revokeObjectURL(a.href);
};
$("import").addEventListener("change", async (e) => {
  try {
    const data = JSON.parse(await e.target.files[0].text());
    if (!Array.isArray(data)) throw 0;
    const clean = data.filter((t) => t && typeof t.title === "string").map((t, i) => ({
      id: Date.now() + i, done: !!t.done, title: t.title.slice(0, 100), due: /^\d{4}-\d\d-\d\d$/.test(t.due) ? t.due : "",
      category: CATS.includes(t.category) ? t.category : "Personal", priority: PRIS.includes(t.priority) ? t.priority : "Medium" }));
    tasks = [...clean, ...tasks]; commit(); toast(`Imported ${clean.length} tasks`);
  } catch { toast("Import failed: choose a valid tasks.json file"); }
  e.target.value = "";
});

// ---------- Theme ----------
function setTheme(t) { document.documentElement.dataset.theme = t; localStorage.setItem(TKEY, t); }
setTheme(localStorage.getItem(TKEY) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
$("theme").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");

// ---------- Focus timer (Pomodoro) ----------
const FOCUS = 25 * 60;
let left = FOCUS, timer = null, stats = read(PKEY, { date: today(), count: 0 });
if (stats.date !== today()) stats = { date: today(), count: 0 };
const paint = () => {
  $("clock").textContent = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  $("f-count").textContent = stats.count; $("f-start").textContent = timer ? "Pause" : "Start";
  document.title = timer ? `${$("clock").textContent} · Taskboard` : "Taskboard · Task Manager";
};
$("f-start").onclick = () => {
  if (timer) { clearInterval(timer); timer = null; }
  else timer = setInterval(() => {
    if (--left <= 0) {
      clearInterval(timer); timer = null; left = FOCUS; stats.count++;
      localStorage.setItem(PKEY, JSON.stringify(stats)); toast("Focus session complete. Take a 5 minute break.");
    }
    paint();
  }, 1000);
  paint();
};
$("f-reset").onclick = () => { clearInterval(timer); timer = null; left = FOCUS; paint(); };

// ---------- Keyboard shortcuts ----------
document.addEventListener("keydown", (e) => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
  if (e.key === "Escape" && editingId) $("cancel-btn").click();
  if (typing || e.ctrlKey || e.metaKey) return;
  if (e.key === "/") { e.preventDefault(); $("search").focus(); }
  if (e.key.toLowerCase() === "n") { e.preventDefault(); $("title").focus(); }
});

const h = new Date().getHours();
$("greeting").textContent = (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening") + ". Today's plan";
render(); paint();
