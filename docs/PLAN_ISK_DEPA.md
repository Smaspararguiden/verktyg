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
3. **ISK-skatt:** kapitalunderlaget är värdet vid början av varje kvartal plus
   årets insättningar, delat med fyra. Fribeloppet räknas bara om användaren
   bockar i det. Skatten dras från kontot i slutet av året.
4. **Depå:** fondskatt 0,12 % av värdet 1 januari, dragen i slutet av året.
   Vid varje tidshorisont säljs allt: 30 % på vinsten, eller tillbaka den
   valda andelen av en förlust.
5. **Sparkonto:** räntan beskattas med 30 % varje år.
6. Scenarierna (8, 12, 5 och 0 %, och krasch −50 % år 1 och sedan 8 %) och
   horisonterna (1, 5, 10, 20, 30 år) står i parameterfilen.

## Kvar att göra

1. **Statslåneräntan för 2027.** Den fastställs 30 november 2026. Byt
   `statslanerantan` i parameterfilen (i dag 2,55 %, som gäller 2026).
2. **Räntan på sparkonto** (2 %) är ett antagande som ska kontrolleras mot
   dagens sparkonton.
3. **Jämförelse med Rika tillsammans** (rikatillsammans.se/verktyg/isk-kf-af-jamfor/).
   Samma indata i båda för samma pengar, och siffrorna in som tester.
   Deras logik syns inte, så skillnader måste förklaras utifrån deras
   beskrivning: de räknar avkastningen per månad och säljer depån i slutet,
   som vi.
4. **Möjliga tillägg**, om de behövs för artiklarna:
   - krasch sista året före försäljning, där depåns förlustavdrag gör mest nytta
   - utdelningar på enskilda aktier, som beskattas varje år på depån
   - reala kronor (dra av inflationen) i visningen
   - CSV-export av tabellen år för år
5. **Publicering.** Om simulatorn ska ut på sajten: kortkod i pluginen,
   texter för besökare och ett beslut om vad som får lämna webbläsaren (inget,
   som utgångsläge).
