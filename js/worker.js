const params = new URLSearchParams(window.location.search);
const workerId = params.get("id");

// ===============================
// Load Worker
// ===============================

function loadWorker() {
  if (!workerId) {
    showWorkerError("لم يتم تحديد العامل");
    return;
  }

  const worker = getWorkerById(workerId);

  if (!worker) {
    showWorkerError("العامل غير موجود");
    return;
  }

  renderWorker(worker);
}

// ===============================
// Render Worker
// ===============================

function renderWorker(worker) {
  console.table(worker.name, worker.active);
  document.title = `${worker.name} - عُمّال`;

  const attendance = getWorkerAttendance(worker.id);
  const expenses = getWorkerExpenses(worker.id);
  const overtime = getWorkerOvertime(worker.id);
  const due = getWorkerDue(worker.id);

  document.getElementById("workerProfile").innerHTML = `
    <div class="worker-hero-top">

      <div class="worker-avatar-large">
        ${escapeHtml(worker.name.charAt(0) || "👤")}
      </div>

      <div class="worker-identity">

        <div class="worker-title-row">
          <h1>${escapeHtml(worker.name)}</h1>

          <span class="worker-status ${worker.active == true ? "active" : ""}">
            ${worker.active == true ? "نشط" : "غير نشط"}
          </span>
        </div>

        <div class="worker-meta">
          ${
            worker.profession
              ? `<span>🔧 ${escapeHtml(worker.profession)}</span>`
              : ""
          }

          ${worker.phone ? `<span>📞 ${escapeHtml(worker.phone)}</span>` : ""}
        </div>

      </div>

    </div>

    <div class="worker-hero-bottom">

      <div>
        <small>اليومية</small>
        <strong>${money(worker.rate)}</strong>
      </div>

      <div>
        <small>تاريخ الإضافة</small>
        <strong>${escapeHtml(formatDate(worker.createdAt))}</strong>
      </div>

      <div>
        <small>أيام الحضور</small>
        <strong>${attendance.present}</strong>
      </div>

    </div>
  `;

  document.getElementById("workerRate").textContent = money(worker.rate);
  document.getElementById("workerExpenses").textContent = money(expenses);
  document.getElementById("workerOvertime").textContent = money(overtime);
  document.getElementById("workerDue").textContent = money(due);
  document.getElementById("workerNotes").textContent =
    worker.note || "لا توجد ملاحظات.";

  renderAttendance(worker.id);
  renderLedger(worker.id);

  document.getElementById("editWorkerBtn").onclick = () => {
    window.location.href = `workers.html?edit=${worker.id}`;
  };

  document.getElementById("addWorkerTransactionBtn").onclick = () => {
    openAddTransactionModal(worker);
  };

  setupTransactionModals(worker);
  setupTransactionActionsUI();
  setupSettlementUI(worker);
}

// ===============================
// Financial Calculations
// ===============================

function getWorkerExpenses(workerId) {
  return getWorkerTransactions(workerId, {
    type: "expense",
  }).reduce((total, tx) => total + Number(tx.amount || 0), 0);
}

function getWorkerOvertime(workerId) {
  return getWorkerTransactions(workerId, {
    type: "overtime",
  }).reduce((total, tx) => total + Number(tx.amount || 0), 0);
}

function getWorkerDue(workerId) {
  const worker = getWorkerById(workerId);

  if (!worker) return 0;

  const attendance = getWorkerAttendance(workerId);

  const baseSalary = attendance.present * Number(worker.rate || 0);

  const expenses = getWorkerExpenses(workerId);

  const overtime = getWorkerOvertime(workerId);

  const totalSettled = (S.settlements || [])
    .filter((s) => String(s.workerId) === String(workerId))
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);

  return Math.max(0, baseSalary + overtime - expenses - totalSettled);
}

// ===============================
// Financial Activity
// ===============================

