# Plan: ITP-räknesnurran

Räknesnurra för smaspararguiden.se, del av kampanjen Befria ITP. Den visar
hur mycket en användare med ITP1 vinner på att flytta allt som går att flytta
till fondförsäkring, och vad regeln om att hälften måste ligga i traditionell
försäkring kostar.

Kravspecen ligger i Google Docs: "Kravspec ITP-snurra".

Den här planen lever bara medan bygget pågår. När det är klart flyttas det som
fortfarande gäller in i `ARCHITECTURE.md` (hur det fungerar), `DECISIONS.md`
(varför) och `FUTURE_DEV.md` (vad som inte är byggt), och planen raderas.

Vägvalen hittills står i `DECISIONS.md` (1–24).

## Modellen

Byggd i `itp/berakning.js`. Räknar år för år, i reala kronor, från
användarens ålder till pensionsåldern. Kapitalet ligger i "potter": två i de
flesta scenarier (obligatorisk och flyttbar), tre i "nuvarande".

För varje år och pott:

1. **Lön** växer med real löneökning, plus ett karriärpåslag till 50 år. **IBB**
   växer med sin egen parameter.
2. **Premie** (från 25 år till pensionsåldern) = 4,5 % av lönen upp till 7,5 IBB plus 30 % av lönen mellan
   7,5 IBB och lönetaket. Collectums avgift (0,55 %, högst 450 kr per år) dras
   först. Hälften av resten går till varje del.
3. **Aktieandel** utifrån produkten. Alecta: efter ålder (punkter, linjärt
   däremellan). Entrélösningen: 100 % till sex år före pensionsåldern, sedan
   linjärt ner mot 25 % under 20 år, så vid pensionen 77,5 % aktier.
4. **Avkastning** = aktieandel × aktieavkastning + resten × ränteavkastning.
5. **Avgift** = min(tak, max(golv, procent × kapital + fast belopp))
   + procent utan tak × kapital, där procent vägs mellan aktiedelens och
   räntedelens avgift efter aktieandelen. Delen utan tak behövs för Alecta,
   vars kapitalförvaltningskostnad tas ut utöver den avgift som har tak.
6. **Kapital vid årets slut** = kapital × (1 + avkastning)
   + premie × (1 + avkastning × andel) − avgift − skatt, där andelen
   (`avkastningsandelArsPremie`, 0,5) är hur mycket av årets avkastning
   årets premier får.

Scenarier:

| | Obligatorisk del | Flyttbar del |
|---|---|---|
| Allt i trad | Alecta | Alecta |
| Allt möjligt flyttat | Alecta | Entrélösningen |
| Allt flyttat | Entrélösningen | Entrélösningen |
| Nuvarande | Alecta | Det användaren har idag |

- Vinsten med att flytta det som går = *allt möjligt flyttat* − *allt i trad*.
- Kostnaden för 50 %-regeln = *allt flyttat* − *allt möjligt flyttat*.
- Redan uppnått = *nuvarande* − *allt i trad*.
- Kvar att hämta = *allt möjligt flyttat* − *nuvarande*.
- Andel uppnådd = redan uppnått ÷ vinsten med att flytta det som går. Styr
  trafikljuset (rött, gult, grönt). Gränserna är parametrar.

Kantfall:

- **Vinsten är nästan noll** (lite kapital nära pension, ovanligt i ITP1):
  inget trafikljus. Gränsen är en parameter.
- **Fondförsäkring räknas alltid som entrélösningen.** Vi ser bara att
  användaren valt fondförsäkring, inte vilka fonder. Det ska stå mycket
  tydligt i resultatet. Andelen uppnådd kapas vid 100 %.
- **Framtida premier** går till fond med den andel användaren anger, annars
  allt till trad (`DECISIONS.md` 12).
- **Obligatorisk del** räknas som hälften av kapitalet, högst det som ligger
  i trad (`DECISIONS.md` 11).

Förenklingar att ta ställning till:

- **Alectas avgiftstak räknas per pott.** Ligger både den obligatoriska och
  den flyttbara delen i Alecta är det troligen en försäkring med ett tak.
  Skillnaden är liten (0,05 % på kapitalet över taket).
- **Vinsten och kostnaden blir exakt lika stora för den som alltid varit
  passiv.** Båda delarna är lika stora och ligger i samma produkt, så att
  flytta den ena halvan ger lika mycket som att flytta den andra. Det är
  inget fel, men det ser kanske konstigt ut i resultatet.

