setupCommon();
renderNav("reports");

const fromInput = $("#from");
const toInput = $("#to");
const report = $("#report");
const fromDate = new Date(new Date());
fromDate.setDate(new Date().getDate() - 6);

fromInput.value = formatDate(fromDate);
toInput.value = formatDate(new Date());

/**
 * تحويل Date إلى YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * التأكد من وجود Group فعال
 */
function ensureActiveGroup() {
  if (!S || !S.groupId) {
    toast("يجب تسجيل الدخول أولاً", true);

    report.innerHTML = `
      <div class="card" style="text-align:center;padding:30px">🔐<br>
        <small>يجب تسجيل الدخول أولاً</small>
      </div>`;

    return false;
  }

  return true;
}

/**
 * حساب تقرير الفترة
 */
function render() {
  if (!ensureActiveGroup()) return;

  const from = fromInput.value;
  const to = toInput.value;

  if (!from || !to) {
    return toast("حدد الفترة المطلوبة", true);
  }

  if (from > to) {
    return toast("تاريخ البداية يجب أن يكون قبل تاريخ النهاية", true);
  }
  const workers = S.workers || [];
  const attendance = S.attendance || {};

  /**
   * حساب البيانات لكل عامل
   */
  const rows = workers.map((worker) => {
    let days = 0;

    /**
     * attendance شكلها:
     *
     * {
     *   "2026-08-20": {
     *      workerId: true
     *   }
     * }
     *
     * لذلك بنمر على الأيام الموجودة
     * ونحسب فقط الأيام الموجودة داخل الفترة.
     */
    Object.entries(attendance).forEach(([date, workersAttendance]) => {
      if (date < from || date > to) {
        return;
      }

      if (workersAttendance?.[worker.id] === true) {
        days++;
      }
    });

    const rate = Number(worker.rate) || 0;
    
    let expense = 0;
    let overtime = 0;
    const transactions = S.transactions || {};

    Object.entries(transactions).forEach(([date, dayTx]) => {
      if (date >= from && date <= to && dayTx?.[worker.id]) {
        expense += Number(dayTx[worker.id].expense || 0);
        overtime += Number(dayTx[worker.id].overtime || 0);
      }
    });

    if (expense === 0 && Number(worker.expense) > 0) expense = Number(worker.expense);
    if (overtime === 0 && Number(worker.overtime) > 0) overtime = Number(worker.overtime);

    const wage = days * rate;
    const net = wage - expense + overtime;

    return { ...worker, days, wage, expense, overtime, net };
  });

  /**
   * إجماليات التقرير
   */
  const totals = rows.reduce(
    (total, worker) => {
      total.days += worker.days;
      total.wage += worker.wage;
      total.expense += worker.expense;
      total.overtime += worker.overtime;
      total.net += worker.net;

      return total;
    },
    {
      days: 0,
      wage: 0,
      expense: 0,
      overtime: 0,
      net: 0,
    },
  );

  /**
   * لا يوجد عمال
   */
  if (!rows.length) {
    report.innerHTML = `
      <div class="card" style="text-align:center;padding:30px">👷<br>
        <small>لا يوجد عمال في هذه المجموعة</small>
      </div>`;
    return;
  }

  report.innerHTML = `
    <div class="card report">
      <div class="reportHead">
        <span>الاسم</span>
        <span>اليومية</span>
        <span>الأيام</span>
        <span>المصاريف</span>
        <span>الإضافي</span>
        <span>الإجمالي</span>
      </div>

      ${rows
        .map(
          (worker) => `
            <div class="reportRow">
              <div><b>${worker.name}</b><small>${worker.profession || ""}</small></div>
              <div>${money(worker.rate)}</div>
              <div>${worker.days}</div>

              <div ${worker.expense > 0 ? "class='expense'" : ""}>${money(worker.expense)}</div>
              <div ${worker.overtime > 0 ? "class='overtime'" : ""}>${money(worker.overtime)}</div>

              <div ${worker.net > 0 ? "class='net'" : ""}>
                <b>${money(worker.net)}</b>
                ${
                  worker.expense > 0
                    ? `<strong class="all-price">${money(worker.wage + worker.overtime)}</strong>`
                    : ""
                }
              </div>
            </div>
          `,
        )
        .join("")}

      <!-- الإجماليات -->
      <div class="reportRow reportTotal">
        <div><b>الإجمالي</b></div>
        <div>${money(totals.wage / (totals.days || 1))}</div>
        <div><b>${totals.days}</b></div>
        <div class="${totals.expense > 0 ? "expense" : ""}">${money(totals.expense)}</div>
        <div class="${totals.overtime > 0 ? "overtime" : ""}">${money(totals.overtime)}</div>
        <div class="${totals.net > 0 ? "net" : ""}"><b>${money(totals.net)}</b></div>
      </div>
    </div>
  `;

  window.lastReportRows = rows;
}

/**
 * تصدير التقرير كملف CSV / Excel
 */
function exportReportCSV() {
  const rows = window.lastReportRows || [];
  if (!rows.length) {
    return toast("لا توجد بيانات لتصديرها", true);
  }

  const from = fromInput.value;
  const to = toInput.value;
  const headers = ["الاسم", "المهنة", "اليومية", "أيام الحضور", "المصاريف", "الإضافي", "الصافي المستحق"];

  const csvLines = [
    headers.join(",")
  ];

  rows.forEach((r) => {
    csvLines.push([
      `"${r.name || ""}"`,
      `"${r.profession || ""}"`,
      r.rate || 0,
      r.days || 0,
      r.expense || 0,
      r.overtime || 0,
      r.net || 0
    ].join(","));
  });

  const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `تقرير_العمال_${from}_إلى_${to}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast("تم تصدير التقرير إلى Excel بنجاح");
}

/**
 * الأحداث
 */
$("#reportBtn").onclick = () => {
  render();
  toast("تم تحديث التقرير");
};

$("#printReportBtn")?.addEventListener("click", () => window.print());
$("#exportCsvBtn")?.addEventListener("click", exportReportCSV);

fromInput.onchange = render;
toInput.onchange = render;

render();
