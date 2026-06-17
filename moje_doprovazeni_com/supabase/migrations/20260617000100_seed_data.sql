-- Supabase Migration: Testovací data (Seed data)
-- Cesta: moje_doprovazeni_com/supabase/migrations/20260617000100_seed_data.sql

-- Vyčištění starých dat (pro jistotu před spuštěním seedu)
TRUNCATE public.person_physiological_metrics, public.person_documents, public.person_education, public.person_addresses, public.events, public.persons, public.households, public.profiles, public.branches, public.organizations CASCADE;

-- ==========================================
-- 1. ZALOŽENÍ TESTOVACÍ ORGANIZACE A POBOČKY
-- ==========================================

INSERT INTO public.organizations (id, name, slug, primary_color, secondary_color, subscription_tier)
VALUES (
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    'Doprovázení s.r.o.',
    'doprovazeni',
    '#6366f1', -- Indigo
    '#0f172a', -- Slate 900
    'pro'
);

INSERT INTO public.branches (id, organization_id, name, address)
VALUES (
    'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    'Pobočka Brno-město',
    'Údolní 250/5, 602 00 Brno'
);

-- ==========================================
-- 2. ZALOŽENÍ UŽIVATELSKÝCH PROFILŮ
-- ==========================================

-- Profil SuperAdmina (majitele)
INSERT INTO public.profiles (id, organization_id, branch_id, email, first_name, last_name, role, is_active)
VALUES (
    'f1520cd2-38d3-49fc-a40b-e6c4524983c8', -- Váš UID pro petr.homolka@gmail.com
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
    'petr.homolka@gmail.com',
    'Petr',
    'Homolka',
    'superadmin',
    true
);

-- Mgr. Anna Málková (Klíčová osoba / Worker)
INSERT INTO public.profiles (id, organization_id, branch_id, email, first_name, last_name, role, is_active)
VALUES (
    'aecbcd51-1ae6-48b3-b641-a5c639b46fe6', -- Váš UID pro test@doprovazeni.com
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
    'test@doprovazeni.com',
    'Test',
    'Pracovník',
    'worker',
    true
);

-- ==========================================
-- 3. ZALOŽENÍ DOMÁCNOSTÍ (SPISŮ)
-- ==========================================

-- Domácnost 1: Jan Novák (Brno) - aktivní doprovázení
INSERT INTO public.households (id, organization_id, branch_id, assigned_ko_id, foster_id, status, notes)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
    'aecbcd51-1ae6-48b3-b641-a5c639b46fe6', -- test@doprovazeni.com
    'FOST-2026-0001',
    'active',
    'Pěstounská rodina z Brna. Velmi dobrá spolupráce.'
);

-- Domácnost 2: Jan Novák (Hostomice #1) - aktivní doprovázení
INSERT INTO public.households (id, organization_id, branch_id, assigned_ko_id, foster_id, status, notes)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
    'aecbcd51-1ae6-48b3-b641-a5c639b46fe6', -- test@doprovazeni.com
    'FOST-2026-0002',
    'active',
    'Pěstoun Jan Novák z Hostomic (Školní 13). Doprovázen samostatně.'
);

-- Domácnost 3: Jan Novák (Hostomice #2 - stejná adresa, stejné jméno!)
INSERT INTO public.households (id, organization_id, branch_id, assigned_ko_id, foster_id, status, notes)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
    'aecbcd51-1ae6-48b3-b641-a5c639b46fe6', -- test@doprovazeni.com
    'FOST-2026-0003',
    'active',
    'Extrémní shoda jmen a adresy. V systému bude označen jako Jan Novák (2).'
);

-- ==========================================
-- 4. OSOBY A RODINNÉ VAZBY (Pěstouni, Děti, Bio rodina)
-- ==========================================

-- --- DOMÁCNOST 1 (Novák Brno) ---
-- Pěstoun: Jan Novák (Brno)
INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, is_active)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    '11111111-1111-1111-1111-111111111111',
    'foster_parent',
    'Jan',
    'Novák',
    '1982-05-15',
    '{"avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", "profession": "Stavební inženýr"}'::jsonb,
    true
);

