// Test scores module

/* ============================================
   TEST SCORES
============================================ */

function selectTestType(type){
  selectedTestType=type;
  $("neetTypeBtn").classList.toggle("active",type==="NEET");
  $("cbseTypeBtn").classList.toggle("active",type==="CBSE");

  $("testMax").value=type==="NEET" ? 720 : 100;
  $("testMaxLabel").textContent=type==="NEET" ? "Maximum marks" : "Maximum marks";
  updateTestPreview();
}

function updateTestPreview(){
  const marks=Number($("testMarks")?.value)||0;
  const max=Number($("testMax")?.value)||0;
  let points=0;
  if(marks>=0 && max>0 && marks<=max){
    points=selectedTestType==="NEET" ? marks/3 : marks;
  }
  $("testPointsPreview").textContent=`+${points.toFixed(1)}`;
}

$("testMarks").addEventListener("input",updateTestPreview);
$("testMax").addEventListener("input",updateTestPreview);

async function renderTests(){
  if(!currentUser) return;

  const list=$("testList");
  if(!list) return;

  list.innerHTML=`<div class="loading">Loading tests...</div>`;

  const {data,error}=await supabaseClient
    .from("test_scores")
    .select("id,test_type,test_title,marks,max_marks,test_date,points_awarded,created_at")
    .eq("user_id",currentUser.id)
    .order("test_date",{ascending:false})
    .order("created_at",{ascending:false})
    .limit(40);

  if(error){
    console.error("TEST LOAD:",error);
    list.innerHTML=`<div class="empty">Could not load tests. Run the test-score database migration in your real Supabase SQL Editor first.</div>`;
    return;
  }

  if(!data?.length){
    list.innerHTML=`<div class="empty">No tests recorded yet.</div>`;
    $("testTrend").innerHTML=`<div class="chart-empty">Add your first test to start tracking improvement.</div>`;
    return;
  }

  list.innerHTML=data.map(test=>{
    const isNeet=test.test_type==="NEET";
    return `
      <div class="test-list-row fade-pop">
        <div class="test-dot">${isNeet?"N":"C"}</div>
        <div class="test-main">
          <div class="test-title">${escapeHtml(test.test_title || (isNeet?"NEET Mock":"CBSE Test"))}</div>
          <div class="test-meta">${isNeet?"NEET":"CBSE"} · ${escapeHtml(formatDate(test.test_date))} · ${Number(test.marks).toFixed(1)}/${Number(test.max_marks).toFixed(1)}</div>
        </div>
        <div class="test-points">+${Number(test.points_awarded).toFixed(1)}</div>
        <button class="test-delete" onclick="deleteTest('${test.id}')">✕</button>
      </div>
    `;
  }).join("");

  renderTestTrend(data);
}

function renderTestTrend(data){
  const trend=$("testTrend");
  if(!trend) return;

  const neet=data.filter(t=>t.test_type==="NEET").sort((a,b)=>new Date(a.test_date)-new Date(b.test_date));
  const cbse=data.filter(t=>t.test_type==="CBSE").sort((a,b)=>new Date(a.test_date)-new Date(b.test_date));

  const makeChart=(arr,label,max)=>{
    if(!arr.length) return `<div class="chart-empty">${label}: no scores yet.</div>`;
    const recent=arr.slice(-8);
    return `
      <div class="small-note" style="margin:0 0 5px">${label}</div>
      <div class="chart">
        ${recent.map((t,i)=>{
          const pct=Math.max(3,Math.min(100,(Number(t.marks)/max)*100));
          return `
            <div class="chart-day">
              <div class="chart-value">${Number(t.marks).toFixed(0)}</div>
              <div class="chart-bar-wrap"><div class="chart-bar" style="height:${pct}%"></div></div>
              <div class="chart-label">${i+1}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  };

  trend.innerHTML=makeChart(neet,"NEET",720)+makeChart(cbse,"CBSE",100);
}

async function addTestScore(){
  if(!currentUser) return;

  const title=$("testTitle").value.trim();
  const date=$("testDate").value;
  const marks=Number($("testMarks").value);
  const max=Number($("testMax").value);

  if(!title || !date || !Number.isFinite(marks) || !Number.isFinite(max)){
    showToast("Fill in the test name, date and marks.");
    return;
  }
  if(max<=0 || marks<0 || marks>max){
    showToast("Marks must be between 0 and the maximum marks.");
    return;
  }

  const btn=$("saveTestBtn");
  btn.disabled=true;
  btn.textContent="Saving...";

  const {data,error}=await supabaseClient.rpc("submit_test_score",{
    p_test_type:selectedTestType,
    p_test_title:title,
    p_marks:marks,
    p_max_marks:max,
    p_test_date:date
  });

  btn.disabled=false;
  btn.textContent="Add test score";

  if(error){
    console.error("TEST INSERT:",error);
    showToast(error.message);
    return;
  }

  const awarded=Number(data?.points_awarded ?? data?.[0]?.points_awarded ?? 0);
  $("testTitle").value="";
  $("testMarks").value="";
  updateTestPreview();

  showToast(`Test added · +${awarded.toFixed(1)} points ✓`);
  await loadProfile();
  await renderTests();
  await renderBoard();
}

async function deleteTest(id){
  if(!currentUser) return;
  if(!confirm("Delete this test and remove its points from your leaderboard total?")) return;

  const {error}=await supabaseClient.rpc("delete_test_score",{p_test_id:id});

  if(error){
    console.error("TEST DELETE:",error);
    showToast(error.message);
    return;
  }

  showToast("Test removed");
  await loadProfile();
  await renderTests();
  await renderBoard();
}

$("saveTestBtn").addEventListener("click",addTestScore);
