(() => {
  const message = "当前为静态展示版本，内容不会提交或发送。";
  function notify() {
    let notice = document.getElementById("static-site-notice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "static-site-notice";
      notice.setAttribute("role", "status");
      Object.assign(notice.style, {
        position: "fixed", left: "50%", bottom: "32px", transform: "translateX(-50%)",
        zIndex: "2147483647", padding: "12px 20px", color: "#fff", background: "rgba(0,0,0,.82)",
        font: "14px/1.5 Arial, sans-serif", borderRadius: "3px", boxShadow: "0 4px 16px rgba(0,0,0,.22)",
        opacity: "0", transition: "opacity .2s ease", pointerEvents: "none"
      });
      document.body.appendChild(notice);
    }
    notice.textContent = message;
    notice.style.opacity = "1";
    clearTimeout(notice._timer);
    notice._timer = setTimeout(() => { notice.style.opacity = "0"; }, 2400);
  }
  document.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    notify();
  }, true);
})();
