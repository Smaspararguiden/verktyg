# Plan: ISK eller depå

En simulator som jämför vad som blir kvar efter skatt med aktierna på ISK
eller på en depå (aktie- och fondkonto). Först ett arbetsverktyg för Andreas,
som underlag till två artiklar: en för Aktiespararna med räkneexempel, utifrån
intervjun med Jacob Lundberg ("ISK är inte skattegynnat", 2023), och en hos
oss om när läsarna ska använda depå. Kanske publiceras den senare.

Den här planen lever bara medan arbetet pågår. Vägvalen står i
`DECISIONS.md` (39).

## Modellen

Byggd i `isk-depa/berakning.js`, månad för månad i nominella kronor.

1. Två portföljer, var och en uppdelad i aktier och sparkonto. I den ena står
   aktierna på ISK, i den andra på depå. Sparkontot ligger utanför ISK i båda.
2. **Samma pengar:** samma aktieandel i båda (100 % som utgångsläge).
   **Samma risk:** depåns aktieandel är ISK:s delad med (1 − statens andel av
   en förlust), högst 100 %. Med 70 % på ISK och 21 % blir det 89 % på depån.
3. **ISK-skatt:** kapitalunderlaget är ISK:ns värde 1 januari, eller som val
   Skatteverkets snitt av kvartalsvärden (DECISIONS.md 42). Fribeloppet räknas bara om användaren
   bockar i det. Skatten dras från kontot i slutet av året.
4. **Depå:** fondskatt 0,12 % av värdet 1 januari, dragen i slutet av året.
   Vid varje tidshorisont säljs allt: 30 % på vinsten, eller tillbaka den
   valda andelen av en förlust.
5. **Sparkonto:** räntan beskattas med 30 % varje år.
   **Fondavgift:** dras från aktierna på båda kontona, på värdet 1 januari
   eller som val varje månad. Avkastningen i scenarierna är före avgift.
6. Scenarierna (8, 12, 5 och 0 %, och krasch −50 % år 1 och sedan 8 %) och
   horisonterna (1, 5, 10, 20, 30 år) står i parameterfilen.

## Kvar att göra

1. **Möjliga tillägg**, om de behövs för artiklarna:
   - krasch sista året före försäljning, där depåns förlustavdrag gör mest nytta
   - utdelningar på enskilda aktier, som beskattas varje år på depån
   - CSV-export av tabellen år för år
2. **Publicering.** Om simulatorn ska ut på sajten: en egen kortkod i samma
   plugin som ITP-snurran (Andreas valde det 25 november 2026; skriv in det i
   DECISIONS.md när publiceringen görs),
   texter för besökare och ett beslut om vad som får lämna webbläsaren (inget,
   som utgångsläge). Scenariotabellerna under den egna beräkningen tas då bort
   eller görs om till en graf. Kryssrutorna för exakt ISK-skatt och exakt
   avgift tas bort från sidan (DECISIONS.md 42); de är till för att stämma av
   mot andra kalkylatorer, inte för besökare.
