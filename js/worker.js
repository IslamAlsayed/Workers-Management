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
  document.title = worker.name;
  // <span class="worker-status">${worker.active ? "عامل نشط" : "غير نشط"}</span>
  // <span class="worker-status">${attendanceValue(worker.id) === true ? "حاضر اليوم" : attendanceValue(worker.id) === false ? "غائب اليوم" : "غير محدد"}</span>

  document.getElementById("workerProfile").innerHTML = `
        <div class="worker-profile-top">
            <div class="worker-avatar-large">${worker.name.charAt(0)}</div>
            <div>
                <h1>${worker.name}</h1>
            </div>
        </div>
        <div class="worker-basic-info">
            <div>
                <span>اليومية</span>
                <strong>${money(worker.rate)}</strong>
            </div>
            <div>
                <span>تاريخ الإضافة</span>
                <strong>${formatDate(worker.createdAt)}</strong>
            </div>
        </div>`;

  document.getElementById("workerRate").textContent = money(worker.rate);

  document.getElementById("workerExpenses").textContent = money(
    getWorkerExpenses(worker.id),
  );

  document.getElementById("workerOvertime").textContent = money(
    getWorkerOvertime(worker.id),
  );

  document.getElementById("workerDue").textContent = money(
    getWorkerDue(worker.id),
  );

  document.getElementById("workerNotes").textContent =
    worker.note || "لا توجد ملاحظات.";

  renderAttendance(worker.id);
  renderLedger(worker.id);

  document.getElementById("editWorkerBtn").onclick = () => {
    window.location.href = `workers.html?edit=${worker.id}`;
  };

  setupSettlementUI(worker);
}

// ===============================
// Ledger Log
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
        details: dayAtt[workerId] === true ? "حضور يوم كامل" : "خصم يوم غياب",
        amount: null
      });
    }
  });

  // Transactions
  Object.entries(S.transactions || {}).forEach(([date, dayTx]) => {
    const tx = dayTx?.[workerId];
    if (tx) {
      if (tx.expense > 0) {
        events.push({
          date,
          type: "مصروف/سلفة",
          badgeClass: "expense",
          details: "سداد سلفة حرة",
          amount: `- ${money(tx.expense)}`
        });
      }
      if (tx.overtime > 0) {
        events.push({
          date,
          type: "إضافي",
          badgeClass: "overtime",
          details: "مكافأة أو إضافي",
          amount: `+ ${money(tx.overtime)}`
        });
      }
    }
  });

  // Settlements
  (S.settlements || []).forEach((s) => {
    if (String(s.workerId) === String(workerId)) {
      events.push({
        date: s.date || formatDate(s.settledAt),
        type: "تصفية حساب",
        badgeClass: "empty",
        details: s.note || "تصفية ماليّة للحساب",
        amount: `✔ ${money(s.amount)}`
      });
    }
  });

  // Sort descending by date
  events.sort((a, b) => (a.date < b.date ? 1 : -1));

  if (!events.length) {
    ledgerEl.innerHTML = `<div class="card" style="text-align:center;padding:15px"><small>لا توجد حركات مسجلة حتى الآن</small></div>`;
    return;
  }

  ledgerEl.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${events
        .map(
          (e) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid var(--b);font-size:12px;">
              <div>
                <span class="pill ${e.badgeClass}" style="margin-left:6px;">${e.type}</span>
                <small style="color:var(--m);">${e.date}</small>
                <div style="font-size:10px;color:var(--m);margin-top:2px;">${e.details}</div>
              </div>
              <b style="font-size:12px;">${e.amount || ""}</b>
            </div>`
        )
        .join("")}
    </div>`;
}

function setupSettlementUI(worker) {
  const btn = document.getElementById("settleAccountBtn");
  const modal = document.getElementById("settlementModal");
  const closeBtn = document.getElementById("closeSettlementModal");
  const form = document.getElementById("settlementForm");
  const amountInput = document.getElementById("settleAmount");

  if (!btn || !modal) return;

  btn.onclick = () => {
    const due = getWorkerDue(worker.id);
    if (amountInput) amountInput.value = due > 0 ? due : 0;
    openModal("settlementModal");
  };

  closeBtn?.addEventListener("click", () => closeModal("settlementModal"));

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
      toast("تمت تصفية الحساب بنجاح", false, "#92ff8f", "#000");
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
        <div class="attendance-item">
            <span>أيام الحضور</span>
            <strong>${summary.present}</strong>
        </div>
        <div class="attendance-item">
            <span>أيام الغياب</span>
            <strong>${summary.absent}</strong>
        </div>
        <div class="attendance-item">
            <span>غير محدد</span>
            <strong>${summary.unmarked}</strong>
        </div>`;
}

// ===============================
// Helpers
// ===============================

function getWorkerById(id) {
  return S.workers.find((worker) => String(worker.id) === String(id));
}

function getWorkerExpenses(workerId) {
  const worker = getWorkerById(workerId);
  if (!worker) return 0;
  let total = Number(worker.expense || 0);
  const transactions = S.transactions || {};
  Object.values(transactions).forEach((dayTx) => {
    if (dayTx && dayTx[workerId] && dayTx[workerId].expense) {
      total += Number(dayTx[workerId].expense || 0);
    }
  });
  return total;
}

function getWorkerOvertime(workerId) {
  const worker = getWorkerById(workerId);
  if (!worker) return 0;
  let total = Number(worker.overtime || 0);
  const transactions = S.transactions || {};
  Object.values(transactions).forEach((dayTx) => {
    if (dayTx && dayTx[workerId] && dayTx[workerId].overtime) {
      total += Number(dayTx[workerId].overtime || 0);
    }
  });
  return total;
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
  if (!date) {
    return "-";
  }

  return new Date(date).toLocaleDateString("ar-EG");
}

function showWorkerError(message) {
  document.getElementById("workerProfile").innerHTML =
    `<div class="empty">⚠️<br>${message}</div>`;
}

// ===============================
// Back
// ===============================

document.getElementById("backBtn").onclick = () => {
  window.location.href = "workers.html";
};

document.addEventListener("DOMContentLoaded", loadWorker);
