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
  Map,
  X,
  FileDown,
  GraduationCap,
  Stethoscope,
  Sun,
  Moon
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
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Synchronizace tmavého režimu s localStorage a HTML třídou
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
    if (savedMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", String(newMode));
    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

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

  const getCareTypeDescription = (type: string) => {
    if (type === "A") return "Dlouhodobá zprostředkovaná pěstounská péče";
    if (type === "B") return "Přechodná zprostředkovaná pěstounská péče";
    if (type === "C") return "Nezprostředkovaná příbuzenská pěstounská péče";
    return "";
  };

  // Pomocník pro formátování jména pěstouna (odlišení duplicitních jmen)
  const getFosterParentDisplayName = (parent: any) => {
    if (!parent) return "";
    // Najít všechny pěstouny se stejným příjmením v aktuálním seznamu
    const duplicates = persons.filter(p => 
      p.role === "foster_parent" && 
      p.last_name === parent.last_name
    );

    let displayName = `${parent.first_name || ""} ${parent.last_name || ""}`.trim();

    if (duplicates.length > 1) {
      // Seřadit abecedně podle křestního jména, pak podle id
      const sorted = [...duplicates].sort((a, b) => {
        const nameCompare = (a.first_name || "").localeCompare(b.first_name || "", "cs-CZ");
        if (nameCompare !== 0) return nameCompare;
        return (a.id || "").localeCompare(b.id || "");
      });
      const index = sorted.findIndex(s => s.id === parent.id) + 1;
      displayName += ` (${index})`;
    }

    const careType = parent.custom_fields?.foster_care_type;
    if (careType) {
      const rel = parent.custom_fields?.relationship_to_child;
      if (careType === "C" && rel) {
        displayName += ` (${careType} - ${rel})`;
      } else {
        displayName += ` (${careType})`;
      }
    }

    return displayName;
  };

  // Pomocník pro formátování jména dítěte (odlišení duplicitních jmen v jedné rodině)
  const getChildDisplayName = (child: any) => {
    if (!child) return "";
    // Najdeme děti se stejným jménem ve stejné domácnosti (rodině)
    const duplicates = persons.filter(p =>
      p.role === "child" &&
      p.household_id === child.household_id &&
      p.first_name === child.first_name &&
      p.last_name === child.last_name
    );

    let displayName = `${child.first_name || ""} ${child.last_name || ""}`.trim();

    if (duplicates.length > 1) {
      // Očíslujeme je v závorce
      const sorted = [...duplicates].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
      const index = sorted.findIndex(s => s.id === child.id) + 1;
      displayName += ` (${index})`;
    }

    const careType = child.custom_fields?.foster_care_type;
    if (careType) {
      const rel = child.custom_fields?.relationship_to_foster_parent;
      if (careType === "C" && rel) {
        displayName += ` (${careType} - ${rel})`;
      } else {
        displayName += ` (${careType})`;
      }
    }

    return displayName;
  };

  // Pomocník pro zjištění, zda má pěstoun stejné příjmení jako jiné rodiny (pro zobrazení adresy pod jménem)
  const hasSurnameDuplicate = (lastName: string) => {
    if (!lastName) return false;
    const matches = persons.filter(p => p.role === "foster_parent" && p.last_name === lastName);
    return matches.length > 1;
  };

  // React/JSX renderování jména pěstouna s tooltipem typu péče
  const renderFosterParentName = (parent: any) => {
    if (!parent) return <span>Bez pěstouna</span>;
    const duplicates = persons.filter(p => 
      p.role === "foster_parent" && 
      p.last_name === parent.last_name
    );

    let baseName = `${parent.first_name || ""} ${parent.last_name || ""}`.trim();

    if (duplicates.length > 1) {
      const sorted = [...duplicates].sort((a, b) => {
        const nameCompare = (a.first_name || "").localeCompare(b.first_name || "", "cs-CZ");
        if (nameCompare !== 0) return nameCompare;
        return (a.id || "").localeCompare(b.id || "");
      });
      const index = sorted.findIndex(s => s.id === parent.id) + 1;
      baseName += ` (${index})`;
    }

    const careType = parent.custom_fields?.foster_care_type;
    if (careType) {
      const rel = parent.custom_fields?.relationship_to_child;
      const careText = careType === "C" && rel ? `${careType} - ${rel}` : careType;
      return (
        <span>
          {baseName}{" "}
          <span 
            className="cursor-help text-primary font-bold hover:underline" 
            title={getCareTypeDescription(careType)}
          >
            ({careText})
          </span>
        </span>
      );
    }

    return <span>{baseName}</span>;
  };

  // React/JSX renderování jména dítěte s tooltipem typu péče
  const renderChildName = (child: any) => {
    if (!child) return <span>Bez jména</span>;
    const duplicates = persons.filter(p =>
      p.role === "child" &&
      p.household_id === child.household_id &&
      p.first_name === child.first_name &&
      p.last_name === child.last_name
    );

    let baseName = `${child.first_name || ""} ${child.last_name || ""}`.trim();

    if (duplicates.length > 1) {
      const sorted = [...duplicates].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
      const index = sorted.findIndex(s => s.id === child.id) + 1;
      baseName += ` (${index})`;
    }

    const careType = child.custom_fields?.foster_care_type;
    if (careType) {
      const rel = child.custom_fields?.relationship_to_foster_parent;
      const careText = careType === "C" && rel ? `${careType} - ${rel}` : careType;
      return (
        <span>
          {baseName}{" "}
          <span 
            className="cursor-help text-primary font-bold hover:underline" 
            title={getCareTypeDescription(careType)}
          >
            ({careText})
          </span>
        </span>
      );
    }

    return <span>{baseName}</span>;
  };

  // Barevný tag typů péče
  const renderCareTypeBadge = (careType: string) => {
    if (careType === "A") {
      return (
        <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold uppercase tracking-wider">
          Dlouhodobá péče
        </span>
      );
    }
    if (careType === "B") {
      return (
        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold uppercase tracking-wider">
          Přechodná péče
        </span>
      );
    }
    if (careType === "C") {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
          Příbuzenská péče
        </span>
      );
    }
    return null;
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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
      
      {/* 1. ŠPIČKOVÝ SIDEBAR */}
      <aside className="w-64 bg-slate-950 flex flex-col border-r border-slate-900 shrink-0">
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
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-white shadow-md shadow-primary/25 font-medium transition-all">
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

      {/* Pravá pracovní oblast (Header + Obsah) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        
        {/* HLAVIČKA (HEADER) */}
        <header className="h-16 px-8 bg-card border-b border-border-custom flex items-center justify-between shrink-0 shadow-sm z-20 transition-colors">
          <div className="flex items-center gap-3">
            <Search className="w-4.5 h-4.5 text-muted" />
            <input 
              type="text" 
              placeholder="Vyhledat v systému..."
              className="bg-transparent border-none focus:outline-none text-sm text-foreground placeholder-muted w-64"
            />
          </div>
          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              title={darkMode ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
              className="p-2 text-muted hover:text-foreground hover:bg-slate-500/10 rounded-lg transition-all"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="w-px h-6 bg-border-custom" />
            {/* Profil a Avatar */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                {currentUserProfile?.first_name?.charAt(0) || "U"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {currentUserProfile ? `${currentUserProfile.first_name} ${currentUserProfile.last_name}` : "Uživatel"}
                </p>
                <p className="text-[9px] text-muted font-medium uppercase tracking-wider mt-0.5">
                  {currentUserProfile?.role || "worker"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Hlavní rozdělená plocha klientských spisů */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* 2. TABULKOVÝ SEZNAM RODIN */}
          <section className={`bg-background p-6 flex flex-col transition-all duration-300 overflow-hidden ${
            selectedFamilyId ? "w-[40%] min-w-[480px]" : "w-full"
          }`}>
            <div className="bg-card rounded-xl border border-border-custom shadow-sm flex flex-col flex-1 overflow-hidden transition-colors">
              {/* Hlavička tabulky */}
              <div className="p-5 border-b border-border-custom flex justify-between items-center bg-card shrink-0 transition-colors">
                <div>
                  <h3 className="font-bold text-lg text-foreground tracking-tight">Klientské spisy</h3>
                  <p className="text-xs text-muted mt-0.5">Celkem {households.length} domácností v evidenci</p>
                </div>
                <button className="p-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shadow-md shadow-primary/25">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Vyhledávací pole nad tabulkou */}
              <div className="p-4 border-b border-border-custom bg-card shrink-0 flex items-center gap-3 transition-colors">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
                  <input 
                    type="text" 
                    placeholder="Hledat rodinu, pěstouna..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border-custom rounded-lg text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              {/* Samotná tabulka */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-custom bg-slate-500/5 text-[11px] font-bold text-muted uppercase tracking-wider sticky top-0 z-10">
                      <th className="py-3 px-5">Pěstoun</th>
                      {!selectedFamilyId && <th className="py-3 px-5">Adresa</th>}
                      {!selectedFamilyId && <th className="py-3 px-5">Děti v péči</th>}
                      <th className="py-3 px-5 text-center">Stav</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom text-sm">
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
                          <tr 
                            key={h.id}
                            onClick={() => {
                              setSelectedFamilyId(h.id);
                              setActiveTab("overview");
                            }}
                            className={`cursor-pointer hover:bg-slate-500/5 transition-colors ${
                              selectedFamilyId === h.id ? "bg-primary/10 font-medium border-l-2 border-l-primary" : ""
                            }`}
                          >
                            {/* Pěstoun (Full name, index, care type badge) */}
                            <td className="py-3.5 px-5 text-sm text-foreground">
                              {p ? (
                                <div className="flex flex-col">
                                  <span className="font-bold flex items-center gap-1.5">
                                    {renderFosterParentName(p)}
                                  </span>
                                  {hasDup && pAddress && selectedFamilyId && (
                                    <span className="text-[10px] text-muted flex items-center gap-0.5 mt-0.5">
                                      <MapPin className="w-2.5 h-2.5 text-muted" />
                                      {pAddress.city}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted italic">Bez pěstouna</span>
                              )}
                            </td>

                            {/* Adresa (skrytá při split-screenu) */}
                            {!selectedFamilyId && (
                              <td className="py-3.5 px-5 text-xs text-foreground/80">
                                {pAddress ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium">{pAddress.street}</span>
                                    <span className="text-muted text-[11px] mt-0.5">{pAddress.city}</span>
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                            )}

                            {/* Děti (skrytá při split-screenu) */}
                            {!selectedFamilyId && (
                              <td className="py-3.5 px-5 text-xs text-foreground/80">
                                {children.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {children.map((ch) => (
                                      <span key={ch.id} className="inline-block bg-slate-500/5 px-2 py-0.5 rounded text-[11px] font-medium text-foreground border border-border-custom">
                                        {renderChildName(ch)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted italic text-[11px]">Bez dětí</span>
                                )}
                              </td>
                            )}

                            {/* Stav */}
                            <td className="py-3.5 px-5 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                h.status === "active" 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" 
                                  : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                              }`}>
                                {h.status === "active" ? "Aktivní" : "Zájemce"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 3. DETAILNÍ PANEL */}
          {selectedHousehold ? (
            <main className="w-[60%] flex-1 bg-background p-6 flex flex-col overflow-hidden border-l border-border-custom animate-in slide-in-from-right duration-200">
              <div className="bg-card rounded-xl border border-border-custom shadow-sm flex flex-col flex-1 overflow-hidden transition-colors">
                
                {/* Horní lišta detailu */}
                <div className="p-6 border-b border-border-custom flex items-center justify-between bg-card shrink-0 transition-colors">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-foreground">
                        {primaryFosterParent ? `Spis rodiny ${primaryFosterParent.last_name}ových` : "Detail spisu"}
                      </h3>
                      {primaryFosterParent?.custom_fields?.foster_care_type && 
                        renderCareTypeBadge(primaryFosterParent.custom_fields.foster_care_type)
                      }
                    </div>
                    <p className="text-xs text-muted mt-1 font-mono">
                      Evidenční kód: {selectedHousehold.foster_id} • Brno
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-background hover:bg-slate-500/10 text-foreground border border-border-custom rounded-lg text-xs font-semibold tracking-wide transition-colors">
                      PDF spis
                    </button>
                    <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-md shadow-primary/25">
                      Upravit
                    </button>
                    <div className="w-px h-6 bg-border-custom mx-1" />
                    <button 
                      onClick={() => setSelectedFamilyId(null)}
                      title="Zavřít detail rodiny"
                      className="p-2 text-muted hover:text-foreground hover:bg-slate-500/10 rounded-lg transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Záložková navigace */}
                <div className="bg-card border-b border-border-custom px-6 flex gap-6 shrink-0 transition-colors">
                  <button 
                    onClick={() => setActiveTab("overview")}
                    className={`py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === "overview" 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    Přehled rodiny
                  </button>
                  <button 
                    onClick={() => setActiveTab("timeline")}
                    className={`py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === "timeline" 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    Časová osa ({selectedFamilyEvents.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab("registry")}
                    className={`py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === "registry" 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    Dokumenty a registry
                  </button>
                </div>

                {/* Hlavní obsah detailu dle vybrané záložky */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-500/5 transition-colors">
                  
                  {/* TAB 1: PŘEHLED RODINY (JEDNOSLOU PCOVÝ - STACKED VERTICALLY) */}
                  {activeTab === "overview" && (
                    <div className="space-y-6">
                      
                      {/* Hlavní Pěstoun Card */}
                      <div className="bg-card p-5 rounded-xl border border-border-custom shadow-sm space-y-4 transition-colors">
                        <div className="flex items-center gap-4">
                          {primaryFosterParent?.custom_fields?.avatar_url ? (
                            <img 
                              src={primaryFosterParent.custom_fields.avatar_url} 
                              alt="avatar" 
                              className="w-14 h-14 rounded-full border border-border-custom object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xl">
                              {primaryFosterParent?.first_name?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h4 className="text-base font-bold text-foreground">
                              {renderFosterParentName(primaryFosterParent)}
                            </h4>
                            <p className="text-xs text-muted mt-0.5">Hlavní pěstoun domácnosti</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border-custom text-xs text-foreground transition-colors">
                          <div>
                            <span className="text-muted font-bold block uppercase text-[9px] tracking-wider">Profese:</span>
                            <span className="font-semibold block mt-0.5">{primaryFosterParent?.custom_fields?.profession || "Neuvedeno"}</span>
                          </div>
                          <div>
                            <span className="text-muted font-bold block uppercase text-[9px] tracking-wider">Aktuální adresa:</span>
                            {primaryParentAddress ? (
                              <div className="flex items-center justify-between bg-slate-500/5 px-2.5 py-1 rounded-lg border border-border-custom mt-1">
                                <span className="font-semibold text-foreground/90">
                                  {primaryParentAddress.street}, {primaryParentAddress.city}
                                </span>
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${primaryParentAddress.street}, ${primaryParentAddress.city}`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Google Maps"
                                  className="text-primary hover:text-primary-hover p-1 hover:bg-slate-500/10 rounded"
                                >
                                  <Map className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-muted italic block mt-0.5">Neuvedena</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Děti v pěstounské péči (STACKED VERTICALLY - JEDNOSLOU PCOVÉ) */}
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider pl-1">Děti v pěstounské péči (PP)</h4>
                        {fosterChildren.map((child) => (
                          <div key={child.id} className="bg-card p-5 rounded-xl border border-border-custom shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                            <div className="flex items-center gap-3.5">
                              {child.custom_fields?.avatar_url ? (
                                <img 
                                  src={child.custom_fields.avatar_url} 
                                  alt="child" 
                                  className="w-11 h-11 rounded-full object-cover border border-border-custom"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
                                  {child.first_name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-bold text-foreground">{renderChildName(child)}</p>
                                <div className="flex gap-2 items-center text-[11px] text-muted mt-0.5">
                                  <span>Věk: {new Date().getFullYear() - new Date(child.birth_date).getFullYear()} let</span>
                                  <span>•</span>
                                  <span>Záliby: {child.custom_fields?.hobby || "Neuvedeno"}</span>
                                </div>
                                <p className="text-[11px] text-muted mt-0.5">Škola: {child.custom_fields?.school || "Neuvedeno"}</p>
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-end gap-2 sm:gap-1.5 w-full sm:w-auto justify-between sm:justify-start border-t sm:border-t-0 border-border-custom pt-2 sm:pt-0 shrink-0">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${
                                child.safety_rating === "A" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" :
                                child.safety_rating === "B" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" : 
                                "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                              }`}>
                                Rating {child.safety_rating}
                              </span>
                            </div>
                          </div>
                        ))}
                        {fosterChildren.length === 0 && (
                          <p className="text-xs text-muted italic pl-1">V této rodině nejsou žádné děti v PP.</p>
                        )}
                      </div>

                      {/* Rodinné vazby a biologické kontakty (STACKED VERTICALLY - JEDNOSLOU PCOVÉ) */}
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider pl-1">Rodinné vazby a biologické kontakty</h4>
                        
                        {/* Ostatní členové domácnosti (např. biologické děti pěstouna) */}
                        {otherMembers.map((member) => (
                          <div key={member.id} className="bg-card p-4 rounded-xl border border-border-custom shadow-sm flex items-center justify-between transition-colors">
                            <div className="flex items-center gap-3">
                              {member.custom_fields?.avatar_url ? (
                                <img src={member.custom_fields.avatar_url} alt="avatar" className="w-9 h-9 rounded-full object-cover border border-border-custom" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-500/10 text-foreground flex items-center justify-center font-bold text-xs">
                                  {member.first_name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-semibold text-foreground">{member.first_name} {member.last_name}</p>
                                <p className="text-[10px] text-muted mt-0.5">Člen domácnosti</p>
                              </div>
                            </div>
                            <span className="text-[10px] bg-slate-500/10 px-2 py-0.5 rounded text-foreground font-semibold">
                              {member.custom_fields?.relationship_to_child || "Člen rodiny"}
                            </span>
                          </div>
                        ))}

                        {/* Biologičtí rodiče */}
                        {biologicalParents.map((bio) => (
                          <div 
                            key={bio.id} 
                            className={`bg-card p-4 rounded-xl border shadow-sm flex items-center justify-between transition-colors ${
                              bio.safety_rating === "Z" 
                                ? "border-red-200 dark:border-red-500/30" 
                                : "border-border-custom"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-500/10 flex items-center justify-center font-bold text-xs text-foreground">
                                {bio.first_name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{bio.first_name} {bio.last_name}</p>
                                <p className="text-[10px] text-muted mt-0.5">
                                  Biologický rodič • Rating {bio.safety_rating}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              {bio.safety_rating === "Z" ? (
                                <span className="px-2 py-0.5 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 text-[9px] font-bold uppercase tracking-wide rounded border border-red-200">
                                  Styk zakázán
                                </span>
                              ) : (
                                <span className="text-xs font-mono text-foreground font-medium">{bio.phone || "Bez tel."}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ČASOVÁ OSA */}
                  {activeTab === "timeline" && (
                    <div className="bg-card p-6 rounded-xl border border-border-custom shadow-sm space-y-4 transition-colors">
                      <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Historie klientských kontaktů</h4>
                      {selectedFamilyEvents.length > 0 ? (
                        <div className="relative border-l-2 border-slate-500/25 ml-3 pl-6 space-y-6">
                          {selectedFamilyEvents.map((e) => (
                            <div key={e.id} className="relative animate-in fade-in duration-200">
                              <div className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-card ${
                                e.type === "crisis_event" ? "bg-red-500" : "bg-primary"
                              }`} />
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <h5 className="font-bold text-sm text-foreground">{e.title}</h5>
                                  <p className="text-xs text-muted mt-1 leading-relaxed max-w-2xl">
                                    {e.payload?.content || e.payload?.text || "Bez textu"}
                                  </p>
                                </div>
                                <span className="text-[10px] text-muted font-medium whitespace-nowrap">
                                  {new Date(e.occurred_at).toLocaleDateString("cs-CZ")}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted italic pl-1">Zatím žádné události.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 3: DOKUMENTY A REGISTRY */}
                  {activeTab === "registry" && (
                    <div className="space-y-6">
                      {/* Vzdělávání */}
                      <div className="bg-card p-5 rounded-xl border border-border-custom shadow-sm space-y-4 transition-colors">
                        <h4 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                          <GraduationCap className="w-4.5 h-4.5 text-primary" />
                          Evidence vzdělávání
                        </h4>
                        <div className="divide-y divide-border-custom">
                          {fosterChildren.map((child) => (
                            <div key={child.id} className="py-3 first:pt-0 last:pb-0 flex justify-between items-center text-xs text-foreground">
                              <div>
                                <span className="font-bold block">{child.first_name} {child.last_name}</span>
                                <span className="text-muted mt-0.5 block">{child.custom_fields?.school || "ZŠ Merhautova Brno"}</span>
                              </div>
                              <div className="text-right">
                                <span className="block font-medium">Třída: 6.A</span>
                                <span className="text-[10px] text-muted block mt-0.5">Třídní učitel: Mgr. Kateřina Novotná</span>
                              </div>
                            </div>
                          ))}
                          {fosterChildren.length === 0 && (
                            <p className="text-xs text-muted italic">V této rodině nejsou školní děti.</p>
                          )}
                        </div>
                      </div>

                      {/* Zdraví */}
                      <div className="bg-card p-5 rounded-xl border border-border-custom shadow-sm space-y-4 transition-colors">
                        <h4 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                          <Stethoscope className="w-4.5 h-4.5 text-primary" />
                          Zdravotní a fyziologické údaje
                        </h4>
                        <div className="space-y-3">
                          {fosterChildren.map((child) => (
                            <div key={child.id} className="p-3.5 bg-slate-500/5 rounded-lg border border-border-custom space-y-2 text-xs text-foreground transition-colors">
                              <span className="font-bold block border-b border-border-custom pb-1">
                                {child.first_name} {child.last_name}
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                <p><span className="text-muted font-medium">Pediatr:</span> MUDr. Josef Fiala</p>
                                <p><span className="text-muted font-medium">Pojišťovna:</span> 111 (VZP)</p>
                                <p className="col-span-2"><span className="text-muted font-medium">Léky:</span> Bez pravidelné medikace</p>
                                <p className="col-span-2"><span className="text-muted font-medium">Měření:</span> 142 cm / 35 kg</p>
                              </div>
                            </div>
                          ))}
                          {fosterChildren.length === 0 && (
                            <p className="text-xs text-muted italic">Žádné zdravotní údaje.</p>
                          )}
                        </div>
                      </div>

                      {/* DMS */}
                      <div className="bg-card p-5 rounded-xl border border-border-custom shadow-sm space-y-4 transition-colors">
                        <h4 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                          <FileText className="w-4.5 h-4.5 text-primary" />
                          DMS - Naskenované spisy a smlouvy
                        </h4>
                        <div className="space-y-2">
                          {[
                            { name: "Dohoda o doprovázení pěstounské rodiny.pdf", size: "2.4 MB", date: "15.01.2025" },
                            { name: "IPOD - Individuální plán ochrany dítěte.pdf", size: "1.8 MB", date: "22.02.2025" },
                            { name: "Soudní rozhodnutí o svěření do péče.pdf", size: "4.1 MB", date: "10.12.2024" },
                            { name: "GDPR Souhlas se zpracováním údajů.pdf", size: "950 KB", date: "15.01.2025" }
                          ].map((doc, dIdx) => (
                            <div key={dIdx} className="p-3 bg-slate-500/5 hover:bg-slate-500/10 rounded-lg flex justify-between items-center transition-all text-xs transition-colors">
                              <div className="flex items-center gap-2.5">
                                <FileText className="w-4 h-4 text-muted shrink-0" />
                                <div>
                                  <span className="font-semibold text-foreground block">{doc.name}</span>
                                  <span className="text-[10px] text-muted block mt-0.5">Nahráno: {doc.date} • {doc.size}</span>
                                </div>
                              </div>
                              <button className="p-1.5 hover:bg-slate-500/15 rounded text-muted hover:text-foreground transition-colors">
                                <FileDown className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* AI COMMAND CENTER */}
                <div className="p-5 border-t border-border-custom bg-card shrink-0 transition-colors">
                  <div className="max-w-4xl mx-auto relative flex items-center">
                    <Sparkles className="absolute left-4 w-5 h-5 text-primary" />
                    <input 
                      type="text" 
                      placeholder="Zeptejte se AI na cokoliv ze spisu rodiny..."
                      className="w-full pl-12 pr-24 py-3 bg-background border border-border-custom rounded-xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                    />
                    <button className="absolute right-3 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold tracking-wide flex items-center gap-1 transition-colors shadow-sm">
                      Položit dotaz
                    </button>
                  </div>
                </div>
              </div>
            </main>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted italic bg-background transition-colors">
              Vyberte klientský spis z tabulky pro zobrazení detailu rodiny.
            </div>
          )}
        </div>
      </div>
    </div>
  );

}