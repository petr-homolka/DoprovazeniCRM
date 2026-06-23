-- ============================================================================
-- FOSTERFLOW CRM — KONSOLIDOVANÉ DATABÁZOVÉ SCHÉMA (V6)
-- ============================================================================
-- Spustit v Supabase SQL Editoru v PŘESNĚ TOMTO POŘADÍ (jeden soubor, jeden běh).
-- Topologické pořadí je závazné — viz Master Blueprint v6, kapitola "Registr rozhodnutí".
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ----------------------------------------------------------------------------
-- 1. ORGANIZATIONS (root tenant tabulka)
-- ----------------------------------------------------------------------------
-- MILESTONE: M1.2
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    ic TEXT NOT NULL UNIQUE,
    ref_number_prefix TEXT NOT NULL DEFAULT 'DO',
    foster_id_region_code TEXT NOT NULL DEFAULT 'CZE',
    logo_url TEXT,
    brand_colors JSONB DEFAULT '{
        "primary": "#6366F1",
        "primaryForeground": "#FFFFFF",
        "sidebarBackground": "#131523",
        "sidebarForeground": "#FFFFFF",
        "accent": "#4F46E5"
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON COLUMN organizations.brand_colors IS 'JSON s HEX kody pro dynamicke CSS promenne (whitelabeling).';

-- ----------------------------------------------------------------------------
-- 2. DYNAMICKÉ ČÍSELNÍKY (Taxonomy Engine)
-- Nahrazuje ENUM hodnoty u všeho, co je čistě popisné/organizační.
-- Binární rozhodnutí ENUM vs. taxonomy_term je uvedeno v Blueprintu v6,
-- kapitola "Registr rozhodnutí B".
-- ----------------------------------------------------------------------------
-- MILESTONE: M1.2
CREATE TABLE system_taxonomies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL = systémový, nelze smazat
    machine_name TEXT NOT NULL UNIQUE, -- 'task_states', 'document_categories', 'relationship_types'...
    human_name TEXT NOT NULL,
    is_hierarchical BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M1.2
CREATE TABLE taxonomy_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    taxonomy_id UUID REFERENCES system_taxonomies(id) ON DELETE CASCADE NOT NULL,
    parent_term_id UUID REFERENCES taxonomy_terms(id),
    label TEXT NOT NULL,
    color_code TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_taxonomy_terms_taxonomy ON taxonomy_terms(taxonomy_id);

-- ----------------------------------------------------------------------------
-- 3. GRANULÁRNÍ RBAC (permissions / roles / mapování)
-- ----------------------------------------------------------------------------
-- MILESTONE: M1.2
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,         -- 'cases.export', 'finance.approve_large'
    description TEXT NOT NULL,
    module TEXT NOT NULL               -- 'finance', 'core', 'documents', 'admin'
);

-- MILESTONE: M1.2
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL = systémová globální role
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M1.2
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ----------------------------------------------------------------------------
-- 4. PROFILES (uživatelé s přihlášením, vázáno na Supabase auth.users)
-- ----------------------------------------------------------------------------
-- MILESTONE: M1.2
CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- shoduje se s auth.users.id, FK se neaplikuje (Supabase specifikum)
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    foster_id TEXT UNIQUE,
    is_system_operator BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M1.2
CREATE TABLE user_roles (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id),
    PRIMARY KEY (user_id, role_id)
);

-- Helper funkce pro RLS — rychlé ověření oprávnění aktuálního uživatele
CREATE OR REPLACE FUNCTION has_permission(required_permission_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.code = required_permission_code
    ) INTO has_perm;
    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper funkce — organization_id aktuálního uživatele (používá se v RLS všude)
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper funkce — je aktuální uživatel system_operator (provozovatel)
CREATE OR REPLACE FUNCTION is_system_operator()
RETURNS BOOLEAN AS $$
    SELECT COALESCE((SELECT is_system_operator FROM profiles WHERE id = auth.uid()), FALSE);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- 5. POBOČKY ORGANIZACE
-- ----------------------------------------------------------------------------
-- MILESTONE: M4.1
CREATE TABLE organization_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN branch_id UUID REFERENCES organization_branches(id) ON DELETE SET NULL;

-- ============================================================================
-- V8 DODATEK 1: PROVIDER-AGNOSTICKÁ ARCHITEKTURA (storage/calendar/auth/AI)
-- Tento blok se vkládá DO schema_v6_tagged.sql za sekci "5. POBOČKY ORGANIZACE"
-- (po organization_branches, před system_parameters), protože organization_integration_settings
-- potřebuje branches i organizations a žádná pozdější tabulka na něj nezávisí dříve.
-- ============================================================================

-- MILESTONE: M1.1 (kontrakt definován od počátku, i když M1 nabízí jen "internal" adaptér)
CREATE TYPE integration_category AS ENUM ('storage', 'calendar', 'auth', 'ai');
CREATE TYPE integration_level AS ENUM ('level_0_none', 'level_1_export_import', 'level_2_deep');

-- MILESTONE: M1.1
-- Statický seznam adaptérů. Přidání NOVÉHO adaptéru je vždy kódová změna (nový kód
-- implementující kontrakt), proto je toto ENUM rozšiřovaný migrací, NE dynamická taxonomy.
CREATE TYPE provider_key AS ENUM (
    'internal',              -- vlastní řešení systému (vždy dostupné, výchozí v M1)
    'google',
    'microsoft',
    'openai',                -- jen pro kategorii 'ai'
    'anthropic',             -- jen pro kategorii 'ai'
    'self_hosted_llm'        -- jen pro kategorii 'ai', M6+
);

-- MILESTONE: M1.1
CREATE TABLE integration_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category integration_category NOT NULL,
    provider provider_key NOT NULL,
    display_name TEXT NOT NULL,
    is_available_from_milestone TEXT NOT NULL, -- 'M1', 'M5', 'M6' - dokumentační, ne vynucené v DB
    requires_oauth BOOLEAN DEFAULT FALSE,
    config_schema JSONB, -- JSON Schema pro validaci provider-specifické konfigurace (API klíče atd.)
    UNIQUE(category, provider)
);

-- MILESTONE: M1.1
-- Konfigurace KAŽDÉ organizace pro KAŽDOU kategorii integrace.
-- V M1 má každá organizace jen řádky s provider='internal', level='level_0_none'.
-- M5 aktivuje UI, kde si DO může zvolit jiný provider a vyšší úroveň.
CREATE TABLE organization_integration_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    category integration_category NOT NULL,
    provider_id UUID REFERENCES integration_providers(id) NOT NULL,
    level integration_level NOT NULL DEFAULT 'level_0_none',
    provider_config JSONB DEFAULT '{}'::jsonb, -- OAuth tokeny (šifrované), API klíče, nastavení
    oauth_access_token_encrypted TEXT,
    oauth_refresh_token_encrypted TEXT,
    oauth_token_expires_at TIMESTAMP WITH TIME ZONE,
    connected_by UUID REFERENCES profiles(id),
    connected_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(organization_id, category) -- jedna aktivní volba per kategorie per organizace
);
CREATE INDEX idx_org_integration_settings_org ON organization_integration_settings(organization_id);

-- MILESTONE: M5.2
-- Generická vazba mezi interní entitou systému (událost, soudní jednání, kontakt) a
-- externí kalendářovou událostí, BEZ ohledu na to, jaký adaptér (Google/MS/interní) byl použit.
CREATE TABLE calendar_sync_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    entity_type TEXT NOT NULL,           -- 'court_hearing','contact_schedule','task'
    entity_id UUID NOT NULL,
    integration_setting_id UUID REFERENCES organization_integration_settings(id) NOT NULL,
    external_calendar_event_id TEXT,     -- ID v cizím systému (Google event ID, MS Graph ID...)
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending','synced','failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_calendar_sync_entity ON calendar_sync_links(entity_type, entity_id);

COMMENT ON TABLE organization_integration_settings IS
'KONTRAKT: Aplikační kód NIKDY nevolá Google/Microsoft API přímo. Vždy přes interní
StorageAdapterInterface / CalendarAdapterInterface / AuthAdapterInterface / AIAdapterInterface,
které načtou aktivní provider z této tabulky a delegují na konkrétní implementaci. Toto
rozhraní je STABILNÍ KONTRAKT od M1 - pozdější milníky (M5, M6) pouze PŘIDÁVAJÍ implementace
adaptérů, nikdy nemění signaturu rozhraní. Zmena signatury = breaking change = M10.1 proces.';


-- ----------------------------------------------------------------------------
-- 6. TEMPORÁLNÍ PARAMETRY SYSTÉMU
-- ----------------------------------------------------------------------------
-- MILESTONE: M1.2
CREATE TABLE system_parameters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL = globální default
    param_key TEXT NOT NULL,
    param_value JSONB NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE,
    source_reference TEXT,             -- "§ 47a ZSPOD ve znění novely 242/2024"
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_system_parameters_key ON system_parameters(param_key, valid_from);

CREATE OR REPLACE FUNCTION get_param(
    p_key TEXT, p_date DATE DEFAULT CURRENT_DATE, p_org_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
    SELECT param_value FROM system_parameters
    WHERE param_key = p_key
      AND (organization_id = p_org_id OR organization_id IS NULL)
      AND valid_from <= p_date
      AND (valid_to IS NULL OR valid_to >= p_date)
    ORDER BY organization_id NULLS LAST, valid_from DESC
    LIMIT 1;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION detect_parameter_splits(
    p_param_keys TEXT[], p_from DATE, p_to DATE, p_org_id UUID DEFAULT NULL
) RETURNS TABLE(split_from DATE, split_to DATE, params JSONB) AS $$
BEGIN
    RETURN QUERY
    WITH change_dates AS (
        SELECT DISTINCT valid_from AS d FROM system_parameters
        WHERE param_key = ANY(p_param_keys)
          AND (organization_id = p_org_id OR organization_id IS NULL)
          AND valid_from > p_from AND valid_from <= p_to
        UNION SELECT p_from UNION SELECT p_to + 1
        ORDER BY 1
    ), periods AS (
        SELECT d AS period_from, LEAD(d) OVER (ORDER BY d) - 1 AS period_to FROM change_dates
    )
    SELECT pr.period_from, pr.period_to::DATE,
        jsonb_object_agg(sp.param_key, sp.param_value)
    FROM periods pr
    CROSS JOIN UNNEST(p_param_keys) AS key
    JOIN LATERAL (
        SELECT param_key, param_value FROM system_parameters
        WHERE param_key = key AND (organization_id = p_org_id OR organization_id IS NULL)
          AND valid_from <= pr.period_from AND (valid_to IS NULL OR valid_to >= pr.period_from)
        ORDER BY organization_id NULLS LAST, valid_from DESC LIMIT 1
    ) sp ON TRUE
    WHERE pr.period_to IS NOT NULL
    GROUP BY pr.period_from, pr.period_to;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 7. HIERARCHICKÉ REGISTRY INSTITUCÍ (Kraj/Obec -> Pobočka -> Osoba)
-- ----------------------------------------------------------------------------

-- Úroveň 1: zřizovatel (kraj nebo obec s rozšířenou působností)
-- MILESTONE: M1.3
CREATE TABLE administrative_authorities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                -- 'Ústecký kraj', 'Statutární město Teplice'
    authority_type TEXT NOT NULL CHECK (authority_type IN ('kraj','orp','obec')),
    data_box_id TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Úroveň 2+3: OSPOD pobočka a konkrétní kurátor
-- MILESTONE: M1.3
CREATE TABLE ospod_offices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_authority_id UUID REFERENCES administrative_authorities(id),
    city TEXT NOT NULL,
    address TEXT,
    data_box_id TEXT NOT NULL
);

-- MILESTONE: M1.3
CREATE TABLE ospod_workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES ospod_offices(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Úroveň 2+3: školy a učitelé
-- MILESTONE: M1.3
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    parent_authority_id UUID REFERENCES administrative_authorities(id),
    name TEXT NOT NULL,
    address_street TEXT,
    address_city TEXT NOT NULL,
    address_zip TEXT,
    website TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M1.3
CREATE TABLE school_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Úroveň 2+3: zdravotnická zařízení a lékaři
-- MILESTONE: M1.3
CREATE TABLE medical_facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,                -- 'Poliklinika Teplice'
    address TEXT,
    ico TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- MILESTONE: M1.3
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    facility_id UUID REFERENCES medical_facilities(id),
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,      -- 'pediatr','psycholog','psychiatr','neurolog','jiny'
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Úroveň 2+3: soudy a soudci
-- MILESTONE: M1.3
CREATE TABLE courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL,
    data_box_id TEXT
);

