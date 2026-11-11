(async () => {
  const marks = (await Marks.all()) || {};
  const list = Object.values(marks);
  document.getElementById("applied").textContent = list.filter((m) => m.s === "applied").length;
  document.getElementById("hidden").textContent = list.filter((m) => m.s === "hidden").length;

  const recent = document.getElementById("recent");
  const applied = list.filter((m) => m.s === "applied").sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  for (const m of applied) {
    recent.append(Marks.el("li", { title: m.preview || "" }, `${Marks.fmtDate(m.at)} · ${m.company || "?"}`));
  }
  if (!applied.length) recent.append(Marks.el("li", { class: "muted" }, "Nothing yet"));

  document.getElementById("open").onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL("list.html") });
})();
