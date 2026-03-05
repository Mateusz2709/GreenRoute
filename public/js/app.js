// public/js/app.js
(function () {
  // ---------- MOBILE NAV DRAWER ----------
  const burger = document.querySelector("[data-burger]");
  const drawer = document.querySelector("[data-drawer]");

  // Keep aria-expanded in sync so screen readers understand whether the menu is open.
  function setExpanded(isOpen) {
    if (!burger) return;
    burger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  // Open/close helpers so all close actions behave the same way.
  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add("open");
    setExpanded(true);
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("open");
    setExpanded(false);
  }

  // Toggle on burger click.
  function toggleDrawer() {
    if (!drawer) return;
    const isOpen = drawer.classList.contains("open");
    if (isOpen) closeDrawer();
    else openDrawer();
  }

  if (burger && drawer) {
    // Open/close from the burger button.
    burger.addEventListener("click", toggleDrawer);

    // Close after clicking a link, so the page navigation feels natural on mobile.
    drawer.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link) closeDrawer();
    });

    // ESC key is a common shortcut to close mobile drawers, so support that as well.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawer.classList.contains("open")) {
        closeDrawer();
      }
    });

    // Close if the user clicks outside the drawer.
    document.addEventListener("click", (e) => {
      if (!drawer.classList.contains("open")) return;

      const clickedInsideDrawer = drawer.contains(e.target);
      const clickedBurger = burger.contains(e.target);

      if (!clickedInsideDrawer && !clickedBurger) closeDrawer();
    });
  }

  // ---------- ALERTS (CLOSE BUTTONS) ----------
  // use event delegation to handle all current and future alert close buttons with one listener.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-alert-close]");
    if (!btn) return;

    const alert = btn.closest(".alert");
    if (alert) alert.remove();
  });

  // Auto-hide success messages after a short time, but keep errors visible.
  window.addEventListener("load", () => {
    document.querySelectorAll(".alert.alert-success").forEach((a) => {
      setTimeout(() => {
        if (a && a.parentNode) a.remove();
      }, 5000);
    });
  });

  // ---------- CONFIRM DANGEROUS ACTIONS ----------
  // Any element with data-confirm will show a confirmation dialog before continuing.
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-confirm]");
    if (!el) return;

    const msg = el.getAttribute("data-confirm") || "Are you sure?";
    if (!confirm(msg)) e.preventDefault();
  });

  // ---------- LIVE EMISSIONS ESTIMATE (JOURNEY FORM) ----------
  // Updates the estimate while the user types/selects a mode, so the result is visible immediately.
  const distanceEl = document.querySelector("[data-distance]");
  const modeEl = document.querySelector("[data-mode]");
  const outEl = document.querySelector("[data-emissions-output]");
  const factorEl = document.querySelector("[data-factor-output]");

  function calcEstimate() {
    // If the form is not on this page, do nothing.
    if (!distanceEl || !modeEl || !outEl) return;

    // Read the distance and the selected mode’s emission factor (stored in the option data attribute).
    const km = parseFloat(distanceEl.value || "0");
    const selected = modeEl.options[modeEl.selectedIndex];
    const factor = parseFloat(selected?.getAttribute("data-factor") || "0");

    // Keep calculations safe when inputs are empty or invalid.
    const safeKm = Number.isFinite(km) ? km : 0;
    const safeFactor = Number.isFinite(factor) ? factor : 0;

    const est = safeKm * safeFactor;

    // Show a rounded number to keep the UI clean and easy to read.
    outEl.textContent = Number.isFinite(est) ? Math.round(est) : "0";
    if (factorEl) factorEl.textContent = Number.isFinite(safeFactor) ? String(safeFactor) : "0";
  }

  if (distanceEl && modeEl && outEl) {
    // Recalculate on typing or changing the transport mode.
    ["input", "change"].forEach((evt) => {
      distanceEl.addEventListener(evt, calcEstimate);
      modeEl.addEventListener(evt, calcEstimate);
    });

    // Calculate once on load so the UI is correct even with pre-filled values.
    calcEstimate();
  }
})();