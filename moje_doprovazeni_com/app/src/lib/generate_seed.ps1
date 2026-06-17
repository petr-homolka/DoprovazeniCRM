# PowerShell script to generate rich seed data
# Cesta: moje_doprovazeni_com/supabase/migrations/20260617000100_seed_data.sql

# Arrays of Czech names
$maleNames = @("Jan", "Petr", "Tomáš", "Martin", "Jiří", "Jaroslav", "Pavel", "Miroslav", "František", "Josef", "Václav", "Michal", "David", "Jakub", "Lukáš", "Filip", "Ondřej", "Marek", "Aleš", "Radim")
$femaleNames = @("Marie", "Jana", "Eva", "Hana", "Anna", "Lenka", "Kateřina", "Lucie", "Věra", "Alena", "Petra", "Veronika", "Martina", "Michaela", "Adéla", "Monika", "Tereza", "Barbora", "Kristýna", "Eliška")

$surnamesMale = @("Novák", "Svoboda", "Novotný", "Dvořák", "Černý", "Procházka", "Kučera", "Veselý", "Horák", "Němec", "Marek", "Pokorný", "Král", "Jelínek", "Růžička", "Beneš", "Fiala", "Sedláček", "Zeman", "Kolář")
$surnamesFemale = @("Nováková", "Svobodová", "Novotná", "Dvořáková", "Černá", "Procházková", "Kučerová", "Veselá", "Horáková", "Němcová", "Marková", "Pokorná", "Králová", "Jelínková", "Růžičková", "Benešová", "Fialová", "Sedláčková", "Zemanová", "Kolářová")

$professions = @("Učitel", "Řidič", "Zdravotní sestra", "Stavební inženýr", "Účetní", "Kuchař", "Prodavač", "Podnikatel", "IT specialista", "Sociální pracovník", "Zahradník", "Důchodce")
$hobbies = @("Fotbal", "Plavání", "Výtvarný kroužek", "Hra na klavír", "Keramika", "Skaut", "Florbal", "Taneční kroužek", "Čtení", "Cyklistika", "Šachy", "Modelářství")
$schools = @("ZŠ Úvoz Brno", "ZŠ Merhautova Brno", "ZŠ Křídlovická Brno", "ZŠ Školní Hostomice", "ZŠ Nádražní Vyškov", "Gymnázium Elgartova Brno")
$cities = @("Brno", "Hostomice", "Vyškov", "Blansko", "Tišnov", "Kuřim", "Modřice", "Slavkov u Brna")
$streets = @("Školní", "Údolní", "Merhautova", "Pekařská", "Nádražní", "Husova", "Konečného náměstí", "Sportovní", "Zahradní", "Dlouhá")

$avatarsMale = @(
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
    "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150"
)

$avatarsFemale = @(
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
)

$usedFosterIds = [System.Collections.Generic.HashSet[string]]::new()
$usedFosterIds.Add("FF-101-ABC") | Out-Null
$usedFosterIds.Add("FF-102-DEF") | Out-Null
$usedFosterIds.Add("FF-201-GHI") | Out-Null
$usedFosterIds.Add("FF-202-JKL") | Out-Null

function Get-FosterId {
    $confLetters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    do {
        $digits = ""
        for ($i=0; $i -lt 3; $i++) { $digits += (Get-Random -Minimum 0 -Maximum 10).ToString() }
        $letters = ""
        for ($i=0; $i -lt 3; $i++) { $letters += $confLetters[(Get-Random -Minimum 0 -Maximum $confLetters.Length)] }
        $fId = "FF-$digits-$letters"
    } while ($usedFosterIds.Contains($fId))
    $usedFosterIds.Add($fId) | Out-Null
    return $fId
}

$sql = @()
$sql += "-- Supabase Migration: Testovací data (Seed data - 20 domácností)"
$sql += "-- Cesta: moje_doprovazeni_com/supabase/migrations/20260617000100_seed_data.sql`n"
$sql += "TRUNCATE public.person_physiological_metrics, public.person_documents, public.person_education, public.person_addresses, public.events, public.persons, public.households, public.profiles, public.branches, public.organizations CASCADE;`n"

# 1. Organizations & Branch
$sql += "-- =========================================="
$sql += "-- 1. ZALOŽENÍ TESTOVACÍ ORGANIZACE A POBOČKY"
$sql += "-- ==========================================`n"

$orgId = "a0e0a0e0-a0e0-a0e0-a0e0-a0e0a0e0a0e0"
$branchId = "b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0"

