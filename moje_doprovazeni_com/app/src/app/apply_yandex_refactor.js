const fs = require('fs');
const path = require('path');

const pagePath = "C:\\Users\\Petr Homolka\\OneDrive\\Dokumenty\\GitHub\\moje\\moje_doprovazeni_com\\app\\src\\app\\page.tsx";
let code = fs.readFileSync(pagePath, 'utf8').replace(/\r\n/g, '\n');

function clean(str) {
  return str.replace(/\r\n/g, '\n');
}

// Replacement 1: Layout Wrapper & App Switch Rail (vertical sidebar)
const switchRailOld = `  return (
    <div className={\`flex h-screen w-full overflow-hidden bg-background text-foreground font-sans antialiased \${designMode === 'yandex' ? 'theme-yandex' : ''}\`}>
      
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
              className={\`p-3 rounded-xl transition-all relative group flex flex-col items-center justify-center cursor-pointer \${
                activeService === 'mail'
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa] theme-yandex:bg-[#fc0] theme-yandex:text-black" 
                  : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
              }\`}
              title="Pošta (Spisy)"
            >
              <Mail className="w-5 h-5 stroke-[1.5]" />
              <span className="text-[9px] mt-1 font-medium scale-90">Pošta</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Chat / Google Chat Button */}
            <button 
              onClick={() => { setActiveService('chat'); }}
              className={\`p-3 rounded-xl transition-all relative group flex flex-col items-center justify-center cursor-pointer \${
                activeService === 'chat'
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa] theme-yandex:bg-[#fc0] theme-yandex:text-black" 
                  : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
              }\`}
              title="Chat"
            >
              <MessageSquare className="w-5 h-5 stroke-[1.5]" />
              <span className="text-[9px] mt-1 font-medium scale-90">Chat</span>
            </button>

            {/* Kontakty / Google Contacts Button */}
            <button 
              onClick={() => { setActiveService('contacts'); }}
              className={\`p-3 rounded-xl transition-all relative group flex flex-col items-center justify-center cursor-pointer \${
                activeService === 'contacts'
                  ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa] theme-yandex:bg-[#fc0] theme-yandex:text-black" 
                  : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
              }\`}
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
            className={\`p-2.5 rounded-xl transition-all relative group flex flex-col items-center justify-center cursor-pointer shadow-xs \${
              designMode === 'yandex' 
                ? "bg-[#fc0] text-black hover:bg-[#f2c200]" 
                : "bg-[#1a73e8] text-white hover:bg-[#1557b0]"
            }\`}
            title={\`Přepnout na \${designMode === 'google' ? 'Yandex 360' : 'Google Workspace'}\`}
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
            className={\`w-8 h-8 flex items-center justify-center font-medium text-xs border shadow-xs rounded-full \${designMode === 'yandex' ? "bg-slate-200 border-slate-350" : "bg-primary/10 border-primary/20 text-primary"}\`}
            onClick={() => alert(\`Přihlášený uživatel: \${currentUserProfile?.first_name} \${currentUserProfile?.last_name}\`)}
          >
            {currentUserProfile?.first_name?.charAt(0) || "U"}
          </div>
        </div>
      </div>`;

