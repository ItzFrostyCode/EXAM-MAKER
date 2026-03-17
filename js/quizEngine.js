const QuizEngine = {
  // Utility: Fisher–Yates shuffle (in-place)
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  },

  start(exam) {
    // Deep clone to avoid mutating the original exam object
    this.currentExam = JSON.parse(JSON.stringify(exam));

    // Shuffle questions once at start
    this.shuffle(this.currentExam.questions);

    // Initialize state
    this.currentIndex = 0;
    this.score = 0;
    this.selectedChoice = null;
    this.isAnswered = false;
    this.userResponses = [];

    // Reveal overlay
    const overlay = document.getElementById('quiz-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');

    this.renderQuestion();
  },

  // Helper to generate letter labels dynamically (A, B, C, ...)
  _letterForIndex(i) {
    return String.fromCharCode(65 + i); // 65 = 'A'
  },

  renderQuestion() {
    const container = document.getElementById('quiz-content');
    const q = this.currentExam.questions[this.currentIndex];
    const total = this.currentExam.questions.length;
    this.selectedChoice = q._selectedChoice || null;
    this.isAnswered = !!q._selectedChoice;

    // If this question already had scrambled choices stored, reuse them.
    // This prevents re-scrambling if someone re-renders the same question.
    if (!q._scrambled) {
      // Extract the array of choice texts and their original keys (if keys exist)
      // Support both formats:
      // - choices as object keyed by letters: { A: 'x', B: 'y' }
      // - choices as array: [ 'x', 'y', 'z' ]
      let values = [];
      let originalKeys = [];

      if (Array.isArray(q.choices)) {
        values = q.choices.slice();
        originalKeys = values.map((_, i) => this._letterForIndex(i));
      } else {
        // choices object
        originalKeys = Object.keys(q.choices);
        values = originalKeys.map(k => q.choices[k]);
      }

      // Save the currently-correct answer text (so we can find it after shuffle)
      const originalCorrectText =
        Array.isArray(q.choices)
          ? q.choices[q.correctAnswer] // assume index for array
          : q.choices[q.correctAnswer]; // assume letter for object

      // Shuffle values to create scrambled choices
      this.shuffle(values);

      // Build scrambled mapping: letter -> text
      const scrambledChoices = {};
      let newCorrect = null;
      const letters = values.map((_, i) => this._letterForIndex(i));

      letters.forEach((letter, i) => {
        scrambledChoices[letter] = values[i];
        if (values[i] === originalCorrectText) {
          newCorrect = letter;
        }
      });

      // Persist scrambled choices and correct letter on the question object
      q._scrambled = {
        choices: scrambledChoices, // object keyed by letter
        correct: newCorrect || letters[0] // fallback to first if not found (defensive)
      };

      // For later clarity, store ordering of letters used
      q._scrambledOrder = letters;
    }

    const letters = q._scrambledOrder;
    const scrambled = q._scrambled;
    q.choices = scrambled.choices;       // use scrambled mapping for runtime
    q.correctAnswer = scrambled.correct; // letter like 'A', 'B', etc.

    container.innerHTML = `
      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-4">
            ${this.currentIndex > 0 ? `
              <button onclick="QuizEngine.prevQuestion()" class="text-sky-600 hover:text-sky-800 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-all">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                Back
              </button>
            ` : '<div class="w-10"></div>'}
            <span class="text-xs font-black text-sky-600 uppercase tracking-widest">Question ${this.currentIndex + 1} / ${total}</span>
          </div>
          <div class="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-sky-50 transition-all duration-500" style="width: ${((this.currentIndex + 1) / total) * 100}%"></div>
          </div>
        </div>
        <h2 class="text-xl font-bold text-slate-800 leading-snug text-left">${q.question}</h2>
      </div>

      <div class="space-y-3 mb-8" id="choices-list" role="listbox" aria-label="Choices for question">
        ${letters.map(letter => {
          let btnClass = "choice-btn w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-sky-200 hover:bg-slate-50 transition-all duration-200 group flex items-start gap-3";
          let boxClass = "letter-box flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center font-bold text-slate-500 transition-all";
          let isDisabled = false;

          if (this.isAnswered) {
            isDisabled = true;
            if (letter === q.correctAnswer) {
              btnClass = "choice-btn w-full text-left p-4 rounded-xl border-2 border-green-500 bg-green-50 flex items-start gap-3 transition-all";
              boxClass = "letter-box flex-shrink-0 w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center font-bold text-white transition-all";
            } else if (letter === q._selectedChoice) {
              btnClass = "choice-btn w-full text-left p-4 rounded-xl border-2 border-red-500 bg-red-50 flex items-start gap-3 transition-all";
              boxClass = "letter-box flex-shrink-0 w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center font-bold text-white transition-all";
            } else {
              btnClass = "choice-btn w-full text-left p-4 rounded-xl border-2 border-slate-100 bg-white opacity-50 flex items-start gap-3 transition-all";
            }
          }

          return `
            <button type="button" data-letter="${letter}" 
              ${isDisabled ? 'disabled' : `onclick="QuizEngine.selectChoice('${letter}')"`}
              class="${btnClass}">
              <span class="${boxClass}">
                ${letter}
              </span>
              <span class="text-slate-600 font-medium pt-0.5">${q.choices[letter]}</span>
            </button>
          `;
        }).join('')}
      </div>

      <button id="submit-answer" 
        ${!this.isAnswered ? 'disabled' : ''} 
        onclick="QuizEngine.confirmAnswer()" 
        class="w-full ${this.isAnswered ? 'bg-slate-900 text-white hover:bg-sky-600 shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'} font-bold py-4 rounded-xl transition-all">
        ${this.isAnswered ? (this.currentIndex < total - 1 ? 'Next Question' : 'See Results') : 'Select an Answer'}
      </button>
    `;
// ... (rest of the renderQuestion function exists)
  },

  selectChoice(letter) {
    if (this.isAnswered) return;
    this.isAnswered = true;
    this.selectedChoice = letter;

    const q = this.currentExam.questions[this.currentIndex];
    const isCorrect = letter === q.correctAnswer;
    
    if (isCorrect) this.score++;

    // Lock the answer
    q._selectedChoice = letter;

    // Track response for Review
    this.userResponses.push({
      question: q.question,
      choices: q.choices,
      selected: letter,
      correct: q.correctAnswer,
      isCorrect: isCorrect
    });

    // Update UI for choices
    const container = document.getElementById('choices-list');
    container.querySelectorAll('.choice-btn').forEach(btn => {
      const btnLetter = btn.dataset.letter;
      const letterBox = btn.querySelector('.letter-box');
      btn.disabled = true;
      btn.classList.remove('hover:border-sky-200', 'hover:bg-slate-50');

      if (btnLetter === q.correctAnswer) {
        // Correct choice (always highlight green)
        btn.className = "choice-btn w-full text-left p-4 rounded-xl border-2 border-green-500 bg-green-50 flex items-start gap-3 transition-all";
        letterBox.className = "letter-box flex-shrink-0 w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center font-bold text-white transition-all";
      } else if (btnLetter === letter && !isCorrect) {
        // Wrong choice selected
        btn.className = "choice-btn w-full text-left p-4 rounded-xl border-2 border-red-500 bg-red-50 flex items-start gap-3 transition-all";
        letterBox.className = "letter-box flex-shrink-0 w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center font-bold text-white transition-all";
      } else {
        // Other choices
        btn.className = "choice-btn w-full text-left p-4 rounded-xl border-2 border-slate-100 bg-white opacity-50 flex items-start gap-3 transition-all";
      }
    });

    // Update submit button to "Next"
    const submitBtn = document.getElementById('submit-answer');
    submitBtn.disabled = false;
    submitBtn.innerText = this.currentIndex < this.currentExam.questions.length - 1 ? "Next Question" : "See Results";
    submitBtn.className = "w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg transform active:scale-[0.98]";
  },

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderQuestion();
    }
  },

  nextQuestion() {
    if (this.currentIndex < this.currentExam.questions.length - 1) {
      this.currentIndex++;
      this.renderQuestion();
    } else {
      this.showResults();
    }
  },

  confirmAnswer() {
    if (!this.selectedChoice) return;
    this.nextQuestion();
  },

  showResults() {
    const container = document.getElementById('quiz-content');
    const percent = Math.round((this.score / this.currentExam.questions.length) * 100);

    container.innerHTML = `
      <div class="text-center py-6">
        <div class="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h2 class="text-2xl font-black text-slate-800 mb-1">Quiz Finished!</h2>
        <p class="text-slate-400 text-sm mb-8">Great job on completing "${this.currentExam.subject}"</p>

        <div class="grid grid-cols-2 gap-4 mb-8">
          <div class="bg-slate-50 p-6 border border-slate-100 rounded-2xl">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Score</p>
            <p class="text-3xl font-black text-sky-600">${this.score}/${this.currentExam.questions.length}</p>
          </div>
          <div class="bg-slate-50 p-6 border border-slate-100 rounded-2xl">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Accuracy</p>
            <p class="text-3xl font-black text-sky-600">${percent}%</p>
          </div>
        </div>

        <div class="space-y-3">
          <button onclick="QuizEngine.renderReview()"
            class="w-full bg-sky-600 text-white font-bold py-4 rounded-xl hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 flex items-center justify-center gap-2">
            Review My Answers
          </button>
          
          <button onclick="QuizEngine.close()"
            class="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
            Done
          </button>
        </div>
      </div>
    `;
  },

  renderReview() {
    const container = document.getElementById('quiz-content');
    
    container.innerHTML = `
      <div class="mb-6 flex items-center justify-between sticky top-0 bg-white py-2 z-10 border-b border-slate-50">
        <div class="text-left">
          <h2 class="text-xl font-black text-slate-800">Review</h2>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your performance summary</p>
        </div>
        <button onclick="QuizEngine.showResults()" class="text-sky-600 text-xs font-black uppercase tracking-widest hover:text-sky-800 transition-colors">
          Back to Score
        </button>
      </div>

      <div class="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar text-left">
        ${this.userResponses.map((res, i) => `
          <div class="p-5 rounded-2xl border-2 ${res.isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'} transition-all text-left">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${res.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                Question ${i + 1} • ${res.isCorrect ? 'Correct' : 'Incorrect'}
              </span>
            </div>
            <p class="text-slate-800 font-bold mb-4">${res.question}</p>
            
            <div class="space-y-2">
              <div class="flex items-start gap-3 p-3 rounded-xl bg-white border ${res.selected === res.correct ? 'border-green-500 shadow-sm' : 'border-red-500 shadow-sm'}">
                <span class="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center font-black text-xs ${res.selected === res.correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}">${res.selected}</span>
                <span class="text-sm font-medium ${res.selected === res.correct ? 'text-green-700' : 'text-red-700'}">${res.choices[res.selected]}</span>
              </div>
              
              ${!res.isCorrect ? `
                <div class="flex items-start gap-3 p-3 rounded-xl bg-white border border-green-500 border-dashed">
                  <span class="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center font-black text-xs bg-green-500 text-white">${res.correct}</span>
                  <span class="text-sm font-medium text-green-700">${res.choices[res.correct]}</span>
                  <span class="ml-auto text-[8px] font-black text-green-500 uppercase tracking-tighter pt-1">Correct Answer</span>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="mt-8 pt-6 border-t border-slate-50">
        <button onclick="QuizEngine.close()"
          class="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
          Close Review
        </button>
      </div>
    `;
  },

  close() {
    const overlay = document.getElementById('quiz-overlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
    this.currentExam = null;
    this.userResponses = [];
  }
};

// Optional: keep a reference to an original exam object so Retry can call start()
// You should set `window.originalExam = examObject` before calling QuizEngine.start(examObject)
window.QuizEngine = QuizEngine;