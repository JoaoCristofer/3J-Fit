// alunoContext.js

const KEY = "aluno_atual_id";

export function setAlunoAtual(id) {
  if (!id || isNaN(id)) return;
  localStorage.setItem(KEY, String(id));
}

export function getAlunoAtual() {
  const id = localStorage.getItem(KEY);
  return id && !isNaN(id) ? Number(id) : null;
}

export function clearAlunoAtual() {
  localStorage.removeItem(KEY);
}
