document.addEventListener('DOMContentLoaded', () => {
  
  // UI References
  const btnParseStart = document.getElementById('parse-start');
  const btnParseSave = document.getElementById('parse-save');
  const listExams = document.getElementById('saved-exams-list');

  let currentTermFilter = 'ALL';
  let currentYearFilter = 'ALL';
  let currentProgramFilter = 'ALL';
  let currentSemesterFilter = 'ALL';

  // Load Saved Exams on Init
  renderSavedExams();

  // 1. Parser Helpers
  function handleBulkParse() {
    const rawSubject = document.getElementById('bulk-subject').value.trim();
    const rawProgram = document.getElementById('bulk-program').value;
    const rawYear = document.getElementById('bulk-year').value;
    const rawSemester = document.getElementById('bulk-semester').value;
    const rawTerm = document.getElementById('bulk-term').value;
    const rawQ = document.getElementById('bulk-questions').value;
    const rawA = document.getElementById('bulk-answers').value;

    if (!rawQ) {
      showMessage("Please paste your questions!");
      return null;
    }

    const parsedQuestions = parseExam(rawQ, rawA);

    if (parsedQuestions.length === 0) {
      showMessage("Parsing failed. Check your format.");
      return null;
    }

    // FIX: Use the subject from input, only fallback if actually empty
    const finalSubject = rawSubject || ("Exam " + new Date().toLocaleDateString());

    return {
      id: generateId(),
      subject: finalSubject,
      program: rawProgram,
      year: rawYear,
      semester: rawSemester,
      term: rawTerm,
      questions: parsedQuestions
    };
  }

  // 2. Parser Events
  btnParseStart.onclick = () => {
    const exam = handleBulkParse();
    if (exam) QuizEngine.start(exam);
  };

  btnParseSave.onclick = () => {
    const exam = handleBulkParse();
    if (exam) {
      Storage.save(exam);
      showMessage(`"${exam.subject}" saved to library!`);
      // Clear inputs
      document.getElementById('bulk-subject').value = '';
      document.getElementById('bulk-questions').value = '';
      document.getElementById('bulk-answers').value = '';
      renderSavedExams();
    }
  };

  // 3. Saved Exams Management
  function renderSavedExams() {
    const list = document.getElementById('saved-exams-list');
    let exams = Storage.getAll();
    
    // Apply Dual Filters
    if (currentTermFilter !== 'ALL') {
      exams = exams.filter(e => e.term === currentTermFilter);
    }
    if (currentYearFilter !== 'ALL') {
      exams = exams.filter(e => e.year === currentYearFilter);
    }
    if (currentProgramFilter !== 'ALL') {
      exams = exams.filter(e => e.program === currentProgramFilter);
    }
    if (currentSemesterFilter !== 'ALL') {
      exams = exams.filter(e => e.semester === currentSemesterFilter);
    }

    if (exams.length === 0) {
      list.innerHTML = `
        <div class="col-span-full py-20 text-center select-none bg-white border border-slate-100">
          <div class="inline-flex w-16 h-16 bg-sky-50 items-center justify-center text-sky-300 mb-4 rounded-xl border border-sky-100">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
          </div>
          <p class="text-sky-900 font-bold uppercase text-[10px] tracking-[0.2em] opacity-40">No exams match your filters</p>
        </div>
      `;
      return;
    }

    list.innerHTML = '';
    exams.forEach(exam => {
      const card = document.createElement('div');
      card.className = "group bg-white border border-slate-200 p-5 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/5 transition-all animate-fade-in flex flex-col justify-between";
      
      card.innerHTML = `
        <div>
          <div class="flex items-start justify-between mb-3">
            <div class="flex flex-wrap gap-1.5">
              <span class="px-2 py-0.5 rounded-md bg-sky-50 text-sky-600 text-[9px] font-black uppercase tracking-wider border border-sky-100">${exam.program || 'GENERAL'}</span>
              <span class="px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-wider border border-slate-100">${exam.year || '1ST'} YEAR</span>
              <span class="px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-wider border border-slate-100">${(exam.semester || '1ST SEM').replace('-', ' ')}</span>
              <span class="px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-wider border border-slate-100">${exam.term || 'PRELIM'}</span>
            </div>
            <button class="delete-exam-btn text-slate-200 hover:text-red-500 transition-colors p-1" title="Delete Exam">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
          <h3 class="font-bold text-slate-800 leading-tight group-hover:text-sky-600 transition-colors mb-4">${exam.subject}</h3>
        </div>
        
        <div class="grid grid-cols-2 gap-2">
          <button onclick="openEditModal('${exam.id}')" class="edit-exam text-sky-600 bg-sky-50 hover:bg-sky-600 hover:text-white font-bold py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all border border-sky-100/50">
            Edit
          </button>
          <button class="start-exam bg-slate-900 text-white hover:bg-sky-600 font-bold py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all">
            Rumble
          </button>
        </div>
      `;

      card.querySelector('.start-exam').onclick = () => QuizEngine.start(exam);
      card.querySelector('.edit-exam').onclick = () => openEditModal(exam.id);
      card.querySelector('.delete-exam-btn').onclick = () => {
        if (confirm(`Delete "${exam.subject}"?`)) {
          Storage.delete(exam.id);
          renderSavedExams();
        }
      };

      list.appendChild(card);
    });
  }

  // Filter Events
  document.getElementById('term-filters').onclick = (e) => {
    const btn = e.target.closest('.term-filter');
    if (!btn) return;
    document.querySelectorAll('.term-filter').forEach(b => {
      b.classList.remove('active', 'bg-sky-500', 'text-white', 'shadow-md');
      b.classList.add('bg-white', 'text-slate-400', 'border', 'border-slate-200');
    });
    btn.classList.add('active', 'bg-sky-500', 'text-white', 'shadow-md');
    btn.classList.remove('bg-white', 'text-slate-400', 'border');
    currentTermFilter = btn.dataset.term;
    renderSavedExams();
  };

  document.getElementById('year-filters').onclick = (e) => {
    const btn = e.target.closest('.year-filter');
    if (!btn) return;
    document.querySelectorAll('.year-filter').forEach(b => {
      b.classList.remove('active', 'bg-sky-500', 'text-white', 'shadow-md');
      b.classList.add('bg-white', 'text-slate-400', 'border', 'border-slate-200');
    });
    btn.classList.add('active', 'bg-sky-500', 'text-white', 'shadow-md');
    btn.classList.remove('bg-white', 'text-slate-400', 'border');
    currentYearFilter = btn.dataset.year;
    renderSavedExams();
  };

  document.getElementById('semester-filters').onclick = (e) => {
    const btn = e.target.closest('.semester-filter');
    if (!btn) return;
    document.querySelectorAll('.semester-filter').forEach(b => {
      b.classList.remove('active', 'bg-sky-500', 'text-white', 'shadow-md');
      b.classList.add('bg-white', 'text-slate-400', 'border', 'border-slate-200');
    });
    btn.classList.add('active', 'bg-sky-500', 'text-white', 'shadow-md');
    btn.classList.remove('bg-white', 'text-slate-400', 'border');
    currentSemesterFilter = btn.dataset.semester;
    renderSavedExams();
  };

  document.getElementById('program-filters').onclick = (e) => {
    const btn = e.target.closest('.program-filter');
    if (!btn) return;
    document.querySelectorAll('.program-filter').forEach(b => {
      b.classList.remove('active', 'bg-sky-600', 'text-white', 'shadow-md');
      b.classList.add('bg-white', 'text-slate-400', 'border', 'border-slate-200');
    });
    btn.classList.add('active', 'bg-sky-600', 'text-white', 'shadow-md');
    btn.classList.remove('bg-white', 'text-slate-400', 'border');
    currentProgramFilter = btn.dataset.program;
    renderSavedExams();
  };

  document.getElementById('clear-filters').onclick = () => {
    currentTermFilter = 'ALL';
    currentYearFilter = 'ALL';
    currentProgramFilter = 'ALL';
    currentSemesterFilter = 'ALL';
    
    // Reset buttons
    document.querySelectorAll('.term-filter, .year-filter, .semester-filter, .program-filter').forEach(b => {
      if (b.dataset.term === 'ALL' || b.dataset.year === 'ALL' || b.dataset.semester === 'ALL' || b.dataset.program === 'ALL') {
        b.click();
      }
    });
    renderSavedExams();
  };

  // 4. Data Portability
  document.getElementById('export-library').onclick = () => {
    const data = Storage.getAll();
    if (data.length === 0) {
      showMessage("No exams to export!");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `exam_library_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    showMessage("Library exported as JSON!");
  };

  document.getElementById('import-library-input').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (Storage.import(data)) {
          showMessage("Exams merged into library!");
          renderSavedExams();
        } else {
          showMessage("Invalid JSON or no valid exams found.");
        }
      } catch (err) {
        showMessage("Error: File is not a valid JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 5. Exam Edit Modal Logic
  let editingExamId = null;
  let editingExamQuestions = [];

  window.openEditModal = function(examId) {
    const exams = Storage.getAll();
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    editingExamId = examId;
    editingExamQuestions = JSON.parse(JSON.stringify(exam.questions));

    document.getElementById('edit-subject').value = exam.subject;
    document.getElementById('edit-program').value = exam.program || 'OTHERS';
    document.getElementById('edit-year').value = exam.year || '1ST';
    document.getElementById('edit-semester').value = exam.semester || '1ST-SEM';
    document.getElementById('edit-term').value = exam.term || 'PRELIM';
    
    renderEditQuestions();
    
    const modal = document.getElementById('edit-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };

  function renderEditQuestions() {
    const list = document.getElementById('edit-questions-list');
    const countDisplay = document.getElementById('edit-question-count');
    
    countDisplay.innerText = `${editingExamQuestions.length} Questions`;
    list.innerHTML = '';

    editingExamQuestions.forEach((q, index) => {
      const item = document.createElement('div');
      item.className = "flex items-start justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl group hover:border-sky-200 transition-all";
      item.innerHTML = `
        <div class="flex-1 pr-4">
          <p class="text-xs font-black text-sky-600 uppercase tracking-widest mb-1">Question ${index + 1}</p>
          <p class="text-sm text-slate-700 font-bold line-clamp-2">${q.question}</p>
        </div>
        <button class="delete-q-btn p-2 text-slate-300 hover:text-red-500 transition-colors" title="Remove Question">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      `;

      item.querySelector('.delete-q-btn').onclick = () => {
        if (confirm("Remove this question?")) {
          editingExamQuestions.splice(index, 1);
          renderEditQuestions();
        }
      };
      
      list.appendChild(item);
    });
  }

  function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    editingExamId = null;
    editingExamQuestions = [];
  }

  document.getElementById('close-edit-modal').onclick = closeEditModal;
  document.getElementById('cancel-edit').onclick = closeEditModal;

  document.getElementById('save-edit').onclick = () => {
    if (!editingExamId) return;
    
    const exams = Storage.getAll();
    const index = exams.findIndex(e => e.id === editingExamId);
    if (index === -1) return;

    const updatedExam = {
      ...exams[index],
      subject: document.getElementById('edit-subject').value.trim() || exams[index].subject,
      program: document.getElementById('edit-program').value,
      year: document.getElementById('edit-year').value,
      semester: document.getElementById('edit-semester').value,
      term: document.getElementById('edit-term').value,
      questions: editingExamQuestions
    };

    Storage.save(updatedExam);
    showMessage("Exam updated successfully!");
    closeEditModal();
    renderSavedExams();
  };
});
