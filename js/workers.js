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
      <div class="card" style="text-align:center;padding:30px">
        🔐<br>
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
                    <a href="worker.html?id=${w.id}" style="color:inherit;text-decoration:none;">${w.name || "بدون اسم"}</a>
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
                <b><small>يومية</small>${money(w.rate)}</b>
                <div class="worker-actions">
                  <button class="mini-action" data-edit="${w.id}">تعديل</button>
                  <button class="mini-action" data-delete="${w.id}">حذف</button>
                </div>
              </div>
            </article>`,
        )
        .join("")
    : `
        <div class="card" style="text-align:center;padding:30px">🔎<br>
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

// Edit - Delete

list.onclick = (e) => {
  if (!ensureActiveGroup()) return;

  const edit = e.target.closest("[data-edit]");
  const del = e.target.closest("[data-delete]");

  if (edit) {
    const worker = S.workers.find(
      (w) => String(w.id) === String(edit.dataset.edit),
    );

    if (!worker) {
      toast("العامل غير موجود", true);
      return;
    }

    return showWorker(worker);
  }

  if (del) {
    const worker = S.workers.find(
      (w) => String(w.id) === String(del.dataset.delete),
    );

    if (!worker) {
      toast("العامل غير موجود", true);
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
    return toast("اكتب اسم العامل", true, "#ff8e8e", "#000");
  }

  if (!Number.isFinite(rate) || rate < 0) {
    return toast("راجع قيمة اليومية", true, "#ff8e8e", "#000");
  }

  if (phone && !/^[0-9]{11,15}$/.test(phone)) {
    return toast("رقم الهاتف غير صحيح", true, "#ff8e8e", "#000");
  }

  //  Edit worker exist already
  if (editingId) {
    const worker = S.workers.find((w) => String(w.id) === String(editingId));

    if (!worker) {
      toast("العامل غير موجود", true, "#ff8e8e", "#000");
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

      expense: 0,
      overtime: 0,
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
    "#92ff8f",
    "#000",
  );
};

// Delete Worker
$("#deleteConfirm").onclick = () => {
  if (!ensureActiveGroup()) return;

  const deleteId = $("#deleteId").value;
  const index = S.workers.findIndex((w) => String(w.id) === String(deleteId));

  if (index < 0) {
    toast("العامل غير موجود", true);
    return;
  }

  S.workers.splice(index, 1);
  save();
  closeModal("deleteModal");
  renderWorkers();
  toast("تم حذف العامل");
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
