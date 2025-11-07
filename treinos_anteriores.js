// treinos_anteriores.js
const SUPABASE_URL = "https://zcgretxaftcwukkzbxfo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZ3JldHhhZnRjd3Vra3pieGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTQ1MjgsImV4cCI6MjA3NjE3MDUyOH0.x-u14dOI1Q9Opg6TfTD628p3gwqpgfO9IqgCcS3Mc6U";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const alunoId = params.get("id");
const listaTreinos = document.getElementById("listaTreinos");
const statusEl = document.getElementById("status");
const voltar = document.getElementById("voltar");
const modal = document.getElementById("modalEditar");
const fecharModal = document.getElementById("fecharModal");
const formEditar = document.getElementById("formEditar");
const editContainer = document.getElementById("edit_exercicios_container");

if (!alunoId) {
  statusEl.textContent = "Aluno não informado na URL (ex: ?id=5).";
}

voltar.onclick = (e) => { e.preventDefault(); history.back(); };

async function carregarTreinos() {
  try {
    statusEl.textContent = "Carregando treinos...";
    listaTreinos.innerHTML = "";

    // buscar treinos do aluno
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

    // buscar todas as séries relacionadas em uma única query
    const treinoIds = treinos.map(t => t.id_treino);
    const { data: seriesAll, error: errS } = await supabase
      .from("treino_exercicio")
      .select("*")
      .in("id_treino_fk", treinoIds)
      .order("id_treino_exercicio", { ascending: true });

    if (errS) throw errS;

    // map de nomes de exercícios
    const exercIds = Array.from(new Set((seriesAll || []).map(s => s.id_exercicio_fk))).filter(Boolean);
    let exercMap = {};
    if (exercIds.length) {
      const { data: exs } = await supabase
        .from("exercicios")
        .select("id_exercicio,nome_exercicio")
        .in("id_exercicio", exercIds);
      (exs || []).forEach(x => exercMap[x.id_exercicio] = x.nome_exercicio);
    }

    // agrupar séries por treino
    const seriesPorTreino = {};
    (seriesAll || []).forEach(s => {
      if (!seriesPorTreino[s.id_treino_fk]) seriesPorTreino[s.id_treino_fk] = [];
      seriesPorTreino[s.id_treino_fk].push(s);
    });

    // render
    statusEl.textContent = "";
    treinos.forEach(t => {
      const div = document.createElement("div");
      div.className = "card";
      let inner = `<h3>${new Date(t.data_treino).toLocaleDateString("pt-BR")}</h3>`;
      inner += `<div class="meta">Criado: ${new Date(t.created_at).toLocaleString()}</div>`;
      if (t.observacoes_gerais) inner += `<p><strong>Obs:</strong> ${t.observacoes_gerais}</p>`;

      const s = seriesPorTreino[t.id_treino] || [];
      if (s.length === 0) inner += `<p class="detail-list">Nenhum exercício registrado.</p>`;
      else {
        // group by exercise id
        const porEx = {};
        s.forEach(row => {
          if (!porEx[row.id_exercicio_fk]) porEx[row.id_exercicio_fk] = [];
          porEx[row.id_exercicio_fk].push(row);
        });

        inner += `<div class="detail-list">`;
        for (const exId in porEx) {
          inner += `<div class="ex-block"><strong>${exercMap[exId] || ('Ex ' + exId)}</strong>`;
          porEx[exId].forEach((ser, idx) => {
            inner += `<div>Série ${ser.series || idx+1}: ${ser.repeticoes ?? '-'} reps • ${ser.carga ?? '-'} ${ser.unidade ?? ''}`;
            if (ser.observacoes) inner += `<div><small>${ser.observacoes}</small></div>`;
            inner += `</div>`;
          });
          inner += `</div>`;
        }
        inner += `</div>`;
      }

      inner += `<div class="botao-grupo">
        <button class="btn primary" data-id="${t.id_treino}" onclick="abrirEditar(${t.id_treino})">Editar</button>
        <button class="btn secondary" data-id="${t.id_treino}" onclick="excluirTreino(${t.id_treino})">Excluir</button>
      </div>`;

      div.innerHTML = inner;
      listaTreinos.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    statusEl.textContent = "Erro ao carregar treinos (veja console).";
  }
}

// abrir modal e carregar dados do treino para edição
window.abrirEditar = async function(idTreino) {
  try {
    const { data: t, error: et } = await supabase.from("treinos").select("*").eq("id_treino", idTreino).single();
    if (et) throw et;

    document.getElementById("edit_id_treino").value = t.id_treino;
    document.getElementById("edit_data_treino").value = t.data_treino;
    document.getElementById("edit_observacoes_gerais").value = t.observacoes_gerais || "";

    // limpar container e popular com séries atuais
    editContainer.innerHTML = "";

    // buscar séries do treino
    const { data: series, error: es } = await supabase.from("treino_exercicio").select("*").eq("id_treino_fk", idTreino).order("series", { ascending: true });
    if (es) throw es;

    // buscar nomes para exercises used
    const exIds = Array.from(new Set((series||[]).map(s=>s.id_exercicio_fk))).filter(Boolean);
    let exMap = {};
    if (exIds.length) {
      const { data: exs } = await supabase.from("exercicios").select("id_exercicio,nome_exercicio").in("id_exercicio", exIds);
      (exs||[]).forEach(x => exMap[x.id_exercicio] = x.nome_exercicio);
    }

    // group series by exercise and render editable fields
    const grouped = {};
    (series||[]).forEach(s => {
      if (!grouped[s.id_exercicio_fk]) grouped[s.id_exercicio_fk] = [];
      grouped[s.id_exercicio_fk].push(s);
    });

    for (const idEx in grouped) {
      const block = document.createElement("div");
      block.className = "ex-edit";
      block.dataset.idEx = idEx;
      block.innerHTML = `<strong>${exMap[idEx] || 'Ex ' + idEx}</strong>
        <div class="series-edit-list"></div>
        <button type="button" class="add-serie-btn">+ Série</button>
      `;
      const list = block.querySelector(".series-edit-list");
      grouped[idEx].forEach(s => {
        const row = document.createElement("div");
        row.className = "series-row";
        row.innerHTML = `
          <input type="number" class="edit-carga" value="${s.carga ?? ''}" placeholder="Carga">
          <input type="number" class="edit-reps" value="${s.repeticoes ?? ''}" placeholder="Reps">
          <input type="number" class="edit-series" value="${s.series ?? ''}" placeholder="Série #">
          <textarea class="edit-obs" placeholder="Obs">${s.observacoes ?? ''}</textarea>
          <button type="button" class="remove-btn">Remover</button>
        `;
        // remove handler
        row.querySelector(".remove-btn").onclick = () => row.remove();
        list.appendChild(row);
      });
      // add new series handler
      block.querySelector(".add-serie-btn").onclick = () => {
        const row = document.createElement("div");
        row.className = "series-row";
        row.innerHTML = `
          <input type="number" class="edit-carga" placeholder="Carga">
          <input type="number" class="edit-reps" placeholder="Reps">
          <input type="number" class="edit-series" placeholder="Série #">
          <textarea class="edit-obs" placeholder="Obs"></textarea>
          <button type="button" class="remove-btn">Remover</button>
        `;
        row.querySelector(".remove-btn").onclick = () => row.remove();
        list.appendChild(row);
      };

      editContainer.appendChild(block);
    }

    // show modal
    modal.style.display = "flex";
  } catch (err) {
    console.error(err);
    alert("Erro ao abrir edição (veja console).");
  }
};

fecharModal.onclick = () => modal.style.display = "none";

// excluir treino (deleta treino_exercicio e treino)
window.excluirTreino = async function(idTreino) {
  if (!confirm("Excluir treino e todas as séries?")) return;
  try {
    // delete treino_exercicio
    await supabase.from("treino_exercicio").delete().eq("id_treino_fk", idTreino);
    await supabase.from("treinos").delete().eq("id_treino", idTreino);
    alert("Treino excluído.");
    carregarTreinos();
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir treino.");
  }
};

// salvar edição: strategy = delete all treino_exercicio for that treino and reinsert from modal
formEditar.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const id_treino = document.getElementById("edit_id_treino").value;
    const data_treino = document.getElementById("edit_data_treino").value;
    const observacoes_gerais = document.getElementById("edit_observacoes_gerais").value || null;

    // update treinos
    const { error: errU } = await supabase.from("treinos").update({ data_treino, observacoes_gerais }).eq("id_treino", id_treino);
    if (errU) throw errU;

    // remove old series
    await supabase.from("treino_exercicio").delete().eq("id_treino_fk", id_treino);

    // gather new series from modal grouped blocks
    const blocks = Array.from(editContainer.querySelectorAll(".ex-edit"));
    const inserts = [];
    for (const block of blocks) {
      const id_exercicio_fk = Number(block.dataset.idEx);
      const rows = Array.from(block.querySelectorAll(".series-row"));
      rows.forEach((r, idx) => {
        const carga = r.querySelector(".edit-carga").value || null;
        const repeticoes = r.querySelector(".edit-reps").value || null;
        const series = r.querySelector(".edit-series").value || (idx+1);
        const observacoes = r.querySelector(".edit-obs").value || null;
        inserts.push({
          id_treino_fk: Number(id_treino),
          id_exercicio_fk,
          carga: carga === "" ? null : Number(carga),
          repeticoes: repeticoes === "" ? null : Number(repeticoes),
          series: series === "" ? (idx+1) : Number(series),
          unidade: 'kg',
          observacoes
        });
      });
    }

    if (inserts.length > 0) {
      const { error: errI } = await supabase.from("treino_exercicio").insert(inserts);
      if (errI) throw errI;
    }

    modal.style.display = "none";
    alert("Treino atualizado.");
    carregarTreinos();
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar edição (veja console).");
  }
});

// inicializa
carregarTreinos();