-- Manželka pěstouna: Marie Nováková (pěstounská péče je psaná na Jana, ale manželku evidujeme)
INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, is_active)
VALUES (
    '10000000-0000-0000-0000-000000000002',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    '11111111-1111-1111-1111-111111111111',
    'social_contact', -- partner v domácnosti
    'Marie',
    'Nováková',
    '1985-08-20',
    '{"avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", "relationship_to_child": "Pěstounka (partnerka pěstouna)"}'::jsonb,
    true
);

-- Biologické dítě pěstouna: Petr Novák (10 let, žije v domácnosti)
INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, is_active)
VALUES (
    '10000000-0000-0000-0000-000000000003',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    '11111111-1111-1111-1111-111111111111',
    'social_contact', -- biologické dítě pěstouna
    'Petr',
    'Novák',
    '2016-04-12',
    '{"avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150", "relationship_to_child": "Biologický syn pěstounů"}'::jsonb,
    true
);

-- Dítě v pěstounské péči: Adéla Svobodová (8 let - jiné příjmení než pěstoun!)
INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, gdpr_consent_signed, safety_rating, is_active)
VALUES (
    '10000000-0000-0000-0000-000000000004',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    '11111111-1111-1111-1111-111111111111',
    'child',
    'Adéla',
    'Svobodová',
    '2018-09-30',
    '{"avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150", "hobby": "Výtvarný kroužek, keramika", "school": "ZŠ Úvoz Brno"}'::jsonb,
    true, -- GDPR souhlas podepsán
    'A',
    true
);

-- Dítě v pěstounské péči 2 (druhé dítě v rodině): Lukáš Černý (6 let - opět jiné příjmení)
INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, gdpr_consent_signed, safety_rating, is_active)
VALUES (
    '10000000-0000-0000-0000-000000000005',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    '11111111-1111-1111-1111-111111111111',
    'child',
    'Lukáš',
    'Černý',
    '2020-02-14',
    '{"avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150", "hobby": "Plavání, fotbal"}'::jsonb,
    true,
    'A',
    true
);


-- --- DOMÁCNOST 2 (Jan Novák Hostomice #1) ---
-- Pěstoun: Jan Novák (Hostomice #1)
INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, is_active)
VALUES (
    '20000000-0000-0000-0000-000000000001',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    '22222222-2222-2222-2222-222222222222',
    'foster_parent',
    'Jan',
    'Novák',
    '1978-11-22',
    '{"avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", "profession": "Řidič autobusu"}'::jsonb,
    true
);

-- Dítě v péči: Tomáš Dvořák (11 let - jiné příjmení)
INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, gdpr_consent_signed, safety_rating, is_active)
VALUES (
    '20000000-0000-0000-0000-000000000002',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    '22222222-2222-2222-2222-222222222222',
    'child',
    'Tomáš',
    'Dvořák',
    '2015-01-05',
    '{"avatar_url": "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150"}'::jsonb,
    true,
    'B',
    true
);

-- Biologická matka v karanténě (GDPR souhlas nepodepsán - telefon a data budou skryta)
INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_number, phone, gdpr_consent_signed, safety_rating, is_active)
VALUES (
    '20000000-0000-0000-0000-000000000003',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    '22222222-2222-2222-2222-222222222222',
    'bio_parent',
    'Veronika',
    'Dvořáková',
    '815214/1234',
    '+420721987654',
    false, -- Souhlas NEPODEPSÁN -> DATA MASKUJEME!
    'B',
    true
);


