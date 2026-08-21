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

  $("#report").innerHTML = `<div class="card report">
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
        (w) =>
          `<div class="reportRow">
          <div><b>${w.name}</b><small>${w.profession || ""}</small></div>
          <div>${money(w.rate)}</div>
          <div>${w.days}</div>
          <div ${w.expense > 0 ? "class='expense'" : ""}>${money(w.expense)}</div>
          <div ${w.overtime > 0 ? "class='overtime'" : ""}>${money(w.overtime)}</div>
          <div ${w.net > 0 ? "class='net'" : ""}>
            <b>${money(w.net)}</b>
            ${w.expense > 0 ? "<strong class='all-price'>" + money(w.wage + w.overtime) + "</strong>" : ""}
          </div>
          </div>`,
      )
      .join("")}</div>`;
}
$("#reportBtn").onclick = () => {
  render();
  toast("تم تحديث التقرير");
};
render();

// <div>
//   <b class='net'>${money(w.net)}</b><br/>
//   ${w.expense > 0 ? "<small class='expense'>" + money(w.expense) + "</small>" : ""}
//   ${w.overtime > 0 ? "<small class='overtime'>  | " + money(w.overtime) + "</small>" : ""}
// </div>
