// Auth Logic
const AUTH_CONFIG = { username: "ismail", password: "1234" };
const isLoggedIn = sessionStorage.getItem("isLoggedIn", "false");
const isLoggedInMessage = sessionStorage.getItem("isLoggedInMessage", "true");

document
  .getElementById("username")
  ?.setAttribute("value", AUTH_CONFIG.username);
document
  .getElementById("password")
  ?.setAttribute("value", AUTH_CONFIG.password);

// Login
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");

  if (!loginBtn) return;

  loginBtn.addEventListener("click", () => {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      toast("من فضلك أدخل البيانات", true);
      return;
    }

    if (
      username === AUTH_CONFIG.username &&
      password === AUTH_CONFIG.password
    ) {
      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("isLoggedInMessage", "false");

      // بعد نجاح الدخول
      window.location.href = "index.html";
    } else {
      toast("اسم المستخدم أو كلمة المرور غير صحيحة", true);
    }
  });
});

// Logout
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  sessionStorage.removeItem("isLoggedIn");

  window.location.href = "login.html";
});

// حماية الصفحات
function requireAuth() {
  const isLoggedIn = sessionStorage.getItem("isLoggedIn");

  if (isLoggedIn !== "true") {
    window.location.href = "login.html";
  }
}
