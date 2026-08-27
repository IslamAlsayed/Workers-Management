setupCommon();
renderNav("settings");
$("#clearData").onclick = () => {
  if (!GROUP_ID || !S) {
    return toast("يجب تسجيل الدخول أولاً", true);
  }
  openModal("clearDataModal");
};

bindModal("clearDataModal");

$("#clearDataConfirm").onclick = () => {
  if (!GROUP_ID || !S) {
    return toast("يجب تسجيل الدخول أولاً", true);
  }
  const freshState = createInitialState();
  StateRepository.save(freshState, GROUP_ID);
  closeModal("clearDataModal");
  toast("تم مسح بيانات المجموعة", false, "#92ff8f", "#000");
};

$("#cancelDataModal").onclick = () => {
  closeModal("clearDataModal");
};

// Export JSON Backup
$("#exportBackup")?.addEventListener("click", () => {
  if (!GROUP_ID || !S) return toast("يجب تسجيل الدخول أولاً", true);

  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(S, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  link.setAttribute("download", `نسخة_احتياطية_${GROUP_ID}_${today()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast("تم تصدير النسخة الاحتياطية بنجاح");
});

// Import JSON Backup
const importFileInput = $("#importFileInput");
$("#importBackupBtn")?.addEventListener("click", () => {
  if (!GROUP_ID || !S) return toast("يجب تسجيل الدخول أولاً", true);
  importFileInput?.click();
});

importFileInput?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedData = JSON.parse(event.target.result);
      if (
        !importedData ||
        typeof importedData !== "object" ||
        !Array.isArray(importedData.workers)
      ) {
        return toast("ملف النسخة الاحتياطية غير صالح", true);
      }

      StateRepository.save(
        {
          ...importedData,
          groupId: GROUP_ID,
          updatedAt: Date.now(),
        },
        GROUP_ID,
      );

      toast(
        "تمت استعادة البيانات بنجاح! جاري التحديث...",
        false,
        "#92ff8f",
        "#000",
      );
      setTimeout(() => {
        location.reload();
      }, 1000);
    } catch {
      toast("تعذر قراءة ملف النسخة الاحتياطية", true);
    }
  };
  reader.readAsText(file);
});
