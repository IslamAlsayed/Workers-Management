setupCommon();
renderNav("workers");

const list = $("#workerList");
let editingId = null;

function ensureActiveGroup() {
  if (!S || !S.groupId) {
    toast("يجب تسجيل الدخول أولاً", true);
    return false;
  }

  return true;
}

function renderWorkers() {
  if (!ensureActiveGroup()) {
    list.innerHTML = `
      <div class="card" style="text-align:center;padding:30px;margin-top:20px">🔐<br>
        <small>يجب تسجيل الدخول أولاً</small>
      </div>`;
    return;
  }

  const q = ($("#search").value || "").trim().toLowerCase();

  const workers = (S.workers || []).filter((w) => {
    const searchable = [w.name, w.profession, w.phone, w.note]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(q);
  });

  list.innerHTML = workers.length
    ? workers
        .map(
          (w) => `
            <article class="worker">
              <div class="avatar">${(w.name || "👤")[0]}</div>
              <div class="info">
                <div class="info-text">
                  <b>
                    <a href="worker.html?id=${w.id}" class="link">${w.name || "بدون اسم"}</a>
                    ${w.phone ? `<small> - ${w.phone}</small>` : ""}
                  </b>
                </div>
                <p><small>${w.profession || ""}</small></p>
                <small style="font-weight:500;color:#0033d1">${w.note || "بدون ملاحظات"}</small>

                <span
                  class="pill ${
                    attendanceValue(w.id) === true
                      ? "present"
                      : attendanceValue(w.id) === false
                        ? "absent"
                        : "empty"
                  }">
                  ${
                    attendanceValue(w.id) === true
                      ? "حاضر اليوم"
                      : attendanceValue(w.id) === false
                        ? "غائب اليوم"
                        : "غير محدد"
                  }
                </span>
              </div>

              <div class="meta">
                <b><small>يومية</small> ${money(w.rate)}</b>
                <div class="worker-actions">
                  <button class="mini-action" data-edit="${w.id}">تعديل</button>
                  <button class="mini-action" data-delete="${w.id}">حذف</button>
                </div>
              </div>
            </article>`,
        )
        .join("")
    : `
        <div class="card" style="text-align:center;padding:30px;margin-top:20px">🔎<br>
          <small>${q ? "لا توجد نتائج مطابقة للبحث" : "لا يوجد عمال في هذه المجموعة"}</small>
        </div>
      `;
}

function resetWorkerForm() {
  $("#workerForm").reset();
  editingId = null;
  $("#workerModalTitle").textContent = "إضافة عامل";
}

function showWorker(worker = null) {
  if (!ensureActiveGroup()) return;

  editingId = worker?.id || null;

  $("#workerModalTitle").textContent = worker ? "تعديل عامل" : "إضافة عامل";

  $("#workerName").value = worker?.name || "";
  $("#workerRate").value = worker?.rate ?? "";
  $("#workerProfession").value = worker?.profession || "";
  $("#workerPhone").value = worker?.phone || "";
  $("#workerNote").value = worker?.note || "";

  openModal("workerModal");

  $("#workerName").focus();
}

// Add Worker

$("#addWorker").onclick = () => {
  if (!ensureActiveGroup()) return;
  showWorker();
};

// Search
$("#search").oninput = renderWorkers;

// Edit/Delete Worker
list.onclick = (e) => {
  if (!ensureActiveGroup()) return;

  const edit = e.target.closest("[data-edit]");
  const del = e.target.closest("[data-delete]");

  if (edit) {
    const worker = S.workers.find(
      (w) => String(w.id) === String(edit.dataset.edit),
    );

    if (!worker) {
      toast("العامل غير موجود", true, ERROR_NOTIFICATION_COLOR);
      return;
    }

    return showWorker(worker);
  }

  if (del) {
    const worker = S.workers.find(
      (w) => String(w.id) === String(del.dataset.delete),
    );

    if (!worker) {
      toast("العامل غير موجود", true, ERROR_NOTIFICATION_COLOR);
      return;
    }

    $("#deleteId").value = worker.id;

    openModal("deleteModal");
  }
};

bindModal("workerModal");
bindModal("deleteModal");

// Save Worker
$("#workerForm").onsubmit = (e) => {
  e.preventDefault();

  if (!ensureActiveGroup()) return;

  const name = $("#workerName").value.trim();
  const rate = Number($("#workerRate").value);
  const profession = $("#workerProfession").value.trim();
  const phone = $("#workerPhone").value.trim();
  const note = $("#workerNote").value.trim();

  if (!name) {
    return toast("اكتب اسم العامل", true);
  }

  if (!Number.isFinite(rate) || rate < 0) {
    return toast("راجع قيمة اليومية", true);
  }

  if (phone && !/^[0-9]{11,15}$/.test(phone)) {
    return toast("رقم الهاتف غير صحيح", true);
  }

  //  Edit worker exist already
  if (editingId) {
    const worker = S.workers.find((w) => String(w.id) === String(editingId));

    if (!worker) {
      toast("العامل غير موجود", true, ERROR_NOTIFICATION_COLOR);
      return;
    }

    Object.assign(worker, {
      name,
      rate,
      profession,
      phone,
      note,
    });
  } else {
    // Add new worker
    S.workers.unshift({
      id: id(),
      name,
      rate,
      profession,
      phone,
      note,
    });
  }

  /**
   * save() في نسخة groups
   * يحفظ الـ State الخاص بالـ Active Group فقط
   */
  save();
  closeModal("workerModal");
  resetWorkerForm();
  renderWorkers();
  toast(
    editingId ? "تم تعديل بيانات العامل" : "تمت إضافة العامل بنجاح",
    false,
    UPDATE_NOTIFICATION_COLOR,
  );
};

// Delete Worker
$("#deleteConfirm").onclick = () => {
  if (!ensureActiveGroup()) return;

  const deleteId = $("#deleteId").value;
  const index = S.workers.findIndex((w) => String(w.id) === String(deleteId));

  if (index < 0) {
    toast("العامل غير موجود", true, ERROR_NOTIFICATION_COLOR);
    return;
  }

  // 1. حذف العامل
  S.workers.splice(index, 1);

  // 2. حذف transactions الخاصة بالعامل من كل التواريخ
  Object.keys(S.transactions || {}).forEach((date) => {
    if (!S.transactions[date]) return;
    delete S.transactions[date][deleteId];
    if (Object.keys(S.transactions[date]).length === 0) {
      delete S.transactions[date];
    }
  });

  // 3. حذف attendance الخاصة بالعامل من كل التواريخ
  Object.keys(S.attendance || {}).forEach((date) => {
    if (!S.attendance[date]) return;
    delete S.attendance[date][deleteId];
  });

  save();
  closeModal("deleteModal");
  renderWorkers();
  toast("تم حذف العامل وبياناته بالكامل", false, UPDATE_NOTIFICATION_COLOR);
};

// Initial render
renderWorkers();

// Check URL parameters for edit worker request
const urlParams = new URLSearchParams(window.location.search);
const editParam = urlParams.get("edit");
if (editParam && ensureActiveGroup()) {
  const workerToEdit = (S.workers || []).find(
    (w) => String(w.id) === String(editParam),
  );
  if (workerToEdit) {
    showWorker(workerToEdit);
  }
}
