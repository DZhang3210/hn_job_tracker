(() => {
  const { el } = Marks;
  const listEl = document.getElementById("list");
  const q = document.getElementById("q");
  const tabsEl = document.getElementById("tabs");
  let marks = {};
  let tab = "applied";

  const TABS = [
    ["applied", "Applied"],
    ["hidden", "Not interested"],
    ["all", "All"],
  ];

  function renderTabs() {
    const counts = { all: 0, applied: 0, hidden: 0 };
    for (const m of Object.values(marks)) {
      counts.all++;
      counts[m.s]++;
    }
    tabsEl.replaceChildren(
      ...TABS.map(([k, label]) =>
        el("button", { "aria-pressed": String(tab === k), onclick: () => ((tab = k), render()) }, `${label} (${counts[k]})`),
      ),
    );
  }

  function render() {
    renderTabs();
    const needle = q.value.trim().toLowerCase();
    const rows = Object.entries(marks)
      .filter(([, m]) => tab === "all" || m.s === tab)
      .filter(([, m]) => !needle || `${m.company} ${m.preview}`.toLowerCase().includes(needle))
      .sort(([, a], [, b]) => b.at.localeCompare(a.at));

    listEl.replaceChildren();
    if (!rows.length) {
      listEl.append(el("li", { class: "empty" }, needle ? "No matches." : "Nothing here yet."));
      return;
    }
    for (const [id, m] of rows) {
      const other = m.s === "applied" ? "hidden" : "applied";
      listEl.append(
        el(
          "li",
          {},
          el("span", { class: `chip ${m.s}` }, m.s === "applied" ? "Applied" : "Not interested"),
          el(
            "div",
            { class: "what" },
            el("div", {}, el("span", { class: "co" }, m.company || "?"), el("span", { class: "muted" }, ` · ${m.thread || ""} · ${Marks.fmtDate(m.at)}`)),
            el("div", { class: "pv", title: m.preview || "" }, m.preview || ""),
          ),
          el(
            "div",
            { class: "acts" },
            el("a", { class: "btn", href: m.url, target: "_blank" }, "Post"),
            el("button", { class: "btn", onclick: () => Marks.set(id, other, m) }, other === "applied" ? "Mark applied" : "Not interested"),
            el("button", { class: "btn", onclick: () => confirm(`Remove the mark on ${m.company || "this post"}?`) && Marks.set(id, null) }, "Remove"),
          ),
        ),
      );
    }
  }

  const backup = () => ({ version: 1, exportedAt: new Date().toISOString(), marks });

  // Copies every mark so it can be pasted into the pinned Job Marks page on claude.ai.
  const copyBtn = document.getElementById("copy");
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(backup()));
      copyBtn.textContent = `Copied ${Object.keys(marks).length} marks. Paste on the Job Marks page`;
    } catch {
      copyBtn.textContent = "Couldn't copy. Use Export backup instead";
    }
    setTimeout(() => (copyBtn.textContent = "Copy for Job Marks page"), 3000);
  };

  document.getElementById("export").onclick = () => {
    const blob = new Blob([JSON.stringify(backup(), null, 2)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: `hn-job-marks-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  document.getElementById("import").onchange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = data.marks || data;
      let added = 0;
      const merged = { ...marks };
      for (const [id, m] of Object.entries(incoming)) {
        if (!m || (m.s !== "applied" && m.s !== "hidden") || typeof m.at !== "string") continue;
        // Keep whichever mark is newer.
        if (!merged[id] || m.at > merged[id].at) {
          merged[id] = m;
          added++;
        }
      }
      await Marks.replaceAll(merged);
      alert(`Imported ${added} mark(s).`);
    } catch (err) {
      alert(`Couldn't import that file: ${err.message}`);
    }
  };

  q.addEventListener("input", render);
  Marks.onChange((m) => {
    marks = m;
    render();
  });
  Marks.all().then((m) => {
    marks = m || {};
    render();
  });
})();
