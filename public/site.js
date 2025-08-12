// Global behavior for button-style links
// Opens button links in a new tab and applies safe rel attributes.
(function () {
  // ...existing code...

  function enhanceButtonLinks(root = document) {
    const links = root.querySelectorAll("a.btn, a.cta");
    links.forEach((a) => {
      a.target = "_blank";
      const relParts = (a.getAttribute("rel") || "").split(" ").filter(Boolean);
      if (!relParts.includes("noopener")) relParts.push("noopener");
      if (!relParts.includes("noreferrer")) relParts.push("noreferrer");
      a.setAttribute("rel", relParts.join(" "));
    });
  }

  // Page load animation (ensure class is present early via body markup; remove on load)
  window.addEventListener("load", () => {
    // small delay to allow rendering before animating
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.body.classList.remove("is-preload");
        attemptHeroVideoAutoplay();
      })
    );
  });

  // Attempt to autoplay hero video with retries and fallbacks
  function attemptHeroVideoAutoplay() {
    const v = document.querySelector("video.hero-image");
    if (!v) return;
    // Don't autoplay if user prefers reduced motion
    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduce) return;

    let tries = 0;
    const maxTries = 4;

    function tryPlay(delay = 0) {
      if (tries >= maxTries) return;
      tries++;
      setTimeout(() => {
        const p = v.play();
        if (p && typeof p.then === "function") {
          p.catch(() => {
            // Mark failure for potential CSS fallback
            v.dataset.autoplay = "failed";
          });
        }
      }, delay);
    }

    if (v.readyState >= 2) tryPlay();
    else v.addEventListener("loadeddata", () => tryPlay(0), { once: true });

    // Retry on visibility change (e.g., returning to tab)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && v.paused) tryPlay(0);
    });

    // One-time user gesture fallback (first interaction)
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

  // Subtle transition on in-site navigation
  function isInternalLink(a) {
    const url = new URL(a.href, window.location.href);
    return url.origin === window.location.origin && !a.target;
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
    // ignore hash-only links
    const href = a.getAttribute("href") || "";
    if (href.startsWith("#")) return;

    e.preventDefault();
    document.body.classList.add("is-exiting");
    setTimeout(() => {
      window.location.href = a.href;
    }, 240);
  });

  // Mobile drawer navigation
  function initMobileNav() {
    const toggle = document.querySelector(".menu-toggle");
    const drawer = document.getElementById("mobile-drawer");
    const backdrop = document.querySelector(".drawer-backdrop");
    const closeBtn = document.querySelector(".menu-close");
    if (!toggle || !drawer || !backdrop || !closeBtn) return;

    let lastFocused = null;

    function getFocusable() {
      return Array.from(
        drawer.querySelectorAll(
          'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
    }

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
      (focusables[0] || closeBtn).focus();
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
        lastFocused.focus();
      } else {
        toggle.focus();
      }
    }

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      if (expanded) close();
      else open();
    });

    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);

    // Close when a drawer link is activated
    drawer.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      // Let page transition handler run; just close immediately for UX
      close();
    });

    // Ensure drawer closes if resizing above breakpoint
    window.addEventListener("resize", () => {
      if (window.innerWidth > 720) close();
    });
  }

  // Initialize features when DOM is ready
  function init() {
    enhanceButtonLinks();
    initMobileNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
