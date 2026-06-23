# FosterFlow — Fáze 0: Briefing pro Claude Code

Tento dokument je určen jako **první prompt/kontext** pro Claude Code. Neobsahuje byznys logiku (ta je v Master Blueprintu v6) — řeší jen technický start projektu, pravidla práce s nejistotou a definici hotovosti pro každou fázi.

---

## 0.1 Než začneš psát kód

**Soubory, které k tomuto briefingu patří a musí být v kontextu:**
- `schema.sql` — kompletní databázové schéma, spustit v Supabase SQL Editoru v jednom běhu
- `seed.sql` — výchozí data (permissions, taxonomy_terms, system_parameters), spustit hned po schema.sql
- `FosterFlow_Master_Blueprint_v6.docx` — kompletní byznys specifikace (krmit po kapitolách dle aktuální fáze, NE celý najednou)

**Pravidlo krmení kontextu:** Pro každou fázi (viz 0.4) přilož jen kapitoly Blueprintu relevantní pro danou fázi. Celý dokument najednou je příliš velký na to, aby z něj šlo spolehlivě implementovat — vede to k povrchnímu, ne hloubkovému dodržení detailů.

## 0.2 Technologický stack — pevné verze

```json
{
  "name": "fosterflow",
  "engines": { "node": ">=20.0.0" },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.400.0",
    "ajv": "^8.17.0",
    "zod": "^3.23.0",
    "@tiptap/react": "^2.5.0",
    "@tiptap/starter-kit": "^2.5.0",
    "next-pwa": "^5.6.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0"
  }
}
```

**Proč pevné verze:** bez nich agent při každém běhu může zvolit jinou verzi a vytvořit nekonzistentní lockfile mezi sezeními. Pokud se verze ukáže jako nedostupná, aktualizuj tento seznam explicitně a popiš proč — ne tichou náhradou.

## 0.3 .env.example — šablona proměnných prostředí

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Cloud Platform
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_SERVICE_ACCOUNT_KEY_JSON=
GOOGLE_GEMINI_API_KEY=

