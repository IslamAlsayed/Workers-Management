setupCommon();
renderNav("attendance");
const list = $("#attendanceList");
function render() {
  const date = $("#attendanceDate").value || today();
  S.attendanceDate = date;
  save();
  list.innerHTML = S.workers
    .map((w) => {
      const value = attendanceValue(w.id, date);
      return `<article class="attendance"><div class="avatar">${w.name[0] || "👤"}</div><div class="info"><b>${w.name}</b><small>${money(w.rate)} / يوم</small></div>
      <div class="attendance-tools"><button class="mini-action" data-exp="${w.id}">مصروف</button><button class="mini-action" data-over="${w.id}">إضافي</button></div>
      <label class="attendance-toggle ${value === true ? "present" : value === false ? "absent" : "empty"}"><input type="checkbox" data-att="${w.id}" ${value === true ? "checked" : ""}><span>${value === true ? "حاضر" : value === false ? "غائب" : "غير محدد"}</span></label></article>`;
    })
    .join("");
}
$("#attendanceDate").value = S.attendanceDate || today();
$("#attendanceDate").onchange = render;
list.onclick = (e) => {
  const toggle = e.target.closest("[data-att]");
  if (toggle) return;
  const exp = e.target.closest("[data-exp]"),
    over = e.target.closest("[data-over]");
  if (exp) openTransaction(exp.dataset.exp, "expense");
  if (over) openTransaction(over.dataset.over, "overtime");
};
list.addEventListener("change", (e) => {
  const input = e.target.closest("[data-att]");
  if (!input) return;
  const date = $("#attendanceDate").value,
    next = nextAttendance(attendanceValue(input.dataset.att, date));
  setAttendance(input.dataset.att, next, date);
  render();
  toast(next ? "تم تسجيل الحضور" : "تم تسجيل الغياب");
});
function openTransaction(workerId, type) {
  $("#txWorkerId").value = workerId;
  $("#txType").value = type;
  $("#txTitle").textContent =
    type === "expense" ? "إضافة مصروف" : "إضافة إضافي";
  openModal("transactionModal");
  $("#txAmount").focus();
}
bindModal("transactionModal");
$("#transactionForm").onsubmit = (e) => {
  e.preventDefault();
  const w = S.workers.find((x) => x.id === $("#txWorkerId").value),
    amount = Number($("#txAmount").value);
  if (!w || amount <= 0) return toast("أدخل مبلغًا صحيحًا", true);
  const type = $("#txType").value;
  w[type] = Number(w[type] || 0) + amount;
  save();
  closeModal("transactionModal");
  e.target.reset();
  render();
  toast(type === "expense" ? "تم تسجيل المصروف" : "تم تسجيل الإضافي");
};
render();
