// novo_treino.js
import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     PARAMS / ELEMENTOS
  ========================= */
  const params = new URLSearchParams(window.location.search);
  const alunoId = params.get("id");

  const alunoIdDisplay = document.getElementById("alunoIdDisplay");
  const dataTreinoInput = document.getElementById("dataTreino");
  const observacoesGeraisEl = document.getElementById("observacoesGerais");
  const exerciciosWrapper = document.getElementById("exerciciosWrapper");
  const btnAddEx = document.getElementById("btnAddEx");
  const btnSalvar = document.getElementById("btnSalvar");
  const btnCancelar = document.getElementById("btnCancelar");
  const statusEl = document.getElementById("status");

  if (!alunoId) {
    statusEl.textContent = "Aluno não informado na URL (?id=...)";
    btnSalvar.disabled = true;
    btnAddEx.disabled = true;
    return;
  }

  alunoIdDisplay.textContent = alunoId;

  /* =========================
     DATA PADRÃO
  ========================= */
  const hoje = new Date();
  dataTreinoInput.value = hoje.toISOString().split("T")[0];

  /* =========================
     CATÁLOGO DE EXERCÍCIOS
  ========================= */
  let catalog = [];

  async function loadCatalog() {
    const { data, error } = await supabase
      .from("exercicios")
      .select("id_exercicio, nome_exercicio")
      .order("nome_exercicio");

    if (error) {
      console.error(error);
      alert("Erro ao carregar exercícios");
      return;
    }

    catalog = data || [];
  }

  /* =========================
     CRIAR EXERCÍCIO NO BANCO
  ========================= */
  async function criarNovoExercicio(nome) {
    const { data, error } = await supabase
      .from("exercicios")
      .insert([{ nome_exercicio: nome }])
      .select("id_exercicio, nome_exercicio")
      .single();

    if (error) throw error;

    catalog.push(data);
    return data;
  }

  /* =========================
     ATUALIZAR TODOS OS SELECTS
  ========================= */
  function atualizarSelects(novo) {
    document.querySelectorAll(".ex-block select").forEach(select => {
      const opt = document.createElement("option");
      opt.value = novo.id_exercicio;
      opt.textContent = novo.nome_exercicio;

      select.insertBefore(opt, select.lastElementChild);
    });
  }

  /* =========================
     BLOCO DE EXERCÍCIO
  ========================= */
  function createExerciseBlock() {
    const exBlock = document.createElement("div");
    exBlock.className = "ex-block";

const header = document.createElement("div");
header.className = "ex-header";

const select = document.createElement("select");
select.innerHTML = `
  <option value="">-- selecione um exercício --</option>
  ${catalog.map(e =>
    `<option value="${e.id_exercicio}">${e.nome_exercicio}</option>`
  ).join("")}
`;

const btnNovo = document.createElement("button");
btnNovo.type = "button";
btnNovo.textContent = "+ Criar exercício";
btnNovo.onclick = async () => {
  const nome = prompt("Nome do novo exercício:");
  if (!nome || !nome.trim()) return;

  try {
    const novo = await criarNovoExercicio(nome.trim());
    atualizarSelects(novo);
    select.value = novo.id_exercicio;
  } catch {
    alert("Erro ao criar exercício");
  }
};

header.append(select, btnNovo);
exBlock.appendChild(header);

    const seriesList = document.createElement("div");
    seriesList.className = "series-list";

    function addSerie() {
      const row = document.createElement("div");
      row.className = "series-row";

      const carga = document.createElement("input");
      carga.type = "number";
      carga.placeholder = "Carga (kg)";

      const reps = document.createElement("input");
      reps.type = "number";
      reps.placeholder = "Repetições";

      const obs = document.createElement("textarea");
      obs.placeholder = "Observações (opcional)";
      obs.rows = 1;

      const remover = document.createElement("button");
      remover.type = "button";
      remover.textContent = "Remover série";
      remover.onclick = () => row.remove();

      row.append(carga, reps, obs, remover);
      seriesList.appendChild(row);
    }

    addSerie();

    const btnAddSerie = document.createElement("button");
    btnAddSerie.type = "button";
    btnAddSerie.textContent = "+ Série";
    btnAddSerie.onclick = addSerie;

    const btnRemoveEx = document.createElement("button");
    btnRemoveEx.type = "button";
    btnRemoveEx.textContent = "Remover exercício";
    btnRemoveEx.onclick = () => exBlock.remove();

    exBlock.append(select, seriesList, btnAddSerie, btnRemoveEx);
    exerciciosWrapper.appendChild(exBlock);
  }

  /* =========================
     EVENTOS
  ========================= */
  btnAddEx.onclick = createExerciseBlock;

  btnCancelar.onclick = () => {
    window.location.href = `aluno_detalhe.html?id=${alunoId}`;
  };

  btnSalvar.onclick = async () => {
    try {
      btnSalvar.disabled = true;
      statusEl.textContent = "Salvando treino...";

      const { data: treino, error } = await supabase
        .from("treinos")
        .insert([{
          id_aluno_fk: Number(alunoId),
          data_treino: dataTreinoInput.value,
          observacoes_gerais: observacoesGeraisEl.value || null
        }])
        .select("id_treino")
        .single();

      if (error) throw error;

      const inserts = [];

      document.querySelectorAll(".ex-block").forEach(block => {
        const select = block.querySelector("select");
        const id_exercicio_fk = Number(select.value);
        if (!id_exercicio_fk || isNaN(id_exercicio_fk)) return;

        block.querySelectorAll(".series-row").forEach((row, i) => {
          const nums = row.querySelectorAll("input[type='number']");
          const carga = nums[0].value ? Number(nums[0].value) : null;
          const repeticoes = nums[1].value ? Number(nums[1].value) : null;
          const obs = row.querySelector("textarea").value || null;

          inserts.push({
            id_treino_fk: treino.id_treino,
            id_exercicio_fk,
            carga,
            repeticoes,
            series: i + 1,
            unidade: "kg",
            observacoes: obs
          });
        });
      });

      if (!inserts.length) {
        alert("Adicione ao menos uma série.");
        btnSalvar.disabled = false;
        statusEl.textContent = "";
        return;
      }

      await supabase.from("treino_exercicio").insert(inserts);

      alert("Treino salvo com sucesso!");
      window.location.href = `treinos_anteriores.html?id=${alunoId}`;

    } catch (err) {
      console.error(err);
      alert("Erro ao salvar treino");
      btnSalvar.disabled = false;
      statusEl.textContent = "";
    }
  };

  /* =========================
     INIT
  ========================= */
  (async function init() {
    await loadCatalog();
    createExerciseBlock();
  })();

});
