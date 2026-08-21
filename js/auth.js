// Auth Logic
let AUTH_CONFIG = {
  username: "ismail",
  password: "1234",
  welcomeMessage: "صباح الخير يا إسماعيل 👋",
  adminDescription: "خلّي حسابات الشغل ماشية من غير ورق.",
};
const isLoggedIn = sessionStorage.getItem("isLoggedIn", "false");
const isLoggedInMessage = sessionStorage.getItem("isLoggedInMessage", "true");

// save login data in localstorage
const userData = JSON.parse(localStorage.getItem("auth_config")) || [];
if (!localStorage.getItem("auth_config")) {
  localStorage.setItem("auth_config", JSON.stringify(AUTH_CONFIG));
}

const adminName = document.getElementById("adminName");
const adminPassword = document.getElementById("adminPassword");
const welcomeMessage = document.getElementById("welcomeMessage");
const welcomeMessageInner = document.getElementById("welcomeMessageInner");
const adminDesc = document.getElementById("adminDescription");
const adminDescInner = document.getElementById("adminDescriptionInner");

if (adminName)
  adminName.setAttribute("value", userData.username || AUTH_CONFIG.username);
if (adminPassword)
  adminPassword.setAttribute(
    "value",
    userData.password || AUTH_CONFIG.password,
  );
if (welcomeMessage)
  welcomeMessage.setAttribute(
    "value",
    userData.welcomeMessage || AUTH_CONFIG.welcomeMessage || "",
  );
if (welcomeMessageInner)
  welcomeMessageInner.innerText =
    userData.welcomeMessage || AUTH_CONFIG.welcomeMessage || "";
if (adminDesc)
  adminDesc.value =
    userData.adminDescription || AUTH_CONFIG.adminDescription || "";
if (adminDescInner)
  adminDescInner.innerText =
    userData.adminDescription || AUTH_CONFIG.adminDescription || "";

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

    if (username === userData.username && password === userData.password) {
      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("isLoggedInMessage", "false");

      // بعد نجاح الدخول
      window.location.href = "index.html";
    } else {
      toast("اسم المستخدم أو كلمة المرور غير صحيحة", true, "#ff8e8e", "#000");
    }
  });
});

// Logout in common.js file

// Change user data
const adminForm = document.getElementById("adminForm");
if (adminForm) {
  adminForm.onsubmit = (e) => {
    e.preventDefault();
    const adminNameValue = document.getElementById("adminName").value;
    const adminPasswordValue = document.getElementById("adminPassword").value;
    const welcomeMessageValue = document.getElementById("welcomeMessage").value;
    const adminDescriptionValue =
      document.getElementById("adminDescription").value;
    if (!adminNameValue) return toast("اسم المستخدم غير صحيح", true);
    if (!adminPasswordValue) return toast("كلمة المرور غير صحيحة", true);
    if (adminPasswordValue < 4)
      return toast("كلمة المرور يجب ان تكون اكبر من 4 ارقام", true);

    AUTH_CONFIG = {
      username: adminNameValue,
      password: adminPasswordValue,
      welcomeMessage: welcomeMessageValue,
      adminDescription: adminDescriptionValue,
    };

    // save login data in localstorage
    localStorage.setItem("auth_config", JSON.stringify(AUTH_CONFIG));
    return toast("تم تغيير بيانات المستخدم بنجاح", false, "#92ff8f", "#000");
  };
}

// حماية الصفحات
function requireAuth() {
  const isLoggedIn = sessionStorage.getItem("isLoggedIn");
  if (isLoggedIn !== "true") {
    window.location.href = "login.html";
  }
}
