# -*- coding: utf-8 -*-
import random
import uuid
import json
from datetime import datetime, timedelta

# Seed for reproducibility
random.seed(42)

# Lists of names
MALE_NAMES = ["Jan", "Petr", "Tomáš", "Martin", "Jiří", "Jaroslav", "Pavel", "Miroslav", "František", "Josef", "Václav", "Michal", "David", "Jakub", "Lukáš", "Filip", "Ondřej", "Marek", "Aleš", "Radim"]
FEMALE_NAMES = ["Marie", "Jana", "Eva", "Hana", "Anna", "Lenka", "Kateřina", "Lucie", "Věra", "Alena", "Petra", "Veronika", "Martina", "Michaela", "Adéla", "Monika", "Tereza", "Barbora", "Kristýna", "Eliška"]

SURNAMES_MALE = ["Novák", "Svoboda", "Novotný", "Dvořák", "Černý", "Procházka", "Kučera", "Veselý", "Horák", "Němec", "Marek", "Pokorný", "Král", "Jelínek", "Růžička", "Beneš", "Fiala", "Sedláček", "Zeman", "Kolář"]
SURNAMES_FEMALE = ["Nováková", "Svobodová", "Novotná", "Dvořáková", "Černá", "Procházková", "Kučerová", "Veselá", "Horáková", "Němcová", "Marková", "Pokorná", "Králová", "Jelínková", "Růžičková", "Benešová", "Fialová", "Sedláčková", "Zemanová", "Kolářová"]

PROFESSIONS = ["Učitel/ka", "Řidič/ka", "Zdravotní sestra", "Stavební inženýr", "Účetní", "Kuchař/ka", "Prodavač/ka", "Podnikatel/ka", "IT specialista", "Sociální pracovník", "Zahradník", "Důchodce"]
HOBBIES = ["Fotbal", "Plavání", "Výtvarný kroužek", "Hra na klavír", "Keramika", "Skaut", "Florbal", "Taneční kroužek", "Čtení", "Cyklistika", "Šachy", "Modelářství"]
SCHOOLS = ["ZŠ Úvoz Brno", "ZŠ Merhautova Brno", "ZŠ Křídlovická Brno", "ZŠ Školní Hostomice", "ZŠ Nádražní Vyškov", "Gymnázium Elgartova Brno"]
CITIES = ["Brno", "Hostomice", "Vyškov", "Blansko", "Tišnov", "Kuřim", "Modřice", "Slavkov u Brna"]
STREETS = ["Školní", "Údolní", "Merhautova", "Pekařská", "Nádražní", "Husova", "Konečného náměstí", "Sportovní", "Zahradní", "Dlouhá"]

AVATARS_MALE = [
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
    "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150"
]

AVATARS_FEMALE = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
]

def gen_foster_id():
    # Evidenční číslo: FF-XXX-YYY (3 číslice, 3 písmena)
    conf_letters = "ABCDEFGHJKLMNPQRSTUVWXYZ" # Bez matoucích O, I
    digits = "".join(str(random.randint(0, 9)) for _ in range(3))
    letters = "".join(random.choice(conf_letters) for _ in range(3))
    return f"FF-{digits}-{letters}"

sql_statements = []

# Header TRUNCATE
sql_statements.append("-- Supabase Migration: Testovací data (Seed data - 20 domácností)")
sql_statements.append("-- Cesta: moje_doprovazeni_com/supabase/migrations/20260617000100_seed_data.sql\n")
sql_statements.append("TRUNCATE public.person_physiological_metrics, public.person_documents, public.person_education, public.person_addresses, public.events, public.persons, public.households, public.profiles, public.branches, public.organizations CASCADE;\n")

# 1. Organizace a Pobočka
sql_statements.append("-- ==========================================")
sql_statements.append("-- 1. ZALOŽENÍ TESTOVACÍ ORGANIZACE A POBOČKY")
sql_statements.append("-- ==========================================\n")

org_id = "a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0"
branch_id = "b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0"

sql_statements.append(f"""INSERT INTO public.organizations (id, name, slug, primary_color, secondary_color, subscription_tier)
VALUES ('{org_id}', 'Doprovázení s.r.o.', 'doprovazeni', '#6366f1', '#0f172a', 'pro');""")