$sql += "INSERT INTO public.organizations (id, name, slug, primary_color, secondary_color, subscription_tier) VALUES ('$orgId', 'Doprovázení s.r.o.', 'doprovazeni', '#6366f1', '#0f172a', 'pro');"
$sql += "INSERT INTO public.branches (id, organization_id, name, address) VALUES ('$branchId', '$orgId', 'Pobočka Brno-město', 'Údolní 250/5, 602 00 Brno');`n"

# 2. Profiles
$sql += "-- =========================================="
$sql += "-- 2. ZALOŽENÍ UŽIVATELSKÝCH PROFILŮ"
$sql += "-- ==========================================`n"

$adminUid = "f1520cd2-38d3-49fc-a40b-e6c4524983c8"
$workerUid = "aecbcd51-1ae6-48b3-b641-a5c639b46fe6"

$sql += "INSERT INTO public.profiles (id, organization_id, branch_id, email, first_name, last_name, role, is_active) VALUES ('$adminUid', '$orgId', '$branchId', 'petr.homolka@gmail.com', 'Petr', 'Homolka', 'superadmin', true);"
$sql += "INSERT INTO public.profiles (id, organization_id, branch_id, email, first_name, last_name, role, is_active) VALUES ('$workerUid', '$orgId', '$branchId', 'test@doprovazeni.com', 'Test', 'Pracovník', 'worker', true);`n"

# 3. Households & Persons
$sql += "-- =========================================="
$sql += "-- 3. ZALOŽENÍ DOMÁCNOSTÍ A OSOB (40 rodin)"
$sql += "-- ==========================================`n"

# Explicit namesakes to test indexing
$explicitFosterParents = @(
    @{ FirstName = "Jan"; LastName = "Novák"; Gender = "M"; City = "Brno"; Street = "Konečného náměstí"; StreetNum = "4"; Rel = $null; CareType = "A" },
    @{ FirstName = "Jan"; LastName = "Novák"; Gender = "M"; City = "Hostomice"; Street = "Školní"; StreetNum = "13"; Rel = "dědeček"; CareType = "C" },
    @{ FirstName = "Petr"; LastName = "Novák"; Gender = "M"; City = "Blansko"; Street = "Nádražní"; StreetNum = "8"; Rel = $null; CareType = "B" },
    @{ FirstName = "Jana"; LastName = "Novotná"; Gender = "Z"; City = "Vyškov"; Street = "Nádražní"; StreetNum = "45"; Rel = "babička"; CareType = "C" },
    @{ FirstName = "Jana"; LastName = "Novotná"; Gender = "Z"; City = "Brno"; Street = "Údolní"; StreetNum = "12"; Rel = $null; CareType = "A" },
    @{ FirstName = "Marie"; LastName = "Novotná"; Gender = "Z"; City = "Tišnov"; Street = "Úzká"; StreetNum = "5"; Rel = $null; CareType = "B" }
)

