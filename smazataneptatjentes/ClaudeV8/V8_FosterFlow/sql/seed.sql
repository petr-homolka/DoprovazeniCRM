-- ============================================================================
-- FOSTERFLOW CRM — SEED DATA (V6)
-- ============================================================================
-- Spustit AŽ PO schema.sql. Naplňuje systémové (organization_id = NULL) výchozí
-- hodnoty: oprávnění, číselníky (taxonomy_terms) a zákonné parametry.
-- Konkrétní organizace si může vytvořit vlastní role a přebít parametry.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PERMISSIONS — kompletní výchozí seznam oprávnění
-- ----------------------------------------------------------------------------
INSERT INTO permissions (code, description, module) VALUES
    -- Core / Cases
    ('cases.view_assigned', 'Vidí jen své přidělené rodiny', 'core'),
    ('cases.view_all', 'Vidí všechny rodiny v organizaci', 'core'),
    ('cases.create', 'Může založit novou rodinu/zájemce', 'core'),
    ('cases.edit', 'Může upravovat údaje rodiny', 'core'),
    ('cases.export', 'Může exportovat spisy rodin (ZIP)', 'core'),
    ('cases.transfer', 'Může předat spis jiné organizaci', 'core'),
    ('cases.change_lifecycle_state', 'Může měnit stav životního cyklu rodiny', 'core'),

    -- Finance
    ('finance.view', 'Vidí SPVPP přehledy a doklady', 'finance'),
    ('finance.approve_basic', 'Schvaluje doklady do limitu nastaveného v approval_steps', 'finance'),
    ('finance.approve_large', 'Schvaluje doklady nad limit (vyšší schvalovací krok)', 'finance'),
    ('finance.approve_reimbursement', 'Schvaluje výjimku refundace pěstounovi', 'finance'),
    ('finance.manage_providers', 'Může vytvářet a upravovat platební partnery', 'finance'),
    ('finance.manage_bank', 'Může nahrávat bankovní výpisy a párovat transakce', 'finance'),
    ('finance.export', 'Může generovat exporty pro úřady a účetní', 'finance'),

    -- Documents
    ('documents.upload', 'Může nahrávat dokumenty', 'documents'),
    ('documents.delete', 'Může mazat (přesunout do koše) dokumenty', 'documents'),
    ('documents.manage_templates', 'Může upravovat šablony dokumentů', 'documents'),

    -- Crisis & Tasks
    ('crisis.create', 'Může nahlásit krizový incident', 'crisis'),
    ('crisis.resolve', 'Může uzavřít krizový případ', 'crisis'),
    ('tasks.assign_others', 'Může přiřazovat úkoly jiným uživatelům', 'tasks'),

    -- Supervision & Education
    ('supervision.manage', 'Může plánovat a vyhodnocovat supervize', 'supervision'),
    ('supervision.view_all_notes', 'Vidí i neprivátní poznámky ostatních', 'supervision'),
    ('education.verify', 'Může potvrzovat (verifikovat) vzdělávání pěstounů', 'education'),

    -- Admin
    ('admin.manage_users', 'Může zakládat zaměstnance a měnit jim role', 'admin'),
    ('admin.manage_roles', 'Může vytvářet vlastní role a přiřazovat oprávnění', 'admin'),
    ('admin.manage_branding', 'Může měnit logo a barvy organizace', 'admin'),
    ('admin.manage_subscription', 'Může měnit tarif předplatného', 'admin'),
    ('admin.view_audit_logs', 'Vidí auditní logy a privátní supervizní poznámky', 'admin'),
    ('admin.manage_taxonomies', 'Může upravovat dynamické číselníky', 'admin'),
    ('admin.manage_retention', 'Může upravovat retenční politiky a GDPR výmazy', 'admin'),
    ('admin.view_escalations', 'Dostává eskalace při timeoutu schvalování', 'admin'),

    -- AI & Knowledge Base
    ('ai.use_chatbot', 'Může používat konverzační AI BI asistenta', 'ai'),
    ('ai.use_rag', 'Může se ptát AI na metodiky a legislativu', 'ai'),
    ('ai.manage_knowledge_base', 'Může správovat zdroje znalostní báze a crawler', 'ai'),
    ('ai.view_audit', 'Vidí AI Audit Dashboard (logy dotazů)', 'ai'),

    -- System Operator (provozovatel)
    ('system.export_data', 'Může generovat ZIP exporty spisu', 'system'),
    ('system.view_global_stats', 'Vidí celorepublikové statistiky', 'system'),
    ('system.manage_organizations', 'Může zakládat a správovat organizace', 'system')
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. SYSTÉMOVÉ TAXONOMIE A JEJICH VÝCHOZÍ TERMÍNY
-- Viz Blueprint v6, Registr rozhodnutí B, pro úplný seznam co je ENUM vs. taxonomy.
-- ----------------------------------------------------------------------------