Pensionsåldern (68 år) och premierna fram till den, se `DECISIONS.md` 7.

## Faser

### Fas 1 – Modellen
- [x] Andreas läser igenom modellen ovan.
- [x] Ta reda på hur avtalat.se visar kapital och inbetalningar. Inmatningen
      är ombyggd efter det.
- [x] Verifiera värdena markerade VERIFIERA i `parametrar.js`.
- [x] Andreas sätter antagandena om avkastning (6 % aktier, 1 % räntor).
- [x] Andreas sätter antagandet om löneökning, se `DECISIONS.md` 18.

### Fas 2 – Repo och beräkningsmodul
- [x] Skapa repot och klona det lokalt.
- [x] Sätt upp `CLAUDE.md`, `docs/` och flytta in `parametrar.js` och den här
      planen.
- [x] Bygg beräkningsmodulen med tester (`itp/berakning.js`):
  - kontrolltester (noll avkastning ger summan av premierna, samma aktieandel
    ger samma resultat i alla scenarier, 100 000 kr med 6 % i 34 år ger cirka
    725 000 kr)
- [x] Jämför med det befintliga kalkylarket där det täcker samma fall (klart enligt
      Andreas, 2026-11-05).
  - [x] Premien stämmer med kalkylarket (Andreas, 2026-10-31).
  - [x] Avgift och skatt år 1 stämmer, i avrundade värden, med kalkylarket
        när det också räknar Alectas kapitalförvaltningskostnad på 0,03 %
        (Andreas, 2026-10-31).
  - [x] Hela förloppet till pension stämmer för noll startkapital och lön
        över brytpunkten, med testvärdena (ingen real löne- och IBB-ökning,
        Alecta 70 % aktier, entrélösningen 100 % aktier och 0,12 %, ingen
        avkastning på årets premier). Kalkylarket saknar Alectas avgiftstak,
        så med taket skiljer det när en pott passerar 960 000 kr. Utan taket
        stämmer det hela vägen till 68 (Andreas, 2026-10-31 och 2026-11-04).
  - [x] Startkapital utan premier stämmer: 100 000 kr i trad, och 100 000 kr
        i trad plus 100 000 kr i fond (Andreas, 2026-11-03).
  - [x] Eget sparande per månad stämmer: värdet år för år, och trad-potten
        plus eget sparande blir lika med fond-potten efter skatt (Andreas,
        2026-11-04).
  - [x] Rimlighetstester, utan kalkylark: Alectas avgiftstak med och utan,
        startkapital med mer än hälften i fond, och de riktiga parametrarna
        (nedtrappningarna, löneökningen och avkastningen på årets premier).
        Gjorda av Claude, inte kontrollerade mot något annat än modellens egna
        samband: resultaten går åt rätt håll, inget hopp vid hälften i fond,
        och vinsten följer lön, premie och ålder. Körda med Alecta på både
        60 % och 70 % aktier (2026-11-04), före Collectums avgift och med
        nedtrappningen 50 och 40 %.
  - [x] Rimlighetstesterna omkörda med dagens parametrar, inklusive Collectums
        avgift, 70/60/50 % och karriärpåslaget. Avgift 0 % ger samma resultat
        som koden före avgiften, och hela premien som avgift utan tak ger noll
        utan kapital. Inte kontrollerade mot något annat än modellens egna
        samband (Claude, 2026-11-05).
- [x] Export av tabellen år för år till CSV, för stickprov för hand (knapp
      på sidan).

### Fas 3 – Visning och publicering
- [x] Enkel sida: inmatning, scenarierna, vinst och kostnad, trafikljus,
      åldersvarning och "Så har vi räknat".
- [x] Testa lokalt på dator.
- [x] Sajtens färger (från chattens brand i smaspararboten).
- [x] Typsnittet Lato, från repot (`itp/typsnitt/`).
- [x] Publicera på GitHub Pages med `noindex`.
- [ ] Kollegorna testar på den privata sidan. En privat sida visas bara för
      inloggade redaktörer och administratörer, så de behöver ett sådant konto,
      eller så blir sidan lösenordsskyddad under testet.
- [x] Bygg WordPress-pluginen med kortkoden `[itp_raknesnurra]`.
- [x] Installera pluginen, först i testmiljön och sedan på den skarpa sajten,
      och lägg kortkoden på en privat sida (Andreas, 2026-11-06, se
      `DECISIONS.md` 21).
