# V8 REGISTR ROZHODNUTÍ — master mapa (nahrazuje V6 registr v plném rozsahu)

## A. PROVIDER-AGNOSTICKÁ ARCHITEKTURA — NOVÝ ZÁKLADNÍ PRINCIP V8

Toto je nejdůležitější strukturální změna oproti V6. Čtyři kategorie externích závislostí
(storage, calendar, auth, AI) NESMÍ být nikde v kódu nebo schématu natvrdo navázány na
konkrétního poskytovatele (Google/Microsoft/jiný). Místo přímého volání "Google Drive API"
existuje:

1. Abstraktní KONTRAKT (rozhraní) definovaný v M1 (i když M1 má jen jeden adaptér)
2. Konkrétní ADAPTÉRY implementující kontrakt, přidávané postupně v M5
3. Konfigurace PER ORGANIZACE, který adaptér a na jaké ÚROVNI integrace se používá

### Úrovně integrace (platí pro všechny 4 kategorie)
- **Úroveň 0 — Žádná**: DO používá výhradně interní řešení systému (vlastní kalendář v appce,
  vlastní úložiště, vlastní login). Žádná data neopouští systém.
- **Úroveň 1 — Export/Import**: DO může jednosměrně exportovat (např. .ics kalendářní feed,
  ZIP se soubory), ale systém nečte zpět live data z cizí platformy.
- **Úroveň 2 — Hluboká integrace**: Oboustranná synchronizace, SSO, systém je "součástí"
  ekosystému DO (Google Workspace nebo Microsoft 365).

### Tabulka rozhodnutí — kategorie × dostupní adaptéři
| Kategorie | Adaptér: Interní (vždy dostupný) | Adaptér: Google | Adaptér: Microsoft |
|---|---|---|---|
| Storage | local_supabase_storage | google_drive | onedrive_sharepoint |
| Calendar | internal_calendar | google_calendar | microsoft_graph_calendar |
| Auth | email_password / magic_link | google_oauth | microsoft_oauth |
| AI | self_hosted_llm (volitelné, M6+) | google_gemini | (OpenAI/Anthropic jako další "Adaptér: Jiný") |

### Klíčový architektonický důsledek
Každá tabulka, která dříve (V5/V6) ukládala `google_drive_file_id` přímo, nyní ukládá
`storage_provider_key` + `external_file_reference` (generický pár). Každé volání kalendáře
nejde přímo na Google Calendar API, ale na interní `CalendarAdapterInterface.createEvent()`,
který si POD KAPOTOU vybere konkrétní implementaci podle `organization_integration_settings`.

## B. PŘEJMENOVÁNÍ/STRUKTURNÍ ZMĖNY OPROTI V6 (vše z V6 registru zůstává platné, toto jsou DODATKY)

| Změna | Popis | Důvod |
|---|---|---|
| `documents.external_drive_provider` (V6 TEXT) | → `documents.storage_provider_key` (FK na `integration_providers`) + zachován `external_drive_file_id` jako generický `external_file_reference` | Provider-agnostic storage |
| Google Calendar reference v `contact_schedules`, `court_hearings` apod. | Nově nepřímo přes `calendar_sync_links` tabulku, ne přímý sloupec | Provider-agnostic calendar |
| `knowledge_base_articles.embedding` pgvector | Zachováno, ale `ai_assistant_profiles` nově má `ai_provider_key` (FK), default `google_gemini`, alternativy `openai_gpt`, `anthropic_claude`, `self_hosted` | Provider-agnostic AI |
| `organizations.brand_colors` (V5/V6) | Rozšířeno na `organization_theme_config` (vlastní tabulka): barvy, font_family, layout_template_key, custom_css | Hloubkový whitelabeling (bod doplňku, M5.5) |
| `organization_subscriptions.feature_bank_matching_allowed` | Rozšířeno: rozlišuje `feature_bank_import_allowed` (M3, manuální) vs. `feature_bank_live_api_allowed` (M9, PSD2) | Bankovní napojení má dvě úrovně |

## C. NOVÉ TABULKOVÉ SKUPINY PRO 12 DOPLŇKOVÝCH BODŮ + GA KAPITOLU