# Aplikace
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Notifikace (Fáze 3+)
RESEND_API_KEY=
FIREBASE_CLOUD_MESSAGING_KEY=
```

## 0.4 Pravidlo chování při nejistotě

Když specifikace v Blueprintu neřeší konkrétní implementační detail (např. přesný název React komponenty, přesné CSS třídy), **agent zvolí konzervativní výklad konzistentní s existující architekturou a pokračuje** — nezastavuje se a neptá se na drobnosti.

Když specifikace **chybí na úrovni byznys rozhodnutí** (např. "jaký je přesný formát PDF zprávy pro soud" nikde není), agent **se zastaví a explicitně se zeptá** — tichý dohad na byznys rozhodnutí je přesně to riziko, kterému se tento celý postup snažil vyhnout.

Rozlišení: *implementační detail* = jak se to napíše. *Byznys rozhodnutí* = co se má stát.

## 0.5 Pravidlo "žádné tiché přejmenování"

Pokud agent během práce zjistí, že tabulka/sloupec ze schema.sql by se měl jmenovat jinak nebo má chybnou strukturu, **NESMÍ** to tiše opravit a pokračovat. Musí:
1. Zastavit se
2. Popsat nález a navrhovanou opravu
3. Počkat na potvrzení
4. Teprve po potvrzení provést `ALTER TABLE`/migraci a zaznamenat ji do `/migrations` se zdůvodněním

## 0.6 Definice hotovosti (Definition of Done) per fáze

Fáze se nepovažuje za dokončenou na základě "kód je napsaný", ale na základě **ověřitelného acceptance testu**.

### Fáze 1 — Jádro (MVP, osa rodiny)
**Acceptance test:**
1. Lze vytvořit organizaci přes seed/admin rozhraní
2. Lze přihlásit uživatele s rolí KO (Magic Link)
3. Lze založit rodinu (household) s jedním dítětem (Karta kontaktu, person.category = foster_child)
4. Lze zapsat událost (event) typu `visit_log` a vidět ji na timeline rodiny
5. **Bezpečnostní test:** druhý uživatel s rolí KO, který NENÍ přiřazen k této rodině, NEVIDÍ ji v `GET /api/households` ani při přímém volání s jeho ID v URL
6. Konfigurovatelná tabulka `households_list` se vykreslí se sloupci ze `seed.sql` výchozí konfigurace a uživatel může změnit pořadí sloupců, které se uloží

### Fáze 2 — Provozní a finanční nezbytnosti
**Acceptance test:**
1. Lze vytvořit `provider` (platební partner) a `payment_document` vázaný na konkrétní dítě přes `payment_document_items.person_id`
2. Schvalovací krok vázaný na `permission_code` (NE na roli) funguje — uživatel s oprávněním `finance.approve_basic` vidí doklad ke schválení, uživatel bez tohoto oprávnění ho nevidí
3. SPVPP report za období se zlomovým datem v `system_parameters` vrátí rozdělený výpočet (temporální split) — ověřit na testovacích datech s uměle vloženou změnou parametru v polovině roku
4. Soft-blokace funguje: pokus o respit pro dítě mladší 2 let zobrazí varování, ne tvrdý error, a po potvrzení s důvodem se zapíše do `audit_logs.warning_override_reason`

### Fáze 3 — Automatizace a první AI
**Acceptance test:**
1. Uložení události s `post_actions` definicí automaticky vytvoří task nebo notification (ověřit na `child_runaway` příkladu z Blueprintu)
2. RAG dotaz na legislativu vrátí odpověď pouze s citacemi z `knowledge_base_articles`, kde `valid_to IS NULL`, a zapíše dotaz do `ai_interaction_logs`
3. Dokument nahraný a zpracovaný OCR pipeline vytvoří `ai_interpretation` JSON, který KO může opravit před uložením

### Fáze 4 — Enterprise a externí integrace
**Acceptance test:**
1. AI BI chatbot na dotaz "kolik máme neschválených dokladů" vygeneruje SELECT nad `ai_bi_finance_view`, spustí ho pod RLS kontextem přihlášeného uživatele, a pěstoun v testu dostane 0 nebo jen svá data bez ohledu na obsah promptu
2. Externí účetní s `accountant_access_tokens` nemůže získat přístup bez zadání SMS PINu
3. Bankovní výpis s transakcí bez VS, ale podobnou částkou, vyvolá AI heuristické párování s `pending_verification` stavem

### Fáze 5 — Rozšířená analytika
**Acceptance test:**
1. `mv_ko_workload.weighted_workload_score` se správně počítá (1 bod/rodina, +1/soudní spor, +3/aktivní krize) — ověřit na testovacích datech
2. Provozovatel (`is_system_operator = TRUE`) vidí agregovaná data všech organizací v `global_statistics_daily`, ale NEVIDÍ detail konkrétní rodiny jiné organizace bez explicitního přístupu

## 0.7 Repo struktura (návrh)

```
fosterflow/
├── schema.sql              -- spustit jako první
├── seed.sql                -- spustit jako druhý
├── migrations/             -- každá pozdější změna schématu, číslovaná, se zdůvodněním
├── docs/
│   └── master_blueprint_v6.md
├── src/
│   ├── app/
│   │   ├── (worker)/        -- FosterFlow Worker - mobilní PWA
│   │   ├── (organization)/  -- FosterFlow Organization - desktop
│   │   └── (client-portal)/ -- Klientská zóna - pěstouni
│   ├── lib/
│   │   ├── supabase/
│   │   └── validation/      -- Ajv schémata pro event_definitions
│   └── components/
│       └── DataGridView/    -- sdílená komponenta pro konfigurovatelné tabulky (kap. 10)
├── .env.example
└── package.json
```

## 0.8 První promptová instrukce pro Claude Code

Doporučený první prompt po nahrání tohoto briefingu a schema.sql/seed.sql:

> "Spusť schema.sql a seed.sql proti nové Supabase instanci. Ověř, že všech 112 tabulek a 4 views se vytvořilo bez chyby. Pak založ Next.js projekt dle package.json výše, připoj Supabase klienta, a implementuj pouze Fázi 1 dle acceptance testu v sekci 0.6 — žádné moduly z Fáze 2 a dál. Až bude acceptance test Fáze 1 splnitelný, zastav se a nahlas to, nepokračuj automaticky do Fáze 2."