-- MILESTONE: M1.3
CREATE TABLE court_judges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    court_id UUID REFERENCES courts(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Registr pořadatelů mimoškolních aktivit (tábory, kroužky)
-- MILESTONE: M1.3
CREATE TABLE extracurricular_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    provider_type TEXT NOT NULL,       -- 'sport_club','camp_organizer','hobby_center','art_school'
    bank_account TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- ============================================================================
-- ČÁST 2: HOUSEHOLDS, PERSONS (KARTA KONTAKTU), VZTAHY, HISTORIZACE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 8. ENUMY PRO RODINY A OSOBY (vázané na byznys logiku, viz Registr rozhodnutí B)
-- ----------------------------------------------------------------------------
CREATE TYPE entity_status AS ENUM ('active','suspended','pending_archive','inactive');

CREATE TYPE person_category AS ENUM (
    'foster_parent', 'foster_child', 'biological_child', 'other_member',
    'biological_parent', 'biological_family_member', 'social_circle_member',
    'foster_parent_partner', 'foster_parent_bio_child'
);

CREATE TYPE foster_care_type AS ENUM ('A_long_term', 'B_temporary', 'C_relative');

CREATE TYPE foster_parent_status AS ENUM (
    'zajemce', 'cekajici', 'aktivni', 'pozastavene', 'vyrazene', 'prevedene', 'odmitnute'
);

CREATE TYPE lifecycle_state AS ENUM (
    'lead', 'initial_contact', 'negotiation', 'pending_orp',
    'active_accompanying', 'situation_change', 'termination', 'archived'
);

CREATE TYPE relationship_rating AS ENUM ('A','B','C','D','E','F','N','X','Y','Z');
-- A/B výborný-velmi dobrý, C/D/E neutrální-slabý, F/N problematický/neznámý,
-- X/Y rizikový-vysoce rizikový, Z = ZÁKAZ STYKU (soudně/OSPOD nařízeno)

-- ----------------------------------------------------------------------------
-- 9. HOUSEHOLDS (domácnosti / pěstounské rodiny)
-- ----------------------------------------------------------------------------
-- MILESTONE: M1.2
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    branch_id UUID REFERENCES organization_branches(id) ON DELETE SET NULL,
    address_street TEXT NOT NULL,
    address_city TEXT NOT NULL,
    address_zip TEXT NOT NULL,
    address_hidden BOOLEAN DEFAULT FALSE,  -- utajená adresa, nezobrazí se biologickým rodičům
    assigned_ko_id UUID REFERENCES profiles(id),
    current_lifecycle_state lifecycle_state DEFAULT 'lead',
    human_readable_id TEXT UNIQUE,         -- FosterID, např. DOP-26-UL-0012
    status entity_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_households_org ON households(organization_id);
CREATE INDEX idx_households_ko ON households(assigned_ko_id);
CREATE INDEX idx_households_branch ON households(branch_id);

-- MILESTONE: M1.6
CREATE TABLE lifecycle_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    previous_state lifecycle_state,
    new_state lifecycle_state NOT NULL,
    transition_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    triggered_by UUID REFERENCES profiles(id),
    mandatory_document_id UUID, -- FK na documents doplněn po jejím vytvoření (sekce 13)
    notes TEXT
);

CREATE OR REPLACE FUNCTION log_lifecycle_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.current_lifecycle_state IS DISTINCT FROM NEW.current_lifecycle_state THEN
        INSERT INTO lifecycle_transitions (household_id, previous_state, new_state, triggered_by)
        VALUES (NEW.id, OLD.current_lifecycle_state, NEW.current_lifecycle_state, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_lifecycle_transition
AFTER UPDATE OF current_lifecycle_state ON households
FOR EACH ROW EXECUTE FUNCTION log_lifecycle_transition();

-- ----------------------------------------------------------------------------
-- 10. PERSONS — "KARTA KONTAKTU" (jádro evidence všech fyzických osob)
-- ----------------------------------------------------------------------------
-- MILESTONE: M1.2
CREATE TABLE persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    category person_category NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    birth_certificate_number TEXT,         -- rodné číslo, citlivé (RLS/maskování)
    human_readable_id TEXT UNIQUE,         -- FosterID

    -- Typ péče a stav (vyplněno dle category)
    foster_care_type foster_care_type,             -- u foster_child i foster_parent
    foster_care_type_note TEXT,                     -- "(C - děda)"
    foster_parent_status foster_parent_status,      -- pouze u foster_parent

    -- Custom Fields (Google Contacts styl)
    custom_fields JSONB DEFAULT '[]'::jsonb,
    -- [{"id":"c1a2-u4","label":"Velikost bot","value":"38","type":"text"}]

    -- Avatar
    avatar_document_id UUID,  -- FK na documents doplněn po jejím vytvoření

    status entity_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_persons_org ON persons(organization_id);
CREATE INDEX idx_persons_category ON persons(category);
CREATE INDEX idx_persons_foster_id ON persons(human_readable_id);

COMMENT ON TABLE persons IS 'Karta kontaktu - jednotny zaznam pro dite, pestouna, biologickeho pribuzneho i socialni okoli. Uradni osoby (kuratori, lekari, soudci) ZDE NEJSOU - ti ziji ve specializovanych registrech (administrative_authorities -> ospod_offices -> ospod_workers atd, viz cast 1).';

-- MILESTONE: M1.2
CREATE TABLE household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    moved_in_date DATE NOT NULL,
    moved_out_date DATE,
    is_primary_caregiver BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_household_members_household ON household_members(household_id);
CREATE INDEX idx_household_members_person ON household_members(person_id);

-- MILESTONE: M1.6
CREATE TABLE foster_parent_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    previous_status foster_parent_status,
    new_status foster_parent_status NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by UUID REFERENCES profiles(id),
    reason TEXT
);

-- ----------------------------------------------------------------------------
-- 11. VZTAHY MEZI OSOBAMI — symetricky pro dítě i pěstouna
-- Jedna sdílená tabulka (NE dvě oddělené pro dítě/pěstouna).
-- ----------------------------------------------------------------------------
-- MILESTONE: M1.4
CREATE TABLE person_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    subject_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    -- subject_id = dítě NEBO pěstoun - stejná struktura pro oba
    related_person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    relationship_type_term_id UUID REFERENCES taxonomy_terms(id) NOT NULL,
    -- dynamický číselník: otec, matka, partnerka_otce, dědeček_pat,
    -- manžel_pěstouna, partnerka_pěstouna, biologické_dítě_pěstouna,
    -- kamarád, nepokrevní_teta, vedoucí_kroužku...
    relationship_notes TEXT,
    rating relationship_rating DEFAULT 'N',
    gdpr_consent_signed BOOLEAN DEFAULT FALSE,
    gdpr_consent_document_id UUID, -- FK na documents doplněn po její vytvoření
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, related_person_id)
);
CREATE INDEX idx_person_relationships_subject ON person_relationships(subject_id);

-- ----------------------------------------------------------------------------
-- 12. HISTORIZACE KARTY KONTAKTU
-- ----------------------------------------------------------------------------
-- MILESTONE: M1.3
CREATE TABLE person_past_names (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    valid_until DATE NOT NULL,
    change_reason_notes TEXT
);

-- MILESTONE: M1.3
CREATE TABLE person_citizenships (
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    PRIMARY KEY (person_id, country_code)
);

-- MILESTONE: M1.3
CREATE TABLE person_residency_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE,
    notes TEXT
);

-- MILESTONE: M1.3
CREATE TABLE person_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    contact_type TEXT NOT NULL, -- 'phone','email','data_box','facebook','whatsapp','telegram','signal'
    contact_value TEXT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT
);
CREATE INDEX idx_person_contacts_person ON person_contacts(person_id);

-- MILESTONE: M1.3
CREATE TABLE person_address_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    address_type TEXT NOT NULL, -- 'permanent','actual'
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    zip TEXT NOT NULL,
    housing_details TEXT,       -- '3. patro, u babičky'
    from_date DATE NOT NULL,
    to_date DATE,
    notes TEXT
);
CREATE INDEX idx_person_address_history_person ON person_address_history(person_id);
CREATE INDEX idx_person_address_history_city ON person_address_history(city, street) WHERE to_date IS NULL;

-- MILESTONE: M1.3
CREATE TABLE person_education_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    school_id UUID REFERENCES schools(id) NOT NULL,
    teacher_id UUID REFERENCES school_teachers(id) ON DELETE SET NULL,
    grade_class TEXT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE,
    notes TEXT
);

-- MILESTONE: M1.3
CREATE TABLE person_report_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    school_year VARCHAR(9) NOT NULL,
    term INT NOT NULL CHECK (term IN (1, 2)),
    document_id UUID, -- FK na documents doplněn po její vytvoření
    grades JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M1.3
CREATE TABLE person_medical_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES doctors(id) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE,
    is_primary BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- MILESTONE: M1.3
CREATE TABLE person_physiological_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    height_cm INT,
    weight_kg NUMERIC(4,1),
    record_date DATE NOT NULL,
    recorded_by UUID REFERENCES profiles(id),
    notes TEXT
);

-- MILESTONE: M1.3
CREATE TABLE person_identity_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    doc_type TEXT NOT NULL, -- 'id_card','passport'
    doc_number TEXT NOT NULL,
    issued_by TEXT NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    document_id UUID -- FK na documents doplněn po její vytvoření
);

-- MILESTONE: M1.3
CREATE TABLE person_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    signed_by TEXT NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    document_id UUID NOT NULL, -- FK na documents doplněn po její vytvoření
    notes TEXT
);

-- MILESTONE: M1.3
CREATE TABLE person_guardians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    guardian_name TEXT NOT NULL,
    relationship TEXT,
    appointed_by_court_id UUID REFERENCES courts(id),
    court_case_id UUID, -- FK na court_cases doplněn v části 3
    from_date DATE NOT NULL,
    to_date DATE,
    reason TEXT
);

-- MILESTONE: M1.3
CREATE TABLE person_photo_documentation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    document_id UUID NOT NULL, -- FK na documents doplněn po její vytvoření
    date_taken DATE NOT NULL,
    location_taken TEXT,
    age_at_photo_months INT,
    notes TEXT
);

-- ----------------------------------------------------------------------------
-- 13. AGREEMENTS (dohody o výkonu pěstounské péče)
-- ----------------------------------------------------------------------------
CREATE TYPE agreement_status AS ENUM ('draft','active','terminated','transferred');

-- MILESTONE: M1.6
CREATE TABLE agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    household_id UUID REFERENCES households(id) NOT NULL,
    agreement_number TEXT NOT NULL,
    date_signed DATE NOT NULL,
    oou_orp_consent_date DATE,
    oou_orp_consent_ref TEXT,
    status agreement_status DEFAULT 'draft',
    termination_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_agreements_household ON agreements(household_id);
-- ============================================================================
-- ČÁST 3: EVENTS, DOCUMENTS, SOUDNÍ AGENDA, BIO KONTAKTY, KRIZE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 14. EVENT STORE (časová osa rodiny) — configuration-driven
-- ----------------------------------------------------------------------------
-- MILESTONE: M1.5
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    household_id UUID REFERENCES households(id),
    person_id UUID REFERENCES persons(id),
    type TEXT NOT NULL,           -- volně textové, validuje se proti event_definitions.event_type
    severity INT DEFAULT 1,       -- 1 info, 2 varování, 3 kritické
    payload JSONB NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_events_household ON events(household_id);
CREATE INDEX idx_events_person ON events(person_id);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_type ON events(type);

-- MILESTONE: M1.5
CREATE TABLE event_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL = globální šablona
    event_type TEXT NOT NULL UNIQUE,    -- 'visit_log', 'school_change', 'bio_contact'...
    name_cs TEXT NOT NULL,
    category_term_id UUID REFERENCES taxonomy_terms(id), -- dynamický číselník (routine/legal/crisis/system)
    payload_schema JSONB NOT NULL,      -- JSON Schema pro validaci
    timeline_summary_template TEXT NOT NULL,
    post_actions JSONB DEFAULT '[]'::jsonb,  -- Workflow Lite: [{"action":"create_task",...}]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON COLUMN event_definitions.post_actions IS 'Pole JSON objektu definujicich akce. Podporovane: create_task, send_notification, change_case_state.';

-- ----------------------------------------------------------------------------
-- 15. DOCUMENTS (DMS jádro)
-- ----------------------------------------------------------------------------
CREATE TYPE external_cloud_provider AS ENUM ('google_drive', 'onedrive', 'yandex_disk');

-- MILESTONE: M1.7
CREATE TABLE document_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    parent_folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    household_id UUID REFERENCES households(id),
    external_provider external_cloud_provider,
    external_drive_folder_id TEXT,
    is_trashed BOOLEAN DEFAULT FALSE,
    trashed_at TIMESTAMP WITH TIME ZONE,
    trashed_by UUID REFERENCES profiles(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M1.7
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    household_id UUID REFERENCES households(id),
    person_id UUID REFERENCES persons(id),
    folder_id UUID REFERENCES document_folders(id),
    document_category_term_id UUID REFERENCES taxonomy_terms(id), -- dynamický číselník

    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_hash TEXT NOT NULL,             -- SHA-256
    mime_type TEXT NOT NULL,
    file_extension TEXT,

    source_type TEXT DEFAULT 'local_upload', -- 'local_upload','url_sync','external_drive'
    entry_channel TEXT DEFAULT 'manual_upload', -- 'mobile_camera','desktop_drag_drop','email_hook'
    external_source_url TEXT,
    -- V8 PROVIDER-AGNOSTIC: nahrazuje V6 external_drive_provider/external_drive_file_id.
    -- storage_integration_setting_id je NULL pokud file_path je v lokálním Supabase Storage
    -- (M1 výchozí stav). Vyplněno až po aktivaci M5.1 (Google Drive / OneDrive adaptér).
    storage_integration_setting_id UUID, -- FK na organization_integration_settings doplněn níže
    external_file_reference TEXT,   -- generické ID v cizím systému (Google fileId, MS driveItem id...)
    sync_interval_minutes INT,
    last_synced_at TIMESTAMP WITH TIME ZONE,

    version_number INT DEFAULT 1,
    supersedes_document_id UUID REFERENCES documents(id),

    ocr_status TEXT DEFAULT 'pending',
    ocr_raw_text TEXT,
    ocr_confidence NUMERIC(4,3),
    ai_interpretation JSONB,

    is_trashed BOOLEAN DEFAULT FALSE,
    trashed_at TIMESTAMP WITH TIME ZONE,
    trashed_by UUID REFERENCES profiles(id),
    is_favorite BOOLEAN DEFAULT FALSE,

    uploaded_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_documents_household ON documents(household_id);
CREATE INDEX idx_documents_person ON documents(person_id);
CREATE INDEX idx_documents_category ON documents(document_category_term_id);

-- Anotace dokumentů (komentáře v PDF)
-- MILESTONE: M1.7
CREATE TABLE document_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) NOT NULL,
    page_number INT NOT NULL,
    bounding_box JSONB NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interní textový editor
