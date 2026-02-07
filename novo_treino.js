import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
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
    statusEl.textContent = "Aluno não informado";
    return;
  }

  alunoIdDisplay.textContent = alunoId;
  dataTreinoInput.value = new Date().toISOString().split("T")[0];

  let catalog = [];
  let dragSrcEl = null;

  /* =========================
     LOAD EXERCÍCIOS
  ========================= */
  async function loadCatalog() {
    const { data, error } = await supabase
      .from("exercicios")
      .select("id_exercicio, nome_exercicio");

    if (error) {
      alert("Erro ao carregar exercícios");
      return;
    }
    catalog = data || [];
  }

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

  function atualizarSelects(novo) {
    document.querySelectorAll(".ex-block select").forEach(select => {
      const opt = document.createElement("option");
      opt.value = novo.id_exercicio;
      opt.textContent = novo.nome_exercicio;
      select.appendChild(opt);
    });
  }

  /* =========================
     DRAG & DROP
  ========================= */
  function addDragAndDrop(block) {
    block.draggable = true;

    block.addEventListener("dragstart", () => {
      dragSrcEl = block;
      block.classList.add("dragging");
    });

    block.addEventListener("dragend", () => {
      dragSrcEl = null;
      block.classList.remove("dragging");
    });

    block.addEventListener("dragover", e => {
      e.preventDefault();
      const after = getDragAfterElement(exerciciosWrapper, e.clientY);
      if (after == null) {
        exerciciosWrapper.appendChild(dragSrcEl);
      } else {
        exerciciosWrapper.insertBefore(dragSrcEl, after);
      }
    });
  }

  function getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll(".ex-block:not(.dragging)")];
    return els.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  /* =========================
     BLOCO DE EXERCÍCIO
  ========================= */
  function createExerciseBlock() {
    const exBlock = document.createElement("div");
    exBlock.className = "ex-block";

    addDragAndDrop(exBlock);

    const header = document.createElement("div");
    header.className = "ex-header";

    const select = document.createElement("select");
    select.innerHTML = `
      <option value="">-- selecione um exercício --</option>
      ${catalog.map(e =>
        `<option value="${e.id_exercicio}">${e.nome_exercicio}</option>`
      ).join("")}
    `;

    select.addEventListener("change", () => {
      const val = Number(select.value);
      if (val) {
        exBlock.dataset.idEx = val;
      } else {
        delete exBlock.dataset.idEx;
      }
    });

    const btnNovo = document.createElement("button");
    btnNovo.type = "button";
    btnNovo.textContent = "+ Criar exercício";
    btnNovo.onclick = async () => {
      const nome = prompt("Nome do exercício:");
      if (!nome) return;

      const novo = await criarNovoExercicio(nome.trim());
      atualizarSelects(novo);

      select.value = novo.id_exercicio;
      exBlock.dataset.idEx = novo.id_exercicio;
      select.dispatchEvent(new Event("change"));
    };

    header.append(select, btnNovo);
    exBlock.appendChild(header);

    const seriesList = document.createElement("div");
    seriesList.className = "series-list";

    function addSerie() {
      const row = document.createElement("div");
      row.className = "series-row";

      row.innerHTML = `
        <label>Peso (kg)</label>
        <input type="number">
        <label>Repetições</label>
        <input type="number">
        <textarea placeholder="Observações"></textarea>
        <button type="button">Remover série</button>
      `;

      row.querySelector("button").onclick = () => row.remove();
      seriesList.appendChild(row);
    }

    addSerie();

    const btnAddSerie = document.createElement("button");
    btnAddSerie.textContent = "+ Série";
    btnAddSerie.onclick = addSerie;

    const btnRemoveEx = document.createElement("button");
    btnRemoveEx.textContent = "Remover exercício";
    btnRemoveEx.onclick = () => exBlock.remove();

    exBlock.append(seriesList, btnAddSerie, btnRemoveEx);
    exerciciosWrapper.appendChild(exBlock);
  }

  /* =========================
     SALVAR TREINO
  ========================= */
  btnSalvar.onclick = async () => {
    const blocos = Array.from(exerciciosWrapper.querySelectorAll(".ex-block"));

    const temExercicioValido = blocos.some(
      b => Number(b.dataset.idEx)
    );

    if (!temExercicioValido) {
      alert("Adicione pelo menos um exercício ao treino.");
      return;
    }

    const { data: treino, error } = await supabase
      .from("treinos")
      .insert([{
        id_aluno_fk: Number(alunoId),
        data_treino: dataTreinoInput.value,
        observacoes_gerais: observacoesGeraisEl.value || null
      }])
      .select("id_treino")
      .single();

    if (error) {
      alert("Erro ao salvar treino");
      return;
    }

const inserts = [];

blocos.forEach((block, ordem) => {
  const idEx = Number(block.dataset.idEx);
  if (!idEx) return;

  const linhas = block.querySelectorAll(".series-row");

  linhas.forEach((row, idx) => {
    const inputs = row.querySelectorAll("input");

    inserts.push({
      id_treino_fk: treino.id_treino,
      id_exercicio_fk: idEx,
      carga: inputs[0].value ? Number(inputs[0].value) : null,
      repeticoes: inputs[1].value ? Number(inputs[1].value) : null,
      series: idx + 1,
      ordem_exercicio: ordem + 1,
      unidade: "kg",
      observacoes: row.querySelector("textarea").value || null
    });
  });
});

/* 🔥 CORREÇÃO 2 — trava treino vazio */
if (!inserts.length) {
  alert("Treino sem exercícios não pode ser salvo.");
  await supabase
    .from("treinos")
    .delete()
    .eq("id_treino", treino.id_treino);
  return;
}

await supabase.from("treino_exercicio").insert(inserts);


    alert("Treino salvo!");
    window.location.href = `treinos_anteriores.html?id=${alunoId}`;
  };

  btnAddEx.onclick = createExerciseBlock;
  btnCancelar.onclick = () => window.history.back();

  // INIT
  (async () => {
    await loadCatalog();
  })();
});
