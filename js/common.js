/*
 * common.js
 * Group-aware local data layer.
 *
 * Architecture:
 * UI -> repositories -> StorageAdapter -> LocalStorage
 *
 * Later, StorageAdapter/Repositories can be replaced with API calls
 * without changing the page/business logic.
 */

const APP_KEY = "workers-phase1";
const GROUPS_KEY = `${APP_KEY}-groups`;
const THEME_KEY = `${APP_KEY}-theme`;

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

// =========================================================
// Storage adapter
// =========================================================

const StorageAdapter = {
  get(key) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? null : JSON.parse(value);
    } catch {
      return null;
    }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(key);
  },
};

// =========================================================
// Groups repository
// =========================================================

const DEFAULT_GROUPS = [
  {
    id: "ismail",
    name: "مجموعة إسماعيل",
    password: "1234",
    description: "مجموعة العمال الأساسية",
    active: true,
  },
  {
    id: "hussein",
    name: "مجموعة حسين",
    password: "5678",
    description: "مجموعة عمال حسين",
    active: true,
  },
  {
    id: "ahmed",
    name: "مجموعة أحمد",
    password: "9012",
    description: "مجموعة عمال أحمد",
    active: true,
  },
];

const GroupRepository = {
  all() {
    return StorageAdapter.get(GROUPS_KEY) || [];
  },

  save(groups) {
    StorageAdapter.set(GROUPS_KEY, groups);
  },

  find(groupId) {
    return this.all().find((group) => group.id === groupId) || null;
  },

  create(data) {
    const groups = this.all();
    const groupId = (data.id || id()).trim().toLowerCase();

    if (groups.some((item) => String(item.id).toLowerCase() === groupId)) {
      throw new Error("معرف المجموعة مستخدم بالفعل، اختر معرفاً آخر");
    }

    const group = {
      id: groupId,
      name: data.name?.trim() || "مجموعة جديدة",
      password: String(data.password || "1234").trim(),
      description: data.description?.trim() || "",
      active: true,
      createdAt: Date.now(),
    };

    groups.push(group);
    this.save(groups);
    return group;
  },

  update(groupId, changes) {
    const groups = this.all();
    const index = groups.findIndex((group) => group.id === groupId);

    if (index === -1) return null;

    groups[index] = {
      ...groups[index],
      ...changes,
    };

    this.save(groups);
    return groups[index];
  },

  remove(groupId) {
    const groups = this.all().filter((group) => group.id !== groupId);
    this.save(groups);
    StateRepository.remove(groupId);
  },

  ensureDefaults() {
    const groups = this.all();

    if (groups.length) return groups;

    const seeded = DEFAULT_GROUPS.map((group) => ({
      ...group,
      createdAt: Date.now(),
    }));

    this.save(seeded);
    return seeded;
  },
};

// Seed groups only. NEVER selects an active group.
GroupRepository.ensureDefaults();

// =========================================================
// Authentication / group context
// =========================================================

function getAuthenticatedGroupId() {
  try {
    const auth = JSON.parse(sessionStorage.getItem("workers-auth") || "null");

    if (auth?.isLoggedIn && auth.groupId) {
      return auth.groupId;
    }
  } catch {}

  return null;
}

function getActiveGroupId() {
  // Before login there is deliberately NO active group.
  return getAuthenticatedGroupId();
}
function getActiveGroup() {
  const groupId = getActiveGroupId();

  if (!groupId) return null;

  return GroupRepository.find(groupId);
}

function setActiveGroup(groupId) {
  const group = GroupRepository.find(groupId);

  if (!group || group.active === false) {
    throw new Error("Group not found");
  }

  // Group switching is effectively a new authenticated context.
  sessionStorage.setItem(
    "workers-auth",
    JSON.stringify({
      isLoggedIn: true,
      groupId: group.id,
      loggedInAt: Date.now(),
    }),
  );

  window.location.reload();
}

const GROUP_ID = getActiveGroupId();
const ACTIVE_GROUP = getActiveGroup();

// =========================================================
// State repository
// =========================================================

const DEFAULT_WORKERS = [
  // ["أحمد محمد", 350, "نجار", "01065683544", "صنايعي كويس"],
  // ["محمد علي", 400, "مساعد", "01154843442", "مساعد مجتهد"],
  // ["حسن السيد", 350, "حداد", "01248418449", "صنايعي بضين"],
  // ["علي محمود", 300, "حداد", "01048794492", "صنايعي بيلعب طول اليوم"],
];