const switchRailNew = `  return (
    <div className={designMode === 'yandex' ? "Ya-Layout theme-yandex" : \`flex h-screen w-full overflow-hidden bg-background text-foreground font-sans antialiased\`}>
      
      {/* ========================================================= */}
      {/* 1. APP SWITCH RAIL / GLOBAL SIDEBAR                       */}
      {/* ========================================================= */}
      {designMode === 'yandex' ? (
        <aside className="Ya-Layout__global-sidebar Global-Nav">
          <div className="Global-Nav__logo">
            <Activity className="w-6 h-6 text-[#FFC64B] fill-[#FFC64B]/10" />
          </div>
          <div className="Global-Nav__items">
            <button 
              onClick={() => { setActiveService('mail'); setSelectedFamilyId(null); }}
              className={\`Global-Nav__item \${activeService === 'mail' ? 'Global-Nav__item_active' : ''}\`}
              title="Pošta (Spisy)"
            >
              <Mail className="w-5 h-5 stroke-[1.5]" />
            </button>
            <button 
              onClick={() => { setActiveService('chat'); }}
              className={\`Global-Nav__item \${activeService === 'chat' ? 'Global-Nav__item_active' : ''}\`}
              title="Chat"
            >
              <MessageSquare className="w-5 h-5 stroke-[1.5]" />
            </button>
            <button 
              onClick={() => { setActiveService('contacts'); }}
              className={\`Global-Nav__item \${activeService === 'contacts' ? 'Global-Nav__item_active' : ''}\`}
              title="Kontakty"
            >
              <Users className="w-5 h-5 stroke-[1.5]" />
            </button>
          </div>
          <div className="Global-Nav__footer">
            <button 
              onClick={() => setDesignMode(prev => prev === 'google' ? 'yandex' : 'google')}
              className="Global-Nav__item"
              title="Přepnout na Google Workspace"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button 
              onClick={toggleDarkMode}
              className="Global-Nav__item"
              title={darkMode ? "Světlý režim" : "Tmavý režim"}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => alert("Nastavení")}
              className="Global-Nav__item"
              title="Nastavení"
            >
              <Settings className="w-5 h-5 stroke-[1.5]" />
            </button>
            <div 
              className="w-8 h-8 flex items-center justify-center font-medium text-xs rounded-full bg-slate-200 border border-slate-350 text-slate-800 cursor-pointer"
              onClick={() => alert(\`Přihlášený uživatel: \${currentUserProfile?.first_name} \${currentUserProfile?.last_name}\`)}
            >
              {currentUserProfile?.first_name?.charAt(0) || "U"}
            </div>
          </div>
        </aside>
      ) : (
        <div className="w-16 bg-[#f6f8fc] dark:bg-[#111214] border-r border-border-custom flex flex-col items-center py-4 justify-between shrink-0 select-none z-25">
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
                className={\`p-3 rounded-xl transition-all relative group flex flex-col items-center justify-center cursor-pointer \${
                  activeService === 'mail'
                    ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa]" 
                    : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
                }\`}
                title="Pošta (Spisy)"
              >
                <Mail className="w-5 h-5 stroke-[1.5]" />
                <span className="text-[9px] mt-1 font-medium scale-90">Pošta</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Chat / Google Chat Button */}
              <button 
                onClick={() => { setActiveService('chat'); }}
                className={\`p-3 rounded-xl transition-all relative group flex flex-col items-center justify-center cursor-pointer \${
                  activeService === 'chat'
                    ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa]" 
                    : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
                }\`}
                title="Chat"
              >
                <MessageSquare className="w-5 h-5 stroke-[1.5]" />
                <span className="text-[9px] mt-1 font-medium scale-90">Chat</span>
              </button>

              {/* Kontakty / Google Contacts Button */}
              <button 
                onClick={() => { setActiveService('contacts'); }}
                className={\`p-3 rounded-xl transition-all relative group flex flex-col items-center justify-center cursor-pointer \${
                  activeService === 'contacts'
                    ? "bg-[#c2e7ff] text-[#001d35] dark:bg-[#004b87] dark:text-[#a8c7fa]" 
                    : "text-muted hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] hover:text-foreground"
                }\`}
                title="Kontakty"
              >
                <Users className="w-5 h-5 stroke-[1.5]" />
                <span className="text-[9px] mt-1 font-medium scale-90">Kontakty</span>
              </button>

            </div>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <button 
              onClick={() => setDesignMode(prev => prev === 'google' ? 'yandex' : 'google')}
              className={\`p-2.5 rounded-xl transition-all relative group flex flex-col items-center justify-center cursor-pointer shadow-xs bg-[#1a73e8] text-white hover:bg-[#1557b0]\`}
              title="Přepnout na Yandex 360"
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
              onClick={() => alert("Nastavení Google Workspace")}
              className="p-2 text-muted hover:text-foreground hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31] rounded-full transition-colors cursor-pointer"
              title="Nastavení"
            >
              <Settings className="w-5 h-5 stroke-[1.5]" />
            </button>

            {/* Profile Monogram / Avatar */}
            <div 
              className="w-8 h-8 flex items-center justify-center font-medium text-xs border shadow-xs rounded-full bg-primary/10 border-primary/20 text-primary"
              onClick={() => alert(\`Přihlášený uživatel: \${currentUserProfile?.first_name} \${currentUserProfile?.last_name}\`)}
            >
              {currentUserProfile?.first_name?.charAt(0) || "U"}
            </div>
          </div>
        </div>
      )}`;

// Replacement 2: Dynamic sidebar aside
const sidebarOld = `      {/* ========================================================= */}
      {/* 2. DYNAMIC SIDEBAR (Changes based on active service)       */}
      {/* ========================================================= */}
      <aside className={\`w-64 bg-[#f6f8fc] dark:bg-[#111214] flex flex-col shrink-0 transition-all duration-200 border-r border-border-custom select-none \${
        sidebarOpen ? "translate-x-0" : "-translate-x-full w-0"
      }\`}>
        
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
                className={\`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-all \${
                  contactFilterType === 'families' 
                    ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                    : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                }\`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 stroke-[1.5]" />
                  <span>Spisy rodin</span>
                </div>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{households.length}</span>
              </button>

              <button 
                onClick={() => { setContactFilterType('foster_parents'); setSelectedFamilyId(null); }}
                className={\`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-all \${
                  contactFilterType === 'foster_parents' 
                    ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                    : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                }\`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 stroke-[1.5]" />
                  <span>Pěstouni</span>
                </div>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{persons.filter(p => p.role === 'foster_parent').length}</span>
              </button>

              <button 
                onClick={() => { setContactFilterType('children'); setSelectedFamilyId(null); }}
                className={\`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-all \${
                  contactFilterType === 'children' 
                    ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                    : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                }\`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 stroke-[1.5]" />
                  <span>Děti</span>
                </div>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{persons.filter(p => p.role === 'child').length}</span>
              </button>

              <button 
                onClick={() => { setContactFilterType('others'); setSelectedFamilyId(null); }}
                className={\`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-all \${
                  contactFilterType === 'others' 
                    ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                    : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                }\`}
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
                  className={\`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-medium transition-all \${
                    activeMailFolder === folder.id 
                      ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                      : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                  }\`}
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
                  const name = p ? \`\${p.first_name} \${p.last_name}\` : "Pěstoun";
                  const lastMessage = chatThreads[h.id]?.[chatThreads[h.id].length - 1]?.text || "Zatím žádné zprávy";
                  
                  return (
                    <button
                      key={h.id}
                      onClick={() => { setSelectedFamilyId(h.id); }}
                      className={\`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 \${
                        selectedFamilyId === h.id 
                          ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                          : "text-foreground hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50"
                      }\`}
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
      </aside>`;

