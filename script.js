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
      if (status) status.textContent = "Thanks! Message sent.";
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

/* ── Burger menu ── */

document.addEventListener("DOMContentLoaded", () => {
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");
  if (!burger || !nav) return;

  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Open menu");
    });
  });
});

/* ── Quiz ── */

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("quiz-overlay");
  const openBtn = document.getElementById("quiz-open");
  const closeBtn = document.getElementById("quiz-close");
  const bar = document.getElementById("quiz-bar");

  if (!overlay || !openBtn) return;

  const steps = overlay.querySelectorAll(".quiz-step");
  const totalQ = 4;
  let current = 0;
  const answers = {};

  function showStep(idx) {
    steps.forEach((s) => (s.hidden = true));
    const target = overlay.querySelector(`[data-step="${idx}"]`);
    if (target) {
      target.hidden = false;
      const pct = idx === "result" ? 100 : ((idx + 1) / totalQ) * 100;
      bar.style.width = pct + "%";
    }
  }

  function open() {
    current = 0;
    Object.keys(answers).forEach((k) => delete answers[k]);
    showStep(0);
    bar.style.width = "0%";
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
  });

  overlay.querySelectorAll(".quiz-options button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const step = btn.closest(".quiz-step");
      const stepIdx = Number(step.dataset.step);
      answers[stepIdx] = btn.dataset.value;

      if (stepIdx < totalQ - 1) {
        current = stepIdx + 1;
        showStep(current);
      } else {
        showResult();
      }
    });
  });

  function showResult() {
    const type = answers[0];
    const priority = answers[3];

    const titleEl = document.getElementById("quiz-result-title");
    const textEl = document.getElementById("quiz-result-text");
    const ctaEl = document.getElementById("quiz-result-cta");

    let title = "";
    let text = "";
    let href = "#services";
    let ctaLabel = "See examples";

    if (type === "quiz" || priority === "conversions") {
      title = "You need a marketing quiz";
      text = "Something people actually finish. And that turns clicks into leads.";
      href = "#quizzes";
      ctaLabel = "Show me quiz examples";
    } else if (type === "explainer" || type === "unsure") {
      title = "You need an interactive explainer";
      text = "A way to make complex things feel simple.";
      href = "#longreads";
      ctaLabel = "Show me explainer examples";
    } else if (type === "game") {
      title = "You need an educational game";
      text = "Something people don't just read. They play it.";
      href = "#longreads";
      ctaLabel = "Show me game examples";
    }

    if (priority === "speed") {
      text += " We prototype with AI. Expect something real in days, not months.";
    } else if (priority === "quality") {
      text += " Designed and built to feel premium. Not like a template.";
    } else if (priority === "engagement") {
      text += " Built so people actually stick around and finish.";
    } else if (priority === "conversions") {
      text += " Built to turn attention into action.";
    }

    titleEl.textContent = title;
    textEl.textContent = text;
    ctaEl.textContent = ctaLabel + " →";
    ctaEl.href = href;

    ctaEl.addEventListener(
      "click",
      () => {
        close();
      },
      { once: true }
    );

    showStep("result");
  }
});