const StateRepository = {
  key(groupId = GROUP_ID) {
    return groupId ? `${APP_KEY}-state-${groupId}` : null;
  },

  get(groupId = GROUP_ID) {
    const key = this.key(groupId);
    return key ? StorageAdapter.get(key) : null;
  },

  save(state, groupId = GROUP_ID) {
    const key = this.key(groupId);
    if (!key) throw new Error("No authenticated group");

    StorageAdapter.set(key, {
      ...state,
      groupId,
      updatedAt: Date.now(),
    });
  },

  remove(groupId = GROUP_ID) {
    const key = this.key(groupId);
    if (key) StorageAdapter.remove(key);
  },
};

function createInitialState() {
  const workers = DEFAULT_WORKERS.map(
    ([name, rate, profession, phone, note]) => ({
      id: id(),
      name,
      rate,
      profession,
      phone,
      note,
      expense: 0,
      overtime: 0,
    }),
  );

  return normalize({
    groupId: GROUP_ID,
    theme: localStorage.getItem(THEME_KEY) || "light",
    workers,
    attendance: {},
    transactions: {},
  });
}

function loadState() {
  // Login page has no group context and must not create group data.
  if (!GROUP_ID) return null;
  const saved = StateRepository.get(GROUP_ID);
  if (saved) return normalize(saved);
  const state = createInitialState();
  StateRepository.save(state, GROUP_ID);
  return state;
}

function normalize(state) {
  const workers = (state.workers || []).map((w) => ({
    id: w.id || id(),
    name: w.name || "",
    rate: Number(w.rate) || 0,
    profession: w.profession || "",
    phone: w.phone || "",
    note: w.note || "",
    expense: Number(w.expense) || 0,
    overtime: Number(w.overtime) || 0,
  }));

  const attendance = state.attendance || {};
  const transactions = state.transactions || {};
  const settlements = state.settlements || [];
  const d = today();

  attendance[d] ||= {};
  transactions[d] ||= {};

  workers.forEach((w) => {
    if (typeof attendance[d][w.id] !== "boolean") {
      attendance[d][w.id] = null;
    }
  });

  return {
    groupId: GROUP_ID,
    theme: state.theme || "light",
    workers,
    attendance,
    transactions,
    settlements,
    attendanceDate: state.attendanceDate || d,
  };
}

const S = loadState();

function settleWorkerAccount(workerId, amount, note = "") {
  if (!S || !workerId) return null;
  S.settlements ||= [];
  const entry = {
    id: id(),
    workerId: String(workerId),
    amount: Number(amount) || 0,
    settledAt: Date.now(),
    date: today(),
    note: note || "تصفية وتصفية حساب"
  };
  S.settlements.unshift(entry);
  save();
  return entry;
}

function save() {
  if (!GROUP_ID || !S) return;

  StateRepository.save(S, GROUP_ID);
  localStorage.setItem(THEME_KEY, S.theme);
}

// =========================================================
// Attendance
// =========================================================

function attendanceValue(workerId, date = today()) {
  if (!S) return null;

  S.attendance[date] ||= {};

  return typeof S.attendance[date][workerId] === "boolean"
    ? S.attendance[date][workerId]
    : null;
}

function setAttendance(workerId, value, date = today()) {
  if (!S) return;

  S.attendance[date] ||= {};
  S.attendance[date][workerId] = value;
  save();
}

function nextAttendance(value) {
  return value === null ? true : value === true ? false : true;
}

// =========================================================
// Group UI helpers
// =========================================================

function renderGroupInfo(root = document) {
  const groupName = $("[data-group-name]", root);
  const groupId = $("[data-group-id]", root);

  if (groupName) groupName.textContent = ACTIVE_GROUP?.name || "";
  if (groupId) groupId.textContent = ACTIVE_GROUP?.id || "";
}

function renderGroupSelect(root = document) {
  const select = $("[data-group-select]", root);
  if (!select || !ACTIVE_GROUP) return;

  select.innerHTML = GroupRepository.all()
    .filter((group) => group.active !== false)
    .map(
      (group) =>
        `<option value="${group.id}" ${group.id === GROUP_ID ? "selected" : ""}>${group.name}</option>`,
    )
    .join("");

  select.onchange = () => setActiveGroup(select.value);
}

// =========================================================
// Modals / UI
// =========================================================

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

function toast(message, bad = false, bgColor = null, color = null) {
  const el = document.createElement("div");
  el.className = "toast";
  if (bgColor) el.style.backgroundColor = bgColor;
  if (color) el.style.color = color;
  el.textContent = `${bad == null ? "" : bad ? "×" : "✓"} ${message}`;
  $("#toast")?.append(el);
  setTimeout(() => el.remove(), 2200);
}

function pageLinks() {
  $$("[data-page]").forEach((x) =>
    x.addEventListener("click", () => (location.href = x.dataset.page)),
  );
}