- [ ] Kontrollera snurran i temat, på dator och mobil: fält, knappar,
      rubriker och att temat inte knuffar våra komponenter.
  - [x] Testmiljön: räknar rätt, CSV-filen stämmer och mobilbredden ser bra ut
        (Andreas).
  - [x] Skarpa sajten på dator: fallet 1988 och 70 000 kr ger samma vinst som i
        testmiljön, 1 056 760 kr (Andreas, 2026-11-06).
  - [ ] Skarpa sajten på mobil.
  - [ ] Fälten och källorna (`DECISIONS.md` 22 och 23) i temat, först i
        testmiljön och sedan på den skarpa sajten.
- [ ] Publicera sidan och kontrollera den utifrån på dator och mobil, inklusive
      popups från Hustle.
- [ ] Lägg in sidan i menyn. Sajtens meny är handplockad, så sidan hamnar inte
      där av sig själv.

### Fas 4 – Steg 2
- [x] Motsvarande eget sparande per månad (`DECISIONS.md` 13).
- [x] Andreas bestämmer skatten på pensionen i jämförelsen, se `DECISIONS.md` 19.
- [ ] Pension per månad.
- [ ] Call to action, guide för att flytta: i steg 1 en länk till
      https://www.smaspararguiden.se/blogg/vad-skall-jag-valja-inom-itp-itp1-och-itp2/.
      Senare en egen sida om hur man byter på avtalat.se, som även andra
      sidor kan länka till.
- [ ] Call to action, donation: Octany finns redan på sajten (målwidget,
      Swish-widget och flöde på kampanjsidan, insamlingssida
      smaspararguiden.octany.site/itp-kampanjen). Snyggast om man kan
      donera utan att lämna sidan. Två vägar, som vi väljer mellan senare:
      lägga Octanys widgetar i WordPress direkt under kortkoden (ingen kod
      från oss), eller låta snurran visa Swish-widgeten under resultatet med
      en text som knyter an till användarens siffror (widgetens id i
      kortkoden). Widgetarna laddas från Octany i besökarens webbläsare, som
      på resten av sajten.
- [ ] Call to action, mejla fackförbundet: förslag på mejltext med hur mycket
      pension användaren förlorar och adress till rätt fackrepresentant. Minst
      delar ligger hos oss, eftersom siffrorna bara finns i webbläsaren.
      Andreas funderar på hur det ska se ut och fungera.
- [ ] Kanske: fackförbund som valfri uppgift. Ett alternativ är att fråga
      först när användaren ska mejla och det verkligen behövs.
- [ ] Lista över fackförbund och mejladresser, kanske som en publik sida.
- [ ] Text om begränsningar (troligen i WordPress).
- [ ] Mätning av antal användare och resultat (`DECISIONS.md` 24–26). Byggd. Kvar:
      några testfall på sajten visar att raderna kommer fram, och
      integritetspolicyn får en rad om det som sparas.

## Öppna frågor

1. ~~Hur avtalat.se visar kapital och inbetalningar.~~ Se `DECISIONS.md` 11
   och 12.
2. ~~Apps Script eller Zapier för att logga resultat.~~ Apps Script, se
   `DECISIONS.md` 24.
3. ~~Vilken data som skickas.~~ Se `DECISIONS.md` 24. Fackförbund är inte med.
4. ~~Iframe eller WordPress-plugin.~~ Plugin, se `DECISIONS.md` 9.
5. ~~Ska användaren dela upp traditionell försäkring i obligatorisk och
   valbar del?~~ Nej, avtalat.se visar inte delarna. Se `DECISIONS.md` 11.
6. ~~Alectas aktieandel.~~ 70, 60 och 50 %, se `DECISIONS.md` 15.
7. ~~Vilken avgift vi räknar på för entrélösningen.~~ 0,08 %, se
   `DECISIONS.md` 17.
8. ~~Alectas kapitalförvaltningskostnad.~~ 0,03 %, se `DECISIONS.md` 17.
9. **Det kritiska felet på den skarpa sajten (2026-11-06).** WordPress visade
   "Det har uppstått ett kritiskt fel" vid uppladdningen av pluginen eller när
   sidan skapades, innan pluginen var aktiverad. Pluginens kod hade alltså inte
   körts. Exakt när felet kom vet vi inte.
   Felet har inte visat sig igen, och orsaken är okänd. Felmeddelandet finns
   troligen i mejlet från WordPress eller i serverns felogg.
10. **Hur uppdateringar laddas upp.** FTP eller zip-fil. Att ladda upp en
    zip-fil över en installerad plugin är inte provat.
