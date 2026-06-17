-- Supabase Migration: Fáze 1 - Jádro systému (MVP)
-- Cesta: moje_doprovazeni_com/supabase/migrations/20260617000000_phase1_core.sql

-- Povolení UUID generátoru (pokud již není aktivní)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABULKY STRUKTURY A MULTI-TENANCY
-- ==========================================

-- Organizace (Doprovázející organizace)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#4f46e5', -- default Indigo
    secondary_color TEXT DEFAULT '#0f172a', -- default Slate-900
    subscription_tier TEXT NOT NULL DEFAULT 'free', -- free, basic, pro, ultra, custom
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pobočky organizací (pokud má DO více poboček)
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Profily uživatelů (sociální pracovníci / KO, ředitelé, ekonomové)
-- Propojeno s interní tabulkou auth.users ze Supabase
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL DEFAULT 'worker', -- superadmin, admin, worker, accountant
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. DOMÁCNOSTI A EVIDOVANÉ OSOBY
-- ==========================================

-- Domácnosti pěstounů (hlavní spisy)
CREATE TABLE public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    assigned_ko_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Klíčová osoba
    foster_id TEXT NOT NULL, -- Čitelný identifikátor (např. FOST-2026-0042)
    status TEXT NOT NULL DEFAULT 'lead', -- lead, active, inactive, suspended
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Osoby (děti, pěstouni, biologičtí příbuzní, sociální kontakty)
CREATE TABLE public.persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- child, foster_parent, bio_parent, social_contact
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    middle_names TEXT, -- Druhé jméno
    birth_name TEXT, -- Rodné / minulé příjmení
    birth_number TEXT, -- Rodné číslo (citlivé!)
    birth_date DATE,
    citizenship TEXT[] DEFAULT '{}'::TEXT[], -- Pole občanství
    phone TEXT,
    email TEXT,
    social_media JSONB DEFAULT '{}'::jsonb NOT NULL, -- sociální sítě s historií (WhatsApp, atd.)
    gdpr_consent_signed BOOLEAN NOT NULL DEFAULT false,
    gdpr_consent_signed_date DATE,
    safety_rating TEXT NOT NULL DEFAULT 'N', -- A, B, C, D, E, F, N, X, Y, Z (Z = zákaz styku)
    custom_fields JSONB DEFAULT '{}'::jsonb NOT NULL, -- Ad-hoc Google Contacts-style pole
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. REGISTRY A HISTORIZOVANÁ DATA DÍTĚTE
-- ==========================================

-- Historie pobytů a adres dětí (a ostatních osob)
CREATE TABLE public.person_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- permanent, actual
    street TEXT,
    city TEXT,
    zip TEXT,
    floor_details TEXT, -- Patro, u někoho...
    from_date DATE NOT NULL,
    to_date DATE, -- NULL znamená aktuální adresa
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Historie škol a vzdělávání
CREATE TABLE public.person_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    school_name TEXT NOT NULL,
    grade TEXT, -- Ročník / třída
    from_date DATE NOT NULL,
    to_date DATE, -- NULL znamená aktuální škola
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fyziologické parametry dětí (pro růstové grafy)
CREATE TABLE public.person_physiological_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    height NUMERIC(5,2), -- Výška v cm
    weight NUMERIC(5,2), -- Váha v kg
    percentile NUMERIC(4,1), -- Růstový percentil
    recorded_at DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Doklady a úřední dokumenty
CREATE TABLE public.person_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- ID_CARD, PASSPORT, COURT_DECISION, GDPR_CONSENT
    document_number TEXT,
    issued_by TEXT,
    valid_until DATE,
    file_path TEXT, -- Cesta v Supabase Storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 4. ČASOVÁ OSA UDÁLOSTÍ (TIMELINE)
-- ==========================================

