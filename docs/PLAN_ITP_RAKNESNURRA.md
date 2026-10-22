# Plan: ITP-räknesnurran

Räknesnurra för smaspararguiden.se, del av kampanjen Befria ITP. Den visar
hur mycket en användare med ITP1 vinner på att flytta allt som går att flytta
till fondförsäkring, och vad regeln om att hälften måste ligga i traditionell
försäkring kostar.

Kravspecen ligger i Google Docs: "Kravspec ITP-snurra".

Den här planen lever bara medan bygget pågår. När det är klart flyttas det som
fortfarande gäller in i `ARCHITECTURE.md` (hur det fungerar), `DECISIONS.md`
(varför) och `FUTURE_DEV.md` (vad som inte är byggt), och planen raderas.

Vägvalen hittills står i `DECISIONS.md` (1–7). Iframe eller plugin är öppet,
se Öppna frågor.

## Modellen

Byggd i `itp/berakning.js`. Räknar år för år, i reala kronor, från
användarens ålder till pensionsåldern. Kapitalet ligger i "potter": två i de
flesta scenarier (obligatorisk och flyttbar), tre i "nuvarande".

För varje år och pott:

1. **Lön** växer med real löneökning. **IBB** växer med sin egen parameter.
2. **Premie** (från 25 år till pensionsåldern) = 4,5 % av lönen upp till 7,5 IBB plus 30 % av lönen mellan
   7,5 IBB och lönetaket. Hälften går till varje del.
3. **Aktieandel** utifrån produkten. Alecta: efter ålder (punkter, linjärt
   däremellan). Entrélösningen: 100 % till sex år före pensionsåldern, sedan
   linjärt ner mot 25 % under 20 år, så vid pensionen 77,5 % aktier.
4. **Avkastning** = aktieandel × aktieavkastning + resten × ränteavkastning.
5. **Avgift** = min(tak, max(golv, procent × kapital + fast belopp))
   + procent utan tak × kapital, där procent vägs mellan aktiedelens och
   räntedelens avgift efter aktieandelen. Delen utan tak behövs för Alecta,
   vars kapitalförvaltningskostnad tas ut utöver den avgift som har tak.
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
- **Framtida premier** antas gå dit där kapitalet ligger, i samma proportion,
  tills vi vet hur avtalat.se visar inbetalningarna. Utan kapital går de till
  trad.

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
- [ ] Ta reda på hur avtalat.se visar kapital och inbetalningar (fråga ute).
      Det avgör inmatningen.
- [x] Verifiera värdena markerade VERIFIERA i `parametrar.js`. Kvar: Alectas
      aktieandel per ålder, som bara finns i andrahandskälla.
- [x] Andreas sätter antagandena om avkastning (6 % aktier, 1 % räntor).
- [ ] Andreas sätter antagandet om löneökning (1,5 % är platshållare).

### Fas 2 – Repo och beräkningsmodul
- [x] Skapa repot och klona det lokalt.
- [x] Sätt upp `CLAUDE.md`, `docs/` och flytta in `parametrar.js` och den här
      planen.
- [x] Bygg beräkningsmodulen med tester (`itp/berakning.js`):
  - kontrolltester (noll avkastning ger summan av premierna, samma aktieandel
    ger samma resultat i alla scenarier, 100 000 kr med 6 % i 34 år ger cirka
    725 000 kr)
- [ ] Jämför med det befintliga kalkylarket där det täcker samma fall.
- [x] Export av tabellen år för år till CSV, för stickprov för hand (knapp
      på sidan).

### Fas 3 – Visning och publicering
- [x] Enkel sida: inmatning, scenarierna, vinst och kostnad, trafikljus,
      åldersvarning och "Så har vi räknat".
- [x] Testa lokalt på dator.
- [ ] Sajtens typsnitt och färger (variablerna överst i `stil.css`).
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