-- MILESTONE: M1.7
CREATE TABLE rich_text_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    folder_id UUID REFERENCES document_folders(id),
    household_id UUID REFERENCES households(id),
    title TEXT NOT NULL,
    content_json JSONB NOT NULL,
    author_id UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M1.7
CREATE TABLE rich_text_document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rich_text_document_id UUID REFERENCES rich_text_documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    content_json JSONB NOT NULL,
    saved_by UUID REFERENCES profiles(id) NOT NULL,
    commit_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M1.7
CREATE TABLE rich_text_attachments (
    rich_text_id UUID REFERENCES rich_text_documents(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    PRIMARY KEY (rich_text_id, document_id)
);

-- ---- ZPĖTNÉ DOPLNĖNÍ FK na documents (definovaných dříve jako "holé" UUID) ----
ALTER TABLE lifecycle_transitions ADD CONSTRAINT fk_lifecycle_doc FOREIGN KEY (mandatory_document_id) REFERENCES documents(id);
ALTER TABLE persons ADD CONSTRAINT fk_persons_avatar FOREIGN KEY (avatar_document_id) REFERENCES documents(id);
ALTER TABLE person_relationships ADD CONSTRAINT fk_relationships_gdpr FOREIGN KEY (gdpr_consent_document_id) REFERENCES documents(id);
ALTER TABLE person_report_cards ADD CONSTRAINT fk_report_cards_doc FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE person_identity_documents ADD CONSTRAINT fk_identity_doc FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE person_consents ADD CONSTRAINT fk_consents_doc FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE person_photo_documentation ADD CONSTRAINT fk_photo_doc FOREIGN KEY (document_id) REFERENCES documents(id);

-- ----------------------------------------------------------------------------
-- 16. SOUDNÍ AGENDA
-- ----------------------------------------------------------------------------
CREATE TYPE court_case_status AS ENUM ('active','appealed','closed_final');
CREATE TYPE decision_type AS ENUM ('rozsudek','usneseni','predbezne_opatreni');

-- MILESTONE: M2.1
CREATE TABLE court_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    household_id UUID REFERENCES households(id) NOT NULL,
    person_id UUID REFERENCES persons(id),
    court_id UUID REFERENCES courts(id) NOT NULL,
    sp_zn TEXT NOT NULL,                -- "12 P 34/2025"
    judge_name TEXT,
    subject TEXT NOT NULL,
    status court_case_status DEFAULT 'active',
    opened_date DATE NOT NULL,
    closed_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_court_cases_household ON court_cases(household_id);

ALTER TABLE person_guardians ADD CONSTRAINT fk_guardians_case FOREIGN KEY (court_case_id) REFERENCES court_cases(id);

-- MILESTONE: M2.1
CREATE TABLE court_hearings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    court_case_id UUID REFERENCES court_cases(id) ON DELETE CASCADE,
    hearing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    room_number TEXT,
    attended_by_ko UUID REFERENCES profiles(id),
    hearing_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M2.1
CREATE TABLE court_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    court_case_id UUID REFERENCES court_cases(id) ON DELETE CASCADE,
    decision_type decision_type NOT NULL,
    issue_date DATE NOT NULL,
    effective_date DATE,                -- datum nabytí právní moci (KLÍČOVÉ)
    verdict_summary TEXT NOT NULL,
    document_id UUID REFERENCES documents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 17. KONTAKTY S BIOLOGICKOU RODINOU
-- ----------------------------------------------------------------------------
CREATE TYPE contact_form AS ENUM (
    'osobni_asistovany', 'osobni_neasistovany', 'online_videohovor', 'telefonicky', 'pisemny'
);

-- MILESTONE: M2.2
CREATE TABLE contact_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    child_id UUID REFERENCES persons(id) NOT NULL,
    biological_person_id UUID REFERENCES persons(id) NOT NULL,
    approved_by TEXT NOT NULL,
    court_decision_id UUID REFERENCES court_decisions(id),
    frequency_description TEXT NOT NULL,
    allowed_forms contact_form[] NOT NULL,
    court_limitations TEXT,
    valid_from DATE NOT NULL,
    valid_to DATE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M2.2
CREATE TABLE contact_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_plan_id UUID REFERENCES contact_plans(id) ON DELETE CASCADE,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT NOT NULL,
    planned_form contact_form NOT NULL,
    escort_required BOOLEAN DEFAULT FALSE,
    assigned_ko_id UUID REFERENCES profiles(id),
    status_term_id UUID REFERENCES taxonomy_terms(id), -- dynamický číselník (planned/realized/cancelled...)
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M2.2
CREATE TABLE contact_supervisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES contact_schedules(id) ON DELETE CASCADE,
    realized_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INT NOT NULL,
    child_reaction_before TEXT NOT NULL,
    course_of_contact TEXT NOT NULL,
    child_reaction_after TEXT NOT NULL,
    ai_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 18. KRIZOVÝ MANAGEMENT
-- ----------------------------------------------------------------------------
CREATE TYPE crisis_type AS ENUM (
    'child_runaway', 'hospitalization', 'police_intervention', 'domestic_violence',
    'self_harm', 'foster_parent_collapse', 'other_critical'
);
CREATE TYPE crisis_status AS ENUM ('active_escalated', 'under_control', 'resolved_closed');

-- MILESTONE: M2.3
CREATE TABLE crisis_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    household_id UUID REFERENCES households(id) NOT NULL,
    person_id UUID REFERENCES persons(id),
    type crisis_type NOT NULL,
    status crisis_status DEFAULT 'active_escalated',
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reported_by UUID REFERENCES profiles(id),
    initial_description TEXT NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_crisis_cases_household ON crisis_cases(household_id);
CREATE INDEX idx_crisis_cases_status ON crisis_cases(status) WHERE status = 'active_escalated';

-- MILESTONE: M2.3
CREATE TABLE crisis_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crisis_case_id UUID REFERENCES crisis_cases(id) ON DELETE CASCADE,
    action_taken TEXT NOT NULL,
    performed_by UUID REFERENCES profiles(id) NOT NULL,
    action_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M2.3
CREATE TABLE crisis_resolutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crisis_case_id UUID REFERENCES crisis_cases(id) ON DELETE CASCADE UNIQUE,
    resolution_summary TEXT NOT NULL,
    preventive_measures TEXT NOT NULL,
    resolved_by UUID REFERENCES profiles(id) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- ============================================================================
-- ČÁST 4: ÚKOLY, SUPERVIZE, VZDĖLÁVÁNÍ, ŠABLONY, RETENCE, NOTIFIKACE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 19. ÚKOLY A PROJEKTY (polymorfní vazby, max 3 úrovně zanoření)
-- ----------------------------------------------------------------------------
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- MILESTONE: M2.4
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    state_term_id UUID REFERENCES taxonomy_terms(id),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M2.4
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority task_priority DEFAULT 'medium',
    state_term_id UUID REFERENCES taxonomy_terms(id), -- dynamický číselník (todo/in_progress/waiting/done)
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,

    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    related_event_id UUID REFERENCES events(id),
    related_crisis_id UUID REFERENCES crisis_cases(id),

    created_by UUID REFERENCES profiles(id) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);

-- Trigger: zabránit 4. úrovni zanoření úkolů
CREATE OR REPLACE FUNCTION check_task_nesting_depth()
RETURNS TRIGGER AS $$
DECLARE depth INT := 0; current_parent UUID;
BEGIN
    current_parent := NEW.parent_task_id;
    WHILE current_parent IS NOT NULL AND depth < 5 LOOP
        depth := depth + 1;
        SELECT parent_task_id INTO current_parent FROM tasks WHERE id = current_parent;
    END LOOP;
    IF depth >= 3 THEN
        RAISE EXCEPTION 'Maximalni hloubka zanoreni ukolu (3 urovne) byla prekrocena';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_task_depth
BEFORE INSERT OR UPDATE OF parent_task_id ON tasks
FOR EACH ROW WHEN (NEW.parent_task_id IS NOT NULL) EXECUTE FUNCTION check_task_nesting_depth();

-- Polymorfní vazby — nahrazuje pevné sloupce household_id/person_id na tasks
-- MILESTONE: M2.4
CREATE TABLE task_entity_links (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'court_case','household','person','organization','document'
    entity_id UUID NOT NULL,
    PRIMARY KEY (task_id, entity_type, entity_id)
);
CREATE INDEX idx_task_entity_links_entity ON task_entity_links(entity_type, entity_id);

-- MILESTONE: M2.4
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, assigned_to)
);

-- MILESTONE: M2.4
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 20. SUPERVIZE A METODICKÉ VEDENÍ
-- ----------------------------------------------------------------------------
CREATE TYPE supervision_status AS ENUM ('planned', 'completed', 'cancelled');

-- MILESTONE: M2.5
CREATE TABLE supervisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    type_term_id UUID REFERENCES taxonomy_terms(id), -- dynamický číselník (individual/group/methodological)
    supervision_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INT NOT NULL,
    supervisor_name TEXT NOT NULL,
    status supervision_status DEFAULT 'planned',
    household_id UUID REFERENCES households(id), -- vyplněno jen pro případovou supervizi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M2.5
CREATE TABLE supervision_participants (
    supervision_id UUID REFERENCES supervisions(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    attended BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (supervision_id, employee_id)
);

-- MILESTONE: M2.5
CREATE TABLE supervision_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supervision_id UUID REFERENCES supervisions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    is_private BOOLEAN DEFAULT TRUE,
    content_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M2.5
CREATE TABLE supervision_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supervision_id UUID REFERENCES supervisions(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    recommendation_text TEXT NOT NULL,
    is_fulfilled BOOLEAN DEFAULT FALSE,
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 21. VZDĖLÁVÁNÍ PĖSTOUNŮ
-- ----------------------------------------------------------------------------
CREATE TYPE education_status AS ENUM ('planned', 'completed', 'verified', 'cancelled');

-- MILESTONE: M2.5
CREATE TABLE education_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    foster_parent_id UUID REFERENCES profiles(id) NOT NULL,
    year INT NOT NULL,
    course_name TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    form_term_id UUID REFERENCES taxonomy_terms(id), -- dynamický číselník (prezenční/e-learning/pobytové)
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    duration_hours INT NOT NULL CHECK (duration_hours > 0),
    status education_status DEFAULT 'planned',
    certificate_document_id UUID REFERENCES documents(id),
    financial_transaction_id UUID, -- FK na service_transactions doplněn v části 5
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_education_records_parent_year ON education_records(foster_parent_id, year);

-- ----------------------------------------------------------------------------
-- 22. DOKUMENTOVÉ ŠABLONY (verzované)
-- ----------------------------------------------------------------------------
CREATE TYPE template_type AS ENUM (
    'ipod_initial', 'ipod_review', 'court_report', 'ospod_report_annual',
    'contact_plan', 'agreement_foster'
);

-- MILESTONE: M2.6
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    type template_type NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- MILESTONE: M2.6
CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES document_templates(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    content_template TEXT NOT NULL,     -- s proměnnými {{child.first_name}}
    header_template TEXT,
    footer_template TEXT,
    valid_from DATE NOT NULL,
    valid_to DATE,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, version_number)
);

-- MILESTONE: M2.6
CREATE TABLE generated_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    household_id UUID REFERENCES households(id) NOT NULL,
    person_id UUID REFERENCES persons(id),
    template_version_id UUID REFERENCES template_versions(id) NOT NULL,
    document_url TEXT NOT NULL,
    generation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID REFERENCES profiles(id) NOT NULL,
    file_hash TEXT NOT NULL
);

-- ----------------------------------------------------------------------------
-- 23. RETENČNÍ POLITIKA A GDPR
-- ----------------------------------------------------------------------------
CREATE TYPE retention_action AS ENUM ('soft_delete', 'anonymize', 'hard_delete');
CREATE TYPE trigger_event AS ENUM (
    'case_closed', 'lead_created', 'document_uploaded', 'manual_gdpr_request'
);

