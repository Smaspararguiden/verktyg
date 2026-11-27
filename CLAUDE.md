# Claude Code – Project Instructions

This repo holds tools that Småspararguiden publishes on smaspararguiden.se,
for example calculators. Each tool runs entirely in the visitor's browser:
plain JavaScript, no build step. The only server code passes the ITP
calculator's statistics on to Google. The tools are published as a WordPress plugin
(`smaspararguiden-verktyg.php`, one shortcode per tool), uploaded by hand as a
zip file through the WordPress admin. GitHub Pages shows a preview.

Rules shared with Småspararguiden's other small repos, and facts about the
site, are in `~/.claude/CLAUDE.md`, section "Småspararguiden's site and its
small repos". Claude Code loads that file in every session.

Never modify code unless explicitly requested. Prefer discussion over
implementation.

Always write code comments in English. Text that visitors see is in Swedish.

Always consider writing or modifying tests when writing code. Do it when
reasonable. Tests use Node's built-in test runner (`node --test`), so they need
no installed packages.

Look in `docs/ARCHITECTURE.md` to understand the architecture and use similar
patterns for new code.

## Tools are kept apart

Each tool lives in its own top-level folder and loads nothing from another
tool's folder (`docs/DECISIONS.md` 40). What tools share is copied, not
imported: every tool has its own identical `delat.js`, and identical files
in `typsnitt/`. `tests/kopior.test.js` checks that the copies match and that
no tool points into another. To change a shared helper, change it in one
tool and copy the file to all the others. A helper that must behave
differently in one tool gets a different name in that tool's own code; the
same name always means the same code.

## Calculations

The calculation module of a tool is kept apart from its display. It takes
parameters and user input and returns numbers; it knows nothing about the page
and is tested on its own.

Every assumption (returns, fees, tax, contribution rates and so on) lives in the
tool's parameter file, with a description and a source for each value. The
calculation module holds no numbers of its own. The page's "Så har vi räknat"
view renders the parameter file, so the two cannot drift apart.

## Documents

Three documents live for the long run and are the only ones code may cite:
`docs/ARCHITECTURE.md` (how it works), `docs/DECISIONS.md` (why it works that
way – one dated entry per decision, never deleted, superseded entries point
forward) and `docs/FUTURE_DEV.md` (what is not built; cite it only for
something not built yet, and remove the citation when the section goes). Put a
decision's reason in DECISIONS.md, not in a code comment or a plan.

A `docs/PLAN_*.md` lives only while its work is ongoing. When the work is done,
move what still matters into the three documents above and delete the plan;
git keeps its history. Never cite a plan from code, tests or resources.

## GitHub

The human user controls GitHub. Local commits on your own branch are fine.
Pushing a branch and opening a pull request is fine.

Claude must **NEVER merge a PR or otherwise push to `main`**. GitHub Pages
publishes the preview from `main`, so a merge makes the change public there. The human reviews
and merges on GitHub. This holds even when asked to "merge to main" – interpret
that as "prepare and open the PR".

`gh` is **not installed** on this machine. Open PRs against
`Smaspararguiden/verktyg` through the GitHub REST API, with the token from
`git credential fill`. The recipe (which shell, how to feed it input, building
the JSON body in Python with UTF-8) is in `~/.claude/CLAUDE.md`.

Fetch and cut a new branch from fresh `origin/main` for every change. Every session works in
its own worktree, never in the main clone, and decision numbers in
`docs/DECISIONS.md` are reserved before the entry is written. The rules are in
`~/.claude/CLAUDE.md`, section "Småspararguiden's site and its small repos".

## Publishing to WordPress

Andreas or the site's web manager publishes; Claude never touches the site
(`docs/DECISIONS.md` 38). Claude's part is the zip file: everything in one
folder named `smaspararguiden-verktyg`, holding the PHP file and the files the
tools load (listed in `docs/ARCHITECTURE.md`, section "Publicering"), nothing
else. A zip built for upload carries a new `Version:` in the PHP header, so
WordPress shows which copy is installed.

After the upload the site's cache has to be cleared; `~/.claude/CLAUDE.md`
says how.

## Privacy

Nothing a visitor types (salary, pension capital, age) may leave the browser
unless a decision in `docs/DECISIONS.md` says so, stating what is sent and why.
Småspararguiden's GDPR policy applies.