function renderLedger(workerId) {
  const ledgerEl = document.getElementById("workerLedger");

  if (!ledgerEl) return;

  const events = [];

  // Attendance
  Object.entries(S.attendance || {}).forEach(([date, dayAtt]) => {
    if (dayAtt?.[workerId] !== undefined && dayAtt[workerId] !== null) {
      events.push({
        date,
        type: dayAtt[workerId] === true ? "حضور" : "غياب",
        badgeClass: dayAtt[workerId] === true ? "present" : "absent",
        details: dayAtt[workerId] === true ? "حضور يوم كامل" : "يوم غياب",
        amount: null,
        transaction: false,
      });
    }
  });

  // Transactions
  getWorkerTransactions(workerId).forEach((tx) => {
    const isExpense = tx.type === "expense";

    events.push({
      date: tx.date,
      type: isExpense ? "مصروف" : "إضافي",
      badgeClass: isExpense ? "expense" : "overtime",
      details: tx.note || (isExpense ? "مصروف / سلفة" : "إضافي / مكافأة"),
      amount: isExpense ? `- ${money(tx.amount)}` : `+ ${money(tx.amount)}`,
      transaction: true,
      transactionId: tx.id,
      transactionType: tx.type,
    });
  });

  // Settlements
  (S.settlements || []).forEach((s) => {
    if (String(s.workerId) === String(workerId)) {
      events.push({
        date: s.date || formatDate(s.settledAt),
        type: "تسوية",
        badgeClass: "settlement",
        details: s.note || "تسوية مالية للحساب",
        amount: `✓ ${money(s.amount)}`,
        transaction: false,
      });
    }
  });

  events.sort((a, b) => {
    const dateCompare = String(b.date).localeCompare(String(a.date));

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return 0;
  });

  if (!events.length) {
    ledgerEl.innerHTML = `
      <div class="ledger-empty">
        <div>🧾</div>
        <strong>لا توجد حركات</strong>
        <small>
          لم يتم تسجيل أي حركة لهذا العامل حتى الآن.
        </small>
      </div>
    `;

    return;
  }

  ledgerEl.innerHTML = `
    <div class="ledger-items">

      ${events
        .map(
          (event) => `
          <article
            class="ledger-item ${event.transaction ? "is-transaction" : ""}"
          >

            <div class="ledger-icon ${event.badgeClass}">

              ${
                event.badgeClass === "expense"
                  ? "↓"
                  : event.badgeClass === "overtime"
                    ? "↑"
                    : event.badgeClass === "present"
                      ? "✓"
                      : event.badgeClass === "absent"
                        ? "×"
                        : "💳"
              }

            </div>

            <div class="ledger-main">

              <div class="ledger-top">

                <strong>
                  ${escapeHtml(event.type)}
                </strong>

                <time>
                  ${escapeHtml(event.date)}
                </time>

              </div>

              <small>
                ${escapeHtml(event.details)}
              </small>

            </div>

            ${
              event.amount
                ? `
                  <strong class="ledger-amount ${event.badgeClass}">
                    ${escapeHtml(event.amount)}
                  </strong>
                `
                : ""
            }

            ${
              event.transaction
                ? `
                  <button
                    class="ledger-menu"
                    type="button"
                    data-tx-menu="${escapeHtml(event.transactionId)}"
                    aria-label="خيارات العملية"
                  >
                    ⋮
                  </button>
                `
                : ""
            }

          </article>
        `,
        )
        .join("")}

    </div>
  `;

  ledgerEl.querySelectorAll("[data-tx-menu]").forEach((button) => {
    button.addEventListener("click", () => {
      const transactionId = button.dataset.txMenu;

      showTransactionActions(workerId, transactionId);
    });
  });
}

// ===============================
// Transaction Add / Edit
// ===============================

function openAddTransactionModal(worker) {
  const form = document.getElementById("workerAddTransactionForm");

  if (!form) return;

  form.reset();

  document.getElementById("workerAddTxDate").value = today();

  document.getElementById("workerAddTxAmount").focus();

  openModal("workerAddTransactionModal");
}

