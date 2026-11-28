(function () {
  "use strict";
  var body = document.body;
  var timer,
    restoreFocus,
    wakingKey,
    suppressClickUntil = 0;
  function get(id) {
    return document.getElementById(id);
  }
  function eligible() {
    return (
      !document.hidden &&
      body.dataset.view === "home" &&
      get("scrim").hidden &&
      get("recitation").paused &&
      get("adhan").paused
    );
  }
  function enter() {
    if (!eligible() || body.classList.contains("ambient")) return;
    restoreFocus = document.activeElement;
    body.classList.add("ambient");
    get("view-home").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function reset() {
    clearTimeout(timer);
    if (!body.classList.contains("ambient") && eligible())
      timer = setTimeout(enter, 120000);
  }
  function wake() {
    body.classList.remove("ambient");
    if (
      restoreFocus &&
      restoreFocus !== body &&
      restoreFocus.getClientRects().length
    )
      restoreFocus.focus();
    else get("nav-home").focus();
    reset();
  }
  function consume(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function activity(event) {
    if (body.classList.contains("ambient")) {
      if (event.type === "pointermove") return;
      if (event.type === "keydown") wakingKey = event.keyCode;
      if (
        event.type === "pointerdown" ||
        event.type === "touchstart" ||
        event.type === "keydown"
      )
        suppressClickUntil = Date.now() + 500;
      consume(event);
      wake();
      return;
    }
    if (
      event.type === "pointerdown" ||
      (event.type === "keydown" && !event.repeat)
    )
      suppressClickUntil = 0;
    if (
      (event.type === "keydown" &&
        wakingKey === event.keyCode &&
        event.repeat) ||
      (event.type === "click" && Date.now() < suppressClickUntil)
    ) {
      consume(event);
      return;
    }
    reset();
  }
  ["keydown", "pointerdown", "click", "pointermove", "touchstart"].forEach(
    function (name) {
      window.addEventListener(name, activity, {
        capture: true,
        passive: false,
      });
    },
  );
  window.addEventListener(
    "keyup",
    function (event) {
      if (event.keyCode === wakingKey) {
        wakingKey = null;
        consume(event);
      }
    },
    true,
  );
  get("ambient").onclick = function () {
    get("close-settings").click();
    if (body.dataset.view !== "home") get("nav-home").click();
    if (eligible()) enter();
  };
  var observer = new MutationObserver(reset);
  observer.observe(body, { attributes: true, attributeFilter: ["data-view"] });
  observer.observe(get("scrim"), {
    attributes: true,
    attributeFilter: ["hidden"],
  });
  document.addEventListener("visibilitychange", reset);
  [get("recitation"), get("adhan")].forEach(function (player) {
    ["playing", "pause", "ended"].forEach(function (event) {
      player.addEventListener(event, reset);
    });
  });
  reset();
  // Change the reflection point only when focus moves. The room is static at rest.
  var lastCenter;
  document.addEventListener("focusin", function (event) {
    var control = event.target.closest(
      ".channel,.tile,.remembrance,.app-link,.tabs button,.quiet",
    );
    if (!control) return;
    var box = control.getBoundingClientRect();
    var center = box.left + box.width / 2;
    var direction = lastCenter == null ? 0 : Math.sign(center - lastCenter);
    control.style.setProperty(
      "--optic-x",
      direction < 0 ? "78%" : direction > 0 ? "22%" : "48%",
    );
    control.style.setProperty("--focus-tilt", direction * -0.85 + "deg");
    lastCenter = center;
  });
})();
