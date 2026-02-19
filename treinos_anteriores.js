import { supabase } from "./supabase.js";
import { getAlunoAtual, setAlunoAtual } from "./alunoContext.js";

document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // PARAMS + CONTEXTO
  // =========================
  const params = new URLSearchParams(window.location.search);
  const alunoIdUrl = params.get("id");
  const alunoIdStorage = getAlunoAtual();

  const alunoId =
    alunoIdUrl && !isNaN(alunoIdUrl)
      ? Number(alunoIdUrl)
      : alunoIdStorage;

  if (!alunoId) {
    alert("Aluno inválido.");
    return;
  }

  if (alunoIdUrl && !isNaN(alunoIdUrl)) {
    setAlunoAtual(Number(alunoIdUrl));
  }
async function loadCatalogExercicios() {
  const { data, error } = await supabase
    .from("exercicios")
    .select("id_exercicio, nome_exercicio");

  if (error) {
    alert("Erro ao carregar exercícios");
    return;
  }

  catalogExercicios = (data || []).sort((a, b) =>
    a.nome_exercicio.localeCompare(b.nome_exercicio, "pt-BR")
  );
}

  // =========================
  // ELEMENTOS DOM
  // =========================
  const listaTreinos = document.getElementById("listaTreinos");
  const statusEl = document.getElementById("status");
  const voltar = document.getElementById("voltar");
  let draggedEx = null;
let catalogExercicios = [];

  const modal = document.getElementById("modalEditar");
  const fecharModal = document.getElementById("fecharModal");
  const formEditar = document.getElementById("formEditar");
  const editContainer = document.getElementById("edit_exercicios_container");

  // =========================
  // DRAG OVER NO CONTAINER
  // =========================