const sidebarNew = `      {/* ========================================================= */}
      {/* 2. DYNAMIC SIDEBAR (Changes based on active service)       */}
      {/* ========================================================= */}
      {designMode === 'yandex' ? (
        <aside className="Ya-Layout__sub-sidebar Sub-Nav">
          {/* Create Button */}
          <div className="px-4 mb-4 mt-2">
            <button 
              onClick={() => {
                if (activeService === 'contacts') alert("Vytvořit novou rodinu");
                else if (activeService === 'mail') alert("Napsat nový e-mail/spis");
                else alert("Spustit novou konverzaci");
              }}
              className="Button Button_view_action w-full flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>
                {activeService === 'contacts' && "Vytvořit kontakt"}
                {activeService === 'mail' && "Nová zpráva"}
                {activeService === 'chat' && "Nový chat"}
              </span>
            </button>
          </div>

          {/* SERVICE 1: CONTACTS SUB-NAV */}
          {activeService === 'contacts' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <nav className="Menu-Group">
                <button 
                  onClick={() => { setContactFilterType('families'); setSelectedFamilyId(null); }}
                  className={\`Menu-Item \${contactFilterType === 'families' ? 'Menu-Item_active' : ''}\`}
                >
                  <Building2 className="Menu-Item__icon w-4 h-4" />
                  <span className="Menu-Item__text">Spisy rodin</span>
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{households.length}</span>
                </button>

                <button 
                  onClick={() => { setContactFilterType('foster_parents'); setSelectedFamilyId(null); }}
                  className={\`Menu-Item \${contactFilterType === 'foster_parents' ? 'Menu-Item_active' : ''}\`}
                >
                  <User className="Menu-Item__icon w-4 h-4" />
                  <span className="Menu-Item__text">Pěstouni</span>
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{persons.filter(p => p.role === 'foster_parent').length}</span>
                </button>

                <button 
                  onClick={() => { setContactFilterType('children'); setSelectedFamilyId(null); }}
                  className={\`Menu-Item \${contactFilterType === 'children' ? 'Menu-Item_active' : ''}\`}
                >
                  <GraduationCap className="Menu-Item__icon w-4 h-4" />
                  <span className="Menu-Item__text">Děti</span>
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{persons.filter(p => p.role === 'child').length}</span>
                </button>

                <button 
                  onClick={() => { setContactFilterType('others'); setSelectedFamilyId(null); }}
                  className={\`Menu-Item \${contactFilterType === 'others' ? 'Menu-Item_active' : ''}\`}
                >
                  <Users className="Menu-Item__icon w-4 h-4" />
                  <span className="Menu-Item__text">Ostatní lidé</span>
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{persons.filter(p => p.role !== 'foster_parent' && p.role !== 'child').length}</span>
                </button>
              </nav>

              {/* Status and care filters */}
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

          {/* SERVICE 2: MAIL SUB-NAV */}
          {activeService === 'mail' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <nav className="Menu-Group">
                {[
                  { id: "inbox", label: "Doručená pošta", icon: Inbox, badge: events.length },
                  { id: "starred", label: "S hvězdičkou", icon: Star, badge: starredEvents.size },
                  { id: "sent", label: "Odeslané", icon: Send, badge: null },
                  { id: "drafts", label: "Koncepty", icon: FileText, badge: null }
                ].map(folder => (
                  <button 
                    key={folder.id}
                    onClick={() => { setActiveMailFolder(folder.id as any); setSelectedEventId(null); }}
                    className={\`Menu-Item \${activeMailFolder === folder.id ? 'Menu-Item_active' : ''}\`}
                  >
                    <folder.icon className="Menu-Item__icon w-4 h-4" />
                    <span className="Menu-Item__text">{folder.label}</span>
                    {folder.badge !== null && folder.badge > 0 && (
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{folder.badge}</span>
                    )}
                  </button>
                ))}
              </nav>

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

          {/* SERVICE 3: CHAT SUB-NAV */}
          {activeService === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 mb-2">
                <span className="text-[11px] font-medium text-muted uppercase tracking-wider pl-2">Přímé zprávy</span>
              </div>
              <nav className="Menu-Group overflow-y-auto px-2 space-y-0.5">
                {households.map(h => {
                  const p = persons.find(per => per.household_id === h.id && per.role === "foster_parent");
                  const name = p ? \`\${p.first_name} \text{\${p.last_name}}\` : "Pěstoun";
                  const lastMessage = chatThreads[h.id]?.[chatThreads[h.id].length - 1]?.text || "Zatím žádné zprávy";
                  
                  return (
                    <button
                      key={h.id}
                      onClick={() => { setSelectedFamilyId(h.id); }}
                      className={\`Menu-Item \${selectedFamilyId === h.id ? 'Menu-Item_active' : ''}\`}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-medium text-[10px] shrink-0">
                        {p?.first_name?.charAt(0) || "P"}
                      </div>
                      <div className="truncate flex-1 text-left">
                        <p className="Menu-Item__text truncate leading-none">\${name}</p>
                        <p className="text-[10px] text-muted truncate mt-0.5">\${lastMessage}</p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </aside>
      ) : (
        <aside className={\`w-64 bg-[#f6f8fc] dark:bg-[#111214] flex flex-col shrink-0 transition-all duration-200 border-r border-border-custom select-none \${
          sidebarOpen ? "translate-x-0" : "-translate-x-full w-0"
        }\`}>
          
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
                  className={\`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-all \${
                    contactFilterType === 'families' 
                      ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                      : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                  }\`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 stroke-[1.5]" />
                    <span>Spisy rodin</span>
                  </div>
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{households.length}</span>
                </button>

                <button 
                  onClick={() => { setContactFilterType('foster_parents'); setSelectedFamilyId(null); }}
                  className={\`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-all \${
                    contactFilterType === 'foster_parents' 
                      ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                      : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                  }\`}
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 stroke-[1.5]" />
                    <span>Pěstouni</span>
                  </div>
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{persons.filter(p => p.role === 'foster_parent').length}</span>
                </button>

                <button 
                  onClick={() => { setContactFilterType('children'); setSelectedFamilyId(null); }}
                  className={\`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-all \${
                    contactFilterType === 'children' 
                      ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                      : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                  }\`}
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-4 h-4 stroke-[1.5]" />
                    <span>Děti</span>
                  </div>
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-foreground/80">{persons.filter(p => p.role === 'child').length}</span>
                </button>

                <button 
                  onClick={() => { setContactFilterType('others'); setSelectedFamilyId(null); }}
                  className={\`w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-all \${
                    contactFilterType === 'others' 
                      ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                      : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                  }\`}
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
                    className={\`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-medium transition-all \${
                      activeMailFolder === folder.id 
                        ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                        : "text-foreground hover:bg-[#e8eaed]/80 dark:hover:bg-[#2d2f31]/50"
                    }\`}
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
                    const name = p ? \`\${p.first_name} \${p.last_name}\` : "Pěstoun";
                    const lastMessage = chatThreads[h.id]?.[chatThreads[h.id].length - 1]?.text || "Zatím žádné zprávy";
                    
                    return (
                      <button
                        key={h.id}
                        onClick={() => { setSelectedFamilyId(h.id); }}
                        className={\`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 \${
                          selectedFamilyId === h.id 
                            ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#0842a0]/20 dark:text-[#a8c7fa]" 
                            : "text-foreground hover:bg-[#f1f3f4] dark:hover:bg-[#2d2f31]/50"
                        }\`}
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
      )}`;

