let questions = [];
let editingId = null;

function addQuestion() {
  const q = {
    id: generateId(),
    question: '',
    choices: { A: '', B: '', C: '', D: '' },
    correctAnswer: 'A'
  };

  questions.push(q);
  renderQuestions();
  
  // scroll to bottom
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function loadExam(exam) {
  questions = JSON.parse(JSON.stringify(exam.questions)); // Deep clone
  editingId = exam.id;
  
  // Set UI values
  document.getElementById('subject').value = exam.subject;
  document.getElementById('term').value = exam.term || 'PRELIM';
  
  renderQuestions();
  
  // Scroll to top of builder
  document.getElementById('builder-section').scrollIntoView({ behavior: 'smooth' });
  showMessage(`Loaded "${exam.subject}" for editing.`);
}

function resetBuilder() {
  questions = [];
  editingId = null;
  document.getElementById('subject').value = '';
  document.getElementById('term').value = 'PRELIM';
  renderQuestions();
}

function renderQuestions() {
  const container = document.getElementById('questions-container');
  
  if (questions.length === 0) {
    container.innerHTML = `
      <div id="builder-placeholder" class="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl select-none">
        No questions added yet. Click "+ Add New Question" to begin.
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';

  questions.forEach((q, index) => {
    const div = document.createElement('div');
    div.className = "question-card bg-white border border-slate-200 rounded-2xl p-6 relative animate-fade-in mb-4";

    div.innerHTML = `
      <div class="flex justify-between items-start mb-4 select-none">
        <span class="bg-indigo-50 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Question ${index + 1}</span>
        <button type="button" class="delete-btn text-slate-300 hover:text-red-500 transition-colors p-1" title="Delete Question">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>

      <div class="mb-5">
        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest select-none">Question Prompt</label>
        <textarea class="q-text w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium lg:text-lg" placeholder="Enter your question here...">${q.question}</textarea>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        ${['A','B','C','D'].map(letter => `
          <div class="choice-input group">
            <label class="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-tighter select-none">Option ${letter}</label>
            <div class="flex items-center gap-2">
              <span class="choice-letter flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 transition-all select-none">${letter}</span>
              <input 
                type="text"
                class="choice w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                data-letter="${letter}"
                placeholder="Choice ${letter}..."
                value="${q.choices[letter].replace(/"/g, '&quot;')}"
              >
            </div>
          </div>
        `).join('')}
      </div>

      <div class="flex items-center gap-3 select-none">
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Correct Answer:</label>
        <div class="flex gap-2">
          ${['A','B','C','D'].map(letter => `
            <button 
              type="button"
              class="correct-opt w-10 h-10 rounded-lg border-2 font-bold transition-all ${q.correctAnswer === letter ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}"
              data-letter="${letter}">
              ${letter}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Interaction logic
    div.querySelector('.q-text').oninput = e => {
      questions[index].question = e.target.value;
    };

    div.querySelectorAll('.choice').forEach(inp => {
      inp.oninput = e => {
        const L = e.target.dataset.letter;
        questions[index].choices[L] = e.target.value;
      };
    });

    div.querySelectorAll('.correct-opt').forEach(btn => {
      btn.onclick = () => {
        questions[index].correctAnswer = btn.dataset.letter;
        renderQuestions();
      };
    });

    div.querySelector('.delete-btn').onclick = () => {
      questions.splice(index, 1);
      renderQuestions();
    };

    container.appendChild(div);
  });
}

function getExamData() {
  return {
    id: editingId || generateId(),
    subject: document.getElementById('subject').value.trim() || 'Untitled Exam',
    term: document.getElementById('term').value,
    questions: questions
  };
}