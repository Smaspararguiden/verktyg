// Helpers shared by the tools. Every tool has its own copy of this file, so
// that no tool loads another tool's files (DECISIONS.md 40). The copies must be
// identical, which tests/kopior.test.js checks: change one, copy it to all.
// A helper that has to behave differently in one tool gets a name of its own
// in that tool's code instead.

// Escapes a text for HTML.
export const html = (s) => String(s).replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// A share as a Swedish percentage: procent(0.0255, 2) gives "2,55 %".
export const procent = (x, decimaler = 0) =>
  `${(x * 100).toLocaleString("sv-SE", { maximumFractionDigits: decimaler })} %`;

// Kronor rounded to whole kronor: kronor(1234.6) gives "1 235 kr".
export const kronor = (x) => `${Math.round(x).toLocaleString("sv-SE")} kr`;
