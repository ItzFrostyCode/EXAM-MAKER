/**
 * Handout & Document Auto-Converter for Exam Maker
 * 
 * Features:
 * - Multi-Column (2-Column) PDF Reading Order Extraction (Left Column then Right Column)
 * - Automatic STI Header & Footer Stripping (Property of STI, student.feedback@sti.edu, Page X of Y, Course codes)
 * - Automatic References & Bibliography cutoff
 * - Automatic Table Detection & Markdown Grid Conversion (Color, RGB, Pipeline stages, etc.)
 * - Word Letter-Spacing & Kerning Repair (e.g. "Col or" -> "Color", "0 .5" -> "0.5")
 * - Live Clean Visual Rendering (Big H1/H2/H3 Headings, Bullets, Styled Tables)
 * - 80+ Minimum Questions Master AI Prompt Generator
 */

const HandoutConverter = {
  currentDocumentMarkdown: '',
  isRawEditMode: false,

  init() {
    this.setupPdfWorker();
    this.setupMarked();
    this.setupEventListeners();
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
    const toggleEditBtn = document.getElementById('doc-btn-toggle-edit');
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

    // Toggle Preview / Un-preview Mode
    const togglePreviewBtn = document.getElementById('btn-toggle-preview');
    if (togglePreviewBtn) {
      togglePreviewBtn.onclick = () => this.toggleRawEdit();
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

  toggleRawEdit() {
    this.isRawEditMode = !this.isRawEditMode;
    const visualView = document.getElementById('handout-visual-view');
    const rawEditor = document.getElementById('handout-raw-editor');
    const iconEl = document.getElementById('preview-btn-icon');
    const labelEl = document.getElementById('preview-btn-label');
    const toggleBtn = document.getElementById('btn-toggle-preview');

    if (this.isRawEditMode) {
      // Show RAW EDITOR (Un-preview Mode)
      if (visualView) visualView.classList.add('hidden');
      if (rawEditor) {
        rawEditor.classList.remove('hidden');
        rawEditor.value = this.currentDocumentMarkdown;
        rawEditor.focus();
      }
      if (iconEl) iconEl.innerText = '👁️';
      if (labelEl) labelEl.innerText = 'Preview (Visual Document)';
      if (toggleBtn) {
        toggleBtn.className = 'px-3 py-1.5 bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5';
      }
    } else {
      // Show VISUAL PREVIEW (Preview Mode)
      if (rawEditor) {
        this.currentDocumentMarkdown = rawEditor.value;
        rawEditor.classList.add('hidden');
      }
      if (visualView) {
        visualView.classList.remove('hidden');
        this.renderVisual();
      }
      if (iconEl) iconEl.innerText = '📝';
      if (labelEl) labelEl.innerText = 'Un-preview (Raw Text)';
      if (toggleBtn) {
        toggleBtn.className = 'px-3 py-1.5 bg-slate-50 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1.5';
      }
    }
  },

  async handleFile(file) {
    if (!file) return;

    if (typeof showMessage === 'function') {
      showMessage(`Extracting & Cleaning "${file.name}"...`);
    }

    try {
      const fileName = file.name.toLowerCase();
      let extractedMarkdown = '';

      if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        extractedMarkdown = await this.parseDocx(file);
      } else if (fileName.endsWith('.pdf')) {
        extractedMarkdown = await this.parsePdf(file);
      } else {
        extractedMarkdown = await this.parseText(file);
      }

      // Master Cleanup: Strip noise, STI headers/footers, references, format tables
      const cleaned = this.cleanHandoutText(extractedMarkdown);
      this.setMarkdown(cleaned);

      if (typeof showMessage === 'function') {
        showMessage(`"${file.name}" converted and formatted cleanly!`);
      }
    } catch (err) {
      console.error("Extraction error:", err);
      if (typeof showMessage === 'function') {
        showMessage(`Error extracting file: ${err.message || 'Unknown error'}`);
      }
    }
  },

  setMarkdown(md) {
    this.currentDocumentMarkdown = md || '';
    const rawEditor = document.getElementById('handout-raw-editor');
    if (rawEditor) rawEditor.value = this.currentDocumentMarkdown;
    this.renderVisual();

    if (window.App && typeof App.syncActiveHandoutDoc === 'function') {
      App.syncActiveHandoutDoc(this.currentDocumentMarkdown);
    }
  },

  getMarkdown() {
    return this.currentDocumentMarkdown || '';
  },

  renderVisual() {
    const visualView = document.getElementById('handout-visual-view');
    if (!visualView) return;

    if (!this.currentDocumentMarkdown.trim()) {
      visualView.innerHTML = `
        <div class="py-16 text-center text-slate-400">
          <svg class="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          <p class="font-bold text-xs text-slate-600">No handout loaded yet</p>
          <p class="text-[10px] text-slate-400 mt-1">Upload a PDF/Word file or paste lesson notes to view auto-formatted tables and text.</p>
        </div>
      `;
      return;
    }

    try {
      if (typeof marked !== 'undefined') {
        visualView.innerHTML = marked.parse(this.currentDocumentMarkdown);
      } else {
        visualView.innerText = this.currentDocumentMarkdown;
      }
    } catch (e) {
      console.error("Marked rendering error:", e);
      visualView.innerText = this.currentDocumentMarkdown;
    }
  },

  async parseDocx(file) {
    if (typeof mammoth === 'undefined') {
      throw new Error("Mammoth DOCX parser library not loaded.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    if (typeof TurndownService !== 'undefined') {
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced'
      });

      if (typeof turndownPluginGfm !== 'undefined' && turndownPluginGfm.gfm) {
        turndownService.use(turndownPluginGfm.gfm);
      }

      return turndownService.turndown(html);
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.innerText;
  },

  async parsePdf(file) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error("PDF.js library not loaded.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    let fullPdfMarkdown = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const pageText = await this.structurePdfPage(page);
      if (pageText.trim()) {
        fullPdfMarkdown += `\n\n${pageText}\n\n`;
      }
    }

    return fullPdfMarkdown;
  },

  async structurePdfPage(page) {
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;

    const items = textContent.items;
    if (!items || items.length === 0) return '';

    // Filter out top 8% and bottom 8% headers/footers coordinates & known noise
    const validItems = items.filter(item => {
      const str = item.str.trim();
      if (!str) return false;

      const y = item.transform[5];
      // Top 7% header zone
      if (y >= pageHeight * 0.93) {
        if (/STI|IT\d+|Handout|Page\s*\d+/i.test(str)) return false;
      }
      // Bottom 7% footer zone
      if (y <= pageHeight * 0.07) {
        if (/Property\s*of\s*STI|student\.feedback|Page\s*\d+|Handout\s*\d+/i.test(str)) return false;
      }

      return true;
    });

    // Multi-Column Splitter: analyze X midpoint
    const midX = (pageWidth || 612) / 2;
    let leftItems = [];
    let rightItems = [];
    let fullWidthHeaders = [];

    validItems.forEach(item => {
      const x = item.transform[4];
      const width = item.width || 0;

      if (item.transform[5] > pageHeight * 0.85 && width > midX * 0.9) {
        fullWidthHeaders.push(item);
      } else if (x + width / 2 < midX) {
        leftItems.push(item);
      } else {
        rightItems.push(item);
      }
    });

    const isMultiColumn = leftItems.length > 5 && rightItems.length > 5;
    let outputSections = [];

    if (fullWidthHeaders.length > 0) {
      const headerText = this.buildLinesFromItems(fullWidthHeaders);
      if (headerText) outputSections.push(headerText);
    }

    if (isMultiColumn) {
      const leftCol = this.buildLinesFromItems(leftItems);
      if (leftCol) outputSections.push(leftCol);
      const rightCol = this.buildLinesFromItems(rightItems);
      if (rightCol) outputSections.push(rightCol);
    } else {
      const fullText = this.buildLinesFromItems(validItems);
      if (fullText) outputSections.push(fullText);
    }

    return outputSections.join('\n\n');
  },

  buildLinesFromItems(items) {
    if (!items || items.length === 0) return '';

    const lineMap = new Map();
    const Y_TOLERANCE = 3.5;

    items.forEach(item => {
      const str = item.str;
      if (!str.trim() && str !== ' ') return;

      const y = item.transform[5];
      let matchedY = null;

      for (let existingY of lineMap.keys()) {
        if (Math.abs(existingY - y) <= Y_TOLERANCE) {
          matchedY = existingY;
          break;
        }
      }

      if (matchedY === null) {
        matchedY = y;
        lineMap.set(matchedY, []);
      }

      lineMap.get(matchedY).push({
        text: str,
        x: item.transform[4],
        width: item.width || (str.length * 6),
        height: item.height || item.transform[0] || 12,
        fontName: item.fontName || ''
      });
    });

    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
    let parsedLines = [];
    let potentialTableRows = [];

    sortedY.forEach(y => {
      const lineItems = lineMap.get(y);
      lineItems.sort((a, b) => a.x - b.x);

      let columns = [];
      let currentCell = '';
      let lastXEnd = null;
      let maxHeight = 0;
      let isBold = false;

      lineItems.forEach(item => {
        if (item.height > maxHeight) maxHeight = item.height;
        if (/bold|black|heavy|medium/i.test(item.fontName)) isBold = true;

        const str = item.text;
        const itemX = item.x;
        const itemW = item.width;
        const gap = lastXEnd !== null ? itemX - lastXEnd : 0;

        if (lastXEnd !== null && gap >= 15) {
          if (currentCell.trim()) {
            columns.push(currentCell.trim().replace(/\s+/g, ' '));
          }
          currentCell = str;
        } else if (lastXEnd !== null && gap <= 3) {
          currentCell += str;
        } else {
          currentCell += (currentCell.length > 0 && !currentCell.endsWith(' ') && !str.startsWith(' ') ? ' ' : '') + str;
        }

        lastXEnd = itemX + itemW;
      });

      if (currentCell.trim()) {
        columns.push(currentCell.trim().replace(/\s+/g, ' '));
      }

      if (columns.length === 0) return;

      const fullLineText = columns.join(' ').trim();
      if (/^Figure\s*\d+[\.\:]/i.test(fullLineText)) return;

      const isHeaderRow = /^(?:Col\s*or|Color|R\s*G\s*B|RGB|Stage|Pipeline|Attribute|Buffer|Properties)\b/i.test(fullLineText);
      const isDataRow = columns.length >= 3 && columns.slice(1).some(c => /^[\d\.]+|[A-Z]$/.test(c));
      const isTableRow = columns.length >= 3 || (columns.length >= 2 && (isHeaderRow || isDataRow));

      if (isTableRow) {
        const cleanedCols = columns.map(c => 
          c.replace(/Col\s+or/i, 'Color')
           .replace(/Gre\s+e\s+n/i, 'Green')
           .replace(/V\s+i\s+olet/i, 'Violet')
           .replace(/0\s*\.\s*5/g, '0.5')
           .replace(/0\s*\.\s*2/g, '0.2')
        );
        potentialTableRows.push(cleanedCols);
        return;
      } else if (potentialTableRows.length > 0) {
        parsedLines.push(this.formatMarkdownTable(potentialTableRows));
        potentialTableRows = [];
      }

      if (/^(?:Core\s*Concepts|The\s*Graphics\s*Pipeline|Introduction\s*to\s*.*|Summary|Overview|Architecture)$/i.test(fullLineText)) {
        parsedLines.push(`\n## ${fullLineText}\n`);
      } else if (/^Stage\s*\d+\s*[:\-]/i.test(fullLineText)) {
        parsedLines.push(`\n### ${fullLineText}\n`);
      } else if (maxHeight >= 16 && fullLineText.length < 80) {
        parsedLines.push(`\n# ${fullLineText}\n`);
      } else if (maxHeight >= 13.5 && fullLineText.length < 80 && isBold) {
        parsedLines.push(`\n## ${fullLineText}\n`);
      } else if (/^[\u2022\u25E6\u2023\u2219\-\*]\s*/.test(fullLineText)) {
        const cleanedBullet = fullLineText.replace(/^[\u2022\u25E6\u2023\u2219\-\*]\s*/, '').trim();
        const formattedBullet = cleanedBullet.replace(/^([A-Za-z0-9\s\/\(\)\-]+)(\s*[–\-\:]\s*)/, '**$1**$2');
        parsedLines.push(`- ${formattedBullet}`);
      } else if (/^\d+[\.\)]\s+/.test(fullLineText)) {
        parsedLines.push(fullLineText);
      } else {
        parsedLines.push(fullLineText);
      }
    });

    if (potentialTableRows.length > 0) {
      parsedLines.push(this.formatMarkdownTable(potentialTableRows));
    }

    return parsedLines.join('\n\n');
  },

  formatMarkdownTable(rows) {
    if (!rows || rows.length === 0) return '';
    const maxCols = Math.max(...rows.map(r => r.length));
    if (maxCols < 2) return rows.map(r => r.join(' ')).join('\n');

    let md = '\n\n';
    rows.forEach((row, idx) => {
      while (row.length < maxCols) row.push(' ');
      md += '| ' + row.map(c => c.trim()).join(' | ') + ' |\n';
      if (idx === 0) {
        md += '| ' + row.map(() => '---').join(' | ') + ' |\n';
      }
    });
    return md + '\n';
  },

  cleanHandoutText(text) {
    if (!text) return '';

    let cleaned = text;

    // 1. Remove References / Bibliography
    cleaned = cleaned.replace(/(?:^|\n)(?:#*\s*References\s*:?|#*\s*Bibliography\s*:?|References\s*[:\n])[\s\S]*$/i, '');

    // 2. Remove Footers & Headers
    const noisePatterns = [
      /^\s*\*?\s*Property\s*of\s*STI\s*\*?.*$/gim,
      /^\s*\d+\s*Handout\s*\d+.*$/gim,
      /^\s*student\.feedback@sti\.edu.*$/gim,
      /^\s*Page\s*\d+\s*(?:of|\/)\s*\d+.*$/gim,
      /^\s*Page\s*\d+\s*$/gim,
      /^\s*##?\s*Page\s*\d+\s*$/gim,
      /^\s*STI\s+IT\d+.*$/gim,
      /^\s*Figure\s*\d+[\.\:].*$/gim
    ];

    noisePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // 3. Auto-detect & Repair Color/RGB Tables
    cleaned = cleaned.replace(/(?:^|\n)\s*(?:Col\s*or|Color)\s+R\s+G\s+B\s*\n([\s\S]*?)(?=\n\s*\n[A-Z]|\n\s*##|\n\s*The\s+quality|\n\s*A\s+buffer|$)/i, (match, body) => {
      const lines = body.trim().split('\n').filter(l => l.trim());
      let tableMd = '\n\n| Color | R | G | B |\n| --- | --- | --- | --- |\n';
      lines.forEach(line => {
        let normLine = line.trim()
          .replace(/Col\s+or/i, 'Color')
          .replace(/Gre\s+e\s+n/i, 'Green')
          .replace(/V\s+i\s+olet/i, 'Violet')
          .replace(/(\d)\s*\.\s*(\d)/g, '$1.$2')
          .replace(/(\d)\s*\.\s+/g, '$1. ');

        const parts = normLine.split(/\s+/);
        if (parts.length >= 4) {
          tableMd += `| ${parts[0]} | ${parts[1]} | ${parts[2]} | ${parts[3]} |\n`;
        } else if (parts.length === 2 && parts[0].toLowerCase() === 'black') {
          tableMd += `| Black | 0 | 0 | 0 |\n`;
        }
      });
      return tableMd + '\n';
    });

    // 4. Clean multiple redundant blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    return cleaned;
  },

  async parseText(file) {
    return await file.text();
  },

  getAIPrompt(markdownContent) {
    const promptType = document.getElementById('ai-prompt-type')?.value || 'master-80';
    const subject = window.App?.activeExam?.subject || 'Subject';
    const handoutName = window.App?.activeExam?.handoutName || 'Handout';

    let targetCount = '80+ minimum (aim for 80 to 100+ questions)';
    let focusNote = 'Extract questions from EVERY single fact, definition, bullet point, table cell/row, acronym, and pipeline stage so the student can memorize and master 100% of the handout.';

    if (promptType === 'intensive-50') {
      targetCount = '50+ minimum';
      focusNote = 'Cover all main concepts, definitions, bullet points, stages, and tables comprehensively.';
    } else if (promptType === 'board-exam-hard') {
      targetCount = '40 to 50 questions';
      focusNote = 'Focus on tricky scenarios, application-based problems, which-is-NOT true questions, and board exam difficulty.';
    } else if (promptType === 'standard-30') {
      targetCount = '30 questions';
      focusNote = 'Provide a balanced assessment covering all major chapters and sections.';
    }

    const instruction = `You are a master academic examiner. Carefully and thoroughly read the ENTIRE handout/notes provided below about "${subject} - ${handoutName}".

OBJECTIVE:
Generate a comprehensive, high-volume multiple-choice exam questionnaire containing a ${targetCount}.
${focusNote}

CRITICAL RULES:
1. STRICTLY BASE EVERYTHING ON THE PROVIDED HANDOUT: Do NOT invent or pull outside unmentioned facts.
2. FULL COVERAGE FOR MEMORIZATION:
   - Turn every technical definition into questions (e.g. computer graphics, raster, pixels, resolution, precision, framebuffer, color buffer, depth buffer, stencil buffer, frame, FPS, GPU, shaders, API, GLSL, HLSL, Metal, graphics pipeline, primitive assembly, fragment, vertex attributes, VBOs, VAOs).
   - Turn EVERY table entry into questions (e.g. RGB color values of Red, Orange, Yellow, Green, Blue, Violet, Black, White, Gray, Brown, Pink, Cyan).
   - Turn every bullet item and stage into questions.
3. EXACT PARSER FORMAT REQUIREMENT:
   You MUST output the questionnaire in this EXACT format so our automated Exam Maker software can parse it directly without any errors:

1. [Question text here]?
A. [Choice 1]
B. [Choice 2]
C. [Choice 3]
D. [Choice 4]

2. [Question text here]?
A. [Choice 1]
B. [Choice 2]
C. [Choice 3]
D. [Choice 4]

[Continue consecutively for all ${targetCount} items...]

ANSWERS:
1. [Correct Letter: A, B, C, or D]
2. [Correct Letter: A, B, C, or D]
[Continue for all questions...]

IMPORTANT:
- Every question must have exactly 4 choices labeled A., B., C., D. (each on its own new line).
- The ANSWERS section must be at the very bottom, titled "ANSWERS:" followed by "1. A", "2. B", etc.
- Do NOT wrap your output in markdown codeblocks (no \`\`\` text).
- Do NOT include introductory greetings or concluding conversational filler. Start immediately with "1. ".`;

    return `${instruction}\n\n========================================\nHANDOUT / LESSON NOTES:\n========================================\n\n${markdownContent}`;
  },

  async copyPromptToClipboard() {
    const text = this.getMarkdown();
    if (!text.trim()) {
      if (typeof showMessage === 'function') {
        showMessage('Please load or paste a handout first before copying AI prompt.');
      }
      return;
    }

    const fullPrompt = this.getAIPrompt(text);
    try {
      await navigator.clipboard.writeText(fullPrompt);
      if (typeof showMessage === 'function') {
        showMessage('🔥 80+ AI Master Prompt copied to clipboard! Paste it to ChatGPT/Claude.');
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  }
};
