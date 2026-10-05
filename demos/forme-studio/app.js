(() => {
  "use strict";
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [
    ...parent.querySelectorAll(selector),
  ];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const connection = navigator.connection;
  let userPaused = reduced.matches || Boolean(connection?.saveData);
  const motionButton = $("[data-global-motion]");
  const ambient = $("#ambient-film");
  const ambientButton = $("#motion-toggle");
  let filmVisible = false;
  let backgroundPaused = false;
  let ambientRequest = 0;
  let opener = null;

  function syncMotion() {
    document.documentElement.classList.toggle("motion-paused", userPaused);
    if (motionButton)
      motionButton.textContent = userPaused ? "Enable motion" : "Pause motion";
    syncAmbient();
  }
  async function syncAmbient() {
    if (!ambient) return;
    const request = ++ambientRequest;
    const shouldPlay =
      filmVisible &&
      !userPaused &&
      !backgroundPaused &&
      !document.hidden &&
      !document.querySelector("dialog[open]");
    if (!shouldPlay) {
      ambient.pause();
      updateAmbientButton();
      return;
    }
    if (!ambient.getAttribute("src")) ambient.src = ambient.dataset.src;
    try {
      await ambient.play();
      if (
        request !== ambientRequest ||
        userPaused ||
        backgroundPaused ||
        document.hidden ||
        !filmVisible ||
        document.querySelector("dialog[open]")
      )
        ambient.pause();
    } catch {
      /* The poster remains available when autoplay is blocked. */
    }
    updateAmbientButton();
  }
  function updateAmbientButton() {
    if (!ambientButton) return;
    ambientButton.textContent = ambient.paused
      ? "Play background motion"
      : "Pause background motion";
    ambientButton.setAttribute("aria-pressed", String(!ambient.paused));
  }
  motionButton?.addEventListener("click", () => {
    userPaused = !userPaused;
    syncMotion();
  });
  ambientButton?.addEventListener("click", () => {
    if (ambient.paused) {
      userPaused = false;
      backgroundPaused = false;
    } else backgroundPaused = true;
    syncMotion();
  });
  reduced.addEventListener("change", () => {
    userPaused = reduced.matches;
    syncMotion();
  });
  document.addEventListener("visibilitychange", syncAmbient);
  ambient?.addEventListener("play", updateAmbientButton);
  ambient?.addEventListener("pause", updateAmbientButton);
  if ("IntersectionObserver" in window) {
    document.documentElement.classList.add("motion-ready");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
    );
    $$(".reveal").forEach((el) => revealObserver.observe(el));
    if (ambient)
      new IntersectionObserver(
        (entries) => {
          filmVisible = entries[0].isIntersecting;
          syncAmbient();
        },
        { threshold: 0.2 },
      ).observe(ambient);
  }
  syncMotion();

  const readingProgress = $(".reading-progress > span");
  const story = $(".journal-story");
  if (readingProgress && story) {
    let scheduled = false;
    const updateReadingProgress = () => {
      const rect = story.getBoundingClientRect();
      const distance = Math.max(1, rect.height - innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      readingProgress.style.transform = `scaleX(${progress})`;
      scheduled = false;
    };
    const scheduleReadingProgress = () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(updateReadingProgress);
      }
    };
    window.addEventListener("scroll", scheduleReadingProgress, {
      passive: true,
    });
    window.addEventListener("resize", scheduleReadingProgress);
    window.addEventListener("load", scheduleReadingProgress);
    updateReadingProgress();
  }

  const menuButton = $(".menu-toggle");
  const nav = $("#navigation");
  function closeMenu() {
    nav?.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
  }
  menuButton?.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("open", open);
  });
  $$("a", nav || document.createElement("div")).forEach((a) =>
    a.addEventListener("click", closeMenu),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav?.classList.contains("open")) {
      closeMenu();
      menuButton.focus();
    }
  });

  function openDialog(dialog, trigger) {
    if (!dialog || typeof dialog.showModal !== "function") return false;
    const returnTarget = trigger?.closest("dialog")
      ? opener
      : trigger || document.activeElement;
    $$("dialog[open]").forEach((other) => other.close());
    opener = returnTarget;
    document.body.classList.add("modal-open");
    dialog.showModal();
    syncAmbient();
    return true;
  }
  $$("dialog").forEach((dialog) => {
    $("[data-close]", dialog)?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (dialog.id === "film-dialog") {
        const player = $("#film-player");
        player.pause();
        player.removeAttribute("src");
        player.load();
      }
      if (!document.querySelector("dialog[open]")) {
        document.body.classList.remove("modal-open");
        if (opener?.isConnected) opener.focus({ preventScroll: true });
      }
      syncAmbient();
    });
  });

  const storyImages = $$("[data-story-image]");
  const storyImageDialog = $("#story-image-dialog");
  let currentStoryImage = 0;
  function renderStoryImage(index) {
    currentStoryImage = (index + storyImages.length) % storyImages.length;
    const link = storyImages[currentStoryImage];
    const sourceImage = $("img", link);
    const viewer = $("#story-viewer-image");
    viewer.src = link.getAttribute("href");
    viewer.alt = sourceImage.alt;
    viewer.width = sourceImage.width;
    viewer.height = sourceImage.height;
    $("#story-image-title").textContent = link.dataset.title;
    const credit = $(".story-photo-credit", link.closest("figure"));
    $("#story-viewer-credit").replaceChildren(
      ...[...credit.childNodes].map((node) => node.cloneNode(true)),
    );
    $("#story-image-position").textContent =
      `${String(currentStoryImage + 1).padStart(2, "0")} / ${String(storyImages.length).padStart(2, "0")}`;
  }
  storyImages.forEach((link, index) =>
    link.addEventListener("click", (event) => {
      if (typeof storyImageDialog?.showModal !== "function") return;
      event.preventDefault();
      renderStoryImage(index);
      openDialog(storyImageDialog, link);
    }),
  );
  $("#previous-story-image")?.addEventListener("click", () =>
    renderStoryImage(currentStoryImage - 1),
  );
  $("#next-story-image")?.addEventListener("click", () =>
    renderStoryImage(currentStoryImage + 1),
  );
  storyImageDialog?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      renderStoryImage(
        currentStoryImage + (event.key === "ArrowRight" ? 1 : -1),
      );
    }
  });

  const projects = window.FORME_PROJECTS || [];
  let currentProject = 0;
  let visibleProjects = projects;
  const projectDialog = $("#project-dialog");
  function renderProject(index) {
    currentProject = (index + visibleProjects.length) % visibleProjects.length;
    const project = visibleProjects[currentProject];
    $("#project-title").textContent = project.title;
    $("#project-category").textContent = project.category;
    const img = $("#project-detail-image");
    img.src = "assets/" + project.image;
    img.alt = project.alt;
    img.width = project.width;
    img.height = project.height;
    $("#project-brief").textContent = project.brief;
    $("#project-description").textContent = project.description;
    const shootButton = $("[data-enquire]", projectDialog);
    if (shootButton)
      shootButton.dataset.service = {
        fashion: "Fashion & editorial",
        brands: "Brands & objects",
        portraits: "People & portraits",
      }[project.filter];
    const meta = $("#project-meta");
    meta.replaceChildren();
    [
      ["Format", project.format],
      ["Direction", project.approach],
      ["Imagined outputs", project.deliverables],
    ].forEach(([label, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      meta.append(dt, dd);
    });
    const credit = $("#project-credit");
    credit.replaceChildren(
      document.createTextNode("Curated visual reference. Photography by "),
    );
    const link = document.createElement("a");
    link.textContent = project.photographer;
    link.href = project.source;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    credit.append(
      link,
      document.createTextNode(
        " / Unsplash. This is a concept study, not a commissioned client project.",
      ),
    );
    $("#project-position").textContent =
      `${String(currentProject + 1).padStart(2, "0")} / ${String(visibleProjects.length).padStart(2, "0")}`;
    $("#previous-project").hidden = visibleProjects.length === 1;
    $("#next-project").hidden = visibleProjects.length === 1;
    projectDialog.scrollTop = 0;
  }
  $$("[data-project]").forEach((link) =>
    link.addEventListener("click", (event) => {
      if (typeof projectDialog?.showModal !== "function") return;
      event.preventDefault();
      renderProject(
        visibleProjects.findIndex((p) => p.id === link.dataset.project),
      );
      openDialog(projectDialog, link);
    }),
  );
  $("#previous-project")?.addEventListener("click", () =>
    renderProject(currentProject - 1),
  );
  $("#next-project")?.addEventListener("click", () =>
    renderProject(currentProject + 1),
  );
  projectDialog?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      renderProject(currentProject + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      renderProject(currentProject - 1);
    }
  });
  const cards = $$(".project-card");
  const more = $(".work-more");
  const showAll = $("#show-all-projects");
  const previewCount = 6;
  let galleryExpanded = false;
  let activeFilter = "all";
  function updateGallery(revealImmediately = false) {
    visibleProjects = projects.filter(
      (p) => activeFilter === "all" || p.filter === activeFilter,
    );
    let shown = 0;
    cards.forEach((card) => {
      const matches =
        activeFilter === "all" || card.dataset.category === activeFilter;
      card.hidden =
        !matches ||
        (activeFilter === "all" && !galleryExpanded && shown >= previewCount);
      if (matches) shown++;
      if (!card.hidden && revealImmediately) card.classList.add("visible");
    });
    $(".work-grid")?.classList.toggle("filtered", activeFilter !== "all");
    if ($("#work-count"))
      $("#work-count").textContent = `${visibleProjects.length} PROJECTS`;
    if (more)
      more.hidden =
        activeFilter !== "all" ||
        galleryExpanded ||
        projects.length <= previewCount;
    if (showAll) showAll.setAttribute("aria-expanded", String(galleryExpanded));
  }
  if (cards.length) updateGallery();
  $$("[data-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      $$("[data-filter]").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      updateGallery(true);
    }),
  );
  showAll?.addEventListener("click", () => {
    galleryExpanded = true;
    updateGallery();
    const firstNew = $("[data-project]", cards[previewCount]);
    firstNew?.focus({ preventScroll: true });
    cards[previewCount]?.scrollIntoView({
      block: "start",
      behavior: userPaused ? "instant" : "smooth",
    });
  });

  const films = {
    portrait: {
      title: "A moment in motion",
      file: "studio-film.mp4",
      poster: "studio-film-poster.jpg",
      author: "paashuu",
      url: "https://www.pexels.com/video/elegant-fashion-model-in-studio-photoshoot-31223577/",
    },
    studio: {
      title: "Between the frames",
      file: "studio-bts.mp4",
      poster: "bts-poster.jpg",
      author: "MART PRODUCTION",
      url: "https://www.pexels.com/video/fashion-models-on-a-photoshoot-8943162/",
    },
  };
  $$("[data-film]").forEach((link) =>
    link.addEventListener("click", async (event) => {
      const dialog = $("#film-dialog");
      if (typeof dialog?.showModal !== "function") return;
      event.preventDefault();
      const film = films[link.dataset.film];
      $("#film-dialog-title").textContent = film.title;
      const player = $("#film-player");
      player.src = "assets/" + film.file;
      player.poster = "assets/" + film.poster;
      const credit = $("#film-credit");
      const sourceLink = document.createElement("a");
      sourceLink.href = film.url;
      sourceLink.textContent = `${film.author} / Pexels`;
      sourceLink.target = "_blank";
      sourceLink.rel = "noopener noreferrer";
      credit.replaceChildren(
        document.createTextNode("Stock footage by "),
        sourceLink,
        document.createTextNode(
          ". Curated and edited for this fictional studio concept. Silent film.",
        ),
      );
      openDialog(dialog, link);
      try {
        await player.play();
      } catch {
        /* Native controls remain available. */
      }
    }),
  );

  const enquiryDialog = $("#enquiry-dialog");
  const form = $("#enquiry-form");
  $$("[data-enquire]").forEach((trigger) =>
    trigger.addEventListener("click", (event) => {
      if (typeof enquiryDialog?.showModal !== "function") return;
      event.preventDefault();
      closeMenu();
      if (trigger.dataset.service) {
        form.elements.service.value = trigger.dataset.service;
        form.hidden = false;
        $("#enquiry-result").hidden = true;
      }
      openDialog(enquiryDialog, trigger);
    }),
  );
  let briefUrl = null;
  ["name", "idea"].forEach((name) =>
    form?.elements[name].addEventListener("input", () =>
      form.elements[name].setCustomValidity(""),
    ),
  );
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    ["name", "idea"].forEach((name) =>
      form.elements[name].setCustomValidity(
        form.elements[name].value.trim() ? "" : "Please add a few words here.",
      ),
    );
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const values = [
      ["Name", data.get("name").trim()],
      ["Email", data.get("email").trim()],
      ["Shoot", data.get("service")],
      ["The idea", data.get("idea").trim()],
      ["Timing", data.get("timing").trim() || "To be discussed"],
    ];
    const summary = $("#brief-summary");
    summary.replaceChildren();
    values.forEach(([label, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      summary.append(dt, dd);
    });
    const brief =
      "FORME STUDIO — SHOOT BRIEF\n\n" +
      values.map(([label, value]) => `${label}\n${value}`).join("\n\n") +
      "\n\nCreated in a fictional studio concept by Ahsan Khan.\nNo enquiry has been sent. No booking has been made.\n";
    if (briefUrl) URL.revokeObjectURL(briefUrl);
    briefUrl = URL.createObjectURL(
      new Blob([brief], { type: "text/plain;charset=utf-8" }),
    );
    $("#download-brief").href = briefUrl;
    form.hidden = true;
    $("#enquiry-result").hidden = false;
    enquiryDialog.scrollTop = 0;
    $("#result-title").tabIndex = -1;
    $("#result-title").focus();
  });
  $("#edit-brief")?.addEventListener("click", () => {
    $("#enquiry-result").hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
  window.addEventListener("pagehide", () => {
    if (briefUrl) URL.revokeObjectURL(briefUrl);
    ambient?.pause();
    $("#film-player")?.pause();
  });
})();