// Replacement 3: Dynamic viewport layout container
const viewportContainerOld = `        {/* Dynamic viewport layout */}
        <div className="flex-1 flex overflow-hidden">`;

const viewportContainerNew = `        {/* Dynamic viewport layout */}
        <div className={\`flex-1 flex overflow-hidden \${designMode === 'yandex' ? 'relative' : ''}\`}>`;

// Replacement 4: Contacts Detail Drawer Overlay & Splitter
const contactsDrawerOld = `          {/* Contacts active: detail of the household */}
          {activeService === 'contacts' && selectedHousehold && (
            <>
              {/* Divider drag Splitter line */}
              <div 
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
                className={\`w-1 cursor-col-resize hover:bg-primary/55 active:bg-primary transition-colors shrink-0 z-30 \${
                  isResizing ? "bg-primary" : "bg-border-custom"
                }\`}
              />
              <div 
                style={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : \`\${detailWidth}px\` }} 
                className="bg-card shrink-0 flex flex-col overflow-hidden transition-all duration-75 border-l border-border-custom w-full md:w-auto"
              >`;

const contactsDrawerNew = `          {/* Contacts active: detail of the household */}
          {activeService === 'contacts' && selectedHousehold && (
            <>
              {/* Divider drag Splitter line */}
              <div 
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
                className={designMode === 'yandex'
                  ? \`absolute top-0 bottom-0 cursor-col-resize hover:bg-primary/55 active:bg-primary transition-colors z-40 hidden md:block \${isResizing ? "bg-primary" : "bg-border-custom"}\`
                  : \`w-1 cursor-col-resize hover:bg-primary/55 active:bg-primary transition-colors shrink-0 z-30 \${isResizing ? "bg-primary" : "bg-border-custom"}\`
                }
                style={designMode === 'yandex' ? { right: \`\${detailWidth}px\`, width: '4px' } : undefined}
              />
              <div 
                style={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : \`\${detailWidth}px\` }} 
                className={designMode === 'yandex'
                  ? "absolute top-0 bottom-0 right-0 bg-card flex flex-col overflow-hidden transition-all duration-75 border-l border-border-custom z-30 shadow-2xl"
                  : "bg-card shrink-0 flex flex-col overflow-hidden transition-all duration-75 border-l border-border-custom w-full md:w-auto"
                }
              >`;

