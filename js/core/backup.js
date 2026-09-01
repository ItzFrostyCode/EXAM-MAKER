/**
 * Backup Manager: Handles Full JSON Export and Import for the entire workspace.
 * Exports: Exams & Question Banks, Custom Year Levels, Custom Programs, and Metadata.
 */

const BackupManager = {
  exportAll() {
    const exams = Storage.getAll();
    const yearLevels = App.yearLevels || [];
    const programs = App.programsList || [];

    const payload = {
      version: "2.0.0",
      exportDate: new Date().toISOString(),
      appName: "Exam Maker",
      yearLevels: yearLevels,
      programs: programs,
      exams: exams
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ExamMaker_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showMessage("Full backup exported successfully!");
  },

  importFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        let examsList = [];

        if (Array.isArray(parsed)) {
          // Legacy array format
          examsList = parsed;
        } else if (parsed && typeof parsed === 'object') {
          // Standard v2 payload
          examsList = Array.isArray(parsed.exams) ? parsed.exams : [];
          
          if (Array.isArray(parsed.yearLevels) && parsed.yearLevels.length > 0) {
            App.yearLevels = parsed.yearLevels;
            App.saveYearLevels();
          }

          if (Array.isArray(parsed.programs) && parsed.programs.length > 0) {
            App.programsList = parsed.programs;
            App.savePrograms();
          }
        }

        if (Storage.import(examsList)) {
          showMessage(`Backup restored! Loaded ${examsList.length} exams.`);
          if (typeof App !== 'undefined') {
            App.renderYearsView();
            App.navigateTo('years');
          }
        } else {
          showMessage("No valid exams found in backup file.");
        }
      } catch (err) {
        console.error("Import error:", err);
        showMessage("Failed to parse JSON backup file.");
      }
    };
    reader.readAsText(file);
  }
};
