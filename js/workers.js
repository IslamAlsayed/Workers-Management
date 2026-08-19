setupCommon();
renderNav("workers");
const list = $("#workerList");
let editingId = null;
function renderWorkers() {
  const q = ($("#search").value || "").trim().toLowerCase();
  const workers = S.workers.filter((w) =>
    `${w.name} ${w.profession} ${w.phone}`.toLowerCase().includes(q),
  );
  // <a href="./worker.html?id=${w.id}">${w.name}</a>
  list.innerHTML = workers.length
    ? workers
        .map(
          (w) => `
    <article class="worker">
    <div class="avatar">${w.name[0] || "👤"}</div> 
      <div class="info">
      <b>${w.name} - ${w.phone}</b><small>${w.profession || ""}</small>
      <small style="font-weight: 500; color: #0033d1">${w.note || "بدون ملاحظات"}</small>
        <span class="pill ${attendanceValue(w.id) === true ? "present" : attendanceValue(w.id) === false ? "absent" : "empty"}">${attendanceValue(w.id) === true ? "حاضر اليوم" : attendanceValue(w.id) === false ? "غائب اليوم" : "غير محدد"}</span>
      </div><div class="meta"><b>${money(w.rate)}</b><small>يومية</small>
        <div class="worker-actions"><button class="mini-action" data-edit="${w.id}">تعديل</button><button class="mini-action" data-delete="${w.id}">حذف</button></div>
      </div></article>`,
        )
        .join("")
    : `<div class="card" style="text-align:center;padding:30px">🔎<br><small>لا توجد نتائج</small></div>`;
}
function resetWorkerForm() {
  $("#workerForm").reset();
  editingId = null;
  $("#workerModalTitle").textContent = "إضافة عامل";
}
function showWorker(worker) {
  editingId = worker?.id || null;
  $("#workerModalTitle").textContent = worker ? "تعديل عامل" : "إضافة عامل";
  $("#workerName").value = worker?.name || "";
  $("#workerRate").value = worker?.rate ?? "";
  $("#workerProfession").value = worker?.profession ?? "";
  $("#workerPhone").value = worker?.phone ?? "";
  $("#workerNote").value = worker?.note || "";
  openModal("workerModal");
  $("#workerName").focus();
}
$("#addWorker").onclick = () => showWorker();
$("#search").oninput = renderWorkers;
list.onclick = (e) => {
  const edit = e.target.closest("[data-edit]"),
    del = e.target.closest("[data-delete]");
  if (edit)
    return showWorker(S.workers.find((w) => w.id === edit.dataset.edit));
  if (del) {
    $("#deleteId").value = del.dataset.delete;
    openModal("deleteModal");
  }
};
bindModal("workerModal");
bindModal("deleteModal");
$("#workerForm").onsubmit = (e) => {
  e.preventDefault();
  const name = $("#workerName").value.trim(),
    rate = Number($("#workerRate").value);
  if (!name || !Number.isFinite(rate) || rate < 0)
    return toast("راجع بيانات العامل", true);
  if (editingId)
    Object.assign(
      S.workers.find((w) => w.id === editingId),
      {
        name,
        rate,
        profession: $("#workerProfession").value.trim(),
        phone: $("#workerPhone").value.trim(),
        note: $("#workerNote").value.trim(),
      },
    );
  else
    S.workers.unshift({
      id: id(),
      name,
      rate,
      profession: $("#workerProfession").value.trim(),
      phone: $("#workerPhone").value.trim(),
      note: $("#workerNote").value.trim(),
      expense: 0,
      overtime: 0,
    });
  save();
  closeModal("workerModal");
  resetWorkerForm();
  renderWorkers();
  toast("تم حفظ بيانات العامل");
};
$("#deleteConfirm").onclick = () => {
  const i = S.workers.findIndex((w) => w.id === $("#deleteId").value);
  if (i >= 0) S.workers.splice(i, 1);
  save();
  closeModal("deleteModal");
  renderWorkers();
  toast("تم حذف العامل");
};
renderWorkers();