-- MILESTONE: M2.8
CREATE TABLE retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    policy_name TEXT NOT NULL,
    target_table TEXT NOT NULL,
    trigger trigger_event NOT NULL,
    retention_period_days INT NOT NULL,
    action retention_action NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M2.8
CREATE TABLE data_deletion_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    policy_id UUID REFERENCES retention_policies(id),
    deleted_record_id UUID NOT NULL,
    target_table TEXT NOT NULL,
    action_taken retention_action NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_by UUID REFERENCES profiles(id)
);

-- MILESTONE: M2.8
CREATE TABLE archive_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL,
    target_table TEXT NOT NULL,
    scheduled_action retention_action NOT NULL,
    scheduled_for DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 24. NOTIFIKACE
-- ----------------------------------------------------------------------------
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'push_mobile', 'sms');
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'urgent');
CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'failed', 'read');

-- MILESTONE: M2.7
CREATE TABLE user_notification_preferences (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    notify_on_new_task BOOLEAN DEFAULT TRUE,
    notify_on_task_deadline BOOLEAN DEFAULT TRUE,
    notify_on_document_upload BOOLEAN DEFAULT FALSE,
    preferred_urgent_channel notification_channel DEFAULT 'push_mobile',
    preferred_daily_summary BOOLEAN DEFAULT TRUE
);

-- MILESTONE: M2.7
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message_body TEXT NOT NULL,
    priority notification_priority DEFAULT 'normal',
    target_entity_type TEXT,
    target_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;

-- MILESTONE: M2.7
CREATE TABLE notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    status delivery_status DEFAULT 'pending',
    external_provider_id TEXT,
    error_message TEXT,
    attempt_count INT DEFAULT 0,
    dispatched_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- ============================================================================
-- ČÁST 5: FINANČNÍ VRSTVA — PROVIDERS, DOKLADY, SCHVALOVÁNÍ, SPVPP, AI BI
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 25. PROVIDERS (platební partneři — koncepčně Karta kontaktu, technicky vlastní tabulka)
-- ----------------------------------------------------------------------------
CREATE TYPE provider_type AS ENUM (
    'camp_operator', 'caregiver_person', 'caregiver_agency', 'education_provider',
    'therapist', 'legal_service', 'transport', 'medical', 'other_organization',
    'other_person', 'foster_parent_refund'
);

-- MILESTONE: M3.1
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    provider_type provider_type NOT NULL,
    company_name TEXT NOT NULL,
    ico TEXT,
    dic TEXT,
    bank_account TEXT,
    contract_date DATE,
    is_registered_with_region BOOLEAN DEFAULT FALSE,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, ico)
);

-- ----------------------------------------------------------------------------
-- 26. PAYMENT_DOCUMENTS (sjednocený název, položky vázané na konkrétní dítě)
-- ----------------------------------------------------------------------------
CREATE TYPE payment_document_status AS ENUM (
    'draft', 'pending_approval', 'approved', 'paid', 'partially_accepted', 'rejected'
);

-- MILESTONE: M3.2
CREATE TABLE payment_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    provider_id UUID REFERENCES providers(id), -- NULL pokud refundace pěstounovi
    household_id UUID REFERENCES households(id) NOT NULL,

    document_number TEXT,
    variable_symbol TEXT,
    status payment_document_status DEFAULT 'draft',

    issue_date DATE NOT NULL,
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,

    total_amount_czk NUMERIC(12,2) NOT NULL CHECK (total_amount_czk > 0),
    approved_amount_czk NUMERIC(12,2),

    -- Výjimka: refundace pěstounovi
    is_foster_reimbursement BOOLEAN DEFAULT FALSE,
    reimbursement_reason TEXT,
    foster_parent_id UUID REFERENCES profiles(id),

    document_file_id UUID REFERENCES documents(id) NOT NULL,
    applied_params JSONB,  -- snapshot system_parameters k datu transakce

    created_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_reimbursement_requires_reason CHECK (
        (is_foster_reimbursement = FALSE) OR
        (is_foster_reimbursement = TRUE AND reimbursement_reason IS NOT NULL AND foster_parent_id IS NOT NULL)
    )
);
CREATE INDEX idx_payment_documents_household ON payment_documents(household_id);
CREATE INDEX idx_payment_documents_status ON payment_documents(status);

-- Položky dokladu — VAZBA NA KONKRÉTNÍ DÍTĖ (klíčová vlastnost sjednocené verze)
-- MILESTONE: M3.2
CREATE TABLE payment_document_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_document_id UUID REFERENCES payment_documents(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    person_id UUID REFERENCES persons(id) NOT NULL,
    spvpp_category TEXT NOT NULL,  -- 'respite','education','counseling','administration','unrecognized'
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'ks',
    price_per_unit_czk NUMERIC(12,2) NOT NULL,
    total_item_amount_czk NUMERIC(12,2) NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE
);
CREATE INDEX idx_payment_document_items_person ON payment_document_items(person_id);

-- ----------------------------------------------------------------------------
-- 27. SERVICE_TRANSACTIONS (čerpání SPVPP, navázáno na payment_documents)
-- ----------------------------------------------------------------------------
CREATE TYPE spvpp_category AS ENUM ('respite', 'education', 'counseling', 'administration', 'unrecognized');

-- MILESTONE: M3.3
CREATE TABLE service_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    person_id UUID REFERENCES persons(id) NOT NULL,
    category TEXT NOT NULL,            -- volný text/kategorie respitu (krátkodobé/celodenní...)
    spvpp_category spvpp_category DEFAULT 'unrecognized',
    amount_used NUMERIC(10,2) NOT NULL, -- hodiny nebo dny
    cost_czk NUMERIC(10,2) NOT NULL,
    applied_params JSONB NOT NULL,      -- snapshot zákonných limitů
    payment_document_id UUID REFERENCES payment_documents(id),
    approval_state TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_service_transactions_person ON service_transactions(person_id);

ALTER TABLE education_records ADD CONSTRAINT fk_education_financial FOREIGN KEY (financial_transaction_id) REFERENCES service_transactions(id);

-- ----------------------------------------------------------------------------
-- 28. SCHVALOVACÍ WORKFLOW — krok se váže na PERMISSION, nikdy na roli
-- ----------------------------------------------------------------------------
CREATE TYPE approval_step_status AS ENUM ('pending', 'approved', 'rejected', 'escalated', 'timeout');

-- MILESTONE: M3.5
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M3.5
CREATE TABLE approval_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES approval_workflows(id) ON DELETE CASCADE NOT NULL,
    step_number INT NOT NULL,
    required_permission_code TEXT NOT NULL REFERENCES permissions(code),
    required_profile_id UUID REFERENCES profiles(id), -- alternativa: konkrétní osoba
    min_amount_czk NUMERIC(12,2) DEFAULT 0.00,
    timeout_hours INT DEFAULT 48,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workflow_id, step_number)
);
CREATE INDEX idx_approval_steps_lookup ON approval_steps(workflow_id, step_number);

-- MILESTONE: M3.5
CREATE TABLE document_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_document_id UUID REFERENCES payment_documents(id) ON DELETE CASCADE NOT NULL,
    current_step_number INT NOT NULL DEFAULT 1,
    status approval_step_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M3.5
CREATE TABLE approval_history_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_approval_id UUID REFERENCES document_approvals(id) ON DELETE CASCADE NOT NULL,
    step_number INT NOT NULL,
    executed_by UUID REFERENCES profiles(id), -- NULL při systémovém timeoutu
    status approval_step_status NOT NULL,
    notes TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 29. SPVPP PARAMETRY A ZÁKONNÉ TERMÍNY
-- ----------------------------------------------------------------------------
-- MILESTONE: M3.3
CREATE TABLE spvpp_parameters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    valid_from DATE NOT NULL,
    valid_to DATE,
    base_annual_amount_czk NUMERIC(12,2) NOT NULL,
    min_respite_percentage INT NOT NULL DEFAULT 0,
    min_education_percentage INT NOT NULL DEFAULT 0,
    min_counseling_percentage INT NOT NULL DEFAULT 0,
    max_administration_percentage INT NOT NULL DEFAULT 100,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M3.3
CREATE TABLE statutory_deadlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL = celostátně platné
    event_name TEXT NOT NULL,
    deadline_month INT NOT NULL CHECK (deadline_month BETWEEN 1 AND 12),
    deadline_day INT NOT NULL CHECK (deadline_day BETWEEN 1 AND 31),
    warning_days_ahead INT[] DEFAULT '{30, 14, 7}',
    is_active BOOLEAN DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- 30. BANKOVNÍ PÁROVÁNÍ
-- ----------------------------------------------------------------------------
-- MILESTONE: M3.7
CREATE TABLE bank_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    document_file_id UUID REFERENCES documents(id) NOT NULL,
    statement_number TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M3.7
CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    statement_id UUID REFERENCES bank_statements(id) ON DELETE CASCADE NOT NULL,
    booking_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,  -- kladné = příjem, záporné = výdej
    variable_symbol TEXT,
    counterparty_account TEXT NOT NULL,
    counterparty_name TEXT,
    remittance_info TEXT,
    paired_payment_document_id UUID REFERENCES payment_documents(id),
    is_manually_paired BOOLEAN DEFAULT FALSE,
    paired_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_bank_tx_matching ON bank_transactions(variable_symbol, amount) WHERE paired_payment_document_id IS NULL;

-- ----------------------------------------------------------------------------
-- 31. VÝSTUPNÍ ADAPTÉRY A EXPORTY
-- ----------------------------------------------------------------------------
CREATE TYPE export_format AS ENUM ('csv', 'xlsx', 'xml', 'json');
CREATE TYPE export_recipient AS ENUM ('urad_prace', 'krajsky_urad', 'mpsv', 'financni_urad', 'externi_ucetni');

-- MILESTONE: M8.2
CREATE TABLE export_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL = globální systémová šablona
    name TEXT NOT NULL,
    recipient export_recipient NOT NULL,
    format export_format NOT NULL,
    mapping_configuration JSONB NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, recipient, name, version)
);

-- MILESTONE: M8.2
CREATE TABLE export_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    template_id UUID REFERENCES export_templates(id) NOT NULL,
    generated_by UUID REFERENCES profiles(id) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    parameters_used JSONB NOT NULL
);

-- MILESTONE: M8.3
CREATE TABLE accountant_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE NOT NULL,
    allowed_recipients export_recipient[] DEFAULT '{externi_ucetni}',
    sms_verification_phone TEXT NOT NULL,  -- POVINNÉ (V5/V6 rozhodnutí)
    created_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 32. KNOWLEDGE BASE, RAG A AUDIT AI
-- ----------------------------------------------------------------------------
CREATE TYPE legal_source_type AS ENUM ('zakon', 'vyhlaska', 'metodika_mpsv', 'interni_smernice', 'judikatura');
CREATE TYPE ai_source_scope AS ENUM ('global', 'household_specific');

-- MILESTONE: M6.3
CREATE TABLE legal_frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL = celostátní zákon
    name TEXT NOT NULL,
    abbreviation TEXT,
    source_type legal_source_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M6.3
CREATE TABLE knowledge_base_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT,
    document_id UUID REFERENCES documents(id),
    scope ai_source_scope DEFAULT 'global',
    household_id UUID REFERENCES households(id),
    is_active BOOLEAN DEFAULT TRUE,
    sync_interval_hours INT DEFAULT 24,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    last_content_hash TEXT,
    created_by UUID REFERENCES profiles(id)
);

-- MILESTONE: M6.3
CREATE TABLE knowledge_base_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL = globální know-how
    source_id UUID REFERENCES knowledge_base_sources(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id),
    framework_id UUID REFERENCES legal_frameworks(id),
    title TEXT NOT NULL,
    content_text TEXT NOT NULL,
    category TEXT NOT NULL,            -- 'metodika','zakon','judikatura'
    section_reference TEXT,            -- "§ 47b odst. 2"
    version_number INT DEFAULT 1,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,                     -- NULL = aktuálně platná verze
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_kb_embedding ON knowledge_base_articles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_kb_validity ON knowledge_base_articles(valid_to) WHERE valid_to IS NULL;

-- MILESTONE: M6.7
CREATE TABLE knowledge_base_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES knowledge_base_sources(id) ON DELETE CASCADE,
    sync_status TEXT NOT NULL,         -- 'unchanged','updated','source_missing','error'
    detected_changes_summary TEXT,
    requires_admin_approval BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE crawler_asset_status AS ENUM ('pending_approval', 'approved', 'rejected', 'missing_waiting_approval');

-- MILESTONE: M6.7
CREATE TABLE crawler_discovered_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES knowledge_base_sources(id) ON DELETE CASCADE,
    asset_url TEXT NOT NULL,
    asset_title TEXT,
    discovery_status crawler_asset_status DEFAULT 'pending_approval',
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id)
);

-- MILESTONE: M6.1
CREATE TABLE ai_assistant_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    -- V8 PROVIDER-AGNOSTIC: který AI provider tento asistent používá.
    -- NULL = použije se organizace výchozí z organization_integration_settings (category='ai').
    ai_integration_setting_id UUID, -- FK na organization_integration_settings doplněn níže
    active_prompt_version_id UUID,  -- FK na ai_prompt_versions doplněn v M6.6 sekci
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M6.1
CREATE TABLE ai_assistant_sources (
    ai_assistant_id UUID REFERENCES ai_assistant_profiles(id) ON DELETE CASCADE,
    source_id UUID REFERENCES knowledge_base_sources(id) ON DELETE CASCADE,
    PRIMARY KEY (ai_assistant_id, source_id)
);