-- 2.1 Kategorie událostí (event_definitions.category_term_id)
INSERT INTO system_taxonomies (machine_name, human_name, is_hierarchical) VALUES
    ('event_categories', 'Kategorie událostí', FALSE)
ON CONFLICT (machine_name) DO NOTHING;

INSERT INTO taxonomy_terms (taxonomy_id, label, color_code, sort_order)
SELECT id, label, color, ord FROM system_taxonomies,
    (VALUES
        ('routine', '#6B7280', 1),
        ('administrative', '#3B82F6', 2),
        ('legal', '#8B5CF6', 3),
        ('crisis', '#EF4444', 4),
        ('system', '#9CA3AF', 5)
    ) AS t(label, color, ord)
WHERE machine_name = 'event_categories';

-- 2.2 Stavy úkolů (tasks.state_term_id)
INSERT INTO system_taxonomies (machine_name, human_name, is_hierarchical) VALUES
    ('task_states', 'Stavy úkolů', FALSE)
ON CONFLICT (machine_name) DO NOTHING;

INSERT INTO taxonomy_terms (taxonomy_id, label, color_code, sort_order)
SELECT (SELECT id FROM system_taxonomies WHERE machine_name = 'task_states'), label, color, ord
FROM (VALUES
    ('K řešení', '#6B7280', 1),
    ('Probíhá', '#3B82F6', 2),
    ('Čeká se na třetí stranu', '#F59E0B', 3),
    ('Hotovo', '#10B981', 4),
    ('Zrušeno', '#9CA3AF', 5)
) AS t(label, color, ord);

-- 2.3 Kategorie dokumentů (documents.document_category_term_id)
INSERT INTO system_taxonomies (machine_name, human_name, is_hierarchical) VALUES
    ('document_categories', 'Kategorie dokumentů', FALSE)
ON CONFLICT (machine_name) DO NOTHING;

INSERT INTO taxonomy_terms (taxonomy_id, label, sort_order)
SELECT (SELECT id FROM system_taxonomies WHERE machine_name = 'document_categories'), label, ord
FROM (VALUES
    ('Rozsudek', 1), ('Usnesení soudu', 2), ('Zpráva OSPOD', 3), ('Dohoda o výkonu PP', 4),
    ('IPOD', 5), ('Lékařská zpráva', 6), ('Školní hodnocení', 7), ('Certifikát vzdělávání', 8),
    ('Faktura', 9), ('Smlouva s hlídačem', 10), ('Výkaz hodin', 11), ('Souhlas GDPR', 12),
    ('Fotografie', 13), ('Jiné', 14)
) AS t(label, ord);

-- 2.4 Typy vztahů (person_relationships.relationship_type_term_id) — hierarchický
INSERT INTO system_taxonomies (machine_name, human_name, is_hierarchical) VALUES
    ('relationship_types', 'Typy vztahů', TRUE)
ON CONFLICT (machine_name) DO NOTHING;

