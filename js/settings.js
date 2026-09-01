setupCommon();
renderNav("settings");
$("#clearData").onclick = () => {
  if (!GROUP_ID || !S) {
    return toast("يجب تسجيل الدخول أولاً", true);
  }
  openModal("clearDataModal");
};

bindModal("clearDataModal");

// مسح بيانات المجموعة
$("#clearDataConfirm").onclick = () => {
  if (!GROUP_ID || !S) {
    return toast("يجب تسجيل الدخول أولاً", true);
  }

  const freshState = createEmptyState();
  StateRepository.save(freshState, GROUP_ID);

  closeModal("clearDataModal");
  toast("تم مسح بيانات المجموعة", false, UPDATE_NOTIFICATION_COLOR);
};

$("#cancelDataModal").onclick = () => {
  closeModal("clearDataModal");
};

const currencySetting = $("#currencySetting");
const currencyModal = $("#currencyModal");
const currencySelect = $("#currencySelect");
const currencyText = $("#currencyText");

function currencyName(currency) {
  return currency === "SAR" ? "ريال سعودي" : "جنيه مصري";
}

function updateCurrencyUI() {
  const currency = S?.currency || "EGP";

  if (currencyText) {
    currencyText.textContent = currencyName(currency);
  }

  if (currencySelect) {
    currencySelect.value = currency;
  }
}

currencySetting?.addEventListener("click", () => {
  currencySelect.value = S?.currency || "EGP";
  openModal("currencyModal");
});

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

$("#saveCurrency")?.addEventListener("click", () => {
  if (!ensureActiveGroup()) return;

  const currency = currencySelect.value;

  if (!["EGP", "SAR"].includes(currency)) {
    return toast("عملة غير صالحة", true);
  }
  S.currency = currency;
  save();
  closeModal("currencyModal");
  updateCurrencyUI();
  toast("تم تغيير العملة", null, UPDATE_NOTIFICATION_COLOR);
});

bindModal("currencyModal");
updateCurrencyUI();

// Export JSON Backup
$("#exportBackup")?.addEventListener("click", exportJsonData);

// Export JSON Backup Before Clear
$("#backupBeforeClear")?.addEventListener("click", () => {
  exportJsonData();
  setTimeout(() => {
    document.getElementById("backupBeforeClearWarningBox").style.display =
      "none";
  }, 3000);
});

function exportJsonData() {
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

  toast("تم تصدير النسخة الاحتياطية بنجاح", null, UPDATE_NOTIFICATION_COLOR);
}

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
        return toast(
          "ملف النسخة الاحتياطية غير صالح",
          true,
          ERROR_NOTIFICATION_COLOR,
        );
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
        UPDATE_NOTIFICATION_COLOR,
      );
      setTimeout(() => {
        location.reload();
      }, 1000);
    } catch {
      toast("تعذر قراءة ملف النسخة الاحتياطية", true, ERROR_NOTIFICATION_COLOR);
    }
  };
  reader.readAsText(file);
});
