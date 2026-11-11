// HN "Who is hiring?" threads: mark each post Applied or Not interested, hide what you've passed on,
// keep a running tally, and jump to the next post you haven't decided on.
(() => {
  const title = document.querySelector(".titleline")?.textContent?.trim() || "";
  if (!/who is hiring/i.test(title)) return;

  const { el } = Marks;
  const thread = (title.match(/\(([^)]+)\)/) || [])[1] || title; // e.g. "November 2026"

  // ---------- posts on this page ----------
  const posts = [];
  for (const row of document.querySelectorAll("tr.athing.comtr")) {
    const indent = row.querySelector("td.ind")?.getAttribute("indent");
    if (indent === "0") {
      const comment = row.querySelector(".comment");
      const textEl = row.querySelector(".commtext");
      if (!comment || !textEl) continue; // deleted / flagged
      const text = textEl.innerText.trim();
      const firstLine = text.split("\n")[0];
      posts.push({
        id: row.id,
        row,
        comment,
        replies: [],
        text: text.toLowerCase(),
        company: firstLine.split("|")[0].trim().slice(0, 80),
        headline: firstLine.slice(0, 160),
        url: `https://news.ycombinator.com/item?id=${row.id}`,
      });
    } else if (posts.length) {
      posts[posts.length - 1].replies.push(row);
    }
  }
  if (!posts.length) return;

  // ---------- toolbar ----------
  const tally = el("span", { class: "jm-tally" });
  const filter = el("input", { class: "jm-input", type: "search", placeholder: "Filter: remote typescript -onsite" });
  const showHidden = el("input", { type: "checkbox" });
  const showApplied = el("input", { type: "checkbox" });
  const hiddenLabel = el("label", { class: "jm-check" }, showHidden, el("span", {}, "Show not interested"));
  const appliedLabel = el("label", { class: "jm-check" }, showApplied, el("span", {}, "Show applied"));
  const nextBtn = el("button", { class: "jm-btn jm-primary", title: "Shortcut: j", onclick: () => jumpNext() }, "Next unreviewed ↓");
  const notice = el("span", { class: "jm-notice" });
  const toolbar = el(
    "div",
    { class: "jm-toolbar" },
    el(
      "div",
      { class: "jm-row" },
      el("strong", {}, "Job marks"),
      el("span", { class: "jm-chip" }, thread),
      filter,
      nextBtn,
    ),
    el(
      "div",
      { class: "jm-row" },
      tally,
      appliedLabel,
      hiddenLabel,
      el("span", { class: "jm-muted" }, "Keys: j next · a applied · x not interested · u undo"),
      notice,
    ),
  );
  document.querySelector("table.comment-tree")?.before(toolbar);

  // Per-thread view settings, remembered in this browser.
  const pref = (k, d) => {
    try {
      return localStorage.getItem(`jm-${k}`) ?? d;
    } catch {
      return d;
    }
  };
  const savePref = (k, v) => {
    try {
      localStorage.setItem(`jm-${k}`, v);
    } catch {}
  };
  showApplied.checked = pref("showApplied", "1") === "1";
  showHidden.checked = pref("showHidden", "0") === "1";
  filter.value = pref(`filter-${thread}`, "");

  // ---------- state ----------
  let marks = {};
  let focused = null; // post the keyboard shortcuts act on
  const undoStack = [];

  /** Most recent mark on the same company from a different post (e.g. last month's thread). */
  function history(p) {
    const c = Marks.normCompany(p.company);
    if (c.length < 3) return null;
    let best = null;
    for (const [id, m] of Object.entries(marks)) {
      if (id === p.id || Marks.normCompany(m.company) !== c) continue;
      if (!best || m.at > best.at) best = m;
    }
    return best;
  }

  function matchesFilter(p) {
    const terms = filter.value.toLowerCase().split(/\s+/).filter(Boolean);
    return terms.every((t) => (t.startsWith("-") && t.length > 1 ? !p.text.includes(t.slice(1)) : p.text.includes(t)));
  }

  const markOf = (p) => marks[p.id]?.s || null;

  async function setMark(p, s) {
    const prev = marks[p.id] || null;
    const ok = await Marks.set(p.id, s, { company: p.company, thread, url: p.url, preview: p.headline });
    if (!ok) return stale();
    undoStack.push({ p, prev });
    // Optimistic update; storage.onChanged will confirm.
    if (s) marks[p.id] = { company: p.company, thread, url: p.url, preview: p.headline, s, at: new Date().toISOString() };
    else delete marks[p.id];
    render();
  }

  async function undo() {
    const last = undoStack.pop();
    if (!last) return flash("Nothing to undo");
    const { p, prev } = last;
    const ok = prev ? await Marks.set(p.id, prev.s, prev) : await Marks.set(p.id, null);
    if (!ok) return stale();
    if (prev) marks[p.id] = prev;
    else delete marks[p.id];
    render();
    focus(p, true);
    flash("Undone");
  }

  function stale() {
    notice.textContent = "Extension was reloaded. Refresh this page to keep marking.";
    notice.classList.add("jm-warn");
  }

  let flashTimer;
  function flash(msg) {
    notice.textContent = msg;
    notice.classList.remove("jm-warn");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (notice.textContent = ""), 1500);
  }

  // ---------- rendering ----------
  function renderPost(p) {
    const s = markOf(p);
    const h = s ? null : history(p);
    const hideAll = (s === "hidden" && !showHidden.checked) || (s === "applied" && !showApplied.checked) || (!s && !matchesFilter(p));
    const collapsed = !!s;

    p.row.classList.toggle("jm-gone", hideAll);
    p.comment.classList.toggle("jm-gone", collapsed);
    for (const r of p.replies) r.classList.toggle("jm-gone", hideAll || collapsed);
    p.row.classList.toggle("jm-marked", collapsed);
    p.visible = !hideAll;

    const bar = el("div", { class: "jm-bar" });
    if (s) {
      bar.append(
        el("span", { class: `jm-chip ${s === "applied" ? "jm-applied" : "jm-passed"}` }, s === "applied" ? `✓ Applied ${Marks.fmtDate(marks[p.id].at)}` : "Not interested"),
        el("span", { class: "jm-headline", title: p.headline }, p.headline),
        el("button", { class: "jm-btn jm-small", onclick: () => setMark(p, null) }, "Undo"),
      );
    } else {
      bar.append(
        el("button", { class: "jm-btn jm-apply", title: "Shortcut: a", onclick: () => (focus(p), setMark(p, "applied")) }, "Applied"),
        el("button", { class: "jm-btn", title: "Shortcut: x", onclick: () => (focus(p), setMark(p, "hidden").then(() => jumpNext(true))) }, "Not interested"),
      );
      if (h) {
        bar.append(
          el(
            "span",
            { class: `jm-chip ${h.s === "applied" ? "jm-applied" : "jm-passed"} jm-history`, title: h.preview || "" },
            `${h.s === "applied" ? "Applied" : "Passed"} before${h.thread && h.thread !== thread ? ` (${h.thread})` : ""}`,
          ),
        );
      }
    }
    if (p.bar) p.bar.replaceWith(bar);
    else p.row.querySelector(".comhead")?.closest("div")?.after(bar);
    p.bar = bar;
  }

  function render() {
    posts.forEach(renderPost);
    const n = { todo: 0, applied: 0, hidden: 0 };
    for (const p of posts) {
      const s = markOf(p);
      if (s === "applied") n.applied++;
      else if (s === "hidden") n.hidden++;
      else n.todo++;
    }
    const filtered = filter.value.trim() ? posts.filter((p) => !markOf(p) && p.visible).length : null;
    tally.textContent =
      `${n.todo} to review` + (filtered !== null ? ` (${filtered} match filter)` : "") + ` · ${n.applied} applied · ${n.hidden} not interested`;
    hiddenLabel.lastChild.textContent = `Show not interested (${n.hidden})`;
    appliedLabel.lastChild.textContent = `Show applied (${n.applied})`;
    nextBtn.disabled = !posts.some((p) => !markOf(p) && p.visible);
    if (focused) focused.row.classList.add("jm-focus");
  }

  // ---------- navigation ----------
  function focus(p, scroll = false) {
    if (focused) focused.row.classList.remove("jm-focus");
    focused = p;
    if (!p) return;
    p.row.classList.add("jm-focus");
    if (scroll) {
      const top = p.row.getBoundingClientRect().top + window.scrollY - toolbar.offsetHeight - 8;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  /** Scroll to the next unmarked, visible post after the focused one (or after the top of the screen). */
  function jumpNext(fromFocused = false) {
    const candidates = posts.filter((p) => !markOf(p) && p.visible);
    if (!candidates.length) return flash("All reviewed on this page 🎉");
    let next;
    // Continue from the focused post if it's on screen; if you've scrolled away, start from where you are.
    const r = focused?.row.getBoundingClientRect();
    const focusedOnScreen = r && r.bottom > 0 && r.top < window.innerHeight;
    if (focused && (fromFocused || focusedOnScreen)) {
      const i = posts.indexOf(focused);
      next = posts.slice(i + 1).find((p) => candidates.includes(p));
    } else {
      const line = toolbar.offsetHeight + 10;
      next = candidates.find((p) => p.row.getBoundingClientRect().top > line);
    }
    focus(next || candidates[0], true);
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return;
    const k = e.key.toLowerCase();
    if (k === "j") jumpNext();
    else if (k === "u") undo();
    else if ((k === "a" || k === "x") && focused && !markOf(focused)) {
      const p = focused;
      setMark(p, k === "a" ? "applied" : "hidden").then(() => jumpNext(true));
    } else return;
    e.preventDefault();
  });

  // ---------- wiring ----------
  filter.addEventListener("input", () => {
    savePref(`filter-${thread}`, filter.value);
    render();
  });
  showHidden.addEventListener("change", () => (savePref("showHidden", showHidden.checked ? "1" : "0"), render()));
  showApplied.addEventListener("change", () => (savePref("showApplied", showApplied.checked ? "1" : "0"), render()));
  Marks.onChange((m) => {
    marks = m;
    render();
  });

  Marks.all().then((m) => {
    if (m === null) return stale();
    marks = m;
    render();
  });
})();
