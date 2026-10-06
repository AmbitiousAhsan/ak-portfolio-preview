(() => {
  "use strict";
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [
    ...parent.querySelectorAll(selector),
  ];
  const el = (tag, props = {}, children = []) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };
  const pad = (n) => String(n).padStart(2, "0");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = Boolean(navigator.connection?.saveData);
  // Reduced motion or Save-Data start with page motion paused; films never play on their own.
  let userPaused = reduced.matches || saveData;
  const motionButton = $("[data-global-motion]");
  let opener = null;

  /* The shoots: every frame by id, with its shoot and its number on the contact sheet. */
  const SHOOTS = window.FORME_SHOOTS || [];
  const FRAMES = {};
  SHOOTS.forEach((shoot) =>
    shoot.frames.forEach((frame, i) => {
      FRAMES[frame.id] = { frame, shoot, no: i + 1 };
    }),
  );

  // Every photograph is served from assets/img/ in five widths as AVIF and WebP, with a JPEG at 1200.
  const LADDER = [200, 400, 800, 1200, 1600];
  const srcset = (id, ext, widths = LADDER) =>
    widths.map((w) => `assets/img/${id}-${w}.${ext} ${w}w`).join(", ");
  function setPicture(img, id, sizes) {
    $$("source", img.closest("picture")).forEach((source) => {
      source.sizes = sizes;
      source.srcset = srcset(id, source.type === "image/avif" ? "avif" : "webp");
    });
    img.src = `assets/img/${id}-1200.jpg`;
  }
  function pictureFor(id, sizes, alt = "", widths = [200, 400]) {
    const { frame } = FRAMES[id];
    return el("picture", {}, [
      el("source", { type: "image/avif", srcset: srcset(id, "avif", widths), sizes }),
      el("source", { type: "image/webp", srcset: srcset(id, "webp", widths), sizes }),
      el("img", {
        src: `assets/img/${id}-1200.jpg`,
        alt,
        width: frame.w,
        height: frame.h,
        decoding: "async",
      }),
    ]);
  }

  /* Motion: page animations, reveals and the films. */
  const players = $$("[data-player]");
  function syncMotion() {
    document.documentElement.classList.toggle("motion-paused", userPaused);
    if (motionButton)
      motionButton.textContent = userPaused ? "Enable motion" : "Pause motion";
    if (userPaused) players.forEach((player) => $("video", player)?.pause());
  }
  motionButton?.addEventListener("click", () => {
    userPaused = !userPaused;
    syncMotion();
  });
  reduced.addEventListener("change", () => {
    userPaused = reduced.matches;
    syncMotion();
  });
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
      { threshold: 0.05, rootMargin: "0px 0px -30px 0px" },
    );
    $$(".reveal").forEach((node) => revealObserver.observe(node));
  }
  syncMotion();

  /* Films: a still until someone presses play. Nothing loads before that. One film plays at a
     time, and a film that scrolls out of view, or meets "Pause motion", pauses. */
  const pauseOthers = (current) =>
    players.forEach((p) => {
      const v = $("video", p);
      if (v !== current) v?.pause();
    });
  players.forEach((player) => {
    const video = $("video", player);
    const figure = player.closest("figure");
    const button = $("[data-play]", figure);
    const label = $(".social-toggle-text", button);
    const poster = $(".film-poster", player);
    const sync = () => {
      const playing = !video.paused;
      button.classList.toggle("is-playing", playing);
      if (label) label.textContent = playing ? "Pause" : "Play";
    };
    button.addEventListener("click", async () => {
      if (!video.getAttribute("src")) video.src = video.dataset.src;
      if (!video.paused) {
        video.pause();
        return;
      }
      pauseOthers(video);
      video.hidden = false;
      if (player.dataset.player === "wide") {
        // The 16:9 film hands over to the browser's own controls.
        button.hidden = true;
        video.focus({ preventScroll: true });
      }
      try {
        await video.play();
      } catch {
        /* The controls stay available if playback is refused. */
      }
    });
    video.addEventListener("play", () => pauseOthers(video));
    video.addEventListener("playing", () => {
      if (poster) poster.hidden = true;
      sync();
    });
    video.addEventListener("pause", sync);
    video.addEventListener("ended", sync);
    if ("IntersectionObserver" in window)
      new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) video.pause();
        },
        { threshold: 0.1 },
      ).observe(player);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) players.forEach((p) => $("video", p)?.pause());
  });

  /* Journal reading progress */
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
    window.addEventListener("scroll", scheduleReadingProgress, { passive: true });
    window.addEventListener("resize", scheduleReadingProgress);
    window.addEventListener("load", scheduleReadingProgress);
    updateReadingProgress();
  }

  /* Phone menu */
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

  /* Dialogs: one at a time, focus returns to whatever opened them. */
  function openDialog(dialog, trigger) {
    if (!dialog || typeof dialog.showModal !== "function") return false;
    const returnTarget = trigger?.closest("dialog")
      ? opener
      : trigger || document.activeElement;
    $$("dialog[open]").forEach((other) => other.close());
    opener = returnTarget;
    document.body.classList.add("modal-open");
    players.forEach((p) => $("video", p)?.pause());
    dialog.showModal();
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
      if (!document.querySelector("dialog[open]")) {
        document.body.classList.remove("modal-open");
        if (opener?.isConnected) opener.focus({ preventScroll: true });
      }
    });
  });
  const arrowKeys = (dialog, step) =>
    dialog?.addEventListener("keydown", (event) => {
      if (event.target.closest("input, textarea")) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        step(event.key === "ArrowRight" ? 1 : -1);
      }
    });

  /* Journal image viewer */
  const storyImages = $$("[data-story-image]");
  const storyImageDialog = $("#story-image-dialog");
  let currentStoryImage = 0;
  function renderStoryImage(index) {
    currentStoryImage = (index + storyImages.length) % storyImages.length;
    const link = storyImages[currentStoryImage];
    const sourceImage = $("img", link);
    const viewer = $("#story-viewer-image");
    viewer.alt = sourceImage.alt;
    viewer.width = sourceImage.width;
    viewer.height = sourceImage.height;
    setPicture(viewer, link.dataset.frame, "(max-width: 760px) 100vw, 80vw");
    storyImageDialog.style.setProperty(
      "--ratio",
      String(sourceImage.width / sourceImage.height),
    );
    $("#story-image-title").textContent = link.dataset.title;
    const credit = $(".story-photo-credit", link.closest("figure"));
    $("#story-viewer-credit").replaceChildren(
      ...[...credit.childNodes].map((node) => node.cloneNode(true)),
    );
    $("#story-image-position").textContent =
      `${pad(currentStoryImage + 1)} / ${pad(storyImages.length)}`;
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
  arrowKeys(storyImageDialog, (d) => renderStoryImage(currentStoryImage + d));

  /* Picks: frames a visitor marks on a contact sheet. Kept in this browser only, they go into
     the brief as references. If storage is unavailable they last until the page closes. */
  const PICKS_KEY = "forme-picks";
  let memoryPicks = [];
  function readPicks() {
    try {
      const stored = JSON.parse(localStorage.getItem(PICKS_KEY) || "[]");
      return Array.isArray(stored) ? stored.filter((id) => FRAMES[id]) : [];
    } catch {
      return memoryPicks.slice();
    }
  }
  function writePicks(list) {
    memoryPicks = list.slice();
    try {
      localStorage.setItem(PICKS_KEY, JSON.stringify(list));
    } catch {
      /* Private mode or blocked storage: picks stay in memory. */
    }
    syncPicks();
  }
  const isPicked = (id) => readPicks().includes(id);
  function togglePick(id) {
    const picks = readPicks();
    writePicks(
      picks.includes(id) ? picks.filter((p) => p !== id) : picks.concat(id),
    );
  }
  // Picks in site order: by shoot, then by frame number.
  function sortedPicks() {
    const order = (id) =>
      SHOOTS.indexOf(FRAMES[id].shoot) * 100 + FRAMES[id].no;
    return readPicks().sort((a, b) => order(a) - order(b));
  }
  const pickName = (id) =>
    `${FRAMES[id].shoot.title}, frame ${pad(FRAMES[id].no)}`;
  window.addEventListener("storage", (event) => {
    if (event.key === PICKS_KEY) syncPicks();
  });

  /* A shoot page: the contact sheet and the frame viewer */
  const pageShoot = SHOOTS.find((s) => s.slug === document.body.dataset.shoot);
  const frameDialog = $("#frame-dialog");
  let currentFrame = 0;
  function renderFrame(index) {
    const frames = pageShoot.frames;
    currentFrame = (index + frames.length) % frames.length;
    const frame = frames[currentFrame];
    const no = pad(currentFrame + 1);
    const img = $("#frame-image");
    img.alt = frame.alt;
    img.width = frame.w;
    img.height = frame.h;
    setPicture(img, frame.id, "(max-width: 760px) 100vw, 64vw");
    frameDialog.style.setProperty("--ratio", String(frame.w / frame.h));
    $("#frame-kicker").textContent = `${pageShoot.title} · ${no} of ${pad(frames.length)}`;
    $("#frame-title").textContent = `Frame ${no}`;
    const status = $("#frame-status");
    status.replaceChildren();
    if (pageShoot.selects.includes(frame.id))
      status.append(
        el("span", { className: "select-mark", ariaHidden: "true" }),
        "Our select",
      );
    $("#frame-alt").textContent = frame.alt;
    const link = el("a", {
      href: frame.page,
      target: "_blank",
      rel: "noopener noreferrer",
      textContent: pageShoot.photographer,
    });
    $("#frame-credit").replaceChildren("Photograph by ", link, " / Pexels.");
    $("#frame-position").textContent = `${no} / ${pad(frames.length)}`;
    const pick = $("#frame-pick");
    pick.dataset.pick = frame.id;
    pick.setAttribute("aria-pressed", String(isPicked(frame.id)));
    frameDialog.scrollTop = 0;
  }
  if (pageShoot && frameDialog) {
    $$("[data-frame]").forEach((link) =>
      link.addEventListener("click", (event) => {
        if (typeof frameDialog.showModal !== "function" || link.tagName === "LI")
          return;
        event.preventDefault();
        renderFrame(pageShoot.frames.findIndex((f) => f.id === link.dataset.frame));
        openDialog(frameDialog, link);
      }),
    );
    $("#previous-frame").addEventListener("click", () => renderFrame(currentFrame - 1));
    $("#next-frame").addEventListener("click", () => renderFrame(currentFrame + 1));
    arrowKeys(frameDialog, (d) => renderFrame(currentFrame + d));
  }
  $$("[data-pick]").forEach((button) =>
    button.addEventListener("click", () => togglePick(button.dataset.pick)),
  );
  $$("[data-clear-picks]").forEach((button) =>
    button.addEventListener("click", () => {
      const shoot = SHOOTS.find((s) => s.slug === button.dataset.clearPicks);
      const ids = shoot.frames.map((f) => f.id);
      writePicks(readPicks().filter((id) => !ids.includes(id)));
      $(".frame .pick")?.focus();
    }),
  );
  function syncPicks() {
    const picks = readPicks();
    $$("[data-pick]").forEach((button) => {
      const on = picks.includes(button.dataset.pick);
      button.setAttribute("aria-pressed", String(on));
      button.closest(".frame")?.classList.toggle("is-picked", on);
    });
    $$(".sheet[data-shoot]").forEach((sheet) => {
      const shoot = SHOOTS.find((s) => s.slug === sheet.dataset.shoot);
      const count = shoot.frames.filter((f) => picks.includes(f.id)).length;
      const counter = $(".pick-count", sheet);
      if (counter) counter.textContent = String(count);
      const clear = $("[data-clear-picks]", sheet);
      if (clear) clear.disabled = count === 0;
    });
    renderBriefPicks();
  }

  /* Work: filter the shoots by service */
  const rows = $$(".shoot-row");
  $$("[data-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      $$("[data-filter]").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      let shown = 0;
      rows.forEach((row) => {
        row.hidden = filter !== "all" && row.dataset.category !== filter;
        if (!row.hidden) {
          shown++;
          row.classList.add("visible");
        }
      });
      const count = $("#work-count");
      if (count) count.textContent = `${shown} shoot${shown === 1 ? "" : "s"}`;
    }),
  );

  /* Brief builder: four short steps in one dialog */
  const enquiryDialog = $("#enquiry-dialog");
  const form = $("#enquiry-form");
  const steps = $$(".brief-step", form || undefined);
  const result = $("#enquiry-result");
  let step = 1;
  function showStep(n, focus = true) {
    step = n;
    steps.forEach((fieldset) => {
      fieldset.hidden = Number(fieldset.dataset.step) !== n;
    });
    $$(".brief-progress li", enquiryDialog).forEach((li) => {
      const at = Number(li.dataset.for);
      li.classList.toggle("done", at < n && stepComplete(at));
      if (at === n) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
    $("[data-back]", form).hidden = n === 1;
    $(".step-next", form).textContent = n < steps.length ? "Next" : "Create my brief";
    if (n === 3) renderBriefPicks();
    if (focus) $(`#step-${n}-title`)?.focus();
  }
  // A step counts as done once its required answers are in; a visitor can jump ahead to picks.
  function stepComplete(n) {
    return $$("input[required], textarea[required]", steps[n - 1]).every((field) =>
      field.type === "radio"
        ? Boolean(form.querySelector(`input[name="${field.name}"]:checked`))
        : field.value.trim() !== "",
    );
  }
  function validStep(n) {
    const fieldset = steps[n - 1];
    ["idea", "name"].forEach((name) => {
      const field = $(`[name="${name}"]`, fieldset);
      if (field)
        field.setCustomValidity(field.value.trim() ? "" : "Please add a few words here.");
    });
    const invalid = $$("input, textarea", fieldset).find((field) => !field.checkValidity());
    if (!invalid) return true;
    if (fieldset.hidden) showStep(n, false);
    invalid.reportValidity();
    invalid.focus();
    return false;
  }
  ["name", "idea"].forEach((name) =>
    form?.elements[name].addEventListener("input", () =>
      form.elements[name].setCustomValidity(""),
    ),
  );
  function renderBriefPicks() {
    const list = $("#brief-picks");
    if (!list) return;
    const picks = sortedPicks();
    list.replaceChildren(
      ...picks.map((id) =>
        el("li", { className: "brief-pick" }, [
          el("div", { className: "brief-pick-thumb" }, [
            pictureFor(id, "140px", FRAMES[id].frame.alt),
          ]),
          el("p", { textContent: pickName(id) }),
          el("button", {
            type: "button",
            className: "remove-pick",
            textContent: "Remove",
            ariaLabel: `Remove ${pickName(id)}`,
            onclick: () => {
              const buttons = $$(".remove-pick", list);
              const at = buttons.findIndex((b) => b.dataset.id === id);
              writePicks(readPicks().filter((p) => p !== id));
              const next = $$(".remove-pick", list)[at] || $$(".remove-pick", list).pop();
              (next || $("#step-3-title")).focus();
            },
          }),
        ]),
      ),
    );
    $$(".remove-pick", list).forEach((b, i) => {
      b.dataset.id = picks[i];
    });
    $("#picks-empty").hidden = picks.length > 0;
  }
  $$("[data-enquire]").forEach((trigger) =>
    trigger.addEventListener("click", (event) => {
      if (typeof enquiryDialog?.showModal !== "function") return;
      event.preventDefault();
      closeMenu();
      if (trigger.dataset.service) {
        form.elements.service.value = trigger.dataset.service;
        result.hidden = true;
        form.hidden = false;
        showStep(1, false);
      } else if (trigger.dataset.step) {
        result.hidden = true;
        form.hidden = false;
        showStep(Number(trigger.dataset.step), false);
      }
      openDialog(enquiryDialog, trigger);
      if (!form.hidden && (trigger.dataset.service || trigger.dataset.step))
        $(`#step-${step}-title`)?.focus();
    }),
  );
  $("[data-back]", form || undefined)?.addEventListener("click", () =>
    showStep(Math.max(1, step - 1)),
  );
  let briefUrl = null;
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validStep(step)) return;
    if (step < steps.length) {
      showStep(step + 1);
      return;
    }
    // A visitor can jump straight to their picks, so the first step is checked again here.
    if (!validStep(1)) return;
    createBrief();
  });
  function createBrief() {
    const data = new FormData(form);
    const placements = data.getAll("placement");
    const name = data.get("name").trim();
    const email = data.get("email").trim();
    const picks = sortedPicks();
    const byShoot = [];
    picks.forEach((id) => {
      const { shoot, no } = FRAMES[id];
      let group = byShoot.find((g) => g.shoot === shoot);
      if (!group) byShoot.push((group = { shoot, nos: [] }));
      group.nos.push(pad(no));
    });
    const and = (list) =>
      list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list.at(-1)}` : list[0];
    const pickLines = byShoot.map(
      (g) =>
        `${g.shoot.title} (photographs by ${g.shoot.photographer}): frame${g.nos.length > 1 ? "s" : ""} ${and(g.nos)}`,
    );
    const sections = [
      ["Shoot", data.get("service")],
      ["Notes", data.get("idea").trim()],
      [
        "Where the pictures will live",
        placements.length ? placements.join(", ") : "To be decided together",
      ],
      ["Picks", pickLines.length ? pickLines.join("\n") : "None yet"],
      ["Timing", data.get("timing").trim() || "Open"],
      ["Contact", `${name}, ${email}`],
    ];
    const summary = $("#brief-summary");
    summary.replaceChildren(
      ...sections.flatMap(([label, value]) => [
        el("dt", { textContent: label }),
        el("dd", { textContent: value }),
      ]),
    );
    const date = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const rule = "-".repeat(40);
    const block = (label, lines) =>
      `${label.toUpperCase()}\n${[].concat(lines).join("\n")}`;
    const note =
      "Made with the brief builder on the FORME website, a fictional studio\nconcept by Ahsan Khan. Nothing has been sent and no shoot is booked.";
    const brief = [
      `FORME STUDIO · SHOOT BRIEF\nWritten ${date}\n${rule}`,
      block("Shoot", data.get("service")),
      block("Notes", data.get("idea").trim()),
      block(
        "Where the pictures will live",
        placements.length ? placements.map((p) => `- ${p}`) : "To be decided together",
      ),
      block(
        "Picks from FORME shoots, as references",
        pickLines.length ? pickLines.map((p) => `- ${p}`) : "None yet",
      ),
      block("Timing", data.get("timing").trim() || "Open"),
      block("Contact", [name, email]),
      `${rule}\n${note}`,
    ].join("\n\n");
    if (briefUrl) URL.revokeObjectURL(briefUrl);
    briefUrl = URL.createObjectURL(
      new Blob([brief + "\n"], { type: "text/plain;charset=utf-8" }),
    );
    $("#download-brief").href = briefUrl;
    buildPrintBrief(sections, picks, date, note.replace("\n", " "));
    form.hidden = true;
    result.hidden = false;
    enquiryDialog.scrollTop = 0;
    $("#result-title").focus();
  }
  // The printable brief sits outside the dialog and shows only in print, as one page.
  function buildPrintBrief(sections, picks, date, note) {
    $(".print-brief")?.remove();
    const rows = sections
      .filter(([label]) => label !== "Picks" && label !== "Shoot")
      .flatMap(([label, value]) => [
        el("dt", { textContent: label }),
        el("dd", { textContent: value }),
      ]);
    if (picks.length)
      rows.push(
        el("dt", { textContent: "Picks" }),
        el("dd", {}, [
          el(
            "ul",
            { className: "print-picks" },
            picks.map((id) =>
              el("li", {}, [
                el("div", { className: "brief-pick-thumb" }, [
                  pictureFor(id, "120px", FRAMES[id].frame.alt, [200, 400]),
                ]),
                pickName(id),
              ]),
            ),
          ),
        ]),
      );
    document.body.append(
      el("section", { className: "print-brief", ariaHidden: "true" }, [
        el("div", { className: "print-brief-head" }, [
          el("span", { className: "wordmark" }, [
            "forme",
            el("span", { className: "brand-dot" }),
            el("span", { className: "wordmark-studio", textContent: "studio" }),
          ]),
          el("p", {}, ["Shoot brief", el("br"), `Written ${date}`]),
        ]),
        el("p", { className: "print-title", textContent: sections[0][1] }),
        el("dl", {}, rows),
        el("p", { className: "print-brief-foot", textContent: note }),
      ]),
    );
  }
  $("#print-brief")?.addEventListener("click", () => {
    document.body.classList.add("printing-brief");
    window.print();
  });
  window.addEventListener("beforeprint", () => {
    if (result && !result.hidden && enquiryDialog?.open)
      document.body.classList.add("printing-brief");
  });
  window.addEventListener("afterprint", () =>
    document.body.classList.remove("printing-brief"),
  );
  $("#edit-brief")?.addEventListener("click", () => {
    result.hidden = true;
    form.hidden = false;
    showStep(1);
  });
  window.addEventListener("pagehide", () => {
    if (briefUrl) URL.revokeObjectURL(briefUrl);
    players.forEach((p) => $("video", p)?.pause());
  });
  syncPicks();
})();
