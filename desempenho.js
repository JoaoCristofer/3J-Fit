// desempenho.js
const SUPABASE_URL = "https://zcgretxaftcwukkzbxfo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZ3JldHhhZnRjd3Vra3pieGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTQ1MjgsImV4cCI6MjA3NjE3MDUyOH0.x-u14dOI1Q9Opg6TfTD628p3gwqpgfO9IqgCcS3Mc6U";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const alunoId = params.get("id");
const statusEl = document.getElementById("status");
const selectEx = document.getElementById("selectEx");
const ctx = document.getElementById("chart").getContext("2d");
let chart = null;

document.getElementById("voltar").onclick = (e) => { e.preventDefault(); history.back(); };

async function carregarExerciciosDoAluno() {
  statusEl.textContent = "Carregando exercícios do aluno...";
  // pegar treinos do aluno
  const { data: treinos, error: errT } = await supabase
    .from("treinos")
    .select("id_treino")
    .eq("id_aluno_fk", alunoId);

  if (errT) { console.error(errT); statusEl.textContent = "Erro ao carregar." ; return; }

  const treinoIds = treinos.map(t => t.id_treino);
  if (!treinoIds.length) {
    statusEl.textContent = "Aluno não tem treinos ainda.";
    // fallback: listar todos os exercícios do catálogo
    const { data: allEx } = await supabase.from("exercicios").select("id_exercicio,nome_exercicio").order("nome_exercicio", { ascending:true });
    (allEx||[]).forEach(ex => {
      const opt = document.createElement("option"); opt.value = ex.id_exercicio; opt.textContent = ex.nome_exercicio;
      selectEx.appendChild(opt);
    });
    return;
  }

  // pegar exercícios usados pelo aluno
  const { data: used, error: errU } = await supabase
    .from("treino_exercicio")
    .select("id_exercicio_fk")
    .in("id_treino_fk", treinoIds)
    .distinct("id_exercicio_fk");

  if (errU) { console.error(errU); statusEl.textContent = "Erro ao carregar exercícios."; return; }

  const ids = Array.from(new Set((used || []).map(u => u.id_exercicio_fk))).filter(Boolean);
  if (!ids.length) {
    statusEl.textContent = "Nenhum exercício encontrado para o aluno.";
    return;
  }

  const { data: exs } = await supabase.from("exercicios").select("id_exercicio,nome_exercicio").in("id_exercicio", ids).order("nome_exercicio", { ascending:true });
  selectEx.innerHTML = '<option value="">-- selecione --</option>';
  (exs||[]).forEach(ex => {
    const opt = document.createElement("option"); opt.value = ex.id_exercicio; opt.textContent = ex.nome_exercicio;
    selectEx.appendChild(opt);
  });

  statusEl.textContent = "";
}

selectEx.onchange = async () => {
  const exId = selectEx.value;
  if (!exId) return;
  try {
    statusEl.textContent = "Carregando dados...";
    // pegar treinos do aluno (com data)
    const { data: treinos, error: errT } = await supabase
      .from("treinos")
      .select("id_treino,data_treino")
      .eq("id_aluno_fk", alunoId)
      .order("data_treino", { ascending: true });

    if (errT) throw errT;
    const treinoIds = treinos.map(t => t.id_treino);
    if (!treinoIds.length) { statusEl.textContent = "Sem treinos."; return; }

    // pegar séries do exercício selecionado dentro desses treinos
    const { data: series, error: errS } = await supabase
      .from("treino_exercicio")
      .select("id_treino_fk,carga,repeticoes,series")
      .in("id_treino_fk", treinoIds)
      .eq("id_exercicio_fk", Number(exId));

    if (errS) throw errS;

    // agrupar por treinoId -> pegar carga máxima ou média por treino
    const mapByTreino = {};
    (series||[]).forEach(s => {
      if (!mapByTreino[s.id_treino_fk]) mapByTreino[s.id_treino_fk] = [];
      mapByTreino[s.id_treino_fk].push(s);
    });

    const labels = [];
    const cargasMax = [];
    const repsAvg = [];

    treinos.forEach(t => {
      labels.push(new Date(t.data_treino).toLocaleDateString("pt-BR"));
      const arr = mapByTreino[t.id_treino] || [];
      if (arr.length === 0) {
        cargasMax.push(null);
        repsAvg.push(null);
      } else {
        const cargas = arr.map(a => Number(a.carga || 0));
        const reps = arr.map(a => Number(a.repeticoes || 0));
        cargasMax.push(Math.max(...cargas));
        repsAvg.push(Math.round((reps.reduce((s,x)=>s+(x||0),0) / reps.length) * 100) / 100);
      }
    });

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Carga máxima (kg)', data: cargasMax, borderColor: '#3b82f6', tension:0.2, spanGaps:true },
          { label: 'Repetições médias', data: repsAvg, borderColor: '#10b981', tension:0.2, spanGaps:true, yAxisID: 'y2' }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { title: { display:true, text:'Carga (kg)' }, beginAtZero:true },
          y2: { position:'right', title:{display:true,text:'Repetições'}, beginAtZero:true, grid:{display:false} }
        }
      }
    });

    statusEl.textContent = "";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Erro ao carregar dados (veja console).";
  }
};

(async function init(){
  if (!alunoId) {
    statusEl.textContent = "Aluno não informado na URL (?id=...).";
    return;
  }
  await carregarExerciciosDoAluno();
})();