-- Trasovací deník AI (RAG dotazy nad legislativou) — append-only, bez audit triggeru
-- MILESTONE: M6.4
CREATE TABLE ai_interaction_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    user_prompt TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    retrieved_article_ids UUID[] NOT NULL,
    model_version TEXT NOT NULL,
    tokens_used INT,
    interaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 33. AI BI / KONVERZAČNÍ ANALYTIKA — view-based bezpečnost (vítězná architektura)
-- ----------------------------------------------------------------------------
-- MILESTONE: M6.5
CREATE OR REPLACE VIEW ai_bi_finance_view AS
SELECT
    pd.id, pd.household_id, h.branch_id, pd.total_amount_czk, pd.status, pd.issue_date,
    pr.company_name AS provider_name
FROM payment_documents pd
LEFT JOIN households h ON pd.household_id = h.id
LEFT JOIN providers pr ON pd.provider_id = pr.id;

-- MILESTONE: M6.5
CREATE OR REPLACE VIEW ai_bi_events_view AS
SELECT
    e.id, e.household_id, h.branch_id, e.type, e.created_at,
    p.full_name AS created_by_name
FROM events e
LEFT JOIN households h ON e.household_id = h.id
LEFT JOIN profiles p ON e.created_by = p.id;

-- MILESTONE: M6.5
CREATE TABLE ai_bi_query_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    natural_language_prompt TEXT NOT NULL,
    generated_sql_query TEXT NOT NULL,
    execution_successful BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    returned_row_count INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- ============================================================================
-- ČÁST 6: KLIENTSKÁ ZÓNA, MIGRACE, IDENTIFIKÁTORY, TABULKOVÉ POHLEDY, SAAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 34. KLIENTSKÁ ZÓNA (Foster Parent Portal)
-- ----------------------------------------------------------------------------
CREATE TYPE request_type AS ENUM ('respite_approval', 'education_reimbursement', 'document_upload', 'general_inquiry');
CREATE TYPE request_status AS ENUM ('pending', 'in_progress', 'approved', 'rejected');

-- MILESTONE: M8.1
CREATE TABLE client_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    household_id UUID REFERENCES households(id) NOT NULL,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    type request_type NOT NULL,
    status request_status DEFAULT 'pending',
    title TEXT NOT NULL,
    description TEXT,
    attachment_id UUID REFERENCES documents(id),
    resulting_payment_document_id UUID REFERENCES payment_documents(id),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ----------------------------------------------------------------------------
-- 35. MIGRACE A EXPORTY MEZI ORGANIZACEMI
-- ----------------------------------------------------------------------------
CREATE TYPE transfer_status AS ENUM ('initiated', 'in_transit', 'completed', 'failed', 'cancelled');

-- MILESTONE: M4.5
CREATE TABLE case_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_organization_id UUID REFERENCES organizations(id) NOT NULL,
    target_organization_ic TEXT,
    household_id UUID REFERENCES households(id) NOT NULL,
    export_package_url TEXT NOT NULL,
    package_sha256_hash TEXT NOT NULL,
    encryption_key_hint TEXT,
    status transfer_status DEFAULT 'initiated',
    initiated_by UUID REFERENCES profiles(id) NOT NULL,
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- ----------------------------------------------------------------------------
-- 36. IDENTIFIKÁTORY A ČÍSLA JEDNACÍ
-- ----------------------------------------------------------------------------
-- MILESTONE: M1.2
CREATE TABLE organization_sequences (
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    sequence_type TEXT NOT NULL,    -- 'household_id','outgoing_ref_number'
    year INT NOT NULL,
    current_value INT DEFAULT 0,
    PRIMARY KEY (organization_id, sequence_type, year)
);

-- MILESTONE: M1.7
CREATE TABLE outgoing_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    reference_number TEXT NOT NULL UNIQUE,
    recipient_name TEXT NOT NULL,
    recipient_type TEXT NOT NULL,    -- 'urad','soud','klient','jine'
    subject TEXT NOT NULL,
    dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dispatched_by UUID REFERENCES profiles(id) NOT NULL,
    related_household_id UUID REFERENCES households(id),
    document_id UUID REFERENCES documents(id)
);

CREATE OR REPLACE FUNCTION get_next_sequence_value(org_id UUID, seq_type TEXT, seq_year INT)
RETURNS INT AS $$
DECLARE next_val INT;
BEGIN
    INSERT INTO organization_sequences (organization_id, sequence_type, year, current_value)
    VALUES (org_id, seq_type, seq_year, 1)
    ON CONFLICT (organization_id, sequence_type, year)
    DO UPDATE SET current_value = organization_sequences.current_value + 1
    RETURNING current_value INTO next_val;
    RETURN next_val;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 37. KONFIGUROVATELNÉ TABULKOVÉ POHLEDY (Google Analytics styl)
-- ----------------------------------------------------------------------------
-- MILESTONE: M1.9
CREATE TABLE table_view_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL = systémový výchozí pohled
    table_key TEXT NOT NULL,             -- 'households_list','children_list','payment_documents_list','tasks_list'
    view_name TEXT NOT NULL,
    owner_profile_id UUID REFERENCES profiles(id), -- NULL = sdílený pohled organizace
    is_default BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    column_config JSONB NOT NULL,
    -- [{"field":"foster_id","label":"Evid. číslo","width":140,"visible":true,"order":1}, ...]
    default_sort_field TEXT,
    default_sort_direction TEXT CHECK (default_sort_direction IN ('asc','desc')) DEFAULT 'asc',
    default_filters JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M1.9
CREATE TABLE table_available_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_key TEXT NOT NULL,
    field_key TEXT NOT NULL,             -- 'foster_id', 'custom_field:c1a2-u4'
    label TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('text','number','date','boolean','enum','computed')),
    is_sortable BOOLEAN DEFAULT TRUE,
    is_filterable BOOLEAN DEFAULT TRUE,
    source_table TEXT,
    UNIQUE(table_key, field_key)
);

-- MILESTONE: M1.9
CREATE TABLE table_view_user_preference (
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    table_key TEXT NOT NULL,
    active_view_id UUID REFERENCES table_view_definitions(id),
    PRIMARY KEY (profile_id, table_key)
);

-- ----------------------------------------------------------------------------
-- 38. SAAS PŘEDPLATNÉ A WHITELABELING
-- ----------------------------------------------------------------------------
CREATE TYPE subscription_tier AS ENUM ('free_trial', 'tier_1_basic', 'tier_2_pro', 'tier_3_ultra', 'tier_custom');

-- MILESTONE: M4.3
CREATE TABLE organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE NOT NULL,
    tier subscription_tier NOT NULL DEFAULT 'free_trial',
    max_households INT NOT NULL DEFAULT 3,
    max_ko_users INT NOT NULL DEFAULT 1,
    feature_branding_allowed BOOLEAN DEFAULT FALSE,
    feature_ai_allowed BOOLEAN DEFAULT FALSE,
    feature_ai_rag_allowed BOOLEAN DEFAULT FALSE,
    feature_bank_matching_allowed BOOLEAN DEFAULT FALSE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 39. ANALYTIKA, KPI A STATISTICKÁ NADSTAVBA
-- ----------------------------------------------------------------------------
-- MILESTONE: M7.1
CREATE TABLE organization_metrics_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    snapshot_date DATE NOT NULL,
    total_active_agreements INT NOT NULL,
    total_foster_children INT NOT NULL,
    total_unresolved_tasks INT NOT NULL,
    total_spvpp_spent_czk NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, snapshot_date)
);

-- MILESTONE: M7.3
CREATE TABLE organization_statistics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    stat_date DATE NOT NULL,
    metrics JSONB NOT NULL,
    UNIQUE(organization_id, stat_date)
);

-- MILESTONE: M7.4
CREATE TABLE global_statistics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_date DATE NOT NULL UNIQUE,
    metrics JSONB NOT NULL  -- agregace přes všechny organizace, anonymizováno
);

-- Materializovaný pohled: vytížení klíčových osob (vážené body)
-- MILESTONE: M7.1
CREATE MATERIALIZED VIEW mv_ko_workload AS
SELECT
    p.id AS ko_id, p.full_name,
    COUNT(DISTINCT h.id) AS total_active_households,
    COUNT(DISTINCT pe.id) AS total_active_children,
    COUNT(DISTINCT e.id) FILTER (WHERE e.created_at >= NOW() - INTERVAL '30 days') AS events_last_30_days,
    COUNT(DISTINCT crisis.id) FILTER (WHERE crisis.status = 'active_escalated') AS active_crises,
    COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'active') AS active_court_cases,
    -- Vážené vytížení: rodina 1 bod, soudní spor +1, aktivní krize +3
    (COUNT(DISTINCT h.id)
        + COUNT(DISTINCT cc.id) FILTER (WHERE cc.status = 'active')
        + 3 * COUNT(DISTINCT crisis.id) FILTER (WHERE crisis.status = 'active_escalated')
    ) AS weighted_workload_score
FROM profiles p
LEFT JOIN households h ON h.assigned_ko_id = p.id AND h.status = 'active'
LEFT JOIN household_members hm ON hm.household_id = h.id
LEFT JOIN persons pe ON hm.person_id = pe.id AND pe.category = 'foster_child' AND pe.status = 'active'
LEFT JOIN events e ON e.created_by = p.id
LEFT JOIN crisis_cases crisis ON crisis.household_id = h.id
LEFT JOIN court_cases cc ON cc.household_id = h.id
GROUP BY p.id, p.full_name;

CREATE UNIQUE INDEX idx_mv_ko_workload ON mv_ko_workload(ko_id);

-- Materializovaný pohled: náklady na dítě
-- MILESTONE: M7.1
CREATE MATERIALIZED VIEW mv_cost_per_child AS
SELECT
    pe.id AS child_id, pe.first_name, pe.last_name,
    EXTRACT(YEAR FROM pd.paid_at) AS fiscal_year,
    SUM(pdi.total_item_amount_czk) FILTER (WHERE pdi.spvpp_category = 'respite') AS total_respite_cost,
    SUM(pdi.total_item_amount_czk) FILTER (WHERE pdi.spvpp_category = 'education') AS total_education_cost,
    SUM(pdi.total_item_amount_czk) AS total_cost_czk
FROM persons pe
LEFT JOIN payment_document_items pdi ON pdi.person_id = pe.id
LEFT JOIN payment_documents pd ON pdi.payment_document_id = pd.id AND pd.status = 'paid'
WHERE pe.category = 'foster_child'
GROUP BY pe.id, pe.first_name, pe.last_name, EXTRACT(YEAR FROM pd.paid_at);

CREATE UNIQUE INDEX idx_mv_cost_per_child ON mv_cost_per_child(child_id, fiscal_year);

COMMENT ON MATERIALIZED VIEW mv_ko_workload IS 'Obnovovat noční CRON: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ko_workload;';
COMMENT ON MATERIALIZED VIEW mv_cost_per_child IS 'Obnovovat noční CRON: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cost_per_child;';

-- ----------------------------------------------------------------------------
-- 40. AUDITNÍ LOGOVÁNÍ (NÚKIB standard) — definice PŘED triggery
-- ----------------------------------------------------------------------------
-- MILESTONE: M1.10
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    user_id UUID,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    warning_override_reason TEXT,  -- důvod obejití soft-blokace
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_org_time ON audit_logs(organization_id, created_at);
CREATE INDEX idx_audit_logs_record ON audit_logs(table_name, record_id);

CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (organization_id, user_id, table_name, record_id, action, old_data, new_data)
    VALUES (
        COALESCE(NEW.organization_id, OLD.organization_id),
        auth.uid(),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ČÁST 6.5 (V8): DOPLŇKOVÉ MODULY — i18n, DR, observabilita, bezpečnost, právo,
-- import, sandbox, AI prompty/etika, analytika, veřejné API, bankovní PSD2,
-- hloubkový whitelabeling, plugin architektura, deprecation politika.
-- Vše vloženo PŘED audit triggery, aby i tyto nové tabulky mohly být auditované.
-- ============================================================================

-- ============================================================================
-- V8 DODATEK 2: VÍCEJAZYČNOST (i18n) — MILESTONE M1.13
-- ============================================================================

ALTER TABLE profiles ADD COLUMN locale TEXT NOT NULL DEFAULT 'cs-CZ';
ALTER TABLE organizations ADD COLUMN default_locale TEXT NOT NULL DEFAULT 'cs-CZ';

-- MILESTONE: M1.13
-- Jazykově neutrální klíče pro VŠECHNY uživatelsky viditelné texty v aplikaci
-- (UI labely, e-mailové šablony, systémové notifikace). NEPLATÍ pro generovaná
-- PDF (document_templates z M2.6 mají vlastní jazykovou verzi přes template_versions).
CREATE TABLE translation_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_name TEXT NOT NULL UNIQUE,   -- 'household.status.active', 'task.priority.critical'
    context TEXT,                    -- kde se v UI používá, pro překladatele
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE translation_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    translation_key_id UUID REFERENCES translation_keys(id) ON DELETE CASCADE NOT NULL,
    locale TEXT NOT NULL,            -- 'cs-CZ', 'sk-SK', 'en-US'
    value TEXT NOT NULL,
    UNIQUE(translation_key_id, locale)
);
CREATE INDEX idx_translation_values_locale ON translation_values(locale);

