const STORAGE_KEY = "workers-phase1-state";
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

function today() {
  return new Date().toISOString().slice(0, 10);
}
function id() {
  return crypto.randomUUID?.() || `id-${Date.now()}-${Math.random()}`;
}
function money(n) {
  if (Number(n || 0) < 0) {
    return `<span style="color:red">${Number(n || 0).toLocaleString("ar-EG")} ج</span>`;
  }
  return Number(n || 0).toLocaleString("ar-EG") + " ج";
}

const DEFAULT_WORKERS = [
  ["أحمد محمد", 350, "نجار", "صنايعي كويس"],
  ["محمد علي", 400, "مساعد", "مساعد مجتهد"],
  ["حسن السيد", 350, "حداد", "صنايعي بضين"],
  ["علي محمود", 300, "حداد", "صنايعي بيلعب طول اليوم"],
];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return normalize(saved);
  } catch {}
  const workers = DEFAULT_WORKERS.map(([name, rate, profession, note]) => ({
    id: id(),
    name,
    rate,
    profession,
    note,
    expense: 0,
    overtime: 0,
  }));
  return normalize({
    theme: localStorage.getItem("theme") || "light",
    workers,
    attendance: {},
  });
}

function normalize(state) {
  const workers = (state.workers || []).map((w) => ({
    id: w.id || id(),
    name: w.name || "",
    rate: Number(w.rate) || 0,
    profession: w.profession || "",
    note: w.note || "",
    expense: Number(w.expense) || 0,
    overtime: Number(w.overtime) || 0,
  }));
  const attendance = state.attendance || {};
  const d = today();
  attendance[d] ||= {};
  workers.forEach((w) => {
    if (typeof attendance[d][w.id] !== "boolean") attendance[d][w.id] = null;
  });
  return {
    theme: state.theme || "light",
    workers,
    attendance,
    attendanceDate: state.attendanceDate || d,
  };
}

const S = loadState();
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
  localStorage.setItem("theme", S.theme);
}
function attendanceValue(workerId, date = today()) {
  S.attendance[date] ||= {};
  return typeof S.attendance[date][workerId] === "boolean"
    ? S.attendance[date][workerId]
    : null;
}
function setAttendance(workerId, value, date = today()) {
  S.attendance[date] ||= {};
  S.attendance[date][workerId] = value;
  save();
}
function nextAttendance(value) {
  return value === null ? true : value === true ? false : true;
}

function openModal(id) {
  $(`#${id}`)?.classList.add("active");
  document.body.style.overflow = "hidden";
}
function closeModal(id) {
  $(`#${id}`)?.classList.remove("active");
  document.body.style.overflow = "";
}
function bindModal(id) {
  const modal = $(`#${id}`);
  if (!modal) return;
  $(".close", modal)?.addEventListener("click", () => closeModal(id));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(id);
  });
}
function toast(message, bad = false, color = null) {
  const el = document.createElement("div");
  el.className = "toast";
  el.style.backgroundColor = color;
  el.textContent = `${bad ? "×" : "✓"} ${message}`;
  $("#toast")?.append(el);
  setTimeout(() => el.remove(), 2200);
}
function pageLinks() {
  $$("[data-page]").forEach((x) =>
    x.addEventListener("click", () => (location.href = x.dataset.page)),
  );
}
function setupTheme() {
  // switch text mode between الوضع النهاري and الوضع الليلي

  if ($("#textMode")) {
    $("#textMode").textContent =
      S.theme === "dark" ? "الوضع النهاري" : "الوضع الليلي";
  }
  document.body.classList.toggle("dark", S.theme === "dark");
  $("#theme")?.addEventListener("click", () => {
    S.theme = S.theme === "dark" ? "light" : "dark";
    save();
    location.reload();
  });
  if ($("#themeText"))
    $("#themeText").textContent = S.theme === "dark" ? "مفتوح" : "مغلق";
}
function setupInstall() {
  let prompt;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    prompt = e;
    const b = $("#install");
    if (b) b.hidden = false;
  });
  $("#install")?.addEventListener("click", async () => {
    if (!prompt) return toast("التثبيت غير متاح حاليًا", true);
    prompt.prompt();
    await prompt.userChoice;
    prompt = null;
    $("#install").hidden = true;
  });
}
function setupCommon() {
  setupTheme();
  setupInstall();
  pageLinks();
  // if ("serviceWorker" in navigator)
  //   navigator.serviceWorker.register("./sw.js").catch(() => {});
}
function renderNav(active) {
  const nav = $("#nav");
  if (!nav) return;
  nav.innerHTML = `
    <a data-page="dashboard.html" class="nav-item"><span>🏠</span><small>الرئيسية</small></a>
    <a data-page="attendance.html" class="nav-item"><span>📋</span><small>الحضور</small></a>
  `;
  $("[data-page]").forEach((x) =>
    x.classList.toggle("active", x.dataset.page === active),
  );
}

document.addEventListener("DOMContentLoaded", () => {
  if (!location.pathname.includes("login.html")) {
    requireAuth();
  }
});
