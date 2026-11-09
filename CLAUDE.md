# Claude Code – Project Instructions

This repo holds tools that Småspararguiden publishes on smaspararguiden.se,
for example calculators. Each tool runs entirely in the visitor's browser:
plain JavaScript, no build step. The only server code passes the ITP
calculator's statistics on to Google. The tools are published as a WordPress plugin
(`smaspararguiden-verktyg.php`, one shortcode per tool), uploaded by hand: a
zip file through the WordPress admin the first time, then FTP. GitHub Pages
shows a preview.

Never modify code unless explicitly requested. Prefer discussion over
implementation.

Always write code comments in English. Text that visitors see is in Swedish.

Always consider writing or modifying tests when writing code. Do it when
reasonable. Tests use Node's built-in test runner (`node --test`), so they need
no installed packages.

Look in `docs/ARCHITECTURE.md` to understand the architecture and use similar
patterns for new code.

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
`git credential fill`. The details (which shell, how to feed it input, building
the JSON body in Python with UTF-8) are the same as in the smaspararboten repo's
`CLAUDE.md`, section "Opening a pull request".

## Privacy

Nothing a visitor types (salary, pension capital, age) may leave the browser
unless a decision in `docs/DECISIONS.md` says so, stating what is sent and why.
Småspararguiden's GDPR policy applies.
