setupCommon();
renderNav("reports");
const d = new Date(),
  from = new Date(d);
from.setDate(d.getDate() - 6);
$("#from").value = from.toISOString().slice(0, 10);
$("#to").value = d.toISOString().slice(0, 10);
function render() {
  const rows = S.workers.map((w) => {
    const days = Object.values(S.attendance).filter(
      (m) => m[w.id] === true,
    ).length;
    const wage = days * w.rate;
    return { ...w, days, wage, net: wage - w.expense + w.overtime };
  });
  $("#report").innerHTML =
    `<div class="card report"><div class="reportHead"><span>الاسم</span><span>الأجر</span><span>الأيام</span><span>المصاريف</span><span>الإضافي</span><span>الإجمالي</span></div>${rows.map((w) => `<div class="reportRow"><div><b>${w.name}</b><small>${w.profession || ""}</small></div><div>${money(w.wage)}</div><div>${w.days}</div><div>${money(w.expense)}</div><div>${money(w.overtime)}</div><div>${money(w.net)}</div></div>`).join("")}</div>`;
}
$("#reportBtn").onclick = () => {
  render();
  toast("تم تحديث التقرير");
};
render();