| # | Bod ze zadání | Nové tabulky/koncepty | Milník |
|---|---|---|---|
| 1 | i18n | `translation_keys`, `translation_values`, `profiles.locale`, `organizations.default_locale` | M1.13 |
| 2 | DR/business continuity | `disaster_recovery_runbooks`, `backup_restore_tests`, RTO/RPO jako `system_parameters` | M1.10 |
| 3 | Vlastnictví dat / exit | `data_export_requests`, garance: export funguje ve VŠECH tarifech | M1.15 |
| 4 | Observabilita | `error_logs`, `performance_metrics`, integrace Sentry-like služby (adaptér, ne pevná vazba) | M1.11 |
| 5 | Accessibility | Není DB tabulka — je to checklist + automatizované testy (axe-core) v CI | M1.12 |
| 6 | Bezpečnostní audit | `security_audit_log`, `security_findings`, gate proces před produkčním nasazením | M1.14 |
| 7 | Právní/SLA vrstva | `organization_legal_agreements` (DPA, SLA verze, podpis) | M4.3 (navazuje na billing) |
| 8 | Nativní mobilní app (zvážení) | Žádná DB — architektonická poznámka + podmínka kdy aktivovat | Zmíněno v M1.8, rozhodnutí odložené |
| 9 | Import konkurenčních systémů | `import_jobs`, `import_mapping_templates` | M5.7 |
| 10 | Sandbox/demo | `organizations.is_sandbox`, automatický reset dat | M5.6 |
| 11 | Prompt verzování | `ai_prompt_versions`, `ai_prompt_ab_tests` | M6.6 |
| 12 | Etický AI audit | `ai_decision_explanations`, `ai_decision_disputes` | M6.8 |
| GA | Google Analytics / měření | `analytics_events`, `analytics_provider_config`, dvouúrovňové (globální vs. per-DO) | M7.5 |

## D. ENUM vs. TAXONOMY_TERM — ROZŠÍŘENO o nové typy z provider abstrakce

Vše z V6 registru zůstává v platnosti. Nové typy:

| Typ | Rozhodnutí | Důvod |
|---|---|---|
| `integration_category` (storage/calendar/auth/ai) | ENUM | Malá stabilní množina, vázaná na architekturu adaptérů |
| `integration_level` (0/1/2) | ENUM | Vázáno na byznys logiku přístupových práv |
| `provider_key` (google/microsoft/internal/openai/anthropic...) | ENUM rozšiřovaný migrací (ne taxonomy) | Přidání nového adaptéru je vždy kódová změna (nový adaptér = nový kód), takže ENUM je validní — taxonomy by zde předstíral konfigurovatelnost, která ve skutečnosti neexistuje bez nasazení kódu |
| `data_export_format` (json/csv/zip) | taxonomy_term | Popisné, rozšiřitelné bez kódu |
| `security_finding_severity` | ENUM | Vázáno na SLA reakční dobu |

## E. TOPOLOGICKÉ ZÁVISLOSTI — NOVĖ DOPLNĖNÉ SEKCE (navazuje na V6 pořadí 1-58)

```
59. integration_providers (statický seznam adaptérů, definovaný kódem ne uživatelem)
60. organization_integration_settings (organizations, integration_providers)
61. calendar_sync_links (events/court_hearings/contact_schedules, organization_integration_settings)
62. organization_theme_config (organizations)
63. translation_keys, translation_values (samostatné, jazykově neutrální)
64. disaster_recovery_runbooks, backup_restore_tests (organizations)
65. data_export_requests (organizations, profiles)
66. error_logs, performance_metrics (organizations - nullable pro systémové chyby)
67. security_audit_log, security_findings (organizations)
68. organization_legal_agreements (organizations)
69. import_jobs, import_mapping_templates (organizations)
70. ai_prompt_versions, ai_prompt_ab_tests (organizations - nullable pro globální prompty)
71. ai_decision_explanations, ai_decision_disputes (persons, profiles)
72. analytics_events, analytics_provider_config (organizations - nullable pro globální)
73. integration_providers seed: google, microsoft, internal, openai, anthropic, self_hosted
```

## F. MILNÍKOVÉ TAGOVÁNÍ TABULEK (nové pro V8)

Každá tabulka v `schema.sql` V8 ponese SQL komentář `-- MILESTONE: M(x).(y)` označující,
ve kterém milníku byla zavedena. To umožňuje AI programátorovi spustit jen subset schématu
relevantní pro aktuálně pracovaný milník, a zároveň ověřit, že pozdější milník nepřidává
sloupec, který by vyžadoval změnu již nasazeného kódu z dřívějšího milníku (breaking change
detekce - pokud milník N potřebuje změnit existující sloupec z milníku M<N jinak než
ALTER TABLE ADD COLUMN, je to ČERVENÁ VLAJKA a vyžaduje formální migrační proces z M10.1).
