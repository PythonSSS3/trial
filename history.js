// Study history module

/* ============================================
   HISTORY
============================================ */

async function renderHistory(){

  $("historyList").innerHTML =
    `<div class="loading">
      Loading history...
    </div>`;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("study_logs")
      .select(
        `
        study_date,
        effective_hours,
        wasted_hours,
        satisfaction,
        tasks_completed,
        tasks_total,
        profiles (
          display_name
        )
        `
      )
      .order(
        "study_date",
        {
          ascending:false
        }
      )
      .limit(50);


  if(error){

    console.error(error);

    $("historyList").innerHTML =
      `<div class="empty">
        Could not load history.
      </div>`;

    return;

  }


  if(!data.length){

    $("historyList").innerHTML =
      `<div class="empty">
        No entries yet.
      </div>`;

    return;

  }


  $("historyList").innerHTML =
    data.map(
      entry => {

        const profile =
          Array.isArray(entry.profiles)
            ? entry.profiles[0]
            : entry.profiles;


        const name =
          profile?.display_name ||
          "Student";


        const hours =
          Number(
            entry.effective_hours
          ) || 0;


        const wasted =
          Number(
            entry.wasted_hours
          ) || 0;


        const completed =
          Number(
            entry.tasks_completed
          ) || 0;


        const total =
          Number(
            entry.tasks_total
          ) || 0;


        const satisfaction =
          Number(
            entry.satisfaction
          ) || 0;


        const points =
          (hours * 12) +
          (completed * 10) -
          ((total - completed) * 5) -
          (wasted * 3);


        return `

          <div class="history-row">

            <div>

              <div class="history-name">

                ${escapeHtml(name)}

              </div>


              <div class="history-meta">

                ${formatDate(
                  entry.study_date
                )}

                ·

                ${hours}h

                ·

                ${completed}/${total}
                tasks

                ·

                sat
                ${satisfaction}/10

              </div>

            </div>


            <div class="history-points">

              ${points.toFixed(1)}

            </div>

          </div>

        `;

      }
    ).join("");

}
