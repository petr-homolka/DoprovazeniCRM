"use client";

import React, { useState } from "react";
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
  Lock
} from "lucide-react";

export default function Home() {
  const [selectedFamily, setSelectedFamily] = useState("novotni");
  const [searchQuery, setSearchQuery] = useState("");

  const families = [
    {
      id: "novotni",
      name: "Rodina Novotných",
      fosterId: "FOST-2026-0042",
      type: "Příbuzenská",
      status: "active",
      ko: "Mgr. Anna Málková",
      child: "Adéla Novotná (8 let)",
      rating: "A",
      gdpr: false,
    },
    {
      id: "svobodovi",
      name: "Rodina Svobodových",
      fosterId: "FOST-2025-0118",
      type: "Nezprostředkovaná",
      status: "lead",
      ko: "Bc. Jan Dvořák",
      child: "Filip Svoboda (12 let)",
      rating: "B",
      gdpr: true,
    },
    {
      id: "kucerovi",
      name: "Rodina Kučerových",
      fosterId: "FOST-2026-0003",
      type: "Zprostředkovaná",
      status: "active",
      ko: "Mgr. Anna Málková",
      child: "Patrik Kučera (5 let)",
      rating: "Z", // Zákaz styku s biologickým otcem
      gdpr: true,
    }
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-900 text-slate-100 font-sans">
      
      {/* 1. ŠPIČKOVÝ SIDEBAR */}
      <aside className="w-64 bg-slate-950 flex flex-col border-r border-slate-800">
        {/* Logo a Organizace */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              FosterFlow
            </h1>
            <span className="text-xs text-indigo-400 font-medium tracking-wide uppercase">
              PRO verze (CZ)
            </span>
          </div>
        </div>

        {/* Hlavní menu */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-600/10 text-indigo-400 font-medium transition-all">
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

        {/* Whitelabeling Tenant Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
              DO
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-300">Doprovázení s.r.o.</p>
              <p className="text-[10px] text-slate-500">Pobočka Brno-město</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. STŘEDNÍ SLOUPCOVÝ SEZNAM RODIN */}
      <section className="w-96 bg-slate-900 flex flex-col border-r border-slate-800">
        {/* Hlavička sloupce a Hledání */}
        <div className="p-6 border-b border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white tracking-tight">Klientské spisy</h2>
            <button className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-md">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Hledat rodinu, dítě, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Seznam položek */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {families
            .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.child.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((f) => (
              <div 
                key={f.id}
                onClick={() => setSelectedFamily(f.id)}
                className={`p-4 rounded-xl cursor-pointer border transition-all ${
                  selectedFamily === f.id 
                    ? "bg-indigo-600/10 border-indigo-500/50 shadow-md shadow-indigo-500/5" 
                    : "bg-slate-950/40 border-slate-850 hover:bg-slate-850/50"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-sm text-white">{f.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                    f.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {f.status === "active" ? "Aktivní" : "Zájemce"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{f.child}</p>
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>{f.fosterId}</span>
                  <span>{f.ko}</span>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* 3. DETAILNÍ PANEL (SLIDE-OVER / DETAILE PODROBNOSTÍ) */}
      <main className="flex-1 bg-slate-900/50 flex flex-col overflow-hidden">
        
        {/* Horní lišta detailu */}
        <div className="h-20 px-8 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div>
            <h3 className="text-lg font-bold text-white">
              {families.find(f => f.id === selectedFamily)?.name}
            </h3>
            <p className="text-xs text-slate-400">
              Detail rodinného spisu • {families.find(f => f.id === selectedFamily)?.fosterId}
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition-colors border border-slate-700">
              Vygenerovat PDF spis
            </button>
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors shadow-md">
              Upravit kartu
            </button>
          </div>
        </div>

        {/* Hlavní obsah detailu */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Upozornění na GDPR Karanténu */}
          {!families.find(f => f.id === selectedFamily)?.gdpr && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">GDPR Karanténa aktivní</h4>
                <p className="text-xs text-amber-400/80 leading-relaxed mt-1">
                  Dosud nebyl fyzicky podepsán a naskenován souhlas s evidencí. Osobní údaje biologické rodiny a dalších kontaktů jsou v celém systému skryty.
                </p>
              </div>
            </div>
          )}

          {/* Mřížka informací o dítěti */}
          <div className="grid grid-cols-3 gap-6">
            
            {/* Karta dítěte */}
            <div className="bg-slate-950/40 p-6 rounded-xl border border-slate-850 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dítě v péči</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  families.find(f => f.id === selectedFamily)?.rating === "A" ? "bg-emerald-500/10 text-emerald-400" :
                  families.find(f => f.id === selectedFamily)?.rating === "B" ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"
                }`}>
                  Rating {families.find(f => f.id === selectedFamily)?.rating}
                </span>
              </div>
              <div>
                <p className="text-xl font-bold text-white">{families.find(f => f.id === selectedFamily)?.child}</p>
                <p className="text-xs text-indigo-400 font-medium mt-1">Státní občanství: ČR</p>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-900 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Škola:</span> <span className="text-slate-300">ZŠ Husova, Brno</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Ročník:</span> <span className="text-slate-300">3. třída (od 01.09.2025)</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Pediatr:</span> <span className="text-slate-300">MUDr. Jan Kovář</span></div>
              </div>
            </div>

            {/* Sociální prostor a kontakty (GDPR ukázka) */}
            <div className="bg-slate-950/40 p-6 rounded-xl border border-slate-850 space-y-4 col-span-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sociální kruh a vazby</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/60 border border-slate-850">
                  <div>
                    <p className="text-sm font-semibold text-white">Helena Novotná</p>
                    <p className="text-xs text-slate-500">Matka (biologická) • Rating B</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    {families.find(f => f.id === selectedFamily)?.gdpr ? (
                      <span className="text-slate-300">+420 774 123 456</span>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> +420 *** *** ***</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/60 border border-slate-850">
                  <div>
                    <p className="text-sm font-semibold text-white">Petr Novotný</p>
                    <p className="text-xs text-slate-500">Otec (biologický) • Rating Z (Zákaz styku)</p>
                  </div>
                  <span className="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wide rounded border border-red-500/10">
                    Styk zakázán
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Časová osa (Timeline) */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Časová osa událostí rodiny</h4>
            
            <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
              
              {/* Událost 1 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-indigo-600 ring-4 ring-slate-900" />
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-semibold text-sm text-white">Pravidelná pololetní návštěva v rodině</h5>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Návštěva proběhla bez komplikací. Adéla vykazuje stabilní chování, pěstouni spolupracují na plánu vzdělávání.
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap ml-4">15. 06. 2026</span>
                </div>
              </div>

              {/* Událost 2 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-slate-800 ring-4 ring-slate-900" />
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-semibold text-sm text-white">Soudní rozhodnutí o pokračování péče</h5>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Okresní soud v Brně vydal usnesení č.j. 42 C 12/2026 o prodloužení ústavní/pěstounské péče.
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap ml-4">02. 06. 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. AI COMMAND CENTER (CHATOVÝ PANEL DOLE) */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/80">
          <div className="max-w-4xl mx-auto relative">
            <Sparkles className="absolute left-4 top-4.5 w-5 h-5 text-indigo-400" />
            <input 
              type="text" 
              placeholder="Zeptejte se AI na cokoliv ze spisu (např.: Má dítě aktuální zdravotní souhlas? Kdy proběhla poslední návštěva?)..."
              className="w-full pl-12 pr-24 py-4 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xl"
            />
            <button className="absolute right-3 top-3 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold tracking-wide flex items-center gap-1 transition-colors">
              Položit dotaz
            </button>
          </div>
        </div>

      </main>

    </div>
  );
}
