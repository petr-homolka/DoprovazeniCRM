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
  CheckSquare,
  Lightbulb,
  RefreshCw
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
  children_count: "Dětí v péči",
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
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedStatuses");
      if (saved) return JSON.parse(saved);
    }
    return ["active", "applicant", "preparation", "paused", "terminated", "lead"];
  });
  const [selectedCareTypes, setSelectedCareTypes] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedCareTypes");
      if (saved) return JSON.parse(saved);
    }
    return ["A", "B", "C"];
  });

  // Gmail-style row interaction states
  const [starredHouseholds, setStarredHouseholds] = useState<Set<string>>(new Set());
  const [checkedHouseholds, setCheckedHouseholds] = useState<Set<string>>(new Set());

  // Google Workspace Service State
  // contacts = Google Contacts, mail = Gmail, chat = Google Chat
  const [activeService, setActiveService] = useState<'contacts' | 'mail' | 'chat'>('contacts');

  // Contact sub-categories filtering
  const [contactFilterType, setContactFilterType] = useState<'families' | 'foster_parents' | 'children' | 'others'>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("contactFilterType");
      if (saved) return saved as any;
    }
    return 'families';
  });

  // Dynamic columns state
  const [columnsOrder, setColumnsOrder] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("columnsOrder");
      if (saved) return JSON.parse(saved);
    }
    return ['name', 'address', 'care_type', 'children_count', 'status', 'phone', 'email'];
  });
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("visibleColumns");
      if (saved) return JSON.parse(saved);
    }
    return ['name', 'address', 'care_type', 'children_count', 'status'];
  });
  const [showColumnPicker, setShowColumnPicker] = useState<boolean>(false);
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [hoveredChildId, setHoveredChildId] = useState<string | null>(null);

  // Right vertical switcher rail and widget drawer state
  const [activeRightWidget, setActiveRightWidget] = useState<'calendar' | 'keep' | 'tasks' | 'maps' | null>(null);
  const [designMode, setDesignMode] = useState<'google' | 'yandex'>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("designMode");
      if (saved === 'yandex' || saved === 'google') return saved;
    }
    return 'google';
  });

  const toggleRightWidget = (widget: 'calendar' | 'keep' | 'tasks' | 'maps') => {
    if (activeRightWidget === widget) {
      setActiveRightWidget(null);
    } else {
      setActiveRightWidget(widget);
    }
  };



  // Google Keep persistent notes
  const [keepNotes, setKeepNotes] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("keepNotes");
      if (saved) return JSON.parse(saved);
    }
    return [
      { id: "note-1", title: "Papíry na IPOD", content: "Vzít s sebou na schůzku k Novákovým podklady k IPOD a nechat podepsat pěstouny.", color: "bg-[#fff4b8] dark:bg-[#fff4b8]/20" },
      { id: "note-2", title: "Tomáš - psycholog", content: "Zavolat dětskému psychologovi a vyžádat si zprávu z vyšetření pro OSPOD.", color: "bg-[#e8f0fe] dark:bg-[#e8f0fe]/20" }
    ];
  });

  // Google Tasks persistent tasks
  const [tasks, setTasks] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tasks");
      if (saved) return JSON.parse(saved);
    }
    return [
      { id: "task-1", text: "Podepsat dohodu o doprovázení FF-4029", completed: false },
      { id: "task-2", text: "Odeslat výkazy na úřad práce Brno", completed: true },
      { id: "task-3", text: "Objednat supervizi na příští měsíc", completed: false }
    ];
  });

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteColor, setNoteColor] = useState("bg-[#fff4b8] dark:bg-[#fff4b8]/20");
  const [taskText, setTaskText] = useState("");

  // Registries and Document Management System (DMS) States
  const [selectedRegistryChildId, setSelectedRegistryChildId] = useState<string | null>(null);
  const [educationHistory, setEducationHistory] = useState<Record<string, any[]>>({});
  const [medicalRecords, setMedicalRecords] = useState<Record<string, any>>({});
  const [physiologicalMetrics, setPhysiologicalMetrics] = useState<Record<string, any[]>>({});
  const [identityDocs, setIdentityDocs] = useState<Record<string, any>>({});
  const [consents, setConsents] = useState<Record<string, any[]>>({});

  // OCR and editing UI states
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrSuccessAlert, setOcrSuccessAlert] = useState<string | null>(null);
  
  const [isEditingPediatrician, setIsEditingPediatrician] = useState(false);
  const [editedPediatrician, setEditedPediatrician] = useState("");
  const [editedPediatricianPhone, setEditedPediatricianPhone] = useState("");
  const [editedPediatricianAddress, setEditedPediatricianAddress] = useState("");
  const [editedAllergies, setEditedAllergies] = useState("");

  const [newSchoolYear, setNewSchoolYear] = useState("");
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newGradeClass, setNewGradeClass] = useState("");
  const [newSchoolNote, setNewSchoolNote] = useState("");
  const [showAddSchoolForm, setShowAddSchoolForm] = useState(false);

  const [newVaccine, setNewVaccine] = useState("");
  const [newVaccineDate, setNewVaccineDate] = useState("");
  const [showAddVaccineForm, setShowAddVaccineForm] = useState(false);

  const [newPhysHeight, setNewPhysHeight] = useState("");
  const [newPhysWeight, setNewPhysWeight] = useState("");
  const [newPhysDate, setNewPhysDate] = useState("");
  const [showAddPhysForm, setShowAddPhysForm] = useState(false);

  // Dynamic Custom Fields Editing States
  const [editingCustomFieldsPersonId, setEditingCustomFieldsPersonId] = useState<string | null>(null);
  const [tempCustomFields, setTempCustomFields] = useState<Array<{ label: string, value: string }>>([]);

  // Load and initialize child registries from localStorage or seed fallback
  useEffect(() => {
    if (typeof window === "undefined" || persons.length === 0) return;

    const savedEducation = localStorage.getItem("educationHistory");
    const savedMedical = localStorage.getItem("medicalRecords");
    const savedPhysiological = localStorage.getItem("physiologicalMetrics");
    const savedIdentity = localStorage.getItem("identityDocs");
    const savedConsents = localStorage.getItem("consents");

    let eduObj = savedEducation ? JSON.parse(savedEducation) : {};
    let medObj = savedMedical ? JSON.parse(savedMedical) : {};
    let physObj = savedPhysiological ? JSON.parse(savedPhysiological) : {};
    let idObj = savedIdentity ? JSON.parse(savedIdentity) : {};
    let conObj = savedConsents ? JSON.parse(savedConsents) : {};

    let updated = false;
    const children = persons.filter(p => p.role === "child");

    children.forEach(child => {
      const cid = child.id;
      if (!eduObj[cid]) {
        eduObj[cid] = [
          { schoolYear: "2025/2026", schoolName: child.custom_fields?.school || "ZŠ Merhautova, Brno", gradeClass: child.custom_fields?.grade || "6.A", note: "Velmi dobrý prospěch, aktivní v zájmových kroužcích." },
          { schoolYear: "2024/2025", schoolName: child.custom_fields?.school || "ZŠ Merhautova, Brno", gradeClass: "5.A", note: "Prospěch s vyznamenáním, vzorná docházka." },
          { schoolYear: "2023/2024", schoolName: "MŠ Pastelka, Brno", gradeClass: "Předškoláci", note: "Příprava na školu proběhla v pořádku." }
        ];
        updated = true;
      }

      if (!medObj[cid]) {
        medObj[cid] = {
          pediatrician: "MUDr. Hana Nováková",
          phone: "+420 541 234 567",
          address: "Milady Horákové 28, 602 00 Brno",
          allergies: child.custom_fields?.allergies || "Bez zjevných alergií",
          vaccinations: [
            { vaccine: "Hexavakcína (dávka 1-3)", date: "12.10.2016", status: "completed" },
            { vaccine: "Hexavakcína (dávka 4)", date: "18.06.2017", status: "completed" },
            { vaccine: "MMR (Priorix)", date: "14.03.2018", status: "completed" },
            { vaccine: "Infanrix Hexa (přeočkování)", date: "22.09.2021", status: "completed" },
            { vaccine: "Pravidelné očkování proti TBC", date: "Čeká se na termín", status: "pending" }
          ]
        };
        updated = true;
      }

      if (!physObj[cid]) {
        const age = child.birth_date ? new Date().getFullYear() - new Date(child.birth_date).getFullYear() : 10;
        const baseHeight = 80 + (age * 6.5);
        const baseWeight = 10 + (age * 3.2);

        physObj[cid] = [
          { date: "15.05.2026", height: Math.round(baseHeight), weight: Math.round(baseWeight) },
          { date: "10.11.2025", height: Math.round(baseHeight - 3), weight: Math.round(baseWeight - 2.5) },
          { date: "12.04.2025", height: Math.round(baseHeight - 6), weight: Math.round(baseWeight - 5) },
          { date: "08.09.2024", height: Math.round(baseHeight - 9), weight: Math.round(baseWeight - 7.5) }
        ];
        updated = true;
      }

      if (!idObj[cid]) {
        idObj[cid] = {
          docType: "Občanský průkaz (Dětský)",
          docNumber: "987" + Math.floor(100000 + Math.random() * 900000),
          validity: "18.06.2029",
          issuer: "Magistrát města Brna"
        };
        updated = true;
      }

      if (!conObj[cid]) {
        conObj[cid] = [
          { id: "c-1", title: "Souhlas s focením a prezentací činností", signed: true, signedDate: "01.09.2025", fileUrl: "/docs/souhlas_foto.pdf" },
          { id: "c-2", title: "Souhlas s lékařským ošetřením a hospitalizací", signed: true, signedDate: "02.09.2025", fileUrl: "/docs/souhlas_lekar.pdf" },
          { id: "c-3", title: "Souhlas s účastí na mimoškolních akcích", signed: false, signedDate: "", fileUrl: "" },
          { id: "c-4", title: "GDPR souhlas se zpracováním osobních údajů", signed: true, signedDate: "01.09.2025", fileUrl: "/docs/gdpr_souhlas.pdf" }
        ];
        updated = true;
      }
    });

    if (updated || !savedEducation) {
      setEducationHistory(eduObj);
      setMedicalRecords(medObj);
      setPhysiologicalMetrics(physObj);
      setIdentityDocs(idObj);
      setConsents(conObj);
      localStorage.setItem("educationHistory", JSON.stringify(eduObj));
      localStorage.setItem("medicalRecords", JSON.stringify(medObj));
      localStorage.setItem("physiologicalMetrics", JSON.stringify(physObj));
      localStorage.setItem("identityDocs", JSON.stringify(idObj));
      localStorage.setItem("consents", JSON.stringify(conObj));
    } else {
      setEducationHistory(eduObj);
      setMedicalRecords(medObj);
      setPhysiologicalMetrics(physObj);
      setIdentityDocs(idObj);
      setConsents(conObj);
    }
  }, [persons]);

  // Persist edits to localStorage when states change
  useEffect(() => {
    if (Object.keys(educationHistory).length > 0) {
      localStorage.setItem("educationHistory", JSON.stringify(educationHistory));
    }
  }, [educationHistory]);

  useEffect(() => {
    if (Object.keys(medicalRecords).length > 0) {
      localStorage.setItem("medicalRecords", JSON.stringify(medicalRecords));
    }
  }, [medicalRecords]);

  useEffect(() => {
    if (Object.keys(physiologicalMetrics).length > 0) {
      localStorage.setItem("physiologicalMetrics", JSON.stringify(physiologicalMetrics));
    }
  }, [physiologicalMetrics]);

  useEffect(() => {
    if (Object.keys(identityDocs).length > 0) {
      localStorage.setItem("identityDocs", JSON.stringify(identityDocs));
    }
  }, [identityDocs]);

  useEffect(() => {
    if (Object.keys(consents).length > 0) {
      localStorage.setItem("consents", JSON.stringify(consents));
    }
  }, [consents]);

  // Keep Notes persistence
  useEffect(() => {
    localStorage.setItem("keepNotes", JSON.stringify(keepNotes));
  }, [keepNotes]);

  // Tasks persistence
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  // Design mode persistence
  useEffect(() => {
    localStorage.setItem("designMode", designMode);
  }, [designMode]);

  const addKeepNote = () => {
    if (!noteContent.trim() && !noteTitle.trim()) return;
    const newNote = {
      id: "note-" + Date.now(),
      title: noteTitle.trim() || "Bez názvu",
      content: noteContent.trim(),
      color: noteColor
    };
    setKeepNotes(prev => [newNote, ...prev]);
    setNoteTitle("");
    setNoteContent("");
  };

  const deleteKeepNote = (id: string) => {
    setKeepNotes(prev => prev.filter(n => n.id !== id));
  };

  const addTask = () => {
    if (!taskText.trim()) return;
    const newTask = {
      id: "task-" + Date.now(),
      text: taskText.trim(),
      completed: false
    };
    setTasks(prev => [...prev, newTask]);
    setTaskText("");
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Drag and drop column handlers
  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", colId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (draggedColId === colId) return;
    setDragOverColId(colId);
  };

  const handleDragEnd = () => {
    setDraggedColId(null);
    setDragOverColId(null);
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId) {
      setDraggedColId(null);
      setDragOverColId(null);
      return;
    }

    const nextOrder = [...columnsOrder];
    const draggedIdx = nextOrder.indexOf(draggedColId);
    const targetIdx = nextOrder.indexOf(targetColId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      nextOrder.splice(draggedIdx, 1);
      nextOrder.splice(targetIdx, 0, draggedColId);
      setColumnsOrder(nextOrder);
    }

    setDraggedColId(null);
    setDragOverColId(null);
  };

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

  // Save settings persistently to localStorage
  useEffect(() => {
    localStorage.setItem("selectedStatuses", JSON.stringify(selectedStatuses));
  }, [selectedStatuses]);

  useEffect(() => {
    localStorage.setItem("selectedCareTypes", JSON.stringify(selectedCareTypes));
  }, [selectedCareTypes]);

  useEffect(() => {
    localStorage.setItem("contactFilterType", contactFilterType);
  }, [contactFilterType]);

  useEffect(() => {
    localStorage.setItem("visibleColumns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem("columnsOrder", JSON.stringify(columnsOrder));
  }, [columnsOrder]);

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

  // Child registries helper functions
  const handleAddSchoolYear = (e: React.FormEvent, activeChildId: string) => {
    e.preventDefault();
    if (!activeChildId || !newSchoolYear || !newSchoolName) return;
    const newEntry = {
      schoolYear: newSchoolYear,
      schoolName: newSchoolName,
      gradeClass: newGradeClass || "-",
      note: newSchoolNote || "Bez dodatečných poznámek"
    };
    setEducationHistory(prev => ({
      ...prev,
      [activeChildId]: [newEntry, ...(prev[activeChildId] || [])]
    }));
    setNewSchoolYear("");
    setNewSchoolName("");
    setNewGradeClass("");
    setNewSchoolNote("");
    setShowAddSchoolForm(false);
  };

  const handleAddVaccine = (e: React.FormEvent, activeChildId: string) => {
    e.preventDefault();
    if (!activeChildId || !newVaccine) return;
    const newEntry = {
      vaccine: newVaccine,
      date: newVaccineDate || "Čeká se na termín",
      status: newVaccineDate ? "completed" : "pending"
    };
    setMedicalRecords(prev => {
      const childRecord = prev[activeChildId] || { vaccinations: [] };
      return {
        ...prev,
        [activeChildId]: {
          ...childRecord,
          vaccinations: [...(childRecord.vaccinations || []), newEntry]
        }
      };
    });
    setNewVaccine("");
    setNewVaccineDate("");
    setShowAddVaccineForm(false);
  };

  const handleToggleVaccine = (vaccineName: string, activeChildId: string) => {
    if (!activeChildId) return;
    setMedicalRecords(prev => {
      const childRecord = prev[activeChildId];
      if (!childRecord) return prev;
      const updatedVaccinations = childRecord.vaccinations.map((v: any) => {
        if (v.vaccine === vaccineName) {
          return {
            ...v,
            status: v.status === "completed" ? "pending" : "completed",
            date: v.status === "completed" ? "Čeká se na termín" : new Date().toLocaleDateString("cs-CZ")
          };
        }
        return v;
      });
      return {
        ...prev,
        [activeChildId]: {
          ...childRecord,
          vaccinations: updatedVaccinations
        }
      };
    });
  };

  const handleAddPhys = (e: React.FormEvent, activeChildId: string) => {
    e.preventDefault();
    if (!activeChildId || !newPhysHeight || !newPhysWeight) return;
    const newEntry = {
      date: newPhysDate || new Date().toLocaleDateString("cs-CZ"),
      height: parseInt(newPhysHeight),
      weight: parseInt(newPhysWeight)
    };
    setPhysiologicalMetrics(prev => ({
      ...prev,
      [activeChildId]: [newEntry, ...(prev[activeChildId] || [])]
    }));
    setNewPhysHeight("");
    setNewPhysWeight("");
    setNewPhysDate("");
    setShowAddPhysForm(false);
  };

  const handleToggleConsent = (consentId: string, activeChildId: string) => {
    if (!activeChildId) return;
    setConsents(prev => {
      const childList = prev[activeChildId] || [];
      const updated = childList.map((c: any) => {
        if (c.id === consentId) {
          return {
            ...c,
            signed: !c.signed,
            signedDate: !c.signed ? new Date().toLocaleDateString("cs-CZ") : ""
          };
        }
        return c;
      });
      return {
        ...prev,
        [activeChildId]: updated
      };
    });
  };

  const triggerOcrScan = (activeChildId: string, currentHeights: any[]) => {
    if (!activeChildId) return;
    setIsOcrScanning(true);
    setOcrSuccessAlert(null);
    setTimeout(() => {
      setIsOcrScanning(false);
      const nextHeight = currentHeights.length > 0 ? currentHeights[0].height + 1 : 153;
      const nextWeight = currentHeights.length > 0 ? currentHeights[0].weight + 1 : 43;
      const todayDate = new Date().toLocaleDateString("cs-CZ");
      
      const newEntry = {
        date: todayDate,
        height: nextHeight,
        weight: nextWeight
      };
      setPhysiologicalMetrics(prev => ({
        ...prev,
        [activeChildId]: [newEntry, ...(prev[activeChildId] || [])]
      }));

      setOcrSuccessAlert(`AI úspěšně extrahovalo lékařskou zprávu: Výška ${nextHeight} cm, Váha ${nextWeight} kg ze dne ${todayDate} a zapsalo do fyziologie!`);
    }, 2500);
  };

  const handleSavePediatrician = (e: React.FormEvent, activeChildId: string) => {
    e.preventDefault();
    if (!activeChildId) return;
    setMedicalRecords(prev => ({
      ...prev,
      [activeChildId]: {
        ...prev[activeChildId],
        pediatrician: editedPediatrician,
        phone: editedPediatricianPhone,
        address: editedPediatricianAddress,
        allergies: editedAllergies
      }
    }));
    setIsEditingPediatrician(false);
  };

  const startEditPediatrician = (childMed: any) => {
    if (!childMed) return;
    setEditedPediatrician(childMed.pediatrician || "");
    setEditedPediatricianPhone(childMed.phone || "");
    setEditedPediatricianAddress(childMed.address || "");
    setEditedAllergies(childMed.allergies || "");
    setIsEditingPediatrician(true);
  };

  // Dynamic Custom Fields Helpers
  const getDynamicCustomFields = (person: any) => {
    if (!person || !person.custom_fields) return [];
    const standardKeys = [
      'avatar_url', 'avatarUrl', 'profession', 'school', 'hobby',
      'foster_care_type', 'relationship_to_child', 'relationship_to_foster_parent',
      'grade', 'allergies'
    ];
    return Object.entries(person.custom_fields)
      .filter(([key]) => !standardKeys.includes(key))
      .map(([key, value]) => ({ label: key, value: String(value) }));
  };

  const startEditCustomFields = (person: any) => {
    if (!person) return;
    setEditingCustomFieldsPersonId(person.id);
    setTempCustomFields(getDynamicCustomFields(person));
  };

  const handleSaveCustomFields = async (person: any) => {
    if (!person) return;
    const standardKeys = [
      'avatar_url', 'avatarUrl', 'profession', 'school', 'hobby',
      'foster_care_type', 'relationship_to_child', 'relationship_to_foster_parent',
      'grade', 'allergies'
    ];
    
    const newCustomFields: Record<string, any> = {};
    standardKeys.forEach(k => {
      if (person.custom_fields && person.custom_fields[k] !== undefined) {
        newCustomFields[k] = person.custom_fields[k];
      }
    });

    tempCustomFields.forEach(f => {
      if (f.label.trim()) {
        newCustomFields[f.label.trim()] = f.value;
      }
    });

    setPersons(prev => prev.map(p => p.id === person.id ? { ...p, custom_fields: newCustomFields } : p));
    
    try {
      await supabase.from("persons").update({ custom_fields: newCustomFields }).eq("id", person.id);
    } catch (err) {
      console.error("Chyba při ukládání vlastních polí do DB:", err);
    }

    setEditingCustomFieldsPersonId(null);
  };

  // ==========================================
  // HELPERS (No semibold / extrabold)
  // ==========================================

  const hasAlertOrDeadline = (householdId: string) => {
    const householdEvents = events.filter(e => e.household_id === householdId);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const hasRecentCrisis = householdEvents.some(e => 
      e.type === "crisis_event" && new Date(e.occurred_at) >= thirtyDaysAgo
    );
    if (hasRecentCrisis) return true;

    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const hasUpcomingEvent = householdEvents.some(e => {
      const d = new Date(e.occurred_at);
      return d >= now && d <= sevenDaysFromNow;
    });

    return hasUpcomingEvent;
  };

  const formatChildrenCount = (count: number) => {
    if (count === 0) return "0 dětí";
    if (count === 1) return "1 dítě";
    if (count >= 2 && count <= 4) return `${count} děti`;
    return `${count} dětí`;
  };

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
          const addressText = pAddress ? (pAddress.city && pAddress.street ? `${pAddress.city}, ${pAddress.street}` : (pAddress.city || pAddress.street || "")) : "";
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
            childrenList: c.map(ch => ({
              id: ch.id,
              name: `${ch.first_name || ""} ${ch.last_name || ""}`.trim(),
              firstName: ch.first_name || "",
              lastName: ch.last_name || "",
              phone: ch.phone || "",
              email: ch.email || "",
              avatarUrl: ch.custom_fields?.avatar_url || ch.custom_fields?.avatarUrl || "",
              school: ch.custom_fields?.school || "",
              hobby: ch.custom_fields?.hobby || "",
              householdId: h.id
            })),
            avatarUrl: p?.custom_fields?.avatar_url || p?.custom_fields?.avatarUrl || "",
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
          const addressText = pAddress ? (pAddress.city && pAddress.street ? `${pAddress.city}, ${pAddress.street}` : (pAddress.city || pAddress.street || "")) : "";
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
            childrenList: persons.filter(per => per.household_id === h.id && per.role === "child").map(ch => ({
              id: ch.id,
              name: `${ch.first_name || ""} ${ch.last_name || ""}`.trim(),
              firstName: ch.first_name || "",
              lastName: ch.last_name || "",
              phone: ch.phone || "",
              email: ch.email || "",
              avatarUrl: ch.custom_fields?.avatar_url || ch.custom_fields?.avatarUrl || "",
              school: ch.custom_fields?.school || "",
              hobby: ch.custom_fields?.hobby || "",
              householdId: h.id
            })),
            avatarUrl: p.custom_fields?.avatar_url || p.custom_fields?.avatarUrl || "",
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
      // Find household associated with the event
      const h = households.find(house => house.id === e.household_id);
      const p = h ? persons.find(per => per.household_id === h.id && per.role === "foster_parent") : null;
      const parentName = p ? `${p.first_name} ${p.last_name}` : "";

      // Search matching
      const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (e.payload?.content || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                            parentName.toLowerCase().includes(searchQuery.toLowerCase());
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
    <div className={`flex h-screen w-full overflow-hidden bg-background text-foreground font-sans antialiased ${designMode === 'yandex' ? 'theme-yandex' : ''}`}>
      
      {/* ========================================================= */}
      {/* 1. APP SWITCH RAIL (Far left vertical switcher bar)        */}
      {/* ========================================================= */}
      <div className="w-16 bg-[#f6f8fc] dark:bg-[#111214] theme-yandex:bg-[#1f2022] border-r border-border-custom flex flex-col items-center py-4 justify-between shrink-0 select-none z-25">
        <div className="flex flex-col items-center w-full space-y-4">
          {/* Main hamburger menu button */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] rounded-full transition-colors text-muted cursor-pointer"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Service switcher buttons */}
          <div className="flex flex-col items-center w-full space-y-2">
            
            {/* Pošta / Gmail Button */}
            <button 
              onClick={() => { setActiveService('mail'); setSelectedFamilyId(null); }}
              className={`p-3 rounded-xl transition-all relative group flex flex-col items-center justify-center cursor-pointer ${
                activeService === 'mail'
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa] theme-yandex:bg-[#fc0] theme-yandex:text-black" 
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
              className={`p-3 rounded-xl transition-all relative group flex flex-col items-center justify-center cursor-pointer ${
                activeService === 'chat'
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa] theme-yandex:bg-[#fc0] theme-yandex:text-black" 
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
              className={`p-3 rounded-xl transition-all relative group flex flex-col items-center justify-center cursor-pointer ${
                activeService === 'contacts'
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa] theme-yandex:bg-[#fc0] theme-yandex:text-black" 
                  : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
              }`}
              title="Kontakty"
            >
              <Users className="w-5 h-5 stroke-[1.5]" />
              <span className="text-[9px] mt-1 font-medium scale-90">Kontakty</span>
            </button>

          </div>
        </div>

        <div className="flex flex-col items-center space-y-4">
          {/* Design Mode Switcher Button */}
          <button 
            onClick={() => setDesignMode(prev => prev === 'google' ? 'yandex' : 'google')}
            className={`p-2.5 rounded-xl transition-all relative group flex flex-col items-center justify-center cursor-pointer shadow-xs ${
              designMode === 'yandex' 
                ? "bg-[#fc0] text-black hover:bg-[#f2c200]" 
                : "bg-[#1a73e8] text-white hover:bg-[#1557b0]"
            }`}
            title={`Přepnout na ${designMode === 'google' ? 'Yandex 360' : 'Google Workspace'}`}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-[8px] mt-0.5 font-medium scale-90 leading-none">{designMode === 'google' ? 'Yandex' : 'Google'}</span>
          </button>

          {/* Dark Mode Toggle Button */}
          <button 
            onClick={toggleDarkMode}
            className="p-2 text-muted hover:text-foreground hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] rounded-full transition-all cursor-pointer"
            title={darkMode ? "Světlý režim" : "Tmavý režim"}
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Settings Button */}
          <button 
            onClick={() => alert(designMode === 'yandex' ? "Nastavení Yandex 360" : "Nastavení Google Workspace")}
            className="p-2 text-muted hover:text-foreground hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] rounded-full transition-colors cursor-pointer"
            title="Nastavení"
          >
            <Settings className="w-5 h-5 stroke-[1.5]" />
          </button>

          {/* Profile Monogram / Avatar */}
          <div 
            className={`w-8 h-8 flex items-center justify-center font-medium text-xs border shadow-xs rounded-full ${designMode === 'yandex' ? "bg-slate-200 border-slate-350" : "bg-primary/10 border-primary/20 text-primary"}`}
            onClick={() => alert(`Přihlášený uživatel: ${currentUserProfile?.first_name} ${currentUserProfile?.last_name}`)}
          >
            {currentUserProfile?.first_name?.charAt(0) || "U"}
          </div>
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
            {/* Search Bar Design */}
            <div className="flex-1 max-w-2xl relative">
              <div className={`flex items-center bg-[#f1f3f4] dark:bg-[#2d2f31] focus-within:bg-card focus-within:shadow-md transition-all duration-200 w-full group ${
                designMode === 'yandex' 
                  ? "rounded-lg border border-border-custom focus-within:ring-1 focus-within:ring-[#fc0]" 
                  : "focus-within:ring-1 focus-within:ring-border-custom rounded-full"
              }`}>
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
                    className="p-1 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-full text-muted cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
                  <div className="relative bg-transparent select-none">
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
                          {columnsOrder.map((colId) => {
                            const isVisible = visibleColumns.includes(colId);
                            const label = COLUMN_LABELS[colId] || colId;
                            const isDragged = draggedColId === colId;
                            const isDragOver = dragOverColId === colId && draggedColId !== colId;
                            const draggedIdx = columnsOrder.indexOf(draggedColId || "");
                            const targetIdx = columnsOrder.indexOf(colId);
                            const borderStyle = isDragOver 
                              ? (draggedIdx < targetIdx ? "border-b-2 border-blue-500" : "border-t-2 border-blue-500") 
                              : "";

                            return (
                              <div 
                                key={colId} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, colId)}
                                onDragOver={(e) => handleDragOver(e, colId)}
                                onDragEnd={handleDragEnd}
                                onDrop={(e) => handleDrop(e, colId)}
                                className={`flex items-center justify-between py-1.5 px-2 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50 rounded-lg group/col text-xs cursor-grab active:cursor-grabbing select-none transition-all ${
                                  isDragged ? "opacity-40 bg-gray-100 dark:bg-gray-800" : ""
                                } ${borderStyle}`}
                              >
                                <label className="flex items-center gap-2 cursor-pointer flex-1 py-0.5 animate-none" onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    type="checkbox"
                                    checked={isVisible}
                                    onChange={() => {
                                      if (isVisible) {
                                        if (visibleColumns.length > 1) {
                                          setVisibleColumns(prev => prev.filter(c => c !== colId));
                                        }
                                      } else {
                                        setVisibleColumns(prev => {
                                          const next = [...prev, colId];
                                          return next.sort((a, b) => columnsOrder.indexOf(a) - columnsOrder.indexOf(b));
                                        });
                                      }
                                    }}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-primary bg-transparent focus:ring-primary"
                                  />
                                  <span className="text-foreground font-normal">{label}</span>
                                </label>
                                <div className="text-muted opacity-40 group-hover/col:opacity-100 transition-opacity">
                                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                  </svg>
                                </div>
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
                      {columnsOrder.filter(c => visibleColumns.includes(c)).map((colId) => {
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
                      const hasAlert = hasAlertOrDeadline(h.householdId);
                      const parentPerson = persons.find(per => per.household_id === h.householdId && per.role === "foster_parent");

                      return (
                        <tr 
                          key={h.id}
                          onClick={() => {
                            setSelectedFamilyId(h.householdId);
                            setActiveTab("overview");
                          }}
                          className={`group border-b border-border-custom cursor-pointer transition-colors ${
                            selectedFamilyId === h.householdId 
                              ? "bg-[#e8f0fe] dark:bg-[#0842a0]/20" 
                              : isChecked 
                                ? "bg-[#e8f0fe]/50 dark:bg-[#0842a0]/10" 
                                : hasAlert 
                                  ? "bg-rose-50/50 dark:bg-rose-950/10 hover:bg-rose-100/40 dark:hover:bg-rose-900/20" 
                                  : "hover:bg-[#f1f3f4]/70 dark:hover:bg-[#2d2f31]/30"
                          }`}
                        >
                          {/* Avatar checkbox */}
                          <td className={`py-3 px-4 w-12 align-middle text-center select-none ${hasAlert ? "border-l-4 border-l-rose-500" : ""}`} onClick={(e) => e.stopPropagation()}>
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
                          {columnsOrder.filter(c => visibleColumns.includes(c)).map((colId) => {
                            if (colId === "name") {
                              const parentObj = h.isPerson 
                                ? (h.role === "foster_parent" ? h.rawItem : null) 
                                : parentPerson;
                              const isJmenovec = parentObj && parentObj.last_name ? hasSurnameDuplicate(parentObj.last_name) : false;

                              return (
                                <td key={colId} className="py-3 px-3 align-middle text-sm text-foreground">
                                  <div className="flex flex-col">
                                    <span className={`${h.isPerson && h.role === "child" ? "font-normal" : "font-bold"} text-foreground`}>
                                      {h.isPerson 
                                        ? (h.role === "child" ? renderChildName(h.rawItem) : renderFosterParentName(h.rawItem)) 
                                        : renderFosterParentName(parentPerson)}
                                      {h.isPerson && h.role === "child" && h.birthDate && (
                                        <span className="text-xs text-muted ml-2 font-normal animate-none">
                                          (Dítě, {new Date().getFullYear() - new Date(h.birthDate).getFullYear()} let)
                                        </span>
                                      )}
                                      {h.isPerson && h.role === "foster_parent" && (
                                        <span className="text-xs text-muted ml-2 font-normal animate-none">
                                          (Pěstoun)
                                        </span>
                                      )}
                                      {h.isPerson && h.role !== "child" && h.role !== "foster_parent" && h.role && (
                                        <span className="text-xs text-muted ml-2 font-normal animate-none">
                                          ({h.role === 'bio_parent' ? 'Biologický rodič' : 'Sociální kontakt'})
                                        </span>
                                      )}
                                    </span>
                                    {isJmenovec && h.address && (
                                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5" onClick={(e) => e.stopPropagation()}>
                                        <MapPin className="w-3 h-3 text-[#ea4335] shrink-0" />
                                        <a 
                                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.address)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="hover:underline text-primary"
                                        >
                                          {h.address}
                                        </a>
                                      </div>
                                    )}
                                    {((!h.isPerson) || (h.isPerson && h.role === "foster_parent")) && h.childrenList && h.childrenList.length > 0 && (
                                      <div className="flex flex-col gap-1 mt-1 pl-2 text-xs text-muted font-normal">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                          <span className="text-gray-400">↳</span>
                                          {h.childrenList.map((child: any, cIdx: number) => (
                                            <React.Fragment key={child.id}>
                                              {cIdx > 0 && <span className="text-gray-300">,</span>}
                                              <span 
                                                className="relative inline-block"
                                                onMouseEnter={() => setHoveredChildId(child.id)}
                                                onMouseLeave={() => setHoveredChildId(null)}
                                              >
                                                <span 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFamilyId(child.householdId);
                                                    setActiveTab("overview");
                                                  }}
                                                  className="text-primary hover:underline hover:text-primary-hover font-normal cursor-pointer"
                                                >
                                                  {child.name}
                                                </span>
                                                {hoveredChildId === child.id && (
                                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-card border border-border-custom shadow-xl rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 text-left text-foreground normal-case font-sans">
                                                    {/* Hover bubble card content */}
                                                    <div className="flex items-center gap-3 pb-3 border-b border-border-custom">
                                                      {child.avatarUrl ? (
                                                        <img src={child.avatarUrl} alt={child.name} className="w-12 h-12 rounded-full object-cover border border-border-custom" />
                                                      ) : (
                                                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-medium text-base">
                                                          {child.firstName?.charAt(0) || "D"}
                                                        </div>
                                                      )}
                                                      <div>
                                                        <h5 className="font-bold text-sm text-foreground">{child.name}</h5>
                                                        <p className="text-[10px] text-muted font-normal">Dítě v pěstounské péči</p>
                                                      </div>
                                                    </div>
                                                    
                                                    <div className="py-2.5 space-y-1.5 text-xs text-foreground/80 border-b border-border-custom">
                                                      {child.phone && (
                                                        <div className="flex items-center gap-2">
                                                          <Phone className="w-3.5 h-3.5 text-muted shrink-0" />
                                                          <span>{child.phone}</span>
                                                        </div>
                                                      )}
                                                      {child.email && (
                                                        <div className="flex items-center gap-2">
                                                          <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                                                          <span className="truncate">{child.email}</span>
                                                        </div>
                                                      )}
                                                      {child.school && (
                                                        <div className="flex items-center gap-2">
                                                          <GraduationCap className="w-3.5 h-3.5 text-muted shrink-0" />
                                                          <span>Škola: {child.school}</span>
                                                        </div>
                                                      )}
                                                      {child.hobby && (
                                                        <div className="flex items-center gap-2">
                                                          <Star className="w-3.5 h-3.5 text-muted shrink-0" />
                                                          <span>Záliby: {child.hobby}</span>
                                                        </div>
                                                      )}
                                                    </div>

                                                    <div className="pt-2.5">
                                                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Poslední 3 záznamy ze života:</p>
                                                      <div className="space-y-1.5">
                                                        {events
                                                          .filter(ev => ev.household_id === child.householdId)
                                                          .slice(0, 3)
                                                          .map((ev, evIdx) => (
                                                            <div key={evIdx} className="text-[11px] leading-snug">
                                                              <span className="font-medium text-foreground">{ev.title}</span>
                                                              <span className="text-muted text-[10px] ml-1.5">
                                                                ({new Date(ev.occurred_at).toLocaleDateString("cs-CZ")})
                                                              </span>
                                                            </div>
                                                          ))}
                                                        {events.filter(ev => ev.household_id === child.householdId).length === 0 && (
                                                          <p className="text-[11px] text-muted italic">Žádné události</p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </span>
                                            </React.Fragment>
                                          ))}
                                        </div>
                                      </div>
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
                                  {formatChildrenCount(h.childrenCount)}
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
                  
                  {activeTab === "overview" && (() => {
                    const primaryParentAddress = primaryFosterParent ? addresses.find(a => a.person_id === primaryFosterParent.id) : null;
                    const otherPersonsAtSameAddress = primaryParentAddress ? addresses.filter(addr => 
                      addr.street && primaryParentAddress.street &&
                      addr.street.toLowerCase().replace(/\s+/g, '') === primaryParentAddress.street.toLowerCase().replace(/\s+/g, '') &&
                      addr.city && primaryParentAddress.city &&
                      addr.city.toLowerCase().replace(/\s+/g, '') === primaryParentAddress.city.toLowerCase().replace(/\s+/g, '') &&
                      addr.person_id !== primaryFosterParent.id
                    ).map(addr => {
                      const p = persons.find(per => per.id === addr.person_id);
                      if (!p) return null;
                      const h = households.find(house => house.id === p.household_id);
                      return { person: p, household: h };
                    }).filter(item => item && item.person) : [];

                    return (
                      <div className="space-y-6">
                        
                        {/* Main Foster parent */}
                        <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-5 shadow-xs">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
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

                            {/* Quick actions bridge */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setActiveService('chat');
                                  setSelectedFamilyId(selectedHousehold.id);
                                }}
                                className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 select-none cursor-pointer"
                                title="Otevřít Chat s pěstounem"
                              >
                                <MessageSquare className="w-4 h-4 stroke-[1.8]" />
                                <span>Otevřít Chat</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveService('mail');
                                  setSearchQuery(primaryFosterParent ? primaryFosterParent.last_name : "");
                                }}
                                className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 select-none cursor-pointer"
                                title="Zobrazit poštu rodiny"
                              >
                                <Mail className="w-4 h-4 stroke-[1.8]" />
                                <span>Zobrazit Poštu</span>
                              </button>
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
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between bg-card px-3 py-1.5 rounded-2xl border border-border-custom/50 mt-1 shadow-xs">
                                    <span className="font-normal text-foreground">
                                      {primaryParentAddress.street}, {primaryParentAddress.zip ? `${primaryParentAddress.zip} ` : ""}{primaryParentAddress.city}
                                      {(primaryParentAddress as any).state && (primaryParentAddress as any).state.toLowerCase() !== "česká republika" ? `, ${(primaryParentAddress as any).state}` : ""}
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
                                  
                                  {/* Address Linkage (Chytré propojování) */}
                                  {otherPersonsAtSameAddress.length > 0 && (
                                    <div className="mt-2 p-3 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl space-y-1.5">
                                      <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Na této adrese také bydlí:</span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {otherPersonsAtSameAddress.map((item, idx) => {
                                          if (!item || !item.person) return null;
                                          return (
                                            <button
                                              key={idx}
                                              onClick={() => {
                                                if (item.household) {
                                                  setSelectedFamilyId(item.household.id);
                                                }
                                              }}
                                              className="text-xs bg-card hover:bg-gray-100 dark:hover:bg-[#2d2f31]/55 border border-border-custom/60 px-2.5 py-1 rounded-full text-foreground/95 transition-all flex items-center gap-1 cursor-pointer"
                                            >
                                              <User className="w-3 h-3 text-primary animate-pulse" />
                                              <span className="font-medium">{item.person.first_name} {item.person.last_name}</span>
                                              <span className="text-[10px] text-muted">({item.person.role === 'child' ? 'dítě' : item.person.role === 'foster_parent' ? 'pěstoun' : 'kontakt'})</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted italic block mt-0.5">Neuvedeno</span>
                              )}
                            </div>
                          </div>

                          {/* Dynamic Custom Fields Card for Foster Parent */}
                          {primaryFosterParent && (
                            <div className="mt-4 pt-4 border-t border-border-custom space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-muted font-medium text-xs block uppercase tracking-wider">Vlastní pole (Custom Fields):</span>
                                {editingCustomFieldsPersonId !== primaryFosterParent.id ? (
                                  <button
                                    onClick={() => startEditCustomFields(primaryFosterParent)}
                                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" /> Upravit pole
                                  </button>
                                ) : (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleSaveCustomFields(primaryFosterParent)}
                                      className="text-[11px] bg-primary text-white px-2.5 py-1 rounded-full font-medium hover:bg-primary/95 cursor-pointer shadow-xs"
                                    >
                                      Uložit
                                    </button>
                                    <button
                                      onClick={() => setEditingCustomFieldsPersonId(null)}
                                      className="text-[11px] bg-card border border-border-custom px-2.5 py-1 rounded-full font-medium hover:bg-gray-100 cursor-pointer"
                                    >
                                      Zrušit
                                    </button>
                                  </div>
                                )}
                              </div>

                              {editingCustomFieldsPersonId === primaryFosterParent.id ? (
                                <div className="space-y-2.5">
                                  {tempCustomFields.map((field, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                      <input
                                        type="text"
                                        placeholder="Štítek (např. Velikost bot)"
                                        value={field.label}
                                        onChange={(e) => {
                                          const updated = [...tempCustomFields];
                                          updated[idx].label = e.target.value;
                                          setTempCustomFields(updated);
                                        }}
                                        className="p-1.5 bg-background border border-border-custom rounded-xl text-xs text-foreground flex-1"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Hodnota"
                                        value={field.value}
                                        onChange={(e) => {
                                          const updated = [...tempCustomFields];
                                          updated[idx].value = e.target.value;
                                          setTempCustomFields(updated);
                                        }}
                                        className="p-1.5 bg-background border border-border-custom rounded-xl text-xs text-foreground flex-1"
                                      />
                                      <button
                                        onClick={() => setTempCustomFields(prev => prev.filter((_, i) => i !== idx))}
                                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-full cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => setTempCustomFields(prev => [...prev, { label: "", value: "" }])}
                                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Přidat vlastní pole
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {getDynamicCustomFields(primaryFosterParent).length > 0 ? (
                                    getDynamicCustomFields(primaryFosterParent).map((f, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-2 bg-card border border-border-custom/40 rounded-xl">
                                        <span className="text-muted font-medium">{f.label}:</span>
                                        <span className="font-bold text-foreground">{f.value}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-muted italic col-span-2 text-xs">Žádná vlastní pole nebyla definována. Klikněte na Upravit pole.</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Children */}
                        <div className="space-y-3">
                          <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider pl-1">Děti v pěstounské péči</h4>
                          {fosterChildren.map((child) => (
                            <div key={child.id} className="bg-background border border-border-custom p-5 rounded-3xl space-y-4 hover:bg-[#f1f3f4]/30 dark:hover:bg-[#2d2f31]/10 transition-colors animate-in fade-in duration-200">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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

                              {/* Child-level Custom Fields widget */}
                              <div className="pt-3 border-t border-border-custom/40 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Vlastní pole dítěte (Custom Fields):</span>
                                  {editingCustomFieldsPersonId !== child.id ? (
                                    <button
                                      onClick={() => startEditCustomFields(child)}
                                      className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                                    >
                                      <Edit2 className="w-2.5 h-2.5" /> Upravit pole
                                    </button>
                                  ) : (
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => handleSaveCustomFields(child)}
                                        className="text-[10px] bg-primary text-white px-2.5 py-0.5 rounded-full font-medium hover:bg-primary/95 cursor-pointer shadow-xs"
                                      >
                                        Uložit
                                      </button>
                                      <button
                                        onClick={() => setEditingCustomFieldsPersonId(null)}
                                        className="text-[10px] bg-card border border-border-custom px-2.5 py-0.5 rounded-full font-medium hover:bg-gray-100 cursor-pointer"
                                      >
                                        Zrušit
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {editingCustomFieldsPersonId === child.id ? (
                                  <div className="space-y-2">
                                    {tempCustomFields.map((field, idx) => (
                                      <div key={idx} className="flex gap-1.5 items-center">
                                        <input
                                          type="text"
                                          placeholder="Štítek (např. Velikost bot)"
                                          value={field.label}
                                          onChange={(e) => {
                                            const updated = [...tempCustomFields];
                                            updated[idx].label = e.target.value;
                                            setTempCustomFields(updated);
                                          }}
                                          className="p-1.5 bg-background border border-border-custom rounded-xl text-xs text-foreground flex-1"
                                        />
                                        <input
                                          type="text"
                                          placeholder="Hodnota"
                                          value={field.value}
                                          onChange={(e) => {
                                            const updated = [...tempCustomFields];
                                            updated[idx].value = e.target.value;
                                            setTempCustomFields(updated);
                                          }}
                                          className="p-1.5 bg-background border border-border-custom rounded-xl text-xs text-foreground flex-1"
                                        />
                                        <button
                                          onClick={() => setTempCustomFields(prev => prev.filter((_, i) => i !== idx))}
                                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-full cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => setTempCustomFields(prev => [...prev, { label: "", value: "" }])}
                                      className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" /> Přidat vlastní pole
                                    </button>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                                    {getDynamicCustomFields(child).length > 0 ? (
                                      getDynamicCustomFields(child).map((f, idx) => (
                                        <div key={idx} className="flex justify-between items-center px-2 py-1 bg-card border border-border-custom/45 rounded-lg">
                                          <span className="text-muted font-medium mr-1">{f.label}:</span>
                                          <span className="font-semibold text-foreground">{f.value}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-muted italic col-span-3 text-[10px]">Žádná vlastní pole nebyla definována.</span>
                                    )}
                                  </div>
                                )}
                              </div>
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
                    );
                  })()}

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

                  {activeTab === "registry" && (() => {
                    const activeChildId = selectedRegistryChildId || (fosterChildren[0]?.id || null);
                    const activeChild = fosterChildren.find(c => c.id === activeChildId);
                    const childEdu = activeChildId ? educationHistory[activeChildId] || [] : [];
                    const childMed = activeChildId ? medicalRecords[activeChildId] || null : null;
                    const childPhys = activeChildId ? physiologicalMetrics[activeChildId] || [] : [];
                    const childIdDoc = activeChildId ? identityDocs[activeChildId] || null : null;
                    const childConsents = activeChildId ? consents[activeChildId] || [] : [];

                    if (fosterChildren.length === 0) {
                      return (
                        <div className="bg-background border border-border-custom p-8 rounded-3xl text-center space-y-2 shadow-xs">
                          <p className="text-muted text-sm font-medium">V této domácnosti nejsou evidovány žádné děti v pěstounské péči.</p>
                          <p className="text-muted text-xs">Registry a dokumenty o vzdělávání, očkování a tělesném vývoji jsou dostupné pouze pro děti.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        {/* Toast AI OCR Success Alert */}
                        {ocrSuccessAlert && (
                          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>{ocrSuccessAlert}</span>
                            </div>
                            <button onClick={() => setOcrSuccessAlert(null)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-full cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Child Selector Pill Menu */}
                        <div className="flex flex-wrap gap-2 pb-2 border-b border-border-custom">
                          {fosterChildren.map((child) => {
                            const isSelected = child.id === activeChildId;
                            return (
                              <button
                                key={child.id}
                                onClick={() => {
                                  setSelectedRegistryChildId(child.id);
                                  setIsEditingPediatrician(false);
                                  setOcrSuccessAlert(null);
                                }}
                                className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-2 border cursor-pointer ${
                                  isSelected 
                                    ? "bg-primary text-white border-primary shadow-sm" 
                                    : "bg-card text-muted hover:text-foreground hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/55 border-border-custom"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`}></span>
                                {child.first_name} {child.last_name}
                              </button>
                            );
                          })}
                        </div>

                        {activeChild && (
                          <div className="space-y-6">
                            
                            {/* SECTION A: EDUCATION */}
                            <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-4 shadow-xs">
                              <div className="flex justify-between items-center">
                                <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider flex items-center gap-2 pl-1">
                                  <GraduationCap className="w-5 h-5 text-primary" /> Evidence vzdělávání dětí
                                </h4>
                                <button
                                  onClick={() => setShowAddSchoolForm(!showAddSchoolForm)}
                                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Přidat školní rok
                                </button>
                              </div>

                              {/* School info header summary */}
                              <div className="p-4 bg-card rounded-2xl border border-border-custom/50 flex justify-between items-center text-sm">
                                <div>
                                  <span className="text-xs text-muted block">Aktuální škola</span>
                                  <span className="font-medium text-foreground">{activeChild.custom_fields?.school || "ZŠ Merhautova, Brno"}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-muted block">Třída</span>
                                  <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                                    {activeChild.custom_fields?.grade || "6.A"}
                                  </span>
                                </div>
                              </div>

                              {/* Form to Add New School Year */}
                              {showAddSchoolForm && (
                                <form onSubmit={(e) => handleAddSchoolYear(e, activeChildId)} className="p-4 bg-[#f1f3f4]/50 dark:bg-[#2d2f31]/30 border border-border-custom rounded-2xl space-y-3">
                                  <div className="grid grid-cols-3 gap-2">
                                    <input
                                      type="text"
                                      placeholder="Školní rok (např. 2025/2026)"
                                      required
                                      value={newSchoolYear}
                                      onChange={(e) => setNewSchoolYear(e.target.value)}
                                      className="p-2 bg-background border border-border-custom rounded-xl text-xs text-foreground"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Škola"
                                      required
                                      value={newSchoolName}
                                      onChange={(e) => setNewSchoolName(e.target.value)}
                                      className="p-2 bg-background border border-border-custom rounded-xl text-xs text-foreground col-span-2"
                                    />
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <input
                                      type="text"
                                      placeholder="Třída (např. 7.B)"
                                      value={newGradeClass}
                                      onChange={(e) => setNewGradeClass(e.target.value)}
                                      className="p-2 bg-background border border-border-custom rounded-xl text-xs text-foreground"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Poznámka / Hodnocení"
                                      value={newSchoolNote}
                                      onChange={(e) => setNewSchoolNote(e.target.value)}
                                      className="p-2 bg-background border border-border-custom rounded-xl text-xs text-foreground col-span-2"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowAddSchoolForm(false)}
                                      className="px-3 py-1 bg-card border border-border-custom rounded-full text-[11px] text-foreground cursor-pointer"
                                    >
                                      Zrušit
                                    </button>
                                    <button
                                      type="submit"
                                      className="px-3 py-1 bg-primary text-white rounded-full text-[11px] cursor-pointer"
                                    >
                                      Uložit
                                    </button>
                                  </div>
                                </form>
                              )}

                              {/* Education History Timeline */}
                              <div className="relative pl-6 space-y-4 border-l border-border-custom ml-3 mt-2">
                                {childEdu.map((edu: any, idx: number) => (
                                  <div key={idx} className="relative space-y-1">
                                    <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background dark:border-[#131314]"></span>
                                    <div className="flex justify-between items-start">
                                      <span className="text-[11px] font-bold text-primary">{edu.schoolYear}</span>
                                      <span className="text-xs text-muted font-medium bg-[#f1f3f4] dark:bg-[#2d2f31] px-2 py-0.5 rounded-md">{edu.gradeClass}</span>
                                    </div>
                                    <p className="text-sm font-medium text-foreground">{edu.schoolName}</p>
                                    <p className="text-xs text-muted italic">{edu.note}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* SECTION B: HEALTHCARE & VACCINATIONS */}
                            <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-4 shadow-xs">
                              <div className="flex justify-between items-center">
                                <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider flex items-center gap-2 pl-1">
                                  <Stethoscope className="w-5 h-5 text-primary" /> Zdravotní péče a očkování
                                </h4>
                                {!isEditingPediatrician && (
                                  <button
                                    onClick={() => startEditPediatrician(childMed)}
                                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" /> Upravit údaje
                                  </button>
                                )}
                              </div>

                              {/* Pediatrician and allergies details */}
                              {isEditingPediatrician ? (
                                <form onSubmit={(e) => handleSavePediatrician(e, activeChildId)} className="p-4 bg-[#f1f3f4]/50 dark:bg-[#2d2f31]/30 border border-border-custom rounded-2xl space-y-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-muted block mb-1">Pediatr</label>
                                      <input
                                        type="text"
                                        value={editedPediatrician}
                                        onChange={(e) => setEditedPediatrician(e.target.value)}
                                        className="w-full p-2 bg-background border border-border-custom rounded-xl text-xs text-foreground"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-muted block mb-1">Telefon pediatr</label>
                                      <input
                                        type="text"
                                        value={editedPediatricianPhone}
                                        onChange={(e) => setEditedPediatricianPhone(e.target.value)}
                                        className="w-full p-2 bg-background border border-border-custom rounded-xl text-xs text-foreground"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted block mb-1">Adresa ordinace</label>
                                    <input
                                      type="text"
                                      value={editedPediatricianAddress}
                                      onChange={(e) => setEditedPediatricianAddress(e.target.value)}
                                      className="w-full p-2 bg-background border border-border-custom rounded-xl text-xs text-foreground"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted block mb-1">Alergie a zdrav. omezení</label>
                                    <input
                                      type="text"
                                      value={editedAllergies}
                                      onChange={(e) => setEditedAllergies(e.target.value)}
                                      className="w-full p-2 bg-background border border-border-custom rounded-xl text-xs text-foreground"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setIsEditingPediatrician(false)}
                                      className="px-3 py-1 bg-card border border-border-custom rounded-full text-[11px] text-foreground cursor-pointer"
                                    >
                                      Zrušit
                                    </button>
                                    <button
                                      type="submit"
                                      className="px-3 py-1 bg-primary text-white rounded-full text-[11px] cursor-pointer"
                                    >
                                      Uložit
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 bg-card rounded-2xl border border-border-custom/50 space-y-2">
                                    <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Pediatr</span>
                                    <p className="font-medium text-sm text-foreground">{childMed?.pediatrician || "MUDr. Hana Nováková"}</p>
                                    <p className="text-xs text-muted flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-primary" /> {childMed?.phone || "+420 541 234 567"}</p>
                                    <p className="text-[11px] text-muted">{childMed?.address || "Milady Horákové 28, Brno"}</p>
                                  </div>
                                  <div className="p-4 bg-card rounded-2xl border border-border-custom/50 space-y-2">
                                    <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Alergie a Omezení</span>
                                    <p className="font-medium text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/15 p-2 rounded-xl border border-rose-100 dark:border-rose-900/35">
                                      {childMed?.allergies || "Bez zjevných alergií"}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Vaccinations Checklist */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-muted font-medium">Očkovací kalendář (kliknutím změníte stav)</span>
                                  <button
                                    onClick={() => setShowAddVaccineForm(!showAddVaccineForm)}
                                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Přidat očkování
                                  </button>
                                </div>

                                {showAddVaccineForm && (
                                  <form onSubmit={(e) => handleAddVaccine(e, activeChildId)} className="p-4 bg-[#f1f3f4]/50 dark:bg-[#2d2f31]/30 border border-border-custom rounded-2xl space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        placeholder="Název vakcíny / očkování"
                                        required
                                        value={newVaccine}
                                        onChange={(e) => setNewVaccine(e.target.value)}
                                        className="p-2 bg-background border border-border-custom rounded-xl text-xs text-foreground"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Datum (pokud již proběhlo)"
                                        value={newVaccineDate}
                                        onChange={(e) => setNewVaccineDate(e.target.value)}
                                        className="p-2 bg-background border border-border-custom rounded-xl text-xs text-foreground"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setShowAddVaccineForm(false)}
                                        className="px-3 py-1 bg-card border border-border-custom rounded-full text-[11px] text-foreground cursor-pointer"
                                      >
                                        Zrušit
                                      </button>
                                      <button
                                        type="submit"
                                        className="px-3 py-1 bg-primary text-white rounded-full text-[11px] cursor-pointer"
                                      >
                                        Přidat
                                      </button>
                                    </div>
                                  </form>
                                )}

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                  {childMed?.vaccinations.map((vac: any, idx: number) => (
                                    <div
                                      key={idx}
                                      onClick={() => handleToggleVaccine(vac.vaccine, activeChildId)}
                                      className="p-2.5 bg-card hover:bg-gray-100/50 dark:hover:bg-[#2d2f31]/40 rounded-xl border border-border-custom/50 flex justify-between items-center text-xs cursor-pointer select-none transition-all duration-200"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                          vac.status === "completed" 
                                            ? "bg-primary border-primary text-white" 
                                            : "border-gray-400 bg-background"
                                        }`}>
                                          {vac.status === "completed" && <Check className="w-3 h-3" />}
                                        </div>
                                        <span className={`font-medium ${vac.status === "completed" ? 'line-through text-muted' : 'text-foreground'}`}>{vac.vaccine}</span>
                                      </div>
                                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                        vac.status === "completed" 
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" 
                                          : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                                      }`}>
                                        {vac.status === "completed" ? `Aplikováno: ${vac.date}` : "Plánováno"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* SECTION C: PHYSIOLOGY & GROWTH CHART */}
                            <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-4 shadow-xs">
                              <div className="flex justify-between items-center">
                                <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider flex items-center gap-2 pl-1">
                                  <Activity className="w-5 h-5 text-primary" /> Tělesný vývoj a růstový graf
                                </h4>
                                <button
                                  onClick={() => setShowAddPhysForm(!showAddPhysForm)}
                                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Zapsat měření
                                </button>
                              </div>

                              {showAddPhysForm && (
                                <form onSubmit={(e) => handleAddPhys(e, activeChildId)} className="p-4 bg-[#f1f3f4]/50 dark:bg-[#2d2f31]/30 border border-border-custom rounded-2xl space-y-3">
                                  <div className="grid grid-cols-3 gap-2">
                                    <input
                                      type="number"
                                      placeholder="Výška (cm)"
                                      required
                                      value={newPhysHeight}
                                      onChange={(e) => setNewPhysHeight(e.target.value)}
                                      className="p-2 bg-background border border-border-custom rounded-xl text-xs text-foreground"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Váha (kg)"
                                      required
                                      value={newPhysWeight}
                                      onChange={(e) => setNewPhysWeight(e.target.value)}
                                      className="p-2 bg-background border border-border-custom rounded-xl text-xs text-foreground"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Datum měření"
                                      value={newPhysDate}
                                      onChange={(e) => setNewPhysDate(e.target.value)}
                                      className="p-2 bg-background border border-border-custom rounded-xl text-xs text-foreground"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowAddPhysForm(false)}
                                      className="px-3 py-1 bg-card border border-border-custom rounded-full text-[11px] text-foreground cursor-pointer"
                                    >
                                      Zrušit
                                    </button>
                                    <button
                                      type="submit"
                                      className="px-3 py-1 bg-primary text-white rounded-full text-[11px] cursor-pointer"
                                    >
                                      Uložit
                                    </button>
                                  </div>
                                </form>
                              )}

                              {/* Height growth bar chart */}
                              {childPhys.length > 0 && (
                                <div className="p-4 bg-card rounded-2xl border border-border-custom/50">
                                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold mb-3">Vývoj výšky (grafické zobrazení v čase)</span>
                                  <div className="flex justify-around items-end h-32 pt-2 border-b border-border-custom">
                                    {[...childPhys].reverse().map((item, idx) => {
                                      const maxVal = Math.max(...childPhys.map(p => p.height)) || 180;
                                      const minVal = Math.min(...childPhys.map(p => p.height)) || 100;
                                      const range = (maxVal - minVal + 20) || 50;
                                      const scaledHeightPct = 30 + ((item.height - minVal) / range) * 65;
                                      return (
                                        <div key={idx} className="flex flex-col items-center group w-12 relative">
                                          <div className="absolute bottom-[105%] bg-secondary text-white text-[9px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-md z-10">
                                            {item.weight} kg
                                          </div>
                                          <div 
                                            style={{ height: `${scaledHeightPct}%` }} 
                                            className="bg-primary/80 hover:bg-primary w-6 rounded-t-lg transition-all duration-300 shadow-sm flex items-end justify-center pb-1 text-[9px] text-white font-bold"
                                          >
                                            {item.height}
                                          </div>
                                          <span className="text-[9px] text-muted mt-2 block whitespace-nowrap select-none">{item.date.substring(0, 5)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Physical measurements table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-border-custom/50 text-muted">
                                      <th className="py-2 font-medium">Datum měření</th>
                                      <th className="py-2 font-medium">Výška</th>
                                      <th className="py-2 font-medium">Váha</th>
                                      <th className="py-2 font-medium">BMI index</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border-custom/40">
                                    {childPhys.map((item: any, idx: number) => {
                                      const heightM = item.height / 100;
                                      const bmi = (item.weight / (heightM * heightM)).toFixed(1);
                                      return (
                                        <tr key={idx} className="text-foreground">
                                          <td className="py-2 font-medium">{item.date}</td>
                                          <td className="py-2">{item.height} cm</td>
                                          <td className="py-2">{item.weight} kg</td>
                                          <td className="py-2">
                                            <span className="text-[10px] bg-[#f1f3f4] dark:bg-[#2d2f31] px-2 py-0.5 rounded-full font-semibold">
                                              {bmi} BMI
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* SECTION D: DOCUMENTS & CONSENTS */}
                            <div className="bg-background border border-border-custom p-6 rounded-3xl space-y-4 shadow-xs">
                              <h4 className="text-[11px] font-medium text-muted uppercase tracking-wider flex items-center gap-2 pl-1">
                                <FileText className="w-5 h-5 text-primary" /> Doklady a právní souhlasy
                              </h4>

                              {/* Identity document preview card */}
                              <div className="p-4 bg-card rounded-2xl border border-border-custom/50 flex justify-between items-center text-xs">
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Osobní průkaz</span>
                                  <span className="font-bold text-foreground block text-sm">{childIdDoc?.docType || "Občanský průkaz (Dětský)"}</span>
                                  <span className="text-muted block">Vydavatel: {childIdDoc?.issuer || "Magistrát města Brna"}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono bg-[#f1f3f4] dark:bg-[#2d2f31] px-2.5 py-1 rounded-md text-foreground block font-bold mb-1">{childIdDoc?.docNumber || "987456123"}</span>
                                  <span className="text-[10px] text-muted block">Platnost do: <strong className="text-foreground">{childIdDoc?.validity || "18.06.2029"}</strong></span>
                                </div>
                              </div>

                              {/* Consents checklists */}
                              <div className="space-y-2.5">
                                <span className="text-xs text-muted font-medium block">Podepsané souhlasy se zastupováním a GDPR</span>
                                <div className="space-y-2">
                                  {childConsents.map((consent: any) => (
                                    <div
                                      key={consent.id}
                                      className="p-3 bg-card rounded-2xl border border-border-custom/50 flex justify-between items-center text-xs shadow-xs"
                                    >
                                      <div className="flex items-center gap-3">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleConsent(consent.id, activeChildId)}
                                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                                            consent.signed 
                                              ? "bg-emerald-500 border-emerald-500 text-white" 
                                              : "border-gray-400 bg-background"
                                          }`}
                                        >
                                          {consent.signed && <Check className="w-3 h-3" />}
                                        </button>
                                        <div>
                                          <span className={`font-medium block text-xs ${consent.signed ? 'text-foreground font-semibold' : 'text-muted'}`}>{consent.title}</span>
                                          {consent.signed && (
                                            <span className="text-[10px] text-muted block">Podepsáno dne: {consent.signedDate}</span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {consent.signed && (
                                        <button 
                                          type="button"
                                          title="Stáhnout dokument"
                                          onClick={() => alert(`Stahování dokumentu: ${consent.title}`)}
                                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2d2f31]/60 rounded-full border border-border-custom text-muted hover:text-foreground cursor-pointer"
                                        >
                                          <FileDown className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* SECTION E: AI OCR scanning trigger */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-5 rounded-3xl space-y-3 shadow-xs">
                              <div className="flex items-center gap-2 text-primary">
                                <Sparkles className="w-5 h-5 animate-pulse" />
                                <h4 className="text-[11px] font-bold uppercase tracking-wider">AI OCR Rychlý sken dokumentů</h4>
                              </div>
                              <p className="text-xs text-muted">
                                Vyberte soubor (např. lékařskou zprávu, vysvědčení, IPOD) a nechte AI automaticky načíst výšku, váhu, školu nebo stav očkování přímo do registru bez ručního přepisování.
                              </p>

                              {isOcrScanning ? (
                                <div className="p-6 bg-background rounded-2xl border border-primary/20 space-y-4 text-center relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-bounce opacity-80" />
                                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold text-primary animate-pulse">Skenování dokumentu umělou inteligencí...</p>
                                    <p className="text-[10px] text-muted">Skenuji text a páruji lékařské záznamy...</p>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  onClick={() => triggerOcrScan(activeChildId, childPhys)}
                                  className="p-6 bg-background rounded-2xl border border-dashed border-border-custom hover:border-primary/50 text-center cursor-pointer transition-all duration-300 group hover:shadow-xs"
                                >
                                  <FileText className="w-8 h-8 text-muted mx-auto mb-2 group-hover:text-primary transition-colors" />
                                  <p className="text-xs font-semibold text-foreground">Kliknutím simulujte nahrání a OCR analýzu zprávy</p>
                                  <p className="text-[10px] text-muted mt-1">Podporované formáty: PDF, JPG, PNG (Max 5MB)</p>
                                </div>
                              )}
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })()}

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



          {/* ========================================================= */}
          {/* 4. GOOGLE WIDGETS DRAWER (Slides from the right)          */}
          {/* ========================================================= */}
          {activeRightWidget && (
            <div className="w-80 border-l border-border-custom bg-card flex flex-col overflow-hidden h-full shrink-0 z-35 select-none animate-in slide-in-from-right duration-200">
              {/* Header */}
              <div className="p-4 border-b border-border-custom flex items-center justify-between bg-[#f6f8fc] dark:bg-[#111214] shrink-0">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  {activeRightWidget === 'calendar' && <Calendar className="w-4 h-4 text-[#1a73e8]" />}
                  {activeRightWidget === 'keep' && <Lightbulb className="w-4 h-4 text-[#fbbc04]" />}
                  {activeRightWidget === 'tasks' && <CheckSquare className="w-4 h-4 text-[#1a73e8]" />}
                  {activeRightWidget === 'maps' && <MapPin className="w-4 h-4 text-[#ea4335]" />}
                  {activeRightWidget === 'calendar' && "Kalendář"}
                  {activeRightWidget === 'keep' && "Keep"}
                  {activeRightWidget === 'tasks' && "Úkoly"}
                  {activeRightWidget === 'maps' && "Mapy"}
                </span>
                <button 
                  onClick={() => setActiveRightWidget(null)} 
                  className="p-1 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-full text-muted hover:text-foreground transition-colors"
                  title="Zavřít"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Widget Body */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30 dark:bg-slate-900/10">
                
                {/* A. CALENDAR WIDGET */}
                {activeRightWidget === 'calendar' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted uppercase tracking-wider">Dnešní program</span>
                      <span className="text-xs font-medium text-primary font-mono">{new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "long" })}</span>
                    </div>
                    
                    {/* List of events */}
                    <div className="space-y-3">
                      {events.slice(0, 8).map((e, idx) => {
                        const h = households.find(house => house.id === e.household_id);
                        const p = h ? persons.find(per => per.household_id === h.id && per.role === "foster_parent") : null;
                        const eventDate = new Date(e.occurred_at);
                        
                        return (
                          <div key={e.id || idx} className="p-3 bg-background border border-border-custom rounded-2xl shadow-3xs space-y-1 select-text">
                            <div className="flex justify-between items-start gap-1">
                              <span className="text-xs font-medium text-foreground leading-tight">{e.title}</span>
                              <span className="text-[10px] text-muted shrink-0 font-mono">
                                {eventDate.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}
                              </span>
                            </div>
                            {p && (
                              <div className="text-[11px] text-primary font-medium">
                                Rodina: {p.last_name}ových
                              </div>
                            )}
                            <p className="text-[11px] text-muted line-clamp-2 leading-relaxed font-normal">
                              {e.payload?.content || e.payload?.text || "Bez popisu."}
                            </p>
                          </div>
                        );
                      })}
                      {events.length === 0 && (
                        <div className="text-xs text-muted text-center italic py-4 font-normal">Žádné schůzky v plánu.</div>
                      )}
                    </div>

                    {/* Add dynamic mock appointment */}
                    <div className="pt-4 border-t border-border-custom space-y-2.5">
                      <span className="text-xs font-medium text-foreground block">Naplánovat novou schůzku</span>
                      <button 
                        onClick={() => {
                          const title = prompt("Zadejte název schůzky:");
                          if (!title) return;
                          const content = prompt("Zadejte popis schůzky:");
                          const newEvent = {
                            id: "event-" + Date.now(),
                            title: title,
                            type: "regular_visit",
                            occurred_at: new Date().toISOString(),
                            household_id: selectedFamilyId || (households[0]?.id || null),
                            payload: { content: content || "" }
                          };
                          setEvents(prev => [newEvent, ...prev]);
                        }}
                        className="w-full py-2 bg-primary hover:bg-primary-hover text-white rounded-full text-xs font-medium transition-colors shadow-2xs"
                      >
                        + Rychlá schůzka
                      </button>
                    </div>
                  </div>
                )}

                {/* B. KEEP WIDGET */}
                {activeRightWidget === 'keep' && (
                  <div className="space-y-4">
                    {/* Add Note Form */}
                    <div className="p-3 bg-background border border-border-custom rounded-2xl shadow-3xs space-y-2">
                      <input 
                        type="text" 
                        placeholder="Název poznámky..." 
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        className="w-full bg-transparent text-xs font-medium outline-none text-foreground placeholder-muted border-none"
                      />
                      <textarea 
                        placeholder="Napište poznámku..." 
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        className="w-full bg-transparent text-xs outline-none text-foreground placeholder-muted min-h-[60px] resize-none leading-relaxed border-none"
                      />
                      <div className="flex items-center justify-between pt-2 border-t border-border-custom/50">
                        {/* Note Color selection */}
                        <div className="flex items-center gap-1.5">
                          {[
                            { bg: "bg-[#fff4b8] dark:bg-[#fff4b8]/20", border: "border-yellow-400" },
                            { bg: "bg-[#e8f0fe] dark:bg-[#e8f0fe]/20", border: "border-blue-400" },
                            { bg: "bg-[#e6c2ff] dark:bg-[#e6c2ff]/20", border: "border-purple-400" },
                            { bg: "bg-[#f1f3f4] dark:bg-[#2d2f31]/50", border: "border-gray-400" }
                          ].map((c, idx) => (
                            <button 
                              key={idx}
                              onClick={() => setNoteColor(c.bg)}
                              className={`w-3.5 h-3.5 rounded-full ${c.bg} border ${
                                noteColor === c.bg ? "ring-1 ring-primary/80 scale-110" : "border-border-custom/80"
                              } transition-all`}
                            />
                          ))}
                        </div>
                        <button 
                          onClick={addKeepNote}
                          className="px-3 py-1 bg-primary hover:bg-primary-hover text-white text-[11px] font-medium rounded-full transition-colors"
                        >
                          Přidat
                        </button>
                      </div>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3">
                      {keepNotes.map(note => (
                        <div 
                          key={note.id} 
                          className={`p-3.5 rounded-2xl border border-border-custom/80 shadow-3xs relative group transition-all select-text ${note.color}`}
                        >
                          <button 
                            onClick={() => deleteKeepNote(note.id)}
                            className="absolute top-2 right-2 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Smazat poznámku"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <h4 className="text-xs font-semibold text-foreground mb-1 pr-6 leading-tight">{note.title}</h4>
                          <p className="text-xs text-foreground/80 leading-relaxed font-normal whitespace-pre-wrap">{note.content}</p>
                        </div>
                      ))}
                      {keepNotes.length === 0 && (
                        <div className="text-xs text-muted text-center italic py-6 font-normal">Žádné poznámky. Napište první nahoře!</div>
                      )}
                    </div>
                  </div>
                )}

                {/* C. TASKS WIDGET */}
                {activeRightWidget === 'tasks' && (
                  <div className="space-y-4">
                    {/* Add Task Input */}
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Přidat úkol..." 
                        value={taskText}
                        onChange={(e) => setTaskText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addTask();
                        }}
                        className="flex-1 bg-background border border-border-custom rounded-full px-3.5 py-1.5 text-xs outline-none text-foreground focus:ring-1 focus:ring-primary placeholder-muted"
                      />
                      <button 
                        onClick={addTask}
                        className="p-1.5 bg-primary hover:bg-primary-hover text-white rounded-full transition-colors flex items-center justify-center shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Tasks List */}
                    <div className="space-y-2.5">
                      {/* Uncompleted tasks */}
                      {tasks.filter(t => !t.completed).map(task => (
                        <div key={task.id} className="flex items-center justify-between p-2.5 bg-background border border-border-custom rounded-2xl shadow-3xs group select-text">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input 
                              type="checkbox" 
                              checked={false}
                              onChange={() => toggleTask(task.id)}
                              className="w-4 h-4 rounded-full cursor-pointer border-gray-300 text-primary focus:ring-primary shrink-0 bg-transparent"
                            />
                            <span className="text-xs text-foreground font-normal truncate leading-snug">{task.text}</span>
                          </div>
                          <button 
                            onClick={() => deleteTask(task.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Divider if we have both states */}
                      {tasks.some(t => !t.completed) && tasks.some(t => t.completed) && (
                        <div className="w-full h-px bg-border-custom/60 my-2" />
                      )}

                      {/* Completed tasks */}
                      {tasks.filter(t => t.completed).map(task => (
                        <div key={task.id} className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-900/5 border border-border-custom/60 rounded-2xl shadow-3xs group select-text">
                          <div className="flex items-center gap-2.5 min-w-0 opacity-60">
                            <input 
                              type="checkbox" 
                              checked={true}
                              onChange={() => toggleTask(task.id)}
                              className="w-4 h-4 rounded-full cursor-pointer border-gray-300 text-primary focus:ring-primary shrink-0 bg-transparent"
                            />
                            <span className="text-xs text-muted font-normal line-through truncate leading-snug">{task.text}</span>
                          </div>
                          <button 
                            onClick={() => deleteTask(task.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {tasks.length === 0 && (
                        <div className="text-xs text-muted text-center italic py-6 font-normal">Bez úkolů.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* D. MAPS WIDGET */}
                {activeRightWidget === 'maps' && (
                  <div className="space-y-4">
                    {selectedHousehold ? (
                      (() => {
                        const h = households.find(house => house.id === selectedHousehold.id);
                        const p = h ? persons.find(per => per.household_id === h.id && per.role === "foster_parent") : null;
                        const pAddress = addresses.find(addr => addr.person_id === p?.id);
                        
                        return (
                          <div className="space-y-4">
                            <div className="space-y-1 select-text">
                              <span className="text-xs font-semibold text-muted uppercase tracking-wider block">Rodinné bydliště</span>
                              <span className="text-sm font-medium text-foreground block leading-tight font-sans">
                                {p ? `${p.first_name} ${p.last_name}` : "Vybraná rodina"}
                              </span>
                              {pAddress ? (
                                <p className="text-xs text-muted leading-relaxed font-sans font-normal">
                                  {pAddress.street}<br />
                                  {pAddress.zip ? `${pAddress.zip} ` : ""}{pAddress.city}
                                  {pAddress.state && pAddress.state.toLowerCase() !== "česká republika" ? <><br />{pAddress.state}</> : ""}
                                </p>
                              ) : (
                                <span className="text-xs text-muted italic block font-normal">Adresa není evidována.</span>
                              )}
                            </div>

                            {/* Visual Mock Map */}
                            {pAddress && (
                              <div className="border border-border-custom rounded-2xl overflow-hidden shadow-xs bg-[#e8eaed] dark:bg-[#2d2f31] relative h-48 select-none flex items-center justify-center">
                                {/* SVG Mock Map layout */}
                                <svg className="absolute inset-0 w-full h-full opacity-60 dark:opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  <path d="M0 10 H100 M0 30 H100 M0 50 H100 M0 70 H100 M0 90 H100" stroke="#c4c7c5" strokeWidth="0.5" />
                                  <path d="M10 0 V100 M30 0 V100 M50 0 V100 M70 0 V100 M90 0 V100" stroke="#c4c7c5" strokeWidth="0.5" />
                                  <path d="M0 45 L50 20 L100 80" stroke="#ffffff" strokeWidth="3" fill="none" />
                                  <path d="M20 0 L40 60 L80 100" stroke="#ffffff" strokeWidth="4" fill="none" />
                                </svg>
                                {/* Blue radius circle */}
                                <div className="absolute w-12 h-12 rounded-full bg-primary/15 animate-ping border border-primary/20" />
                                {/* Glowing Locator Pin */}
                                <div className="absolute flex flex-col items-center z-10">
                                  <MapPin className="w-8 h-8 text-[#ea4335] drop-shadow-md fill-[#ea4335]/30 animate-bounce" />
                                  <div className="w-2.5 h-1 bg-black/20 rounded-full blur-[1px] mt-0.5" />
                                </div>
                                <span className="absolute bottom-2 left-2 bg-black/60 text-[10px] text-white px-2 py-0.5 rounded-full font-mono font-medium tracking-wide">
                                  Brno, CZ
                                </span>
                              </div>
                            )}

                            {pAddress && (
                              <div className="space-y-2">
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pAddress.street}, ${pAddress.city}`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-2 bg-background hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/55 border border-border-custom rounded-full text-xs text-foreground font-medium text-center transition-colors block select-none shadow-3xs"
                                >
                                  Otevřít v Google Mapách
                                </a>
                                <button 
                                  onClick={() => alert(`Plánování cesty na adresu: ${pAddress.street}, ${pAddress.city}`)}
                                  className="w-full py-2 bg-primary hover:bg-primary-hover text-white rounded-full text-xs font-medium transition-colors text-center block select-none shadow-2xs"
                                >
                                  Naplánovat trasu
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-xs text-muted text-center italic py-12 font-normal leading-relaxed">
                        Vyberte rodinu v kontaktech pro zobrazení polohy na mapě.
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. GOOGLE APP SWITCHER RAIL (Far right narrow utility bar) */}
          {/* ========================================================= */}
          <div className="w-12 bg-[#f6f8fc] dark:bg-[#111214] border-l border-border-custom flex flex-col items-center py-4 justify-between shrink-0 select-none z-35 h-full">
            <div className="flex flex-col items-center w-full space-y-5">
              
              {/* Calendar App */}
              <button 
                onClick={() => toggleRightWidget('calendar')}
                className={`p-2 rounded-full transition-all relative group ${
                  activeRightWidget === 'calendar'
                    ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa]"
                    : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
                }`}
                title="Kalendář"
              >
                <Calendar className="w-5 h-5 stroke-[1.5]" />
              </button>

              {/* Keep App */}
              <button 
                onClick={() => toggleRightWidget('keep')}
                className={`p-2 rounded-full transition-all relative group ${
                  activeRightWidget === 'keep'
                    ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa]"
                    : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
                }`}
                title="Keep"
              >
                <Lightbulb className="w-5 h-5 stroke-[1.5]" />
              </button>

              {/* Tasks App */}
              <button 
                onClick={() => toggleRightWidget('tasks')}
                className={`p-2 rounded-full transition-all relative group ${
                  activeRightWidget === 'tasks'
                    ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa]"
                    : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
                }`}
                title="Úkoly"
              >
                <CheckSquare className="w-5 h-5 stroke-[1.5]" />
              </button>

              {/* Maps App */}
              <button 
                onClick={() => toggleRightWidget('maps')}
                className={`p-2 rounded-full transition-all relative group ${
                  activeRightWidget === 'maps'
                    ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa]"
                    : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
                }`}
                title="Mapy"
              >
                <MapPin className="w-5 h-5 stroke-[1.5]" />
              </button>

              <div className="w-6 h-px bg-border-custom/75" />

              {/* Bottom Add button */}
              <button 
                onClick={() => alert("Nainstalovat doplňky Google Workspace...")}
                className="p-2 rounded-full text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground transition-all"
                title="Získat doplňky"
              >
                <Plus className="w-5 h-5 stroke-[1.5]" />
              </button>

            </div>
          </div>



        </div>
      </div>
    </div>
  );
}