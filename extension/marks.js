// Storage for marks, shared by the HN page script, the popup, and the list page.
// Everything lives in chrome.storage.local under one key:
//   marks = { [hnCommentId]: { s: "applied" | "hidden", company, thread, at, url, preview } }
/* exported Marks */
var Marks = {
  KEY: "marks",

  async all() {
    try {
      const got = await chrome.storage.local.get(Marks.KEY);
      return got[Marks.KEY] || {};
    } catch {
      return null; // extension was reloaded; caller should ask for a page refresh
    }
  },

  /** Set (or with s=null, clear) the mark for one post. Returns false if storage is unreachable. */
  async set(id, s, info = {}) {
    try {
      const marks = (await Marks.all()) || {};
      if (s) marks[id] = { ...info, s, at: new Date().toISOString() };
      else delete marks[id];
      await chrome.storage.local.set({ [Marks.KEY]: marks });
      return true;
    } catch {
      return false;
    }
  },

  async replaceAll(marks) {
    await chrome.storage.local.set({ [Marks.KEY]: marks });
  },

  onChange(fn) {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes[Marks.KEY]) fn(changes[Marks.KEY].newValue || {});
      });
    } catch {}
  },

  normCompany(s) {
    return (s || "")
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/\b(inc|llc|ltd|corp|co|gmbh|labs|technologies)\b\.?/g, "")
      .replace(/[^a-z0-9]/g, "");
  },

  fmtDate(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  },

  el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of children) if (c != null) e.append(c);
    return e;
  },
};
