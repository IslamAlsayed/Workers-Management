if (isAuthenticated() && isLoggedIn && isLoggedInMessage === "false") {
  toast("تم تسجيل الدخول بنجاح", false, "#92ff8f", "#000");
  sessionStorage.removeItem("isLoggedInMessage");
}

setupCommon();
renderNav("dashboard");
const date = today();
const present = S.workers.filter(
  (w) => attendanceValue(w.id, date) === true,
).length;
const absent = S.workers.filter(
  (w) => attendanceValue(w.id, date) === false,
).length;
const wages = S.workers
  .filter((w) => attendanceValue(w.id, date) === true)
  .reduce((s, w) => s + w.rate, 0);
$("#today").textContent = new Intl.DateTimeFormat("ar-EG", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());
$("#workersCount").textContent = S.workers.length;
$("#presentCount").textContent = present;
$("#absentCount").textContent = absent;
$("#wagesCount").textContent = money(wages);
$("#dailyTotal").textContent = money(wages);
$("#expenseTotal").textContent = money(
  S.workers.reduce((s, w) => s + w.expense, 0),
);
$("#overtimeTotal").textContent = money(
  S.workers.reduce((s, w) => s + w.overtime, 0),
);
$("#netTotal").textContent = money(
  wages +
    S.workers.reduce((s, w) => s + w.expense, 0) +
    S.workers.reduce((s, w) => s + w.overtime, 0),
);
