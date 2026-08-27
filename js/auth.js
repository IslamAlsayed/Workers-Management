/*
 * auth.js
 * Group-based authentication (prototype/local only).
 *
 * Each group has its own login credentials.
 * Successful login stores only the authenticated group id in sessionStorage.
 * No group is active before login.
 */

const AUTH_KEY = "workers-auth";
const LOGIN_MESSAGE_KEY = "workers-login-message";
const isLoggedIn = sessionStorage.getItem("isLoggedIn", "false");
const isLoggedInMessage = sessionStorage.getItem("isLoggedInMessage", "true");

function getAuth() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

function isAuthenticated() {
  const auth = getAuth();
  return auth?.isLoggedIn === true && !!auth.groupId;
}

function getLoggedInGroupId() {
  return getAuth()?.groupId || null;
}

function login(groupId, password) {
  const group = GroupRepository.find(groupId);

  if (!group || group.active === false) {
    return { ok: false, message: "بيانات الدخول غير صحيحة" };
  }

  if (String(password) !== String(group.password)) {
    return { ok: false, message: "بيانات الدخول غير صحيحة" };
  }

  sessionStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      isLoggedIn: true,
      groupId: group.id,
      loggedInAt: Date.now(),
    }),
  );

  sessionStorage.setItem(LOGIN_MESSAGE_KEY, "false");

  return { ok: true, group };
}

function logout() {
  // localStorage.clear();
  // sessionStorage.clear();
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.setItem(LOGIN_MESSAGE_KEY, "true");

  sessionStorage.getItem("isLoggedIn");
  sessionStorage.getItem("isLoggedInMessage");
  window.location.href = "login.html";
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = "login.html";
    return false;
  }

  return true;
}

function getLoginMessage() {
  return sessionStorage.getItem(LOGIN_MESSAGE_KEY) !== "false";
}

// =========================================================
// Login page
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");

  if (!loginBtn) return;

  // If already logged in, don't show the login page again.
  if (isAuthenticated()) {
    window.location.href = "index.html";
    return;
  }

  const username = document.getElementById("username");
  const password = document.getElementById("password");

  loginBtn.addEventListener("click", () => {
    const groupId = username?.value.trim();
    const groupPassword = password?.value.trim();

    if (!groupId || !groupPassword) {
      toast("من فضلك أدخل اسم المجموعة وكلمة المرور", true);
      return;
    }

    const result = login(groupId, groupPassword);
    if (!result.ok) {
      toast(result.message, true, "#ff8e8e", "#000");
      return;
    }

    sessionStorage.setItem("isLoggedIn", "true");
    sessionStorage.setItem("isLoggedInMessage", "false");

    loginBtn.disabled = true;
    loginBtn.textContent = "جاري الدخول...";

    window.location.href = "index.html";
  });

  // Enter = Login
  [username, password].forEach((input) => {
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loginBtn.click();
    });
  });
});

// =========================================================
// Credentials update
// =========================================================

function setupCredentialsForm() {
  const form = document.getElementById("adminForm");
  if (!form || !isAuthenticated()) return;

  const group = GroupRepository.find(getLoggedInGroupId());
  if (!group) return;

  const username = document.getElementById("username");
  const password = document.getElementById("password");
  if (username) username.value = group.id;
  if (password) password.value = group.password;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const newPassword = password?.value.trim();

    if (!newPassword) {
      toast("كلمة المرور غير صحيحة", true);
      return;
    }

    if (newPassword.length < 4) {
      toast("كلمة المرور يجب أن تكون 4 أرقام أو أكثر", true);
      return;
    }

    GroupRepository.update(group.id, {
      password: newPassword,
    });

    toast("تم تغيير كلمة المرور بنجاح", false, "#92ff8f", "#000");
    password.value = "";
  });
}

document.addEventListener("DOMContentLoaded", setupCredentialsForm);
