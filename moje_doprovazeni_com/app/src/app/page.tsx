"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Calendar, 
  MapPin, 
  Activity, 
  FileText, 
  Sparkles, 
  LogOut, 
  Map, 
  X, 
  FileDown, 
  GraduationCap, 
  Stethoscope, 
  Sun, 
  Moon,
  Star,
  Settings,
  Edit2,
  Trash2,
  ChevronLeft,
  Filter,
  Check,
  Building2,
  Menu,
  User,
  Briefcase,
  Mail,
  Phone
} from "lucide-react";
import { supabase } from "../lib/supabase";

// Mappings matching Czech household states and care types
const ALL_STATUSES = [
  { key: "active", label: "Aktivní", colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
  { key: "applicant", label: "Zájemce", colorClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  { key: "preparation", label: "V přípravě", colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
  { key: "paused", label: "Pozastavený", colorClass: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" },
  { key: "terminated", label: "Ukončený", colorClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20" },
  { key: "excluded", label: "Vyřazený", colorClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
  { key: "rejected", label: "Odmítnutý", colorClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20" },
  { key: "lead", label: "Zájemce", colorClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" }
];

const CARE_TYPE_MAP: Record<string, { label: string, colorClass: string }> = {
  A: { label: "A | Dlouhodobá", colorClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-450" },
  B: { label: "B | Přechodná", colorClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-450" },
  C: { label: "C | Nezprostředkovaná", colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-450" }
};

export default function Home() {
  // Session / Auth state
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Database lists
  const [households, setHouseholds] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("name");

  // Multi-checkbox filtering states
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    "active", "applicant", "preparation", "paused", "terminated", "lead"
  ]);
  const [selectedCareTypes, setSelectedCareTypes] = useState<string[]>(["A", "B", "C"]);

  // Gmail-style row interaction states
  const [starredHouseholds, setStarredHouseholds] = useState<Set<string>>(new Set());
  const [checkedHouseholds, setCheckedHouseholds] = useState<Set<string>>(new Set());

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sync dark mode
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

  // Auth synchronization on mount
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

  // Fetch Supabase data
  const fetchProfileAndData = async (userId: string) => {
    setLoading(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Chyba při načítání profilu:", profileError);
      } else if (profile) {
        setCurrentUserProfile(profile);

        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.organization_id)
          .single();

        if (orgError) {
          console.error("Chyba při načítání organizace:", orgError);
        } else if (org) {
          // Dynamic CSS variable overrides
          document.documentElement.style.setProperty("--primary-color", org.primary_color || "#1a73e8");
          document.documentElement.style.setProperty("--secondary-color", org.secondary_color || "#001d35");
        }
      }

      const { data: householdsData, error: hError } = await supabase
        .from("households")
        .select("*");
      
      if (hError) throw hError;
      setHouseholds(householdsData || []);

      if (householdsData && householdsData.length > 0) {
        setSelectedFamilyId(householdsData[0].id);
      }

      const { data: personsData, error: pError } = await supabase
        .from("persons")
        .select("*");
      if (pError) throw pError;
      setPersons(personsData || []);

      const { data: addressesData, error: aError } = await supabase
        .from("person_addresses")
        .select("*");
      if (aError) throw aError;
      setAddresses(addressesData || []);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ==========================================
  // HELPERS AND BUSINESS LOGIC (No semibold/extrabold)
  // ==========================================

  const getCareTypeDescription = (type: string) => {
    if (type === "A") return "Dlouhodobá zprostředkovaná pěstounská péče";
    if (type === "B") return "Přechodná zprostředkovaná pěstounská péče";
    if (type === "C") return "Nezprostředkovaná příbuzenská pěstounská péče";
    return "";
  };

  const getFosterParentDisplayName = (parent: any) => {
    if (!parent) return "";
    const duplicates = persons.filter(p => 
      p.role === "foster_parent" && 
      p.last_name === parent.last_name
    );

    let displayName = `${parent.first_name || ""} ${parent.last_name || ""}`.trim();

    if (duplicates.length > 1) {
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

  const getChildDisplayName = (child: any) => {
    if (!child) return "";
    const duplicates = persons.filter(p =>
      p.role === "child" &&
      p.household_id === child.household_id &&
      p.first_name === child.first_name &&
      p.last_name === child.last_name
    );

    let displayName = `${child.first_name || ""} ${child.last_name || ""}`.trim();

    if (duplicates.length > 1) {
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

  const hasSurnameDuplicate = (lastName: string) => {
    if (!lastName) return false;
    const matches = persons.filter(p => p.role === "foster_parent" && p.last_name === lastName);
    return matches.length > 1;
  };

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
        <span className="font-medium">
          {baseName}{" "}
          <span 
            className="cursor-help text-primary hover:underline font-medium text-xs ml-1" 
            title={getCareTypeDescription(careType)}
          >
            ({careText})
          </span>
        </span>
      );
    }

    return <span className="font-medium">{baseName}</span>;
  };

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
        <span className="font-medium">
          {baseName}{" "}
          <span 
            className="cursor-help text-primary hover:underline font-medium text-xs ml-1" 
            title={getCareTypeDescription(careType)}
          >
            ({careText})
          </span>
        </span>
      );
    }

    return <span className="font-medium">{baseName}</span>;
  };

  const renderCareTypeBadge = (careType: string) => {
    const data = CARE_TYPE_MAP[careType];
    if (!data) return null;
    return (
      <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium tracking-wide uppercase ${data.colorClass}`}>
        {data.label}
      </span>
    );
  };

  // Safe status fetcher
  const getStatusObj = (status: string) => {
    const currentStatus = status || "lead";
    const statusObj = ALL_STATUSES.find(s => s.key === currentStatus);
    return statusObj || { label: currentStatus, colorClass: "bg-slate-100 text-slate-700 border-slate-300" };
  };

  // ==========================================
  // FILTERS & CHECKS HANDLERS
  // ==========================================

  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const toggleCareTypeFilter = (careType: string) => {
    setSelectedCareTypes(prev => 
      prev.includes(careType) 
        ? prev.filter(ct => ct !== careType) 
        : [...prev, careType]
    );
  };

  const toggleStarredHousehold = (id: string) => {
    setStarredHouseholds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCheckedHousehold = (id: string) => {
    setCheckedHouseholds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = getFilteredAndSortedHouseholds().map(h => h.id);
    const allSelected = visibleIds.every(id => checkedHouseholds.has(id));
    
    setCheckedHouseholds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const clearChecked = () => {
    setCheckedHouseholds(new Set());
  };

  // Dynamic DB querying filters
  const getFilteredAndSortedHouseholds = () => {
    return households
      .filter(h => {
        const p = persons.find(per => per.household_id === h.id && per.role === "foster_parent");
        const c = persons.filter(per => per.household_id === h.id && per.role === "child");
        const childNames = c.map(ch => `${ch.first_name || ""} ${ch.last_name || ""}`).join(" ");
        const parentName = p ? `${p.first_name || ""} ${p.last_name || ""}` : "";
        
        // Hledání podle adresy
        const pAddress = p ? addresses.find(a => a.person_id === p.id) : null;
        const addressText = pAddress ? `${pAddress.street || ""} ${pAddress.city || ""}` : "";

        const matchesSearch = 
          parentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
          childNames.toLowerCase().includes(searchQuery.toLowerCase()) || 
          addressText.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (h.foster_id || "").toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        // Status check
        const currentStatus = h.status || "lead";
        if (!selectedStatuses.includes(currentStatus)) return false;

        // Care type check
        const fosterCareType = p?.custom_fields?.foster_care_type;
        if (fosterCareType && !selectedCareTypes.includes(fosterCareType)) return false;

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
          return countB - countA;
        }

        if (sortBy === "status") {
          const statusA = a.status || "";
          const statusB = b.status || "";
          return statusA.localeCompare(statusB);
        }

        return 0;
      });
  };

  const selectedHousehold = households.find(h => h.id === selectedFamilyId);
  const selectedFamilyPersons = persons.filter(p => p.household_id === selectedFamilyId);
  const selectedFamilyEvents = events.filter(e => e.household_id === selectedFamilyId);

  const primaryFosterParent = selectedFamilyPersons.find(p => p.role === "foster_parent");
  const fosterChildren = selectedFamilyPersons.filter(p => p.role === "child");
  const otherMembers = selectedFamilyPersons.filter(p => p.role === "social_contact");
  const biologicalParents = selectedFamilyPersons.filter(p => p.role === "bio_parent");

  const primaryParentAddress = primaryFosterParent ? addresses.find(a => a.person_id === primaryFosterParent.id) : null;

  // Render Loader
  if (loading && !session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa] dark:bg-[#131314] text-foreground transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted font-medium">Načítání systému FosterFlow...</p>
        </div>
      </div>
    );
  }

  // RENDER: MD3 Login page
  if (!session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa] dark:bg-[#131314] text-foreground p-6 transition-colors">
        <div className="w-full max-w-md bg-card border border-border-custom rounded-[28px] p-8 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-xs">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-medium tracking-tight text-foreground mt-3">FosterFlow</h1>
            <p className="text-xs text-muted font-medium">
              Vstup do interního informačního systému doprovázení
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted uppercase tracking-wider pl-1">E-mail</label>
              <input 
                type="email" 
                placeholder="petr.homolka@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-md-surface-variant border border-border-custom rounded-xl text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted uppercase tracking-wider pl-1">Heslo</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-md-surface-variant border border-border-custom rounded-xl text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            {loginError && (
              <p className="text-xs text-red-500 font-medium bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                {loginError}
              </p>
            )}

            <button 
              type="submit" 
              className="w-full py-3 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-medium rounded-xl text-sm transition-colors shadow-xs"
            >
              Přihlásit se
            </button>
          </form>

          <div className="text-[10px] text-muted text-center border-t border-border-custom pt-4 leading-relaxed font-normal">
            Evropské servery (Frankfurt) • Šifrované PostgreSQL úložiště chráněné Supabase RLS.
          </div>
        </div>
      </div>
    );
  }

  // Active household filter output length
  const filteredHouseholds = getFilteredAndSortedHouseholds();
  const allVisibleSelected = filteredHouseholds.length > 0 && filteredHouseholds.every(h => checkedHouseholds.has(h.id));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
      
      {/* 1. LEFT PANEL (Navigation Drawer - Google Contacts / Gmail labels style) */}
      <aside className={`w-64 bg-background flex flex-col shrink-0 border-r border-border-custom transition-all duration-200 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full w-0"
      } lg:relative lg:translate-x-0`}>
        
        {/* Logo and Org Identity */}
        <div className="p-5 flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <Menu className="w-5 h-5 text-muted" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-xs">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-medium text-base text-foreground tracking-tight">
              FosterFlow
            </h1>
            <p className="text-[10px] text-primary uppercase tracking-wider font-medium">
              Workspace CZ
            </p>
          </div>
        </div>

        {/* Google Workspace Extended FAB */}
        <div className="px-4 mb-4 mt-2">
          <button 
            onClick={() => alert("Vytvořit novou rodinu")}
            className="flex items-center gap-3 px-6 py-4 bg-[#c2e7ff] text-[#001d35] hover:bg-[#b3dcff] rounded-2xl font-medium shadow-xs hover:shadow-md transition-all duration-200 w-fit"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span className="text-sm">Vytvořit kontakt</span>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="px-3 space-y-0.5">
          <button 
            onClick={() => { setSelectedFamilyId(null); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-full text-sm font-medium transition-all ${
              !selectedFamilyId 
                ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                : "text-foreground hover:bg-gray-150 dark:hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 stroke-[1.5]" />
              <span>Kontakty (rodiny)</span>
            </div>
            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{households.length}</span>
          </button>
          
          <button 
            onClick={() => alert("Zobrazit kalendář a plánování")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium text-foreground hover:bg-gray-150 dark:hover:bg-gray-800 transition-all"
          >
            <Calendar className="w-5 h-5 stroke-[1.5]" />
            <span>Návštěvy a schůzky</span>
          </button>

          <button 
            onClick={() => alert("Správa spisů")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium text-foreground hover:bg-gray-150 dark:hover:bg-gray-800 transition-all"
          >
            <FileText className="w-5 h-5 stroke-[1.5]" />
            <span>Dokumenty a spisy</span>
          </button>
        </nav>

        {/* Checkbox filters represented as Labels in Drawer */}
        <div className="flex-1 overflow-y-auto px-4 mt-6 space-y-6">
          <div className="border-t border-border-custom pt-4">
            <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2 pl-3">Stavy rodin</h4>
            <div className="space-y-0.5">
              {ALL_STATUSES
                .filter((s, idx, self) => self.findIndex(t => t.key === s.key) === idx)
                .map(status => {
                  const isChecked = selectedStatuses.includes(status.key);
                  return (
                    <label 
                      key={status.key} 
                      className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors text-sm font-normal text-foreground"
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStatusFilter(status.key)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary bg-transparent"
                      />
                      <span>{status.label}</span>
                    </label>
                  );
                })}
            </div>
          </div>

          <div className="border-t border-border-custom pt-4">
            <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2 pl-3">Typy péče</h4>
            <div className="space-y-0.5">
              {Object.entries(CARE_TYPE_MAP).map(([key, value]) => {
                const isChecked = selectedCareTypes.includes(key);
                return (
                  <label 
                    key={key} 
                    className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors text-sm font-normal text-foreground"
                  >
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCareTypeFilter(key)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary bg-transparent"
                    />
                    <span>{value.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* User profile / Logout at the bottom */}
        <div className="p-4 border-t border-border-custom bg-background/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-md-surface-variant flex items-center justify-center font-medium text-xs text-foreground shrink-0 border border-border-custom">
                {currentUserProfile?.first_name?.charAt(0) || "U"}
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-foreground">
                  {currentUserProfile ? `${currentUserProfile.first_name} ${currentUserProfile.last_name}` : "Načítání..."}
                </p>
                <p className="text-[10px] text-muted font-normal uppercase tracking-wider mt-0.5">
                  {currentUserProfile?.role || "worker"}
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              title="Odhlásit se"
              className="p-1.5 text-muted hover:text-foreground hover:bg-gray-150 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Primary Workspace container */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        
        {/* 2. TOP BAR (Google-like Search Bar & Icons) */}
        <header className="h-16 px-6 bg-background border-b border-border-custom flex items-center justify-between shrink-0 z-20 transition-colors gap-4">
          
          <div className="flex items-center gap-3 flex-1">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-full transition-colors text-muted"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Google Search Bar Design */}
            <div className="flex-1 max-w-2xl relative">
              <div className="flex items-center bg-[#f1f3f4] dark:bg-[#2d2f31] focus-within:bg-card focus-within:shadow-md focus-within:ring-1 focus-within:ring-border-custom rounded-full px-4 py-2 transition-all duration-200 w-full group">
                <Search className="w-5 h-5 text-muted mr-3" />
                <input 
                  type="text" 
                  placeholder="Hledat rodinu, pěstouna, adresu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none focus:ring-0 text-sm text-foreground placeholder-muted w-full"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-muted"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sorting indicator trigger */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-medium text-muted hover:text-foreground cursor-pointer focus:outline-none border-none py-1 pl-2 pr-6"
              >
                <option value="name">Řadit: Jméno</option>
                <option value="address">Řadit: Město</option>
                <option value="children_count">Řadit: Počet dětí</option>
                <option value="status">Řadit: Stav</option>
              </select>
            </div>

            <button 
              onClick={toggleDarkMode}
              title={darkMode ? "Světlý režim" : "Tmavý režim"}
              className="p-2 text-muted hover:text-foreground hover:bg-gray-150 dark:hover:bg-gray-800 rounded-full transition-all"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="w-px h-6 bg-border-custom mx-1" />

            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-medium text-sm shadow-xs shrink-0 select-none">
              {currentUserProfile?.first_name?.charAt(0) || "U"}
            </div>
          </div>
        </header>

        {/* 3. LIST AND DETAIL COLUMN FLOW */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* A. TABLE SEZNAM RODIN (Gmail style list view) */}
          <section className={`bg-background flex flex-col transition-all duration-200 overflow-hidden ${
            selectedFamilyId ? "hidden md:flex md:w-[38%] border-r border-border-custom" : "w-full"
          }`}>
            
            {/* Gmail-style table controls / Bulk actions bar */}
            <div className="h-14 px-4 border-b border-border-custom flex items-center justify-between shrink-0 bg-background transition-all">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary bg-transparent"
                />
                
                {checkedHouseholds.size > 0 ? (
                  <div className="flex items-center gap-3 animate-in fade-in duration-150">
                    <span className="text-xs font-medium text-primary">Vybráno: {checkedHouseholds.size}</span>
                    <button 
                      onClick={clearChecked}
                      className="text-xs text-muted hover:text-foreground underline font-normal"
                    >
                      Zrušit
                    </button>
                    <div className="w-px h-4 bg-border-custom" />
                    <button 
                      onClick={() => {
                        const next = new Set(starredHouseholds);
                        checkedHouseholds.forEach(id => next.add(id));
                        setStarredHouseholds(next);
                        clearChecked();
                      }}
                      className="p-1 text-muted hover:text-foreground hover:bg-gray-150 dark:hover:bg-gray-800 rounded-full"
                      title="Označit hvězdičkou"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        alert(`Odstranit vybrané: ${Array.from(checkedHouseholds).join(", ")}`);
                        clearChecked();
                      }}
                      className="p-1 text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full"
                      title="Smazat vybrané"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-normal text-muted">
                    Zobrazeno {filteredHouseholds.length} domácností
                  </span>
                )}
              </div>
            </div>

            {/* List Rows */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <tbody>
                  {filteredHouseholds.map((h) => {
                    const p = persons.find(per => per.household_id === h.id && per.role === "foster_parent");
                    const children = persons.filter(per => per.household_id === h.id && per.role === "child");
                    const pAddress = p ? addresses.find(a => a.person_id === p.id) : null;
                    const hasDup = p ? hasSurnameDuplicate(p.last_name) : false;
                    const statusObj = getStatusObj(h.status);
                    const isChecked = checkedHouseholds.has(h.id);
                    const isStarred = starredHouseholds.has(h.id);

                    return (
                      <tr 
                        key={h.id}
                        onClick={() => {
                          setSelectedFamilyId(h.id);
                          setActiveTab("overview");
                        }}
                        className={`group border-b border-border-custom cursor-pointer transition-colors ${
                          isChecked ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-gray-100/70 dark:hover:bg-gray-800/40"
                        } ${
                          selectedFamilyId === h.id ? "bg-[#e8f0fe]/80 dark:bg-[#0842a0]/10" : ""
                        }`}
                      >
                        {/* Avatar / Hover Checkbox */}
                        <td className="py-3 px-4 w-12 align-middle text-center select-none" onClick={(e) => e.stopPropagation()}>
                          <div className="relative w-8 h-8 flex items-center justify-center group/avatar">
                            {/* Avatar bubble */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs transition-all duration-150 ${
                              isChecked ? "scale-0 opacity-0 absolute" : "group-hover:scale-0 group-hover:opacity-0"
                            } ${
                              h.status === "active" ? "bg-emerald-100 text-emerald-850 dark:bg-emerald-950 dark:text-emerald-300" : "bg-blue-100 text-blue-855 dark:bg-blue-950 dark:text-blue-300"
                            }`}>
                              {p?.first_name?.charAt(0) || "P"}
                            </div>
                            {/* Hidden checkbox that emerges on hover or checked */}
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCheckedHousehold(h.id)}
                              className={`w-4 h-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary transition-all duration-150 ${
                                isChecked ? "scale-100 opacity-100" : "scale-0 opacity-0 absolute group-hover:scale-100 group-hover:opacity-100 group-hover:relative"
                              }`}
                            />
                          </div>
                        </td>

                        {/* Star column */}
                        <td className="py-3 px-1 w-8 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleStarredHousehold(h.id)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                          >
                            <Star className={`w-4.5 h-4.5 transition-colors ${
                              isStarred 
                                ? "text-amber-500 fill-amber-500" 
                                : "text-gray-300 dark:text-gray-600 hover:text-gray-500"
                            }`} />
                          </button>
                        </td>

                        {/* Primary info (Foster name + child hints) */}
                        <td className="py-3 px-3 align-middle">
                          <div className="flex flex-col">
                            <span className="text-[14px] text-foreground font-normal flex items-center gap-1.5 leading-tight">
                              {renderFosterParentName(p)}
                            </span>
                            {/* Children list shown inline if list is not split-screen */}
                            {!selectedFamilyId && children.length > 0 && (
                              <span className="text-xs text-muted font-normal mt-0.5 truncate max-w-sm">
                                Děti: {children.map(ch => ch.first_name).join(", ")}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Address column (only when full width list) */}
                        {!selectedFamilyId && (
                          <td className="py-3 px-4 align-middle hidden sm:table-cell text-sm text-foreground/80 font-normal">
                            {pAddress ? (
                              <div className="flex flex-col">
                                <span>{pAddress.street}</span>
                                <span className="text-muted text-xs font-normal">{pAddress.city}</span>
                              </div>
                            ) : (
                              <span className="text-muted text-xs font-normal italic">Adresa neuvedena</span>
                            )}
                          </td>
                        )}

                        {/* Action badge / Hover Quick Actions (Gmail style) */}
                        <td className="py-3 px-4 text-right align-middle w-28 text-xs select-none" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end relative h-7">
                            {/* Normal status (hidden on row hover) */}
                            <div className="group-hover:opacity-0 group-hover:scale-95 transition-all duration-150 absolute right-0">
                              <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-normal tracking-wide ${statusObj.colorClass}`}>
                                {statusObj.label}
                              </span>
                            </div>
                            {/* Hover icons container */}
                            <div className="opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 flex items-center gap-1 absolute right-0 bg-background/90 dark:bg-[#131314]/90 pl-2">
                              <button 
                                onClick={() => alert(`Upravit rodinu: ${h.foster_id}`)}
                                title="Upravit"
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-muted hover:text-foreground"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => alert(`Událost pro rodinu: ${h.foster_id}`)}
                                title="Nová událost"
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-muted hover:text-foreground"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => alert(`Odebrat: ${h.foster_id}`)}
                                title="Smazat"
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-950/20 rounded-full text-muted hover:text-red-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredHouseholds.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-muted italic">
                        Nebyly nalezeny žádné záznamy vyhovující filtrům.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* B. DETAILNÍ PANEL (MD3 Card - Split-screen / Fullscreen view on mobile) */}
          {selectedHousehold ? (
            <main className="flex-1 bg-background p-4 md:p-6 flex flex-col overflow-hidden animate-in fade-in duration-200">
              <div className="bg-card rounded-[28px] border border-border-custom shadow-xs flex flex-col flex-1 overflow-hidden">
                
                {/* Header detailu */}
                <div className="p-6 border-b border-border-custom flex items-center justify-between bg-card shrink-0 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedFamilyId(null)}
                        title="Zpět na seznam"
                        className="md:hidden p-1.5 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-full text-muted transition-colors mr-1"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <h3 className="text-xl md:text-2xl font-medium text-foreground tracking-tight">
                        {primaryFosterParent ? `Spis rodiny ${primaryFosterParent.last_name}ových` : "Detail rodiny"}
                      </h3>
                      {primaryFosterParent?.custom_fields?.foster_care_type && 
                        renderCareTypeBadge(primaryFosterParent.custom_fields.foster_care_type)
                      }
                    </div>
                    <p className="text-xs text-muted font-normal font-mono">
                      Kód spisu: {selectedHousehold.foster_id} • Brno
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 bg-background hover:bg-gray-100 dark:hover:bg-gray-800 text-foreground border border-border-custom rounded-full text-xs font-medium transition-all">
                      Export spisu
                    </button>
                    <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-full text-xs font-medium transition-all shadow-xs">
                      Upravit
                    </button>
                    <div className="w-px h-6 bg-border-custom mx-1 hidden md:block" />
                    <button 
                      onClick={() => setSelectedFamilyId(null)}
                      title="Zavřít"
                      className="p-1.5 text-muted hover:text-foreground hover:bg-gray-150 dark:hover:bg-gray-800 rounded-full transition-all hidden md:block"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Navigation MD3 tab switcher */}
                <div className="bg-card border-b border-border-custom px-6 flex gap-4 shrink-0 overflow-x-auto select-none">
                  {[
                    { id: "overview", label: "Přehled rodiny" },
                    { id: "timeline", label: `Události (${selectedFamilyEvents.length})` },
                    { id: "registry", label: "Registry a dokumenty" }
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 text-xs font-medium uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                        activeTab === tab.id 
                          ? "border-primary text-primary" 
                          : "border-transparent text-muted hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content viewport */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/10 transition-colors">
                  
                  {/* TAB 1: OVERVIEW (Stacked layout) */}
                  {activeTab === "overview" && (
                    <div className="space-y-6">
                      
                      {/* Main Foster Parent Card */}
                      <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-5 transition-colors shadow-xs">
                        <div className="flex items-center gap-4">
                          {primaryFosterParent?.custom_fields?.avatar_url ? (
                            <img 
                              src={primaryFosterParent.custom_fields.avatar_url} 
                              alt="avatar" 
                              className="w-14 h-14 rounded-full border border-border-custom object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-medium text-xl shadow-xs">
                              {primaryFosterParent?.first_name?.charAt(0) || "P"}
                            </div>
                          )}
                          <div>
                            <h4 className="text-lg font-medium text-foreground tracking-tight leading-snug">
                              {renderFosterParentName(primaryFosterParent)}
                            </h4>
                            <p className="text-xs text-muted font-normal mt-0.5">Klíčový pěstoun domácnosti</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border-custom text-sm text-foreground/90 font-normal">
                          <div className="space-y-0.5">
                            <span className="text-muted font-medium text-xs block uppercase tracking-wider">Profese:</span>
                            <span className="font-normal text-foreground">{primaryFosterParent?.custom_fields?.profession || "Neuvedeno"}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-muted font-medium text-xs block uppercase tracking-wider">Aktuální bydliště:</span>
                            {primaryParentAddress ? (
                              <div className="flex items-center justify-between bg-card px-3 py-1.5 rounded-2xl border border-border-custom/50 mt-1 shadow-xs">
                                <span className="font-normal text-foreground">
                                  {primaryParentAddress.street}, {primaryParentAddress.city}
                                </span>
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${primaryParentAddress.street}, ${primaryParentAddress.city}`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Google Maps"
                                  className="text-primary hover:text-primary-hover p-1 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-full transition-colors"
                                >
                                  <Map className="w-4 h-4" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-muted italic block mt-0.5">Neuvedeno</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Children (Stacked, single column list) */}
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider pl-1">Děti v pěstounské péči</h4>
                        {fosterChildren.map((child) => (
                          <div key={child.id} className="bg-background border border-border-custom p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-gray-100/50 dark:hover:bg-gray-800/30">
                            <div className="flex items-center gap-4">
                              {child.custom_fields?.avatar_url ? (
                                <img 
                                  src={child.custom_fields.avatar_url} 
                                  alt="child" 
                                  className="w-12 h-12 rounded-full object-cover border border-border-custom"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-medium text-base shadow-xs">
                                  {child.first_name?.charAt(0) || "D"}
                                </div>
                              )}
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium text-foreground">{renderChildName(child)}</p>
                                <div className="flex gap-2 items-center text-xs text-muted">
                                  <span>Věk: {child.birth_date ? new Date().getFullYear() - new Date(child.birth_date).getFullYear() : "?"} let</span>
                                  <span>•</span>
                                  <span>Záliby: {child.custom_fields?.hobby || "Neuvedeno"}</span>
                                </div>
                                <p className="text-xs text-muted">Škola: {child.custom_fields?.school || "Neuvedeno"}</p>
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-end gap-1.5 w-full sm:w-auto justify-between sm:justify-start border-t sm:border-t-0 border-border-custom/30 pt-3 sm:pt-0 shrink-0 select-none">
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-normal border ${
                                child.safety_rating === "A" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400" :
                                child.safety_rating === "B" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400" : 
                                "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400"
                              }`}>
                                Hodnocení {child.safety_rating}
                              </span>
                            </div>
                          </div>
                        ))}
                        {fosterChildren.length === 0 && (
                          <p className="text-xs text-muted italic pl-1">V této rodině nejsou evidovány žádné děti.</p>
                        )}
                      </div>

                      {/* Other family members */}
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider pl-1">Další kontakty a biologické vazby</h4>
                        
                        {otherMembers.map((member) => (
                          <div key={member.id} className="bg-background border border-border-custom p-4 rounded-3xl flex items-center justify-between transition-all hover:bg-gray-100/50 dark:hover:bg-gray-800/30">
                            <div className="flex items-center gap-3">
                              {member.custom_fields?.avatar_url ? (
                                <img src={member.custom_fields.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-border-custom" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-100 text-foreground border border-border-custom flex items-center justify-center font-medium text-sm">
                                  {member.first_name?.charAt(0) || "M"}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-foreground">{member.first_name} {member.last_name}</p>
                                <p className="text-xs text-muted">Člen domácnosti</p>
                              </div>
                            </div>
                            <span className="text-xs bg-slate-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full text-foreground font-normal">
                              {member.custom_fields?.relationship_to_child || "Rodina"}
                            </span>
                          </div>
                        ))}

                        {biologicalParents.map((bio) => (
                          <div 
                            key={bio.id} 
                            className={`p-4 rounded-3xl flex items-center justify-between border transition-all ${
                              bio.safety_rating === "Z" 
                                ? "bg-red-50/20 border-red-200 dark:bg-red-950/10 dark:border-red-900/30" 
                                : "bg-background border-border-custom hover:bg-gray-100/50 dark:hover:bg-gray-800/30"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 text-foreground border border-border-custom flex items-center justify-center font-medium text-sm">
                                {bio.first_name?.charAt(0) || "B"}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{bio.first_name} {bio.last_name}</p>
                                <p className="text-xs text-muted">
                                  Biologický rodič (vazba: {bio.safety_rating})
                                </p>
                              </div>
                            </div>

                            <div>
                              {bio.safety_rating === "Z" ? (
                                <span className="px-2.5 py-0.5 bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 text-xs font-medium rounded-full border border-red-200 dark:border-red-500/30 uppercase tracking-wide">
                                  Styk zakázán
                                </span>
                              ) : (
                                <span className="text-xs text-foreground font-mono bg-card px-2.5 py-1 rounded-lg border border-border-custom/80 shadow-xs">{bio.phone || "Bez tel."}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: EVENTS (TIMELINE) */}
                  {activeTab === "timeline" && (
                    <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-5 shadow-xs">
                      <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider pl-1">Historie klientských kontaktů</h4>
                      {selectedFamilyEvents.length > 0 ? (
                        <div className="relative border-l-2 border-primary/20 ml-2.5 pl-6 space-y-6">
                          {selectedFamilyEvents.map((e) => (
                            <div key={e.id} className="relative animate-in fade-in duration-200">
                              <div className={`absolute -left-[29.5px] top-1.5 w-3 h-3 rounded-full ring-4 ring-card ${
                                e.type === "crisis_event" ? "bg-red-500" : "bg-primary"
                              }`} />
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                  <h5 className="font-medium text-sm text-foreground">{e.title}</h5>
                                  <p className="text-xs text-muted leading-relaxed max-w-2xl font-normal">
                                    {e.payload?.content || e.payload?.text || "Bez textu"}
                                  </p>
                                </div>
                                <span className="text-[10px] text-muted font-normal bg-card px-2 py-0.5 rounded border border-border-custom shadow-xs whitespace-nowrap">
                                  {new Date(e.occurred_at).toLocaleDateString("cs-CZ")}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted italic pl-1">Žádné zaznamenané události v historii rodiny.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 3: REGISTRY & DOCUMENTS */}
                  {activeTab === "registry" && (
                    <div className="space-y-6">
                      {/* Education */}
                      <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-4 shadow-xs">
                        <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider flex items-center gap-2 pl-1">
                          <GraduationCap className="w-5 h-5 text-primary" />
                          Evidence vzdělávání dětí
                        </h4>
                        <div className="divide-y divide-border-custom">
                          {fosterChildren.map((child) => (
                            <div key={child.id} className="py-3.5 first:pt-0 last:pb-0 flex justify-between items-center text-sm text-foreground">
                              <div>
                                <span className="font-medium text-sm block">{child.first_name} {child.last_name}</span>
                                <span className="text-muted mt-0.5 block text-xs">{child.custom_fields?.school || "ZŠ Merhautova Brno"}</span>
                              </div>
                              <div className="text-right">
                                <span className="block font-medium text-primary text-xs bg-primary/10 px-2.5 py-0.5 rounded-full">Třída: 6.A</span>
                                <span className="text-[11px] text-muted block mt-1">Mgr. Kateřina Novotná</span>
                              </div>
                            </div>
                          ))}
                          {fosterChildren.length === 0 && (
                            <p className="text-xs text-muted italic pl-1">V této rodině nejsou školní děti.</p>
                          )}
                        </div>
                      </div>

                      {/* Pediatric Metrics */}
                      <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-4 shadow-xs">
                        <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider flex items-center gap-2 pl-1">
                          <Stethoscope className="w-5 h-5 text-primary" />
                          Zdravotní a fyziologické údaje
                        </h4>
                        <div className="space-y-4">
                          {fosterChildren.map((child) => (
                            <div key={child.id} className="p-4 bg-card rounded-2xl border border-border-custom/80 space-y-2.5 text-sm text-foreground shadow-xs">
                              <span className="font-medium text-sm block border-b border-border-custom pb-1.5">
                                {child.first_name} {child.last_name}
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <p><span className="text-muted font-medium mr-1 uppercase text-[10px] tracking-wide">Pediatr:</span> MUDr. Josef Fiala</p>
                                <p><span className="text-muted font-medium mr-1 uppercase text-[10px] tracking-wide">Pojišťovna:</span> 111 (VZP)</p>
                                <p className="col-span-1 sm:col-span-2"><span className="text-muted font-medium mr-1 uppercase text-[10px] tracking-wide">Medikace:</span> Bez pravidelné medikace</p>
                                <p className="col-span-1 sm:col-span-2"><span className="text-muted font-medium mr-1 uppercase text-[10px] tracking-wide">Měření:</span> 142 cm / 35 kg</p>
                              </div>
                            </div>
                          ))}
                          {fosterChildren.length === 0 && (
                            <p className="text-xs text-muted italic pl-1">Žádné zdravotní údaje.</p>
                          )}
                        </div>
                      </div>

                      {/* Document scans */}
                      <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-4 shadow-xs">
                        <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider flex items-center gap-2 pl-1">
                          <FileText className="w-5 h-5 text-primary" />
                          Spisy a smluvní dokumenty (DMS)
                        </h4>
                        <div className="space-y-2.5">
                          {[
                            { name: "Dohoda o doprovázení pěstounské rodiny.pdf", size: "2.4 MB", date: "15.01.2025" },
                            { name: "IPOD - Individuální plán ochrany dítěte.pdf", size: "1.8 MB", date: "22.02.2025" },
                            { name: "Soudní rozhodnutí o svěření do péče.pdf", size: "4.1 MB", date: "10.12.2024" },
                            { name: "GDPR Souhlas se zpracováním údajů.pdf", size: "950 KB", date: "15.01.2025" }
                          ].map((doc, dIdx) => (
                            <div key={dIdx} className="p-3 bg-card hover:bg-slate-500/5 rounded-2xl border border-border-custom/50 flex justify-between items-center transition-all text-sm shadow-xs">
                              <div className="flex items-center gap-3">
                                <FileText className="w-4.5 h-4.5 text-muted shrink-0" />
                                <div className="space-y-0.5">
                                  <span className="font-normal text-sm text-foreground block">{doc.name}</span>
                                  <span className="text-[10px] text-muted block font-normal">Datum: {doc.date} • {doc.size}</span>
                                </div>
                              </div>
                              <button className="p-2 hover:bg-gray-150 rounded-full text-muted hover:text-foreground transition-colors border border-border-custom/40 shadow-xs">
                                <FileDown className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* AI Workspace Copilot (Material bar design) */}
                <div className="p-4 border-t border-border-custom bg-card shrink-0">
                  <div className="max-w-4xl mx-auto relative flex items-center">
                    <Sparkles className="absolute left-4 w-4 h-4 text-primary" />
                    <input 
                      type="text" 
                      placeholder="Položte AI dotaz k rodině (např. 'Kdy proběhla poslední návštěva?')"
                      className="w-full pl-11 pr-24 py-3 bg-[#f1f3f4] dark:bg-[#2d2f31] border border-transparent rounded-full text-xs text-foreground focus:bg-card focus:border-primary focus:outline-none transition-all shadow-xs"
                    />
                    <button className="absolute right-3 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-full text-[11px] font-medium transition-colors shadow-xs">
                      Položit dotaz
                    </button>
                  </div>
                </div>
              </div>
            </main>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted italic bg-background font-normal gap-2 select-none">
              <Users className="w-10 h-10 text-muted/50 stroke-[1]" />
              <span className="text-sm">Vyberte klientský spis z tabulky pro zobrazení detailu rodiny.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}