const updatesList = document.getElementById("updatesList");

function renderUpdates() {
  if (!updatesList) return;

  updatesList.innerHTML = APP_UPDATES.map(
    (update, index) => `
                <article class="card update-card ${index === 0 ? "active" : ""}">
                    <div class="update-head">
                        <div>
                            <small>الإصدار ${update.version}</small>
                            <h2>${update.title}</h2>
                        </div>

                        ${
                          index === 0
                            ? `<span class="pill present">الأحدث</span>`
                            : ""
                        }
                    </div>
                    <small class="update-date">${update.date}</small>
                    <ul>
                        ${update.changes
                          .map((change) => `<li>${change}</li>`)
                          .join("")}
                    </ul>
                </article>
            `,
  ).join("");
}

renderUpdates();