// Replacement 5: Mail Detail Drawer Overlay & Splitter
const mailDrawerOld = `          {/* Mail active: selected timeline event detail (Gmail detail card - Screen 3 style) */}
          {activeService === 'mail' && selectedGmailEvent && (
            <>
              {/* Divider drag Splitter line */}
              <div 
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
                className={\`w-1 cursor-col-resize hover:bg-primary/55 active:bg-primary transition-colors shrink-0 z-30 \${
                  isResizing ? "bg-primary" : "bg-border-custom"
                }\`}
              />
              <div 
                style={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : \`\${detailWidth}px\` }} 
                className="bg-card shrink-0 flex flex-col overflow-hidden transition-all duration-75 border-l border-border-custom w-full md:w-auto"
              >`;

const mailDrawerNew = `          {/* Mail active: selected timeline event detail (Gmail detail card - Screen 3 style) */}
          {activeService === 'mail' && selectedGmailEvent && (
            <>
              {/* Divider drag Splitter line */}
              <div 
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
                className={designMode === 'yandex'
                  ? \`absolute top-0 bottom-0 cursor-col-resize hover:bg-primary/55 active:bg-primary transition-colors z-40 hidden md:block \${isResizing ? "bg-primary" : "bg-border-custom"}\`
                  : \`w-1 cursor-col-resize hover:bg-primary/55 active:bg-primary transition-colors shrink-0 z-30 \${isResizing ? "bg-primary" : "bg-border-custom"}\`
                }
                style={designMode === 'yandex' ? { right: \`\${detailWidth}px\`, width: '4px' } : undefined}
              />
              <div 
                style={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : \`\${detailWidth}px\` }} 
                className={designMode === 'yandex'
                  ? "absolute top-0 bottom-0 right-0 bg-card flex flex-col overflow-hidden transition-all duration-75 border-l border-border-custom z-30 shadow-2xl"
                  : "bg-card shrink-0 flex flex-col overflow-hidden transition-all duration-75 border-l border-border-custom w-full md:w-auto"
                }
              >`;

// Replacement 6: Chat Detail Drawer Overlay & Splitter
const chatDrawerOld = `          {/* Chat active: resizable right panel showing shared Google Drive files (Screen 4 style) */}
          {activeService === 'chat' && selectedFamilyId && (
            <>
              {/* Divider drag Splitter line */}
              <div 
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
                className={\`w-1 cursor-col-resize hover:bg-primary/55 active:bg-primary transition-colors shrink-0 z-30 \${
                  isResizing ? "bg-primary" : "bg-border-custom"
                }\`}
              />

              <div 
                style={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : \`\${detailWidth}px\` }} 
                className="bg-card shrink-0 flex flex-col overflow-hidden transition-all duration-75 border-l border-border-custom w-full md:w-auto"
              >`;

const chatDrawerNew = `          {/* Chat active: resizable right panel showing shared Google Drive files (Screen 4 style) */}
          {activeService === 'chat' && selectedFamilyId && (
            <>
              {/* Divider drag Splitter line */}
              <div 
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
                className={designMode === 'yandex'
                  ? \`absolute top-0 bottom-0 cursor-col-resize hover:bg-primary/55 active:bg-primary transition-colors z-40 hidden md:block \${isResizing ? "bg-primary" : "bg-border-custom"}\`
                  : \`w-1 cursor-col-resize hover:bg-primary/55 active:bg-primary transition-colors shrink-0 z-30 \${isResizing ? "bg-primary" : "bg-border-custom"}\`
                }
                style={designMode === 'yandex' ? { right: \`\${detailWidth}px\`, width: '4px' } : undefined}
              />

              <div 
                style={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : \`\${detailWidth}px\` }} 
                className={designMode === 'yandex'
                  ? "absolute top-0 bottom-0 right-0 bg-card flex flex-col overflow-hidden transition-all duration-75 border-l border-border-custom z-30 shadow-2xl"
                  : "bg-card shrink-0 flex flex-col overflow-hidden transition-all duration-75 border-l border-border-custom w-full md:w-auto"
                }
              >`;

// Replacement 7: Viewport section wrappers
const sectionOld = `          {activeService === 'contacts' && (
            <section className="bg-background flex flex-col transition-all duration-200 overflow-hidden flex-1 min-w-[320px]">`;

const sectionNew = `          {activeService === 'contacts' && (
            <section className={\`bg-background flex flex-col transition-all duration-200 overflow-hidden min-w-[320px] \${designMode === 'yandex' ? 'w-full' : 'flex-1'}\`}>`;