INSERT INTO taxonomy_terms (taxonomy_id, label, sort_order)
SELECT (SELECT id FROM system_taxonomies WHERE machine_name = 'relationship_types'), label, ord
FROM (VALUES
    -- Okolí dítěte
    ('otec', 1), ('matka', 2), ('partner_matky', 3), ('partnerka_otce', 4),
    ('dedecek_pat', 5), ('babicka_pat', 6), ('dedecek_mat', 7), ('babicka_mat', 8),
    ('stryc', 9), ('teta', 10), ('sourozenec_vlastni', 11), ('sourozenec_polorody', 12),
    ('kamarad', 13), ('kamaradka', 14), ('nepokrevni_teta', 15), ('nepokrevni_stryc', 16),
    ('vedouci_krouzku', 17), ('trener', 18),
    -- Okolí pěstouna
    ('manzel_pestouna', 19), ('partnerka_pestouna', 20), ('biologicke_dite_pestouna', 21),
    ('rodic_pestouna', 22), ('sourozenec_pestouna', 23)
) AS t(label, ord);

-- 2.5 Stavy plánovaného kontaktu s bio rodinou (contact_schedules.status_term_id)
INSERT INTO system_taxonomies (machine_name, human_name, is_hierarchical) VALUES
    ('contact_statuses', 'Stavy kontaktu s biologickou rodinou', FALSE)
ON CONFLICT (machine_name) DO NOTHING;

INSERT INTO taxonomy_terms (taxonomy_id, label, sort_order)
SELECT (SELECT id FROM system_taxonomies WHERE machine_name = 'contact_statuses'), label, ord
FROM (VALUES
    ('planned', 1), ('realized', 2), ('cancelled_by_bio', 3),
    ('cancelled_by_foster', 4), ('cancelled_by_child', 5), ('no_show', 6)
) AS t(label, ord);

-- 2.6 Typy supervize (supervisions.type_term_id)
INSERT INTO system_taxonomies (machine_name, human_name, is_hierarchical) VALUES
    ('supervision_types', 'Typy supervize', FALSE)
ON CONFLICT (machine_name) DO NOTHING;

INSERT INTO taxonomy_terms (taxonomy_id, label, sort_order)
SELECT (SELECT id FROM system_taxonomies WHERE machine_name = 'supervision_types'), label, ord
FROM (VALUES
    ('individual_personal', 1), ('individual_case', 2), ('group_team', 3), ('methodological', 4)
) AS t(label, ord);

-- 2.7 Formy vzdělávání (education_records.form_term_id)
INSERT INTO system_taxonomies (machine_name, human_name, is_hierarchical) VALUES
    ('education_forms', 'Formy vzdělávání', FALSE)
ON CONFLICT (machine_name) DO NOTHING;

INSERT INTO taxonomy_terms (taxonomy_id, label, sort_order)
SELECT (SELECT id FROM system_taxonomies WHERE machine_name = 'education_forms'), label, ord
FROM (VALUES
    ('prezencni', 1), ('online_synchronni', 2), ('e_learning', 3), ('pobytove', 4)
) AS t(label, ord);

-- 2.8 Stavy projektu (projects.state_term_id)
INSERT INTO system_taxonomies (machine_name, human_name, is_hierarchical) VALUES
    ('project_states', 'Stavy projektu', FALSE)
ON CONFLICT (machine_name) DO NOTHING;

INSERT INTO taxonomy_terms (taxonomy_id, label, sort_order)
SELECT (SELECT id FROM system_taxonomies WHERE machine_name = 'project_states'), label, ord
FROM (VALUES ('planned', 1), ('active', 2), ('on_hold', 3), ('completed', 4)) AS t(label, ord);

