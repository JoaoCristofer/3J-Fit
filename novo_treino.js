// novo_treino.js — simples, robusto e com o esquema correto
const SUPABASE_URL = "https://zcgretxaftcwukkzbxfo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZ3JldHhhZnRjd3Vra3pieGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTQ1MjgsImV4cCI6MjA3NjE3MDUyOH0.x-u14dOI1Q9Opg6TfTD628p3gwqpgfO9IqgCcS3Mc6U";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// elements
const params = new URLSearchParams(window.location.search);
const alunoId = params.get("id"); // URL ?id=...
document.getElementById("alunoIdDisplay").textContent = alunoId || "—";
const dataTreinoInput = document.getElementById("dataTreino");
const observacoesGeraisEl = document.getElementById("observacoesGerais");
const exerciciosWrapper = document.getElementById("exerciciosWrapper");
const btnAddEx = document.getElementById("btnAddEx");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");
const statusEl = document.getElementById("status");

if (!alunoId) {
  statusEl.textContent = "Aluno não informado na URL (?id=...).";
  btnAddEx.disabled = true;
  btnSalvar.disabled = true;
}

// default date = today (YYYY-MM-DD)
(function setToday(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  const s = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  dataTreinoInput.value = s;
})();

// load exercises catalog from Supabase
let catalog = [];
async function loadCatalog(){
  statusEl.textContent = "Carregando catálogo de exercícios...";
  const { data, error } = await supabase
    .from("exercicios")
    .select("id_exercicio,nome_exercicio")
    .order("nome_exercicio", { ascending: true });

  if (error) {
    console.error("Erro ao buscar exercícios:", error);
    statusEl.textContent = "Erro ao carregar exercícios (veja console).";
    return;
  }
  catalog = data || [];
  statusEl.textContent = "";
  if (catalog.length === 0) statusEl.textContent = "Nenhum exercício cadastrado. Vá em Exercícios e crie alguns.";
}

// helper: create one exercise block (select + series list)
function createExerciseBlock() {
  const exBlock = document.createElement("div");
  exBlock.className = "ex-block";

  // header with select and remove button
  const header = document.createElement("div");
  header.className = "ex-header";

  const select = document.createElement("select");
  select.innerHTML = `<option value="">-- selecione um exercício --</option>`;
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

  // series container
  const seriesList = document.createElement("div");
  seriesList.className = "series-list";

  // function to add one series row
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

    row.appendChild(carga);
    row.appendChild(reps);
    row.appendChild(obs);
    row.appendChild(btnRem);

    seriesList.appendChild(row);
  }

  // add initial series
  addSeriesRow();

  // add-series button
  const addSeriesBtn = document.createElement("button");
  addSeriesBtn.type = "button";
  addSeriesBtn.className = "add-series btn-small";
  addSeriesBtn.textContent = "+ Série";
  addSeriesBtn.onclick = () => addSeriesRow();

  exBlock.appendChild(seriesList);
  exBlock.appendChild(addSeriesBtn);

  exerciciosWrapper.appendChild(exBlock);
  return exBlock;
}

// add-first when catalog loaded
btnAddEx.addEventListener("click", () => {
  if (catalog.length === 0) {
    alert("Nenhum exercício cadastrado. Crie exercícios primeiro.");
    return;
  }
  createExerciseBlock();
});

btnCancelar.addEventListener("click", () => {
  // go back to aluno detail if id present
  if (alunoId) window.location.href = `aluno_detalhe.html?id=${alunoId}`;
  else history.back();
});

// save handler: create treino then treino_exercicio records
btnSalvar.addEventListener("click", async () => {
  try {
    statusEl.textContent = "Salvando treino...";
    btnSalvar.disabled = true;

    if (!alunoId) throw new Error("id do aluno não informado na URL.");

    const data_treino = dataTreinoInput.value;
    const observacoes_gerais = observacoesGeraisEl.value || null;

    // create treino
    const { data: treinoData, error: errT } = await supabase
      .from("treinos")
      .insert([{ id_aluno_fk: alunoId, data_treino, observacoes_gerais }])
      .select()
      .single();

    if (errT) {
      console.error(errT);
      throw new Error("Erro ao criar treino: " + errT.message);
    }
    const id_treino = treinoData.id_treino;

    // build inserts for treino_exercicio
    const blocks = Array.from(document.querySelectorAll(".ex-block"));
    const inserts = [];

    for (const block of blocks) {
      const selet = block.querySelector("select");
      const id_exercicio_fk = selet ? Number(selet.value) : null;
      if (!id_exercicio_fk) {
        // skip blocks without selected exercise
        continue;
      }

      const seriesRows = Array.from(block.querySelectorAll(".series-row"));
      for (let i = 0; i < seriesRows.length; i++) {
        const row = seriesRows[i];
        const cargaRaw = row.querySelector("input[type='number']").value;
        const repsRaw = row.querySelectorAll("input[type='number']")[1].value;
        const obs = row.querySelector("textarea").value || null;

        const carga = cargaRaw === "" ? null : Number(cargaRaw);
        const repeticoes = repsRaw === "" ? null : Number(repsRaw);

        inserts.push({
          id_treino_fk: id_treino,
          id_exercicio_fk,
          carga,
          repeticoes,
          series: i + 1,
          unidade: 'kg',
          observacoes: obs
        });
      }
    }

    if (inserts.length === 0) {
      // nothing to insert -> rollback: delete created treino
      await supabase.from("treinos").delete().eq("id_treino", id_treino);
      throw new Error("Nenhuma série adicionada. Adicione pelo menos uma série antes de salvar.");
    }

    // bulk insert
    const { error: errInsert } = await supabase.from("treino_exercicio").insert(inserts);
    if (errInsert) {
      console.error(errInsert);
      // try rollback treino
      await supabase.from("treinos").delete().eq("id_treino", id_treino);
      throw new Error("Erro ao salvar séries: " + errInsert.message);
    }

    statusEl.textContent = "Treino salvo com sucesso!";
    setTimeout(() => {
      window.location.href = `treinos_anteriores.html?id=${alunoId}`;
    }, 700);
  } catch (err) {
    console.error(err);
    alert(err.message || "Erro ao salvar treino (veja console).");
    statusEl.textContent = "";
    btnSalvar.disabled = false;
  }
});

// init
(async function init(){
  await loadCatalog();
  if (catalog.length) {
    // create one block by default
    createExerciseBlock();
  } else {
    statusEl.textContent = "Nenhum exercício cadastrado — crie exercícios primeiro.";
  }
})();
