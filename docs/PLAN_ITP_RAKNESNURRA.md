# Plan: ITP-räknesnurran

Räknesnurra för smaspararguiden.se, del av kampanjen Befria ITP. Den visar
hur mycket en användare med ITP1 vinner på att flytta allt som går att flytta
till fondförsäkring, och vad regeln om att hälften måste ligga i traditionell
försäkring kostar.

Kravspecen ligger i Google Docs: "Kravspec ITP-snurra".

Den här planen lever bara medan bygget pågår. När det är klart flyttas det som
fortfarande gäller in i `ARCHITECTURE.md` (hur det fungerar), `DECISIONS.md`
(varför) och `FUTURE_DEV.md` (vad som inte är byggt), och planen raderas.

Vägvalen hittills står i `DECISIONS.md` (1–6). Iframe eller plugin är öppet,
se Öppna frågor.

## Modellen

Räknar år för år, i reala kronor, med två delar: obligatorisk trad och
flyttbar del.

För varje år:

1. **Lön** växer med real löneökning. **IBB** växer med sin egen parameter.
2. **Premie** = 4,5 % av lönen upp till 7,5 IBB plus 30 % av lönen mellan
   7,5 IBB och lönetaket. Hälften går till varje del.
3. **Aktieandel** för delen, utifrån produkten och användarens ålder (punkter
   med ålder och aktieandel, linjärt däremellan).
4. **Avkastning** = aktieandel × aktieavkastning + resten × ränteavkastning.
5. **Avgift** = min(tak, max(golv, procent × kapital + fast belopp))
   + procent utan tak × kapital. Den sista delen behövs för Alecta, vars
   kapitalförvaltningskostnad tas ut utöver den avgift som har tak.
6. **Kapital vid årets slut** = kapital × (1 + avkastning)
   + premie × (1 + avkastning/2) − avgift − skatt.

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
- **Framtida premier** antas gå dit där kapitalet ligger, tills vi vet hur
  avtalat.se visar inbetalningarna.

## Faser

### Fas 1 – Modellen
- [ ] Andreas läser igenom modellen ovan.
- [ ] Ta reda på hur avtalat.se visar kapital och inbetalningar (fråga ute).
      Det avgör inmatningen.
- [x] Verifiera värdena markerade VERIFIERA i `parametrar.js`. Kvar: Alectas
      aktieandel per ålder, som bara finns i andrahandskälla.
- [ ] Andreas sätter antagandena om avkastning och löneökning.

### Fas 2 – Repo och beräkningsmodul
- [x] Skapa repot och klona det lokalt.
- [x] Sätt upp `CLAUDE.md`, `docs/` och flytta in `parametrar.js` och den här
      planen.
- [ ] Bygg beräkningsmodulen med tester:
  - kontrolltester (noll avkastning ger summan av premierna, samma aktieandel
    ger samma resultat i alla scenarier, 100 000 kr med 6 % i 34 år ger cirka
    725 000 kr)
  - jämförelse med det befintliga kalkylarket där det täcker samma fall
- [ ] Export av tabellen år för år till CSV, för stickprov för hand.

### Fas 3 – Visning och publicering
- [ ] Enkel sida: inmatning, scenarierna, vinst och kostnad, trafikljus,
      åldersvarning och "Så har vi räknat".
- [ ] Testa lokalt på dator.
- [ ] Publicera på GitHub Pages med `noindex`. Testa på mobil via länken och
      låt andra testa.
- [ ] Lägg in den på en dold WordPress-sida (iframe eller plugin, enligt
      webbansvarigs svar).

### Fas 4 – Steg 2
- [ ] Pension per månad och motsvarande privat sparande per månad.
- [ ] Call to action: guide för flytt, donation, mejl till fackförbundet.
- [ ] Lista över fackförbund och mejladresser, kanske som en publik sida.
- [ ] Text om begränsningar (troligen i WordPress).
- [ ] Mätning av antal användare och resultat.

## Öppna frågor

1. **Hur avtalat.se visar kapital och inbetalningar.** Fråga ute.
   Avgör både befintligt kapital och vart framtida premier går.
2. **Apps Script eller Zapier** för att logga resultat till ett Google Sheet.
3. **Vilken data som skickas**, till exempel om fackförbund ska med.
   Småspararguidens GDPR-policy gäller.
4. **Iframe eller WordPress-plugin.** Fråga ställd till webbansvarig.
