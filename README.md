# verktyg

Verktyg som Småspararguiden publicerar på smaspararguiden.se, till exempel
räknesnurror. Varje verktyg körs helt i besökarens webbläsare och
publiceras som en WordPress-plugin med en kortkod per verktyg. GitHub Pages
visar en förhandsvisning.

## Verktyg

| Mapp | Verktyg | Status |
|---|---|---|
| `itp/` | Räknesnurra för ITP1: vad man vinner på att flytta till fondförsäkring och vad regeln om obligatorisk traditionell försäkring kostar | Under utveckling |
| `isk-depa/` | Simulator: ISK eller depå, med samma pengar och med samma risk | Arbetsverktyg, bara på GitHub Pages |
| `fond-etf/` | Fond eller ETF: genomsnittlig årlig kostnad beroende på innehavstid | Under utveckling, bara på GitHub Pages |

## Dokumentation

- `docs/ARCHITECTURE.md` – hur det fungerar
- `docs/DECISIONS.md` – varför det fungerar så
- `docs/PLAN_*.md` – pågående arbete

## Tester

```bash
node --test
```