function setupTransactionModals(worker) {
  bindModal("workerTransactionModal");

  bindModal("workerAddTransactionModal");

  document
    .getElementById("closeWorkerTransactionModal")
    ?.addEventListener("click", () => closeModal("workerTransactionModal"));

  document
    .getElementById("closeWorkerAddTransactionModal")
    ?.addEventListener("click", () => closeModal("workerAddTransactionModal"));

  document.getElementById("workerTransactionForm").onsubmit = (e) => {
    e.preventDefault();

    const transactionId = document.getElementById("workerTxId").value;

    const amount = Number(document.getElementById("workerTxAmount").value);

    const type = document.getElementById("workerTxType").value;

    const note = document.getElementById("workerTxNote").value.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return toast("أدخل مبلغًا صحيحًا", true);
    }

    const updated = updateTransaction(worker.id, transactionId, {
      amount,
      type,
      note,
    });

    if (!updated) {
      return toast("تعذر تعديل العملية", true);
    }

    closeModal("workerTransactionModal");

    renderWorker(worker);

    toast("تم تعديل العملية بنجاح", null, UPDATE_NOTIFICATION_COLOR);
  };

  document.getElementById("workerAddTransactionForm").onsubmit = (e) => {
    e.preventDefault();

    const type = document.getElementById("workerAddTxType").value;

    const amount = Number(document.getElementById("workerAddTxAmount").value);

    const note = document.getElementById("workerAddTxNote").value.trim();

    const date = document.getElementById("workerAddTxDate").value || today();

    if (!Number.isFinite(amount) || amount <= 0) {
      return toast("أدخل مبلغًا صحيحًا", true);
    }

    const transaction = addTransaction(worker.id, type, amount, note, date);

    if (!transaction) {
      return toast("تعذر إضافة العملية", true);
    }

    closeModal("workerAddTransactionModal");

    renderWorker(worker);

    toast(
      "تمت إضافة العملية بنجاح",
      null,
      function confirmDeleteSelectedTransaction() {
        if (!transactionPendingDelete) {
          return;
        }

        const { transaction, workerId } = transactionPendingDelete;

        const deleted = deleteTransaction(workerId, transaction.id);

        if (!deleted) {
          return toast("تعذر حذف العملية", true);
        }

        closeDeleteTransactionModal();

        const worker = getWorkerById(workerId);

        renderWorker(worker);

        toast("تم حذف العملية بنجاح", false, UPDATE_NOTIFICATION_COLOR, 5000);
      },
    );
  };
}

// ===============================
// Transaction Actions
// ===============================

function showTransactionActions2(workerId, transactionId) {
  const transaction = findTransaction(workerId, transactionId);

  if (!transaction) {
    return toast("العملية غير موجودة", true);
  }

  const action = window.prompt(
    `اختر العملية:\n\n` +
      `1 - تعديل\n` +
      `2 - حذف\n\n` +
      `${transaction.type === "expense" ? "مصروف" : "إضافي"}: ${money(transaction.amount)}`,
  );

  if (action === "1") {
    openEditTransactionModal(transaction);
  }

  if (action === "2") {
    deleteWorkerTransaction(workerId, transactionId);
  }
}

// ===============================
// Transaction Actions UI
// ===============================

let selectedTransaction = null;

function showTransactionActions(workerId, transactionId) {
  const transaction = findTransaction(workerId, transactionId);

  if (!transaction) {
    return toast("العملية غير موجودة", true);
  }

  selectedTransaction = {
    workerId,
    transactionId,
  };

  const isExpense = transaction.type === "expense";

  const subtitle = document.getElementById("transactionActionsSubtitle");

  if (subtitle) {
    subtitle.textContent = `${isExpense ? "مصروف" : "إضافي"} • ${money(transaction.amount)}`;
  }

  openModal("transactionActionsModal");
}

function closeTransactionActions() {
  closeModal("transactionActionsModal");

  selectedTransaction = null;
}

