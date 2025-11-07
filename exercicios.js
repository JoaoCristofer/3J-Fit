const SUPABASE_URL = "https://zcgretxaftcwukkzbxfo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZ3JldHhhZnRjd3Vra3pieGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTQ1MjgsImV4cCI6MjA3NjE3MDUyOH0.x-u14dOI1Q9Opg6TfTD628p3gwqpgfO9IqgCcS3Mc6U";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const lista = document.getElementById("listaExercicios");
const modal = document.getElementById("modalExercicio");
const form = document.getElementById("formExercicio");
const fechar = document.getElementById("fecharModal");
const btnNovo = document.getElementById("btnNovoExercicio");
const tituloModal = document.getElementById("tituloModal");

async function carregarExercicios() {
  const { data, error } = await supabase.from("exercicios").select("*").order("id_exercicio", { ascending: true });
  if (error) {
    console.error("Erro ao carregar exercícios:", error);
    return;
  }

  lista.innerHTML = "";
  data.forEach(ex => {
    const card = document.createElement("div");
    card.classList.add("card-exercicio");
    card.innerHTML = `
      <h3>${ex.nome_exercicio}</h3>
      <p>${ex.grupo_muscular || "—"}</p>
      <p>${ex.descricao || ""}</p>
      <button class="editar" onclick="editarExercicio(${ex.id_exercicio})">Editar</button>
      <button class="excluir" onclick="excluirExercicio(${ex.id_exercicio})">Excluir</button>
    `;
    lista.appendChild(card);
  });
}

btnNovo.onclick = () => {
  form.reset();
  tituloModal.textContent = "Novo Exercício";
  modal.style.display = "flex";
};

fechar.onclick = () => modal.style.display = "none";

form.onsubmit = async (e) => {
  e.preventDefault();
  const id = document.getElementById("id_exercicio").value;
  const ex = {
    nome_exercicio: document.getElementById("nome_exercicio").value,
    grupo_muscular: document.getElementById("grupo_muscular").value || null,
    descricao: document.getElementById("descricao").value || null
  };

  if (id) {
    const { error } = await supabase.from("exercicios").update(ex).eq("id_exercicio", id);
    if (error) return alert("Erro ao atualizar exercício.");
  } else {
    const { error } = await supabase.from("exercicios").insert([ex]);
    if (error) return alert("Erro ao adicionar exercício.");
  }

  modal.style.display = "none";
  carregarExercicios();
};

async function editarExercicio(id) {
  const { data, error } = await supabase.from("exercicios").select("*").eq("id_exercicio", id).single();
  if (error) return alert("Erro ao buscar exercício.");

  document.getElementById("id_exercicio").value = data.id_exercicio;
  document.getElementById("nome_exercicio").value = data.nome_exercicio;
  document.getElementById("grupo_muscular").value = data.grupo_muscular || "";
  document.getElementById("descricao").value = data.descricao || "";
  tituloModal.textContent = "Editar Exercício";
  modal.style.display = "flex";
}

async function excluirExercicio(id) {
  if (!confirm("Deseja realmente excluir este exercício?")) return;
  const { error } = await supabase.from("exercicios").delete().eq("id_exercicio", id);
  if (error) return alert("Erro ao excluir exercício.");
  carregarExercicios();
}

window.onclick = (e) => {
  if (e.target === modal) modal.style.display = "none";
};

carregarExercicios();
