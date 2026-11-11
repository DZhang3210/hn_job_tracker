# HN Job Marks

A Chrome/Edge extension for going through HN "Who is hiring?" threads: mark each post **Applied** or
**Not interested**, hide what you've passed on, and keep a running tally. It needs nothing else running.

## Install

1. Go to `chrome://extensions` (or `edge://extensions`), turn on **Developer mode**.
2. **Load unpacked**, then pick the `extension` folder.
3. After changing the extension's files: click reload ↻ on it, then refresh any open HN tabs.

## Use

On any month's "Who is hiring?" thread:

- Every job post gets **Applied** and **Not interested** buttons.
  - **Not interested** hides the post completely.
  - **Applied** collapses the post to one line (`✓ Applied Nov 11 · Company | …`) so you can see it's done.
  - Both have **Undo**.
- The bar at the top shows the tally (`128 to review · 12 applied · 80 not interested`), a keyword filter
  (`remote typescript -onsite`), and toggles to show applied / not-interested posts.
- **Next unreviewed ↓** jumps to the next post you haven't decided on.
- Keyboard: `j` next unreviewed · `a` applied · `x` not interested · `u` undo. `a`/`x` act on the
  highlighted post and move on to the next one.
- If a company you applied to or passed on posts again (e.g. next month), its post shows
  "Applied before (November 2026)" or "Passed before (…)".

Click the extension icon for counts and recent applications, and **Open full list** for every mark, with
search, switching or removing marks, and **Export / Import backup**.

Marks are stored in this browser profile (`chrome.storage.local`). Removing the extension deletes them,
so export a backup now and then.

## Pinned Job Marks page

https://claude.ai/artifact/UP3iUaYpYEqokmi7MznqdT (pinned in the claude.ai sidebar) shows the same marks:
totals, a per-thread tally, and the full list. To update it: extension → **Open full list** →
**Copy for Job Marks page**, then press Ctrl+V on the page. The page then matches the extension exactly.
Its source is `artifact/job-marks.html`.