function openSelectedTransactionForEdit() {
  if (!selectedTransaction) return;

  const workerId = selectedTransaction.workerId;
  const transactionId = selectedTransaction.transactionId;

  const transaction = findTransaction(workerId, transactionId);

  if (!transaction) {
    closeTransactionActions();
    return toast("العملية غير موجودة", true);
  }

  closeTransactionActions();
  openEditTransactionModal(transaction);
}

function openSelectedTransactionForDelete() {
  if (!selectedTransaction) return;

  const workerId = selectedTransaction.workerId;
  const transactionId = selectedTransaction.transactionId;

  const transaction = findTransaction(workerId, transactionId);

  if (!transaction) {
    closeTransactionActions();
    return toast("العملية غير موجودة", true);
  }

  closeTransactionActions();
  openDeleteTransactionModal(transaction, workerId);
}

// ===============================
// Delete Confirmation
// ===============================

let transactionPendingDelete = null;
function openDeleteTransactionModal(transaction, workerId) {
  transactionPendingDelete = {
    transaction,
    workerId,
  };

  const details = document.getElementById("deleteTransactionDetails");

  if (details) {
    const isExpense = transaction.type === "expense";

    details.innerHTML = `
      <div class="delete-detail-row">

        <span class="delete-detail-label">
          النوع
        </span>

        <strong class="delete-detail-value">
          ${isExpense ? "💸 مصروف / سلفة" : "⏱️ إضافي"}
        </strong>

      </div>

      <div class="delete-detail-row">

        <span class="delete-detail-label">
          المبلغ
        </span>

        <strong
          class="delete-detail-value ${transaction.type}"
        >
          ${money(transaction.amount)}
        </strong>

      </div>

      <div class="delete-detail-row">

        <span class="delete-detail-label">
          البيان
        </span>

        <strong class="delete-detail-value">
          ${escapeHtml(transaction.note || "بدون بيان")}
        </strong>

      </div>

      <div class="delete-detail-row">

        <span class="delete-detail-label">
          التاريخ
        </span>

        <strong class="delete-detail-value">
          ${escapeHtml(transaction.date)}
        </strong>

      </div>
    `;
  }

  openModal("transactionDeleteModal");
}

function closeDeleteTransactionModal() {
  closeModal("transactionDeleteModal");

  transactionPendingDelete = null;
}

function confirmDeleteSelectedTransaction() {
  if (!transactionPendingDelete) return;

  const { transaction, workerId } = transactionPendingDelete;

  const deleted = deleteTransaction(workerId, transaction.id);

  if (!deleted) {
    return toast("تعذر حذف العملية", true);
  }

  closeDeleteTransactionModal();

  const worker = getWorkerById(workerId);

  renderWorker(worker);

  toast("تم حذف العملية بنجاح", false, UPDATE_NOTIFICATION_COLOR, 5000);
}

// ===============================
// Bind Actions
// ===============================
let transactionActionsUIInitialized = false;
function setupTransactionActionsUI() {
  if (transactionActionsUIInitialized) return;

  transactionActionsUIInitialized = true;
  bindModal("transactionActionsModal");
  bindModal("transactionDeleteModal");

  document
    .getElementById("closeTransactionActionsModal")
    ?.addEventListener("click", closeTransactionActions);

  document
    .getElementById("cancelTransactionAction")
    ?.addEventListener("click", closeTransactionActions);

  document
    .getElementById("editTransactionAction")
    ?.addEventListener("click", openSelectedTransactionForEdit);

  document
    .getElementById("deleteTransactionAction")
    ?.addEventListener("click", openSelectedTransactionForDelete);

  document
    .getElementById("cancelDeleteTransaction")
    ?.addEventListener("click", closeDeleteTransactionModal);

  document
    .getElementById("confirmDeleteTransaction")
    ?.addEventListener("click", confirmDeleteSelectedTransaction);
}

