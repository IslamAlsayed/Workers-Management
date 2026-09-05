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

// const APP_KEY = "ommal";
// const GROUPS_KEY = `${APP_KEY}-groups`;
// const THEME_KEY = `${APP_KEY}-theme`;
// const SEEN_VERSION_KEY = `${APP_KEY}-seen-version`;

const APP_KEY = "ommal";

const OLD_APP_KEY = "workers-phase1";

const GROUPS_KEY = `${APP_KEY}-groups`;
const THEME_KEY = `${APP_KEY}-theme`;
const SEEN_VERSION_KEY = `${APP_KEY}-seen-version`;

function migrateStorage() {
  const oldGroupsKey = `${OLD_APP_KEY}-groups`;
  const oldThemeKey = `${OLD_APP_KEY}-theme`;
  const newGroupsKey = `${APP_KEY}-groups`;
  const newThemeKey = `${APP_KEY}-theme`;

  // نقل بيانات المجموعات القديمة
  if (
    !localStorage.getItem(newGroupsKey) &&
    localStorage.getItem(oldGroupsKey)
  ) {
    localStorage.setItem(newGroupsKey, localStorage.getItem(oldGroupsKey));
  }

  // نقل الـ Theme
  if (!localStorage.getItem(newThemeKey) && localStorage.getItem(oldThemeKey)) {
    localStorage.setItem(newThemeKey, localStorage.getItem(oldThemeKey));
  }
}

migrateStorage();

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const appVersion = document.getElementById("appVersion");
if (appVersion) {
  appVersion.textContent = `v${APP_VERSION}`;
}

function isNewVersion() {
  const seenVersion = localStorage.getItem(SEEN_VERSION_KEY);
  return seenVersion !== APP_VERSION;
}

function markVersionAsSeen() {
  localStorage.setItem(SEEN_VERSION_KEY, APP_VERSION);
}

