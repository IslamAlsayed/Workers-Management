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
