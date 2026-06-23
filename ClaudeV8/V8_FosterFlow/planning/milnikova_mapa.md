# V8 MILNÍKOVÁ MAPA — pracovní rozvrh (interní, před psaním prózy)

## Princip řazení milníků

1. M1 = absolutní minimum pro ostrý provoz JEDNÉ DO. Musí být stabilní, zálohovatelné,
   bezpečné (RLS, audit), ale BEZ multi-tenancy komplexity, BEZ AI, BEZ pokročilých financí.
   Po nasazení M1 do produkce se už nesmí semknout pod nohama při žádném dalším milníku.
2. Provider-agnostická vrstva (storage/calendar/auth/AI) MUSÍ být v M1 architektonicky
   přítomna (rozhraní/adaptér pattern) i když M1 nabízí jen JEDEN konkrétní adaptér
   (např. lokální storage, žádné AI). Pozdější milníky PŘIDÁVAJÍ adaptéry, NEMĖNÍ kontrakt.
   -- Tohle je kritické pro "žádný milník nerozbije předchozí".
3. Multi-tenancy SaaS (víc DO, billing, branding) přichází AŽ po ověření M1 v ostrém
   provozu jedné DO — je to M3, ne M1, protože dokud běží jen jedna DO, multi-tenant
   komplexita je čisté riziko bez okamžitého přínosu.
4. Vysoce rizikové/komplexní věci (veřejné API pro třetí strany, bankovní PSD2,
   plugin marketplace, SSO) jsou cíleně AŽ na konci - M7+ - protože:
   a) nejsou na kritické cestě k tomu, aby DO mohla pracovat
   b) mají největší bezpečnostní/integrační riziko
   c) profituje z toho, že do té doby je systém ověřený v provozu

## M1 — ZÁKLAD (produkčně nasaditelný pro 1 DO)
Fáze 1.1 Infrastruktura a tech stack (repo, CI, .env, provider-agnostic kontrakty jako prázdné rozhraní)
Fáze 1.2 Databázové jádro (organizations[1 záznam], persons/Karta kontaktu, households, RBAC, RLS)
Fáze 1.3 Hierarchické registry institucí + historizace Karty kontaktu
Fáze 1.4 Sociální prostor a vztahy (symetricky dítě/pěstoun)
Fáze 1.5 Event store + event_definitions (configuration-driven, bez AI)
Fáze 1.6 Lifecycle state machine + foster_parent_status
Fáze 1.7 Dokumenty (DMS bez OCR, lokální/jednoduché úložiště adaptér)
Fáze 1.8 Worker (mobil PWA) + Organization (desktop) - dvě základní UI, žádná Klientská zóna
Fáze 1.9 Konfigurovatelné tabulky (DataGridView)
Fáze 1.10 Audit log, zálohy (WORM), DR plán a runbook (test obnovy!)
Fáze 1.11 Observabilita (logging/error tracking/alerting) - MUSÍ být hotová PŘED ostrým nasazením
Fáze 1.12 Accessibility baseline (WCAG AA na hlavních obrazovkách)
Fáze 1.13 i18n architektura (cs locale jako jediný obsah, ale infrastruktura connected)
Fáze 1.14 Bezpečnostní self-test + checklist pro externí audit (audit samotný je gate před M1 go-live)
Fáze 1.15 Data export "on demand" (vlastnictví dat, exit-ready od první verze)
**GATE M1 → produkce:** acceptance testy + bezpečnostní review prošlé

## M2 — PROVOZNÍ NEZBYTNOSTI (rozšíření jedné DO, stále bez multi-tenant)
Fáze 2.1 Soudní agenda, OSPOD/IPOD cyklus
Fáze 2.2 Bio-rodina kontakty (plán/harmonogram/supervize)
Fáze 2.3 Krizový management
Fáze 2.4 Úkoly a projekty (polymorfní vazby)
Fáze 2.5 Supervize zaměstnanců a vzdělávání pěstounů
Fáze 2.6 Dokumentové šablony (verzované generování PDF)
Fáze 2.7 Notifikace (in-app, email - bez SMS/push zatím)
Fáze 2.8 Retenční politika a GDPR výmaz (bez automatického scheduleru zatím - manuální spouštění)
**GATE M2:** DO reálně pracuje se soudy/krizemi/úkoly v produkci

## M3 — FINANCE A SPVPP (stále jedna DO, ale finanční vrstva je komplexní samo o sobě)
Fáze 3.1 Providers (platební partneři)
Fáze 3.2 Payment_documents + items (vazba na dítě)
Fáze 3.3 Service_transactions a SPVPP kategorie/limity
Fáze 3.4 Temporální split engine (legislativní změny v půlce roku)
Fáze 3.5 Schvalovací workflow (permission-based)
Fáze 3.6 Refundační výjimka (pěstoun)
Fáze 3.7 Bankovní párování FÁZE A: manuální import výpisu + AI heuristika (NE živé API)
**GATE M3:** Ekonomka kompletně pracuje v systému, ne v Excelu

## M4 — MULTI-TENANCY A SAAS ZÁKLAD (přechod z 1 DO na N DO)
Fáze 4.1 Hierarchie multi-tenancy (provozovatel/organizace/pobočka) - aktivace pro 2.+ DO
Fáze 4.2 Granulární RBAC rozšíření pro custom role per organizace
Fáze 4.3 Subscription tiers a billing (feature flags, limity, HTTP 402)
Fáze 4.4 Whitelabeling HLOUBKA 1: logo + barvy (basic)
Fáze 4.5 Migrace dat mezi organizacemi (case transfer)
Fáze 4.6 Provozovatelský admin panel (cross-tenant pohled, anonymizace)
**GATE M4:** Druhá nezávislá DO běží v produkci bez kolize s první

