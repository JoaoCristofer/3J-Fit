import { supabase } from "./supabase.js";
import { setAlunoAtual } from "./alunoContext.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id"); // id_aluno

const infoAluno = document.getElementById("infoAluno");
const btnEditar = document.getElementById("btnEditar");
const btnExcluir = document.getElementById("btnExcluir");
const btnNovoTreino = document.getElementById("btnNovoTreino");
const btnDesempenho = document.getElementById("btnDesempenho");
const btnTreinos = document.getElementById("btnTreinos");

async function carregarDetalhes() {
  if (!id) {
    infoAluno.innerHTML = `<p>Aluno não especificado.</p>`;
    return;
  }

  const { data, error } = await supabase
    .from("alunos")
    .select("*")
    .eq("id_aluno", id)
    .single();

  if (error) {
    infoAluno.innerHTML = `<p>Erro ao carregar aluno.</p>`;
    console.error(error);
    return;
  }

  infoAluno.innerHTML = `
    <p><strong>Nome:</strong> <span id="nomeTxt">${data.nome}</span></p>
    <p><strong>Idade:</strong> <span id="idadeTxt">${data.idade ?? "Não informada"}</span></p>
    <p><strong>Sexo:</strong> <span id="sexoTxt">${data.sexo ?? "Não informado"}</span></p>
    <p><strong>Informações:</strong> <span id="infoTxt">${data.informacoes_pertinentes ?? "Nenhuma"}</span></p>
  `;
}

// --- EDITAR (abre prompts simples e atualiza) ---
btnEditar.onclick = async () => {
  try {
    // carregar valores atuais do DOM
    const nomeAtual = document.getElementById("nomeTxt").textContent;
    const idadeAtual = document.getElementById("idadeTxt").textContent;
    const sexoAtual = document.getElementById("sexoTxt").textContent;
    const infoAtual = document.getElementById("infoTxt").textContent;

    const novoNome = prompt("Nome:", nomeAtual) ?? nomeAtual;
    const novaIdadeRaw = prompt("Idade (número):", idadeAtual === "Não informada" ? "" : idadeAtual);
    const novaIdade = novaIdadeRaw === "" ? null : Number(novaIdadeRaw);
    const novoSexo = prompt("Sexo (M/F ou Masculino/Feminino):", sexoAtual === "Não informado" ? "" : sexoAtual) ?? sexoAtual;
    const novaInfo = prompt("Informações pertinentes:", infoAtual === "Nenhuma" ? "" : infoAtual) ?? infoAtual;

    // validações simples
    if (!novoNome || novoNome.trim() === "") return alert("Nome não pode ficar vazio.");

    const updates = {
      nome: novoNome.trim(),
      idade: Number.isFinite(novaIdade) ? novaIdade : null,
      sexo: novoSexo ? novoSexo : null,
      informacoes_pertinentes: novaInfo ? novaInfo : null,
    };

    const { error } = await supabase
      .from("alunos")
      .update(updates)
      .eq("id_aluno", id);

    if (error) {
      console.error(error);
      alert("Erro ao atualizar aluno.");
      return;
    }

    alert("Aluno atualizado com sucesso.");
    carregarDetalhes();
  } catch (err) {
    console.error(err);
    alert("Erro inesperado.");
  }
};

// --- EXCLUIR ---
btnExcluir.onclick = async () => {
  if (!confirm("Tem certeza que deseja excluir este aluno? Essa ação remove também os treinos relacionados.")) return;

  const { error } = await supabase
    .from("alunos")
    .delete()
    .eq("id_aluno", id);

  if (error) {
    console.error(error);
    alert("Erro ao excluir o aluno.");
    return;
  }

  alert("Aluno excluído.");
  window.location.href = "alunos.html";
};

// --- Navegações ---
btnNovoTreino.onclick = () => {
  window.location.href = `novo_treino.html?id=${id}`;
};
btnDesempenho.onclick = () => {
  window.location.href = `desempenho.html?id=${id}`;
};
btnTreinos.onclick = () => {
  setAlunoAtual(Number(id));
  window.location.href = `treinos_anteriores.html?id=${id}`;
};


carregarDetalhes();