function setupTheme() {
  const isDark = S?.theme
    ? S.theme === "dark"
    : localStorage.getItem(THEME_KEY) === "dark";

  if (document.body) {
    document.body.classList.toggle("dark", isDark);
  }
  document.documentElement.classList.toggle("dark", isDark);

  const themeButton = $("#theme");
  if (!themeButton) return;

  // يمنع تسجيل أكثر من Listener
  if (themeButton.dataset.themeBound === "true") {
    return;
  }

  themeButton.dataset.themeBound = "true";

  function updateThemeUI() {
    const isDark = S?.theme
      ? S.theme === "dark"
      : localStorage.getItem(THEME_KEY) === "dark";

    if ($("#textMode")) {
      $("#textMode").textContent = isDark ? "الوضع النهاري" : "الوضع الليلي";
    }

    if ($("#themeText")) {
      $("#themeText").textContent = isDark ? "مفتوح" : "مغلق";
    }

    if (document.body) {
      document.body.classList.toggle("dark", isDark);
    }
    document.documentElement.classList.toggle("dark", isDark);
  }

  updateThemeUI();

  themeButton.addEventListener("click", () => {
    if (S) {
      S.theme = S.theme === "dark" ? "light" : "dark";
      save();
    } else {
      const current = localStorage.getItem(THEME_KEY);
      localStorage.setItem(THEME_KEY, current === "dark" ? "light" : "dark");
    }
    updateThemeUI();
  });
}

// Apply theme immediately on script execution
try {
  setupTheme();
} catch {}

// Register Service Worker with Auto-Update Check & Reload
if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        reg.update();
      })
      .catch(() => {});
  });
}

// Global deferred prompt capture for PWA installation
let deferredPwaPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
  const installButton = document.getElementById("install");
  if (installButton) {
    installButton.hidden = false;
  }
});

function setupInstall() {
  const installButton = $("#install");
  if (!installButton) return;

  // Show button if install prompt is already captured
  if (deferredPwaPrompt) {
    installButton.hidden = false;
  }

  // Prevent binding multiple click listeners
  if (installButton.dataset.installBound === "true") {
    return;
  }
  installButton.dataset.installBound = "true";

  installButton.addEventListener("click", async () => {
    if (!deferredPwaPrompt) {
      toast("التثبيت غير متاح حاليًا أو التطبيق مثبت بالفعل", true);
      return;
    }
    deferredPwaPrompt.prompt();
    const { outcome } = await deferredPwaPrompt.userChoice;
    if (outcome === "accepted") {
      toast("تمت إضافة التطبيق لشاشتك بنجاح", false, "#92ff8f", "#000");
    }
    deferredPwaPrompt = null;
    installButton.hidden = true;
  });
}

function setupCommon() {
  setupTheme();
  setupInstall();
  pageLinks();
  renderGroupInfo();
  renderGroupSelect();
}

function renderNav(active) {
  const nav = $("#nav");
  if (!nav) return;

  nav.innerHTML = `
    <a data-page="index.html" class="nav-item"><span>🏠</span><small>الرئيسية</small></a>
    <a data-page="attendance.html" class="nav-item"><span>📋</span><small>الحضور</small></a>
    <a data-page="workers.html" class="nav-item"><span>👷</span><small>العمال</small></a>
  `;

  $$("[data-page]").forEach((x) =>
    x.classList.toggle("active", x.dataset.page === `${active}.html`),
  );
}

// common.js is used by every page. Authentication is handled in auth.js.
document.addEventListener("DOMContentLoaded", () => {
  if (
    typeof requireAuth === "function" &&
    !location.pathname.includes("login.html")
  ) {
    if (!requireAuth()) return;
  }

  if (!GROUP_ID && !location.pathname.includes("login.html")) return;

  setupCommon();

  const layoutPage = document.getElementById("layout-page");
  if (layoutPage) {
    setTimeout(() => layoutPage.classList.add("hidden"), 250);
  }

  let welcomeMessageInner = document.getElementById("welcomeMessageInner");
  if (welcomeMessageInner) {
    let nameActiveGroup = getActiveGroup().name.replace(/مجموعة /, "");
    welcomeMessageInner.innerHTML = `صباح الخير، ${nameActiveGroup} 👋`;
  }
});

const headerTag = document.getElementById("header");
if (headerTag) {
  fetch("./includes/header.html")
    .then((result) => result.text())
    .then((code) => {
      headerTag.innerHTML = code;
      renderGroupInfo(headerTag);
      renderGroupSelect(headerTag);

      document.getElementById("logoutBtn")?.addEventListener("click", () => {
        logout();
      });
    });
}

const footerTag = document.getElementById("footer");
if (footerTag) {
  fetch("./includes/footer.html")
    .then((result) => result.text())
    .then((code) => (footerTag.innerHTML = code));
}
