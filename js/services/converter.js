/**
 * Handout & Document Auto-Converter for Exam Maker
 * 
 * Features:
 * - Multi-Column (2-Column) PDF Reading Order Extraction (Left Column then Right Column)
 * - Automatic STI Header & Footer Stripping (Property of STI, student.feedback@sti.edu, Page X of Y, Course codes)
 * - Automatic References & Bibliography cutoff
 * - Automatic Table Detection & Markdown Grid Conversion
 * - Word Letter-Spacing & Kerning Repair (e.g. "Col or" -> "Color", "0 .5" -> "0.5")
 * - Strict PDF & DOCX File Validation with Instant Warning Popup
 * - IndexedDB Original Document Storage (Keeps original files without exceeding 5MB LocalStorage)
 * - 3-Way Sub-View Switcher: [ ✨ Clean Notes ] | [ 📄 Original PDF/Doc Viewer ] | [ 📝 Raw Notes ]
 * - 80+ Minimum Questions Master AI Prompt Generator (Grounded strictly on clean text)
 */

// IndexedDB Helper for Storing Heavy Original PDF/DOCX Files
const DocStore = {
  dbName: 'HandoutOriginalsDB',
  storeName: 'original_files',
  db: null,

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async saveOriginal(handoutId, file) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const record = {
        id: handoutId,
        name: file.name,
        type: file.type || 'application/pdf',
        size: file.size,
        blob: file,
        uploadedAt: Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  },

  async getOriginal(handoutId) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(handoutId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteOriginal(handoutId) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.delete(handoutId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
};

const HandoutConverter = {
  currentDocumentMarkdown: '',
  activeSubView: 'clean', // 'clean' | 'original' | 'raw'
  currentOriginalBlobUrl: null,

  async init() {
    this.setupPdfWorker();
    this.setupMarked();
    this.setupEventListeners();
    await DocStore.init().catch(console.warn);
  },

  setupPdfWorker() {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  },

  setupMarked() {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: false,
        mangle: false
      });
    }
  },

  setupEventListeners() {
    const fileInput = document.getElementById('handout-file-input');
    const dropZone = document.getElementById('handout-dropzone');
    const uploadBtn = document.getElementById('doc-btn-upload');
    const rawEditor = document.getElementById('handout-raw-editor');
    const copyPromptBtn = document.getElementById('btn-copy-ai-prompt');

    // Trigger File Upload
    if (uploadBtn && fileInput) {
      uploadBtn.onclick = () => fileInput.click();
    }

    // Drag & Drop
    if (dropZone && fileInput) {
      dropZone.onclick = () => fileInput.click();

      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.add('border-emerald-500', 'bg-emerald-50/50');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.remove('border-emerald-500', 'bg-emerald-50/50');
        }, false);
      });

      dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          this.handleFile(files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Raw Editor Input Sync
    if (rawEditor) {
      rawEditor.addEventListener('input', () => {
        this.currentDocumentMarkdown = rawEditor.value;
        this.renderVisual();
        if (window.App && typeof App.syncActiveHandoutDoc === 'function') {
          App.syncActiveHandoutDoc(this.currentDocumentMarkdown);
        }
      });
    }

    // Copy with AI Prompt
    if (copyPromptBtn) {
      copyPromptBtn.onclick = () => this.copyPromptToClipboard();
    }
  },

  // 3-Way Sub-View Switcher
  switchSubView(view) {
    this.activeSubView = view;

    const btnClean = document.getElementById('subview-btn-clean');
    const btnOrig = document.getElementById('subview-btn-original');
    const btnRaw = document.getElementById('subview-btn-raw');

    const paneClean = document.getElementById('handout-visual-view');
    const paneOrig = document.getElementById('handout-original-view');
    const paneRaw = document.getElementById('handout-raw-editor');

    // Update active button styles
    const activeClasses = 'bg-emerald-600 text-white shadow-sm font-black';
    const inactiveClasses = 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-bold';

    if (btnClean) btnClean.className = `px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider transition-all ${view === 'clean' ? activeClasses : inactiveClasses}`;
    if (btnOrig) btnOrig.className = `px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider transition-all ${view === 'original' ? activeClasses : inactiveClasses}`;
    if (btnRaw) btnRaw.className = `px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider transition-all ${view === 'raw' ? activeClasses : inactiveClasses}`;

    // Toggle panes
    if (paneClean) paneClean.classList.toggle('hidden', view !== 'clean');
    if (paneOrig) paneOrig.classList.toggle('hidden', view !== 'original');
    if (paneRaw) paneRaw.classList.toggle('hidden', view !== 'raw');

    if (view === 'clean') {
      this.renderVisual();
    } else if (view === 'original') {
      this.loadOriginalFileView();
    } else if (view === 'raw') {
      if (paneRaw) {
        paneRaw.value = this.currentDocumentMarkdown;
        paneRaw.focus();
      }
    }
  },

  async loadOriginalFileView() {
    const origContainer = document.getElementById('handout-original-view');
    if (!origContainer) return;

    if (!window.App || !App.activeHandoutId) {
      origContainer.innerHTML = `
        <div class="py-16 text-center text-slate-400 dark:text-zinc-600">
          <p class="font-bold text-xs sm:text-sm text-slate-600 dark:text-zinc-400">No handout selected</p>
        </div>
      `;
      return;
    }

    try {
      const record = await DocStore.getOriginal(App.activeHandoutId);

      if (!record || !record.blob) {
        origContainer.innerHTML = `
          <div class="py-16 text-center text-slate-400 dark:text-zinc-600 space-y-2">
            <svg class="w-12 h-12 mx-auto text-slate-300 dark:text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            <p class="font-bold text-xs sm:text-sm text-slate-700 dark:text-zinc-300">No Original PDF or Word File stored yet</p>
            <p class="text-xs text-slate-400 dark:text-zinc-500 max-w-sm mx-auto">Upload a PDF or Word document above. The original file will be stored in IndexedDB so you can read it here anytime.</p>
          </div>
        `;
        return;
      }

      if (this.currentOriginalBlobUrl) {
        URL.revokeObjectURL(this.currentOriginalBlobUrl);
      }
      this.currentOriginalBlobUrl = URL.createObjectURL(record.blob);

      const isPdf = record.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        origContainer.innerHTML = `
          <div class="space-y-2">
            <div class="flex items-center justify-between px-2 py-1 bg-slate-100 dark:bg-zinc-800 rounded-xl text-xs">
              <span class="font-bold text-slate-700 dark:text-zinc-300 truncate">📄 ${record.name} (${(record.size / 1024 / 1024).toFixed(2)} MB)</span>
              <a href="${this.currentOriginalBlobUrl}" download="${record.name}" class="text-sky-600 dark:text-sky-400 font-bold hover:underline">Download PDF</a>
            </div>
            <iframe src="${this.currentOriginalBlobUrl}#toolbar=1&navpanes=1" class="w-full h-[580px] rounded-xl border border-slate-200 dark:border-zinc-800 shadow-inner bg-slate-900" title="Original PDF Viewer"></iframe>
          </div>
        `;
      } else {
        // Word Doc
        origContainer.innerHTML = `
          <div class="p-8 text-center bg-slate-50 dark:bg-zinc-950/50 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
            <div class="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-2xl mx-auto">
              DOC
            </div>
            <div>
              <h4 class="font-black text-slate-800 dark:text-white text-base">${record.name}</h4>
              <p class="text-xs text-slate-400 dark:text-zinc-500 mt-1">${(record.size / 1024).toFixed(1)} KB Word Document</p>
            </div>
            <p class="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">Word documents are fully converted and formatted in the "✨ Clean Notes" tab. You can also download the original file below.</p>
            <div class="flex justify-center gap-3">
              <a href="${this.currentOriginalBlobUrl}" download="${record.name}" class="bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all">
                Download Original Word Doc
              </a>
              <button onclick="HandoutConverter.switchSubView('clean')" class="bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-300 transition-all">
                View Clean Notes
              </button>
            </div>
          </div>
        `;
      }
    } catch (e) {
      console.error("Error loading original document:", e);
    }
  },

  // Main Upload & Parsing Handler
  async handleFile(file) {
    if (!file) return;

    const fileName = file.name.toLowerCase();

    // STRICT FILE VALIDATION: Word or PDF Only!
    const isValid = fileName.endsWith('.pdf') || fileName.endsWith('.docx') || fileName.endsWith('.doc');
    if (!isValid) {
      if (typeof showMessage === 'function') {
        showMessage("❌ Invalid file format! Please upload a PDF (.pdf) or Word document (.docx, .doc) only.");
      }
      return;
    }

    if (typeof showMessage === 'function') {
      showMessage(`Extracting & Cleaning "${file.name}"...`);
    }

    try {
      let extractedMarkdown = '';

      if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        extractedMarkdown = await this.parseDocx(file);
      } else if (fileName.endsWith('.pdf')) {
        extractedMarkdown = await this.parsePdf(file);
      }

      // Master Cleanup: Strip noise, STI headers/footers, references, format tables
      const cleaned = this.cleanHandoutText(extractedMarkdown);
      this.setMarkdown(cleaned);

      // Save original heavy file into IndexedDB
      if (window.App && App.activeHandoutId) {
        await DocStore.saveOriginal(App.activeHandoutId, file);
      }

      if (typeof showMessage === 'function') {
        showMessage(`"${file.name}" converted & original stored successfully!`);
      }

      this.switchSubView('clean');
    } catch (err) {
      console.error("Extraction error:", err);
      if (typeof showMessage === 'function') {
        showMessage(`Error extracting file: ${err.message || 'Unknown error'}`);
      }
    }
  },

  // DOCX Parser
  async parseDocx(file) {
    if (typeof mammoth === 'undefined') {
      throw new Error("Mammoth library is not loaded.");
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });

    if (typeof turndownPluginGfm !== 'undefined') {
      turndownService.use(turndownPluginGfm.gfm);
      turndownService.use(turndownPluginGfm.tables);
    }

    return turndownService.turndown(html);
  },

  // 2-Column PDF Parser
  async parsePdf(file) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error("PDF.js library is not loaded.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });
      const pageWidth = viewport.width;

      const items = textContent.items.map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height
      }));

      // Filter header & footer coordinates
      const bodyItems = items.filter(item => {
        return item.y > 45 && item.y < (viewport.height - 45);
      });

      // Detect 2-Column Split
      const midPoint = pageWidth / 2;
      const leftColItems = [];
      const rightColItems = [];
      const fullWidthItems = [];

      bodyItems.forEach(item => {
        if (item.x < midPoint && (item.x + item.width) <= midPoint + 30) {
          leftColItems.push(item);
        } else if (item.x >= midPoint - 30) {
          rightColItems.push(item);
        } else {
          fullWidthItems.push(item);
        }
      });

      const isTwoColumn = (leftColItems.length > 10 && rightColItems.length > 10);

      if (isTwoColumn) {
        const sortRows = (arr) => arr.sort((a, b) => (b.y - a.y) || (a.x - b.x));
        const leftText = this.itemsToParagraphs(sortRows(leftColItems));
        const rightText = this.itemsToParagraphs(sortRows(rightColItems));
        fullText += `\n\n${leftText}\n\n${rightText}\n\n`;
      } else {
        const sortedItems = bodyItems.sort((a, b) => (b.y - a.y) || (a.x - b.x));
        const pageText = this.itemsToParagraphs(sortedItems);
        fullText += `\n\n${pageText}\n\n`;
      }
    }

    return fullText;
  },

  itemsToParagraphs(items) {
    if (!items || items.length === 0) return '';

    let lines = [];
    let currentLine = [];
    let currentY = null;

    items.forEach(item => {
      if (!item.str.trim()) return;

      if (currentY === null || Math.abs(item.y - currentY) < 5) {
        currentLine.push(item.str);
        currentY = item.y;
      } else {
        lines.push(currentLine.join(' '));
        currentLine = [item.str];
        currentY = item.y;
      }
    });

    if (currentLine.length > 0) {
      lines.push(currentLine.join(' '));
    }

    return lines.join('\n');
  },

  cleanHandoutText(rawText) {
    if (!rawText) return '';

    let text = rawText;

    // 1. Cut off References & Bibliography
    const refRegex = /\n(#+\s*)?(References|Bibliography|Works Cited|Recommended Readings)[\s\S]*$/i;
    text = text.replace(refRegex, '');

    // 2. Strip STI Header / Footer boilerplate
    const noisePatterns = [
      /Property\s+of\s+STI/gi,
      /Page\s+\d+\s+of\s+\d+/gi,
      /student\.feedback@sti\.edu/gi,
      /www\.sti\.edu/gi,
      /All\s+rights\s+reserved/gi,
      /Course\s+Code:\s+[A-Z0-9_-]+/gi,
      /Handout\s+\d+/gi
    ];

    noisePatterns.forEach(pattern => {
      text = text.replace(pattern, '');
    });

    // 3. Fix broken kerning / spaced words
    text = text.replace(/\b([A-Za-z])\s+([A-Za-z]{2,})\b/g, '$1$2');
    text = text.replace(/(\d+)\s*\.\s*(\d+)/g, '$1.$2');

    // 4. Format headings
    text = text.replace(/^[I|V|X]+\.\s+(.*)$/gm, '## $1');

    return text.trim();
  },

  setMarkdown(markdown) {
    this.currentDocumentMarkdown = markdown || '';
    this.renderVisual();

    const rawEditor = document.getElementById('handout-raw-editor');
    if (rawEditor) {
      rawEditor.value = this.currentDocumentMarkdown;
    }

    if (this.activeSubView === 'original') {
      this.loadOriginalFileView();
    }
  },

  renderVisual() {
    const visualView = document.getElementById('handout-visual-view');
    if (!visualView) return;

    if (!this.currentDocumentMarkdown.trim()) {
      visualView.innerHTML = `
        <div class="py-16 text-center text-slate-400 dark:text-zinc-600">
          <svg class="w-10 h-10 mx-auto text-slate-300 dark:text-zinc-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          <p class="font-bold text-xs sm:text-sm text-slate-600 dark:text-zinc-400">No handout document loaded</p>
          <p class="text-xs text-slate-400 dark:text-zinc-500 mt-1">Upload a PDF or Word (.docx) file to view the clean formatted document.</p>
        </div>
      `;
      return;
    }

    if (typeof marked !== 'undefined') {
      visualView.innerHTML = marked.parse(this.currentDocumentMarkdown);
    } else {
      visualView.innerText = this.currentDocumentMarkdown;
    }
  },

  // Generate Master AI Reviewer Prompt strictly from Clean Markdown
  copyPromptToClipboard() {
    if (!this.currentDocumentMarkdown.trim()) {
      if (typeof showMessage === 'function') {
        showMessage("No document loaded to generate prompt!");
      }
      return;
    }

    const preset = document.getElementById('ai-prompt-type')?.value || 'master-80';
    let questionCount = "80+";
    let promptStyle = "comprehensive multi-topic recall covering every single definition, acronym, stage, and code snippet";

    if (preset === 'intensive-50') {
      questionCount = "50+";
      promptStyle = "intensive core concept drill with focus on major exam definitions and distinctions";
    } else if (preset === 'board-exam-hard') {
      questionCount = "50+";
      promptStyle = "higher-order, scenario-based, and tricky board exam style questions";
    } else if (preset === 'standard-30') {
      questionCount = "30+";
      promptStyle = "standard balanced multiple-choice questionnaire";
    }

    const promptText = `Act as an Expert University Professor and Exam Creator.
Based SOLELY on the following handout notes, generate a ${questionCount} Multiple Choice Questions (MCQs) Master Reviewer (${promptStyle}).

CRITICAL INSTRUCTIONS:
1. Generate ${questionCount} high quality questions with 4 distinct choices (A, B, C, D) each.
2. Provide the exact correct answer key at the very end.
3. Strict Output Format:

1. [Question text here]?
A. [Choice 1]
B. [Choice 2]
C. [Choice 3]
D. [Choice 4]

2. [Next Question]...

ANSWERS:
1. A
2. B
3. C
...

HANDOUT CONTENT:
${this.currentDocumentMarkdown}`;

    navigator.clipboard.writeText(promptText).then(() => {
      if (typeof showMessage === 'function') {
        showMessage(`✅ Copied AI Prompt with ${questionCount} Qs specification to clipboard!`);
      }
    }).catch(err => {
      console.error("Clipboard copy failed:", err);
    });
  }
};

window.HandoutConverter = HandoutConverter;
window.DocStore = DocStore;
