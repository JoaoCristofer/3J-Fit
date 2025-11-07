const SUPABASE_URL = "https://zcgretxaftcwukkzbxfo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZ3JldHhhZnRjd3Vra3pieGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTQ1MjgsImV4cCI6MjA3NjE3MDUyOH0.x-u14dOI1Q9Opg6TfTD628p3gwqpgfO9IqgCcS3Mc6U";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const lista = document.getElementById("listaAlunos");
const modal = document.getElementById("modalAluno");
const form = document.getElementById("formAluno");
const btnNovo = document.getElementById("btnNovoAluno");
const btnFechar = document.getElementById("fecharModal");
const btnVoltar = document.getElementById("btnVoltar");

btnVoltar.onclick = () => (window.location.href = "index.html");

// Função para listar os alunos
async function carregarAlunos() {
  const { data, error } = await supabase.from("alunos").select("*").order("id_aluno", { ascending: false });
  if (error) {
    console.error("Erro ao carregar alunos:", error);
    return;
  }

  lista.innerHTML = "";

  data.forEach((aluno) => {
    const card = document.createElement("div");
    card.className = "card-aluno";
    card.innerHTML = `
      <h3>${aluno.nome}</h3>
      <p>${aluno.idade ? aluno.idade + " anos" : ""}</p>
      <p>${aluno.sexo || ""}</p>
      <button data-id="${aluno.id_aluno}" class="detalhes">Ver Detalhes</button>
    `;
    lista.appendChild(card);
  });

  document.querySelectorAll(".detalhes").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      // Aqui a navegação é segura e não dá erro 404
      window.location.assign(`aluno_detalhe.html?id=${id}`);
    });
  });
}

// Modal
btnNovo.onclick = () => (modal.style.display = "flex");
btnFechar.onclick = () => (modal.style.display = "none");

// Formulário
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const novoAluno = {
    nome: form.nome.value,
    idade: form.idade.value ? parseInt(form.idade.value) : null,
    sexo: form.sexo.value || null,
    informacoes_pertinentes: form.informacoes.value || null,
  };

  const { error } = await supabase.from("alunos").insert([novoAluno]);
  if (error) {
    alert("Erro ao salvar aluno!");
    console.error(error);
  } else {
    modal.style.display = "none";
    form.reset();
    carregarAlunos();
  }
});

carregarAlunos();
