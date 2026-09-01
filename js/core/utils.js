/**
 * Core Utilities: ID generation and UI alerts.
 */

function generateId() {
  return 'exam_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

function showMessage(msg, duration = 2500) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'fixed bottom-6 right-6 z-50 bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-12 opacity-0 flex items-center gap-2 border border-slate-700 pointer-events-none';
    document.body.appendChild(toast);
  }
  
  toast.innerHTML = `
    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
    <span>${msg}</span>
  `;
  
  toast.classList.remove('translate-y-12', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');
  
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-12', 'opacity-0');
  }, duration);
}
