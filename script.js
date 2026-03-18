(() => {
  // Small nicety: for in-page anchor navigation, focus the target so keyboard users land "inside" the section.
  function focusAnchorTarget(hash) {
    if (!hash || hash.length < 2) return;
    const id = decodeURIComponent(hash.slice(1));
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }

  window.addEventListener("hashchange", () => focusAnchorTarget(location.hash), { passive: true });
  window.addEventListener("DOMContentLoaded", () => focusAnchorTarget(location.hash), { once: true });

  function saveContactSubmission(payload) {
    try {
      const existing = JSON.parse(localStorage.getItem("contact_submissions") || "[]");
      existing.unshift({ ...payload, at: new Date().toISOString() });
      localStorage.setItem("contact_submissions", JSON.stringify(existing.slice(0, 25)));
    } catch {
      // ignore storage errors
    }
  }

  function toMailto({ name, email, message }) {
    const subject = `Project inquiry from ${name || "website"}`;
    const body = [
      `Name: ${name || ""}`,
      `Email: ${email || ""}`,
      "",
      message || "",
    ].join("\n");

    const params = new URLSearchParams({
      subject,
      body,
    });

    return `mailto:buildtounderstand@gmail.com?${params.toString()}`;
  }

  async function submitContactForm(form) {
    const status = document.getElementById("contact-form-status");
    const submitButton = form.querySelector('button[type="submit"]');
    const action = form.getAttribute("action") || "";

    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      message: String(fd.get("message") || "").trim(),
    };

    if (status) status.textContent = "";
    if (submitButton) submitButton.disabled = true;

    // Always keep a local copy (helps when no backend is configured).
    saveContactSubmission(payload);

    const needsConfig = !action || action.includes("YOUR_FORMSPREE_ID");
    if (needsConfig) {
      if (status) {
        status.innerHTML =
          'Form is not connected yet. I saved your message in this browser and opened an email draft. <a href="' +
          toMailto(payload) +
          '">Send via email</a>.';
      }
      window.location.href = toMailto(payload);
      if (submitButton) submitButton.disabled = false;
      return;
    }

    try {
      const res = await fetch(action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: fd,
      });

      if (!res.ok) throw new Error("Bad response");

      form.reset();
      if (status) status.textContent = "Thanks — message sent.";
    } catch {
      if (status) {
        status.innerHTML =
          'Could not send via form. I saved your message in this browser and opened an email draft. <a href="' +
          toMailto(payload) +
          '">Send via email</a>.';
      }
      window.location.href = toMailto(payload);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }

  window.addEventListener(
    "DOMContentLoaded",
    () => {
      const form = document.getElementById("contact-form");
      if (!(form instanceof HTMLFormElement)) return;
      form.addEventListener("submit", (e) => {
        // If the page is opened as a local file (file://), XHR/fetch can be blocked by CORS.
        // In that case, let the browser submit the form normally to Formspree.
        if (location.protocol === "file:") return;

        e.preventDefault();
        submitContactForm(form);
      });
    },
    { once: true }
  );
})();

document.querySelectorAll(".case-testimonials").forEach((section) => {
  const track = section.querySelector("[data-testimonials-slider]");
  const prev = section.querySelector(".case-testimonials__button--prev");
  const next = section.querySelector(".case-testimonials__button--next");

  if (!track || !prev || !next) return;

  const getScrollAmount = () => {
    const card = track.querySelector(".case-testimonial");
    if (!card) return 320;

    const gap = 18;
    return card.getBoundingClientRect().width + gap;
  };

  prev.addEventListener("click", () => {
    track.scrollBy({ left: -getScrollAmount(), behavior: "smooth" });
  });

  next.addEventListener("click", () => {
    track.scrollBy({ left: getScrollAmount(), behavior: "smooth" });
  });
});