const mailSectionOld = `          {activeService === 'mail' && (
            <section className="bg-background flex flex-col transition-all duration-200 overflow-hidden flex-1 min-w-[320px]">`;

const mailSectionNew = `          {activeService === 'mail' && (
            <section className={\`bg-background flex flex-col transition-all duration-200 overflow-hidden min-w-[320px] \${designMode === 'yandex' ? 'w-full' : 'flex-1'}\`}>`;

const chatSectionOld = `          {activeService === 'chat' && (
            <section className="flex-1 flex flex-col overflow-hidden bg-background">`;

const chatSectionNew = `          {activeService === 'chat' && (
            <section className={\`flex flex-col overflow-hidden bg-background \${designMode === 'yandex' ? 'w-full' : 'flex-1'}\`}>`;

// Replacement 8: Hide duplicate address under name in Yandex Mode
const nameColAddressOld = `{isJmenovec && h.address && (`;
const nameColAddressNew = `{designMode !== 'yandex' && isJmenovec && h.address && (`;

// Replacement 9: Main workspace content container
const workspaceOld = `      {/* ========================================================= */}
      {/* 3. DYNAMIC CONTENT WORKSPACE                               */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">`;

const workspaceNew = `      {/* ========================================================= */}
      {/* 3. DYNAMIC CONTENT WORKSPACE                               */}
      {/* ========================================================= */}
      <div className={designMode === 'yandex' ? "Ya-Layout__content" : "flex-1 flex flex-col overflow-hidden bg-background"}>`;

// Replacement 10: Listing Row DOM refactoring
// Let's find the table body tr structure and replace it.
const rowOld = `                        <tr 
                          key={h.id}
                          onClick={() => {
                            setSelectedFamilyId(h.householdId);
                            setActiveTab("overview");
                          }}
                          className={\`group border-b border-border-custom cursor-pointer transition-colors \${
                            selectedFamilyId === h.householdId 
                              ? "bg-[#e8f0fe] dark:bg-[#0842a0]/20" 
                              : isChecked 
                                ? "bg-[#e8f0fe]/50 dark:bg-[#0842a0]/10" 
                                : hasAlert 
                                  ? "bg-rose-50/50 dark:bg-rose-950/10 hover:bg-rose-100/40 dark:hover:bg-rose-900/20" 
                                  : "hover:bg-[#f1f3f4]/70 dark:hover:bg-[#2d2f31]/30"
                          }\`}
                        >
                          {/* Avatar checkbox */}
                          <td className={\`py-3 px-4 w-12 align-middle text-center select-none \${hasAlert ? "border-l-4 border-l-rose-500" : ""}\`} onClick={(e) => e.stopPropagation()}>
                            <div className="relative w-8 h-8 flex items-center justify-center mx-auto">
                              <div className={\`absolute w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs transition-all duration-150 \${
                                isChecked ? "scale-0 opacity-0" : "scale-100 opacity-100 group-hover:scale-0 group-hover:opacity-0"
                              } \${
                                h.status === "active" ? "bg-emerald-100 text-emerald-850 dark:bg-emerald-950 dark:text-emerald-300" : "bg-blue-100 text-blue-855 dark:bg-blue-950 dark:text-blue-300"
                              }\`}>
                                {h.name?.charAt(0) || "P"}
                              </div>
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCheckedHousehold(h.id)}
                                className={\`absolute w-4 h-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary transition-all duration-150 \${
                                  isChecked ? "scale-100 opacity-100" : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                                }\`}
                              />
                            </div>
                          </td>

                          {/* Star toggle */}
                          <td className="py-3 px-1 w-8 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleStarredHousehold(h.id)} className="p-1 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-full transition-colors">
                              <Star className={\`w-4.5 h-4.5 transition-colors \${
                                isStarred ? "text-amber-500 fill-amber-500" : "text-gray-300 dark:text-gray-650 hover:text-gray-500"
                              }\`} />
                            </button>
                          </td>`;

