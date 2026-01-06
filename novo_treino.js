// novo_treino.js — simples, robusto e com o esquema correto
import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // ELEMENTOS / PARAMS
  // =========================
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
console.log({
  alunoIdDisplay,
  dataTreinoInput,
  observacoesGeraisEl,
  exerciciosWrapper,
  btnAddEx,
  btnSalvar,
  btnCancelar,
  statusEl
});

  // defesa básica
  if (
    !alunoIdDisplay ||
    !dataTreinoInput ||
    !observacoesGeraisEl ||
    !exerciciosWrapper ||
    !btnAddEx ||
    !btnSalvar ||
    !btnCancelar ||
    !statusEl
  ) {
    console.error("Elementos do DOM não encontrados");
    return;
  }

  alunoIdDisplay.textContent = alunoId || "—";

  if (!alunoId) {
    statusEl.textContent = "Aluno não informado na URL (?id=...).";
    btnAddEx.disabled = true;
    btnSalvar.disabled = true;
  }

  // =========================
  // DATA PADRÃO (HOJE)
  // =========================
  function setToday() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    dataTreinoInput.value =
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  setToday();

  // =========================
  // CATÁLOGO DE EXERCÍCIOS
  // =========================
  let catalog = [];

  async function loadCatalog() {
    statusEl.textContent = "Carregando catálogo de exercícios...";

    const { data, error } = await supabase
      .from("exercicios")
      .select("id_exercicio, nome_exercicio")
      .order("nome_exercicio", { ascending: true });

    if (error) {
      console.error("Erro ao buscar exercícios:", error);
      statusEl.textContent = "Erro ao carregar exercícios (veja console).";
      return;
    }

    catalog = data || [];
    statusEl.textContent = "";

    if (catalog.length === 0) {
      statusEl.textContent =
        "Nenhum exercício cadastrado. Vá em Exercícios e crie alguns.";
    }
  }

  // =========================
  // BLOCO DE EXERCÍCIO
  // =========================
  function createExerciseBlock() {
    const exBlock = document.createElement("div");
    exBlock.className = "ex-block";

    const header = document.createElement("div");
    header.className = "ex-header";

    const select = document.createElement("select");
    select.innerHTML =
      `<option value="">-- selecione um exercício --</option>`;

    catalog.forEach(e => {
      const opt = document.createElement("option");
      opt.value = e.id_exercicio;
      opt.textContent = e.nome_exercicio;
      select.appendChild(opt);
    });

    const removeExBtn = document.createElement("button");
    removeExBtn.type = "button";
    removeExBtn.className = "ex-remove btn-small";
    removeExBtn.textContent = "Remover exercício";
    removeExBtn.onclick = () => exBlock.remove();

    header.appendChild(select);
    header.appendChild(removeExBtn);
    exBlock.appendChild(header);

    const seriesList = document.createElement("div");
    seriesList.className = "series-list";

    function addSeriesRow(cargaVal = "", repsVal = "", obsVal = "") {
      const row = document.createElement("div");
      row.className = "series-row";

      const carga = document.createElement("input");
      carga.type = "number";
      carga.placeholder = "Carga (kg)";
      carga.value = cargaVal;

      const reps = document.createElement("input");
      reps.type = "number";
      reps.placeholder = "Repetições";
      reps.value = repsVal;

      const obs = document.createElement("textarea");
      obs.placeholder = "Observações (opcional)";
      obs.rows = 1;
      obs.value = obsVal;

      const btnRem = document.createElement("button");
      btnRem.type = "button";
      btnRem.className = "remove btn-small";
      btnRem.textContent = "Remover série";
      btnRem.onclick = () => row.remove();

      row.append(carga, reps, obs, btnRem);
      seriesList.appendChild(row);
    }

    addSeriesRow();

    const addSeriesBtn = document.createElement("button");
    addSeriesBtn.type = "button";
    addSeriesBtn.className = "add-series btn-small";
    addSeriesBtn.textContent = "+ Série";
    addSeriesBtn.onclick = () => addSeriesRow();

    exBlock.append(seriesList, addSeriesBtn);
    exerciciosWrapper.appendChild(exBlock);

    return exBlock;
  }

  // =========================
  // EVENTOS
  // =========================
  btnAddEx.addEventListener("click", () => {
    if (catalog.length === 0) {
      alert("Nenhum exercício cadastrado. Crie exercícios primeiro.");
      return;
    }
    createExerciseBlock();
  });

  btnCancelar.addEventListener("click", () => {
    if (alunoId) {
      window.location.href = `aluno_detalhe.html?id=${alunoId}`;
    } else {
      history.back();
    }
  });

  btnSalvar.addEventListener("click", async () => {
    try {
      statusEl.textContent = "Salvando treino...";
      btnSalvar.disabled = true;

      if (!alunoId) throw new Error("ID do aluno não informado na URL.");

      const data_treino = dataTreinoInput.value;
      const observacoes_gerais = observacoesGeraisEl.value || null;

      const { data: treinoData, error: errT } = await supabase
        .from("treinos")
        .insert([{ id_aluno_fk: Number(alunoId), data_treino, observacoes_gerais }])
        .select()
        .single();

      if (errT) throw errT;

      const id_treino = treinoData.id_treino;
      const inserts = [];

      document.querySelectorAll(".ex-block").forEach(block => {
        const select = block.querySelector("select");
        const id_exercicio_fk = Number(select.value);
        if (!id_exercicio_fk) return;

        block.querySelectorAll(".series-row").forEach((row, i) => {
          const inputs = row.querySelectorAll("input[type='number']");
          const carga = inputs[0].value ? Number(inputs[0].value) : null;
          const repeticoes = inputs[1].value ? Number(inputs[1].value) : null;
          const obs = row.querySelector("textarea").value || null;

          inserts.push({
            id_treino_fk: id_treino,
            id_exercicio_fk,
            carga,
            repeticoes,
            series: i + 1,
            unidade: "kg",
            observacoes: obs
          });
        });
      });

      if (inserts.length === 0) {
        await supabase.from("treinos").delete().eq("id_treino", id_treino);
        throw new Error("Adicione pelo menos uma série antes de salvar.");
      }

      const { error: errInsert } =
        await supabase.from("treino_exercicio").insert(inserts);

      if (errInsert) {
        await supabase.from("treinos").delete().eq("id_treino", id_treino);
        throw errInsert;
      }

      statusEl.textContent = "Treino salvo com sucesso!";
      setTimeout(() => {
        window.location.href = `treinos_anteriores.html?id=${alunoId}`;
      }, 700);

    } catch (err) {
      console.error(err);
      alert(err.message || "Erro ao salvar treino.");
      statusEl.textContent = "";
      btnSalvar.disabled = false;
    }
  });

  // =========================
  // INIT
  // =========================
  (async function init() {
    await loadCatalog();
    if (catalog.length) {
      createExerciseBlock();
    }
  })();

});
