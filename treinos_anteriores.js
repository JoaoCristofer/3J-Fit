// treinos_anteriores.js
import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // PARAMS + SANITIZAÇÃO
  // =========================
  const params = new URLSearchParams(window.location.search);
  const alunoIdRaw = params.get("id");

  const alunoId =
    alunoIdRaw && alunoIdRaw !== "null" && !isNaN(alunoIdRaw)
      ? Number(alunoIdRaw)
      : null;

  // =========================
  // ELEMENTOS DOM
  // =========================
  const listaTreinos = document.getElementById("listaTreinos");
  const statusEl = document.getElementById("status");
  const voltar = document.getElementById("voltar");
  const modal = document.getElementById("modalEditar");
  const fecharModal = document.getElementById("fecharModal");
  const formEditar = document.getElementById("formEditar");
  const editContainer = document.getElementById("edit_exercicios_container");

  // defesa DOM
  if (
    !listaTreinos ||
    !statusEl ||
    !voltar ||
    !modal ||
    !fecharModal ||
    !formEditar ||
    !editContainer
  ) {
    console.error("Elementos do DOM não encontrados");
    return;
  }

  // defesa ID
  if (!alunoId) {
    statusEl.textContent = "Aluno inválido ou não informado na URL (?id=...).";
    return;
  }

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

      const { data: treinos, error: errT } = await supabase
        .from("treinos")
        .select("id_treino,id_aluno_fk,data_treino,observacoes_gerais,created_at")
        .eq("id_aluno_fk", alunoId)
        .order("data_treino", { ascending: false });

      if (errT) throw errT;

      if (!treinos || treinos.length === 0) {
        statusEl.textContent = "Nenhum treino encontrado.";
        return;
      }

      const treinoIds = treinos.map(t => t.id_treino);

      const { data: seriesAll, error: errS } = await supabase
        .from("treino_exercicio")
        .select("*")
        .in("id_treino_fk", treinoIds)
        .order("id_treino_exercicio", { ascending: true });

      if (errS) throw errS;

      const exercIds = Array.from(
        new Set((seriesAll || []).map(s => s.id_exercicio_fk))
      ).filter(Boolean);

      let exercMap = {};
      if (exercIds.length) {
        const { data: exs } = await supabase
          .from("exercicios")
          .select("id_exercicio,nome_exercicio")
          .in("id_exercicio", exercIds);

        (exs || []).forEach(x => {
          exercMap[x.id_exercicio] = x.nome_exercicio;
        });
      }

      const seriesPorTreino = {};
      (seriesAll || []).forEach(s => {
        if (!seriesPorTreino[s.id_treino_fk]) {
          seriesPorTreino[s.id_treino_fk] = [];
        }
        seriesPorTreino[s.id_treino_fk].push(s);
      });

      statusEl.textContent = "";

      treinos.forEach(t => {
        const div = document.createElement("div");
        div.className = "card";

        let inner = `
          <h3>${new Date(t.data_treino).toLocaleDateString("pt-BR")}</h3>
          <div class="meta">Criado: ${new Date(t.created_at).toLocaleString()}</div>
        `;

        if (t.observacoes_gerais) {
          inner += `<p><strong>Obs:</strong> ${t.observacoes_gerais}</p>`;
        }

        const s = seriesPorTreino[t.id_treino] || [];

        if (s.length === 0) {
          inner += `<p class="detail-list">Nenhum exercício registrado.</p>`;
        } else {
          const porEx = {};
          s.forEach(row => {
            if (!porEx[row.id_exercicio_fk]) porEx[row.id_exercicio_fk] = [];
            porEx[row.id_exercicio_fk].push(row);
          });

          inner += `<div class="detail-list">`;
          for (const exId in porEx) {
            inner += `<div class="ex-block"><strong>${exercMap[exId] || "Ex " + exId}</strong>`;
            porEx[exId].forEach((ser, idx) => {
              inner += `
                <div>
                  Série ${ser.series || idx + 1}:
                  ${ser.repeticoes ?? "-"} reps •
                  ${ser.carga ?? "-"} ${ser.unidade ?? ""}
                </div>
              `;
              if (ser.observacoes) {
                inner += `<small>${ser.observacoes}</small>`;
              }
            });
            inner += `</div>`;
          }
          inner += `</div>`;
        }

        inner += `
          <div class="botao-grupo">
            <button class="btn primary" onclick="abrirEditar(${t.id_treino})">Editar</button>
            <button class="btn secondary" onclick="excluirTreino(${t.id_treino})">Excluir</button>
          </div>
        `;

        div.innerHTML = inner;
        listaTreinos.appendChild(div);
      });

    } catch (err) {
      console.error(err);
      statusEl.textContent = "Erro ao carregar treinos (veja console).";
    }
  }

  // =========================
  // EDITAR (AGORA COM "ADICIONAR EXERCÍCIO")
  // =========================
  window.abrirEditar = async function (idTreino) {
    try {
      const { data: t, error: et } = await supabase
        .from("treinos")
        .select("*")
        .eq("id_treino", idTreino)
        .single();

      if (et) throw et;

      document.getElementById("edit_id_treino").value = t.id_treino;
      document.getElementById("edit_data_treino").value = t.data_treino;
      document.getElementById("edit_observacoes_gerais").value = t.observacoes_gerais || "";

      editContainer.innerHTML = "";

      const { data: series, error: es } = await supabase
        .from("treino_exercicio")
        .select("*")
        .eq("id_treino_fk", idTreino)
        .order("series", { ascending: true });

      if (es) throw es;

      const exIds = Array.from(new Set((series || []).map(s => s.id_exercicio_fk))).filter(Boolean);
      let exMap = {};

      if (exIds.length) {
        const { data: exs } = await supabase
          .from("exercicios")
          .select("id_exercicio,nome_exercicio")
          .in("id_exercicio", exIds);

        (exs || []).forEach(x => exMap[x.id_exercicio] = x.nome_exercicio);
      }

      const grouped = {};
      (series || []).forEach(s => {
        if (!grouped[s.id_exercicio_fk]) grouped[s.id_exercicio_fk] = [];
        grouped[s.id_exercicio_fk].push(s);
      });

      for (const idEx in grouped) {
        const block = document.createElement("div");
        block.className = "ex-edit";
        block.dataset.idEx = idEx;

        block.innerHTML = `
          <strong>${exMap[idEx] || "Ex " + idEx}</strong>
          <div class="series-edit-list"></div>
          <button type="button" class="add-serie-btn">+ Série</button>
        `;

        const list = block.querySelector(".series-edit-list");

        grouped[idEx].forEach(s => {
          const row = document.createElement("div");
          row.className = "series-row";
          row.innerHTML = `
            <input type="number" class="edit-carga" value="${s.carga ?? ""}" placeholder="Carga">
            <input type="number" class="edit-reps" value="${s.repeticoes ?? ""}" placeholder="Reps">
            <input type="number" class="edit-series" value="${s.series ?? ""}" placeholder="Série #">
            <textarea class="edit-obs">${s.observacoes ?? ""}</textarea>
            <button type="button" class="remove-btn">Remover</button>
          `;
          row.querySelector(".remove-btn").onclick = () => row.remove();
          list.appendChild(row);
        });

        block.querySelector(".add-serie-btn").onclick = () => {
          const row = document.createElement("div");
          row.className = "series-row";
          row.innerHTML = `
            <input type="number" class="edit-carga" placeholder="Carga">
            <input type="number" class="edit-reps" placeholder="Reps">
            <input type="number" class="edit-series" placeholder="Série #">
            <textarea class="edit-obs"></textarea>
            <button type="button" class="remove-btn">Remover</button>
          `;
          row.querySelector(".remove-btn").onclick = () => row.remove();
          list.appendChild(row);
        };

        editContainer.appendChild(block);
      }

      // =========================
      // BOTÃO ADICIONAR NOVO EXERCÍCIO
      // =========================
      const addExButton = document.createElement("button");
      addExButton.type = "button";
      addExButton.className = "btn primary";
      addExButton.textContent = "+ Adicionar Exercício";
      editContainer.appendChild(addExButton);

      addExButton.onclick = async () => {
        try {
          const { data: allExs, error: exErr } = await supabase
            .from("exercicios")
            .select("id_exercicio,nome_exercicio");
          if (exErr) throw exErr;

          const select = document.createElement("select");
          select.innerHTML = allExs
            .map(ex => `<option value="${ex.id_exercicio}">${ex.nome_exercicio}</option>`)
            .join("");

          const confirmBtn = document.createElement("button");
          confirmBtn.textContent = "Adicionar";
          confirmBtn.type = "button";

          const modalAdd = document.createElement("div");
          modalAdd.className = "mini-modal";
          modalAdd.innerHTML = "<h3>Escolha o exercício</h3>";
          modalAdd.appendChild(select);
          modalAdd.appendChild(confirmBtn);

          modal.appendChild(modalAdd);

          confirmBtn.onclick = () => {
            const chosenId = Number(select.value);
            const chosenName = allExs.find(ex => ex.id_exercicio === chosenId)?.nome_exercicio;

            const block = document.createElement("div");
            block.className = "ex-edit";
            block.dataset.idEx = chosenId;

            block.innerHTML = `
              <strong>${chosenName || "Novo Exercício"}</strong>
              <div class="series-edit-list"></div>
              <button type="button" class="add-serie-btn">+ Série</button>
            `;

            const list = block.querySelector(".series-edit-list");

            const addSerie = () => {
              const row = document.createElement("div");
              row.className = "series-row";
              row.innerHTML = `
                <input type="number" class="edit-carga" placeholder="Carga">
                <input type="number" class="edit-reps" placeholder="Reps">
                <input type="number" class="edit-series" placeholder="Série #">
                <textarea class="edit-obs"></textarea>
                <button type="button" class="remove-btn">Remover</button>
              `;
              row.querySelector(".remove-btn").onclick = () => row.remove();
              list.appendChild(row);
            };

            block.querySelector(".add-serie-btn").onclick = addSerie;
            addSerie();

            editContainer.appendChild(block);
            modal.removeChild(modalAdd);
          };
        } catch (err) {
          console.error("Erro ao adicionar exercício:", err);
          alert("Erro ao carregar exercícios (veja console).");
        }
      };

      modal.style.display = "flex";

    } catch (err) {
      console.error(err);
      alert("Erro ao abrir edição (veja console).");
    }
  };

  // =========================
  // EXCLUIR
  // =========================
  window.excluirTreino = async function (idTreino) {
    if (!confirm("Excluir treino e todas as séries?")) return;
    await supabase.from("treino_exercicio").delete().eq("id_treino_fk", idTreino);
    await supabase.from("treinos").delete().eq("id_treino", idTreino);
    carregarTreinos();
  };

  fecharModal.onclick = () => modal.style.display = "none";

  // =========================
  // INIT
  // =========================
  carregarTreinos();

});