-- ----------------------------------------------------------------------------
-- 3. SYSTEM_PARAMETERS — výchozí zákonné a interní hodnoty (organization_id NULL)
-- Zdroj: ZSPOD ve znění novely 242/2024 Sb., vyhláška 473/2012 Sb., interní pravidla DO.
-- ----------------------------------------------------------------------------
INSERT INTO system_parameters (param_key, param_value, valid_from, source_reference, description) VALUES
    -- Respit — krátkodobé hlídání
    ('respit.kratkodobe.max_hodin_denne', '6', '2025-01-01', '§ 47a ZSPOD', 'Max. hodin krátkodobého hlídání za den'),
    ('respit.kratkodobe.sazba_standardni_czk_hod', '150', '2025-01-01', 'Metodika MPSV', 'Standardní sazba za hodinu hlídání'),
    ('respit.kratkodobe.sazba_sourozenci_czk_hod', '200', '2025-01-01', 'Metodika MPSV', 'Sazba při hlídání více sourozenců/handicapu'),
    ('respit.kratkodobe.sazba_osoba_blizka_czk_hod', '100', '2025-01-01', 'Metodika MPSV', 'Sazba pro osobu blízkou'),
    ('respit.kratkodobe.limit_czk_rok_na_dite', '3000', '2025-01-01', 'Interní pravidlo DO', 'Roční limit krátkodobého hlídání na dítě'),

    -- Respit — celodenní péče
    ('respit.celodenni.min_vek_ditete_roky', '2', '2025-01-01', '§ 47a ZSPOD', 'Min. věk dítěte pro celodenní respit'),
    ('respit.celodenni.min_dnu_rok', '14', '2025-01-01', '§ 47a ZSPOD', 'Min. roční nárok dní celodenní péče'),
    ('respit.celodenni.limit_letni_pobyt_czk', '3800', '2025-01-01', 'Metodika MPSV', 'Limit na letní pobyt'),
    ('respit.celodenni.limit_tridenni_czk', '1500', '2025-01-01', 'Metodika MPSV', 'Limit na třídenní pobyt'),
    ('respit.celodenni.limit_primestsky_czk', '2500', '2025-01-01', 'Metodika MPSV', 'Limit na příměstský tábor'),
    ('respit.celodenni.limit_externi_czk_den', '600', '2025-01-01', 'Metodika MPSV', 'Limit na externí péči za den'),

    -- Vzdělávání
    ('vzdelavani.hodiny_povinne_cyklus', '24', '2025-01-01', '§ 47a odst. 2 písm. f', 'Povinné hodiny vzdělávání za 12měsíční cyklus'),
    ('vzdelavani.kontrolni_hodiny_k_rijnu', '18', '2025-01-01', 'Metodika MPSV', 'Kontrolní minimum k 1.10.'),

    -- SPVPP kategorie (procentní limity)
    ('spvpp.respit.min_pct', '5', '2025-01-01', '§ 47d ZSPOD', 'Min. % SPVPP na respit'),
    ('spvpp.respit.max_pct', '15', '2025-01-01', '§ 47d ZSPOD', 'Max. % SPVPP na respit'),
    ('spvpp.poradenstvi.min_pct', '10', '2025-01-01', '§ 47d ZSPOD', 'Min. % SPVPP na poradenství'),
    ('spvpp.poradenstvi.max_pct', '20', '2025-01-01', '§ 47d ZSPOD', 'Max. % SPVPP na poradenství'),
    ('spvpp.vzdelavani.min_pct', '5', '2025-01-01', '§ 47d ZSPOD', 'Min. % SPVPP na vzdělávání'),
    ('spvpp.vzdelavani.max_pct', '10', '2025-01-01', '§ 47d ZSPOD', 'Max. % SPVPP na vzdělávání'),
    ('spvpp.dhm_limit_czk', '40000', '2025-01-01', 'Vyhláška č. 473/2012 Sb.', 'Limit pro DHM z SPVPP'),
    ('spvpp.dnm_limit_czk', '60000', '2025-01-01', 'Vyhláška č. 473/2012 Sb.', 'Limit pro DNM z SPVPP'),
    ('spvpp.report_deadline', '"03-31"', '2025-01-01', '§ 47d ZSPOD', 'Termín ročního vyúčtování (MM-DD)'),
    ('spvpp.return_deadline', '"04-30"', '2025-01-01', '§ 47d ZSPOD', 'Termín vrácení nevyčerpaných prostředků'),

    -- Dohody a kontakty
    ('dohoda.lhuta_od_sverení_dni', '30', '2025-01-01', '§ 47b ZSPOD', 'Lhůta pro uzavření dohody od svěření dítěte'),
    ('kontakt.max_interval_dni', '60', '2025-01-01', 'Standard kvality č. 9', 'Max. interval mezi kontakty KO a rodiny')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. STATUTORY_DEADLINES — notifikační kalendář zákonných termínů