COMMENT ON TABLE translation_keys IS
'M1 obsahuje POUZE cs-CZ hodnoty. Architektura je od počátku jazykově neutrální (žádný
text natvrdo v komponentách), takže přidání dalšího jazyka v budoucnu je čistě datová
operace (INSERT do translation_values), ne kódová změna.';


-- ============================================================================
-- V8 DODATEK 3: DISASTER RECOVERY A BUSINESS CONTINUITY — MILESTONE M1.10
-- ============================================================================

-- MILESTONE: M1.10
CREATE TABLE disaster_recovery_runbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_name TEXT NOT NULL,    -- 'Úplná ztráta primární databáze', 'Ransomware útok'
    rto_minutes INT NOT NULL,        -- Recovery Time Objective - za jak dlouho musí systém běžet
    rpo_minutes INT NOT NULL,        -- Recovery Point Objective - kolik dat smí v nejhorším případě chybět
    runbook_steps JSONB NOT NULL,    -- strukturovaný seznam kroků k obnově
    last_reviewed_at DATE,
    reviewed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M1.10
-- KRITICKÉ: záloha, která se nikdy nezkusila obnovit, není záloha. Tato tabulka
-- vynucuje evidenci PRAVIDELNÉHO testu obnovy, ne jen existenci zálohy.
CREATE TABLE backup_restore_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_date TIMESTAMP WITH TIME ZONE NOT NULL,
    backup_snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL,
    restore_target TEXT NOT NULL,    -- 'staging_environment', 'isolated_test_db'
    restore_successful BOOLEAN NOT NULL,
    actual_restore_duration_minutes INT,
    data_integrity_verified BOOLEAN DEFAULT FALSE,
    issues_found TEXT,
    performed_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE backup_restore_tests IS
'M1 GATE PODMÍNKA: před prvním ostrým nasazením musí existovat alespoň jeden záznam
s restore_successful = TRUE provedený na reálném snapshotu produkčních (nebo staging
ekvivalentních) dat. Bez toho je WORM backup z V5/V6 kapitoly o bezpečnosti jen teorie.';


-- ============================================================================
-- V8 DODATEK 4: VLASTNICTVÍ DAT A EXIT STRATEGIE — MILESTONE M1.15
-- ============================================================================

CREATE TYPE data_export_format AS ENUM ('json', 'csv', 'zip_full');
CREATE TYPE data_export_status AS ENUM ('requested', 'processing', 'ready', 'downloaded', 'expired');

-- MILESTONE: M1.15
-- Funguje VE VŠECH TARIFECH bez výjimky - to je etický/obchodní závazek, ne feature flag.
CREATE TABLE data_export_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    requested_by UUID REFERENCES profiles(id) NOT NULL,
    format data_export_format NOT NULL DEFAULT 'zip_full',
    status data_export_status DEFAULT 'requested',
    scope TEXT NOT NULL DEFAULT 'full_organization', -- 'full_organization' nebo 'single_household:UUID'
    file_path TEXT,
    file_hash TEXT,
    download_expires_at TIMESTAMP WITH TIME ZONE,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE data_export_requests IS
'PRINCIP: Data jsou majetkem DO, ne provozovatele systému. Tato funkce NESMÍ být
zpoplatněna ani omezena tarifem (žádný feature_flag gating). Export obsahuje VŠECHNA
data organizace ve strukturovaném, dokumentovaném formátu (ne jen "co se vejde do PDF"),
aby DO mohla reálně přejít na jiný systém, pokud se tak rozhodne.';


-- ============================================================================
-- V8 DODATEK 5: OBSERVABILITA — MILESTONE M1.11
-- ============================================================================

CREATE TYPE error_severity AS ENUM ('debug', 'info', 'warning', 'error', 'critical');

-- MILESTONE: M1.11
-- Provider-agnostic: aplikace zapisuje sem VŽDY, bez ohledu na to, zda je navíc
-- napojena externí služba typu Sentry. Externí služba je adaptér nad touto tabulkou,
-- ne náhrada za ni - data o chybách musí zůstat v systému i bez externí závislosti.
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL pro systémové chyby mimo tenant kontext
    severity error_severity NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    request_path TEXT,
    user_id UUID REFERENCES profiles(id),
    context JSONB,                    -- doplňková data (request body, browser info)
    external_tracking_id TEXT,        -- ID v externí službě (Sentry event ID), pokud napojeno
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_error_logs_severity_time ON error_logs(severity, created_at DESC);
CREATE INDEX idx_error_logs_unresolved ON error_logs(created_at) WHERE resolved_at IS NULL;

-- MILESTONE: M1.11
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    metric_name TEXT NOT NULL,        -- 'api_response_time_ms', 'db_query_duration_ms'
    metric_value NUMERIC NOT NULL,
    endpoint TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_performance_metrics_name_time ON performance_metrics(metric_name, recorded_at DESC);

COMMENT ON TABLE error_logs IS
'M1 GATE PODMÍNKA: alerting musí být funkční (alespoň e-mail na critical severity)
PŘED prvním ostrým nasazením, ne "doděláme to později, až to spadne".';


-- ============================================================================
-- V8 DODATEK 6: BEZPEČNOSTNÍ AUDIT — MILESTONE M1.14
-- ============================================================================

CREATE TYPE security_finding_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE security_finding_status AS ENUM ('open', 'in_remediation', 'resolved', 'accepted_risk');

-- MILESTONE: M1.14
CREATE TABLE security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_name TEXT NOT NULL,         -- 'Pre-launch pentest 2026-Q3'
    audit_type TEXT NOT NULL,         -- 'internal_review','external_pentest','automated_scan'
    performed_by TEXT NOT NULL,       -- jméno/firma auditora
    scope TEXT NOT NULL,
    started_at DATE NOT NULL,
    completed_at DATE,
    report_document_id UUID REFERENCES documents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M1.14
CREATE TABLE security_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID REFERENCES security_audit_log(id) ON DELETE CASCADE NOT NULL,
    severity security_finding_severity NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    affected_component TEXT,
    status security_finding_status DEFAULT 'open',
    remediation_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_security_findings_open_critical ON security_findings(severity)
    WHERE status = 'open' AND severity IN ('high','critical');

COMMENT ON TABLE security_findings IS
'M1 GATE PODMÍNKA: žádný finding se severity critical nebo high smí být ve stavu open
v okamžiku prvního ostrého nasazení. accepted_risk je povolen jen s podpisem odpovědné
osoby zaznamenaným v remediation_notes.';


-- ============================================================================
-- V8 DODATEK 7: PRÁVNÍ A SMLUVNÍ VRSTVA — MILESTONE M4.3
-- ============================================================================

CREATE TYPE legal_agreement_type AS ENUM ('sla', 'dpa_gdpr', 'terms_of_service', 'data_processing');

-- MILESTONE: M4.3
-- Architektura PODPÍRÁ smluvní závazky (multi-tenancy izolace, audit, export dat),
-- ale toto je evidence SAMOTNÝCH smluv mezi provozovatelem a DO - ne vynucovací mechanismus.
CREATE TABLE organization_legal_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    agreement_type legal_agreement_type NOT NULL,
    version TEXT NOT NULL,
    document_id UUID REFERENCES documents(id),
    signed_at TIMESTAMP WITH TIME ZONE,
    signed_by_name TEXT,
    sla_uptime_percentage NUMERIC(5,2),   -- pro typ 'sla', např. 99.5
    sla_rto_minutes INT,                   -- pro typ 'sla', odkaz na disaster_recovery_runbooks
    valid_from DATE NOT NULL,
    valid_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ============================================================================
-- V8 DODATEK 8: IMPORT WIZARD Z KONKURENČNÍCH SYSTÉMŮ — MILESTONE M5.7
-- ============================================================================

CREATE TYPE import_job_status AS ENUM ('uploaded', 'mapping', 'validating', 'importing', 'completed', 'failed');

-- MILESTONE: M5.7
CREATE TABLE import_mapping_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_system_name TEXT NOT NULL,  -- 'Excel obecný', 'Konkurenční CRM X'
    field_mapping JSONB NOT NULL,       -- mapování zdrojových sloupců na cílová pole persons/households
    is_system_template BOOLEAN DEFAULT TRUE -- TRUE = nabízeno všem, FALSE = vytvořeno konkrétní DO
);

-- MILESTONE: M5.7
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    mapping_template_id UUID REFERENCES import_mapping_templates(id),
    source_file_document_id UUID REFERENCES documents(id) NOT NULL,
    status import_job_status DEFAULT 'uploaded',
    total_rows INT,
    processed_rows INT DEFAULT 0,
    error_rows INT DEFAULT 0,
    error_details JSONB,
    initiated_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);


-- ============================================================================
-- V8 DODATEK 9: SANDBOX/DEMO PROSTŘEDÍ — MILESTONE M5.6
-- ============================================================================

-- MILESTONE: M5.6
ALTER TABLE organizations ADD COLUMN is_sandbox BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN sandbox_reset_interval_hours INT DEFAULT 24;
ALTER TABLE organizations ADD COLUMN sandbox_last_reset_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN organizations.is_sandbox IS
'Sandbox organizace mají vlastní organization_id (plná multi-tenant izolace platí),
ale CRON periodicky (dle sandbox_reset_interval_hours) obnoví jejich data na fixní
demo sadu. Zájemce o systém si může vyzkoušet plně funkční instanci bez rizika pro
reálná citlivá data a bez nutnosti čekat na 7denní trial nad vlastními daty.';


-- ============================================================================
-- V8 DODATEK 10: PROMPT VERZOVÁNÍ A A/B TESTOVÁNÍ — MILESTONE M6.6
-- ============================================================================

-- MILESTONE: M6.6
CREATE TABLE ai_prompt_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL = globální systémový prompt
    prompt_key TEXT NOT NULL,           -- 'visit_log_summarizer', 'court_report_synthesizer'
    version_number INT NOT NULL,
    prompt_text TEXT NOT NULL,
    model_target TEXT,                  -- 'gemini-1.5-pro', 'gpt-4o' - pro jaký model je laděný
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    created_by UUID REFERENCES profiles(id),
    change_notes TEXT,
    UNIQUE(organization_id, prompt_key, version_number)
);

ALTER TABLE ai_assistant_profiles ADD CONSTRAINT fk_ai_assistant_prompt_version
    FOREIGN KEY (active_prompt_version_id) REFERENCES ai_prompt_versions(id);

-- MILESTONE: M6.6
CREATE TABLE ai_prompt_ab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_key TEXT NOT NULL,
    version_a_id UUID REFERENCES ai_prompt_versions(id) NOT NULL,
    version_b_id UUID REFERENCES ai_prompt_versions(id) NOT NULL,
    traffic_split_pct INT DEFAULT 50,   -- % požadavků jdoucí na verzi B
    quality_metric TEXT,                -- 'user_approval_rate', 'edit_distance_after_human_review'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    winner_version_id UUID REFERENCES ai_prompt_versions(id)
);

COMMENT ON TABLE ai_prompt_versions IS
'Stejný princip jako template_versions (M2.6) nebo system_parameters - prompty se MĖNÍ
v čase a stará verze musí zůstat dohledatelná, aby šlo zpětně vysvětlit, proč AI v
určitý den odpověděla určitým způsobem (návaznost na ai_interaction_logs z M6.4).';


-- ============================================================================
-- V8 DODATEK 11: ETICKÝ AUDIT AI ROZHODOVÁNÍ — MILESTONE M6.8
-- ============================================================================