sql_statements.append(f"""INSERT INTO public.branches (id, organization_id, name, address)
VALUES ('{branch_id}', '{org_id}', 'Pobočka Brno-město', 'Údolní 250/5, 602 00 Brno');\n""")

# 2. Profily uživatelů
sql_statements.append("-- ==========================================")
sql_statements.append("-- 2. ZALOŽENÍ UŽIVATELSKÝCH PROFILŮ")
sql_statements.append("-- ==========================================\n")

admin_uid = "f1520cd2-38d3-49fc-a40b-e6c4524983c8"
worker_uid = "aecbcd51-1ae6-48b3-b641-a5c639b46fe6"

sql_statements.append(f"""INSERT INTO public.profiles (id, organization_id, branch_id, email, first_name, last_name, role, is_active)
VALUES ('{admin_uid}', '{org_id}', '{branch_id}', 'petr.homolka@gmail.com', 'Petr', 'Homolka', 'superadmin', true);""")

sql_statements.append(f"""INSERT INTO public.profiles (id, organization_id, branch_id, email, first_name, last_name, role, is_active)
VALUES ('{worker_uid}', '{org_id}', '{branch_id}', 'test@doprovazeni.com', 'Test', 'Pracovník', 'worker', true);\n""")

# 3. Generování 20 domácností
sql_statements.append("-- ============# Duplicitní pěstouni, které vytvoříme explicitně
explicit_foster_parents = [
    # Jméno, Příjmení, Pohlaví, Město, Ulice, Číslo, Vztah, Typ péče
    ("Jan", "Novák", "M", "Brno", "Konečného náměstí", "4", None, "A"),
    ("Jan", "Novák", "M", "Hostomice", "Školní", "13", "dědeček", "C"),
    ("Petr", "Novák", "M", "Blansko", "Nádražní", "8", None, "B"),
    ("Jana", "Novotná", "Z", "Vyškov", "Nádražní", "45", "babička", "C"),
    ("Jana", "Novotná", "Z", "Brno", "Údolní", "12", None, "A"),
    ("Marie", "Novotná", "Z", "Tišnov", "Úzká", "5", None, "B")
]

# Další jména pro náhodné generování zbývajících rodin
used_foster_ids = set()

for i in range(40):
    household_id = f"11111111-1111-1111-1111-{i:012d}"
    
    # Rozhodnutí o prirazene KO (20 pro test, 20 pro Petra Homolku)
    assigned_ko = worker_uid if i < 20 else admin_uid
    
    is_relative_care = random.choice([True, False, False]) # Příbuzenská PP občas
    
    if i < len(explicit_foster_parents):
        first_name, last_name, gender, city, street, street_num, relationship, care_type = explicit_foster_parents[i]
        foster_id = gen_foster_id()
        while foster_id in used_foster_ids:
            foster_id = gen_foster_id()
        used_foster_ids.add(foster_id)
    else:
        gender = random.choice(["M", "Z"])
        first_name = random.choice(MALE_NAMES) if gender == "M" else random.choice(FEMALE_NAMES)
        last_name = random.choice(SURNAMES_MALE) if gender == "M" else random.choice(SURNAMES_FEMALE)
        
        # Pojistka proti nechtěným dalším duplicitám Nováka/Novotné/atd
        while (first_name == "Jan" and last_name == "Novák") or (first_name == "Jana" and last_name == "Novotná") or (first_name == "Petr" and last_name == "Novák") or (first_name == "Marie" and last_name == "Novotná"):
            last_name = random.choice(SURNAMES_MALE) if gender == "M" else random.choice(SURNAMES_FEMALE)
            
        city = random.choice(CITIES)
        street = random.choice(STREETS)
        street_num = str(random.randint(1, 150))
        foster_id = gen_foster_id()
        while foster_id in used_foster_ids:
            foster_id = gen_foster_id()
        used_foster_ids.add(foster_id)
        
        relationship = None
        care_type = random.choice(["A", "B"])
        if is_relative_care:
            relationship = random.choice(["babička", "teta"]) if gender == "Z" else "strýc"
            care_type = "C"

    # Vytvoření domácnosti
    notes = f"Pěstounská rodina: {first_name} {last_name}. Doprovází Anna Málková."
    sql_statements.append(f"-- Domácnost {i+1}: {first_name} {last_name} ({foster_id})")
    sql_statements.append(f"""INSERT INTO public.households (id, organization_id, branch_id, assigned_ko_id, foster_id, status, notes)
VALUES ('{household_id}', '{org_id}', '{branch_id}', '{assigned_ko}', '{foster_id}', 'active', '{notes}');""")

    # Vytvoření pěstouna
    p_id = f"22222222-2222-2222-2222-{i:012d}"
    birth_year = random.randint(1965, 1992)
    birth_date = f"{birth_year}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
    profession = random.choice(PROFESSIONS)
    avatar = random.choice(AVATARS_MALE) if gender == "M" else random.choice(AVATARS_FEMALE)
    
    custom_fields = {"avatar_url": avatar, "profession": profession, "foster_care_type": care_type}
    if relationship:
        custom_fields["relationship_to_child"] = relationship # Vztah pěstouna
        
    cf_json = json.dumps(custom_fields, ensure_ascii=False)
    
    sql_statements.append(f"""INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, is_active)
VALUES ('{p_id}', '{org_id}', '{household_id}', 'foster_parent', '{first_name}', '{last_name}', '{birth_date}', '{cf_json}'::jsonb, true);""")

    # Vytvoření adresy pěstouna
    addr_id = f"33333333-3333-3333-3333-{i:012d}"
    zip_code = f"{random.randint(100, 799)} {random.randint(10, 99)}"
    sql_statements.append(f"""INSERT INTO public.person_addresses (id, person_id, type, street, city, zip, from_date)
VALUES ('{addr_id}', '{p_id}', 'actual', '{street} {street_num}', '{city}', '{zip_code}', '2020-01-01');""")

    # Vytvoření dětí v pěstounské péči (1 až 2)
    num_foster_children = random.choice([1, 1, 2])
    for child_idx in range(num_foster_children):
        c_id = f"44444444-4444-4444-{i:04d}-{child_idx:08d}"
        c_gender = random.choice(["M", "Z"])
        c_first_name = random.choice(MALE_NAMES) if c_gender == "M" else random.choice(FEMALE_NAMES)
        
        # Příjmení musí být jiné než pěstouna
        c_last_name = random.choice(SURNAMES_MALE) if c_gender == "M" else random.choice(SURNAMES_FEMALE)
        while c_last_name.startswith(last_name[:3]):
            c_last_name = random.choice(SURNAMES_MALE) if c_gender == "M" else random.choice(SURNAMES_FEMALE)
            
        c_birth_year = random.randint(2010, 2021)
        c_birth_date = f"{c_birth_year}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
        
        c_school = random.choice(SCHOOLS)
        c_hobby = random.choice(HOBBIES)
        c_avatar = random.choice(AVATARS_MALE) if c_gender == "M" else random.choice(AVATARS_FEMALE)
        
        c_custom_fields = {"avatar_url": c_avatar, "school": c_school, "hobby": c_hobby, "foster_care_type": care_type}
        
        if relationship:
            # Odvození dětského vztahu
            if relationship in ["babička", "dědeček"]:
                c_rel = "vnučka" if c_gender == "Z" else "vnuk"
            elif relationship in ["teta", "strýc"]:
                c_rel = "neteř" if c_gender == "Z" else "synovec"
            else:
                c_rel = "dítě v péči"
            c_custom_fields["relationship_to_foster_parent"] = c_rel
            
        c_cf_json = json.dumps(c_custom_fields, ensure_ascii=False)
        rating = random.choice(["A", "A", "B", "C"])
        
        sql_statements.append(f"""INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, gdpr_consent_signed, safety_rating, is_active)
VALUES ('{c_id}', '{org_id}', '{household_id}', 'child', '{c_first_name}', '{c_last_name}', '{c_birth_date}', '{c_cf_json}'::jsonb, true, '{rating}', true);""")

    # Vytvoření vlastních (biologických) dětí pěstouna (1 až 3)
    num_bio_children = random.choice([1, 2, 2, 3])
    for bio_idx in range(num_bio_children):
        b_id = f"55555555-5555-5555-{i:04d}-{bio_idx:08d}"
        b_gender = random.choice(["M", "Z"])
        b_first_name = random.choice(MALE_NAMES) if b_gender == "M" else random.choice(FEMALE_NAMES)
        b_last_name = last_name
        b_birth_year = random.randint(2005, 2022)
        b_birth_date = f"{b_birth_year}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
        
        b_avatar = random.choice(AVATARS_MALE) if b_gender == "M" else random.choice(AVATARS_FEMALE)
        b_rel = "Biologický syn" if b_gender == "M" else "Biologická dcera"
        
        b_custom_fields = {"avatar_url": b_avatar, "relationship_to_child": b_rel}
        b_cf_json = json.dumps(b_custom_fields, ensure_ascii=False)
        
        sql_statements.append(f"""INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, gdpr_consent_signed, safety_rating, is_active)
VALUES ('{b_id}', '{org_id}', '{household_id}', 'social_contact', '{b_first_name}', '{b_last_name}', '{b_birth_date}', '{b_cf_json}'::jsonb, true, 'N', true);""")

    # Vytvoření biologického rodiče v karanténě (GDPR nepodepsán)
    bio_parent_id = f"66666666-6666-6666-6666-{i:012d}"
    bp_gender = random.choice(["M", "Z"])
    bp_first_name = random.choice(MALE_NAMES) if bp_gender == "M" else random.choice(FEMALE_NAMES)
    bp_last_name = random.choice(SURNAMES_MALE) if bp_gender == "M" else random.choice(SURNAMES_FEMALE)
    bp_birth_num = f"{random.randint(70,99)}{random.randint(1,12):02d}{random.randint(1,28):02d}/{random.randint(1000,9999)}"
    bp_phone = f"+420{random.randint(601,777)}{random.randint(100000,999999)}"
    
    gdpr_signed = random.choice([True, False, False])
    bp_rating = random.choice(["B", "C", "Z"])
    
    sql_statements.append(f"""INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_number, phone, gdpr_consent_signed, safety_rating, is_active)
VALUES ('{bio_parent_id}', '{org_id}', '{household_id}', 'bio_parent', '{bp_first_name}', '{bp_last_name}', '{bp_birth_num}', '{bp_phone}', {str(gdpr_signed).lower()}, '{bp_rating}', true);""")

    # Vytvoření timeline událostí (1 až 2 na domácnost)
    num_events = random.choice([1, 2])
    for event_idx in range(num_events):
        e_id = f"77777777-7777-7777-{i:04d}-{event_idx:08d}"
        days_ago = random.randint(1, 90)
        occurred_date = datetime.now() - timedelta(days=days_ago)
        occurred_str = occurred_date.strftime("%Y-%m-%d %H:%M:%S+02")
        
        e_type = random.choice(["regular_visit", "phone_call", "crisis_event"]) if bp_rating != "Z" else "crisis_event"
        
        if e_type == "regular_visit":
            title = "Pravidelná pololetní návštěva"
            content = f"Návštěva v rodině proběhla v pořádku. Pěstoun {first_name} {last_name} vzorně spolupracuje, děti se rozvíjejí standardně podle IPOD."
            summary = "Pololetní návštěva bez zjištěných nedostatků."
        elif e_type == "phone_call":
            title = "Telefonický kontakt s pěstounem"
            content = f"Telefonický hovor s pěstounem. Probírali jsme chování dětí ve škole a plánování letních prázdninových aktivit."
            summary = "Telefonát ohledně prázdnin."
        else:
            title = "Incident / Porušení pravidel"
            if bp_rating == "Z":
                title = "Pokus o kontakt biologického otce"
                content = f"Biologický rodič {bp_first_name} {bp_last_name} se pokusil kontaktovat dítě navzdory soudnímu zákazu styku. Pěstoun okamžitě kontaktoval naši klíčovou osobu. Incident hlášen na OSPOD."
                summary = "Porušení zákazu styku biologickým rodičem."
            else:
                content = f"Hlášen drobný incident v rodině: neshody ve škole ohledně prospěchu. Klíčová osoba naplánovala společné jednání s třídním učitelem."
                summary = "Řešení studijních problémů."
                
        payload = {"content": content, "summary": summary}
        payload_json = json.dumps(payload, ensure_ascii=False)
        
        sql_statements.append(f"""INSERT INTO public.events (id, organization_id, household_id, author_id, type, title, payload, occurred_at)
VALUES ('{e_id}', '{org_id}', '{household_id}', '{assigned_ko}', '{e_type}', '{title}', '{payload_json}'::jsonb, '{occurred_str}');""")

    sql_statements.append("") # Empty line between households

# Save SQL output
with open("moje_doprovazeni_com/supabase/migrations/20260617000100_seed_data.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(sql_statements))

print("Successfully generated rich seed data!")