# Generate 40 households
for ($i = 0; $i -lt 40; $i++) {
    $hId = "11111111-1111-1111-1111-$($i.ToString('000000000000'))"
    
    # Assign 20 households to test worker, and 20 households to Petr Homolka
    $assignedKo = if ($i -lt 20) { $workerUid } else { $adminUid }
    
    $isRelativeCare = (Get-Random -Minimum 0 -Maximum 3) -eq 0 # 33% relative care
    
    $parentInfo = $null
    if ($i -lt $explicitFosterParents.Count) {
        $parentInfo = $explicitFosterParents[$i]
        $fosterId = Get-FosterId
    } else {
        $gender = @("M", "Z")[(Get-Random -Minimum 0 -Maximum 2)]
        $fName = $null
        $lName = $null
        if ($gender -eq "M") {
            $fName = $maleNames[(Get-Random -Minimum 0 -Maximum $maleNames.Count)]
            $lName = $surnamesMale[(Get-Random -Minimum 0 -Maximum $surnamesMale.Count)]
        } else {
            $fName = $femaleNames[(Get-Random -Minimum 0 -Maximum $femaleNames.Count)]
            $lName = $surnamesFemale[(Get-Random -Minimum 0 -Maximum $surnamesFemale.Count)]
        }
        
        # Avoid additional Novák/Novotná name duplicates
        while (($fName -eq "Jan" -and $lName -eq "Novák") -or ($fName -eq "Jana" -and $lName -eq "Novotná") -or ($fName -eq "Petr" -and $lName -eq "Novák") -or ($fName -eq "Marie" -and $lName -eq "Novotná")) {
            $lName = if ($gender -eq "M") { $surnamesMale[(Get-Random -Minimum 0 -Maximum $surnamesMale.Count)] } else { $surnamesFemale[(Get-Random -Minimum 0 -Maximum $surnamesFemale.Count)] }
        }
        
        $city = $cities[(Get-Random -Minimum 0 -Maximum $cities.Count)]
        $street = $streets[(Get-Random -Minimum 0 -Maximum $streets.Count)]
        $streetNum = (Get-Random -Minimum 1 -Maximum 150).ToString()
        $fosterId = Get-FosterId
        
        $rel = $null
        $careType = @("A", "B")[(Get-Random -Minimum 0 -Maximum 2)]
        if ($isRelativeCare) {
            $rel = if ($gender -eq "Z") { @("babička", "teta")[(Get-Random -Minimum 0 -Maximum 2)] } else { "strýc" }
            $careType = "C"
        }
        
        $parentInfo = @{ FirstName = $fName; LastName = $lName; Gender = $gender; City = $city; Street = $street; StreetNum = $streetNum; Rel = $rel; CareType = $careType }
    }

    $fName = $parentInfo.FirstName
    $lName = $parentInfo.LastName
    $gender = $parentInfo.Gender
    $city = $parentInfo.City
    $street = $parentInfo.Street
    $streetNum = $parentInfo.StreetNum
    $rel = $parentInfo.Rel
    $careType = $parentInfo.CareType

    $notes = "Pěstounská rodina: $fName $lName. Doprovází Anna Málková."
    $sql += "-- Domácnost $($i+1): $fName $lName ($fosterId)"
    $sql += "INSERT INTO public.households (id, organization_id, branch_id, assigned_ko_id, foster_id, status, notes) VALUES ('$hId', '$orgId', '$branchId', '$assignedKo', '$fosterId', 'active', '$notes');"

    # Create foster parent (Using unique variable name $personUuid to avoid $PID collision)
    $personUuid = "22222222-2222-2222-2222-$($i.ToString('000000000000'))"
    $birthYear = Get-Random -Minimum 1965 -Maximum 1993
    $birthDate = "$birthYear-$((Get-Random -Minimum 1 -Maximum 13).ToString('00'))-$((Get-Random -Minimum 1 -Maximum 29).ToString('00'))"
    $profession = $professions[(Get-Random -Minimum 0 -Maximum $professions.Count)]
    $avatar = if ($gender -eq "M") { $avatarsMale[(Get-Random -Minimum 0 -Maximum $avatarsMale.Count)] } else { $avatarsFemale[(Get-Random -Minimum 0 -Maximum $avatarsFemale.Count)] }
    
    $customFields = @{ avatar_url = $avatar; profession = $profession; foster_care_type = $careType }
    if ($rel -ne $null) {
        $customFields.relationship_to_child = $rel
    }
    
    $cfJson = $customFields | ConvertTo-Json -Compress
    $sql += "INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, is_active) VALUES ('$personUuid', '$orgId', '$hId', 'foster_parent', '$fName', '$lName', '$birthDate', '$cfJson'::jsonb, true);"

    # Create address
    $addrId = "33333333-3333-3333-3333-$($i.ToString('000000000000'))"
    $zipCode = "$((Get-Random -Minimum 100 -Maximum 800)) $((Get-Random -Minimum 10 -Maximum 100))"
    $sql += "INSERT INTO public.person_addresses (id, person_id, type, street, city, zip, from_date) VALUES ('$addrId', '$personUuid', 'actual', '$street $streetNum', '$city', '$zipCode', '2020-01-01');"

    # Create foster children (1 to 2)
    $numFosterChildren = @(1, 1, 2)[(Get-Random -Minimum 0 -Maximum 3)]
    for ($cIdx = 0; $cIdx -lt $numFosterChildren; $cIdx++) {
        $cId = "44444444-4444-4444-$($i.ToString('0000'))-$($cIdx.ToString('00000000'))"
        $cGender = @("M", "Z")[(Get-Random -Minimum 0 -Maximum 2)]
        $cName = if ($cGender -eq "M") { $maleNames[(Get-Random -Minimum 0 -Maximum $maleNames.Count)] } else { $femaleNames[(Get-Random -Minimum 0 -Maximum $femaleNames.Count)] }
        
        # Different surname from foster parent
        $cSur = $null
        do {
            $cSur = if ($cGender -eq "M") { $surnamesMale[(Get-Random -Minimum 0 -Maximum $surnamesMale.Count)] } else { $surnamesFemale[(Get-Random -Minimum 0 -Maximum $surnamesFemale.Count)] }
        } while ($cSur.StartsWith($lName.Substring(0, [Math]::Min(3, $lName.Length))))
        
        $cBirthYear = Get-Random -Minimum 2010 -Maximum 2022
        $cBirthDate = "$cBirthYear-$((Get-Random -Minimum 1 -Maximum 13).ToString('00'))-$((Get-Random -Minimum 1 -Maximum 29).ToString('00'))"
        $cSchool = $schools[(Get-Random -Minimum 0 -Maximum $schools.Count)]
        $cHobby = $hobbies[(Get-Random -Minimum 0 -Maximum $hobbies.Count)]
        $cAvatar = if ($cGender -eq "M") { $avatarsMale[(Get-Random -Minimum 0 -Maximum $avatarsMale.Count)] } else { $avatarsFemale[(Get-Random -Minimum 0 -Maximum $avatarsFemale.Count)] }
        
        $cCustomFields = @{ avatar_url = $cAvatar; school = $cSchool; hobby = $cHobby; foster_care_type = $careType }
        if ($rel -ne $null) {
            $cRel = $null
            if ($rel -eq "babička" -or $rel -eq "dědeček") {
                $cRel = if ($cGender -eq "Z") { "vnučka" } else { "vnuk" }
            } elseif ($rel -eq "teta" -or $rel -eq "strýc") {
                $cRel = if ($cGender -eq "Z") { "neteř" } else { "synovec" }
            }
            if ($cRel -ne $null) {
                $cCustomFields.relationship_to_foster_parent = $cRel
            }
        }
        $cCustomFieldsJson = $cCustomFields | ConvertTo-Json -Compress
        $rating = @("A", "A", "B", "C")[(Get-Random -Minimum 0 -Maximum 4)]
        
        $sql += "INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, gdpr_consent_signed, safety_rating, is_active) VALUES ('$cId', '$orgId', '$hId', 'child', '$cName', '$cSur', '$cBirthDate', '$cCustomFieldsJson'::jsonb, true, '$rating', true);"
    }

    # Create biological children (1 to 3)
    $numBioChildren = @(1, 2, 2, 3)[(Get-Random -Minimum 0 -Maximum 4)]
    for ($bIdx = 0; $bIdx -lt $numBioChildren; $bIdx++) {
        $bId = "55555555-5555-5555-$($i.ToString('0000'))-$($bIdx.ToString('00000000'))"
        $bGender = @("M", "Z")[(Get-Random -Minimum 0 -Maximum 2)]
        $bName = if ($bGender -eq "M") { $maleNames[(Get-Random -Minimum 0 -Maximum $maleNames.Count)] } else { $femaleNames[(Get-Random -Minimum 0 -Maximum $femaleNames.Count)] }
        $bSur = $lName
        $bBirthYear = Get-Random -Minimum 2005 -Maximum 2023
        $bBirthDate = "$bBirthYear-$((Get-Random -Minimum 1 -Maximum 13).ToString('00'))-$((Get-Random -Minimum 1 -Maximum 29).ToString('00'))"
        $bAvatar = if ($bGender -eq "M") { $avatarsMale[(Get-Random -Minimum 0 -Maximum $avatarsMale.Count)] } else { $avatarsFemale[(Get-Random -Minimum 0 -Maximum $avatarsFemale.Count)] }
        $bRel = if ($bGender -eq "M") { "Biologický syn" } else { "Biologická dcera" }
        
        $bCustomFields = @{ avatar_url = $bAvatar; relationship_to_child = $bRel }
        $bCustomFieldsJson = $bCustomFields | ConvertTo-Json -Compress
        
        $sql += "INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_date, custom_fields, gdpr_consent_signed, safety_rating, is_active) VALUES ('$bId', '$orgId', '$hId', 'social_contact', '$bName', '$bSur', '$bBirthDate', '$bCustomFieldsJson'::jsonb, true, 'N', true);"
    }

    # Create bio parents (1 per household)
    $bpId = "66666666-6666-6666-6666-$($i.ToString('000000000000'))"
    $bpGender = @("M", "Z")[(Get-Random -Minimum 0 -Maximum 2)]
    $bpName = if ($bpGender -eq "M") { $maleNames[(Get-Random -Minimum 0 -Maximum $maleNames.Count)] } else { $femaleNames[(Get-Random -Minimum 0 -Maximum $femaleNames.Count)] }
    $bpSur = if ($bpGender -eq "M") { $surnamesMale[(Get-Random -Minimum 0 -Maximum $surnamesMale.Count)] } else { $surnamesFemale[(Get-Random -Minimum 0 -Maximum $surnamesFemale.Count)] }
    $bpBirthNum = "$((Get-Random -Minimum 70 -Maximum 100))$((Get-Random -Minimum 1 -Maximum 13).ToString('00'))$((Get-Random -Minimum 1 -Maximum 29).ToString('00'))/$((Get-Random -Minimum 1000 -Maximum 10000))"
    $bpPhone = "+420$((Get-Random -Minimum 601 -Maximum 778))$((Get-Random -Minimum 100000 -Maximum 1000000))"
    $gdprSigned = @($true, $false, $false)[(Get-Random -Minimum 0 -Maximum 3)]
    $bpRating = @("B", "C", "Z")[(Get-Random -Minimum 0 -Maximum 3)]
    
    $gdprString = if ($gdprSigned) { "true" } else { "false" }
    
    $sql += "INSERT INTO public.persons (id, organization_id, household_id, role, first_name, last_name, birth_number, phone, gdpr_consent_signed, safety_rating, is_active) VALUES ('$bpId', '$orgId', '$hId', 'bio_parent', '$bpName', '$bpSur', '$bpBirthNum', '$bpPhone', $gdprString, '$bpRating', true);"

    # Create timeline events (1 to 2)
    $numEvents = @(1, 2)[(Get-Random -Minimum 0 -Maximum 2)]
    for ($eIdx = 0; $eIdx -lt $numEvents; $eIdx++) {
        $eId = "77777777-7777-7777-$($i.ToString('0000'))-$($eIdx.ToString('00000000'))"
        $daysAgo = Get-Random -Minimum 1 -Maximum 91
        $occurredDate = (Get-Date).AddDays(-$daysAgo).ToString("yyyy-MM-dd HH:mm:ss+02")
        
        $eType = if ($bpRating -eq "Z") { "crisis_event" } else { @("regular_visit", "phone_call", "crisis_event")[(Get-Random -Minimum 0 -Maximum 3)] }
        
        $eTitle = $null
        $eContent = $null
        $eSummary = $null
        
        if ($eType -eq "regular_visit") {
            $eTitle = "Pravidelná pololetní návštěva"
            $eContent = "Návštěva v rodině proběhla v pořádku. Pěstoun $fName $lName vzorně spolupracuje, děti se rozvíjejí standardně podle IPOD."
            $eSummary = "Pololetní návštěva bez zjištěných nedostatků."
        } elseif ($eType -eq "phone_call") {
            $eTitle = "Telefonický kontakt s pěstounem"
            $eContent = "Telefonický hovor s pěstounem. Probírali jsme chování dětí ve škole a plánování letních prázdninových aktivit."
            $eSummary = "Telefonát ohledně prázdnin."
        } else {
            $eTitle = "Incident / Porušení pravidel"
            if ($bpRating -eq "Z") {
                $eTitle = "Pokus o kontakt biologického otce"
                $eContent = "Biologický rodič $bpName $bpSur se pokusil kontaktovat dítě navzdory soudníšemu zákazu styku. Pěstoun okamžitě kontaktoval naši klíčovou osobu. Incident hlášen na OSPOD."
                $eSummary = "Porušení zákazu styku biologickým rodičem."
            } else {
                $eContent = "Hlášen drobný incident v rodině: neshody ve škole ohledně prospěchu. Klíčová osoba naplánovala společné jednání s třídním učitelem."
                $eSummary = "Řešení studijních problémů."
            }
        }
        
        $ePayload = @{ content = $eContent; summary = $eSummary }
        $ePayloadJson = $ePayload | ConvertTo-Json -Compress
        
        $sql += "INSERT INTO public.events (id, organization_id, household_id, author_id, type, title, payload, occurred_at) VALUES ('$eId', '$orgId', '$hId', '$assignedKo', '$eType', '$eTitle', '$ePayloadJson'::jsonb, '$occurredDate');"
    }
    $sql += ""
}

# Save SQL output
$sqlPath = "C:\Users\Petr Homolka\OneDrive\Dokumenty\GitHub\moje\moje_doprovazeni_com\supabase\migrations\20260617000100_seed_data.sql"
[System.IO.File]::WriteAllLines($sqlPath, $sql, [System.Text.Encoding]::UTF8)

Write-Host "Successfully generated 40 households in SQL seed data!"