const rowNew = `                        <tr 
                          key={h.id}
                          onClick={() => {
                            setSelectedFamilyId(h.householdId);
                            setActiveTab("overview");
                          }}
                          className={designMode === 'yandex'
                            ? \`Listing-Row \${selectedFamilyId === h.householdId ? 'Listing-Row_active' : ''}\`
                            : \`group border-b border-border-custom cursor-pointer transition-colors \${
                                selectedFamilyId === h.householdId 
                                  ? "bg-[#e8f0fe] dark:bg-[#0842a0]/20" 
                                  : isChecked 
                                    ? "bg-[#e8f0fe]/50 dark:bg-[#0842a0]/10" 
                                    : hasAlert 
                                      ? "bg-rose-50/50 dark:bg-rose-950/10 hover:bg-rose-100/40 dark:hover:bg-rose-900/20" 
                                      : "hover:bg-[#f1f3f4]/70 dark:hover:bg-[#2d2f31]/30"
                              }\`
                          }
                        >
                          {/* Avatar checkbox */}
                          <td 
                            className={designMode === 'yandex'
                              ? "Listing-Row__cell Listing-Row__cell_type_checkbox"
                              : \`py-3 px-4 w-12 align-middle text-center select-none \${hasAlert ? "border-l-4 border-l-rose-500" : ""}\`
                            }
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="relative w-8 h-8 flex items-center justify-center mx-auto">
                              <div className={\`absolute w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs transition-all duration-150 \${
                                isChecked ? "scale-0 opacity-0" : "scale-100 opacity-100 group-hover:scale-0 group-hover:opacity-0"
                              } \${
                                h.status === "active" ? "bg-emerald-100 text-emerald-850 dark:bg-emerald-950 dark:text-emerald-300" : "bg-blue-100 text-blue-855 dark:bg-blue-950 dark:text-blue-300"
                              }\`}>
                                {h.name?.charAt(0) || "P"}
                              </div>
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCheckedHousehold(h.id)}
                                className={\`absolute w-4 h-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary transition-all duration-150 \${
                                  isChecked ? "scale-100 opacity-100" : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                                }\`}
                              />
                            </div>
                          </td>

                          {/* Star toggle */}
                          <td 
                            className={designMode === 'yandex'
                              ? "Listing-Row__cell Listing-Row__cell_type_star"
                              : "py-3 px-1 w-8 align-middle text-center"
                            }
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button onClick={() => toggleStarredHousehold(h.id)} className="p-1 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-full transition-colors">
                              <Star className={\`w-4.5 h-4.5 transition-colors \${
                                isStarred ? "text-amber-500 fill-amber-500" : "text-gray-300 dark:text-gray-650 hover:text-gray-500"
                              }\`} />
                            </button>
                          </td>`;

// Replacement 11: Listing cell dynamic column name
const cellNameOld = `                              return (
                                <td key={colId} className="py-3 px-3 align-middle text-sm text-foreground">`;

const cellNameNew = `                              return (
                                <td 
                                  key={colId} 
                                  className={designMode === 'yandex'
                                    ? "Listing-Row__cell Listing-Row__cell_type_title"
                                    : "py-3 px-3 align-middle text-sm text-foreground"
                                  }
                                >`;

// Replacement 12: Listing cells other columns
const cellAddressOld = `                            if (colId === "address") {
                              return (
                                <td key={colId} className="py-3 px-4 align-middle text-sm text-foreground/80 font-normal">`;

const cellAddressNew = `                            if (colId === "address") {
                              return (
                                <td 
                                  key={colId} 
                                  className={designMode === 'yandex'
                                    ? "Listing-Row__cell"
                                    : "py-3 px-4 align-middle text-sm text-foreground/80 font-normal"
                                  }
                                >`;

const cellPhoneOld = `                            if (colId === "phone") {
                              return (
                                <td key={colId} className="py-3 px-4 align-middle text-sm text-foreground/80 font-normal">`;

const cellPhoneNew = `                            if (colId === "phone") {
                              return (
                                <td 
                                  key={colId} 
                                  className={designMode === 'yandex'
                                    ? "Listing-Row__cell"
                                    : "py-3 px-4 align-middle text-sm text-foreground/80 font-normal"
                                  }
                                >`;

const cellEmailOld = `                            if (colId === "email") {
                              return (
                                <td key={colId} className="py-3 px-4 align-middle text-sm text-foreground/80 font-normal">`;

const cellEmailNew = `                            if (colId === "email") {
                              return (
                                <td 
                                  key={colId} 
                                  className={designMode === 'yandex'
                                    ? "Listing-Row__cell"
                                    : "py-3 px-4 align-middle text-sm text-foreground/80 font-normal"
                                  }
                                >`;

const cellCareOld = `                            if (colId === "care_type") {
                              return (
                                <td key={colId} className="py-3 px-4 align-middle text-sm">`;

const cellCareNew = `                            if (colId === "care_type") {
                              return (
                                <td 
                                  key={colId} 
                                  className={designMode === 'yandex'
                                    ? "Listing-Row__cell"
                                    : "py-3 px-4 align-middle text-sm"
                                  }
                                >`;

const cellChildrenOld = `                            if (colId === "children_count") {
                              return (
                                <td key={colId} className="py-3 px-4 align-middle text-sm text-foreground/80 font-normal">`;

const cellChildrenNew = `                            if (colId === "children_count") {
                              return (
                                <td 
                                  key={colId} 
                                  className={designMode === 'yandex'
                                    ? "Listing-Row__cell"
                                    : "py-3 px-4 align-middle text-sm text-foreground/80 font-normal"
                                  }
                                >`;

const cellStatusOld = `                            if (colId === "status") {
                              const statusObj = getStatusObj(h.status);
                              return (
                                <td key={colId} className="py-3 px-4 text-right pr-6 align-middle text-xs select-none">`;

const cellStatusNew = `                            if (colId === "status") {
                              const statusObj = getStatusObj(h.status);
                              return (
                                <td 
                                  key={colId} 
                                  className={designMode === 'yandex'
                                    ? "Listing-Row__cell Listing-Row__cell_type_status"
                                    : "py-3 px-4 text-right pr-6 align-middle text-xs select-none"
                                  }
                                >`;