-- ----------------------------------------------------------------------------
INSERT INTO statutory_deadlines (event_name, deadline_month, deadline_day, warning_days_ahead) VALUES
    ('Roční vyúčtování SPVPP', 3, 31, '{59, 31, 6}'),
    ('Vrácení nevyčerpaných prostředků SPVPP', 4, 30, '{30, 10}'),
    ('Kontrolní bod vzdělávání pěstounů', 10, 1, '{30, 14, 7}')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. TABLE_AVAILABLE_FIELDS — registr polí pro konfigurovatelné tabulky
-- ----------------------------------------------------------------------------
INSERT INTO table_available_fields (table_key, field_key, label, data_type, source_table) VALUES
    ('households_list', 'human_readable_id', 'Evid. číslo', 'text', 'households'),
    ('households_list', 'foster_parent_name', 'Pěstoun', 'computed', 'persons'),
    ('households_list', 'address', 'Adresa', 'text', 'households'),
    ('households_list', 'children_names', 'Děti', 'computed', 'persons'),
    ('households_list', 'status', 'Stav', 'enum', 'households'),
    ('households_list', 'branch_name', 'Pobočka', 'text', 'organization_branches'),
    ('households_list', 'assigned_ko_name', 'Klíčová osoba', 'computed', 'profiles'),

    ('children_list', 'human_readable_id', 'Evid. číslo', 'text', 'persons'),
    ('children_list', 'full_name', 'Jméno', 'computed', 'persons'),
    ('children_list', 'birth_date', 'Datum narození', 'date', 'persons'),
    ('children_list', 'household_name', 'Rodina', 'computed', 'households'),
    ('children_list', 'foster_care_type', 'Forma péče', 'enum', 'persons'),

    ('payment_documents_list', 'document_number', 'Číslo', 'text', 'payment_documents'),
    ('payment_documents_list', 'provider_name', 'Dodavatel', 'computed', 'providers'),
    ('payment_documents_list', 'total_amount_czk', 'Částka', 'number', 'payment_documents'),
    ('payment_documents_list', 'due_date', 'Splatnost', 'date', 'payment_documents'),
    ('payment_documents_list', 'status', 'Stav', 'enum', 'payment_documents'),

    ('tasks_list', 'title', 'Název', 'text', 'tasks'),
    ('tasks_list', 'priority', 'Priorita', 'enum', 'tasks'),
    ('tasks_list', 'due_date', 'Termín', 'date', 'tasks'),
    ('tasks_list', 'state_label', 'Stav', 'computed', 'taxonomy_terms')