-- Události v rodinách (Záznamy z návštěv, OSPOD jednání, atd.)
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- regular_visit, court_hearing, school_report, crisis_event, phone_call, email
    title TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb NOT NULL, -- text, summary, AI vytěžená data
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 5. ROW-LEVEL SECURITY (RLS) A BEZPEČNOST
-- ==========================================

-- Povolení RLS na všech tabulkách
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_physiological_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 5.1. Pomocná funkce pro zjištění profilu aktuálně přihlášeného uživatele
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 5.2. RLS Politiky pro Organizace
CREATE POLICY "Uživatel vidí pouze svou vlastní organizaci" 
ON public.organizations
FOR SELECT 
USING (id = (public.get_my_profile()).organization_id);

-- 5.3. RLS Politiky pro Pobočky
CREATE POLICY "Uživatel vidí pouze pobočky své organizace" 
ON public.branches
FOR ALL 
USING (organization_id = (public.get_my_profile()).organization_id);

-- 5.4. RLS Politiky pro Profily
CREATE POLICY "Uživatelé vidí profily kolegů v téže organizaci" 
ON public.profiles
FOR SELECT 
USING (organization_id = (public.get_my_profile()).organization_id);

CREATE POLICY "SuperAdmin a Admin mohou spravovat profily" 
ON public.profiles
FOR ALL 
USING (
    organization_id = (public.get_my_profile()).organization_id 
    AND (public.get_my_profile()).role IN ('superadmin', 'admin')
);

-- 5.5. RLS Politiky pro Domácnosti (Households)
CREATE POLICY "Ředitel a Ekonomka vidí všechny domácnosti v organizaci"
ON public.households
FOR SELECT
USING (
    organization_id = (public.get_my_profile()).organization_id 
    AND (public.get_my_profile()).role IN ('superadmin', 'admin', 'accountant')
);

CREATE POLICY "Klíčová osoba (Worker) vidí pouze své přiřazené domácnosti"
ON public.households
FOR ALL
USING (
    organization_id = (public.get_my_profile()).organization_id 
    AND (
        (public.get_my_profile()).role IN ('superadmin', 'admin') 
        OR assigned_ko_id = auth.uid()
    )
);

-- 5.6. RLS Politiky pro Osoby (Persons)
CREATE POLICY "Přístup k osobám dle přiřazené domácnosti"
ON public.persons
FOR ALL
USING (
    organization_id = (public.get_my_profile()).organization_id
    AND (
        (public.get_my_profile()).role IN ('superadmin', 'admin')
        -- Worker vidí osoby pouze u jemu přiřazených domácností
        OR EXISTS (
            SELECT 1 FROM public.households h 
            WHERE h.id = public.persons.household_id 
            AND h.assigned_ko_id = auth.uid()
        )
    )
);

-- 5.7. RLS Politiky pro historii, dokumenty a fyziologická data
-- Všechny tabulky jsou vázané na osobu (person_id) a dědí její přístupová práva
CREATE POLICY "Přístup k adresám dle práv k osobě" ON public.person_addresses FOR ALL USING (
    EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id)
);

CREATE POLICY "Přístup k historii škol dle práv k osobě" ON public.person_education FOR ALL USING (
    EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id)
);

CREATE POLICY "Přístup k růstovým datům dle práv k osobě" ON public.person_physiological_metrics FOR ALL USING (
    EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id)
);

CREATE POLICY "Přístup k dokumentům dle práv k osobě" ON public.person_documents FOR ALL USING (
    EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id)
);

-- 5.8. RLS Politiky pro Časovou osu (Events)
CREATE POLICY "Přístup k událostem na časové ose"
ON public.events
FOR ALL
USING (
    organization_id = (public.get_my_profile()).organization_id
    AND (
        (public.get_my_profile()).role IN ('superadmin', 'admin')
        -- worker vidí události pouze pro své domácnosti
        OR EXISTS (
            SELECT 1 FROM public.households h 
            WHERE h.id = public.events.household_id 
            AND h.assigned_ko_id = auth.uid()
        )
    )
);
