// Global behavior for button-style links
// Opens button links in a new tab and applies safe rel attributes.
(function () {
  /** =======================================================================
   * site.js (Client Enhancement Layer)
   * -----------------------------------------------------------------------
   * RESPONSIBILITIES:
   *  1. External link hardening for button-style anchors (enhanceButtonLinks)
   *  2. Page entry/exit micro-transitions (preload removal + exit class)
   *  3. Hero video autoplay with resilient retry & reduced-motion respect
   *  4. Intercept internal navigations for fade transition (isInternalLink)
   *  5. Accessible mobile drawer navigation (focus trap, ESC, ARIA state)
   *  6. Central init sequencing (init)
   * DESIGN NOTES:
   *  - Pure vanilla JS (no dependencies) for minimal payload.
   *  - Progressive enhancement: site is usable without JS.
   *  - Defensive checks (query selectors may return null on some pages).
   *  - Avoids layout thrash by deferring heavy work to load & rAF.
   * ======================================================================= */

  // -----------------------------------------------------------------------
  // 1. Button / CTA Link Hardening
  // -----------------------------------------------------------------------
  function enhanceButtonLinks(root = document) {
    const links = root.querySelectorAll("a.btn, a.cta");
    links.forEach((a) => {
      a.target = "_blank"; // Open in new tab
      const relParts = (a.getAttribute("rel") || "").split(" ").filter(Boolean);
      if (!relParts.includes("noopener")) relParts.push("noopener"); // Prevent window.opener access
      if (!relParts.includes("noreferrer")) relParts.push("noreferrer"); // Strip referrer (privacy)
      a.setAttribute("rel", relParts.join(" "));
    });
  }

  // -----------------------------------------------------------------------
  // 2. Page Load Animation Removal & Hero Autoplay Kickoff
  // -----------------------------------------------------------------------
  // Body starts with `is-preload` (set in HTML) to allow CSS transition.
  // Removing it inside a double rAF ensures first paint occurs before anim.
  window.addEventListener("load", () => {
    // small delay to allow rendering before animating
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.body.classList.remove("is-preload");
        attemptHeroVideoAutoplay(); // safe to call even if no hero video present
      })
    );
  });

  // -----------------------------------------------------------------------
  // 3. Hero Video Autoplay (Resilient Strategy)
  // -----------------------------------------------------------------------
  // Goals: attempt silent autoplay; respect prefers-reduced-motion; retry on visibility change
  // & first user interaction. Marks failure via data attribute for optional UI feedback.
  function attemptHeroVideoAutoplay() {
    const v = document.querySelector("video.hero-image");
    if (!v) return; // No hero video on this page

    // Don't autoplay if user prefers reduced motion (accessibility compliance)
    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduce) return;

    let tries = 0;
    const maxTries = 4; // Conservative retry cap to avoid runaway attempts

    function tryPlay(delay = 0) {
      if (tries >= maxTries) return;
      tries++;
      setTimeout(() => {
        const p = v.play();
        if (p && typeof p.then === "function") {
          p.catch(() => {
            // Mark failure for potential CSS fallback (e.g., pulse ring or static poster)
            v.dataset.autoplay = "failed";
          });
        }
      }, delay);
    }

    // If metadata is already ready, play immediately; else wait for load
    if (v.readyState >= 2) tryPlay();
    else v.addEventListener("loadeddata", () => tryPlay(0), { once: true });

    // Retry when returning to the tab (mobile backgrounding or tab switch)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && v.paused) tryPlay(0);
    });

    // One-time user gesture fallback (first interaction events)
    ["touchstart", "click", "scroll"].forEach((evt) => {
      window.addEventListener(
        evt,
        () => {
          if (v.paused) tryPlay(0);
        },
        { once: true, passive: true }
      );
    });
  }

  // -----------------------------------------------------------------------
  // 4. Internal Navigation Intercept for Fade Transition
  // -----------------------------------------------------------------------
  function isInternalLink(a) {
    const url = new URL(a.href, window.location.href);
    return url.origin === window.location.origin && !a.target; // exclude external / new-tab links
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    if (!isInternalLink(a)) return;
    // allow modifier keys/new tab behavior
    if (
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      a.target === "_blank"
    )
      return;
    // ignore hash-only links (in-page anchors)
    const href = a.getAttribute("href") || "";
    if (href.startsWith("#")) return;

    // Trigger exit animation then navigate
    e.preventDefault();
    document.body.classList.add("is-exiting");
    setTimeout(() => {
      window.location.href = a.href;
    }, 240); // Sync with CSS transition duration
  });

  // -----------------------------------------------------------------------
  // 5. Mobile Drawer Navigation (Accessible Off-Canvas Panel)
  // -----------------------------------------------------------------------
  function initMobileNav() {
    const toggle = document.querySelector(".menu-toggle");
    const drawer = document.getElementById("mobile-drawer");
    const backdrop = document.querySelector(".drawer-backdrop");
    const closeBtn = document.querySelector(".menu-close");
    if (!toggle || !drawer || !backdrop || !closeBtn) return; // Fail gracefully if markup missing

    let lastFocused = null; // Element to restore focus to on close

    function getFocusable() {
      return Array.from(
        drawer.querySelectorAll(
          'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
    }

    // Basic focus trap implementation keeps tab focus within drawer while open
    function trapTab(e) {
      if (!document.body.classList.contains("nav-open")) return;
      if (e.key !== "Tab") return;
      const focusables = getFocusable();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function onKeydown(e) {
      if (e.key === "Escape") {
        close();
      } else {
        trapTab(e);
      }
    }

    function open() {
      if (document.body.classList.contains("nav-open")) return;
      lastFocused = document.activeElement;
      document.body.classList.add("nav-open");
      drawer.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      backdrop.removeAttribute("hidden");
      const focusables = getFocusable();
      (focusables[0] || closeBtn).focus(); // Focus first logical element
      document.addEventListener("keydown", onKeydown);
    }

    function close() {
      if (!document.body.classList.contains("nav-open")) return;
      document.body.classList.remove("nav-open");
      drawer.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      backdrop.setAttribute("hidden", "");
      document.removeEventListener("keydown", onKeydown);
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus(); // Restore invoking control
      } else {
        toggle.focus();
      }
    }

    // Toggle handlers
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      if (expanded) close();
      else open();
    });

    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close); // Click outside closes drawer

    // Close when a drawer link is activated (navigation will trigger page transition)
    drawer.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      close();
    });

    // Auto-close on viewport resize above mobile breakpoint (prevent stuck state)
    window.addEventListener("resize", () => {
      if (window.innerWidth > 720) close();
    });
  }

  // -----------------------------------------------------------------------
  // 6. Initialization Sequencing
  // -----------------------------------------------------------------------
  function init() {
    enhanceButtonLinks();
    initMobileNav();
  }

  // DOM readiness gate (covers both cached & fresh loads)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