function showUpdateNotification() {
  if (!isNewVersion() || !isAuthenticated()) return;
  markVersionAsSeen();

  setTimeout(() => {
    toast(
      `🚀 تم تحديث التطبيق إلى الإصدار ${APP_VERSION} — يمكنك معرفة تفاصيل التحديثات من الإعدادات ← التحديثات.`,
      null,
      "#0b7d03",
      9000,
      "عرض التحديثات",
      "./updates.html",
    );
  }, 800);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function id() {
  return crypto.randomUUID?.() || `id-${Date.now()}-${Math.random()}`;
}

function money(value) {
  const amount = Number(value) || 0;
  const currency = S?.currency || "EGP";
  const locale = currency === "SAR" ? "ar-SA" : "ar-EG";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ===============
// Storage adapter
// ===============

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

// ===============
// Groups repository
// ===============

const DEFAULT_GROUPS = [
  {
    id: "islam",
    name: "مجموعة إسلام",
    password: "7574",
    description: "مجموعة العمال الأساسية",
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

    groups[index] = { ...groups[index], ...changes };

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

// ===============
// Authentication / group context
// ===============

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
  // const group = GroupRepository.all().find((g) => (g.username || g.id) === enteredUsername);

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

// ===============
// State repository
// ===============

const DEFAULT_WORKERS = [
  ["أحمد محمد", 350, "نجار", "01065683544", "صنايعي كويس"],
  ["محمد علي", 400, "مساعد", "01154843442", "مساعد مجتهد"],
  ["حسن السيد", 350, "حداد", "01248418449", "صنايعي بضين"],
  ["علي محمود", 300, "حداد", "01048794492", "صنايعي بيلعب طول اليوم"],
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
    currency: "EGP",
    attendance: {},
    transactions: {},
    workers: GROUP_ID == "islam" ? workers : [],
  });
}

function createEmptyState() {
  return normalize({
    groupId: GROUP_ID,
    theme: S?.theme || "light",
    currency: "EGP",
    workers: [],
    attendance: {},
    transactions: {},
    settlements: {},
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

  function normalizeTransactions(transactions = {}) {
    const normalized = {};

    Object.entries(transactions || {}).forEach(([date, dayTransactions]) => {
      normalized[date] ||= {};

      Object.entries(dayTransactions || {}).forEach(([workerId, value]) => {
        if (!value) return;

        // الشكل الجديد: Array of transactions
        if (Array.isArray(value)) {
          normalized[date][workerId] = value
            .filter((tx) => tx && Number(tx.amount) > 0)
            .map((tx) => ({
              id: tx.id || id(),
              type: tx.type === "overtime" ? "overtime" : "expense",
              amount: Number(tx.amount) || 0,
              note: tx.note || "",
              createdAt: tx.createdAt || Date.now(),
              updatedAt: tx.updatedAt || tx.createdAt || Date.now(),
            }));

          return;
        }

        // Migration للشكل القديم:
        // {
        //   expense: 100,
        //   overtime: 50
        // }
        const migrated = [];

        if (Number(value.expense) > 0) {
          migrated.push({
            id: id(),
            type: "expense",
            amount: Number(value.expense),
            note: "عملية قديمة",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            legacy: true,
          });
        }

        if (Number(value.overtime) > 0) {
          migrated.push({
            id: id(),
            type: "overtime",
            amount: Number(value.overtime),
            note: "عملية قديمة",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            legacy: true,
          });
        }

        normalized[date][workerId] = migrated;
      });
    });

    return normalized;
  }

  const transactions = normalizeTransactions(state.transactions || {});

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
    currency: state.currency === "SAR" ? "SAR" : "EGP",
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
    note: note || "تصفية وتصفية حساب",
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

// ===============
// Transactions
// ===============

// ===============
// Transactions
// ===============

function getWorkerTransactions(workerId, options = {}) {
  if (!S) return [];

  const { type = null, from = null, to = null } = options;

  const result = [];

  Object.entries(S.transactions || {}).forEach(([date, workers]) => {
    if (from && date < from) return;
    if (to && date > to) return;

    const transactions = workers?.[workerId];

    if (!Array.isArray(transactions)) return;

    transactions.forEach((tx) => {
      if (!tx || Number(tx.amount) <= 0) return;
      if (type && tx.type !== type) return;

      result.push({
        ...tx,
        date,
      });
    });
  });

  return result.sort((a, b) => {
    const dateCompare = String(b.date).localeCompare(String(a.date));

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return Number(b.createdAt || 0) - Number(a.createdAt || 0);
  });
}

function addTransaction(workerId, type, amount, note = "", date = today()) {
  if (!S || !workerId) return null;

  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  if (!["expense", "overtime"].includes(type)) {
    return null;
  }

  S.transactions ||= {};
  S.transactions[date] ||= {};
  S.transactions[date][workerId] ||= [];

  // حماية لو البيانات القديمة لسه موجودة
  if (!Array.isArray(S.transactions[date][workerId])) {
    S.transactions[date][workerId] =
      normalizeTransactions({
        [date]: {
          [workerId]: S.transactions[date][workerId],
        },
      })?.[date]?.[workerId] || [];
  }

  const transaction = {
    id: id(),
    type,
    amount: value,
    note: String(note || "").trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  S.transactions[date][workerId].push(transaction);

  save();

  return transaction;
}

function findTransaction(workerId, transactionId) {
  const transactions = getWorkerTransactions(workerId);

  return (
    transactions.find((tx) => String(tx.id) === String(transactionId)) || null
  );
}

function updateTransaction(workerId, transactionId, changes = {}) {
  if (!S) return null;

  let found = null;

  Object.entries(S.transactions || {}).forEach(([date, workers]) => {
    const transactions = workers?.[workerId];

    if (!Array.isArray(transactions)) return;

    const index = transactions.findIndex(
      (tx) => String(tx.id) === String(transactionId),
    );

    if (index === -1) return;

    const current = transactions[index];

    const amount =
      changes.amount !== undefined
        ? Number(changes.amount)
        : Number(current.amount);

    const type = changes.type || current.type;

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !["expense", "overtime"].includes(type)
    ) {
      return;
    }

    transactions[index] = {
      ...current,
      type,
      amount,
      note:
        changes.note !== undefined
          ? String(changes.note || "").trim()
          : current.note || "",
      updatedAt: Date.now(),
    };

    found = transactions[index];
  });

  if (found) {
    save();
  }

  return found;
}

function deleteTransaction(workerId, transactionId) {
  if (!S) return null;

  let deleted = null;

  Object.entries(S.transactions || {}).forEach(([date, workers]) => {
    const transactions = workers?.[workerId];

    if (!Array.isArray(transactions)) return;

    const index = transactions.findIndex(
      (tx) => String(tx.id) === String(transactionId),
    );

    if (index === -1) return;

    deleted = transactions[index];

    transactions.splice(index, 1);

    if (transactions.length === 0) {
      delete workers[workerId];
    }

    if (Object.keys(workers).length === 0) {
      delete S.transactions[date];
    }
  });

  if (deleted) {
    save();
  }

  return deleted;
}

// ===============
// Attendance
// ===============

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

// ===============
// Group UI helpers
// ===============

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

// ===============
// Modals / UI
// ===============

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

function toast(
  message,
  bad = false,
  bgColor = null,
  time = 2200,
  actionText = null,
  actionUrl = null,
) {
  const el = document.createElement("div");
  el.className = "toast";

  if (bgColor) el.style.backgroundColor = bgColor;

  // محتوى الرسالة
  el.innerHTML = `
    <div class="toast-content" style="text-align: center;">
      ${bad == null ? "" : bad ? "×" : "✓"} ${message}
      ${actionText && actionUrl ? `<a href="${actionUrl}" target="_blank" class="toast-action">${actionText}</a>` : ""}
    </div>
    <div class="toast-progress">
      <span></span>
    </div>
  `;

  $("#toast")?.append(el);

  const progress = el.querySelector(".toast-progress span");
  if (progress) progress.style.animationDuration = `${time}ms`;

  setTimeout(() => el.remove(), time || 2200);
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
// try {
//   setupTheme();
// } catch {}

// ===============
// Service Worker
// Auto Update + Automatic Reload
// ===============

if ("serviceWorker" in navigator) {
  let refreshing = false;

  // عندما يصبح Service Worker الجديد هو المتحكم في الصفحة
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;

    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js", {
        updateViaCache: "none",
      });

      // فحص وجود نسخة جديدة
      await registration.update();
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
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
      toast("تمت إضافة التطبيق لشاشتك بنجاح", false, UPDATE_NOTIFICATION_COLOR);
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
  showUpdateNotification();
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

  const welcomeMessageInner = document.getElementById("welcomeMessageInner");

  if (welcomeMessageInner) {
    const activeGroup = getActiveGroup();

    if (activeGroup) {
      const nameActiveGroup = activeGroup.name.replace(/مجموعة /, "");
      const hour = new Date().getHours();
      const greeting = hour >= 1 && hour < 12 ? "صباح الخير" : "مساء الخير";
      welcomeMessageInner.innerHTML = escapeHtml(
        `${greeting}، ${nameActiveGroup} 👋`,
      );
    }
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

if (location.pathname.includes("login.html")) {
  const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  localStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
}