-- MILESTONE: M6.8
-- Aplikuje se na JAKÉKOLIV budoucí AI rozhodnutí s dopadem na hodnocení rodiny/dítěte
-- (např. budoucí "Machine Learning: Detekce rizik" zmíněné jako V2.0 nápad v historických
-- verzích Blueprintu). Princip: žádné algoritmické hodnocení rizika nesmí být "černá skříňka".
CREATE TABLE ai_decision_explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    decision_type TEXT NOT NULL,        -- 'risk_flag_household', 'workload_recommendation'
    household_id UUID REFERENCES households(id),
    person_id UUID REFERENCES persons(id),
    decision_summary TEXT NOT NULL,     -- lidsky čitelné shrnutí "proč AI takto rozhodla"
    contributing_factors JSONB NOT NULL, -- strukturovaný seznam faktorů a jejich váhy
    model_version TEXT NOT NULL,
    confidence_score NUMERIC(4,3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M6.8
-- Právo KO/rodiny zpochybnit algoritmické rozhodnutí - musí existovat formální cesta,
-- ne jen "smazat upozornění a jít dál".
CREATE TABLE ai_decision_disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    explanation_id UUID REFERENCES ai_decision_explanations(id) NOT NULL,
    disputed_by UUID REFERENCES profiles(id) NOT NULL,
    dispute_reason TEXT NOT NULL,
    reviewed_by UUID REFERENCES profiles(id),
    review_outcome TEXT CHECK (review_outcome IN ('upheld','overturned','partially_revised')),
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE ai_decision_explanations IS
'M6.8 je princip a datová příprava, NE aktivace prediktivních AI modelů. Risk-scoring
AI samotná je vědomě mimo rozsah V8 (stejně jako byla mimo rozsah všech předchozích
verzí) - tato tabulka zajišťuje, že POKUD se v budoucnu implementuje, bude od prvního
dne transparentní a zpochybnitelná, ne dodatečně nalepená.';


-- ============================================================================
-- V8 DODATEK 12: PRODUKTOVÁ ANALYTIKA (GOOGLE ANALYTICS A EKVIVALENTY) — MILESTONE M7.5
-- Nová kapitola dle explicitního požadavku: dvouúrovňové měření - globální (provozovatel
-- sleduje používání produktu napříč všemi DO) a per-DO (jednotlivá DO sleduje vlastní data).
-- ============================================================================

CREATE TYPE analytics_provider_key AS ENUM ('google_analytics', 'plausible', 'matomo', 'internal_only');
CREATE TYPE analytics_visibility_level AS ENUM ('global_operator', 'organization_owner', 'branch_manager', 'individual_ko');

-- MILESTONE: M7.5
-- Provider-agnostic stejně jako storage/calendar/auth/AI - GA je VOLBA, ne závislost.
-- 'internal_only' znamená vlastní lehké event tracking bez externí služby (pro DO,
-- co chtějí "absolutní svobodu" i v měření, viz V8 kapitola o provider abstrakci).
CREATE TABLE analytics_provider_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL = globální konfigurace provozovatele
    provider analytics_provider_key NOT NULL DEFAULT 'internal_only',
    tracking_id TEXT,                   -- GA Measurement ID, Plausible domain, atd.
    is_active BOOLEAN DEFAULT TRUE,
    consent_required BOOLEAN DEFAULT TRUE, -- cookie/tracking consent banner nutný?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M7.5
-- Vlastní interní event log - funguje VŽDY (i při provider='internal_only'), externí
-- GA/Plausible/Matomo je navíc, ne náhrada. Tím je zajištěno, že provozovatel i DO mají
-- vlastní data nezávislá na výpadku/zrušení externí analytické služby.
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL pro anonymní/marketingové stránky
    user_id UUID REFERENCES profiles(id),
    event_name TEXT NOT NULL,           -- 'page_view', 'event_created', 'payment_approved'
    event_category TEXT,                -- 'engagement','feature_usage','conversion'
    properties JSONB DEFAULT '{}'::jsonb,
    session_id TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_analytics_events_org_time ON analytics_events(organization_id, occurred_at DESC);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);

COMMENT ON TABLE analytics_events IS
'DVOUÚROVŇOVÉ POUŽITÍ:
1. GLOBÁLNÍ (provozovatel, analytics_visibility_level=global_operator): agregovaná
   anonymizovaná data napříč VŠEMI organizacemi pro produktová rozhodnutí (která
   funkce se používá nejvíc, kde uživatelé "zamrznou" ve flow).
2. PER-DO (organization_owner/branch_manager/individual_ko): organizace vidí JEN
   svoje vlastní eventy (RLS), využívá je pro vlastní provozní vhled (kolik KO
   používá AI záznamník, jak často se generují reporty) - NE pro srovnání s jinými DO,
   to řeší samostatně anonymizovaný benchmarking z M7.4.';

-- RLS politika pro analytics_events - aplikuje se přes obecnou šablonu z části 8,
-- toto je DOPLŇKOVÉ zpřísnění pro úroveň individual_ko
CREATE POLICY "analytics_individual_ko_own_events_only" ON analytics_events FOR SELECT
USING (
    user_id = auth.uid()
    OR has_permission('admin.view_audit_logs')
    OR is_system_operator()
);


-- ============================================================================
-- V8 DODATEK 13: VEŘEJNÉ API PRO EXTERNÍ SYSTÉMY — MILESTONE M9.1-M9.3
-- ============================================================================

CREATE TYPE api_key_scope AS ENUM (
    'read_households', 'read_persons', 'read_events', 'write_events',
    'read_documents', 'write_documents', 'webhook_subscribe'
);

-- MILESTONE: M9.2
CREATE TABLE external_api_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    client_name TEXT NOT NULL,          -- 'OSPOD Teplice integrace'
    api_key_hash TEXT NOT NULL UNIQUE,
    allowed_scopes api_key_scope[] NOT NULL,
    rate_limit_per_minute INT DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- MILESTONE: M9.1
-- Verzování veřejného API kontraktu - NEZÁVISLÉ na verzování interního /api/ z M1.
CREATE TABLE public_api_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_tag TEXT NOT NULL UNIQUE,   -- 'v1', 'v2'
    openapi_spec_document_id UUID REFERENCES documents(id),
    status TEXT CHECK (status IN ('active','deprecated','sunset')) DEFAULT 'active',
    deprecated_at DATE,
    sunset_at DATE,                     -- po tomto datu verze přestane fungovat
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M9.3
CREATE TABLE webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    api_client_id UUID REFERENCES external_api_clients(id) NOT NULL,
    event_type TEXT NOT NULL,           -- 'crisis_case.created', 'court_decision.effective'
    target_url TEXT NOT NULL,
    secret_hash TEXT NOT NULL,          -- pro HMAC signature payloadu
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE webhook_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES webhook_subscriptions(id) ON DELETE CASCADE NOT NULL,
    payload JSONB NOT NULL,
    http_status_code INT,
    attempt_count INT DEFAULT 1,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE external_api_clients IS
'M9 GATE: toto API se aktivuje AŽ po stabilizaci M1-M8 v produkci. Scope-based oprávnění
(api_key_scope) je VLASTNÍ vrstva nezávislá na interním RBAC (permissions/roles z M1) -
externí systém nikdy nedostává široký interní permission_code, jen úzce vymezený scope.';


-- ============================================================================
-- V8 DODATEK 14: BANKOVNÍ PSD2/MULTIBANKING ŽIVÉ API — MILESTONE M9.5
-- Nahrazuje/rozšiřuje manuální import z M3.7 (bank_statements/bank_transactions
-- ZŮSTÁVAJÍ - živé API je DALŠÍ zdroj plnění stejných tabulek, ne náhrada).
-- ============================================================================

-- MILESTONE: M4.3 (feature flag definován dříve, aktivace funkce až M9.5)
ALTER TABLE organization_subscriptions ADD COLUMN feature_bank_import_allowed BOOLEAN DEFAULT FALSE;
ALTER TABLE organization_subscriptions ADD COLUMN feature_bank_live_api_allowed BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN organization_subscriptions.feature_bank_import_allowed IS
'M3.7: manuální import výpisu (ABO/GPC) + AI heuristické párování. Dostupné od tier_3_ultra.';
COMMENT ON COLUMN organization_subscriptions.feature_bank_live_api_allowed IS
'M9.5: živé PSD2 napojení na účet. Dostupné JEN tier_custom - nejvyšší úroveň, vyžaduje
dodatečnou smluvní vrstvu (organization_legal_agreements) kvůli citlivosti přímého
přístupu k bankovnímu účtu DO.';

-- MILESTONE: M9.5
CREATE TABLE bank_psd2_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    bank_name TEXT NOT NULL,
    aggregator_provider TEXT NOT NULL,  -- 'salt_edge', 'tink', nebo přímé API konkrétní banky
    consent_id TEXT NOT NULL,           -- ID souhlasu uděleného přes banku (PSD2 AISP consent)
    consent_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    account_iban_masked TEXT,           -- jen poslední 4 znaky viditelné
    is_active BOOLEAN DEFAULT TRUE,
    connected_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rozšíření bank_transactions o zdroj (manuální import vs. živé API)
ALTER TABLE bank_transactions ADD COLUMN source_connection_id UUID REFERENCES bank_psd2_connections(id);
ALTER TABLE bank_transactions ADD COLUMN ingestion_method TEXT DEFAULT 'manual_import'
    CHECK (ingestion_method IN ('manual_import', 'psd2_live_api'));

COMMENT ON TABLE bank_psd2_connections IS
'M9.5 je explicitně AŽ PO ověření M3 manuálního importu v produkci. Konsent PSD2 má
omezenou platnost (typicky 90 dní dle PSD2 RTS) a vyžaduje periodickou reautorizaci -
to je provozní zátěž, kterou nemá smysl řešit, dokud základní finanční modul neběží
stabilně. ingestion_method na bank_transactions umožňuje obě cesty plnit STEJNOU
cílovou tabulku, takže párovací logika z M3.7 se nemusí měnit.';


-- ============================================================================
-- V8 DODATEK 15: HLOUBKOVÝ WHITELABELING — MILESTONE M5.5
-- Rozšiřuje V6 organizations.brand_colors na plnohodnotný template systém.
-- ============================================================================

-- MILESTONE: M5.5
CREATE TABLE organization_theme_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE NOT NULL,
    -- Barvy zůstávají jako v organizations.brand_colors (V6), zde jsou DOPLŇKOVÉ vrstvy:
    font_family TEXT DEFAULT 'Inter',           -- 'Inter', 'Roboto', vlastní webfont URL
    custom_font_url TEXT,                        -- pokud font_family = 'custom'
    layout_template_key TEXT DEFAULT 'default',  -- 'default', 'compact', 'high_contrast'
    custom_css TEXT,                              -- pokročilá volba, jen pro tier_3_ultra/custom
    favicon_url TEXT,
    email_template_header_html TEXT,             -- vlastní hlavička pro e-mailové notifikace
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE organization_theme_config IS
'M5.5 aktivuje UI pro toto nastaveni. Tabulka i prazdne vychozi radky existuji od M4.4
(basic whitelabel), ale font_family / layout_template_key / custom_css pole jsou
nepouzita - default hodnoty - az do M5.5. custom_css musi prochazet sanitizaci: zadne
script tagy, zadny import na externi domeny mimo allowlist. Bezpecnostni review povinny
pred M5.5 GA.';

-- MILESTONE: M10.2 — PLUGIN/EXTENSION ARCHITEKTURA
CREATE TYPE plugin_status AS ENUM ('installed', 'active', 'disabled', 'incompatible');

CREATE TABLE installed_plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- NULL = systémový plugin pro všechny
    plugin_key TEXT NOT NULL,           -- unikátní identifikátor pluginu
    plugin_version TEXT NOT NULL,
    status plugin_status DEFAULT 'installed',
    -- Pluginy nesmi mit primy pristup k jadrovym tabulkam. Komunikuji bud pres
    -- definovane extension_points nize, nebo pres verejne API z M9 se scope omezenim.
    config JSONB DEFAULT '{}'::jsonb,
    installed_by UUID REFERENCES profiles(id),
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MILESTONE: M10.2
-- Definované body v aplikaci, kam se plugin může "zaháknout", BEZ úpravy jádrového kódu.
-- Analogie: WordPress hooks/filters, ale pro tento systém.
CREATE TABLE extension_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    point_key TEXT NOT NULL UNIQUE,      -- 'after_event_created', 'before_payment_approval', 'custom_report_tab'
    description TEXT NOT NULL,
    payload_schema JSONB NOT NULL        -- co plugin obdrží jako vstup
);

CREATE TABLE plugin_extension_registrations (
    plugin_id UUID REFERENCES installed_plugins(id) ON DELETE CASCADE,
    extension_point_id UUID REFERENCES extension_points(id) ON DELETE CASCADE,
    handler_config JSONB NOT NULL,       -- webhook URL nebo interní handler reference
    priority INT DEFAULT 100,
    PRIMARY KEY (plugin_id, extension_point_id)
);

COMMENT ON TABLE extension_points IS
'M10.2 GATE: existuje POUZE konečná, dokumentovaná sada extension_points (analogie
WordPress hooks). Plugin nikdy nedostává syrový databázový přístup ani schopnost
měnit schéma. Toto je architektonická pojistka pro 20letou životnost - nové požadavky
DO (bod 4 ze zadání) se řeší novým pluginem na existujícím extension_point, nebo
návrhem NOVÉHO extension_point (formální proces, ne ad-hoc zásah do jádra).';

-- MILESTONE: M10.3 — DEPRECATION POLITIKA
CREATE TYPE deprecation_target_type AS ENUM ('column', 'table', 'api_endpoint', 'enum_value');

CREATE TABLE deprecation_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type deprecation_target_type NOT NULL,
    target_identifier TEXT NOT NULL,     -- 'payment_documents.legacy_field' nebo '/v1/households'
    deprecated_in_version TEXT NOT NULL, -- 'M9.1', 'schema_v8.3'
    reason TEXT NOT NULL,
    replacement TEXT,                     -- čím se to nahrazuje
    sunset_date DATE NOT NULL,           -- min. 2 major verze/milníky od deprecated_in_version
    is_removed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE deprecation_registry IS
'PRAVIDLO: žádné pole/tabulka/endpoint se nesmí smazat bez záznamu zde s sunset_date
minimálně 2 milníky v budoucnosti. Toto je formální proces z M10.3 nahrazující tiché
mazání, které by za 20 let vedlo k nedohledatelným breaking changes pro existující
integrace (veřejné API z M9) i interní kód.';



