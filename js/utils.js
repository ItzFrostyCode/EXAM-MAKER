function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

function showMessage(msg) {
  alert(msg); // pwede mo palitan ng toast later
}