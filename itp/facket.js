// The mail a visitor can send to their union, with their own figures. Knows
// nothing about the page; visning.js shows it under [itp_mejl_till_facket].

import { tusental, tiotal } from "./matning.js";

export const AMNE = "Låt oss välja fritt för hela ITP1-pensionen";

const belopp = (x) => x.toLocaleString("sv-SE");

// r is the result from berakna(). The monthly amount is what the rule alone
// costs: the saving without the rule minus the saving with what can be moved
// today. It is left out when there is no saving comparison.
export function mejl(r) {
  const kostnad = tusental(r.kostnadRegeln);
  const perManad = r.privatFlytt === null ? null : tiotal(r.privatUtanRegeln - r.privatFlytt);
  const berakning = "Jag har räknat på vad det betyder för mig med Småspararguidens räknesnurra. "
    + "Enligt beräkningen gör kravet på traditionell försäkring att jag får ungefär "
    + `${belopp(kostnad)} kr mindre i pensionskapital.`
    + (perManad > 0
      ? ` Det motsvarar att själv spara ${belopp(perManad)} kr varje månad fram till pensionen.`
      : "");
  const stycken = [
    "Hej,",
    "Jag är medlem och har ITP1 genom min anställning. Jag har fortfarande många år till "
      + "pensionen, och då är standardrådet från forskare och experter att ha hela mitt "
      + "pensionskapital i aktiemarknaden. Det skulle jag kunna få i de utmärkta "
      + "entrélösningarna för fondförsäkring som är upphandlade inom ITP. Men i dag får jag "
      + "inte placera alla mina pengar där, utan hälften av min premie måste gå till "
      + "traditionell försäkring. Därför kan jag inte följa experternas råd.",
    berakning,
    "ITP-avtalet förhandlas av PTK, där vårt förbund ingår, och nästa upphandling görs 2028. "
      + "Jag skulle verkligen önska att förbundet driver att kravet på obligatorisk traditionell "
      + "försäkring tas bort, så att vi som vill kan placera hela vår ITP1-pension i "
      + "fondförsäkring.",
    "Hur ser förbundet på det, och vad kan ni göra inför upphandlingen?",
    "Vänliga hälsningar\n[Namn]",
  ];
  return { amne: AMNE, text: stycken.join("\n\n") };
}
