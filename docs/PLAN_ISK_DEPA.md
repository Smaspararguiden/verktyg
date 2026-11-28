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
   valda andelen av en förlust. Schablonmetoden används när den ger lägre
   skatt, så vinstskatten blir högst 24 % av värdet (DECISIONS.md 45).
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

## Tankar till artiklarna (Andreas, 28 november 2026)

Bara noterade, inte diskuterade än.

1. Risken att börsen kraschar och att jag behöver pengarna oväntat. Det bör
   motsvara 21 % skydd på nedsidan utöver de 300 000 kr.
2. Har jag ändå tänkt ha pengar på sparkonto eller i räntefond är det lätt att
   räkna. Vill jag ha 100 % aktier i ISK-fallet blir det svårare, eftersom jag
   då lånar till högre ränta än sparkontot och det är svårt att veta kostnaden
   i hävstångsprodukter. ISK skulle kunna ses som ett alternativ till en
   hävstångsprodukt.
3. Även med 5 % nominellt tar det 21 år. Det är länge. Jag skulle inte tänka
   den tidshorisonten med tanke på allt som kan ändra sig på 21 år.
4. Depå är ett bra alternativ till en 70/30-portfölj.
5. Vad ISK-skatten kommer att vara är en osäkerhetsfaktor.
6. Den som har enskilda aktier behöver ändå beskatta utdelningar. Fondskatten
   bör vara låg i förhållande till förväntade utdelningar.
7. Man ska alltid ha 300 000 kr på ett ISK. Men om börsen går ner går det
   beloppet ner. Ska man då sälja av från depån och sätta in mer? Hur påverkar
   det beräkningarna från början?
8. Vid en börskrasch år 1 blir ISK aldrig bättre, även med 8 % avkastning
   därefter. I scenariot "Jag kommer antagligen ha pengarna här länge, men jag
   vill skydda mig mot börskrasch plus skilsmässa" är depå alltså ganska bra.
9. ISK kostar drygt 1 % per år. Hur jämför jag egentligen det med en
   hävstångsprodukt? Eller framför allt: hur tar jag hänsyn till lånekostnaden
   här? Borde det vara skillnaden mellan lånekostnaden och den riskfria räntan?