function openEditTransactionModal(transaction) {
  document.getElementById("workerTxId").value = transaction.id;

  document.getElementById("workerTxType").value = transaction.type;

  document.getElementById("workerTxAmount").value = transaction.amount;

  document.getElementById("workerTxNote").value = transaction.note || "";

  document.getElementById("workerTxTitle").textContent =
    transaction.type === "expense" ? "تعديل المصروف" : "تعديل الإضافي";

  document.getElementById("workerTxSubtitle").textContent =
    `تاريخ العملية: ${transaction.date}`;

  openModal("workerTransactionModal");
}

function deleteWorkerTransaction(workerId, transactionId) {
  const transaction = findTransaction(workerId, transactionId);

  if (!transaction) return;

  const confirmed = window.confirm(
    `هل أنت متأكد من حذف هذه العملية؟\n\n` +
      `${transaction.type === "expense" ? "مصروف" : "إضافي"}\n` +
      `${money(transaction.amount)}\n` +
      `${transaction.note || "بدون بيان"}\n\n` +
      `سيتم تحديث المستحق تلقائيًا.`,
  );

  if (!confirmed) return;

  const deleted = deleteTransaction(workerId, transactionId);

  if (!deleted) {
    return toast("تعذر حذف العملية", true);
  }

  const worker = getWorkerById(workerId);
  renderWorker(worker);
  toast("تم حذف العملية", null, UPDATE_NOTIFICATION_COLOR, 5000);
}

// ===============================
// Settlement
// ===============================

function setupSettlementUI(worker) {
  const btn = document.getElementById("settleAccountBtn");
  const modal = document.getElementById("settlementModal");
  const closeBtn = document.getElementById("closeSettlementModal");
  const form = document.getElementById("settlementForm");
  const amountInput = document.getElementById("settleAmount");

  const amount = Number(amountInput.value);

  if (!btn || !modal || amount == 0) {
    btn.classList.add("disable");
    return;
  }
  btn.onclick = () => {
    const due = getWorkerDue(worker.id);

    if (amountInput) {
      amountInput.value = due > 0 ? due : 0;
    }

    openModal("settlementModal");
  };

  closeBtn?.addEventListener("click", () => closeModal("settlementModal"));

  bindModal("settlementModal");

  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();

      const amount = Number(amountInput.value);
      const note = document.getElementById("settleNote")?.value.trim();

      if (!Number.isFinite(amount) || amount < 0) {
        return toast("أدخل مبلغًا صحيحًا للتصفية", true);
      }

      settleWorkerAccount(worker.id, amount, note);
      closeModal("settlementModal");
      toast("تمت تصفية الحساب بنجاح", false, UPDATE_NOTIFICATION_COLOR);
      renderWorker(worker);
    };
  }
}

// ===============================
// Attendance
// ===============================

function renderAttendance(workerId) {
  const summary = getWorkerAttendance(workerId);

  document.getElementById("attendanceSummary").innerHTML = `
    <div class="attendance-item present">
      <span>أيام الحضور</span>
      <strong>${summary.present}</strong>
    </div>

    <div class="attendance-item absent">
      <span>أيام الغياب</span>
      <strong>${summary.absent}</strong>
    </div>
  `;
}

// ===============================
// Helpers
// ===============================

function getWorkerById(id) {
  return S.workers.find((worker) => String(worker.id) === String(id));
}

function getWorkerAttendance(workerId) {
  const attendance = S.attendance || {};

  let present = 0;
  let absent = 0;
  let unmarked = 0;

  Object.values(attendance).forEach((day) => {
    const value = day[workerId];

    if (value === true) {
      present++;
    } else if (value === false) {
      absent++;
    } else {
      unmarked++;
    }
  });

  return {
    present,
    absent,
    unmarked,
  };
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("ar-EG");
}

function showWorkerError(message) {
  document.getElementById("workerProfile").innerHTML = `
    <div class="empty">
      ⚠️<br>
      ${escapeHtml(message)}
    </div>
  `;
}

// ===============================
// Back
// ===============================

document.getElementById("backBtn").onclick = () => {
  window.location.href = "workers.html";
};

document.addEventListener("DOMContentLoaded", loadWorker);
