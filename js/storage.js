const Storage = {
  KEY: 'exam_data',

  get() {
    return JSON.parse(localStorage.getItem(this.KEY)) || [];
  },

  getAll() {
    return this.get();
  },

  save(exam) {
    const data = this.get();
    const index = data.findIndex(e => e.id === exam.id);
    if (index !== -1) {
      data[index] = exam; // Update existing
    } else {
      data.push(exam); // Add new
    }
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  import(importedExams) {
    if (!Array.isArray(importedExams)) return false;

    const currentExams = this.get();
    let importedCount = 0;

    importedExams.forEach(newExam => {
      // Basic validation: must be an object with nested questions
      if (newExam && typeof newExam === 'object' && newExam.subject && Array.isArray(newExam.questions)) {
        // Ensure it has an ID
        if (!newExam.id) newExam.id = generateId();

        const exists = currentExams.findIndex(e => e.id === newExam.id);
        if (exists !== -1) {
          currentExams[exists] = newExam; // Update existing if ID matches
        } else {
          currentExams.push(newExam); // Add new
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
  }
};