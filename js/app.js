/**
 * Exam Maker - macOS Modern Controller & Screen Router (Light & Dark Mode)
 * Screen 1 (Year) -> Screen 2 (Program) -> Screen 3 (Semester) -> Screen 4 (Subject) -> Screen 5 (Terms) -> Screen 6 (Handouts) -> Screen 7 (2-Tab Studio)
 */

const App = {
  currentView: 'years',

  // Drilldown State
  selectedYear: '4TH',
  selectedProgram: 'BSIT',
  selectedSemester: '2ND-SEM',
  selectedSubject: '',
  selectedTerm: 'PRELIM',
  activeHandoutId: null,
  activeStudioTab: 'doc', // 'doc' | 'exam'

  // Dynamic Catalogs
  yearLevels: [],
  programsList: [],

  init() {
    this.loadCatalogs();
    this.setupEventListeners();
    HandoutConverter.init();

    // Ensure at least one initial exam exists
    const allExams = Storage.getAll();
    if (allExams.length === 0) {
      this.createStarterSubject();
    } else {
      const first = allExams[0];
      this.selectedYear = first.year || '4TH';
      this.selectedProgram = first.program || 'BSIT';
      this.selectedSemester = first.semester || '2ND-SEM';
      this.selectedSubject = first.subject || 'Computer Graphics Programming';
      this.selectedTerm = first.term || 'PRELIM';
      this.activeHandoutId = first.id;
    }

    this.renderYearsView();
    this.navigateTo('years');
  },

  loadCatalogs() {
    // 1. Year Levels
    try {
      const savedYears = JSON.parse(localStorage.getItem('exam_maker_year_levels'));
      if (Array.isArray(savedYears) && savedYears.length > 0) {
        this.yearLevels = savedYears;
      } else {
        this.yearLevels = [
          { code: '4TH', name: '4th Year', subtitle: 'College' },
          { code: '3RD', name: '3rd Year', subtitle: 'College' },
          { code: '2ND', name: '2nd Year', subtitle: 'College' },
          { code: '1ST', name: '1st Year', subtitle: 'College' },
          { code: 'G12', name: 'Grade 12', subtitle: 'Senior High' },
          { code: 'G11', name: 'Grade 11', subtitle: 'Senior High' }
        ];
        this.saveYearLevels();
      }
    } catch (e) {
      this.yearLevels = [
        { code: '4TH', name: '4th Year', subtitle: 'College' }
      ];
    }

    // 2. Programs / Strands
    try {
      const savedProgs = JSON.parse(localStorage.getItem('exam_maker_programs'));
      if (Array.isArray(savedProgs) && savedProgs.length > 0) {
        this.programsList = savedProgs;
      } else {
        this.programsList = [
          { code: 'BSIT', name: 'Bachelor of Science in Information Technology' },
          { code: 'BSCS', name: 'Bachelor of Science in Computer Science' },
          { code: 'BSCpE', name: 'Bachelor of Science in Computer Engineering' },
          { code: 'STEM', name: 'Science, Tech, Engineering & Math' },
          { code: 'ABM', name: 'Accountancy, Business & Management' },
          { code: 'HUMSS', name: 'Humanities & Social Sciences' }
        ];
        this.savePrograms();
      }
    } catch (e) {
      this.programsList = [
        { code: 'BSIT', name: 'Information Technology' }
      ];
    }
  },

  saveYearLevels() {
    localStorage.setItem('exam_maker_year_levels', JSON.stringify(this.yearLevels));
  },

  savePrograms() {
    localStorage.setItem('exam_maker_programs', JSON.stringify(this.programsList));
  },

  createStarterSubject() {
    const starter = {
      id: generateId(),
      subject: "Computer Graphics Programming",
      handoutName: "01 Handout 1",
      program: "BSIT",
      year: "4TH",
      semester: "2ND-SEM",
      term: "PRELIM",
      documentMarkdown: "",
      questions: []
    };
    Storage.save(starter);
    this.selectedYear = '4TH';
    this.selectedProgram = 'BSIT';
    this.selectedSemester = '2ND-SEM';
    this.selectedSubject = starter.subject;
    this.selectedTerm = 'PRELIM';
    this.activeHandoutId = starter.id;
  },

  setupEventListeners() {
    // Repository Modal
    const btnFiles = document.getElementById('header-btn-repository');
    const libraryModal = document.getElementById('library-modal');
    const closeLibrary = document.getElementById('close-library-modal');

    if (btnFiles && libraryModal) {
      btnFiles.onclick = () => {
        libraryModal.classList.remove('hidden');
        libraryModal.classList.add('flex');
        if (typeof Library !== 'undefined') Library.render();
      };
    }
    if (closeLibrary && libraryModal) {
      closeLibrary.onclick = () => {
        libraryModal.classList.add('hidden');
        libraryModal.classList.remove('flex');
      };
    }

    // Backup & Restore
    const btnExport = document.getElementById('btn-export-backup');
    const btnImport = document.getElementById('btn-import-backup');
    const backupFile = document.getElementById('backup-file-input');

    if (btnExport) {
      btnExport.onclick = () => {
        if (typeof BackupManager !== 'undefined') {
          BackupManager.exportAll();
        }
      };
    }

    if (btnImport && backupFile) {
      btnImport.onclick = () => backupFile.click();
      backupFile.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (typeof BackupManager !== 'undefined') {
          BackupManager.importFile(file);
        }
        e.target.value = '';
      };
    }
  },

  // View Navigation Router
  navigateTo(viewName) {
    this.currentView = viewName;

    // Hide all view sections
    document.querySelectorAll('.drilldown-view').forEach(el => el.classList.add('hidden'));

    const viewIdMap = {
      'years': 'view-year-level',
      'programs': 'view-program-strand',
      'semesters': 'view-semester',
      'subjects': 'view-subjects',
      'terms': 'view-terms',
      'handouts': 'view-handouts',
      'studio': 'view-studio'
    };

    const targetEl = document.getElementById(viewIdMap[viewName]);
    if (targetEl) targetEl.classList.remove('hidden');

    // Back Button visibility
    const backBtn = document.getElementById('header-back-btn');
    if (backBtn) {
      if (viewName === 'years') {
        backBtn.classList.add('hidden');
      } else {
        backBtn.classList.remove('hidden');
      }
    }

    this.renderBreadcrumbs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  goBack() {
    switch (this.currentView) {
      case 'studio':
        this.navigateTo('handouts');
        this.renderHandoutsView();
        break;
      case 'handouts':
        this.navigateTo('terms');
        this.renderTermsView();
        break;
      case 'terms':
        this.navigateTo('subjects');
        this.renderSubjectsView();
        break;
      case 'subjects':
        this.navigateTo('semesters');
        break;
      case 'semesters':
        this.navigateTo('programs');
        this.renderProgramsView();
        break;
      case 'programs':
        this.navigateTo('years');
        this.renderYearsView();
        break;
      default:
        this.navigateTo('years');
        this.renderYearsView();
    }
  },

  renderBreadcrumbs() {
    const bar = document.getElementById('breadcrumbs-bar');
    if (!bar) return;

    let items = [];

    // Home / Year
    items.push(`<button onclick="App.navigateTo('years'); App.renderYearsView();" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors ${this.currentView === 'years' ? 'text-sky-600 dark:text-sky-400 font-black' : ''}">Years</button>`);

    if (this.currentView !== 'years') {
      const yearMatch = this.yearLevels.find(y => y.code === this.selectedYear);
      const yearLabel = yearMatch ? yearMatch.name : `${this.selectedYear} Year`;
      items.push(`<span class="text-slate-300 dark:text-zinc-600">›</span><button onclick="App.navigateTo('programs'); App.renderProgramsView();" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors ${this.currentView === 'programs' ? 'text-sky-600 dark:text-sky-400 font-black' : ''}">${yearLabel}</button>`);
    }

    if (['semesters', 'subjects', 'terms', 'handouts', 'studio'].includes(this.currentView)) {
      items.push(`<span class="text-slate-300 dark:text-zinc-600">›</span><button onclick="App.navigateTo('semesters')" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors ${this.currentView === 'semesters' ? 'text-sky-600 dark:text-sky-400 font-black' : ''}">${this.selectedProgram}</button>`);
    }

    if (['subjects', 'terms', 'handouts', 'studio'].includes(this.currentView)) {
      const semLabel = this.selectedSemester === '1ST-SEM' ? '1st Sem' : '2nd Sem';
      items.push(`<span class="text-slate-300 dark:text-zinc-600">›</span><button onclick="App.navigateTo('subjects'); App.renderSubjectsView();" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors ${this.currentView === 'subjects' ? 'text-sky-600 dark:text-sky-400 font-black' : ''}">${semLabel}</button>`);
    }

    if (['terms', 'handouts', 'studio'].includes(this.currentView) && this.selectedSubject) {
      items.push(`<span class="text-slate-300 dark:text-zinc-600">›</span><button onclick="App.navigateTo('terms'); App.renderTermsView();" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors max-w-[130px] truncate ${this.currentView === 'terms' ? 'text-sky-600 dark:text-sky-400 font-black' : ''}">${this.selectedSubject}</button>`);
    }

    if (['handouts', 'studio'].includes(this.currentView)) {
      items.push(`<span class="text-slate-300 dark:text-zinc-600">›</span><button onclick="App.navigateTo('handouts'); App.renderHandoutsView();" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 text-[10px] font-black uppercase ${this.currentView === 'handouts' ? 'ring-1 ring-sky-400' : ''}">${this.selectedTerm}</button>`);
    }

    if (this.currentView === 'studio' && this.activeHandoutId) {
      const exam = Storage.getById(this.activeHandoutId);
      const handoutLabel = exam ? exam.handoutName : 'Handout';
      items.push(`<span class="text-slate-300 dark:text-zinc-600">›</span><span class="text-emerald-600 dark:text-emerald-400 font-black max-w-[130px] truncate">${handoutLabel}</span>`);
    }

    bar.innerHTML = items.join(' ');
  },

  // ==========================================
  // SCREEN 1: DYNAMIC YEAR LEVEL CARDS
  // ==========================================
  renderYearsView() {
    const gridEl = document.getElementById('years-cards-grid');
    if (!gridEl) return;

    gridEl.innerHTML = '';

    this.yearLevels.forEach(year => {
      const card = document.createElement('div');
      card.className = "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-sky-500 dark:hover:border-sky-500 p-5 sm:p-6 rounded-2xl macos-card-shadow cursor-pointer transition-all space-y-4 group relative hover:scale-[1.02]";
      
      card.onclick = () => this.selectYear(year.code);

      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-sm sm:text-base group-hover:scale-110 transition-transform">
            ${year.code}
          </div>
          <button class="delete-year-btn p-1.5 text-slate-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100" title="Delete Year Level">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
        <div>
          <h3 class="font-black text-slate-800 dark:text-white text-sm sm:text-base group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">${year.name}</h3>
          <p class="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase mt-0.5">${year.subtitle || 'Academic Year'}</p>
        </div>
      `;

      card.querySelector('.delete-year-btn').onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Remove "${year.name}" from your year list?`)) {
          this.yearLevels = this.yearLevels.filter(y => y.code !== year.code);
          this.saveYearLevels();
          this.renderYearsView();
        }
      };

      gridEl.appendChild(card);
    });

    // Add Year Level Card
    const addCard = document.createElement('div');
    addCard.className = "bg-slate-50/60 dark:bg-zinc-800/30 border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-sky-500 dark:hover:border-sky-500 p-5 sm:p-6 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-2 group min-h-[140px] hover:bg-sky-50/20 dark:hover:bg-sky-950/20";
    addCard.onclick = () => this.openAddYearModal();
    addCard.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
      </div>
      <div>
        <h4 class="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase">+ Add Year Level</h4>
        <p class="text-[10px] text-slate-400 dark:text-zinc-500">Custom grade or college year</p>
      </div>
    `;
    gridEl.appendChild(addCard);
  },

  selectYear(yearCode) {
    this.selectedYear = yearCode;
    const defaultProg = this.programsList.length > 0 ? this.programsList[0].code : 'BSIT';
    this.selectedProgram = defaultProg;
    this.renderProgramsView();
    this.navigateTo('programs');
  },

  openAddYearModal() {
    const modal = document.getElementById('year-modal');
    document.getElementById('input-year-name').value = '';
    document.getElementById('input-year-subtitle').value = '';
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeYearModal() {
    const modal = document.getElementById('year-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  handleSaveYearModal() {
    const name = document.getElementById('input-year-name')?.value.trim();
    const sub = document.getElementById('input-year-subtitle')?.value.trim() || 'Academic Year';

    if (!name) {
      showMessage("Please enter a year level name!");
      return;
    }

    const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || generateId().slice(0, 4);

    if (this.yearLevels.some(y => y.code === code)) {
      showMessage("This year level already exists!");
      return;
    }

    this.yearLevels.push({ code, name, subtitle: sub });
    this.saveYearLevels();
    this.closeYearModal();
    this.renderYearsView();
    showMessage(`Added year level "${name}"!`);
  },

  // ==========================================
  // SCREEN 2: DYNAMIC PROGRAM / STRAND CARDS
  // ==========================================
  renderProgramsView() {
    const titleEl = document.getElementById('program-view-title');
    const gridEl = document.getElementById('programs-cards-grid');
    if (!gridEl) return;

    const yearMatch = this.yearLevels.find(y => y.code === this.selectedYear);
    const yearLabel = yearMatch ? yearMatch.name : `${this.selectedYear} Year`;
    if (titleEl) titleEl.innerText = `Select Program / Strand for ${yearLabel}`;

    gridEl.innerHTML = '';

    this.programsList.forEach(prog => {
      const card = document.createElement('div');
      card.className = "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-sky-500 dark:hover:border-sky-500 p-5 sm:p-6 rounded-2xl macos-card-shadow cursor-pointer transition-all space-y-4 group relative hover:scale-[1.02]";
      
      card.onclick = () => this.selectProgram(prog.code);

      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-xs sm:text-sm group-hover:scale-110 transition-transform">
            ${prog.code.slice(0, 3)}
          </div>
          <button class="delete-prog-btn p-1.5 text-slate-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100" title="Delete Program">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
        <div>
          <h3 class="font-black text-slate-800 dark:text-white text-sm sm:text-base group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">${prog.code}</h3>
          <p class="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 line-clamp-2">${prog.name || 'Custom Program'}</p>
        </div>
      `;

      card.querySelector('.delete-prog-btn').onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Remove "${prog.code}" from your program list?`)) {
          this.programsList = this.programsList.filter(p => p.code !== prog.code);
          this.savePrograms();
          this.renderProgramsView();
        }
      };

      gridEl.appendChild(card);
    });

    // Add Program Card
    const addCard = document.createElement('div');
    addCard.className = "bg-slate-50/60 dark:bg-zinc-800/30 border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-sky-500 dark:hover:border-sky-500 p-5 sm:p-6 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-2 group min-h-[140px] hover:bg-sky-50/20 dark:hover:bg-sky-950/20";
    addCard.onclick = () => this.openAddProgramModal();
    addCard.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
      </div>
      <div>
        <h4 class="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase">+ Add Program / Strand</h4>
        <p class="text-[10px] text-slate-400 dark:text-zinc-500">Custom degree or strand</p>
      </div>
    `;
    gridEl.appendChild(addCard);
  },

  selectProgram(progCode) {
    this.selectedProgram = progCode;
    const titleEl = document.getElementById('semester-view-title');
    if (titleEl) titleEl.innerText = `Select Semester for ${progCode}`;
    this.navigateTo('semesters');
  },

  openAddProgramModal() {
    const modal = document.getElementById('program-modal');
    document.getElementById('input-program-code').value = '';
    document.getElementById('input-program-desc').value = '';
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeProgramModal() {
    const modal = document.getElementById('program-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  handleSaveProgramModal() {
    const code = document.getElementById('input-program-code')?.value.trim().toUpperCase();
    const desc = document.getElementById('input-program-desc')?.value.trim() || 'Custom Added Program';

    if (!code) {
      showMessage("Please enter a program code!");
      return;
    }

    if (this.programsList.some(p => p.code === code)) {
      showMessage("This program code already exists!");
      return;
    }

    this.programsList.push({ code, name: desc });
    this.savePrograms();
    this.closeProgramModal();
    this.renderProgramsView();
    showMessage(`Added program "${code}"!`);
  },

  // ==========================================
  // SCREEN 3: SELECT SEMESTER
  // ==========================================
  selectSemester(semCode) {
    this.selectedSemester = semCode;
    this.renderSubjectsView();
    this.navigateTo('subjects');
  },

  // ==========================================
  // SCREEN 4: SELECT / ADD SUBJECT
  // ==========================================
  renderSubjectsView() {
    const gridEl = document.getElementById('subjects-cards-grid');
    const titleEl = document.getElementById('subjects-view-title');
    const subTitleEl = document.getElementById('subjects-view-subtitle');
    if (!gridEl) return;

    const semLabel = this.selectedSemester === '1ST-SEM' ? '1st Semester' : '2nd Semester';
    if (titleEl) titleEl.innerText = `${this.selectedProgram} Courses (${semLabel})`;
    if (subTitleEl) subTitleEl.innerText = `Year: ${this.selectedYear} • Program: ${this.selectedProgram} • ${semLabel}`;

    const allExams = Storage.getAll();
    const filtered = allExams.filter(e => 
      e.year === this.selectedYear &&
      e.program === this.selectedProgram &&
      e.semester === this.selectedSemester
    );

    // Group by Subject Name
    const subjectMap = new Map();
    filtered.forEach(e => {
      const name = e.subject.trim();
      if (!subjectMap.has(name)) subjectMap.set(name, []);
      subjectMap.get(name).push(e);
    });

    gridEl.innerHTML = '';

    // Render Subject Cards
    subjectMap.forEach((exams, subName) => {
      const card = document.createElement('div');
      card.className = "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-sky-500 dark:hover:border-sky-500 p-5 sm:p-6 rounded-2xl macos-card-shadow cursor-pointer transition-all space-y-4 group relative hover:scale-[1.02]";
      
      const totalQs = exams.reduce((sum, x) => sum + (Array.isArray(x.questions) ? x.questions.length : 0), 0);

      card.onclick = () => this.selectSubject(subName);

      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-sm sm:text-base group-hover:scale-110 transition-transform">
            📚
          </div>
          <button class="delete-sub-btn p-2 text-slate-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all" title="Delete Subject">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
        <div>
          <h3 class="font-black text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-1">${subName}</h3>
          <div class="flex items-center gap-2 mt-2">
            <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[10px] font-black">${exams.length} Handout${exams.length === 1 ? '' : 's'}</span>
            <span class="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-black border border-emerald-100 dark:border-emerald-900/50">${totalQs} Questions</span>
          </div>
        </div>
      `;

      card.querySelector('.delete-sub-btn').onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete subject "${subName}" and all its handouts?`)) {
          Storage.deleteSubject(subName, this.selectedProgram, this.selectedYear, this.selectedSemester);
          this.renderSubjectsView();
        }
      };

      gridEl.appendChild(card);
    });

    // Add Subject Card
    const addCard = document.createElement('div');
    addCard.className = "bg-slate-50/60 dark:bg-zinc-800/30 border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-sky-500 dark:hover:border-sky-500 p-5 sm:p-6 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-2 group min-h-[140px] hover:bg-sky-50/20 dark:hover:bg-sky-950/20";
    addCard.onclick = () => this.openAddSubjectModal();
    addCard.innerHTML = `
      <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center transition-colors">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
      </div>
      <div>
        <h4 class="text-xs font-black text-slate-800 dark:text-zinc-300 uppercase">+ Add New Subject</h4>
        <p class="text-[10px] text-slate-400 dark:text-zinc-500">Create course under ${semLabel}</p>
      </div>
    `;
    gridEl.appendChild(addCard);
  },

  selectSubject(subName) {
    this.selectedSubject = subName;
    this.renderTermsView();
    this.navigateTo('terms');
  },

  openAddSubjectModal() {
    const modal = document.getElementById('subject-modal');
    document.getElementById('input-subject-name').value = '';
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeSubjectModal() {
    const modal = document.getElementById('subject-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  handleSaveNewSubjectModal() {
    const subName = document.getElementById('input-subject-name')?.value.trim();

    if (!subName) {
      showMessage("Please enter a subject name!");
      return;
    }

    const newExam = {
      id: generateId(),
      subject: subName,
      handoutName: '01 Handout 1',
      program: this.selectedProgram,
      year: this.selectedYear,
      semester: this.selectedSemester,
      term: 'PRELIM',
      documentMarkdown: '',
      questions: []
    };

    Storage.save(newExam);
    this.selectedSubject = subName;
    this.activeHandoutId = newExam.id;

    this.closeSubjectModal();
    this.selectSubject(subName);
    showMessage(`Created subject "${subName}"! Select an exam term below.`);
  },

  // ==========================================
  // SCREEN 5: ACADEMIC TERMS CARDS (4 TERMS)
  // ==========================================
  renderTermsView() {
    const titleEl = document.getElementById('terms-view-title');
    const subTitleEl = document.getElementById('terms-view-subtitle');
    if (titleEl) titleEl.innerText = `${this.selectedSubject} - Academic Terms`;
    if (subTitleEl) subTitleEl.innerText = `Program: ${this.selectedProgram} • ${this.selectedSemester.replace('-', ' ')}`;

    const allExams = Storage.getAll();
    const subjectExams = allExams.filter(e => 
      e.year === this.selectedYear &&
      e.program === this.selectedProgram &&
      e.semester === this.selectedSemester &&
      e.subject === this.selectedSubject
    );

    ['PRELIM', 'MIDTERM', 'PREFINAL', 'FINAL'].forEach(term => {
      const count = subjectExams.filter(e => e.term === term).length;
      const countEl = document.getElementById(`term-count-${term.toLowerCase()}`);
      if (countEl) countEl.innerText = `${count} Handout${count === 1 ? '' : 's'}`;
    });
  },

  selectTerm(termCode) {
    this.selectedTerm = termCode;
    this.renderHandoutsView();
    this.navigateTo('handouts');
  },

  startMasterRumbleAllTerms(mode = 'rumble') {
    if (!this.selectedSubject) return;
    const combined = Storage.getCombinedSubjectExam(
      this.selectedSubject,
      this.selectedProgram,
      this.selectedYear,
      this.selectedSemester
    );

    if (!combined || combined.questions.length === 0) {
      showMessage(`No questions found across all terms for "${this.selectedSubject}".`);
      return;
    }

    QuizEngine.start(combined, mode);
  },

  // ==========================================
  // SCREEN 6: HANDOUTS CARDS
  // ==========================================
  renderHandoutsView() {
    const gridEl = document.getElementById('handouts-cards-grid');
    const termBadge = document.getElementById('handouts-term-badge');
    const subBadge = document.getElementById('handouts-subject-badge');
    const titleEl = document.getElementById('handouts-view-title');

    if (termBadge) termBadge.innerText = this.selectedTerm;
    if (subBadge) subBadge.innerText = this.selectedSubject;
    if (titleEl) titleEl.innerText = `${this.selectedSubject} - Handouts (${this.selectedTerm})`;

    const allExams = Storage.getAll();
    const termHandouts = allExams.filter(e => 
      e.year === this.selectedYear &&
      e.program === this.selectedProgram &&
      e.semester === this.selectedSemester &&
      e.subject === this.selectedSubject &&
      e.term === this.selectedTerm
    );

    gridEl.innerHTML = '';

    termHandouts.forEach((handout, idx) => {
      const card = document.createElement('div');
      card.className = "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 p-5 sm:p-6 rounded-2xl macos-card-shadow cursor-pointer transition-all space-y-4 group hover:scale-[1.02]";
      
      const qCount = Array.isArray(handout.questions) ? handout.questions.length : 0;
      const hasDoc = !!(handout.documentMarkdown && handout.documentMarkdown.trim());

      card.onclick = () => this.selectHandout(handout.id);

      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-sm sm:text-base group-hover:scale-110 transition-transform">
            📑
          </div>
          <button class="delete-handout-btn p-2 text-slate-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all" title="Delete Handout">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
        <div>
          <h3 class="font-black text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">${handout.handoutName || `0${idx + 1} Handout ${idx + 1}`}</h3>
          <div class="flex items-center gap-2 mt-2">
            <span class="px-2 py-0.5 rounded ${hasDoc ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'} text-[10px] font-black">
              ${hasDoc ? 'Document Ready' : 'No Document'}
            </span>
            <span class="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 text-[10px] font-black border border-sky-100 dark:border-sky-900/50">
              ${qCount} Questions
            </span>
          </div>
        </div>
      `;

      card.querySelector('.delete-handout-btn').onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${handout.handoutName}"?`)) {
          Storage.delete(handout.id);
          this.renderHandoutsView();
        }
      };

      gridEl.appendChild(card);
    });

    // Add Handout Card
    const addCard = document.createElement('div');
    addCard.className = "bg-slate-50/60 dark:bg-zinc-800/30 border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 p-5 sm:p-6 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-2 group min-h-[140px] hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20";
    addCard.onclick = () => this.openAddHandoutModal();
    addCard.innerHTML = `
      <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
      </div>
      <div>
        <h4 class="text-xs font-black text-slate-800 dark:text-zinc-300 uppercase">+ Add Handout</h4>
        <p class="text-[10px] text-slate-400 dark:text-zinc-500">Add lesson in ${this.selectedTerm}</p>
      </div>
    `;
    gridEl.appendChild(addCard);
  },

  selectHandout(handoutId) {
    this.activeHandoutId = handoutId;
    this.syncStudioWorkspace();
    this.navigateTo('studio');
  },

  openAddHandoutModal() {
    const modal = document.getElementById('handout-modal');
    const modalTitle = document.getElementById('handout-modal-title');
    const input = document.getElementById('input-handout-name');

    if (modalTitle) modalTitle.innerText = `Add Handout to ${this.selectedSubject} (${this.selectedTerm})`;

    const allExams = Storage.getAll();
    const count = allExams.filter(e => 
      e.year === this.selectedYear &&
      e.program === this.selectedProgram &&
      e.semester === this.selectedSemester &&
      e.subject === this.selectedSubject &&
      e.term === this.selectedTerm
    ).length;

    const next = count + 1;
    const formatted = next < 10 ? `0${next}` : `${next}`;
    if (input) input.value = `${formatted} Handout ${next}`;

    if (modal) {
      modal.dataset.isEdit = "false";
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  openEditCurrentHandoutModal() {
    if (!this.activeHandoutId) return;
    const exam = Storage.getById(this.activeHandoutId);
    if (!exam) return;

    const modal = document.getElementById('handout-modal');
    const modalTitle = document.getElementById('handout-modal-title');
    const input = document.getElementById('input-handout-name');

    if (modalTitle) modalTitle.innerText = `Rename Handout`;
    if (input) input.value = exam.handoutName || '01 Handout 1';

    if (modal) {
      modal.dataset.isEdit = "true";
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeHandoutModal() {
    const modal = document.getElementById('handout-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  handleSaveHandoutModal() {
    const modal = document.getElementById('handout-modal');
    const input = document.getElementById('input-handout-name');
    const name = input?.value.trim() || '01 Handout 1';
    const isEdit = (modal.dataset.isEdit === "true");

    if (isEdit && this.activeHandoutId) {
      const exam = Storage.getById(this.activeHandoutId);
      if (exam) {
        exam.handoutName = name;
        Storage.save(exam);
        showMessage("Handout name updated!");
      }
    } else {
      const newHandout = {
        id: generateId(),
        subject: this.selectedSubject,
        handoutName: name,
        program: this.selectedProgram,
        year: this.selectedYear,
        semester: this.selectedSemester,
        term: this.selectedTerm,
        documentMarkdown: '',
        questions: []
      };
      Storage.save(newHandout);
      this.activeHandoutId = newHandout.id;
      showMessage(`Added "${name}"!`);
    }

    this.closeHandoutModal();
    if (this.currentView === 'studio') {
      this.syncStudioWorkspace();
    } else {
      this.renderHandoutsView();
    }
  },

  startRumbleAllInTerm(mode = 'rumble') {
    if (!this.selectedSubject) return;
    const combined = Storage.getCombinedSubjectExam(
      this.selectedSubject,
      this.selectedProgram,
      this.selectedYear,
      this.selectedSemester,
      this.selectedTerm
    );

    if (!combined || combined.questions.length === 0) {
      showMessage(`No questions found across handouts for "${this.selectedSubject}" in ${this.selectedTerm}.`);
      return;
    }

    QuizEngine.start(combined, mode);
  },

  // ==========================================
  // SCREEN 7: HANDOUT STUDIO (2 TABS)
  // ==========================================
  syncStudioWorkspace() {
    const exam = this.activeHandoutId ? Storage.getById(this.activeHandoutId) : null;
    if (!exam) return;

    // Badges
    const bYear = document.getElementById('studio-badge-year');
    const bProg = document.getElementById('studio-badge-prog');
    const bSem = document.getElementById('studio-badge-sem');
    const bTerm = document.getElementById('studio-badge-term');
    const sHandout = document.getElementById('studio-handout-title');
    const sSub = document.getElementById('studio-subject-subtitle');
    const tabQBadge = document.getElementById('tab-q-badge');
    const savedQPill = document.getElementById('saved-questions-count-pill');

    if (bYear) bYear.innerText = `${exam.year} YEAR`;
    if (bProg) bProg.innerText = exam.program;
    if (bSem) bSem.innerText = exam.semester.replace('-', ' ');
    if (bTerm) bTerm.innerText = exam.term;
    if (sHandout) sHandout.innerText = exam.handoutName;
    if (sSub) sSub.innerText = exam.subject;

    const qCount = Array.isArray(exam.questions) ? exam.questions.length : 0;
    if (tabQBadge) tabQBadge.innerText = `${qCount} Qs`;
    if (savedQPill) savedQPill.innerText = `${qCount} Qs`;

    // Tab 1 Document Markdown
    HandoutConverter.setMarkdown(exam.documentMarkdown || '');

    // Tab 2 Questions List
    this.renderTab2QuestionsList(exam);
  },

  switchStudioTab(tab) {
    this.activeStudioTab = tab;
    const tabDocBtn = document.getElementById('tab-btn-doc');
    const tabExamBtn = document.getElementById('tab-btn-exam');
    const paneDoc = document.getElementById('studio-pane-doc');
    const paneExam = document.getElementById('studio-pane-exam');

    if (tab === 'doc') {
      if (tabDocBtn) {
        tabDocBtn.className = 'studio-tab-btn active whitespace-nowrap px-4 sm:px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 shadow-sm flex-shrink-0';
      }
      if (tabExamBtn) {
        tabExamBtn.className = 'studio-tab-btn whitespace-nowrap px-4 sm:px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all text-slate-500 dark:text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-2 flex-shrink-0';
      }
      if (paneDoc) paneDoc.classList.remove('hidden');
      if (paneExam) paneExam.classList.add('hidden');
    } else {
      if (tabExamBtn) {
        tabExamBtn.className = 'studio-tab-btn active whitespace-nowrap px-4 sm:px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-2 shadow-sm flex-shrink-0';
      }
      if (tabDocBtn) {
        tabDocBtn.className = 'studio-tab-btn whitespace-nowrap px-4 sm:px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all text-slate-500 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-2 flex-shrink-0';
      }
      if (paneDoc) paneDoc.classList.add('hidden');
      if (paneExam) paneExam.classList.remove('hidden');
    }
  },

  renderTab2QuestionsList(exam) {
    const listContainer = document.getElementById('saved-questions-list-container');
    if (!listContainer) return;

    if (!exam || !Array.isArray(exam.questions) || exam.questions.length === 0) {
      listContainer.innerHTML = `
        <div class="py-8 text-center text-slate-400 dark:text-zinc-500">
          <p class="text-xs font-bold text-slate-600 dark:text-zinc-400">No questions in this handout bank yet</p>
          <p class="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Paste your AI questionnaire output in the box above and click "Save to Handout Bank".</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    exam.questions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = "p-3.5 sm:p-4 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 rounded-xl hover:border-sky-300 dark:hover:border-sky-600 transition-all flex items-start justify-between gap-3";

      let choicesPreview = '';
      if (q.choices) {
        choicesPreview = Object.keys(q.choices).map(k => `${k}: ${q.choices[k]}`).filter(Boolean).join(' &bull; ');
      }

      card.innerHTML = `
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase">Question ${idx + 1}</span>
            <span class="text-[10px] font-bold px-2 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">Correct: ${q.correctAnswer || 'A'}</span>
          </div>
          <p class="text-xs text-slate-900 dark:text-white font-bold line-clamp-2">${q.question}</p>
          ${choicesPreview ? `<p class="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 truncate opacity-80">${choicesPreview}</p>` : ''}
        </div>
        <button class="del-q-btn p-1.5 text-slate-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Delete Question">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      `;

      card.querySelector('.del-q-btn').onclick = () => {
        if (confirm(`Delete Question ${idx + 1}?`)) {
          exam.questions.splice(idx, 1);
          Storage.save(exam);
          this.syncStudioWorkspace();
        }
      };

      listContainer.appendChild(card);
    });
  },

  syncActiveHandoutDoc(markdown) {
    if (!this.activeHandoutId) return;
    const exam = Storage.getById(this.activeHandoutId);
    if (exam) {
      exam.documentMarkdown = markdown;
      Storage.save(exam);
    }
  },

  handleSaveQuestionsToHandout() {
    if (!this.activeHandoutId) {
      showMessage("Please select a handout first!");
      return;
    }

    const rawQ = document.getElementById('bulk-questions')?.value.trim();
    const rawA = document.getElementById('bulk-answers')?.value.trim();

    if (!rawQ) {
      showMessage("Please paste your questions into the box!");
      return;
    }

    const parsed = parseExam(rawQ, rawA);
    if (parsed.length === 0) {
      showMessage("Parsing failed. Please verify format.");
      return;
    }

    const exam = Storage.getById(this.activeHandoutId);
    if (exam) {
      exam.questions = parsed;
      Storage.save(exam);

      document.getElementById('bulk-questions').value = '';
      if (document.getElementById('bulk-answers')) document.getElementById('bulk-answers').value = '';

      showMessage(`Saved ${parsed.length} questions to ${exam.handoutName}!`);
      this.syncStudioWorkspace();
    }
  },

  handleQuickRumble(mode = 'rumble') {
    const rawQ = document.getElementById('bulk-questions')?.value.trim();
    const rawA = document.getElementById('bulk-answers')?.value.trim();

    if (rawQ) {
      const parsed = parseExam(rawQ, rawA);
      if (parsed.length > 0) {
        if (this.activeHandoutId) {
          const exam = Storage.getById(this.activeHandoutId);
          if (exam) {
            exam.questions = parsed;
            Storage.save(exam);
            this.syncStudioWorkspace();
          }
        }
        QuizEngine.start({
          subject: this.selectedSubject || "Quick Practice",
          handoutName: mode === 'rumble' ? "Quick Rumble" : "Quick Sequential",
          questions: parsed
        }, mode);
        return;
      }
    }

    this.startRumbleActiveHandout(mode);
  },

  handleClearAllQuestions() {
    if (!this.activeHandoutId) return;
    const exam = Storage.getById(this.activeHandoutId);
    if (!exam || !exam.questions || exam.questions.length === 0) return;

    if (confirm(`Clear all ${exam.questions.length} questions in "${exam.handoutName}"?`)) {
      exam.questions = [];
      Storage.save(exam);
      this.syncStudioWorkspace();
      showMessage("Questions cleared.");
    }
  },

  startRumbleActiveHandout(mode = 'rumble') {
    if (!this.activeHandoutId) {
      showMessage("No active handout selected.");
      return;
    }
    const exam = Storage.getById(this.activeHandoutId);
    if (!exam || !Array.isArray(exam.questions) || exam.questions.length === 0) {
      showMessage("No questions saved in this handout! Paste questions in 2nd Tab first.");
      this.switchStudioTab('exam');
      return;
    }
    QuizEngine.start(exam, mode);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.App = App;
  App.init();
});