-- ----------------------------------------------------------------------------
-- ZPĚTNÉ DOPLNĖNÍ FK (V8) — vazby deklarované dříve jako "holé" UUID,
-- protože cílová tabulka organization_integration_settings vznikla později v pořadí.
-- ----------------------------------------------------------------------------
ALTER TABLE documents ADD CONSTRAINT fk_documents_storage_integration
    FOREIGN KEY (storage_integration_setting_id) REFERENCES organization_integration_settings(id);

ALTER TABLE ai_assistant_profiles ADD CONSTRAINT fk_ai_assistant_integration
    FOREIGN KEY (ai_integration_setting_id) REFERENCES organization_integration_settings(id);


-- ============================================================================
-- ČÁST 7: AUDIT TRIGGERY (aplikovány AŽ NA KONCI, po vytvoření všech tabulek)
-- ============================================================================

CREATE TRIGGER audit_households AFTER INSERT OR UPDATE OR DELETE ON households FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_persons AFTER INSERT OR UPDATE OR DELETE ON persons FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_person_relationships AFTER INSERT OR UPDATE OR DELETE ON person_relationships FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_agreements AFTER INSERT OR UPDATE OR DELETE ON agreements FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_events AFTER INSERT OR UPDATE OR DELETE ON events FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_event_definitions AFTER INSERT OR UPDATE OR DELETE ON event_definitions FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_documents AFTER INSERT OR UPDATE OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_court_cases AFTER INSERT OR UPDATE OR DELETE ON court_cases FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_court_hearings AFTER INSERT OR UPDATE OR DELETE ON court_hearings FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_court_decisions AFTER INSERT OR UPDATE OR DELETE ON court_decisions FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_contact_plans AFTER INSERT OR UPDATE OR DELETE ON contact_plans FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_contact_schedules AFTER INSERT OR UPDATE OR DELETE ON contact_schedules FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_contact_supervisions AFTER INSERT OR UPDATE OR DELETE ON contact_supervisions FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_crisis_cases AFTER INSERT OR UPDATE OR DELETE ON crisis_cases FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_crisis_actions AFTER INSERT OR UPDATE OR DELETE ON crisis_actions FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_crisis_resolutions AFTER INSERT OR UPDATE OR DELETE ON crisis_resolutions FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON tasks FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_task_assignments AFTER INSERT OR UPDATE OR DELETE ON task_assignments FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_task_comments AFTER INSERT OR UPDATE OR DELETE ON task_comments FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_supervisions AFTER INSERT OR UPDATE OR DELETE ON supervisions FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_supervision_notes AFTER INSERT OR UPDATE OR DELETE ON supervision_notes FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_supervision_recommendations AFTER INSERT OR UPDATE OR DELETE ON supervision_recommendations FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_education_records AFTER INSERT OR UPDATE OR DELETE ON education_records FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_document_templates AFTER INSERT OR UPDATE OR DELETE ON document_templates FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_template_versions AFTER INSERT OR UPDATE OR DELETE ON template_versions FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_providers AFTER INSERT OR UPDATE OR DELETE ON providers FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_payment_documents AFTER INSERT OR UPDATE OR DELETE ON payment_documents FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_payment_document_items AFTER INSERT OR UPDATE OR DELETE ON payment_document_items FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_approval_workflows AFTER INSERT OR UPDATE OR DELETE ON approval_workflows FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_approval_steps AFTER INSERT OR UPDATE OR DELETE ON approval_steps FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_document_approvals AFTER INSERT OR UPDATE OR DELETE ON document_approvals FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_bank_statements AFTER INSERT OR UPDATE OR DELETE ON bank_statements FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_bank_transactions AFTER INSERT OR UPDATE OR DELETE ON bank_transactions FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_export_templates AFTER INSERT OR UPDATE OR DELETE ON export_templates FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_accountant_access_tokens AFTER INSERT OR UPDATE OR DELETE ON accountant_access_tokens FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_legal_frameworks AFTER INSERT OR UPDATE OR DELETE ON legal_frameworks FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_client_requests AFTER INSERT OR UPDATE OR DELETE ON client_requests FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_case_transfers AFTER INSERT OR UPDATE OR DELETE ON case_transfers FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON roles FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON user_roles FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_organization_branches AFTER INSERT OR UPDATE OR DELETE ON organization_branches FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_organization_subscriptions AFTER INSERT OR UPDATE OR DELETE ON organization_subscriptions FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_event_definitions_v2 AFTER INSERT OR UPDATE OR DELETE ON event_definitions FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- POZNÁMKA: ai_interaction_logs a ai_bi_query_logs jsou NAMÁTKOU vyloučeny —
-- jsou to už samy o sobě append-only logy, audit trigger na logu by byl nadbytečný.
-- supervision_notes.is_private = TRUE záznamy SE TAKÉ auditují (kvůli NÚKIB), ale
-- RLS politika (níže) zajišťuje, že obsah vidí jen autor a ředitel.



-- ----------------------------------------------------------------------------
-- AUDIT TRIGGERY PRO V8 NOVÉ TABULKY
-- ----------------------------------------------------------------------------
CREATE TRIGGER audit_integration_providers AFTER INSERT OR UPDATE OR DELETE ON integration_providers FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_org_integration_settings AFTER INSERT OR UPDATE OR DELETE ON organization_integration_settings FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_disaster_recovery_runbooks AFTER INSERT OR UPDATE OR DELETE ON disaster_recovery_runbooks FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_backup_restore_tests AFTER INSERT OR UPDATE OR DELETE ON backup_restore_tests FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_data_export_requests AFTER INSERT OR UPDATE OR DELETE ON data_export_requests FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_security_audit_log AFTER INSERT OR UPDATE OR DELETE ON security_audit_log FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_security_findings AFTER INSERT OR UPDATE OR DELETE ON security_findings FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_org_legal_agreements AFTER INSERT OR UPDATE OR DELETE ON organization_legal_agreements FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_import_jobs AFTER INSERT OR UPDATE OR DELETE ON import_jobs FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_ai_prompt_versions AFTER INSERT OR UPDATE OR DELETE ON ai_prompt_versions FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_ai_decision_explanations AFTER INSERT OR UPDATE OR DELETE ON ai_decision_explanations FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_ai_decision_disputes AFTER INSERT OR UPDATE OR DELETE ON ai_decision_disputes FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_analytics_provider_config AFTER INSERT OR UPDATE OR DELETE ON analytics_provider_config FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_external_api_clients AFTER INSERT OR UPDATE OR DELETE ON external_api_clients FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_webhook_subscriptions AFTER INSERT OR UPDATE OR DELETE ON webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_bank_psd2_connections AFTER INSERT OR UPDATE OR DELETE ON bank_psd2_connections FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_organization_theme_config AFTER INSERT OR UPDATE OR DELETE ON organization_theme_config FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_installed_plugins AFTER INSERT OR UPDATE OR DELETE ON installed_plugins FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_deprecation_registry AFTER INSERT OR UPDATE OR DELETE ON deprecation_registry FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- POZNÁMKA: error_logs, performance_metrics, analytics_events, ai_bi_query_logs a
-- webhook_delivery_logs jsou VĖDOMĖ vyloučeny z auditu - jsou to již samy o sobě
-- vysokofrekvenční append-only logy; audit trigger nad logem by zdvojoval zápisy
-- bez přínosu (stejný princip jako u ai_interaction_logs z V6).


-- ============================================================================
-- ČÁST 8: ROW LEVEL SECURITY — aktivace a politiky
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 8.1 Obecná šablona multi-tenant izolace (aplikována na všechny tabulky
-- s přímým sloupcem organization_id)
-- ----------------------------------------------------------------------------

-- Aktivace RLS na všech tabulkách s organization_id
DO $$
DECLARE tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'organization_id' AND table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format(
            'CREATE POLICY "tenant_isolation_%I" ON %I FOR ALL USING (organization_id = current_user_org_id() OR is_system_operator())',
            tbl, tbl
        );
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 8.2 Specifické politiky NAD obecnou šablonou (Need-to-Know zpřísnění)
-- ----------------------------------------------------------------------------

-- Klíčová osoba vidí jen přidělené rodiny (zpřísnění nad tenant izolací)
CREATE POLICY "ko_sees_only_assigned_households" ON households FOR SELECT
USING (
    assigned_ko_id = auth.uid()
    OR has_permission('cases.view_all')
    OR is_system_operator()
);

-- Ekonomka NEVIDÍ textové zápisy z events (severity payload), pokud nemá cases.view_all
-- (implementováno na úrovni APLIKACE přes sloupcový výběr, RLS na celé řádky by
-- ekonomce zablokovala i agregovaná finanční čísla, která vidět MÁ)
COMMENT ON TABLE events IS 'Ekonomka cte agregovana data pres ai_bi_finance_view, NE primo tuto tabulku - viz aplikacni vrstva.';

-- Supervizní poznámky: jen autor nebo ředitel
CREATE POLICY "supervision_notes_private" ON supervision_notes FOR SELECT
USING (
    author_id = auth.uid()
    OR (is_private = FALSE)
    OR has_permission('admin.view_audit_logs')
);

-- Pěstoun v Klientské zóně: vidí jen vlastní household/person
CREATE POLICY "foster_parent_own_household_only" ON households FOR SELECT
USING (
    id IN (
        SELECT household_id FROM household_members hm
        JOIN persons p ON hm.person_id = p.id
        WHERE p.id = (SELECT id FROM persons WHERE organization_id = current_user_org_id() LIMIT 1)
    )
    OR assigned_ko_id = auth.uid()
    OR has_permission('cases.view_all')
    OR is_system_operator()
);
-- POZNÁMKA PRO IMPLEMENTACI: vazba mezi auth.uid() (profiles) a konkrétním persons
-- záznamem pěstouna musí být doplněna (např. persons.linked_profile_id), pokud
-- pěstoun má přístup do Klientské zóny. V této verzi schématu chybí explicitní
-- sloupec persons.linked_profile_id - DOPLNIT před implementací Fáze 4 (Klientská zóna).

-- AI BI pohledy dědí RLS ze zdrojových tabulek automaticky (views v PostgreSQL
-- respektují RLS podkladových tabulek pod security_invoker, pokud je view
-- vytvořen jako SECURITY INVOKER, což je PostgreSQL výchozí chování od verze 15)

-- Vzdělávání: pěstoun smí vkládat vlastní certifikáty, ale jen jako planned/completed
CREATE POLICY "foster_parent_insert_own_education" ON education_records FOR INSERT
WITH CHECK (
    auth.uid() = foster_parent_id
    AND status IN ('planned', 'completed')
);

CREATE POLICY "foster_parent_view_own_education" ON education_records FOR SELECT
USING (
    auth.uid() = foster_parent_id
    OR has_permission('cases.view_all')
);
-- ============================================================================
-- V8 DODATEK 16: RLS POLITIKY PRO NOVÉ V8 TABULKY
-- (obecná multi-tenant šablona z V6 části 8.1 se aplikuje automaticky na vše
-- s organization_id - toto jsou DOPLŇKOVÉ/SPECIFICKÉ politiky nad ní)
-- ============================================================================

-- integration_providers je GLOBÁLNÍ číselník (bez organization_id) - čtení povoleno všem
ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integration_providers_read_all" ON integration_providers FOR SELECT USING (TRUE);
CREATE POLICY "integration_providers_write_system_only" ON integration_providers FOR ALL
    USING (is_system_operator());

-- Pouze admin.manage_branding nebo admin.manage_subscription smí měnit integrační nastavení
CREATE POLICY "org_integration_settings_write_restricted" ON organization_integration_settings FOR UPDATE
    USING (has_permission('admin.manage_branding') OR has_permission('admin.manage_subscription'));

-- security_findings: jen admin.view_audit_logs (citlivé - obsahuje zranitelnosti)
ALTER TABLE security_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_findings_restricted" ON security_findings FOR SELECT
    USING (has_permission('admin.view_audit_logs') OR is_system_operator());

-- external_api_clients a api_key_hash: NIKDY se nevrací přes běžné SELECT v API vrstvě,
-- pouze server-side ověření. RLS samotné nestačí - musí to být i v aplikační vrstvě.
ALTER TABLE external_api_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "external_api_clients_admin_only" ON external_api_clients FOR ALL
    USING (has_permission('admin.manage_users') OR is_system_operator());

-- ai_decision_disputes: KO i rodina (přes Klientskou zónu) musí moci podat spor
CREATE POLICY "ai_decision_disputes_can_create" ON ai_decision_disputes FOR INSERT
    WITH CHECK (disputed_by = auth.uid());

-- global_statistics_daily: čtení jen pro is_system_operator, NIKDY pro běžnou DO
-- (na rozdíl od organization_statistics_daily, které čte vlastní organizace)
ALTER TABLE global_statistics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "global_statistics_operator_only" ON global_statistics_daily FOR SELECT
    USING (is_system_operator());

COMMENT ON POLICY "global_statistics_operator_only" ON global_statistics_daily IS
'KRITICKÉ: toto je technická pojistka principu z M7.4 - žádná DO nesmí vidět agregovaná
data jiných DO mimo anonymizovaný benchmarking (ten běží přes samostatnou funkci s
explicitním maskováním ID organizací, ne přímým SELECT nad touto tabulkou).';
