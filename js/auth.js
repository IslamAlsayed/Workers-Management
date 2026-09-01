/*
 * auth.js
 * Group-based authentication & registration module.
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
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.setItem(LOGIN_MESSAGE_KEY, "true");
  sessionStorage.setItem("isLoggedIn", "false");
  sessionStorage.setItem("isLoggedInMessage", "true");
  window.location.href = "login.html";
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = "login.html";
    return false;
  }

  return true;
}

// =========================================================
// Login & Registration Page Logic
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");

  if (!loginBtn && !registerBtn) return;

  // If already logged in, redirect to dashboard
  if (isAuthenticated()) {
    window.location.href = "index.html";
    return;
  }

  // Element references
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const tabFeatures = document.getElementById("tabFeatures");
  const loginFormContainer = document.getElementById("loginFormContainer");
  const registerFormContainer = document.getElementById(
    "registerFormContainer",
  );
  const authSubtitle = document.getElementById("authSubtitle");

  const username = document.getElementById("username");
  const password = document.getElementById("password");

  const regGroupName = document.getElementById("regGroupName");
  const regGroupId = document.getElementById("regGroupId");
  const regPassword = document.getElementById("regPassword");
  const regDescription = document.getElementById("regDescription");
  const regCurrency = document.getElementById("regCurrency");

  // Tab switching
  if (tabLogin && tabRegister && tabFeatures) {
    tabLogin.addEventListener("click", () => {
      tabLogin.classList.add("active");
      tabRegister.classList.remove("active");
      tabFeatures.classList.remove("active");
      loginFormContainer.style.display = "flex";
      registerFormContainer.style.display = "none";
      if (authSubtitle)
        authSubtitle.textContent = "سجل الدخول لإدارة مجموعة العمال";
      username?.focus();
    });

    tabRegister.addEventListener("click", () => {
      tabRegister.classList.add("active");
      tabLogin.classList.remove("active");
      tabFeatures.classList.remove("active");
      registerFormContainer.style.display = "flex";
      loginFormContainer.style.display = "none";
      if (authSubtitle)
        authSubtitle.textContent = "أنشئ مجموعة جديدة لإدارة عمالك";
      regGroupName?.focus();
    });
    tabFeatures.addEventListener("click", () => {
      window.location.href = "./about.html";
    });
  }

  // Auto-suggest group ID from group name
  let isManualGroupId = false;
  if (regGroupId) {
    regGroupId.addEventListener("input", () => {
      isManualGroupId = regGroupId.value.trim().length > 0;
    });
  }

  if (regGroupName && regGroupId) {
    regGroupName.addEventListener("input", () => {
      if (isManualGroupId) return;
      const cleanName = regGroupName.value
        .trim()
        .toLowerCase()
        .replace(/مجموعة/g, "")
        .replace(/ورشة/g, "")
        .replace(/شركة/g, "")
        .trim();

      if (!cleanName) {
        regGroupId.value = "";
        return;
      }

      // Convert Arabic / spaces to latin letters / dashes
      const suggestedId = cleanName
        .replace(/\s+/g, "-")
        .replace(/[^\w\u0621-\u064A-]+/g, "")
        .slice(0, 20);

      regGroupId.value =
        suggestedId || `group-${Date.now().toString().slice(-4)}`;
    });
  }

  // Handle Login
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const groupId = username?.value.trim();
      const groupPassword = password?.value.trim();

      if (!groupId || !groupPassword) {
        toast("من فضلك أدخل اسم المستخدم وكلمة المرور", true);
        return;
      }

      const result = login(groupId, groupPassword);
      if (!result.ok) {
        toast(result.message, true, "#ff8e8e");
        return;
      }

      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("isLoggedInMessage", "false");

      loginBtn.disabled = true;
      loginBtn.textContent = "جاري الدخول...";

      window.location.href = "index.html";
    });

    [username, password].forEach((input) => {
      input?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") loginBtn.click();
      });
    });
  }

  // Handle Register New Group
  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      const groupName = regGroupName?.value.trim();
      let groupId = regGroupId?.value.trim().toLowerCase();
      const groupPassword = regPassword?.value.trim();
      const description = regDescription?.value.trim();
      const currency = regCurrency?.value.trim();

      if (!groupName) {
        toast("من فضلك أدخل اسم المجموعة", true);
        regGroupName?.focus();
        return;
      }

      if (!groupId) {
        groupId = `group-${Date.now().toString().slice(-4)}`;
      }

      if (!groupPassword || groupPassword.length < 4) {
        toast("كلمة المرور يجب أن تكون 4 أرقام أو حروف على الأقل", true);
        regPassword?.focus();
        return;
      }

      try {
        // Create new group
        const newGroup = GroupRepository.create({
          id: groupId,
          username: groupId,
          name: groupName,
          password: groupPassword,
          description: description,
          currency: currency,
        });

        // Initialize state for the new group
        const initialState = {
          groupId: newGroup.id,
          theme: localStorage.getItem(APP_KEY + "-theme") || "light",
          workers: [],
          attendance: {},
          transactions: {},
          currency: currency,
          attendanceDate: new Date().toISOString().slice(0, 10),
        };
        StateRepository.save(initialState, newGroup.id);

        // Login automatically
        const loginResult = login(newGroup.id, groupPassword);
        if (!loginResult.ok) {
          toast(loginResult.message, true);
          return;
        }

        registerBtn.disabled = true;
        registerBtn.textContent = "جاري الإنشاء...";

        toast("تم إنشاء المجموعة وتسجيل الدخول بنجاح! 🎉", false, "#92ff8f");

        setTimeout(() => {
          window.location.href = "index.html";
        }, 600);
      } catch (err) {
        toast(err.message || "حدث خطأ أثناء إنشاء المجموعة", true, "#ff8e8e");
      }
    });

    [
      regGroupName,
      regGroupId,
      regPassword,
      regDescription,
      regCurrency,
    ].forEach((input) => {
      input?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") registerBtn.click();
      });
    });
  }
});

// =========================================================
// Credentials update (Settings page)
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

    toast("تم تغيير البيانات بنجاح", false, "#92ff8f");
    password.value = newPassword;
  });
}

document.addEventListener("DOMContentLoaded", setupCredentialsForm);