editContainer.addEventListener("dragover", (e) => {
  e.preventDefault();
  if (!draggedEx) return;

  const after = getDragAfterElement(editContainer, e.clientY);

  if (after == null) {
    editContainer.insertBefore(draggedEx, editContainer.querySelector(".btn"));
  } else {
    editContainer.insertBefore(draggedEx, after);
  }
});

  // =========================
  // VOLTAR
  // =========================
  voltar.onclick = (e) => {
    e.preventDefault();
    history.back();
  };

  // =========================
  // CARREGAR TREINOS
  // =========================
  async function carregarTreinos() {
    try {
      statusEl.textContent = "Carregando treinos...";
      listaTreinos.innerHTML = "";

      const { data: treinos, error } = await supabase
        .from("treinos")
        .select("id_treino,id_aluno_fk,data_treino,observacoes_gerais,created_at")
        .eq("id_aluno_fk", alunoId)
        .order("data_treino", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!treinos.length) {
        statusEl.textContent = "Nenhum treino encontrado.";
        return;
      }

      const treinoIds = treinos.map(t => t.id_treino);

      const { data: seriesAll } = await supabase
.from("treino_exercicio")
.select("*")
.in("id_treino_fk", treinoIds)
.order("ordem_exercicio", { ascending: true })
.order("series", { ascending: true });


      const exercIds = [...new Set(seriesAll.map(s => s.id_exercicio_fk))];

      let exercMap = {};
      if (exercIds.length) {
        const { data: exs } = await supabase
          .from("exercicios")
          .select("id_exercicio,nome_exercicio")
          .in("id_exercicio", exercIds);

        exs.forEach(e => exercMap[e.id_exercicio] = e.nome_exercicio);
      }

      const seriesPorTreino = {};
      seriesAll.forEach(s => {
        if (!seriesPorTreino[s.id_treino_fk]) {
          seriesPorTreino[s.id_treino_fk] = [];
        }
        seriesPorTreino[s.id_treino_fk].push(s);
      });

      statusEl.textContent = "";

      treinos.forEach(t => {
        const div = document.createElement("div");
        div.className = "card";

        let html = `
          <h3>${new Date(t.data_treino).toLocaleDateString("pt-BR")}</h3>
          <div class="meta">Criado: ${new Date(t.created_at).toLocaleString()}</div>
        `;

        if (t.observacoes_gerais) {
          html += `<p><strong>Obs:</strong> ${t.observacoes_gerais}</p>`;
        }

        const series = seriesPorTreino[t.id_treino] || [];

        let ultimoEx = null;
        html += `<div class="detail-list">`;

        series.forEach((row, idx) => {
          if (row.id_exercicio_fk !== ultimoEx) {
            if (ultimoEx !== null) html += `</div>`;
            html += `<div class="ex-block"><strong>${exercMap[row.id_exercicio_fk]}</strong>`;
            ultimoEx = row.id_exercicio_fk;
          }

          html += `
            <div>
              Série ${row.series ?? idx + 1}:
              ${row.repeticoes ?? "-"} reps •
              ${row.carga ?? "-"} ${row.unidade ?? ""}
            </div>
          `;

          if (row.observacoes) {
            html += `<small>${row.observacoes}</small>`;
          }
        });

        html += `</div></div>`;

        html += `
          <div class="botao-grupo">
            <button class="btn primary" onclick="abrirEditar(${t.id_treino})">Editar</button>
            <button class="btn secondary" onclick="excluirTreino(${t.id_treino})">Excluir</button>
          </div>
        `;

        div.innerHTML = html;
        listaTreinos.appendChild(div);
      });

    } catch (err) {
      console.error(err);
      statusEl.textContent = "Erro ao carregar treinos.";
    }
  }

  function enableExerciseDrag(bloco) {
    bloco.draggable = true;

    bloco.addEventListener("dragstart", () => {
      draggedEx = bloco;
      bloco.classList.add("dragging");
    });

    bloco.addEventListener("dragend", () => {
      draggedEx = null;
      bloco.classList.remove("dragging");
    });


  }

  function getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll(".ex-edit:not(.dragging)")];

    return els.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // =========================
  // ABRIR EDITAR
  // =========================
  window.abrirEditar = async function (idTreino) {
    try {
      const { data: treino } = await supabase
        .from("treinos")
        .select("*")
        .eq("id_treino", idTreino)
        .single();

      document.getElementById("edit_id_treino").value = treino.id_treino;
      document.getElementById("edit_data_treino").value = treino.data_treino;
      document.getElementById("edit_observacoes_gerais").value =
        treino.observacoes_gerais || "";

      editContainer.innerHTML = "";


      const { data: series } = await supabase
  .from("treino_exercicio")
  .select("*")
  .eq("id_treino_fk", idTreino)
  .order("ordem_exercicio", { ascending: true })
  .order("series", { ascending: true });


      const exIds = [...new Set(series.map(s => s.id_exercicio_fk))];

      let exMap = {};
      if (exIds.length) {
        const { data: exs } = await supabase
          .from("exercicios")
          .select("id_exercicio,nome_exercicio")
          .in("id_exercicio", exIds);

        exs.forEach(e => (exMap[e.id_exercicio] = e.nome_exercicio));
      }

const groupedMap = new Map();

series.forEach(s => {
  if (!groupedMap.has(s.id_exercicio_fk)) {
    groupedMap.set(s.id_exercicio_fk, []);
  }
  groupedMap.get(s.id_exercicio_fk).push(s);
});


   for (const [idEx, seriesDoEx] of groupedMap.entries()) {

        const bloco = document.createElement("div");
        bloco.className = "ex-edit";
        bloco.dataset.idEx = idEx;

bloco.innerHTML = `
  <div class="ex-edit-header">
    <strong>${exMap[idEx] || "Exercício #" + idEx}</strong>
    <button type="button" class="remove-ex-btn">Remover exercício</button>
  </div>
  <div class="series-edit-list"></div>
  <button type="button" class="add-serie-btn">+ Série</button>
`;
bloco.querySelector(".remove-ex-btn").onclick = () => {
  if (confirm("Remover este exercício do treino?")) {
    bloco.remove();
  }
};


        const list = bloco.querySelector(".series-edit-list");

        seriesDoEx.forEach(s => {
          const row = document.createElement("div");
          row.className = "series-row";
          row.innerHTML = `
            <label>Peso (kg)</label>
            <input class="edit-carga" type="number" value="${s.carga ?? ""}">
            <label>Repetições</label>
            <input class="edit-reps" type="number" value="${s.repeticoes ?? ""}">
            <label>Observações</label>
            <textarea class="edit-obs">${s.observacoes ?? ""}</textarea>
            <button type="button" class="remove-btn">Remover</button>
          `;
          row.querySelector(".remove-btn").onclick = () => row.remove();
          list.appendChild(row);
        });

        bloco.querySelector(".add-serie-btn").onclick = () => {
          const row = document.createElement("div");
          row.className = "series-row";
          row.innerHTML = `
            <label>Peso (kg)</label>
            <input class="edit-carga" type="number">
            <label>Repetições</label>
            <input class="edit-reps" type="number">
            <label>Observações</label>
            <textarea class="edit-obs"></textarea>
            <button type="button" class="remove-btn">Remover</button>
          `;
          row.querySelector(".remove-btn").onclick = () => row.remove();
          list.appendChild(row);
        };

        enableExerciseDrag(bloco);
        editContainer.appendChild(bloco);
      }

      const addExBtn = document.createElement("button");
      addExBtn.type = "button";
      addExBtn.className = "btn primary";
      addExBtn.textContent = "+ Adicionar Exercício";

addExBtn.onclick = async () => {

  if (!catalogExercicios.length) {
    await loadCatalogExercicios();
  }

  const wrapper = document.createElement("div");
  wrapper.className = "mini-modal";

  // 🔍 CAMPO DE PESQUISA
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Pesquisar exercício...";
  search.style.marginBottom = "8px";

  const select = document.createElement("select");

  function render(filtro = "") {
    select.innerHTML = catalogExercicios
      .filter(e =>
        e.nome_exercicio.toLowerCase().includes(filtro.toLowerCase())
      )
      .map(e =>
        `<option value="${e.id_exercicio}">${e.nome_exercicio}</option>`
      )
      .join("");
  }

  // 🔤 ORDEM ALFABÉTICA GARANTIDA
  render();

  search.addEventListener("input", () => {
    render(search.value);
  });

  const confirmar = document.createElement("button");
  confirmar.textContent = "Adicionar";
  confirmar.type = "button";

  confirmar.onclick = () => {
    const idEx = select.value;
    const nome = catalogExercicios.find(
      e => e.id_exercicio == idEx
    )?.nome_exercicio;

    const bloco = document.createElement("div");
    bloco.className = "ex-edit";
    bloco.dataset.idEx = idEx;

    bloco.innerHTML = `
      <strong>${nome}</strong>
      <div class="series-edit-list"></div>
      <button type="button" class="add-serie-btn">+ Série</button>
    `;

    bloco.querySelector(".add-serie-btn").onclick = () => {
      const row = document.createElement("div");
      row.className = "series-row";
      row.innerHTML = `
        <label>Peso (kg)</label>
        <input class="edit-carga" type="number">
        <label>Repetições</label>
        <input class="edit-reps" type="number">
        <label>Observações</label>
        <textarea class="edit-obs"></textarea>
        <button type="button" class="remove-btn">Remover</button>
      `;
      row.querySelector(".remove-btn").onclick = () => row.remove();
      bloco.querySelector(".series-edit-list").appendChild(row);
    };

    enableExerciseDrag(bloco);
    editContainer.appendChild(bloco);
    modal.removeChild(wrapper);
  };

  wrapper.append(search, select, confirmar);
  modal.appendChild(wrapper);
};


      editContainer.appendChild(addExBtn);
      modal.style.display = "flex";

    } catch (err) {
      console.error(err);
      alert("Erro ao editar treino.");
    }
  };

  // =========================
  // SALVAR
  // =========================
  formEditar.addEventListener("submit", async (e) => {
    e.preventDefault();

    const idTreino = document.getElementById("edit_id_treino").value;
    const data = document.getElementById("edit_data_treino").value;
    const obs = document.getElementById("edit_observacoes_gerais").value;

    await supabase
      .from("treinos")
      .update({ data_treino: data, observacoes_gerais: obs })
      .eq("id_treino", idTreino);

    await supabase
      .from("treino_exercicio")
      .delete()
      .eq("id_treino_fk", idTreino);

    const blocos = editContainer.querySelectorAll(".ex-edit");

let ordemExercicio = 1;

for (const bloco of blocos) {
  const idEx = bloco.dataset.idEx;
  const linhas = bloco.querySelectorAll(".series-row");

  let serie = 1;
  for (const row of linhas) {
    await supabase.from("treino_exercicio").insert({
      id_treino_fk: idTreino,
      id_exercicio_fk: idEx,
      ordem_exercicio: ordemExercicio, // 🔑 ESSENCIAL
      carga: row.querySelector(".edit-carga").value || null,
      repeticoes: row.querySelector(".edit-reps").value || null,
      series: serie++,
      observacoes: row.querySelector(".edit-obs").value || null
    });
  }

  ordemExercicio++;
}


    modal.style.display = "none";
    carregarTreinos();
    loadCatalogExercicios();

  });

  // =========================
  // EXCLUIR
  // =========================
  window.excluirTreino = async function (idTreino) {
    if (!confirm("Excluir treino?")) return;
    await supabase.from("treino_exercicio").delete().eq("id_treino_fk", idTreino);
    await supabase.from("treinos").delete().eq("id_treino", idTreino);
    carregarTreinos();
    loadCatalogExercicios();

  };

  fecharModal.onclick = () => modal.style.display = "none";

  // =========================
  // INIT
  // =========================
  carregarTreinos();
  loadCatalogExercicios();

});
