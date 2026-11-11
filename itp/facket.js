// The mail a visitor can send to their union, with their own figures. Knows
// nothing about the page; visning.js shows it under [itp_mejl_till_facket].
// The site can write its own subject and text in the shortcode; the text then
// holds the placeholders {kostnad} and {per_manad}. Without them, the text
// below is used.

import { tusental, tiotal } from "./matning.js";

export const AMNE = "Låt oss välja fritt för hela ITP1-pensionen";

// The mail used when the shortcode holds no text of its own.
export const MALL = [
  "Hej,",
  "Jag är medlem och har ITP1 genom min anställning. Jag har fortfarande många år till "
    + "pensionen, och då är standardrådet från forskare och experter att ha hela mitt "
    + "pensionskapital i aktiemarknaden. Det skulle jag kunna få i de utmärkta "
    + "entrélösningarna för fondförsäkring som är upphandlade inom ITP. Men i dag får jag "
    + "inte placera alla mina pengar där, utan hälften av min premie måste gå till "
    + "traditionell försäkring. Därför kan jag inte följa experternas råd.",
  "Jag har räknat på vad det betyder för mig med Småspararguidens räknesnurra. "
    + "Enligt beräkningen gör kravet på traditionell försäkring att jag får ungefär "
    + "{kostnad} kr mindre i pensionskapital. "
    + "Det motsvarar att själv spara {per_manad} kr varje månad fram till pensionen.",
  "ITP-avtalet förhandlas av PTK, där vårt förbund ingår, och nästa upphandling görs 2028. "
    + "Jag skulle verkligen önska att förbundet driver att kravet på obligatorisk traditionell "
    + "försäkring tas bort, så att vi som vill kan placera hela vår ITP1-pension i "
    + "fondförsäkring.",
  "Hur ser förbundet på det, och vad kan ni göra inför upphandlingen?",
  "Vänliga hälsningar\n[Namn]",
].join("\n\n");

const belopp = (x) => x.toLocaleString("sv-SE");

// The few entities WordPress writes into text: its curly quotes and dashes come
// as numeric ones.
const ENTITETER = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const avkoda = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (hel, namn) => ENTITETER[namn.toLowerCase()] ?? hel);

// Turns the text between the shortcode tags into plain text. WordPress has
// made paragraphs of it with <p> and <br>, sometimes with a stray tag at either
// end; paragraphs become blank lines and line breaks single ones.
export function mallFranHtml(html) {
  const text = avkoda(html
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?>\s*/gi, "\n")
    .replace(/<\/p>\s*/gi, "\n\n")
    .replace(/<[^>]*>/g, ""));
  return text
    .split("\n").map((rad) => rad.trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// r is the result from berakna(); egen holds the site's own amne and mall,
// either of which may be empty. The monthly amount is what the rule alone
// costs: the saving without the rule minus the saving with what can be moved
// today. Without a saving comparison, the sentence holding {per_manad} is left
// out.
export function mejl(r, egen = {}) {
  const kostnad = tusental(r.kostnadRegeln);
  const perManad = r.privatFlytt === null ? null : tiotal(r.privatUtanRegeln - r.privatFlytt);
  const mall = egen.mall || MALL;
  const stycken = mall.split("\n\n").map((stycke) => {
    if (perManad > 0) return stycke.replaceAll("{per_manad}", belopp(perManad));
    if (!stycke.includes("{per_manad}")) return stycke;
    // A sentence ends at . ! or ? followed by a space or a line break.
    const meningar = stycke.split(/(?<=[.!?])[ \n]+/);
    return meningar.filter((m) => !m.includes("{per_manad}")).join(" ");
  }).filter((stycke) => stycke.trim() !== "");
  const text = stycken.join("\n\n").replaceAll("{kostnad}", belopp(kostnad));
  return { amne: egen.amne || AMNE, text };
}