ON CONFLICT (table_key, field_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. VÝCHOZÍ SYSTÉMOVÉ TABULKOVÉ POHLEDY (table_view_definitions, organization_id NULL)
-- ----------------------------------------------------------------------------
INSERT INTO table_view_definitions (table_key, view_name, is_default, is_shared, column_config) VALUES
    ('households_list', 'Přehled rodin', TRUE, TRUE, '[
        {"field":"human_readable_id","label":"Evid. číslo","width":140,"visible":true,"order":1},
        {"field":"foster_parent_name","label":"Pěstoun","width":220,"visible":true,"order":2},
        {"field":"address","label":"Adresa","width":260,"visible":true,"order":3},
        {"field":"children_names","label":"Děti","width":200,"visible":true,"order":4},
        {"field":"status","label":"Stav","width":120,"visible":true,"order":5},
        {"field":"branch_name","label":"Pobočka","width":140,"visible":false,"order":6}
    ]'::jsonb),
    ('children_list', 'Přehled dětí', TRUE, TRUE, '[
        {"field":"human_readable_id","label":"Evid. číslo","width":140,"visible":true,"order":1},
        {"field":"full_name","label":"Jméno","width":200,"visible":true,"order":2},
        {"field":"birth_date","label":"Datum narození","width":140,"visible":true,"order":3},
        {"field":"household_name","label":"Rodina","width":200,"visible":true,"order":4},
        {"field":"foster_care_type","label":"Forma péče","width":120,"visible":true,"order":5}
    ]'::jsonb),
    ('payment_documents_list', 'Doklady k zpracování', TRUE, TRUE, '[
        {"field":"document_number","label":"Číslo","width":120,"visible":true,"order":1},
        {"field":"provider_name","label":"Dodavatel","width":220,"visible":true,"order":2},
        {"field":"total_amount_czk","label":"Částka","width":120,"visible":true,"order":3},
        {"field":"due_date","label":"Splatnost","width":120,"visible":true,"order":4},
        {"field":"status","label":"Stav","width":140,"visible":true,"order":5}
    ]'::jsonb),
    ('tasks_list', 'Moje úkoly', TRUE, TRUE, '[
        {"field":"title","label":"Název","width":280,"visible":true,"order":1},
        {"field":"priority","label":"Priorita","width":100,"visible":true,"order":2},
        {"field":"due_date","label":"Termín","width":120,"visible":true,"order":3},
        {"field":"state_label","label":"Stav","width":140,"visible":true,"order":4}
    ]'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- V8 SEED ROZŠÍŘENÍ — nová oprávnění, integration_providers, doplňkové taxonomie
-- Spustit AŽ PO seed_v6_base.sql (permissions/taxonomy_terms/system_parameters)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. NOVÁ OPRÁVNĖNÍ (V8 moduly)
-- ----------------------------------------------------------------------------
INSERT INTO permissions (code, description, module) VALUES
    ('admin.manage_integrations', 'Může konfigurovat storage/calendar/auth/AI providery', 'admin'),
    ('admin.manage_theme', 'Může upravovat hloubkový whitelabel (font, layout, CSS)', 'admin'),
    ('admin.manage_legal_agreements', 'Může evidovat a podepisovat smluvní dokumenty', 'admin'),
    ('admin.manage_plugins', 'Může instalovat a konfigurovat pluginy', 'admin'),
    ('admin.manage_deprecations', 'Může schvalovat deprecation a sunset termíny', 'admin'),
    ('security.manage_audits', 'Může zakládat a vyhodnocovat bezpečnostní audity', 'security'),
    ('security.view_findings', 'Vidí bezpečnostní nálezy', 'security'),
    ('data.request_export', 'Může požádat o plný export dat organizace', 'data'),
    ('data.manage_import', 'Může spravovat import data z jiných systémů', 'data'),
    ('ai.manage_prompts', 'Může upravovat a verzovat AI prompty', 'ai'),
    ('ai.manage_ab_tests', 'Může spouštět A/B testy AI promptů', 'ai'),
    ('ai.review_disputes', 'Může vyhodnocovat zpochybnění AI rozhodnutí', 'ai'),
    ('analytics.view_organization', 'Vidí analytiku vlastní organizace', 'analytics'),
    ('analytics.view_global', 'Vidí globální analytiku napříč organizacemi (provozovatel)', 'analytics'),
    ('api.manage_external_clients', 'Může vytvářet a správovat externí API klienty', 'api'),
    ('api.manage_webhooks', 'Může konfigurovat webhooks', 'api'),
    ('finance.manage_psd2', 'Může autorizovat živé bankovní PSD2 napojení', 'finance'),
    ('sandbox.manage', 'Může resetovat a konfigurovat sandbox prostředí', 'sandbox')
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. INTEGRATION_PROVIDERS — statický seed adaptérů (MILESTONE: dokumentační)
-- ----------------------------------------------------------------------------
INSERT INTO integration_providers (category, provider, display_name, is_available_from_milestone, requires_oauth) VALUES
    ('storage', 'internal', 'Vlastní úložiště (výchozí)', 'M1', FALSE),
    ('storage', 'google', 'Google Drive', 'M5', TRUE),
    ('storage', 'microsoft', 'OneDrive / SharePoint', 'M5', TRUE),
    ('calendar', 'internal', 'Vlastní kalendář (výchozí)', 'M1', FALSE),
    ('calendar', 'google', 'Google Calendar', 'M5', TRUE),
    ('calendar', 'microsoft', 'Microsoft Outlook / Graph', 'M5', TRUE),
    ('auth', 'internal', 'E-mail a heslo / Magic Link (výchozí)', 'M1', FALSE),
    ('auth', 'google', 'Přihlášení přes Google', 'M5', TRUE),
    ('auth', 'microsoft', 'Přihlášení přes Microsoft', 'M5', TRUE),
    ('ai', 'google', 'Google Gemini (výchozí pro AI funkce)', 'M6', TRUE),
    ('ai', 'openai', 'OpenAI GPT', 'M6', TRUE),
    ('ai', 'anthropic', 'Anthropic Claude', 'M6', TRUE),
    ('ai', 'self_hosted_llm', 'Vlastní/lokální model (pro DO s požadavkem na plnou nezávislost)', 'M6', FALSE)
ON CONFLICT (category, provider) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. EXTENSION_POINTS — počáteční sada pro plugin architekturu (M10.2)
-- ----------------------------------------------------------------------------
INSERT INTO extension_points (point_key, description, payload_schema) VALUES
    ('after_event_created', 'Spustí se po uložení jakékoliv události na timeline', '{"type":"object","properties":{"event_id":{"type":"string"},"event_type":{"type":"string"}}}'),
    ('before_payment_approval', 'Spustí se před finálním schválením platebního dokladu', '{"type":"object","properties":{"payment_document_id":{"type":"string"},"amount":{"type":"number"}}}'),
    ('custom_report_tab', 'Umožní pluginu přidat vlastní záložku do detailu rodiny', '{"type":"object","properties":{"household_id":{"type":"string"}}}'),
    ('after_household_status_change', 'Spustí se po změně lifecycle_state rodiny', '{"type":"object","properties":{"household_id":{"type":"string"},"new_state":{"type":"string"}}}')
ON CONFLICT (point_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. DOPLŇKOVÉ TAXONOMIE PRO V8 (analytics_visibility, atd. - popisné kategorie)
-- ----------------------------------------------------------------------------
INSERT INTO system_taxonomies (machine_name, human_name, is_hierarchical) VALUES
    ('analytics_event_categories', 'Kategorie analytických událostí', FALSE)
ON CONFLICT (machine_name) DO NOTHING;

INSERT INTO taxonomy_terms (taxonomy_id, label, sort_order)
SELECT (SELECT id FROM system_taxonomies WHERE machine_name = 'analytics_event_categories'), label, ord
FROM (VALUES ('engagement', 1), ('feature_usage', 2), ('conversion', 3), ('error', 4)) AS t(label, ord);

-- ----------------------------------------------------------------------------
-- 5. VÝCHOZÍ DISASTER RECOVERY RUNBOOK (M1 GATE PODMÍNKA - musí existovat alespoň jeden)
-- ----------------------------------------------------------------------------
INSERT INTO disaster_recovery_runbooks (scenario_name, rto_minutes, rpo_minutes, runbook_steps) VALUES
    ('Úplná ztráta primární databáze', 240, 60, '[
        {"step": 1, "action": "Identifikovat poslední validní PITR snapshot"},
        {"step": 2, "action": "Obnovit Supabase projekt z PITR na nový instance"},
        {"step": 3, "action": "Ověřit integritu dat pomocí kontrolního skriptu (počty řádků klíčových tabulek)"},
        {"step": 4, "action": "Přepnout DNS/connection string aplikace na nový endpoint"},
        {"step": 5, "action": "Notifikovat všechny aktivní organizace o době výpadku"}
    ]'::jsonb),
    ('Ransomware útok / podezření na kompromitaci', 480, 1440, '[
        {"step": 1, "action": "Okamžitě izolovat postižené prostředí (revoke API klíčů, odpojení)"},
        {"step": 2, "action": "Obnovit z WORM zálohy starší než datum podezřelé aktivity"},
        {"step": 3, "action": "Provést bezpečnostní audit před znovuotevřením přístupu"},
        {"step": 4, "action": "Notifikovat dotčené organizace dle GDPR (do 72 hodin)"}
    ]'::jsonb)
ON CONFLICT DO NOTHING;