const cellActionsOld = `                          {/* Hover Actions column at the end */}
                          <td className="py-3 px-4 w-16 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center gap-1">
                              <button onClick={() => alert(\`Upravit: \${h.name}\`)} className="p-1 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-full text-muted hover:text-foreground transition-colors cursor-pointer" title="Upravit">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => alert(\`Odebrat: \${h.name}\`)} className="p-1 hover:bg-red-500/10 dark:hover:bg-red-950/20 rounded-full text-muted hover:text-red-500 transition-colors cursor-pointer" title="Smazat">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>`;

const cellActionsNew = `                          {/* Hover Actions column at the end */}
                          <td 
                            className={designMode === 'yandex'
                              ? "Listing-Row__actions"
                              : "py-3 px-4 w-16 text-center align-middle"
                            }
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className={designMode === 'yandex' 
                              ? "flex items-center gap-1"
                              : "opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center gap-1"
                            }>
                              <button 
                                onClick={() => alert(\`Upravit: \${h.name}\`)} 
                                className={designMode === 'yandex'
                                  ? "Action-Button"
                                  : "p-1 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded-full text-muted hover:text-foreground transition-colors cursor-pointer"
                                }
                                title="Upravit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => alert(\`Odebrat: \${h.name}\`)} 
                                className={designMode === 'yandex'
                                  ? "Action-Button hover:text-red-500"
                                  : "p-1 hover:bg-red-500/10 dark:hover:bg-red-950/20 rounded-full text-muted hover:text-red-500 transition-colors cursor-pointer"
                                }
                                title="Smazat"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>`;


// Helper function to replace exactly once
function replaceExact(oldStr, newStr, name) {
  const oldLines = clean(oldStr).split('\n').map(l => l.replace(/\\`/g, '`').replace(/\\\$/g, '$').trim()).filter(Boolean);
  const newLines = clean(newStr).split('\n');
  const codeLines = code.split('\n');
  
  let startIdx = -1;
  let startIdx_end = -1;
  
  for (let i = 0; i <= codeLines.length - oldLines.length; i++) {
    if (codeLines[i].trim() === '') continue;
    let match = true;
    let oldOffset = 0;
    let codeOffset = 0;
    
    while (oldOffset < oldLines.length && (i + codeOffset) < codeLines.length) {
      const codeLine = codeLines[i + codeOffset].trim();
      if (codeLine === '') {
        codeOffset++;
        continue;
      }
      if (codeLine !== oldLines[oldOffset]) {
        match = false;
        break;
      }
      oldOffset++;
      codeOffset++;
    }
    
    if (match && oldOffset === oldLines.length) {
      if (startIdx !== -1) {
        console.error('ERROR: Block for ' + name + ' matches multiple times');
        process.exit(1);
      }
      startIdx = i;
      startIdx_end = i + codeOffset;
    }
  }
  
  if (startIdx === -1) {
    console.error('ERROR: Could not find block for ' + name);
    process.exit(1);
  }
  
  const before = codeLines.slice(0, startIdx).join('\n');
  const after = codeLines.slice(startIdx_end).join('\n');
  code = before + '\n' + newStr + '\n' + after;
  console.log('Successfully replaced block: ' + name);
}

replaceExact(switchRailOld, switchRailNew, "Switch Rail");
replaceExact(sidebarOld, sidebarNew, "Sidebar");
replaceExact(viewportContainerOld, viewportContainerNew, "Viewport Container");
replaceExact(contactsDrawerOld, contactsDrawerNew, "Contacts Drawer");
replaceExact(mailDrawerOld, mailDrawerNew, "Mail Drawer");
replaceExact(chatDrawerOld, chatDrawerNew, "Chat Drawer");
replaceExact(sectionOld, sectionNew, "Contacts Section");
replaceExact(mailSectionOld, mailSectionNew, "Mail Section");
replaceExact(chatSectionOld, chatSectionNew, "Chat Section");
replaceExact(nameColAddressOld, nameColAddressNew, "Address under Name Link");
replaceExact(workspaceOld, workspaceNew, "Workspace Content Wrapper");
replaceExact(rowOld, rowNew, "Listing Row");
replaceExact(cellNameOld, cellNameNew, "Cell Name Column");
replaceExact(cellAddressOld, cellAddressNew, "Cell Address Column");
replaceExact(cellPhoneOld, cellPhoneNew, "Cell Phone Column");
replaceExact(cellEmailOld, cellEmailNew, "Cell Email Column");
replaceExact(cellCareOld, cellCareNew, "Cell Care Type Column");
replaceExact(cellChildrenOld, cellChildrenNew, "Cell Children Count Column");
replaceExact(cellStatusOld, cellStatusNew, "Cell Status Column");
replaceExact(cellActionsOld, cellActionsNew, "Cell Actions Column");

fs.writeFileSync(pagePath, code, 'utf8');
console.log("ALL REPLACEMENTS SUCCESSFULLY COMPLETED!");
