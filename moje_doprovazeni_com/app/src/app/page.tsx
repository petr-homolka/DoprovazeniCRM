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
  Phone,
  MessageSquare,
  Video,
  Send,
  Paperclip,
  Tag,
  Inbox,
  AlertOctagon,
  HelpCircle,
  Folder,
  ChevronRight,
  MoreVertical,
  CheckSquare
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
  A: { label: "A | Dlouhodobá", colorClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400" },
  B: { label: "B | Přechodná", colorClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400" },
  C: { label: "C | Nezprostředkovaná", colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400" }
};

const COLUMN_LABELS: Record<string, string> = {
  name: "Název / Jméno",
  address: "Adresa",
  phone: "Telefon",
  email: "E-mail",
  care_type: "Typ péče",
  children_count: "Děti v péči",
  status: "Stav"
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

  // Multi-checkbox filtering states (Google Contacts)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    "active", "applicant", "preparation", "paused", "terminated", "lead"
  ]);
  const [selectedCareTypes, setSelectedCareTypes] = useState<string[]>(["A", "B", "C"]);

  // Gmail-style row interaction states
  const [starredHouseholds, setStarredHouseholds] = useState<Set<string>>(new Set());
  const [checkedHouseholds, setCheckedHouseholds] = useState<Set<string>>(new Set());

  // Google Workspace Service State
  // contacts = Google Contacts, mail = Gmail, chat = Google Chat
  const [activeService, setActiveService] = useState<'contacts' | 'mail' | 'chat'>('contacts');

  // Contact sub-categories filtering
  const [contactFilterType, setContactFilterType] = useState<'families' | 'foster_parents' | 'children' | 'others'>('families');

  // Dynamic columns state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'address', 'care_type', 'children_count', 'status']);
  const [showColumnPicker, setShowColumnPicker] = useState<boolean>(false);

  // Gmail-specific folders and tabs
  const [activeMailFolder, setActiveMailFolder] = useState<'inbox' | 'starred' | 'sent' | 'drafts'>('inbox');
  const [activeMailTab, setActiveMailTab] = useState<'primary' | 'promo' | 'social'>('primary');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [starredEvents, setStarredEvents] = useState<Set<string>>(new Set());

  // Google Chat-specific state
  const [chatThreads, setChatThreads] = useState<Record<string, { sender: string; text: string; time: string; isMe: boolean }[]>>({});
  const [chatInput, setChatInput] = useState("");

  // UI Drawer state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // User-resizable right panel splitter state
  const [detailWidth, setDetailWidth] = useState(620);
  const [isResizing, setIsResizing] = useState(false);

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

  // Splitter width mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 320 && newWidth < window.innerWidth * 0.8) {
        setDetailWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

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

      // Initialize mock chat history
      const initialChats: Record<string, any[]> = {};
      householdsData?.forEach(h => {
        const p = personsData?.find(per => per.household_id === h.id && per.role === "foster_parent");
        const name = p ? p.first_name : "Pěstoun";
        initialChats[h.id] = [
          { sender: name, text: "Dobrý den, posílám vypracovanou zprávu a hodnocení za minulý měsíc.", time: "10:14", isMe: false },
          { sender: "Já (KO)", text: "Skvělé, děkuji za zaslání. Podívám se na to v průběhu odpoledne.", time: "10:20", isMe: true },
          { sender: name, text: "Super, také bych se chtěla zeptat, zda se domluvíme na osobní návštěvě na příští týden?", time: "10:25", isMe: false }
        ];
      });
      setChatThreads(initialChats);

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

  // Send message inside Chat Room
  const handleSendMessage = () => {
    if (!chatInput.trim() || !selectedFamilyId) return;
    const newMsg = {
      sender: "Já (KO)",
      text: chatInput,
      time: new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
      isMe: true
    };
    setChatThreads(prev => ({
      ...prev,
      [selectedFamilyId]: [...(prev[selectedFamilyId] || []), newMsg]
    }));
    setChatInput("");
  };

  // ==========================================
  // HELPERS (No semibold / extrabold)
  // ==========================================

  const getCareTypeDescription = (type: string) => {
    if (type === "A") return "Dlouhodobá zprostředkovaná pěstounská péče";
    if (type === "B") return "Přechodná zprostředkovaná pěstounská péče";
    if (type === "C") return "Nezprostředkovaná příbuzenská pěstounská péče";
    return "";
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

  const getStatusObj = (status: string) => {
    const currentStatus = status || "lead";
    const statusObj = ALL_STATUSES.find(s => s.key === currentStatus);
    return statusObj || { label: currentStatus, colorClass: "bg-slate-100 text-slate-700 border-slate-350" };
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

  // Dynamic household list filtering (Contacts tab)
  const getFilteredAndSortedHouseholds = () => {
    if (contactFilterType === 'families') {
      return households
        .filter(h => {
          const p = persons.find(per => per.household_id === h.id && per.role === "foster_parent");
          const c = persons.filter(per => per.household_id === h.id && per.role === "child");
          const childNames = c.map(ch => `${ch.first_name || ""} ${ch.last_name || ""}`).join(" ");
          const parentName = p ? `${p.first_name || ""} ${p.last_name || ""}` : "";
          
          // Vyhledávání podle adresy
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
        .map(h => {
          const p = persons.find(per => per.household_id === h.id && per.role === "foster_parent");
          const c = persons.filter(per => per.household_id === h.id && per.role === "child");
          const pAddress = p ? addresses.find(a => a.person_id === p.id) : null;
          const addressText = pAddress ? `${pAddress.street || ""}, ${pAddress.city || ""}` : "";
          const phoneText = p?.phone || "";
          const emailText = p?.email || "";
          const careTypeVal = p?.custom_fields?.foster_care_type || "";

          return {
            id: h.id,
            householdId: h.id,
            fosterId: h.foster_id || "",
            isPerson: false,
            name: p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : "Bez pěstouna",
            firstName: p?.first_name || "",
            lastName: p?.last_name || "",
            role: "",
            status: h.status || "lead",
            careType: careTypeVal,
            address: addressText,
            phone: phoneText,
            email: emailText,
            childrenCount: c.length,
            childrenList: c.map(ch => `${ch.first_name || ""} ${ch.last_name || ""}`.trim()),
            avatarUrl: p?.custom_fields?.avatarUrl || "",
            profession: p?.custom_fields?.profession || "",
            birthDate: "",
            school: "",
            hobby: "",
            safetyRating: undefined as number | undefined,
            rawItem: h
          };
        })
        .sort((a, b) => {
          if (sortBy === "name") {
            return a.lastName.localeCompare(b.lastName, "cs-CZ");
          }
          if (sortBy === "address") {
            return a.address.localeCompare(b.address, "cs-CZ");
          }
          if (sortBy === "children_count") {
            return b.childrenCount - a.childrenCount;
          }
          if (sortBy === "status") {
            return a.status.localeCompare(b.status);
          }
          return 0;
        });
    } else {
      // Displaying individual persons
      return persons
        .filter(p => {
          const h = households.find(house => house.id === p.household_id);
          if (!h) return false;

          // Filter by category
          if (contactFilterType === 'foster_parents' && p.role !== 'foster_parent') return false;
          if (contactFilterType === 'children' && p.role !== 'child') return false;
          if (contactFilterType === 'others' && (p.role === 'foster_parent' || p.role === 'child')) return false;

          const pName = `${p.first_name || ""} ${p.last_name || ""}`;
          const pAddress = addresses.find(a => a.person_id === p.id);
          const addressText = pAddress ? `${pAddress.street || ""} ${pAddress.city || ""}` : "";

          const matchesSearch = 
            pName.toLowerCase().includes(searchQuery.toLowerCase()) || 
            addressText.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.phone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.email || "").toLowerCase().includes(searchQuery.toLowerCase());

          if (!matchesSearch) return false;

          // Status check
          const currentStatus = h.status || "lead";
          if (!selectedStatuses.includes(currentStatus)) return false;

          // Care type check
          const fosterCareType = p.custom_fields?.foster_care_type;
          if (fosterCareType && !selectedCareTypes.includes(fosterCareType)) return false;

          return true;
        })
        .map(p => {
          const h = households.find(house => house.id === p.household_id)!;
          const pAddress = addresses.find(a => a.person_id === p.id);
          const addressText = pAddress ? `${pAddress.street || ""}, ${pAddress.city || ""}` : "";
          const phoneText = p.phone || "";
          const emailText = p.email || "";
          const careTypeVal = p.custom_fields?.foster_care_type || "";

          return {
            id: p.id,
            householdId: p.household_id,
            fosterId: h.foster_id || "",
            isPerson: true,
            name: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
            firstName: p.first_name || "",
            lastName: p.last_name || "",
            role: p.role || "",
            status: h.status || "lead",
            careType: careTypeVal,
            address: addressText,
            phone: phoneText,
            email: emailText,
            childrenCount: persons.filter(per => per.household_id === h.id && per.role === "child").length,
            childrenList: persons.filter(per => per.household_id === h.id && per.role === "child").map(ch => `${ch.first_name || ""} ${ch.last_name || ""}`.trim()),
            avatarUrl: p.custom_fields?.avatarUrl || "",
            profession: p.custom_fields?.profession || "",
            birthDate: p.birth_date || "",
            school: p.custom_fields?.school || "",
            hobby: p.custom_fields?.hobby || "",
            safetyRating: p.safety_rating,
            rawItem: p
          };
        })
        .sort((a, b) => {
          if (sortBy === "name") {
            return a.lastName.localeCompare(b.lastName, "cs-CZ");
          }
          if (sortBy === "address") {
            return a.address.localeCompare(b.address, "cs-CZ");
          }
          if (sortBy === "children_count") {
            return b.childrenCount - a.childrenCount;
          }
          if (sortBy === "status") {
            return a.status.localeCompare(b.status);
          }
          return 0;
        });
    }
  };

  // Gmail Filter and Map Database Events
  const getGmailFilteredEvents = () => {
    return events.filter(e => {
      // Search matching
      const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (e.payload?.content || "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Filter by Gmail Folder
      if (activeMailFolder === "starred" && !starredEvents.has(e.id)) return false;
      if (activeMailFolder === "sent" && e.author_id !== currentUserProfile?.id) return false;
      if (activeMailFolder === "drafts") return false; // empty drafts mockup

      // Categorize database event type into Gmail Tabs
      if (activeMailTab === "primary") {
        // regular visits / court hearings
        return e.type === "regular_visit" || e.type === "court_hearing" || e.type === "school_report";
      } else if (activeMailTab === "promo") {
        // Crisis and warnings
        return e.type === "crisis_event";
      } else if (activeMailTab === "social") {
        // communications
        return e.type === "phone_call" || e.type === "email";
      }
      return true;
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

  // Active event detail in Gmail
  const selectedGmailEvent = events.find(e => e.id === selectedEventId);

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

  // RENDER: Login screen
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

  const filteredHouseholds = getFilteredAndSortedHouseholds();
  const allVisibleSelected = filteredHouseholds.length > 0 && filteredHouseholds.every(h => checkedHouseholds.has(h.id));
  const activeChatFeed = selectedFamilyId ? chatThreads[selectedFamilyId] || [] : [];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans antialiased">
      
      {/* ========================================================= */}
      {/* 1. APP SWITCH RAIL (Far left vertical switcher bar)        */}
      {/* ========================================================= */}
      <div className="w-16 bg-[#f6f8fc] dark:bg-[#111214] border-r border-border-custom flex flex-col items-center py-4 justify-between shrink-0 select-none">
        <div className="flex flex-col items-center w-full space-y-4">
          {/* Main hamburger menu button */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] rounded-full transition-colors text-muted"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Service switcher buttons */}
          <div className="flex flex-col items-center w-full space-y-2">
            
            {/* Pošta / Gmail Button */}
            <button 
              onClick={() => { setActiveService('mail'); setSelectedFamilyId(null); }}
              className={`p-3 rounded-xl transition-all relative group flex flex-col items-center justify-center ${
                activeService === 'mail' 
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa]" 
                  : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
              }`}
              title="Pošta (Spisy)"
            >
              <Mail className="w-5 h-5 stroke-[1.5]" />
              <span className="text-[9px] mt-1 font-medium scale-90">Pošta</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Chat / Google Chat Button */}
            <button 
              onClick={() => { setActiveService('chat'); }}
              className={`p-3 rounded-xl transition-all relative group flex flex-col items-center justify-center ${
                activeService === 'chat' 
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa]" 
                  : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
              }`}
              title="Chat"
            >
              <MessageSquare className="w-5 h-5 stroke-[1.5]" />
              <span className="text-[9px] mt-1 font-medium scale-90">Chat</span>
            </button>

            {/* Kontakty / Google Contacts Button */}
            <button 
              onClick={() => { setActiveService('contacts'); }}
              className={`p-3 rounded-xl transition-all relative group flex flex-col items-center justify-center ${
                activeService === 'contacts' 
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa]" 
                  : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
              }`}
              title="Kontakty"
            >
              <Users className="w-5 h-5 stroke-[1.5]" />
              <span className="text-[9px] mt-1 font-medium scale-90">Kontakty</span>
            </button>

            {/* Meet (mocked) */}
            <button 
              onClick={() => alert("Spustit Google Meet schůzku...")}
              className="p-3 rounded-xl text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground transition-all flex flex-col items-center justify-center"
              title="Meet"
            >
              <Video className="w-5 h-5 stroke-[1.5]" />
              <span className="text-[9px] mt-1 font-medium scale-90">Meet</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <button 
            onClick={() => alert("Nastavení Google Workspace")}
            className="p-2 text-muted hover:text-foreground hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] rounded-full transition-colors"
            title="Nastavení"
          >
            <Settings className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. DYNAMIC SIDEBAR (Changes based on active service)       */}
      {/* ========================================================= */}
      <aside className={`w-64 bg-[#f6f8fc] dark:bg-[#111214] flex flex-col shrink-0 transition-all duration-200 border-r border-border-custom select-none ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full w-0"
      }`}>
        
        {/* Header containing name of the active service */}
        <div className="p-4 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-base text-foreground tracking-tight capitalize">
            {activeService === 'contacts' && "Kontakty"}
            {activeService === 'mail' && "Gmail (Spisy)"}
            {activeService === 'chat' && "Google Chat"}
          </span>
        </div>

        {/* SERVICE 1: GOOGLE CONTACTS SIDEBAR */}
        {activeService === 'contacts' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Extended FAB: Vytvořit kontakt */}
            <div className="px-4 mb-4 mt-2">
              <button 
                onClick={() => alert("Vytvořit novou rodinu")}
                className="flex items-center gap-3 px-6 py-4 bg-[#c2e7ff] text-[#001d35] hover:bg-[#b3dcff] rounded-2xl font-medium shadow-xs hover:shadow-md transition-all duration-200 w-fit"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span className="text-sm">Vytvořit kontakt</span>
              </button>
            </div>

            {/* Navigation links */}
            <nav className="px-3 space-y-0.5">
              <button 
                onClick={() => { setContactFilterType('families'); setSelectedFamilyId(null); }}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  contactFilterType === 'families' 
                    ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                    : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 stroke-[1.5]" />
                  <span>Spisy rodin</span>
                </div>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{households.length}</span>
              </button>

              <button 
                onClick={() => { setContactFilterType('foster_parents'); setSelectedFamilyId(null); }}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  contactFilterType === 'foster_parents' 
                    ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                    : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 stroke-[1.5]" />
                  <span>Pěstouni</span>
                </div>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{persons.filter(p => p.role === 'foster_parent').length}</span>
              </button>

              <button 
                onClick={() => { setContactFilterType('children'); setSelectedFamilyId(null); }}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  contactFilterType === 'children' 
                    ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                    : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 stroke-[1.5]" />
                  <span>Děti</span>
                </div>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{persons.filter(p => p.role === 'child').length}</span>
              </button>

              <button 
                onClick={() => { setContactFilterType('others'); setSelectedFamilyId(null); }}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  contactFilterType === 'others' 
                    ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                    : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 stroke-[1.5]" />
                  <span>Ostatní lidé</span>
                </div>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{persons.filter(p => p.role !== 'foster_parent' && p.role !== 'child').length}</span>
              </button>
            </nav>

            {/* Labels as filters inside Contacts */}
            <div className="flex-1 overflow-y-auto px-4 mt-4 space-y-5">
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
                          className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50 cursor-pointer transition-colors text-sm font-normal text-foreground"
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
                        className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50 cursor-pointer transition-colors text-sm font-normal text-foreground"
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
          </div>
        )}

        {/* SERVICE 2: GMAIL (MAIL) SIDEBAR */}
        {activeService === 'mail' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Extended FAB: Nová zpráva */}
            <div className="px-4 mb-4 mt-2">
              <button 
                onClick={() => alert("Napsat nový e-mail/spis")}
                className="flex items-center gap-3 px-6 py-4 bg-[#c2e7ff] text-[#001d35] hover:bg-[#b3dcff] rounded-2xl font-medium shadow-xs hover:shadow-md transition-all duration-200 w-fit"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span className="text-sm">Nová zpráva</span>
              </button>
            </div>

            {/* Folder list */}
            <nav className="px-3 space-y-0.5">
              {[
                { id: "inbox", label: "Doručená pošta", icon: Inbox, badge: events.length },
                { id: "starred", label: "S hvězdičkou", icon: Star, badge: starredEvents.size },
                { id: "sent", label: "Odeslané", icon: Send, badge: null },
                { id: "drafts", label: "Koncepty", icon: FileText, badge: null }
              ].map(folder => (
                <button 
                  key={folder.id}
                  onClick={() => { setActiveMailFolder(folder.id as any); setSelectedEventId(null); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                    activeMailFolder === folder.id 
                      ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                      : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <folder.icon className="w-4.5 h-4.5 stroke-[1.5]" />
                    <span>{folder.label}</span>
                  </div>
                  {folder.badge !== null && folder.badge > 0 && (
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{folder.badge}</span>
                  )}
                </button>
              ))}
            </nav>

            {/* Sidebar bottom decoration */}
            <div className="flex-1 px-4 mt-6 border-t border-border-custom pt-4">
              <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2 pl-3">Složky spisů</h4>
              <div className="space-y-0.5 text-sm text-foreground/80">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50 cursor-pointer">
                  <Folder className="w-4 h-4 text-amber-500" />
                  <span>Klientské zprávy</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50 cursor-pointer">
                  <Folder className="w-4 h-4 text-blue-500" />
                  <span>Vzdělávání a kurzy</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50 cursor-pointer">
                  <Folder className="w-4 h-4 text-emerald-500" />
                  <span>Lékařské zprávy</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SERVICE 3: GOOGLE CHAT SIDEBAR */}
        {activeService === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Extended FAB: Nový chat */}
            <div className="px-4 mb-4 mt-2">
              <button 
                onClick={() => alert("Spustit novou konverzaci")}
                className="flex items-center gap-3 px-6 py-4 bg-[#c2e7ff] text-[#001d35] hover:bg-[#b3dcff] rounded-2xl font-medium shadow-xs hover:shadow-md transition-all duration-200 w-fit"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span className="text-sm">Nový chat</span>
              </button>
            </div>

            {/* Direct messages list */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 mb-2">
                <span className="text-[11px] font-medium text-muted uppercase tracking-wider pl-2">Přímé zprávy</span>
              </div>
              <nav className="px-2 space-y-0.5">
                {households.map(h => {
                  const p = persons.find(per => per.household_id === h.id && per.role === "foster_parent");
                  const name = p ? `${p.first_name} ${p.last_name}` : "Pěstoun";
                  const lastMessage = chatThreads[h.id]?.[chatThreads[h.id].length - 1]?.text || "Zatím žádné zprávy";
                  
                  return (
                    <button
                      key={h.id}
                      onClick={() => { setSelectedFamilyId(h.id); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 ${
                        selectedFamilyId === h.id 
                          ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                          : "text-foreground hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-medium text-xs shrink-0">
                        {p?.first_name?.charAt(0) || "P"}
                      </div>
                      <div className="truncate flex-1">
                        <p className="text-sm font-medium leading-none truncate">{name}</p>
                        <p className="text-xs text-muted font-normal mt-1 truncate">{lastMessage}</p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </aside>

      {/* ========================================================= */}
      {/* 3. DYNAMIC CONTENT WORKSPACE                               */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        
        {/* Dynamic Header */}
        <header className="h-16 px-6 bg-background border-b border-border-custom flex items-center justify-between shrink-0 z-20 gap-4">
          <div className="flex items-center gap-3 flex-1">
            {/* Google Search Bar Design */}
            <div className="flex-1 max-w-2xl relative">
              <div className="flex items-center bg-[#f1f3f4] dark:bg-[#2d2f31] focus-within:bg-card focus-within:shadow-md focus-within:ring-1 focus-within:ring-border-custom rounded-full px-4 py-2 transition-all duration-200 w-full group">
                <Search className="w-5 h-5 text-muted mr-3" />
                <input 
                  type="text" 
                  placeholder={
                    activeService === 'contacts' ? "Hledat v kontaktech (jméno, adresa...)" :
                    activeService === 'mail' ? "Hledat v poště a spisech..." : "Hledat v konverzacích..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none focus:ring-0 text-sm text-foreground placeholder-muted w-full"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="p-1 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-full text-muted"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={toggleDarkMode}
              title={darkMode ? "Světlý režim" : "Tmavý režim"}
              className="p-2 text-muted hover:text-foreground hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] rounded-full transition-all"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="w-px h-6 bg-border-custom mx-1" />

            {/* Profile monogram */}
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-medium text-sm shadow-xs shrink-0 select-none">
              {currentUserProfile?.first_name?.charAt(0) || "U"}
            </div>
          </div>
        </header>

        {/* Dynamic viewport layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ========================================================= */}
          {/* A. VIEW 1: GOOGLE CONTACTS VIEW (Contacts active)         */}
          {/* ========================================================= */}
          {activeService === 'contacts' && (
            <section className="bg-background flex flex-col transition-all duration-200 overflow-hidden flex-1 min-w-[320px]">
              
              {/* Toolbar */}
              <div className="h-14 px-4 border-b border-border-custom flex items-center justify-between shrink-0 bg-background">
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
                      <button onClick={clearChecked} className="text-xs text-muted hover:text-foreground underline font-normal">
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
                        className="p-1 text-muted hover:text-foreground hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50 rounded-full"
                        title="Označit hvězdičkou"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          alert(`Odstranit vybrané: ${Array.from(checkedHouseholds).join(", ")}`);
                          clearChecked();
                        }}
                        className="p-1 text-muted hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-950/20 rounded-full"
                        title="Smazat vybrané"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-normal text-muted">
                      Kontakty ({filteredHouseholds.length})
                    </span>
                  )}
                </div>

                {/* Right actions: sorting & column chooser */}
                <div className="flex items-center gap-3 relative mr-2 select-none">
                  {/* Sorting dropdown */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-transparent text-xs font-medium text-muted hover:text-foreground cursor-pointer focus:outline-none border border-border-custom/50 rounded-lg py-1 pl-2 pr-6 bg-card"
                    >
                      <option value="name">Řadit: Jméno</option>
                      <option value="address">Řadit: Město</option>
                      <option value="children_count">Řadit: Počet dětí</option>
                      <option value="status">Řadit: Stav</option>
                    </select>
                  </div>

                  {/* Column Config Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowColumnPicker(!showColumnPicker)}
                      className="p-1 text-muted hover:text-foreground hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50 rounded-lg transition-all flex items-center gap-1 border border-border-custom/50 px-2 py-1 cursor-pointer bg-card"
                      title="Správa sloupců"
                    >
                      <Settings className="w-4 h-4 stroke-[1.8]" />
                      <span className="text-xs font-medium">Sloupce</span>
                    </button>

                    {showColumnPicker && (
                      <div className="absolute right-0 top-9 bg-card border border-border-custom shadow-lg rounded-2xl p-4 w-60 z-50 text-sm animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="flex justify-between items-center pb-2 border-b border-border-custom mb-2">
                          <span className="font-medium text-xs text-muted uppercase tracking-wider">Aktivní sloupce</span>
                          <button 
                            onClick={() => setShowColumnPicker(false)}
                            className="p-1 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] rounded-full text-muted cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {[
                            ...visibleColumns,
                            ...["name", "address", "phone", "email", "care_type", "children_count", "status"].filter(c => !visibleColumns.includes(c))
                          ].map((colId, idx) => {
                            const isVisible = visibleColumns.includes(colId);
                            const label = COLUMN_LABELS[colId] || colId;
                            return (
                              <div key={colId} className="flex items-center justify-between py-1 px-1.5 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50 rounded-lg group/col text-xs">
                                <label className="flex items-center gap-2 cursor-pointer flex-1 py-0.5">
                                  <input 
                                    type="checkbox"
                                    checked={isVisible}
                                    onChange={() => {
                                      if (isVisible) {
                                        if (visibleColumns.length > 1) {
                                          setVisibleColumns(prev => prev.filter(c => c !== colId));
                                        }
                                      } else {
                                        setVisibleColumns(prev => [...prev, colId]);
                                      }
                                    }}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-primary bg-transparent focus:ring-primary"
                                  />
                                  <span className="text-foreground font-normal">{label}</span>
                                </label>
                                {isVisible && (
                                  <div className="flex gap-0.5 opacity-0 group-hover/col:opacity-100 transition-opacity">
                                    <button 
                                      disabled={idx === 0}
                                      onClick={() => {
                                        setVisibleColumns(prev => {
                                          const next = [...prev];
                                          const pos = next.indexOf(colId);
                                          if (pos > 0) {
                                            const temp = next[pos];
                                            next[pos] = next[pos - 1];
                                            next[pos - 1] = temp;
                                          }
                                          return next;
                                        });
                                      }}
                                      className="p-0.5 hover:bg-gray-250 dark:hover:bg-gray-750 rounded text-muted disabled:opacity-30 cursor-pointer text-[10px]"
                                      title="Posunout vlevo"
                                    >
                                      ▲
                                    </button>
                                    <button 
                                      disabled={idx === visibleColumns.length - 1}
                                      onClick={() => {
                                        setVisibleColumns(prev => {
                                          const next = [...prev];
                                          const pos = next.indexOf(colId);
                                          if (pos >= 0 && pos < next.length - 1) {
                                            const temp = next[pos];
                                            next[pos] = next[pos + 1];
                                            next[pos + 1] = temp;
                                          }
                                          return next;
                                        });
                                      }}
                                      className="p-0.5 hover:bg-gray-250 dark:hover:bg-gray-700 rounded text-muted disabled:opacity-30 cursor-pointer text-[10px]"
                                      title="Posunout vpravo"
                                    >
                                      ▼
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rows */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-custom text-xs font-medium text-muted">
                      <th className="py-2.5 px-4 w-12 text-center"></th>
                      <th className="py-2.5 px-1 w-8 text-center"></th>
                      {visibleColumns.map((colId) => {
                        const label = COLUMN_LABELS[colId] || colId;
                        return (
                          <th 
                            key={colId} 
                            className={`py-2.5 px-3 ${colId === 'status' ? 'text-right pr-6' : ''}`}
                          >
                            {label}
                          </th>
                        );
                      })}
                      <th className="py-2.5 px-4 w-16 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHouseholds.map((h) => {
                      const isChecked = checkedHouseholds.has(h.id);
                      const isStarred = starredHouseholds.has(h.id);

                      return (
                        <tr 
                          key={h.id}
                          onClick={() => {
                            setSelectedFamilyId(h.householdId);
                            setActiveTab("overview");
                          }}
                          className={`group border-b border-border-custom cursor-pointer transition-colors ${
                            isChecked ? "bg-[#e8f0fe]/50 dark:bg-[#0842a0]/10" : "hover:bg-[#f1f3f4]/70 dark:hover:bg-[#2d2f31]/30"
                          } ${
                            selectedFamilyId === h.householdId ? "bg-[#e8f0fe] dark:bg-[#0842a0]/20" : ""
                          }`}
                        >
                          {/* Avatar checkbox */}
                          <td className="py-3 px-4 w-12 align-middle text-center select-none" onClick={(e) => e.stopPropagation()}>
                            <div className="relative w-8 h-8 flex items-center justify-center mx-auto">
                              <div className={`absolute w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs transition-all duration-150 ${
                                isChecked ? "scale-0 opacity-0" : "scale-100 opacity-100 group-hover:scale-0 group-hover:opacity-0"
                              } ${
                                h.status === "active" ? "bg-emerald-100 text-emerald-850 dark:bg-emerald-950 dark:text-emerald-300" : "bg-blue-100 text-blue-855 dark:bg-blue-950 dark:text-blue-300"
                              }`}>
                                {h.name?.charAt(0) || "P"}
                              </div>
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCheckedHousehold(h.id)}
                                className={`absolute w-4 h-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary transition-all duration-150 ${
                                  isChecked ? "scale-100 opacity-100" : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                                }`}
                              />
                            </div>
                          </td>

                          {/* Star toggle */}
                          <td className="py-3 px-1 w-8 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleStarredHousehold(h.id)} className="p-1 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-full transition-colors">
                              <Star className={`w-4.5 h-4.5 transition-colors ${
                                isStarred ? "text-amber-500 fill-amber-500" : "text-gray-300 dark:text-gray-650 hover:text-gray-500"
                              }`} />
                            </button>
                          </td>

                          {/* Dynamic columns */}
                          {visibleColumns.map((colId) => {
                            if (colId === "name") {
                              return (
                                <td key={colId} className="py-3 px-3 align-middle text-sm text-foreground">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-foreground">
                                      {h.name}
                                      {h.isPerson && h.role === "child" && h.birthDate && (
                                        <span className="text-xs text-muted ml-2 font-normal">
                                          (Dítě, {new Date().getFullYear() - new Date(h.birthDate).getFullYear()} let)
                                        </span>
                                      )}
                                      {h.isPerson && h.role === "foster_parent" && (
                                        <span className="text-xs text-muted ml-2 font-normal">
                                          (Pěstoun)
                                        </span>
                                      )}
                                      {h.isPerson && h.role !== "child" && h.role !== "foster_parent" && h.role && (
                                        <span className="text-xs text-muted ml-2 font-normal">
                                          ({h.role === 'bio_parent' ? 'Biologický rodič' : 'Sociální kontakt'})
                                        </span>
                                      )}
                                    </span>
                                    {!h.isPerson && h.childrenList && h.childrenList.length > 0 && (
                                      <span className="text-xs text-muted mt-0.5 truncate max-w-xs font-normal">
                                        Děti: {h.childrenList.join(", ")}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            if (colId === "address") {
                              return (
                                <td key={colId} className="py-3 px-4 align-middle text-sm text-foreground/80 font-normal">
                                  {h.address || <span className="text-muted italic">Bez adresy</span>}
                                </td>
                              );
                            }

                            if (colId === "phone") {
                              return (
                                <td key={colId} className="py-3 px-4 align-middle text-sm text-foreground/80 font-normal">
                                  {h.phone || <span className="text-muted italic">-</span>}
                                </td>
                              );
                            }

                            if (colId === "email") {
                              return (
                                <td key={colId} className="py-3 px-4 align-middle text-sm text-foreground/80 font-normal">
                                  {h.email || <span className="text-muted italic">-</span>}
                                </td>
                              );
                            }

                            if (colId === "care_type") {
                              return (
                                <td key={colId} className="py-3 px-4 align-middle text-sm">
                                  {h.careType ? renderCareTypeBadge(h.careType) : <span className="text-muted italic">-</span>}
                                </td>
                              );
                            }

                            if (colId === "children_count") {
                              return (
                                <td key={colId} className="py-3 px-4 align-middle text-sm text-foreground/80 font-normal">
                                  {h.childrenCount > 0 ? `${h.childrenCount} dětí` : "Bez dětí"}
                                </td>
                              );
                            }

                            if (colId === "status") {
                              const statusObj = getStatusObj(h.status);
                              return (
                                <td key={colId} className="py-3 px-4 text-right pr-6 align-middle text-xs select-none">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-normal tracking-wide ${statusObj.colorClass}`}>
                                    {statusObj.label}
                                  </span>
                                </td>
                              );
                            }

                            return null;
                          })}

                          {/* Hover Actions column at the end */}
                          <td className="py-3 px-4 w-16 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center gap-1">
                              <button onClick={() => alert(`Upravit: ${h.name}`)} className="p-1 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-full text-muted hover:text-foreground transition-colors cursor-pointer" title="Upravit">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => alert(`Odebrat: ${h.name}`)} className="p-1 hover:bg-red-500/10 dark:hover:bg-red-950/20 rounded-full text-muted hover:text-red-500 transition-colors cursor-pointer" title="Smazat">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ========================================================= */}
          {/* B. VIEW 2: GMAIL STYLE EVENTS VIEW (Mail active)          */}
          {/* ========================================================= */}
          {activeService === 'mail' && (
            <section className="bg-background flex flex-col transition-all duration-200 overflow-hidden flex-1 min-w-[320px]">
              
              {/* Gmail Inbox tabs header */}
              <div className="border-b border-border-custom flex bg-background shrink-0 select-none">
                {[
                  { id: "primary", label: "Primární", icon: Inbox, color: "border-[#1a73e8] text-[#1a73e8]", activeColorClass: "bg-[#e8f0fe]/30" },
                  { id: "promo", label: "Promoakce", icon: Tag, color: "border-[#137333] text-[#137333]", activeColorClass: "bg-[#e6f4ea]/30" },
                  { id: "social", label: "Sociální sítě", icon: Users, color: "border-[#a142f4] text-[#a142f4]", activeColorClass: "bg-[#f3e8fd]/30" }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => { setActiveMailTab(tab.id as any); setSelectedEventId(null); }}
                    className={`flex-1 py-4 px-4 flex items-center justify-center gap-3 text-xs font-medium border-b-4 transition-all ${
                      activeMailTab === tab.id 
                        ? `${tab.color} ${tab.activeColorClass}` 
                        : "border-transparent text-muted hover:text-foreground hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50"
                    }`}
                  >
                    <tab.icon className="w-4.5 h-4.5 stroke-[1.8]" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Email Table list */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    {getGmailFilteredEvents().map((e) => {
                      const h = households.find(house => house.id === e.household_id);
                      const p = h ? persons.find(per => per.household_id === h.id && per.role === "foster_parent") : null;
                      const senderName = p ? `${p.first_name} ${p.last_name}` : "Systém";
                      const isStarred = starredEvents.has(e.id);
                      const isSelected = selectedEventId === e.id;

                      return (
                        <tr 
                          key={e.id}
                          onClick={() => { setSelectedEventId(e.id); }}
                          className={`group border-b border-border-custom cursor-pointer transition-colors text-sm hover:bg-[#f1f3f4]/70 dark:hover:bg-[#2d2f31]/30 ${
                            isSelected ? "bg-[#e8f0fe] dark:bg-[#0842a0]/15" : ""
                          }`}
                        >
                          {/* Gmail checkbox (decorative in event table) */}
                          <td className="py-2.5 px-3 w-10 text-center select-none" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="w-4 h-4 cursor-pointer rounded border-gray-300" />
                          </td>

                          {/* Gmail star */}
                          <td className="py-2.5 px-1 w-8 text-center select-none" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => {
                                setStarredEvents(prev => {
                                  const next = new Set(prev);
                                  if (next.has(e.id)) next.delete(e.id);
                                  else next.add(e.id);
                                  return next;
                                });
                              }}
                              className="p-1 rounded-full text-gray-300 hover:text-gray-500"
                            >
                              <Star className={`w-4 h-4 ${isStarred ? "text-amber-500 fill-amber-500" : ""}`} />
                            </button>
                          </td>

                          {/* Sender name */}
                          <td className="py-2.5 px-3 w-36 font-normal text-foreground truncate">
                            {senderName}
                          </td>

                          {/* Subject and body snippet */}
                          <td className="py-2.5 px-3 truncate max-w-xs font-normal">
                            <span className="text-foreground/90 font-medium mr-1">{e.title}</span>
                            <span className="text-muted text-xs font-normal">- {e.payload?.content || e.payload?.text || "Bez detailu"}</span>
                          </td>

                          {/* Date */}
                          <td className="py-2.5 px-4 text-right text-xs text-muted w-20 font-normal">
                            {new Date(e.occurred_at).toLocaleDateString("cs-CZ", { month: "short", day: "numeric" })}
                          </td>
                        </tr>
                      );
                    })}
                    {getGmailFilteredEvents().length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-sm text-muted italic">
                          Složka je prázdná.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ========================================================= */}
          {/* C. VIEW 3: GOOGLE CHAT STREAM VIEW (Chat active)          */}
          {/* ========================================================= */}
          {activeService === 'chat' && (
            <section className="flex-1 flex flex-col overflow-hidden bg-background">
              {selectedFamilyId ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  
                  {/* Chat header */}
                  <div className="h-14 px-6 border-b border-border-custom flex items-center justify-between bg-background shrink-0 select-none">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-xs">
                        {primaryFosterParent?.first_name?.charAt(0) || "P"}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-foreground">
                          {primaryFosterParent ? `${primaryFosterParent.first_name} ${primaryFosterParent.last_name}` : "Chat konverzace"}
                        </h4>
                        <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5 font-normal">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                          Aktivní
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button className="p-2 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50 rounded-full text-muted transition-colors">
                        <Video className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50 rounded-full text-muted transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bubbles stream */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 dark:bg-gray-900/10">
                    <div className="text-center my-4">
                      <span className="text-[10px] bg-slate-100 dark:bg-gray-800 px-3 py-1 rounded-full text-muted font-normal">
                        Historie chatu je šifrovaná
                      </span>
                    </div>

                    {activeChatFeed.map((msg, index) => (
                      <div 
                        key={index}
                        className={`flex gap-3 max-w-xl ${msg.isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs shrink-0 select-none ${
                          msg.isMe ? "bg-slate-300 text-slate-800" : "bg-primary/20 text-primary"
                        }`}>
                          {msg.isMe ? "Já" : msg.sender.charAt(0)}
                        </div>
                        <div className="space-y-1">
                          <div className={`px-4 py-2.5 rounded-2xl text-sm font-normal leading-relaxed ${
                            msg.isMe 
                              ? "bg-primary text-white rounded-tr-none" 
                              : "bg-[#f1f3f4] dark:bg-gray-800 text-foreground rounded-tl-none"
                          }`}>
                            <p>{msg.text}</p>
                          </div>
                          <span className="text-[10px] text-muted block pl-1">{msg.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input (MD3 Chat pill) */}
                  <div className="p-4 bg-background border-t border-border-custom shrink-0">
                    <div className="max-w-4xl mx-auto flex items-center gap-2 bg-[#f1f3f4] dark:bg-[#2d2f31] rounded-full px-4 py-2">
                      <button className="p-1.5 text-muted hover:text-foreground hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-full transition-colors">
                        <Paperclip className="w-4.5 h-4.5" />
                      </button>
                      <input 
                        type="text" 
                        placeholder="Napište zprávu..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                        className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm text-foreground placeholder-muted"
                      />
                      <button 
                        onClick={handleSendMessage}
                        className="p-2 bg-primary hover:bg-primary-hover text-white rounded-full transition-colors shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted italic bg-background font-normal gap-2 select-none">
                  <MessageSquare className="w-10 h-10 text-muted/50 stroke-[1]" />
                  <span>Vyberte kontakt v levém sloupci pro zahájení chatu.</span>
                </div>
              )}
            </section>
          )}

          {/* ========================================================= */}
          {/* 4. RESIZABLE RIGHT PANEL DETAIL                           */}
          {/* ========================================================= */}
          
          {/* Contacts active: detail of the household */}
          {activeService === 'contacts' && selectedHousehold && (
            <>
              {/* Divider drag Splitter line */}
              <div 
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
                className={`w-1 cursor-col-resize hover:bg-primary/55 active:bg-primary transition-colors shrink-0 z-30 ${
                  isResizing ? "bg-primary" : "bg-border-custom"
                }`}
              />
              <div 
                style={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : `${detailWidth}px` }} 
                className="bg-card shrink-0 flex flex-col overflow-hidden transition-all duration-75 border-l border-border-custom w-full md:w-auto"
              >
                
                {/* Header detail */}
                <div className="p-6 border-b border-border-custom flex items-center justify-between bg-card shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedFamilyId(null)}
                        className="p-1.5 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/55 rounded-full text-muted mr-1.5 transition-colors"
                        title="Zpět na seznam"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <h3 className="text-xl font-medium text-foreground tracking-tight">
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
                  <div className="flex items-center gap-1.5">
                    <button className="px-4 py-2 bg-background hover:bg-gray-100 dark:hover:bg-gray-800 text-foreground border border-border-custom rounded-full text-xs font-medium transition-all">
                      Export spisu
                    </button>
                    <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-full text-xs font-medium transition-all shadow-xs">
                      Upravit
                    </button>
                    <button 
                      onClick={() => setSelectedFamilyId(null)}
                      title="Zavřít"
                      className="p-1.5 text-muted hover:text-foreground hover:bg-gray-150 dark:hover:bg-gray-800 rounded-full transition-all hidden md:block"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Tab layout inside panel */}
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

                {/* Main panel body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/10">
                  
                  {activeTab === "overview" && (
                    <div className="space-y-6">
                      
                      {/* Main Foster parent */}
                      <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-5 shadow-xs">
                        <div className="flex items-center gap-4">
                          {primaryFosterParent?.custom_fields?.avatar_url ? (
                            <img src={primaryFosterParent.custom_fields.avatar_url} alt="avatar" className="w-14 h-14 rounded-full border border-border-custom object-cover" />
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
                                  className="text-primary p-1 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/55 rounded-full transition-colors"
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

                      {/* Children */}
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider pl-1">Děti v pěstounské péči</h4>
                        {fosterChildren.map((child) => (
                          <div key={child.id} className="bg-background border border-border-custom p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[#f1f3f4]/50 dark:hover:bg-[#2d2f31]/20 transition-colors">
                            <div className="flex items-center gap-4">
                              {child.custom_fields?.avatar_url ? (
                                <img src={child.custom_fields.avatar_url} alt="child" className="w-12 h-12 rounded-full object-cover border border-border-custom" />
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
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-normal border bg-emerald-50 text-emerald-700 border-emerald-200">
                              Hodnocení {child.safety_rating}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Relatives and Bio parent details */}
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider pl-1">Další kontakty a biologické vazby</h4>
                        {biologicalParents.map((bio) => (
                          <div key={bio.id} className={`p-4 rounded-3xl border ${bio.safety_rating === 'Z' ? 'bg-red-50/20 border-red-200 dark:bg-red-950/10' : 'bg-background border-border-custom'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 border border-border-custom flex items-center justify-center font-medium text-sm">B</div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{bio.first_name} {bio.last_name}</p>
                                  <p className="text-xs text-muted">Biologický rodič</p>
                                </div>
                              </div>
                              {bio.safety_rating === 'Z' ? (
                                <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded-full">Styk zakázán</span>
                              ) : (
                                <span className="text-xs font-mono bg-card px-2 py-1 rounded border border-border-custom">{bio.phone || "Bez tel."}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  )}

                  {activeTab === "timeline" && (
                    <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-5 shadow-xs">
                      <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider pl-1">Historie klientských kontaktů</h4>
                      <div className="relative border-l-2 border-primary/20 ml-2.5 pl-6 space-y-6">
                        {selectedFamilyEvents.map((e) => (
                          <div key={e.id} className="relative">
                            <div className={`absolute -left-[29.5px] top-1.5 w-3 h-3 rounded-full ring-4 ring-card ${e.type === "crisis_event" ? "bg-red-500" : "bg-primary"}`} />
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <h5 className="font-medium text-sm text-foreground">{e.title}</h5>
                                <p className="text-xs text-muted leading-relaxed font-normal">{e.payload?.content || e.payload?.text || "Bez textu"}</p>
                              </div>
                              <span className="text-[10px] text-muted whitespace-nowrap bg-card px-2 py-0.5 rounded border border-border-custom">{new Date(e.occurred_at).toLocaleDateString("cs-CZ")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "registry" && (
                    <div className="space-y-6">
                      <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-4 shadow-xs">
                        <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider flex items-center gap-2 pl-1"><GraduationCap className="w-5 h-5 text-primary" /> Evidence vzdělávání dětí</h4>
                        <div className="divide-y divide-border-custom">
                          {fosterChildren.map((child) => (
                            <div key={child.id} className="py-3 first:pt-0 last:pb-0 flex justify-between items-center text-sm">
                              <div>
                                <span className="font-medium block">{child.first_name} {child.last_name}</span>
                                <span className="text-muted block text-xs">{child.custom_fields?.school || "ZŠ Merhautova Brno"}</span>
                              </div>
                              <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">Třída: 6.A</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-4 shadow-xs">
                        <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider flex items-center gap-2 pl-1"><FileText className="w-5 h-5 text-primary" /> Spisy a smluvní dokumenty (DMS)</h4>
                        <div className="space-y-2">
                          {[
                            { name: "Dohoda o doprovázení pěstounské rodiny.pdf", size: "2.4 MB" },
                            { name: "IPOD - Individuální plán ochrany dítěte.pdf", size: "1.8 MB" }
                          ].map((doc, idx) => (
                            <div key={idx} className="p-3 bg-card rounded-2xl border border-border-custom/50 flex justify-between items-center text-sm shadow-xs">
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-muted" />
                                <div>
                                  <span className="font-normal block text-sm">{doc.name}</span>
                                  <span className="text-[10px] text-muted block">{doc.size}</span>
                                </div>
                              </div>
                              <button className="p-1.5 hover:bg-gray-100 rounded-full border border-border-custom"><FileDown className="w-4 h-4" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* AI Copilot */}
                <div className="p-4 border-t border-border-custom bg-card shrink-0">
                  <div className="max-w-4xl mx-auto relative flex items-center">
                    <Sparkles className="absolute left-4 w-4 h-4 text-primary" />
                    <input 
                      type="text" 
                      placeholder="Zeptejte se AI na cokoliv ze spisu rodiny..."
                      className="w-full pl-11 pr-24 py-3 bg-[#f1f3f4] dark:bg-[#2d2f31] border border-transparent rounded-full text-xs text-foreground focus:bg-card focus:border-primary focus:outline-none transition-all shadow-xs"
                    />
                    <button className="absolute right-3 px-4 py-1.5 bg-primary text-white rounded-full text-[11px] font-medium">Položit dotaz</button>
                  </div>
                </div>

              </div>
            </>
          )}

          {/* Mail active: selected timeline event detail (Gmail detail card - Screen 3 style) */}
          {activeService === 'mail' && selectedGmailEvent && (
            <>
              {/* Divider drag Splitter line */}
              <div 
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
                className={`w-1 cursor-col-resize hover:bg-primary/55 active:bg-primary transition-colors shrink-0 z-30 ${
                  isResizing ? "bg-primary" : "bg-border-custom"
                }`}
              />
              <div 
                style={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : `${detailWidth}px` }} 
                className="bg-card shrink-0 flex flex-col overflow-hidden transition-all duration-75 border-l border-border-custom w-full md:w-auto"
              >
                {/* Gmail-style toolbar above email */}
                <div className="h-14 border-b border-border-custom px-4 flex items-center justify-between shrink-0 bg-background">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelectedEventId(null)} className="p-2 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/55 rounded-full text-muted transition-colors" title="Zpět">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="w-px h-5 bg-border-custom mx-1" />
                    <button onClick={() => alert("Odeslat do archivu")} className="p-2 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/55 rounded-full text-muted transition-colors" title="Archivovat">
                      <Inbox className="w-4.5 h-4.5" />
                    </button>
                    <button onClick={() => alert("Smazat spis/e-mail")} className="p-2 hover:bg-red-500/10 dark:hover:bg-red-950/20 rounded-full text-muted hover:text-red-500 transition-colors" title="Smazat">
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted font-normal select-none">
                    <span>1 z 1</span>
                  </div>
                </div>

                {/* Email Content (Screen 3 style replication) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-card">
                  
                  {/* Subject and tags */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-medium text-foreground tracking-tight">
                        {selectedGmailEvent.title}
                      </h2>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-muted rounded text-[10px] font-normal border border-border-custom">
                        Doručená pošta <span className="text-red-500 ml-1">x</span>
                      </span>
                    </div>
                  </div>

                  {/* Sender and recipient info card */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-sm">
                        S
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-foreground">Systém doprovázení CRM</span>
                          <span className="text-xs text-muted font-normal">&lt;podpora@doprovazeni.cz&gt;</span>
                        </div>
                        <p className="text-xs text-muted font-normal mt-0.5">komu: mně</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted font-normal">
                      <span>{new Date(selectedGmailEvent.occurred_at).toLocaleString("cs-CZ")}</span>
                      <button className="p-1 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-full transition-colors">
                        <Star className="w-4 h-4 text-gray-300" />
                      </button>
                    </div>
                  </div>

                  {/* Event Details Content Block (Replicating email body) */}
                  <div className="border border-border-custom rounded-2xl p-6 space-y-4 bg-gray-50/30 dark:bg-gray-900/10 text-sm leading-relaxed text-foreground font-normal">
                    <h3 className="font-medium text-base text-foreground pb-2 border-b border-border-custom flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Záznam klientského spisu
                    </h3>
                    <p>{selectedGmailEvent.payload?.content || selectedGmailEvent.payload?.text || "K této události není evidován podrobný textový popis."}</p>
                    <div className="pt-4 mt-4 border-t border-border-custom/80 flex items-center gap-4 text-xs text-muted">
                      <span>Typ události: {selectedGmailEvent.type}</span>
                      <span>•</span>
                      <span>Autor ID: {selectedGmailEvent.author_id || "Automat"}</span>
                    </div>
                  </div>

                  {/* Reply Action footer (Screen 3 style replication) */}
                  <div className="pt-6 border-t border-border-custom flex items-center gap-2 flex-wrap select-none">
                    <button onClick={() => alert("Odpovědět...")} className="px-4 py-2 bg-background hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/55 text-foreground border border-border-custom rounded-full text-xs font-medium transition-colors">
                      Odpovědět
                    </button>
                    <button onClick={() => alert("Odpovědět všem...")} className="px-4 py-2 bg-background hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/55 text-foreground border border-border-custom rounded-full text-xs font-medium transition-colors">
                      Odpovědět všem
                    </button>
                    <button onClick={() => alert("Přeposlat...")} className="px-4 py-2 bg-background hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/55 text-foreground border border-border-custom rounded-full text-xs font-medium transition-colors">
                      Přeposlat
                    </button>
                  </div>

                </div>
              </div>
            </>
          )}

          {/* Chat active: resizable right panel showing shared Google Drive files (Screen 4 style) */}
          {activeService === 'chat' && selectedFamilyId && (
            <>
              {/* Divider drag Splitter line */}
              <div 
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
                className={`w-1 cursor-col-resize hover:bg-primary/55 active:bg-primary transition-colors shrink-0 z-30 ${
                  isResizing ? "bg-primary" : "bg-border-custom"
                }`}
              />

              <div 
                style={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : `${detailWidth}px` }} 
                className="bg-card shrink-0 flex flex-col overflow-hidden transition-all duration-75 border-l border-border-custom w-full md:w-auto"
              >
                
                {/* Header */}
                <div className="p-4 border-b border-border-custom flex items-center justify-between bg-card shrink-0 select-none">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Building2 className="w-4.5 h-4.5 text-primary" />
                    Google Disk (Sdílené soubory)
                  </span>
                  <button onClick={() => setSelectedFamilyId(null)} className="p-1 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/55 rounded-full text-muted md:hidden transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drive file list viewport (Screen 4 replication) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/20 dark:bg-gray-900/10">
                  <div className="bg-background border border-border-custom rounded-3xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border-custom">
                      <span className="text-xs font-medium text-muted uppercase tracking-wider">Název souboru</span>
                      <span className="text-xs font-medium text-muted uppercase tracking-wider">Velikost</span>
                    </div>

                    {[
                      { name: "Smlouva o doprovázení rodiny.pdf", size: "2.4 MB", type: "pdf" },
                      { name: "IPOD klientský spis 2025.pdf", size: "1.8 MB", type: "pdf" },
                      { name: "Rozhodnutí soudu o svěření dětí.pdf", size: "4.1 MB", type: "pdf" },
                      { name: "Fotka ze společné akce.jpg", size: "3.2 MB", type: "image" },
                      { name: "GDPR souhlas pěstounů.pdf", size: "950 KB", type: "pdf" }
                    ].map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-card hover:bg-[#f1f3f4]/70 dark:hover:bg-[#2d2f31]/30 rounded-2xl border border-border-custom/50 shadow-2xs transition-colors">
                        <div className="flex items-center gap-3 truncate">
                          <FileText className="w-4.5 h-4.5 text-muted shrink-0" />
                          <span className="text-sm font-normal text-foreground truncate">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs text-muted font-mono">{file.size}</span>
                          <button className="p-1 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-full text-muted hover:text-foreground border border-border-custom/40 transition-colors">
                            <FileDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Drive usage stat card */}
                  <div className="bg-background border border-border-custom rounded-3xl p-5 shadow-xs space-y-2">
                    <span className="text-xs font-medium text-muted uppercase tracking-wider block">Využití úložiště</span>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: "35%" }} />
                    </div>
                    <span className="text-[11px] text-muted block mt-1 font-normal">Využito 12.4 MB z 15 GB (Zkušební verze)</span>
                  </div>
                </div>
              </div>
            </>
          )}



        </div>
      </div>
    </div>
  );
}