## M5 — HLOUBKOVÝ WHITELABELING A PROVIDER VOLBA (svoboda výběru ekosystému)
Fáze 5.1 Provider abstrakce AKTIVACE: storage adaptéry (Google Drive / OneDrive / interní)
Fáze 5.2 Provider abstrakce AKTIVACE: kalendář adaptéry (Google Calendar / MS Graph / interní)
Fáze 5.3 Provider abstrakce AKTIVACE: auth adaptéry (Google SSO / MS SSO / interní email-password)
   -- SSO PATŘÍ SEM, NE DO M1 - toto je explicitně ten případ z tvého zadání
Fáze 5.4 Úrovně integrace (0=žádná, 1=export/import, 2=hluboká) - konfigurační UI pro DO
Fáze 5.5 Template systém: vlastní font, layout varianty (ne jen barvy)
Fáze 5.6 Sandbox/demo prostředí jako produkt
Fáze 5.7 Import wizard z konkurenčních systémů (Excel, jiné CRM)
**GATE M5:** Nová DO si může vybrat "Google-heavy" nebo "naprosto nezávislé" nastavení

## M6 — AI VRSTVA (záměrně AŽ PO finanční a multi-tenant stabilizaci)
Fáze 6.1 AI adaptér abstrakce (Gemini / OpenAI / Anthropic / self-hosted - volitelné per DO)
Fáze 6.2 Voice-to-text záznamník + OCR pipeline
Fáze 6.3 RAG Knowledge Base s verzovanou legislativou
Fáze 6.4 Audit AI trasování (ai_interaction_logs)
Fáze 6.5 AI BI konverzační vrstva (view-based bezpečnost, text-to-SQL)
Fáze 6.6 Prompt verzování a A/B testování kvality
Fáze 6.7 AI Crawler a karanténa zdrojů
Fáze 6.8 Etický audit AI rozhodování (transparentnost, právo na zpochybnění) - princip + checklist
**GATE M6:** AI funkce live, ale vždy vypnutelné/volitelné per DO a per tarif

## M7 — ANALYTIKA, MĖŘENÍ A BENCHMARKING
Fáze 7.1 Měření výkonu KO (vážené vytížení)
Fáze 7.2 Materializované views a noční refresh
Fáze 7.3 Statistická nadstavba (4 úrovně viditelnosti)
Fáze 7.4 Globální benchmarking (anonymizace mezi DO)
Fáze 7.5 Web/produktová analytika (Google Analytics nebo ekvivalent) - GLOBÁLNÍ i PER-DO úroveň
   -- NOVÁ KAPITOLA dle posledního zadání
**GATE M7:** Provozovatel i jednotlivé DO mají datově podložené rozhodování

## M8 — KLIENTSKÁ ZÓNA A EXTERNÍ PŘÍSTUPY
Fáze 8.1 Klientská zóna (Foster Parent Portal) - samoobsluha pěstounů
Fáze 8.2 Výstupní adaptéry pro úřady (export šablony, verzování)
Fáze 8.3 Accountant access (SMS 2FA token přístup)
Fáze 8.4 Notifikace rozšíření (SMS, push mobile)
**GATE M8:** Pěstouni a externí účetní mají bezpečný samoobslužný přístup

## M9 — VEŘEJNÉ API A EXTERNÍ INTEGRACE (vysoké riziko, vysoká hodnota, pozdě záměrně)
Fáze 9.1 Veřejné API kontrakt (OpenAPI, verzování /v1/)
Fáze 9.2 OAuth/API klíče pro externí systémy, scope-based oprávnění
Fáze 9.3 Webhooks
Fáze 9.4 Pilotní napojení (OSPOD nebo jiný typ partnera) - jako řízený pilot, ne plošně
Fáze 9.5 Bankovní PSD2/multibanking živé API (nejvyšší tarif) - NAHRAZUJE manuální import z M3
**GATE M9:** První externí systém úspěšně komunikuje přes veřejné API v produkci

## M10 — DLOUHOVĖKOST, OTEVŘENOST A EKOSYSTÉM
Fáze 10.1 Formální migrační systém (replace jednorázový schema.sql přístup)
Fáze 10.2 Plugin/extension architektura
Fáze 10.3 Deprecation politika (pole/tabulky/endpointy)
Fáze 10.4 Verzovaná veřejná API dlouhodobá stabilita (návazně na M9)
Fáze 10.5 App marketplace koncept (volitelné, příprava)
**GATE M10:** Systém má formální proces pro budoucí 15+ let evoluce

---

## Kontrolní princip napříč VŠEMI milníky (zapsat do úvodu V8)

KAŽDÝ milník M(n) musí:
1. Být spustitelný jako migrace NAD existující produkční databází M(n-1) bez manuální
   intervence do dat (jen ALTER/CREATE, nikdy ne destruktivní DROP bez explicitní migrace cesty)
2. Nezměnit kontrakt žádného rozhraní, které M(n-1) a dřívější už используjí (provider
   adaptér rozhraní, veřejné API kontrakty po M9, event_definitions payload schema)
3. Mít acceptance test, který ověří, že VŠECHNY PŘEDCHOZÍ acceptance testy ještě platí
   (regresní sada, ne jen nová funkce)
4. Být nasaditelný nezávisle - DO na tarifu/verzi M3 nemusí nikdy přejít na M6, pokud
   nechce AI funkce (feature flags z M4 to umožňují)
