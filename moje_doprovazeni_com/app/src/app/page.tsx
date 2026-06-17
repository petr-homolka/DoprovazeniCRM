"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  ShieldAlert, 
  Calendar, 
  UserPlus, 
  MapPin, 
  BookOpen, 
  Activity, 
  FileText, 
  Sparkles, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  LogOut,
  Map
} from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Home() {
  // Stav přihlášení
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Databázový stav
  const [households, setHouseholds] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  // 1. Ověření přihlášení při načtení
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfileAndData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfileAndData(session.user.id);
      } else {
        setHouseholds([]);
        setPersons([]);
        setAddresses([]);
        setEvents([]);
        setCurrentUserProfile(null);
        setSelectedFamilyId(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Načtení profilu uživatele a dat z databáze
  const fetchProfileAndData = async (userId: string) => {
    setLoading(true);
    try {
      // Načíst profil aktuálního uživatele
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Chyba při načítání profilu:", profileError);
      } else if (profile) {
        setCurrentUserProfile(profile);

        // Načíst organizaci pro Whitelabeling (barvy)
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.organization_id)
          .single();

        if (orgError) {
          console.error("Chyba při načítání organizace:", orgError);
        } else if (org) {
          // Nastavit dynamické barvy organizace do CSS proměnných
          document.documentElement.style.setProperty("--primary-color", org.primary_color || "#6366f1");
          document.documentElement.style.setProperty("--secondary-color", org.secondary_color || "#0f172a");
        }
      }

      // Načíst domácnosti (RLS automaticky zafiltruje dle role)
      const { data: householdsData, error: hError } = await supabase
        .from("households")
        .select("*");
      
      if (hError) throw hError;
      setHouseholds(householdsData || []);

      // Nastavit výchozí vybranou rodinu
      if (householdsData && householdsData.length > 0) {
        setSelectedFamilyId(householdsData[0].id);
      }

      // Načíst osoby
      const { data: personsData, error: pError } = await supabase
        .from("persons")
        .select("*");
      if (pError) throw pError;
      setPersons(personsData || []);

      // Načíst adresy
      const { data: addressesData, error: aError } = await supabase
        .from("person_addresses")
        .select("*");
      if (aError) throw aError;
      setAddresses(addressesData || []);

      // Načíst časovou osu událostí
      const { data: eventsData, error: eError } = await supabase
        .from("events")
        .select("*")
        .order("occurred_at", { ascending: false });
      if (eError) throw eError;
      setEvents(eventsData || []);

    } catch (err) {
      console.error("Chyba při načítání dat:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Spuštění přihlášení
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (err: any) {
      setLoginError(err.message || "Nesprávný e-mail nebo heslo.");
      setLoading(false);
    }
  };

  // 4. Odhlášení
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ==========================================
  // HELPER FUNKCE PRO BUSINESS PRAVIDLA JMEN A DUPLICIT
  // ==========================================

  // Pomocník pro formátování jména pěstouna (odlišení duplicitních jmen)
  const getFosterParentDisplayName = (parent: any) => {
    // Najít všechny pěstouny se stejným jménem a příjmením v naší paměti
    const duplicates = persons.filter(p => 
      p.role === "foster_parent" && 
      p.first_name === parent.first_name && 
      p.last_name === parent.last_name
    );

    if (duplicates.length <= 1) {
      return `${parent.first_name} ${parent.last_name}`;
    }

    // Pokud existují duplicity, zkusíme najít jejich adresy
    const parentAddr = addresses.find(a => a.person_id === parent.id);
    
    // Zjistíme, zda existují duplicity na STEJNÉ adrese (stejná ulice i město)
    const sameAddressDuplicates = duplicates.filter(d => {
      const dAddr = addresses.find(a => a.person_id === d.id);
      return dAddr && parentAddr && dAddr.city === parentAddr.city && dAddr.street === parentAddr.street;
    });

    if (sameAddressDuplicates.length > 1) {
      // Pokud je shodná i adresa, očíslujeme je v závorce (podle ID / pořadí)
      const sorted = [...sameAddressDuplicates].sort((a, b) => a.id.localeCompare(b.id));
      const index = sorted.findIndex(s => s.id === parent.id) + 1;
      return `${parent.first_name} ${parent.last_name} (${index})`;
    }

    // Pokud mají stejná jména, ale jiné adresy, vrátíme standardní jméno (adresa se zobrazí hned pod ním)
    return `${parent.first_name} ${parent.last_name}`;
  };

  // Pomocník pro formátování jména dítěte (odlišení duplicitních jmen v jedné rodině)
  const getChildDisplayName = (child: any) => {
    // Najdeme děti se stejným jménem ve stejné domácnosti (rodině)
    const duplicates = persons.filter(p =>
      p.role === "child" &&
      p.household_id === child.household_id &&
      p.first_name === child.first_name &&
      p.last_name === child.last_name
    );

    if (duplicates.length <= 1) {
      return `${child.first_name} ${child.last_name}`;
    }

    // Očíslujeme je v závorce
    const sorted = [...duplicates].sort((a, b) => a.id.localeCompare(b.id));
    const index = sorted.findIndex(s => s.id === child.id) + 1;
    return `${child.first_name} ${child.last_name} (${index})`;
  };

  // Pomocník pro zjištění, zda má pěstoun stejné příjmení jako jiné rodiny (pro zobrazení adresy pod jménem)
  const hasSurnameDuplicate = (lastName: string) => {
    const matches = persons.filter(p => p.role === "foster_parent" && p.last_name === lastName);
    return matches.length > 1;
  };

  // ==========================================
  // FILTROVÁNÍ A PROPOJOVÁNÍ DAT PRO AKTUÁLNÍ DETAIL
  // ==========================================

  const selectedHousehold = households.find(h => h.id === selectedFamilyId);
  const selectedFamilyPersons = persons.filter(p => p.household_id === selectedFamilyId);
  const selectedFamilyEvents = events.filter(e => e.household_id === selectedFamilyId);

  const primaryFosterParent = selectedFamilyPersons.find(p => p.role === "foster_parent");
  const fosterChildren = selectedFamilyPersons.filter(p => p.role === "child");
  const otherMembers = selectedFamilyPersons.filter(p => p.role === "social_contact");
  const biologicalParents = selectedFamilyPersons.filter(p => p.role === "bio_parent");

  const primaryParentAddress = primaryFosterParent ? addresses.find(a => a.person_id === primaryFosterParent.id) : null;

  // Renderování načítání
  if (loading && !session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Načítání systému FosterFlow...</p>
        </div>
      </div>
    );
  }

  // RENDER: PŘIHLAŠOVACÍ OBRAZOVKA
  if (!session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-100 p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-3">FosterFlow</h1>
            <p className="text-xs text-slate-400">
              Vstup do interního informačního systému doprovázení
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">E-mail</label>
              <input 
                type="email" 
                placeholder="petr.homolka@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Heslo</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            {loginError && (
              <p className="text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                {loginError}
              </p>
            )}

            <button 
              type="submit" 
              className="w-full py-3 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-primary/20"
            >
              Přihlásit se
            </button>
          </form>

          <div className="text-[10px] text-slate-500 text-center border-t border-slate-850 pt-4 leading-relaxed">
            Data jsou fyzicky uložena v regionu EU (Frankfurt) a chráněna šifrováním na úrovni databáze (PostgreSQL RLS).
          </div>
        </div>
      </div>
    );
  }

  // RENDER: HLAVNÍ METADATA DASHBOARDU
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      
      {/* 1. ŠPIČKOVÝ SIDEBAR */}
      <aside className="w-64 bg-slate-950 flex flex-col border-r border-slate-900">
        {/* Logo a Organizace */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              FosterFlow
            </h1>
            <span className="text-xs text-primary font-medium tracking-wide uppercase">
              PRO verze (CZ)
            </span>
          </div>
        </div>

        {/* Hlavní menu */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium transition-all">
            <Users className="w-5 h-5" />
            <span>Karty rodin</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-all">
            <Calendar className="w-5 h-5" />
            <span>Plánování návštěv</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-all">
            <FileText className="w-5 h-5" />
            <span>Spisy a GDPR</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-all">
            <Building2 className="w-5 h-5" />
            <span>Registry a číselníky</span>
          </a>
        </nav>

        {/* Profil aktuálně přihlášeného uživatele */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
                {currentUserProfile?.first_name?.charAt(0) || "U"}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-300">
                  {currentUserProfile ? `${currentUserProfile.first_name} ${currentUserProfile.last_name}` : "Načítání..."}
                </p>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                  {currentUserProfile?.role || "Uživatel"}
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              title="Odhlásit se"
              className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. STŘEDNÍ SLOUPCOVÝ SEZNAM RODIN */}
      <section className="w-96 bg-slate-50 flex flex-col border-r border-slate-200">
        {/* Hlavička sloupce a Hledání */}
        <div className="p-6 border-b border-slate-200 bg-white space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Klientské spisy</h2>
            <button className="p-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shadow-md">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Hledat rodinu, pěstouna, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Seznam domácností */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {households
            .filter(h => {
              const p = persons.find(p => p.household_id === h.id && p.role === "foster_parent");
              const c = persons.filter(p => p.household_id === h.id && p.role === "child");
              const childNames = c.map(ch => `${ch.first_name} ${ch.last_name}`).join(" ");
              const parentName = p ? `${p.first_name} ${p.last_name}` : "";
              return parentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                     childNames.toLowerCase().includes(searchQuery.toLowerCase()) || 
                     h.foster_id.toLowerCase().includes(searchQuery.toLowerCase());
            })
            .map((h) => {
              const p = persons.find(per => per.household_id === h.id && per.role === "foster_parent");
              const children = persons.filter(per => per.household_id === h.id && per.role === "child");
              const pAddress = p ? addresses.find(a => a.person_id === p.id) : null;
              const hasDup = p ? hasSurnameDuplicate(p.last_name) : false;

              return (
                <div 
                  key={h.id}
                  onClick={() => setSelectedFamilyId(h.id)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all ${
                    selectedFamilyId === h.id 
                      ? "bg-white border-primary shadow-sm shadow-primary/5" 
                      : "bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm text-slate-800">
                      {p ? `Rodina ${p.last_name}ových` : "Rodina bez pěstouna"}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                      h.status === "active" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {h.status === "active" ? "Aktivní" : "Zájemce"}
                    </span>
                  </div>
                  
                  {/* Primární pěstoun a zobrazení duplicitního příjmení */}
                  {p && (
                    <p className="text-xs text-primary font-bold">
                      Pěstoun: {getFosterParentDisplayName(p)}
                    </p>
                  )}

                  {/* Adresa pod jménem v případě stejných příjmení v databázi */}
                  {p && hasDup && pAddress && (
                    <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-1 bg-slate-50 p-1.5 rounded border border-slate-200">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span>{pAddress.city}, {pAddress.street}</span>
                    </p>
                  )}

                  {/* Seznam dětí v pěstounské péči (zobrazení rozdílných příjmení) */}
                  <div className="mt-2 text-xs text-slate-500">
                    <span className="font-medium">Děti v PP: </span>
                    <span>
                      {children.map(ch => getChildDisplayName(ch)).join(", ") || "Žádné děti"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-3 border-t border-slate-900/40 pt-2">
                    <span>{h.foster_id}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* 3. DETAILNÍ PANEL */}
      <main className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
        {selectedHousehold ? (
          <>
            {/* Horní lišta detailu */}
            <div className="h-20 px-8 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {primaryFosterParent ? `Spis rodiny ${primaryFosterParent.last_name}ových` : "Detail spisu"}
                </h3>
                <p className="text-xs text-slate-500">
                  Doprovázeno pobočkou Brno • Evidenční kód: {selectedHousehold.foster_id}
                </p>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm transition-colors border border-slate-200 shadow-sm">
                  Vygenerovat PDF spis
                </button>
                <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm transition-colors shadow-md">
                  Upravit kartu
                </button>
              </div>
            </div>

            {/* Hlavní obsah detailu */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              
              {/* GDPR Karanténa Alert (pokud jakákoli osoba nemá souhlas) */}
              {selectedFamilyPersons.some(p => !p.gdpr_consent_signed) && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3 text-amber-800">
                  <ShieldAlert className="w-6 h-6 shrink-0 text-amber-600 animate-pulse" />
                  <div>
                    <h4 className="font-bold text-sm">GDPR Karanténa aktivní</h4>
                    <p className="text-xs text-amber-800/80 leading-relaxed mt-1">
                      U některých evidovaných příbuzných nebo kontaktů nebyl podepsán a naskenován souhlas se zpracováním osobních údajů. Jejich telefonní čísla, rodná čísla a osobní doklady jsou z bezpečnostních důvodů maskovány.
                    </p>
                  </div>
                </div>
              )}

              {/* Mřížka pěstouna a dětí */}
              <div className="grid grid-cols-3 gap-6">
                
                {/* 3.1. Karta pěstouna */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hlavní Pěstoun</span>
                      {primaryFosterParent?.custom_fields?.avatar_url && (
                        <img 
                          src={primaryFosterParent.custom_fields.avatar_url} 
                          alt="avatar" 
                          className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                        />
                      )}
                    </div>
                    {primaryFosterParent && (
                      <p className="text-xl font-bold text-slate-800 mt-2">
                        {getFosterParentDisplayName(primaryFosterParent)}
                      </p>
                    )}
                    <p className="text-xs text-primary font-bold mt-1">
                      Profese: {primaryFosterParent?.custom_fields?.profession || "Neuvedeno"}
                    </p>
                  </div>

                  {/* Adresa pěstouna a odkaz na Google Maps */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
                    {primaryParentAddress && (
                      <div className="space-y-1.5">
                        <span className="text-slate-500 font-bold block uppercase text-[10px]">Aktuální adresa:</span>
                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-slate-700">
                            {primaryParentAddress.street}, {primaryParentAddress.city}
                            {primaryParentAddress.floor_details && <span className="block text-[10px] text-slate-500">{primaryParentAddress.floor_details}</span>}
                          </span>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${primaryParentAddress.street}, ${primaryParentAddress.city}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Otevřít v Google Maps"
                            className="p-1.5 hover:bg-slate-200 rounded-md text-primary transition-colors"
                          >
                            <Map className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3.2. Seznam dětí v pěstounské péči */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 col-span-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Děti v pěstounské péči</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {fosterChildren.map((child) => (
                      <div key={child.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3 justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {child.custom_fields?.avatar_url && (
                              <img 
                                src={child.custom_fields.avatar_url} 
                                alt="child" 
                                className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              />
                            )}
                            <div>
                              <p className="text-sm font-bold text-slate-800">{getChildDisplayName(child)}</p>
                              <p className="text-[10px] text-slate-400">Státní občanství: ČR</p>
                            </div>
                          </div>
                          
                          <div className="text-[11px] text-slate-650 pt-2 space-y-1">
                            <p><span className="text-slate-400 font-medium">Hobby:</span> {child.custom_fields?.hobby || "Neuvedeno"}</p>
                            <p><span className="text-slate-400 font-medium">Škola:</span> {child.custom_fields?.school || "Neuvedeno"}</p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                          child.safety_rating === "A" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          child.safety_rating === "B" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          Rating {child.safety_rating}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Společný sociální prostor a rodinné vazby */}
              <div className="grid grid-cols-3 gap-6">
                
                {/* 3.3. Biologická rodina a sociální kontakty */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 col-span-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rodinné vazby a sociální prostor (GDPR karanténa)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    
                    {/* Ostatní členové domácnosti (např. manželka pěstouna, biologické děti pěstouna) */}
                    {otherMembers.map((member) => (
                      <div key={member.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-3">
                        {member.custom_fields?.avatar_url ? (
                          <img src={member.custom_fields.avatar_url} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-500">
                            {member.first_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{member.first_name} {member.last_name}</p>
                          <p className="text-[10px] text-primary font-bold mt-0.5">
                            {member.custom_fields?.relationship_to_child || "Člen rodiny"}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Biologičtí rodiče a kontakty */}
                    {biologicalParents.map((bio) => (
                      <div 
                        key={bio.id} 
                        className={`p-3.5 rounded-lg border flex items-center justify-between ${
                          bio.safety_rating === "Z" 
                            ? "bg-red-50/50 border-red-200" 
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-500">
                            {bio.first_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{bio.first_name} {bio.last_name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Biologický rodič • Rating {bio.safety_rating}
                            </p>
                          </div>
                        </div>

                        {/* Bezpečnostní maskování dle příznaku GDPR */}
                        <div className="text-right">
                          {bio.safety_rating === "Z" ? (
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[9px] font-bold uppercase tracking-wide rounded border border-red-200">
                              Styk zakázán
                            </span>
                          ) : bio.gdpr_consent_signed ? (
                            <span className="text-xs font-mono text-slate-700">{bio.phone || "Bez tel."}</span>
                          ) : (
                            <span className="text-[11px] font-mono text-amber-700 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Lock className="w-3 h-3" /> maskováno
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Časová osa (Timeline) */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Historie časové osy</h4>
                
                {selectedFamilyEvents.length > 0 ? (
                  <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
                    {selectedFamilyEvents.map((e) => (
                      <div key={e.id} className="relative">
                        <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full ring-4 ring-slate-50 ${
                          e.type === "crisis_event" ? "bg-red-500" : "bg-primary"
                        }`} />
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-bold text-sm text-slate-800">{e.title}</h5>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                              {e.payload?.content || e.payload?.text || "Bez textu"}
                            </p>
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                            {new Date(e.occurred_at).toLocaleDateString("cs-CZ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic pl-4">Zatím žádné události.</p>
                )}
              </div>

            </div>

            {/* AI COMMAND CENTER (CHATOVÝ PANEL DOLE) */}
            <div className="p-6 border-t border-slate-200 bg-white">
              <div className="max-w-4xl mx-auto relative">
                <Sparkles className="absolute left-4 top-4.5 w-5 h-5 text-primary" />
                <input 
                  type="text" 
                  placeholder="Zeptejte se AI na cokoliv ze spisu (např.: Kdy proběhla poslední návštěva? Jaký je rodinný rating?)..."
                  className="w-full pl-12 pr-24 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-white shadow-sm transition-all"
                />
                <button className="absolute right-3 top-3 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold tracking-wide flex items-center gap-1 transition-colors">
                  Položit dotaz
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 italic">
            Zatím nebyly načteny žádné domácnosti.
          </div>
        )}
      </main>

    </div>
  );
}
