// Profile / personal dashboard / analytics

/* ============================================
   LOAD CURRENT PROFILE
============================================ */

async function loadProfile(){

  if(!currentUser) return;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();


  if(error){

    console.error(error);

    showToast(
      "Could not load your profile."
    );

    return;

  }


  currentProfile = data;


  $("member").value =
    currentProfile.display_name;

  $("userInfo").textContent =
    "Logged in as " +
    currentProfile.display_name +
    " · @" +
    currentProfile.username +
    " · " +
    (Number(currentProfile.points)||0).toFixed(0) +
    " points";

  renderMyProfile();

}




/* ============================================
   PERSONAL STREAK + ACHIEVEMENTS
============================================ */



function fmtHours(h){
  h=Number(h)||0;
  if(h<1) return `${Math.round(h*60)}m`;
  return `${h.toFixed(1)}h`;
}

function getDateKey(d){
  return dateKeyFromDate(d);
}

function calculateCurrentStreak(logs){
  const dates=new Set(
    (logs||[])
      .filter(x => Number(x.effective_hours)>0)
      .map(x => x.study_date)
  );

  let cursor=new Date();
  let today=getDateKey(cursor);

  // If today hasn't been logged yet, count backwards from yesterday.
  if(!dates.has(today)){
    cursor.setDate(cursor.getDate()-1);
  }

  let streak=0;
  while(dates.has(getDateKey(cursor))){
    streak++;
    cursor.setDate(cursor.getDate()-1);
  }
  return streak;
}

async function renderPersonal(){
  if(!currentUser) return;

  const {data:logs,error}=await supabaseClient
    .from("study_logs")
    .select("study_date,effective_hours")
    .eq("student_id",currentUser.id)
    .order("study_date",{ascending:true});

  if(error){
    console.error("PERSONAL STUDY:",error);
    return;
  }

  const rows=logs||[];
  const totalHours=rows.reduce(
    (s,r)=>s+(Number(r.effective_hours)||0),
    0
  );

  const uniqueDates=[...new Set(
    rows
      .filter(r=>Number(r.effective_hours)>0)
      .map(r=>r.study_date)
  )].sort();

  const firstDate=uniqueDates.length
    ? new Date(uniqueDates[0]+"T00:00:00")
    : new Date();

  const today=new Date();

  const elapsedDays=Math.max(
    1,
    Math.floor(
      (
        new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        )-firstDate
      )/86400000
    )+1
  );

  const avgDay=totalHours/elapsedDays;
  const avgWeek=avgDay*7;
  const streak=calculateCurrentStreak(rows);
  const basePoints=Number(currentProfile?.points)||0;

  $("personalTotalPoints").textContent=basePoints.toFixed(0);
  $("personalTotalHours").textContent=fmtHours(totalHours);
  $("personalAvgDay").textContent=fmtHours(avgDay);
  $("personalAvgWeek").textContent=fmtHours(avgWeek);
  $("personalStreak").textContent=streak;

  const {data:earned,error:earnedError}=await supabaseClient
    .from("user_achievements")
    .select("achievement_id,bonus_points,unlocked_at")
    .eq("user_id",currentUser.id);

  if(earnedError){
    console.error("ACHIEVEMENT LOAD:",earnedError);
    $("achievementList").innerHTML=
      `<div class="empty">Could not load achievements.</div>`;
    return;
  }

  const earnedMap=new Map(
    (earned||[]).map(x=>[x.achievement_id,x])
  );

  const eligible=ACHIEVEMENTS.filter(a=>{
    if(a.type==="hours") return totalHours>=a.target;
    if(a.type==="points") return basePoints>=a.target;
    if(a.type==="streak") return streak>=a.target;
    return false;
  });

  let newlyUnlocked=false;

  for(const a of eligible){
    if(!earnedMap.has(a.id)){
      const {error:awardError}=await supabaseClient.rpc(
        "unlock_achievement",
        {
          p_achievement_id:a.id,
          p_bonus_points:a.bonus
        }
      );

      if(awardError){
        console.error("ACHIEVEMENT UNLOCK:",awardError);
      }else{
        newlyUnlocked=true;
      }
    }
  }

  const {data:earned2,error:earned2Error}=await supabaseClient
    .from("user_achievements")
    .select("achievement_id,bonus_points,unlocked_at")
    .eq("user_id",currentUser.id);

  if(earned2Error){
    console.error("ACHIEVEMENT RELOAD:",earned2Error);
  }

  const finalEarned=earned2||[];
  const finalMap=new Map(
    finalEarned.map(x=>[x.achievement_id,x])
  );

  const bonusTotal=finalEarned.reduce(
    (s,x)=>s+(Number(x.bonus_points)||0),
    0
  );

  $("achievementCount").textContent=finalEarned.length;
  $("achievementPoints").textContent=
    `+${bonusTotal.toFixed(0)} pts`;

  $("achievementList").innerHTML=
    ACHIEVEMENTS.map(a=>{
      const done=finalMap.has(a.id);
      let progress="";

      if(a.type==="hours"){
        progress=`${fmtHours(totalHours)} / ${a.target}h`;
      }

      if(a.type==="points"){
        progress=`${basePoints.toFixed(0)} / ${a.target} pts`;
      }

      if(a.type==="streak"){
        progress=`${streak} / ${a.target} days`;
      }

      return `
        <div class="achievement ${done?"unlocked":"locked"}">
          <div class="achievement-icon">${a.icon}</div>

          <div class="achievement-main">
            <div class="achievement-title">${a.title}</div>
            <div class="achievement-desc">${a.desc}</div>
            <div class="achievement-status">
              ${done ? "✓ Unlocked" : "Progress: "+progress}
            </div>
          </div>

          <div class="achievement-bonus">+${a.bonus}</div>
        </div>
      `;
    }).join("");

  if(newlyUnlocked){
    showToast("Achievement unlocked 🏅");
    await loadProfile();
  }
}


