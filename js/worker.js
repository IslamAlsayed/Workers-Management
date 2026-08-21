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

  // document.getElementById("workerExpenses").textContent = money(
  //   getWorkerExpenses(worker.id),
  // );

  // document.getElementById("workerOvertime").textContent = money(
  //   getWorkerOvertime(worker.id),
  // );

  document.getElementById("workerDue").textContent = money(
    getWorkerDue(worker.id),
  );

  document.getElementById("workerNotes").textContent =
    worker.note || "لا توجد ملاحظات.";

  renderAttendance(worker.id);

  document.getElementById("editWorkerBtn").onclick = () => {
    window.location.href = `workers.html?edit=${worker.id}`;
  };
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

// function getWorkerExpenses(workerId) {
//   return S.expenses
//     .filter((item) => String(item.workerId) === String(workerId))
//     .reduce((total, item) => total + Number(item.amount || 0), 0);
// }

// function getWorkerOvertime(workerId) {
//   return S.overtime
//     .filter((item) => String(item.workerId) === String(workerId))
//     .reduce((total, item) => total + Number(item.amount || 0), 0);
// }

function getWorkerDue(workerId) {
  const worker = getWorkerById(workerId);

  if (!worker) {
    return 0;
  }

  const attendance = getWorkerAttendance(workerId);

  const baseSalary = attendance.present * Number(worker.rate || 0);

  // const expenses = getWorkerExpenses(workerId);

  // const overtime = getWorkerOvertime(workerId);

  // return baseSalary + overtime - expenses;
  return baseSalary;
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
