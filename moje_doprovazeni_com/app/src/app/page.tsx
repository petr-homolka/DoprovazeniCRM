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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [careTypeFilter, setCareTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");

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
        <span className="px-2.5 py-1 rounded bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold uppercase tracking-wider">
          Dlouhodobá péče
        </span>
      );
    }
    if (careType === "B") {
      return (
        <span className="px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold uppercase tracking-wider">
          Přechodná péče
        </span>
      );
    }
    if (careType === "C") {
      return (
        <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold uppercase tracking-wider">
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

  // Filtrování a řazení rodin
  const getFilteredAndSortedHouseholds = () => {
    return households
      .filter(h => {
        // 1. Vyhledávací dotaz
        const p = persons.find(per => per.household_id === h.id && per.role === "foster_parent");
        const c = persons.filter(per => per.household_id === h.id && per.role === "child");
        const childNames = c.map(ch => `${ch.first_name || ""} ${ch.last_name || ""}`).join(" ");
        const parentName = p ? `${p.first_name || ""} ${p.last_name || ""}` : "";
        
        const matchesSearch = 
          parentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
          childNames.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (h.foster_id || "").toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        // 2. Filtr podle stavu
        if (statusFilter !== "all") {
          if (statusFilter === "active" && h.status !== "active") return false;
          if (statusFilter === "applicant" && h.status !== "applicant") return false;
        }

        // 3. Filtr podle typu péče
        if (careTypeFilter !== "all") {
          const fosterCareType = p?.custom_fields?.foster_care_type;
          if (fosterCareType !== careTypeFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const pA = persons.find(per => per.household_id === a.id && per.role === "foster_parent");
        const pB = persons.find(per => per.household_id === b.id && per.role === "foster_parent");
        
        if (sortBy === "name") {
          const nameA = pA ? `${pA.last_name || ""} ${pA.first_name || ""}` : "";
          const nameB = pB ? `${pB.last_name || ""} ${pB.first_name || ""}` : "";
          return nameA.localeCompare(nameB, "cs-CZ");
        }
        
        if (sortBy === "address") {
          const addrA = pA ? addresses.find(add => add.person_id === pA.id) : null;
          const addrB = pB ? addresses.find(add => add.person_id === pB.id) : null;
          const cityA = addrA?.city || "";
          const cityB = addrB?.city || "";
          return cityA.localeCompare(cityB, "cs-CZ");
        }
        
        if (sortBy === "children_count") {
          const countA = persons.filter(per => per.household_id === a.id && per.role === "child").length;
          const countB = persons.filter(per => per.household_id === b.id && per.role === "child").length;
          return countB - countA; // Sestupně
        }

        if (sortBy === "status") {
          const statusA = a.status || "";
          const statusB = b.status || "";
          return statusA.localeCompare(statusB);
        }

        return 0;
      });
  };

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

              {/* Vyhledávací a filtrační ovládací panel nad tabulkou */}
              <div className="p-4 border-b border-border-custom bg-card shrink-0 space-y-3 transition-colors">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-muted" />
                  <input 
                    type="text" 
                    placeholder="Hledat rodinu, pěstouna..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border-custom rounded-lg text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                
                {/* Filters & Sorting Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Stav</label>
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-2 py-1.5 bg-background border border-border-custom rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">Všechny stavy</option>
                      <option value="active">Aktivní</option>
                      <option value="applicant">Zájemci</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Typ péče</label>
                    <select 
                      value={careTypeFilter}
                      onChange={(e) => setCareTypeFilter(e.target.value)}
                      className="w-full px-2 py-1.5 bg-background border border-border-custom rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">Všechny typy</option>
                      <option value="A">Dlouhodobá (A)</option>
                      <option value="B">Přechodná (B)</option>
                      <option value="C">Příbuzenská (C)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Řadit podle</label>
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-2 py-1.5 bg-background border border-border-custom rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="name">Jména (A-Z)</option>
                      <option value="address">Města / Obce</option>
                      <option value="children_count">Počtu dětí</option>
                      <option value="status">Stavu spisu</option>
                    </select>
                  </div>
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
                    {getFilteredAndSortedHouseholds()
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
                            className={`cursor-pointer hover:bg-slate-500/8 transition-colors ${
                              selectedFamilyId === h.id ? "bg-primary/10 font-semibold border-l-4 border-l-primary" : ""
                            }`}
                          >
                            {/* Pěstoun (Full name, index, care type badge) */}
                            <td className="py-4.5 px-6 text-foreground">
                              {p ? (
                                <div className="flex flex-col">
                                  <span className="text-base font-bold flex items-center gap-1.5 text-foreground leading-tight">
                                    {renderFosterParentName(p)}
                                  </span>
                                  {hasDup && pAddress && selectedFamilyId && (
                                    <span className="text-xs text-muted flex items-center gap-1 mt-1 font-medium">
                                      <MapPin className="w-3.5 h-3.5 text-muted" />
                                      {pAddress.city}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted italic">Bez pěstouna</span>
                              )}
                            </td>

                            {/* Adresa (skrytá při split-screenu) */}
                            {!selectedFamilyId && (
                              <td className="py-4.5 px-6 text-sm text-foreground/80">
                                {pAddress ? (
                                  <div className="flex flex-col space-y-0.5">
                                    <span className="font-semibold">{pAddress.street}</span>
                                    <span className="text-muted text-xs font-medium">{pAddress.city}</span>
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                            )}

                            {/* Děti (skrytá při split-screenu) */}
                            {!selectedFamilyId && (
                              <td className="py-4.5 px-6 text-sm text-foreground/80">
                                {children.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {children.map((ch) => (
                                      <span key={ch.id} className="inline-block bg-slate-500/5 px-2.5 py-1 rounded-lg text-xs font-semibold text-foreground border border-border-custom/50 shadow-2xs">
                                        {renderChildName(ch)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted italic text-xs">Bez dětí</span>
                                )}
                              </td>
                            )}

                            {/* Stav */}
                            <td className="py-4.5 px-6 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase border ${
                                h.status === "active" 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" 
                                  : "bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
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
              <div className="bg-card rounded-2xl border border-border-custom/50 shadow-sm flex flex-col flex-1 overflow-hidden transition-colors">
                
                {/* Horní lišta detailu */}
                <div className="p-6 border-b border-border-custom flex items-center justify-between bg-card shrink-0 transition-colors">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-foreground tracking-tight">
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
                    <button className="px-5 py-2.5 bg-background hover:bg-slate-500/10 text-foreground border border-border-custom rounded-xl text-sm font-semibold tracking-wide transition-all duration-200">
                      PDF spis
                    </button>
                    <button className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 shadow-md shadow-primary/25">
                      Upravit
                    </button>
                    <div className="w-px h-6 bg-border-custom mx-1" />
                    <button 
                      onClick={() => setSelectedFamilyId(null)}
                      title="Zavřít detail rodiny"
                      className="p-2 text-muted hover:text-foreground hover:bg-slate-500/10 rounded-lg transition-all"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Záložková navigace */}
                <div className="bg-card border-b border-border-custom px-6 flex gap-6 shrink-0 transition-colors">
                  <button 
                    onClick={() => setActiveTab("overview")}
                    className={`py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === "overview" 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    Přehled rodiny
                  </button>
                  <button 
                    onClick={() => setActiveTab("timeline")}
                    className={`py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === "timeline" 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    Časová osa ({selectedFamilyEvents.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab("registry")}
                    className={`py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === "registry" 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    Dokumenty a registry
                  </button>
                </div>

                {/* Hlavní obsah detailu dle vybrané záložky */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-500/3 transition-colors">
                  
                  {/* TAB 1: PŘEHLED RODINY (JEDNOSLOU PCOVÝ - STACKED VERTICALLY) */}
                  {activeTab === "overview" && (
                    <div className="space-y-8">
                      
                      {/* Hlavní Pěstoun Block */}
                      <div className="bg-slate-500/5 dark:bg-slate-500/10 p-6 rounded-2xl space-y-6 transition-colors">
                        <div className="flex items-center gap-5">
                          {primaryFosterParent?.custom_fields?.avatar_url ? (
                            <img 
                              src={primaryFosterParent.custom_fields.avatar_url} 
                              alt="avatar" 
                              className="w-18 h-18 rounded-full border border-border-custom object-cover"
                            />
                          ) : (
                            <div className="w-18 h-18 rounded-full bg-primary/15 text-primary border border-primary/20 flex items-center justify-center font-bold text-2xl shadow-sm">
                              {primaryFosterParent?.first_name?.charAt(0) || "P"}
                            </div>
                          )}
                          <div>
                            <h4 className="text-xl font-extrabold text-foreground tracking-tight">
                              {renderFosterParentName(primaryFosterParent)}
                            </h4>
                            <p className="text-sm text-muted mt-1">Hlavní pěstoun domácnosti</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 border-t border-border-custom/50 text-sm text-foreground transition-colors">
                          <div>
                            <span className="text-muted font-bold block uppercase text-xs tracking-wider mb-1">Profese:</span>
                            <span className="font-semibold text-foreground/90">{primaryFosterParent?.custom_fields?.profession || "Neuvedeno"}</span>
                          </div>
                          <div>
                            <span className="text-muted font-bold block uppercase text-xs tracking-wider mb-1">Aktuální adresa:</span>
                            {primaryParentAddress ? (
                              <div className="flex items-center justify-between bg-card px-4 py-2 rounded-xl border border-border-custom/40 mt-1 shadow-xs">
                                <span className="font-semibold text-foreground/90">
                                  {primaryParentAddress.street}, {primaryParentAddress.city}
                                </span>
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${primaryParentAddress.street}, ${primaryParentAddress.city}`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Google Maps"
                                  className="text-primary hover:text-primary-hover p-1.5 hover:bg-slate-500/10 rounded-lg transition-colors"
                                >
                                  <Map className="w-4.5 h-4.5" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-muted italic block mt-1">Neuvedena</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Děti v pěstounské péči (STACKED VERTICALLY - JEDNOSLOU PCOVÉ) */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-muted uppercase tracking-wider pl-1">Děti v pěstounské péči (PP)</h4>
                        {fosterChildren.map((child) => (
                          <div key={child.id} className="bg-slate-500/5 dark:bg-slate-500/10 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 transition-all hover:bg-slate-500/8 dark:hover:bg-slate-500/15">
                            <div className="flex items-center gap-4">
                              {child.custom_fields?.avatar_url ? (
                                <img 
                                  src={child.custom_fields.avatar_url} 
                                  alt="child" 
                                  className="w-14 h-14 rounded-full object-cover border border-border-custom"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-primary/15 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg shadow-sm">
                                  {child.first_name?.charAt(0) || "D"}
                                </div>
                              )}
                              <div className="space-y-1">
                                <p className="text-base font-bold text-foreground">{renderChildName(child)}</p>
                                <div className="flex gap-3 items-center text-xs text-muted">
                                  <span>Věk: {child.birth_date ? new Date().getFullYear() - new Date(child.birth_date).getFullYear() : "?"} let</span>
                                  <span>•</span>
                                  <span>Záliby: {child.custom_fields?.hobby || "Neuvedeno"}</span>
                                </div>
                                <p className="text-xs text-muted">Škola: {child.custom_fields?.school || "Neuvedeno"}</p>
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-end gap-2 sm:gap-2 w-full sm:w-auto justify-between sm:justify-start border-t sm:border-t-0 border-border-custom/30 pt-3 sm:pt-0 shrink-0">
                              <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border ${
                                child.safety_rating === "A" ? "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" :
                                child.safety_rating === "B" ? "bg-blue-50 text-blue-700 border-blue-250 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" : 
                                "bg-red-50 text-red-700 border-red-250 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                              }`}>
                                Hodnocení {child.safety_rating}
                              </span>
                            </div>
                          </div>
                        ))}
                        {fosterChildren.length === 0 && (
                          <p className="text-sm text-muted italic pl-1">V této rodině nejsou žádné děti v PP.</p>
                        )}
                      </div>

                      {/* Rodinné vazby a biologické kontakty (STACKED VERTICALLY - JEDNOSLOU PCOVÉ) */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-muted uppercase tracking-wider pl-1">Rodinné vazby a biologické kontakty</h4>
                        
                        {/* Ostatní členové domácnosti (např. biologické děti pěstouna) */}
                        {otherMembers.map((member) => (
                          <div key={member.id} className="bg-slate-500/5 dark:bg-slate-500/10 p-5 rounded-2xl flex items-center justify-between transition-all hover:bg-slate-500/8 dark:hover:bg-slate-500/15">
                            <div className="flex items-center gap-4">
                              {member.custom_fields?.avatar_url ? (
                                <img src={member.custom_fields.avatar_url} alt="avatar" className="w-12 h-12 rounded-full object-cover border border-border-custom" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-slate-500/15 text-foreground flex items-center justify-center font-bold text-base shadow-sm">
                                  {member.first_name?.charAt(0) || "M"}
                                </div>
                              )}
                              <div>
                                <p className="text-base font-semibold text-foreground">{member.first_name} {member.last_name}</p>
                                <p className="text-xs text-muted mt-0.5">Člen domácnosti</p>
                              </div>
                            </div>
                            <span className="text-xs bg-slate-500/15 px-3 py-1 rounded-full text-foreground font-bold">
                              {member.custom_fields?.relationship_to_child || "Člen rodiny"}
                            </span>
                          </div>
                        ))}

                        {/* Biologičtí rodiče */}
                        {biologicalParents.map((bio) => (
                          <div 
                            key={bio.id} 
                            className={`p-5 rounded-2xl flex items-center justify-between transition-all ${
                              bio.safety_rating === "Z" 
                                ? "bg-red-500/5 hover:bg-red-500/8 dark:bg-red-500/10 dark:hover:bg-red-500/15 border border-red-550/20" 
                                : "bg-slate-500/5 hover:bg-slate-500/8 dark:bg-slate-500/10 dark:hover:bg-slate-500/15 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-slate-500/15 flex items-center justify-center font-bold text-base text-foreground shadow-sm">
                                {bio.first_name?.charAt(0) || "B"}
                              </div>
                              <div>
                                <p className="text-base font-semibold text-foreground">{bio.first_name} {bio.last_name}</p>
                                <p className="text-xs text-muted mt-0.5">
                                  Biologický rodič • Hodnocení {bio.safety_rating}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              {bio.safety_rating === "Z" ? (
                                <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 text-xs font-extrabold uppercase tracking-wider rounded-full border border-red-200 dark:border-red-500/30">
                                  Styk zakázán
                                </span>
                              ) : (
                                <span className="text-sm font-mono text-foreground font-semibold bg-card px-3 py-1.5 rounded-lg border border-border-custom/40 shadow-xs">{bio.phone || "Bez tel."}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ČASOVÁ OSA */}
                  {activeTab === "timeline" && (
                    <div className="bg-slate-500/5 dark:bg-slate-500/10 p-6 rounded-2xl space-y-6 transition-colors">
                      <h4 className="text-xs font-bold text-muted uppercase tracking-wider pl-1">Historie klientských kontaktů</h4>
                      {selectedFamilyEvents.length > 0 ? (
                        <div className="relative border-l-2 border-primary/20 ml-3 pl-6 space-y-6">
                          {selectedFamilyEvents.map((e) => (
                            <div key={e.id} className="relative animate-in fade-in duration-200">
                              <div className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-card ${
                                e.type === "crisis_event" ? "bg-red-500" : "bg-primary"
                              }`} />
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <h5 className="font-bold text-base text-foreground leading-tight">{e.title}</h5>
                                  <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-2xl">
                                    {e.payload?.content || e.payload?.text || "Bez textu"}
                                  </p>
                                </div>
                                <span className="text-xs text-muted font-bold whitespace-nowrap bg-card px-2.5 py-1 rounded-md border border-border-custom/40 shadow-2xs">
                                  {new Date(e.occurred_at).toLocaleDateString("cs-CZ")}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted italic pl-1">Zatím žádné události.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 3: DOKUMENTY A REGISTRY */}
                  {activeTab === "registry" && (
                    <div className="space-y-6">
                      {/* Vzdělávání */}
                      <div className="bg-slate-500/5 dark:bg-slate-500/10 p-6 rounded-2xl space-y-5 transition-colors">
                        <h4 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2 pl-1">
                          <GraduationCap className="w-5 h-5 text-primary" />
                          Evidence vzdělávání
                        </h4>
                        <div className="divide-y divide-border-custom/50">
                          {fosterChildren.map((child) => (
                            <div key={child.id} className="py-4.5 first:pt-0 last:pb-0 flex justify-between items-center text-sm text-foreground">
                              <div>
                                <span className="font-bold text-base block">{child.first_name} {child.last_name}</span>
                                <span className="text-muted mt-1 block text-xs font-semibold">{child.custom_fields?.school || "ZŠ Merhautova Brno"}</span>
                              </div>
                              <div className="text-right">
                                <span className="block font-bold text-primary">Třída: 6.A</span>
                                <span className="text-xs text-muted block mt-1">Třídní učitel: Mgr. Kateřina Novotná</span>
                              </div>
                            </div>
                          ))}
                          {fosterChildren.length === 0 && (
                            <p className="text-sm text-muted italic pl-1">V této rodině nejsou školní děti.</p>
                          )}
                        </div>
                      </div>

                      {/* Zdraví */}
                      <div className="bg-slate-500/5 dark:bg-slate-500/10 p-6 rounded-2xl space-y-5 transition-colors">
                        <h4 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2 pl-1">
                          <Stethoscope className="w-5 h-5 text-primary" />
                          Zdravotní a fyziologické údaje
                        </h4>
                        <div className="space-y-4">
                          {fosterChildren.map((child) => (
                            <div key={child.id} className="p-5 bg-card rounded-2xl border border-border-custom/40 space-y-3.5 text-sm text-foreground transition-colors shadow-2xs">
                              <span className="font-extrabold text-base block border-b border-border-custom/50 pb-2">
                                {child.first_name} {child.last_name}
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <p><span className="text-muted font-bold text-xs uppercase tracking-wider mr-1 block sm:inline">Pediatr:</span> <span className="font-semibold">MUDr. Josef Fiala</span></p>
                                <p><span className="text-muted font-bold text-xs uppercase tracking-wider mr-1 block sm:inline">Pojišťovna:</span> <span className="font-semibold">111 (VZP)</span></p>
                                <p className="col-span-1 sm:col-span-2"><span className="text-muted font-bold text-xs uppercase tracking-wider mr-1 block sm:inline">Léky:</span> <span className="font-semibold">Bez pravidelné medikace</span></p>
                                <p className="col-span-1 sm:col-span-2"><span className="text-muted font-bold text-xs uppercase tracking-wider mr-1 block sm:inline">Měření:</span> <span className="font-semibold">142 cm / 35 kg</span></p>
                              </div>
                            </div>
                          ))}
                          {fosterChildren.length === 0 && (
                            <p className="text-sm text-muted italic pl-1">Žádné zdravotní údaje.</p>
                          )}
                        </div>
                      </div>

                      {/* DMS */}
                      <div className="bg-slate-500/5 dark:bg-slate-500/10 p-6 rounded-2xl space-y-5 transition-colors">
                        <h4 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2 pl-1">
                          <FileText className="w-5 h-5 text-primary" />
                          DMS - Naskenované spisy a smlouvy
                        </h4>
                        <div className="space-y-3">
                          {[
                            { name: "Dohoda o doprovázení pěstounské rodiny.pdf", size: "2.4 MB", date: "15.01.2025" },
                            { name: "IPOD - Individuální plán ochrany dítěte.pdf", size: "1.8 MB", date: "22.02.2025" },
                            { name: "Soudní rozhodnutí o svěření do péče.pdf", size: "4.1 MB", date: "10.12.2024" },
                            { name: "GDPR Souhlas se zpracováním údajů.pdf", size: "950 KB", date: "15.01.2025" }
                          ].map((doc, dIdx) => (
                            <div key={dIdx} className="p-4 bg-card hover:bg-slate-500/5 rounded-2xl border border-border-custom/40 flex justify-between items-center transition-all text-sm transition-colors shadow-2xs">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-muted shrink-0" />
                                <div>
                                  <span className="font-bold text-foreground block">{doc.name}</span>
                                  <span className="text-xs text-muted block mt-1 font-medium">Nahráno: {doc.date} • {doc.size}</span>
                                </div>
                              </div>
                              <button className="p-2 hover:bg-slate-500/15 rounded-lg text-muted hover:text-foreground transition-colors border border-border-custom/30 shadow-2xs">
                                <FileDown className="w-4.5 h-4.5" />
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