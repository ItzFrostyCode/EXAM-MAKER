const LibraryManager = {
  files: [],
  db: null,

  async init() {
    await this.initDB();
    this.render();
    this.setupEventListeners();
  },

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('StudyLibraryDB', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        this.loadFiles().then(resolve).catch(reject);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async loadFiles() {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const transaction = this.db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.getAll();
      request.onsuccess = () => {
        this.files = request.result || [];
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  async saveFile(fileData) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const transaction = this.db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const request = store.put(fileData);
      request.onsuccess = () => {
        // upsert into in-memory list (replace if exists)
        const idx = this.files.findIndex(f => f.id === fileData.id);
        if (idx >= 0) {
          this.files[idx] = fileData;
        } else {
          this.files.push(fileData);
        }
        this.render();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  async deleteFile(id) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const transaction = this.db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const request = store.delete(id);
      request.onsuccess = () => {
        this.files = this.files.filter(f => f.id !== id);
        this.render();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  setupEventListeners() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('library-file-input');
    const triggerBtn = document.getElementById('trigger-upload');
    const searchInput = document.getElementById('library-search');
    const grid = document.getElementById('library-files-grid');

    if (triggerBtn && fileInput) {
      triggerBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          this.handleFileUpload(e.target.files);
          // clear input so same file can be re-added if needed
          e.target.value = '';
        }
      });
    }

    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          this.handleFileUpload(e.dataTransfer.files);
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.render(e.target.value || '');
      });
    }

    // Event delegation for file-grid actions (preview, download, delete)
    if (grid) {
      grid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (!id || !action) return;

        switch (action) {
          case 'delete':
            // confirm before deleting (optional)
            if (confirm('Delete this file?')) {
              this.deleteFile(id).catch(err => console.error('Delete failed', err));
            }
            break;
          case 'preview':
            this.previewFile(id);
            break;
          case 'download':
            this.downloadFile(id);
            break;
        }
      });
    }
  },

  async handleFileUpload(filesList) {
    const list = Array.from(filesList || []);
    for (const file of list) {
      // defensive guard for file object
      if (!file || !file.name) continue;

      const reader = new FileReader();
      const fileType = file.type || '';
      const readAsDataURL = fileType.includes('image') || fileType.includes('pdf');

      // wrap FileReader with promise for clearer flow
      const content = await new Promise((resolve, reject) => {
        reader.onerror = () => reject(reader.error);
        reader.onload = () => resolve(reader.result);
        try {
          if (readAsDataURL) {
            reader.readAsDataURL(file);
          } else {
            reader.readAsText(file);
          }
        } catch (err) {
          reject(err);
        }
      }).catch((err) => {
        console.error('File read error', err);
        return null;
      });

      if (content == null) continue;

      const fileData = {
        id: 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
        name: file.name,
        type: file.type || '',
        size: file.size || 0,
        content,
        date: new Date().toISOString()
      };

      // await storing in DB
      try {
        await this.saveFile(fileData);
      } catch (err) {
        console.error('Failed to save file', err);
      }
    }
  },

  render(searchTerm = '') {
    const grid = document.getElementById('library-files-grid');
    if (!grid) return;

    const normalized = (searchTerm || '').toLowerCase();
    const filtered = this.files.filter(f =>
      (f.name || '').toLowerCase().includes(normalized)
    );

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400">
          <p class="text-sm">No files found.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(file => {
      const sizeKB = ((file.size || 0) / 1024).toFixed(1);
      const dateLabel = file.date ? new Date(file.date).toLocaleDateString() : '';
      return `
      <div class="file-card bg-white border border-slate-200 p-4 relative group">
        <div class="flex items-start justify-between mb-3">
          <div class="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500">
            ${this.getFileIcon(file.type)}
          </div>
          <button data-action="delete" data-id="${file.id}" class="text-slate-300 hover:text-red-500 transition-colors" title="Delete file">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
        <div>
          <h3 class="text-xs font-bold text-slate-800 break-words line-clamp-2" title="${this._escapeHtml(file.name)}">${this._escapeHtml(file.name)}</h3>
          <p class="text-[9px] text-slate-400 mt-1 uppercase tracking-widest">${sizeKB} KB • ${this._escapeHtml(dateLabel)}</p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
          <button data-action="preview" data-id="${file.id}" class="text-[10px] font-black text-sky-500 uppercase tracking-widest hover:underline">Preview</button>
          <button data-action="download" data-id="${file.id}" class="text-slate-400 hover:text-slate-600 transition-colors" title="Download">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          </button>
        </div>
      </div>
      `;
    }).join('');
  },

  getFileIcon(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('pdf')) return '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>';
    if (t.includes('image')) return '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
    return '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
  },

  previewFile(id) {
    const file = this.files.find(f => f.id === id);
    if (!file) return;

    const w = window.open('', '_blank');
    if (!w) {
      alert('Popup blocked — please allow popups for this site to preview files.');
      return;
    }

    // if data URL (images/pdf) just embed iframe/img
    const t = (file.type || '').toLowerCase();
    if (file.content && (file.content.startsWith('data:') || t.includes('image') || t.includes('pdf'))) {
      // embed via iframe (pdf or data URL) or image tag for images
      if (t.includes('image')) {
        w.document.write(`<img src="${file.content}" alt="${this._escapeHtml(file.name)}" style="max-width:100%;height:auto;display:block;margin:0 auto;padding:12px;">`);
      } else {
        w.document.write(`<iframe src="${file.content}" frameborder="0" style="width:100%;height:100vh;"></iframe>`);
      }
    } else {
      // text fallback
      const safeText = this._escapeHtml(String(file.content || ''));
      w.document.write(`<pre style="padding: 20px; font-family: monospace; white-space: pre-wrap;">${safeText}</pre>`);
    }
    w.document.close();
  },

  downloadFile(id) {
    const file = this.files.find(f => f.id === id);
    if (!file) return;

    const link = document.createElement('a');
    let objectUrl = null;

    if (typeof file.content === 'string' && file.content.startsWith('data:')) {
      // direct data URL (images, pdf)
      link.href = file.content;
    } else {
      // create blob for text or base64 decoding if needed
      const mime = file.type || 'application/octet-stream';
      const data = typeof file.content === 'string' ? file.content : String(file.content || '');
      const blob = new Blob([data], { type: mime });
      objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
    }

    link.download = file.name || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (objectUrl) {
      // free memory
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    }
  },

  // small helper to escape text used inside HTML
  _escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};