-- --- DOMÁCNOST 3 (Jan Novák Hostomice #2 - duplicitní jméno i adresa) ---
-- Pěstoun: Jan Novák (Hostomice #2)
INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, is_active)
VALUES (
    '30000000-0000-0000-0000-000000000001',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    '33333333-3333-3333-3333-333333333333',
    'foster_parent',
    'Jan',
    'Novák',
    '1991-03-04',
    '{"avatar_url": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150", "profession": "Učitel"}'::jsonb,
    true
);

-- Dítě v péči: Eliška Pokorná (9 let)
INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, gdpr_consent_signed, safety_rating, is_active)
VALUES (
    '30000000-0000-0000-0000-000000000002',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    '33333333-3333-3333-3333-333333333333',
    'child',
    'Eliška',
    'Pokorná',
    '2017-07-19',
    '{"avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150"}'::jsonb,
    true,
    'A',
    true
);

-- Biologický otec se ZÁKAZEM STYKU (Rating Z)
INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, gdpr_consent_signed, safety_rating, is_active)
VALUES (
    '30000000-0000-0000-0000-000000000003',
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    '33333333-3333-3333-3333-333333333333',
    'bio_parent',
    'Marek',
    'Pokorný',
    true,
    'Z', -- Zákaz styku!
    true
);


-- ==========================================
-- 5. ADRESY (Pro odlišení duplicitních jmen)
-- ==========================================

-- Jan Novák Brno
INSERT INTO public.person_addresses (person_id, type, street, city, zip, from_date)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    'actual',
    'Konečného náměstí 4',
    'Brno',
    '602 00',
    '2021-01-01'
);

-- Jan Novák Hostomice #1
INSERT INTO public.person_addresses (person_id, type, street, city, zip, from_date)
VALUES (
    '20000000-0000-0000-0000-000000000001',
    'actual',
    'Školní 13',
    'Hostomice',
    '267 24',
    '2018-05-01'
);

-- Jan Novák Hostomice #2 (Stejná adresa, stejné jméno!)
INSERT INTO public.person_addresses (person_id, type, street, city, zip, floor_details, from_date)
VALUES (
    '30000000-0000-0000-0000-000000000001',
    'actual',
    'Školní 13',
    'Hostomice',
    '267 24',
    'Byt č. 4 (2. patro)', -- Odlišení detailu adresy
    '2025-09-01'
);


-- ==========================================
-- 6. UDÁLOSTI A ČASOVÁ OSA
-- ==========================================

-- Událost u rodiny 1
INSERT INTO public.events (organization_id, household_id, author_id, type, title, payload, occurred_at)
VALUES (
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    '11111111-1111-1111-1111-111111111111',
    'aecbcd51-1ae6-48b3-b641-a5c639b46fe6', -- test@doprovazeni.com
    'regular_visit',
    'Pravidelná pololetní návštěva',
    '{"content": "Návštěva v rodině Novákových proběhla v poklidné atmosféře. Adéla i Lukáš vykazují stabilní chování, pěstouni spolupracují a plní všechny stanovené cíle rozvoje. Adéla se těší na prázdniny.", "summary": "Návštěva proběhla bez komplikací. Děti jsou v pořádku, pěstouni spolupracují."}'::jsonb,
    '2026-06-15 14:00:00+02'
);

-- Událost u rodiny 3 (Zákaz styku incident)
INSERT INTO public.events (organization_id, household_id, author_id, type, title, payload, occurred_at)
VALUES (
    'a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0',
    '33333333-3333-3333-3333-333333333333',
    'aecbcd51-1ae6-48b3-b641-a5c639b46fe6', -- test@doprovazeni.com
    'crisis_event',
    'Pokus o kontakt biologického otce',
    '{"content": "Biologický otec Marek Pokorný se pokusil kontaktovat Elišku před školou, což je v rozporu se soudním rozhodnutím o zákazu styku. Pěstoun Jan Novák okamžitě zasáhl a kontaktoval naši klíčovou osobu. Incident byl hlášen OSPOD.", "summary": "Biologický otec porušil zákaz styku. Hlášeno na OSPOD, situace je pod kontrolou."}'::jsonb,
    '2026-06-16 08:30:00+02'
);