/* ============================================
   WEEKLY STUDY GRAPH
============================================ */

function getWeekStart(){
  const d=new Date();
  const day=d.getDay();
  const diff=day===0 ? -6 : 1-day;
  d.setDate(d.getDate()+diff);
  return new Date(d.getFullYear(),d.getMonth(),d.getDate());
}

function dateKeyFromDate(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

async function renderStudyChart(){
  if(!currentUser) return;
  const chart=$("studyChart");
  if(!chart) return;

  const start=getWeekStart();
  const end=new Date(start);
  end.setDate(end.getDate()+6);

  const startKey=dateKeyFromDate(start);
  const endKey=dateKeyFromDate(end);

  $("weekLabel").textContent =
    `${start.toLocaleDateString("en-IN",{day:"2-digit",month:"short"})} – ${end.toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}`;

  const {data,error}=await supabaseClient
    .from("study_logs")
    .select("study_date,effective_hours")
    .eq("student_id",currentUser.id)
    .gte("study_date",startKey)
    .lte("study_date",endKey)
    .order("study_date",{ascending:true});

  if(error){
    console.error("WEEK GRAPH:",error);
    chart.innerHTML=`<div class="chart-empty">Could not load this week's study data.</div>`;
    return;
  }

  const totals={};
  (data||[]).forEach(row=>{
    totals[row.study_date]=(totals[row.study_date]||0)+(Number(row.effective_hours)||0);
  });

  const days=[];
  for(let i=0;i<7;i++){
    const d=new Date(start);
    d.setDate(start.getDate()+i);
    const key=dateKeyFromDate(d);
    days.push({
      key,
      label:d.toLocaleDateString("en-IN",{weekday:"short"}).slice(0,2),
      value:totals[key]||0
    });
  }

  const weekTotal=days.reduce((s,d)=>s+d.value,0);
  $("weekTotal").textContent=`${weekTotal.toFixed(1)}h`;

  const max=Math.max(1,...days.map(d=>d.value));

  chart.innerHTML=days.map(d=>{
    const isToday=d.key===localDate();
    const height=d.value ? Math.max(4,(d.value/max)*100) : 2;
    return `
      <div class="chart-day ${isToday?"today":""}">
        <div class="chart-value">${d.value ? d.value.toFixed(1)+"h" : "—"}</div>
        <div class="chart-bar-wrap">
          <div class="chart-bar" style="height:${height}%"></div>
        </div>
        <div class="chart-label">${d.label}</div>
      </div>
    `;
  }).join("");
}


/* ============================================
   PROFILE DISPLAY
   Uses initials because profiles has no avatar_url.
============================================ */

function avatarMarkup(profile, className="profile-photo"){
  return `<div class="${className}">${escapeHtml(
    initials(profile?.display_name)
  )}</div>`;
}

function renderMyProfile(){
  if(!currentProfile) return;

  const avatar=$("myProfileAvatar");

  if(avatar){
    avatar.textContent=
      initials(currentProfile.display_name);
  }

  $("myProfileName").textContent=
    currentProfile.display_name || "Student";

  $("myProfileUsername").textContent=
    currentProfile.username
      ? "@" + currentProfile.username
      : "";

  $("myProfilePoints").textContent=
    `${Number(currentProfile.points)||0} points`;
}


/* ============================================
   REFRESH EVERYTHING
============================================ */

async function updateCommandCenter(){
  if(!currentUser) return;
  try{
    const start=getWeekStart();
    const startKey=dateKeyFromDate(start);
    const {data:logs}=await supabaseClient
      .from("study_logs")
      .select("study_date,effective_hours")
      .eq("student_id",currentUser.id)
      .gte("study_date",startKey)
      .lte("study_date",localDate());
    const hours=(logs||[]).reduce((s,r)=>s+(Number(r.effective_hours)||0),0);
    const {data:tasks}=await supabaseClient
      .from("tasks")
      .select("completed")
      .eq("student_id",currentUser.id)
      .eq("task_date",localDate());
    const total=(tasks||[]).length;
    const done=(tasks||[]).filter(t=>t.completed).length;
    const taskPct=total?Math.round(done/total*100):0;
    const pts=Math.max(0,Number(currentProfile?.points)||0);
    if($("momentumText")) $("momentumText").textContent=hours>=10?"You're building serious momentum.":hours>0?"Keep the streak moving.":"Your next focused hour starts here.";
    if($("momentumNumber")) $("momentumNumber").textContent=fmtHours(hours);
    if($("momentumOrb")) $("momentumOrb").style.setProperty("--orb",`${Math.min(100,Math.round(hours/40*100))}%`);
    if($("vizTodayHours")){
      const today=(logs||[]).find(r=>r.study_date===localDate());
      $("vizTodayHours").textContent=fmtHours(today?.effective_hours||0);
    }
    if($("vizTasks")) $("vizTasks").textContent=`${taskPct}%`;
    if($("vizPoints")) $("vizPoints").textContent=pts.toFixed(0);
  }catch(err){ console.error("COMMAND CENTER:",err); }
}

async function refreshAll(){

  if(currentUser){
    await loadProfile();
  }

  await renderBoard();
  await renderHistory();
  await renderTasks();
  await renderTests();
  await renderStudyChart();
  await renderPersonal();
  await renderShop();
  await updateCommandCenter();

  startRealtime();
  startMidnightRefresh();

}
