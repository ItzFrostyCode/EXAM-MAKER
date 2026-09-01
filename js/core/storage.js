/**
 * Core Storage: Handles persistence for Exams, Questions, and Markdown Documents in LocalStorage.
 */

const Storage = {
  KEY: 'exam_data',

  get() {
    const raw = localStorage.getItem(this.KEY);
    if (!raw) return [];
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error("Storage error:", e);
      return [];
    }
  },

  getAll() {
    return this.get();
  },

  getById(id) {
    const data = this.get();
    return data.find(e => e.id === id) || null;
  },

  save(exam) {
    if (!exam || !exam.id) return;
    const data = this.get();
    const index = data.findIndex(e => e.id === exam.id);

    // Normalize exam properties
    const normalized = {
      ...exam,
      handoutName: (exam.handoutName || '01 Handout 1').trim(),
      subject: (exam.subject || 'Untitled Subject').trim(),
      program: exam.program || 'BSIT',
      year: exam.year || '4TH',
      semester: exam.semester || '2ND-SEM',
      term: exam.term || 'PRELIM',
      documentMarkdown: exam.documentMarkdown || '',
      updatedAt: Date.now()
    };

    if (index !== -1) {
      data[index] = normalized;
    } else {
      normalized.createdAt = Date.now();
      data.push(normalized);
    }
    localStorage.setItem(this.KEY, JSON.stringify(data));
    return normalized;
  },

  import(importedExams) {
    if (!Array.isArray(importedExams)) return false;

    const currentExams = this.get();
    let importedCount = 0;

    importedExams.forEach(newExam => {
      if (newExam && typeof newExam === 'object' && newExam.subject && Array.isArray(newExam.questions)) {
        if (!newExam.id) newExam.id = generateId();
        newExam.handoutName = (newExam.handoutName || '01 Handout 1').trim();
        const exists = currentExams.findIndex(e => e.id === newExam.id);
        if (exists !== -1) {
          currentExams[exists] = newExam;
        } else {
          currentExams.push(newExam);
        }
        importedCount++;
      }
    });

    localStorage.setItem(this.KEY, JSON.stringify(currentExams));
    return importedCount > 0;
  },

  delete(id) {
    let data = this.get();
    data = data.filter(e => e.id !== id);
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  deleteSubject(subjectName, program, year, semester, term) {
    let data = this.get();
    data = data.filter(e => {
      const match = e.subject.toLowerCase() === subjectName.toLowerCase() &&
                    (!program || e.program === program) &&
                    (!year || e.year === year) &&
                    (!semester || e.semester === semester) &&
                    (!term || e.term === term);
      return !match;
    });
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  // Combine all questions across all handouts for a given subject & term
  getCombinedSubjectExam(subjectName, program, year, semester, term) {
    const all = this.get();
    const matching = all.filter(e => 
      e.subject.toLowerCase() === subjectName.toLowerCase() &&
      (!program || e.program === program) &&
      (!year || e.year === year) &&
      (!semester || e.semester === semester) &&
      (!term || e.term === term)
    );

    if (matching.length === 0) return null;

    let combinedQuestions = [];
    matching.forEach(m => {
      if (Array.isArray(m.questions)) {
        m.questions.forEach(q => {
          combinedQuestions.push({
            ...q,
            _handoutOrigin: m.handoutName || 'Handout'
          });
        });
      }
    });

    return {
      id: 'combined_' + generateId(),
      subject: subjectName,
      handoutName: `All Handouts Combined (${matching.length} Handouts)`,
      program: program || matching[0].program,
      year: year || matching[0].year,
      semester: semester || matching[0].semester,
      term: term || matching[0].term,
      questions: combinedQuestions,
      isCombined: true
    };
  }
};
