# FosterFlow — Master Blueprint v8

Kompletní konsolidované zadání, nahrazující všechny předchozí verze (V3–V6). Rozděleno do 10 milníků, aby AI programátor (Claude Code, Google Antigravity) dostával vždy jen relevantní část kontextu.

## Struktura balíčku

```
V8_FosterFlow/
├── docx/           — 12 dokumentů ve Wordu (pro čtení, tisk, sdílení)
├── mdx/             — stejných 12 dokumentů ve formátu pro Mintlify dokumentační web
├── sql/
│   ├── schema.sql   — kompletní databázové schéma, 143 tabulek, milníkově otagované
│   └── seed.sql     — výchozí oprávnění, číselníky, zákonné parametry
└── planning/
    ├── registr_rozhodnuti_v8.md  — proč se co jak jmenuje, ENUM vs. taxonomy rozhodnutí
    └── milnikova_mapa.md          — pracovní rozvrh všech 70 fází
```

## Jak začít

1. Přečti `mdx/00_index.mdx` (nebo `docx/00_index.docx`) — mapa celého projektu
2. Předej AI programátorovi `mdx/faze_0_briefing.mdx` — tech stack a pravidla práce
3. Spusť `sql/schema.sql`, poté `sql/seed.sql`
4. Předávej milníkové dokumenty AGENTOVI POSTUPNĖ — `milnik_01_zaklad` → `milnik_10_dlouhovekost`, jeden v jednu chvíli
5. Po Milníku 1: produkční nasazení pro první doprovázející organizaci

## Klíčové principy (platí pro všechny milníky)

- **Provider-agnostická architektura** — Google/Microsoft/AI poskytovatelé jsou VOLBA organizace přes adaptérová rozhraní, nikdy pevná závislost
- **Karta kontaktu** — jednotný koncept pro dítě, pěstouna, biologického příbuzného, sociální okolí
- **Žádné tiché breaking changes** — každý milník je migrace nad předchozím, regresní sada musí stále procházet
- **Vlastnictví dat** — plný export funguje ve všech tarifech bez výjimky

## Milníky v kostce

| # | Název | Gate otázka |
|---|---|---|
| 1 | Základ | Produkčně bezpečný pro 1 DO? |
| 2 | Provozní nezbytnosti | Soudy/krize/úkoly fungují? |
| 3 | Finance a SPVPP | Ekonomka pracuje v systému? |
| 4 | Multi-tenancy a SaaS | 2. DO běží bez kolize? |
| 5 | Svoboda volby ekosystému | Google/MS/nezávislost volitelné? |
| 6 | AI vrstva | AI bezpečná a vždy vypnutelná? |
| 7 | Analytika a měření | Datově podložené rozhodování? |
| 8 | Klientská zóna | Pěstouni mají bezpečnou samoobsluhu? |
| 9 | Veřejné API | Externí systém se bezpečně napojí? |
| 10 | Dlouhověkost a ekosystém | Zvládne systém 15–20 let evoluce? |
