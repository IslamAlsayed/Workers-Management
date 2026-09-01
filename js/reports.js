setupCommon();
renderNav("reports");

const fromInput = $("#from");
const toInput = $("#to");
const report = $("#report");
let rows;

const fromDate = new Date(new Date());
fromDate.setDate(new Date().getDate() - 6);

fromInput.value = formatDate(fromDate);
toInput.value = formatDate(new Date());

// تحويل Date إلى YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// التأكد من وجود Group فعال
function ensureActiveGroup() {
  if (!S || !S.groupId) {
    toast("يجب تسجيل الدخول أولاً", true);

    report.innerHTML = `
      <div class="card" style="text-align:center;padding:30px;margin-top:20px">🔐<br>
        <small>يجب تسجيل الدخول أولاً</small>
      </div>`;

    return false;
  }

  return true;
}

// حساب تقرير الفترة
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

  // حساب البيانات لكل عامل
  // const rows = workers
  rows = workers
    .map((worker) => {
      let days = 0;

      Object.entries(attendance).forEach(([date, workersAttendance]) => {
        if (date < from || date > to) return;
        if (workersAttendance?.[worker.id] === true) {
          days++;
        }
      });

      const rate = Number(worker.rate) || 0;

      let expense = 0;
      let overtime = 0;

      const transactions = S.transactions || {};

      Object.entries(transactions).forEach(([date, dayTx]) => {
        if (date < from || date > to) return;
        const tx = dayTx?.[worker.id];
        if (!tx) return;
        expense += Number(tx.expense || 0);
        overtime += Number(tx.overtime || 0);
      });

      const wage = days * rate;
      const net = wage - expense + overtime;

      return { ...worker, days, wage, expense, overtime, net };
    })

    // عرض العمال الذين لديهم نشاط فقط
    .filter((worker) => {
      return worker.days > 0 || worker.expense > 0 || worker.overtime > 0;
    });

  // إجماليات التقرير
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

  // لا يوجد عمال
  if (!rows.length) {
    report.innerHTML = `
        <div class="card" style="text-align:center;padding:30px;margin-top:20px">📊<br>
            <small>لا توجد بيانات لهذه الفترة</small>
        </div>`;
    window.lastReportRows = [];
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
            <div><b><a href="worker.html?id=${worker.id}" class="link">"${worker.name || "بدون اسم"}</a></b><small>${worker.profession || ""}</small></div>
            <div>${money(worker.rate)}</div>
            <div>${worker.days}</div>
            <div class="expense">${money(worker.expense)}</div>
            <div class="overtime">${money(worker.overtime)}</div>
            <div ${worker.net > 0 ? "class='net'" : ""}><b>${money(worker.net)}</b></div>
          </div>
          `,
      )
      .join("")}`;
  window.lastReportRows = rows;
}

// تصدير التقرير كملف PDF
function exportReportPDF() {
  return toast("لم يتم إنشاء ملف PDF حاليًا، سيتم توفير الميزة لاحقًا", null);
  return toast("ميزة تصدير PDF غير متاحة حاليًا", null);

  if (!navigator.onLine) {
    return toast("تصدير PDF يحتاج اتصالًا بالإنترنت", true);
  }

  // باقي كود PDF...
}

// طباعة التقرير
function printReport() {
  const from = fromInput.value;
  const to = toInput.value;
  const printRangeEl = document.getElementById("printDateRange");
  if (printRangeEl) {
    printRangeEl.textContent = `الفترة من ${from} إلى ${to}`;
  }
  window.print();
}

// تصدير التقرير كملف CSV / Excel
function exportReportCSV() {
  const rows = window.lastReportRows || [];
  if (!rows.length) {
    return toast("لا توجد بيانات لتصديرها", true);
  }

  const from = fromInput.value;
  const to = toInput.value;
  const headers = [
    "الاسم",
    "المهنة",
    "اليومية",
    "أيام الحضور",
    "المصاريف",
    "الإضافي",
    "الصافي المستحق",
  ];

  const csvLines = [headers.join(",")];

  rows.forEach((r) => {
    csvLines.push(
      [
        `"${r.name || ""}"`,
        `"${r.profession || ""}"`,
        r.rate || 0,
        r.days || 0,
        r.expense || 0,
        r.overtime || 0,
        r.net || 0,
      ].join(","),
    );
  });

  const blob = new Blob(["\uFEFF" + csvLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `تقرير_العمال_${from}_إلى_${to}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast("تم تصدير التقرير إلى Excel بنجاح", null, "#92ff8f");
}

// عرض التقرير
$("#reportBtn").onclick = () => {
  render();
  toast("تم تحديث التقرير", null, "#92ff8f");
};

$("#exportPdfBtn")?.addEventListener("click", exportReportPDF);
$("#printReportBtn")?.addEventListener("click", printReport);
$("#exportCsvBtn")?.addEventListener("click", exportReportCSV);

// fromInput.onchange = render;
// toInput.onchange = render;

render();
