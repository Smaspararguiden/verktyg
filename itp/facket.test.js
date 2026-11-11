import { test } from "node:test";
import assert from "node:assert/strict";
import { AMNE, MALL, mallFranHtml, mejl } from "./facket.js";
import { berakna, delaUppKapital } from "./berakning.js";
import { parametrar as p } from "./parametrar.js";

// No salary, 400 000 kr all in trad, 38 years old.
const r = berakna(p, { alder: 38, manadslon: 0, kapital: delaUppKapital(p, 400000, 0), andelPremieFond: null });
// Thin spaces in Swedish numbers are no-break spaces.
const utanHardaMellanslag = (s) => s.replace(/ /g, " ");

test("mejlet har ämnet och användarens belopp, avrundade som på sidan", () => {
  const { amne, text } = mejl(r);
  assert.equal(amne, AMNE);
  const kostnad = Math.round(r.kostnadRegeln / 1000) * 1000;
  assert.ok(utanHardaMellanslag(text).includes(`${kostnad.toLocaleString("sv-SE").replace(/ /g, " ")} kr mindre`));
});

test("månadsbeloppet är det regeln ensam kostar", () => {
  const manad = Math.round((r.privatUtanRegeln - r.privatFlytt) / 10) * 10;
  assert.ok(utanHardaMellanslag(mejl(r).text).includes(`spara ${manad} kr varje månad`));
});

test("utan sparjämförelse står inget månadsbelopp", () => {
  const { text } = mejl({ ...r, privatFlytt: null, privatUtanRegeln: null });
  assert.ok(!text.includes("varje månad"));
  assert.ok(text.includes("mindre i pensionskapital."));
});

test("bara namnet är kvar att fylla i", () => {
  const { text } = mejl(r);
  assert.deepEqual(text.match(/\[[^\]]*\]/g), ["[Namn]"]);
  assert.ok(text.startsWith("Hej,"));
});

// The text as a Shortcode block hands it over: wpautop's paragraphs, a stray
// closing tag first, WordPress's numeric quotes and an & from the serializer.
const wpHtml = "</p>\n<p>Hej facket,</p>\n<p>Regeln kostar mig {kostnad} kr &amp; det &#8221;svider&#8221;. "
  + "Det blir {per_manad} kr i månaden. Hör av er.</p>\n<p>Hälsningar<br />\n[Namn]</p>\n<p>";

test("sajtens text blir vanlig text med stycken och radbrytningar", () => {
  assert.equal(mallFranHtml(wpHtml),
    "Hej facket,\n\nRegeln kostar mig {kostnad} kr & det \u201dsvider\u201d. "
    + "Det blir {per_manad} kr i månaden. Hör av er.\n\nHälsningar\n[Namn]");
  assert.equal(mallFranHtml(""), "");
});

test("sajtens ämne och text används, med användarens belopp", () => {
  const manad = Math.round((r.privatUtanRegeln - r.privatFlytt) / 10) * 10;
  const { amne, text } = mejl(r, { amne: "Eget ämne", mall: mallFranHtml(wpHtml) });
  assert.equal(amne, "Eget ämne");
  const ren = utanHardaMellanslag(text);
  assert.ok(ren.startsWith("Hej facket,"));
  assert.ok(ren.includes(`Det blir ${manad} kr i månaden.`));
  assert.ok(!text.includes("{"));
});

test("utan sparjämförelse stryks bara meningen med {per_manad}", () => {
  const { text } = mejl({ ...r, privatFlytt: null, privatUtanRegeln: null }, { mall: mallFranHtml(wpHtml) });
  assert.ok(!text.includes("i månaden"));
  assert.ok(text.includes("svider\u201d. Hör av er."));
  assert.ok(text.endsWith("Hälsningar\n[Namn]"));
});

test("tomt ämne och tom text ger snurrans eget mejl", () => {
  assert.deepEqual(mejl(r, { amne: "", mall: "" }), mejl(r));
  assert.ok(MALL.includes("{kostnad}") && MALL.includes("{per_manad}"));
});
