/**
 * Quiz Engine: Interactive Rumble Exam Runner (macOS Light & Dark Mode Compatible)
 * Supports question scrambling, choice shuffling, origin tagging, instant feedback, and review summary.
 */

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
    if (!exam || !Array.isArray(exam.questions) || exam.questions.length === 0) {
      if (typeof showMessage === 'function') {
        showMessage("No questions available to rumble.");
      }
      return;
    }

    // Deep clone to avoid mutating original storage object
    this.currentExam = JSON.parse(JSON.stringify(exam));

    // Shuffle questions
    this.shuffle(this.currentExam.questions);

    // Initialize state
    this.currentIndex = 0;
    this.score = 0;
    this.selectedChoice = null;
    this.isAnswered = false;
    this.userResponses = [];

    // Reveal overlay
    const overlay = document.getElementById('quiz-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
    }

    this.renderQuestion();
  },

  _letterForIndex(i) {
    return String.fromCharCode(65 + i); // 65 = 'A'
  },

  renderQuestion() {
    const container = document.getElementById('quiz-content');
    if (!container || !this.currentExam) return;

    const q = this.currentExam.questions[this.currentIndex];
    const total = this.currentExam.questions.length;
    this.selectedChoice = q._selectedChoice || null;
    this.isAnswered = !!q._selectedChoice;

    if (!q._scrambled) {
      let values = [];
      let originalKeys = [];

      if (Array.isArray(q.choices)) {
        values = q.choices.slice();
        originalKeys = values.map((_, i) => this._letterForIndex(i));
      } else {
        originalKeys = Object.keys(q.choices || {});
        values = originalKeys.map(k => q.choices[k]);
      }

      const originalCorrectText = Array.isArray(q.choices)
        ? q.choices[q.correctAnswer]
        : (q.choices ? q.choices[q.correctAnswer] : '');

      this.shuffle(values);

      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, values.length);
      const scrambledChoices = {};
      let newCorrect = letters[0];

      letters.forEach((letter, i) => {
        scrambledChoices[letter] = values[i];
        if (values[i] === originalCorrectText) {
          newCorrect = letter;
        }
      });

      q._scrambled = {
        choices: scrambledChoices,
        correct: newCorrect || letters[0]
      };
      q._scrambledOrder = letters;
    }

    const letters = q._scrambledOrder || ['A', 'B', 'C', 'D'];
    const scrambled = q._scrambled || { choices: q.choices, correct: q.correctAnswer };
    q.choices = scrambled.choices;
    q.correctAnswer = scrambled.correct;

    const originBadge = q._handoutOrigin 
      ? `<span class="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 text-[10px] font-bold border border-sky-100 dark:border-sky-900/50 truncate max-w-[150px]">${q._handoutOrigin}</span>` 
      : '';

    container.innerHTML = `
      <div class="mb-5 sm:mb-6 animate-fade-in text-slate-900 dark:text-zinc-100">
        <div class="flex justify-between items-center mb-3">
          <div class="flex items-center gap-2 sm:gap-3">
            ${this.currentIndex > 0 ? `
              <button onclick="QuizEngine.prevQuestion()" class="text-sky-600 dark:text-sky-400 hover:text-sky-800 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-all">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                <span>Back</span>
              </button>
            ` : '<div class="w-8"></div>'}
            <span class="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest">Question ${this.currentIndex + 1} / ${total}</span>
            ${originBadge}
          </div>
          <div class="h-1.5 w-20 sm:w-28 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div class="h-full bg-sky-500 transition-all duration-300" style="width: ${((this.currentIndex + 1) / total) * 100}%"></div>
          </div>
        </div>
        <h2 class="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-relaxed text-left">${q.question}</h2>
      </div>

      <div class="space-y-2.5 sm:space-y-3 mb-6" id="choices-list" role="listbox" aria-label="Choices for question">
        ${letters.map(letter => {
          let btnClass = "choice-btn w-full text-left p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-sky-400 dark:hover:border-sky-500 bg-white dark:bg-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all duration-150 group flex items-start gap-3";
          let boxClass = "letter-box flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center font-bold text-xs sm:text-sm transition-all";
          let isDisabled = false;

          if (this.isAnswered) {
            isDisabled = true;
            if (letter === q.correctAnswer) {
              btnClass = "choice-btn w-full text-left p-3.5 sm:p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 flex items-start gap-3 transition-all";
              boxClass = "letter-box flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs sm:text-sm transition-all";
            } else if (letter === q._selectedChoice) {
              btnClass = "choice-btn w-full text-left p-3.5 sm:p-4 rounded-xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 flex items-start gap-3 transition-all";
              boxClass = "letter-box flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-xs sm:text-sm transition-all";
            } else {
              btnClass = "choice-btn w-full text-left p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 opacity-40 flex items-start gap-3 transition-all";
            }
          }

          return `
            <button type="button" data-letter="${letter}" 
              ${isDisabled ? 'disabled' : `onclick="QuizEngine.selectChoice('${letter}')"`}
              class="${btnClass}">
              <span class="${boxClass}">
                ${letter}
              </span>
              <span class="text-xs sm:text-sm font-medium pt-0.5 text-slate-800 dark:text-zinc-200">${q.choices[letter] || ''}</span>
            </button>
          `;
        }).join('')}
      </div>

      <button id="submit-answer" 
        ${!this.isAnswered ? 'disabled' : ''} 
        onclick="QuizEngine.confirmAnswer()" 
        class="w-full ${this.isAnswered ? 'bg-slate-900 dark:bg-zinc-700 text-white hover:bg-sky-600 dark:hover:bg-sky-500 shadow-lg' : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed'} font-bold py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all">
        ${this.isAnswered ? (this.currentIndex < total - 1 ? 'Next Question ➔' : 'See Final Results 🏆') : 'Select an Answer'}
      </button>
    `;
  },

  selectChoice(letter) {
    if (this.isAnswered) return;
    this.isAnswered = true;
    this.selectedChoice = letter;

    const q = this.currentExam.questions[this.currentIndex];
    const isCorrect = (letter === q.correctAnswer);
    
    if (isCorrect) this.score++;

    // Lock response
    q._selectedChoice = letter;

    this.userResponses.push({
      question: q.question,
      choices: q.choices,
      selected: letter,
      correct: q.correctAnswer,
      isCorrect: isCorrect,
      origin: q._handoutOrigin || ''
    });

    this.renderQuestion();
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
    if (!container || !this.currentExam) return;

    const total = this.currentExam.questions.length;
    const percent = Math.round((this.score / total) * 100);

    container.innerHTML = `
      <div class="text-center py-4 sm:py-6 animate-fade-in text-slate-900 dark:text-zinc-100">
        <div class="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 dark:bg-emerald-950/60 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800">
          <svg class="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1">Rumble Completed!</h2>
        <p class="text-slate-400 dark:text-zinc-400 text-xs sm:text-sm mb-6 max-w-sm mx-auto truncate">${this.currentExam.subject} &bull; ${this.currentExam.handoutName}</p>

        <div class="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          <div class="bg-slate-50 dark:bg-zinc-800/60 p-4 sm:p-6 border border-slate-200 dark:border-zinc-800 rounded-2xl">
            <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Total Score</p>
            <p class="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400">${this.score} / ${total}</p>
          </div>
          <div class="bg-slate-50 dark:bg-zinc-800/60 p-4 sm:p-6 border border-slate-200 dark:border-zinc-800 rounded-2xl">
            <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Accuracy</p>
            <p class="text-2xl sm:text-3xl font-black ${percent >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}">${percent}%</p>
          </div>
        </div>

        <div class="space-y-2.5">
          <button onclick="QuizEngine.renderReview()"
            class="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-3 sm:py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-sky-500/20 active:scale-95 flex items-center justify-center gap-2">
            Review Questions & Answers
          </button>
          
          <button onclick="QuizEngine.close()"
            class="w-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold py-3 sm:py-3.5 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all border border-slate-200 dark:border-zinc-700">
            Done
          </button>
        </div>
      </div>
    `;
  },

  renderReview() {
    const container = document.getElementById('quiz-content');
    if (!container) return;

    container.innerHTML = `
      <div class="mb-4 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 py-2 z-10 border-b border-slate-100 dark:border-zinc-800">
        <div class="text-left">
          <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white">Exam Review</h2>
          <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Question Breakdown</p>
        </div>
        <button onclick="QuizEngine.showResults()" class="text-sky-600 dark:text-sky-400 text-xs font-black uppercase tracking-wider hover:underline transition-colors">
          Back to Score
        </button>
      </div>

      <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar text-left">
        ${this.userResponses.map((res, i) => `
          <div class="p-4 sm:p-5 rounded-2xl border ${res.isCorrect ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20' : 'border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20'} transition-all text-left">
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${res.isCorrect ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'}">
                Question ${i + 1} • ${res.isCorrect ? 'Correct' : 'Incorrect'}
              </span>
              ${res.origin ? `<span class="text-[9px] font-bold text-slate-400 dark:text-zinc-500 truncate max-w-[140px]">${res.origin}</span>` : ''}
            </div>
            <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-3">${res.question}</p>
            
            <div class="space-y-1.5">
              <div class="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-zinc-800 border ${res.selected === res.correct ? 'border-emerald-500' : 'border-rose-500'}">
                <span class="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center font-black text-xs ${res.selected === res.correct ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}">${res.selected}</span>
                <span class="text-xs font-medium ${res.selected === res.correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}">${res.choices[res.selected] || ''}</span>
              </div>
              
              ${!res.isCorrect ? `
                <div class="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-emerald-500 border-dashed">
                  <span class="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center font-black text-xs bg-emerald-500 text-white">${res.correct}</span>
                  <span class="text-xs font-medium text-emerald-700 dark:text-emerald-300">${res.choices[res.correct] || ''}</span>
                  <span class="ml-auto text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter pt-0.5">Correct Answer</span>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800">
        <button onclick="QuizEngine.close()"
          class="w-full bg-slate-900 dark:bg-zinc-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 dark:hover:bg-zinc-700 transition-all text-xs uppercase tracking-wider border border-slate-700 dark:border-zinc-700">
          Close Review
        </button>
      </div>
    `;
  },

  close() {
    const overlay = document.getElementById('quiz-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
    }
    this.currentExam = null;
    this.userResponses = [];
  }
};

window.QuizEngine = QuizEngine;