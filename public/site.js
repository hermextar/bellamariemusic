// Global behavior for button-style links
// Opens button links in a new tab and applies safe rel attributes.
(function () {
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
      })
    );
  });

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
    }, 240); // slightly longer for a smoother feel
  });

  // Initialize features when DOM is ready
  function init() {
    enhanceButtonLinks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
