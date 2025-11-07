// ==========================
// CONFIGURAÇÃO SUPABASE
// ==========================
const SUPABASE_URL = 'https://zcgretxaftcwukkzbxfo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZ3JldHhhZnRjd3Vra3pieGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTQ1MjgsImV4cCI6MjA3NjE3MDUyOH0.x-u14dOI1Q9Opg6TfTD628p3gwqpgfO9IqgCcS3Mc6U';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================
// FUNÇÕES GERAIS
// ==========================

// Detectar página atual
const pagina = window.location.pathname.split('/').pop();

if (pagina === 'alunos.html') iniciarPaginaAlunos();

// ==========================
// PÁGINA DE ALUNOS
// ==========================
async function iniciarPaginaAlunos() {
  const lista = document.getElementById('lista-alunos');
  const novoAlunoBtn = document.getElementById('novoAlunoBtn');
  const modal = document.getElementById('modalAluno');
  const form = document.getElementById('formAluno');
  const cancelar = document.getElementById('cancelarAluno');

  // --- Listar alunos ---
  async function carregarAlunos() {
    lista.innerHTML = '<p>Carregando...</p>';
    const { data, error } = await supabase.from('alunos').select('*').order('id_aluno', { ascending: false });

    if (error) {
      lista.innerHTML = '<p>Erro ao carregar alunos.</p>';
      console.error(error);
      return;
    }

    if (!data || data.length === 0) {
      lista.innerHTML = '<p>Nenhum aluno cadastrado.</p>';
      return;
    }

    lista.innerHTML = '';
    data.forEach((a) => {
      const li = document.createElement('li');
      li.classList.add('item');
      li.innerHTML = `
        <div>
          <strong>${a.nome}</strong><br>
          <small>${a.idade ? a.idade + ' anos' : ''} ${a.sexo || ''}</small>
        </div>
        <button class="btn secondary" onclick="abrirAluno(${a.id_aluno})">Abrir</button>
      `;
      lista.appendChild(li);
    });
  }

  // --- Abrir modal ---
  novoAlunoBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });
  cancelar.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // --- Salvar aluno ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nome').value.trim();
    const idade = document.getElementById('idade').value;
    const sexo = document.getElementById('sexo').value;
    const informacoes = document.getElementById('informacoes').value.trim();

    if (!nome) return alert('Digite o nome do aluno.');

    const { error } = await supabase.from('alunos').insert([
      { nome, idade: idade ? Number(idade) : null, sexo, informacoes_pertinentes: informacoes },
    ]);

    if (error) {
      console.error(error);
      alert('Erro ao salvar aluno.');
      return;
    }

    form.reset();
    modal.style.display = 'none';
    carregarAlunos();
  });

  await carregarAlunos();
}

// Redirecionar para a página do aluno
function abrirAluno(id) {
  window.location = `aluno_detalhe.html?id=${id}`;
}
// fecha modal quando clicar no overlay (fora do modal-content)
modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.style.display = 'none'; });
