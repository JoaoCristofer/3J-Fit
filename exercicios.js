import { supabase } from "./supabase.js";

/* =========================
   ELEMENTOS
========================= */
const lista = document.getElementById("listaExercicios");
const modal = document.getElementById("modalExercicio");
const form = document.getElementById("formExercicio");
const fechar = document.getElementById("fecharModal");
const btnNovo = document.getElementById("btnNovoExercicio");
const tituloModal = document.getElementById("tituloModal");
const inputPesquisa = document.getElementById("pesquisaExercicio");

/* =========================
   CARREGAR EXERCÍCIOS
========================= */
async function carregarExercicios(filtroNome = "") {
  let query = supabase
    .from("exercicios")
    .select("*")
    .order("nome_exercicio", { ascending: true }); // 🔤 ordem alfabética

  if (filtroNome) {
    query = query.ilike("nome_exercicio", `%${filtroNome}%`); // 🔎 pesquisa
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao carregar exercícios:", error);
    return;
  }

  lista.innerHTML = "";

  data.forEach(ex => {
    const card = document.createElement("div");
    card.className = "card-exercicio";

    card.innerHTML = `
      <h3>${ex.nome_exercicio}</h3>
      <p>${ex.grupo_muscular || "—"}</p>
      <p>${ex.descricao || ""}</p>
      <button class="editar" onclick="editarExercicio(${ex.id_exercicio})">
        Editar
      </button>
      <button class="excluir" onclick="excluirExercicio(${ex.id_exercicio})">
        Excluir
      </button>
    `;

    lista.appendChild(card);
  });
}

/* =========================
   PESQUISA POR NOME
========================= */
if (inputPesquisa) {
  inputPesquisa.addEventListener("input", (e) => {
    const valor = e.target.value.trim();
    carregarExercicios(valor);
  });
}

/* =========================
   NOVO EXERCÍCIO
========================= */
btnNovo.onclick = () => {
  form.reset();
  document.getElementById("id_exercicio").value = "";
  tituloModal.textContent = "Novo Exercício";
  modal.style.display = "flex";
};

fechar.onclick = () => {
  modal.style.display = "none";
};

/* =========================
   SALVAR (CRIAR / EDITAR)
========================= */
form.onsubmit = async (e) => {
  e.preventDefault();

  const id = document.getElementById("id_exercicio").value;

  const exercicio = {
    nome_exercicio: document.getElementById("nome_exercicio").value,
    grupo_muscular: document.getElementById("grupo_muscular").value || null,
    descricao: document.getElementById("descricao").value || null
  };

  let error;

  if (id) {
    ({ error } = await supabase
      .from("exercicios")
      .update(exercicio)
      .eq("id_exercicio", id));
  } else {
    ({ error } = await supabase
      .from("exercicios")
      .insert([exercicio]));
  }

  if (error) {
    alert("Erro ao salvar exercício.");
    console.error(error);
    return;
  }

  modal.style.display = "none";
  carregarExercicios();
};

/* =========================
   EDITAR
========================= */
window.editarExercicio = async function (id) {
  const { data, error } = await supabase
    .from("exercicios")
    .select("*")
    .eq("id_exercicio", id)
    .single();

  if (error) {
    alert("Erro ao buscar exercício.");
    console.error(error);
    return;
  }

  document.getElementById("id_exercicio").value = data.id_exercicio;
  document.getElementById("nome_exercicio").value = data.nome_exercicio;
  document.getElementById("grupo_muscular").value = data.grupo_muscular || "";
  document.getElementById("descricao").value = data.descricao || "";

  tituloModal.textContent = "Editar Exercício";
  modal.style.display = "flex";
};

/* =========================
   EXCLUIR
========================= */
window.excluirExercicio = async function (id) {
  if (!confirm("Deseja realmente excluir este exercício?")) return;

  const { error } = await supabase
    .from("exercicios")
    .delete()
    .eq("id_exercicio", id);

  if (error) {
    alert("Erro ao excluir exercício.");
    console.error(error);
    return;
  }

  carregarExercicios();
};

/* =========================
   FECHAR MODAL AO CLICAR FORA
========================= */
window.onclick = (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
};

/* =========================
   INIT
========================= */
carregarExercicios();
