const fetchGameTag = document.querySelector("button");
const resultSection = document.querySelector("#result-section");
const apiKey = "RGAPI-d448b577-64b5-463b-98ce-ff37452190f0";
const divisions = ["IV", "III", "II", "I"];
const tiers = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];
const probabilidades = [0.55, 0.6, 0.65, 0.7];
const allRanks = [];

fetchGameTag.addEventListener("click", async (event) => {
  event.preventDefault();
  resultSection.innerHTML = "";
  createAllRanks();
  const loadingDiv = document.createElement("div");
  loadingDiv.id = "loading";
  loadingDiv.textContent = "CARGANDO...";
  resultSection.appendChild(loadingDiv);

  const gameTagLoL = document.querySelector("input").value;
  const server = document.querySelector("select").value;

  if (!gameTagLoL.includes("#")) {
    alert("Ingresa un GameTag válido con #");
    return;
  }

  const [gameName, tagLine] = gameTagLoL.split("#");

  fetchGameTag.disabled = true;

  try {
    const puuid = await getUUID(gameName, tagLine);
    const leagueData = await getLeagueInfoPlayer(puuid, server);
    const soloQData = leagueData.find((entry) => entry.queueType === "RANKED_SOLO_5x5");
    if (!soloQData || soloQData.length === 0) return;
    const { tier, rank, wins, losses, leaguePoints } = soloQData;
    renderTier(tier, rank, wins, losses, leaguePoints);
    const soloqRank = tier + " " + rank;

    renderResultArticleDynamic(soloqRank, leaguePoints);
  } catch (error) {
    console.error(error);
    alert("Error obteniendo información del jugador");
  } finally {
    fetchGameTag.disabled = false; // Rehabilitar botón después
    if (document.getElementById("loading")) {
      document.getElementById("loading").remove();
    }
  }
});

const getUUID = async (gameName, tagLine) => {
  const getUUIDUrl = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${apiKey}`;

  try {
    const uuidLoL = await fetch(getUUIDUrl);

    if (!uuidLoL.ok) {
      console.error("Cuenta no encontrada");
    }

    const data = await uuidLoL.json();
    if (Array.isArray(data) && data.length === 0) {
      console.error("No hay datos");
      return;
    }

    if (data.status && data.status.status_code !== 200) {
      console.error("Error de la API:", data.status.message);
      return;
    }

    return data.puuid;
  } catch (error) {
    console.error(error);
  }
};

const getLeagueInfoPlayer = async (puuid, server) => {
  const leagueInfoUrl = ` https://${server}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}?api_key=${apiKey}`;

  try {
    const playerInfo = await fetch(leagueInfoUrl);

    const data = await playerInfo.json();

    return data;
  } catch (error) {
    console.error(error);
  }
};

const lpToReachTarget = (currentRank, currentLp, targetRank) => {
  const targetIndex = allRanks.indexOf(targetRank);

  const totalDivToClimb = targetIndex - currentRank;
  if (totalDivToClimb < 0) return 0;
  const lpToTarget = totalDivToClimb * 100 - currentLp;
  return lpToTarget;
};

const calculateGames = (lpWin = 20, lpLose = 18, lpNeeded = 100) => {
  const results = [];
  const probabilidades = [0.52, 0.55, 0.6, 0.65];

  for (let prob of probabilidades) {
    const lpPromedio = lpWin * prob - lpLose * (1 - prob);
    if (lpPromedio <= 0) {
      continue;
    }

    const totalGames = Math.ceil(lpNeeded / lpPromedio);

    const wins = Math.ceil((lpNeeded + totalGames * lpLose * (1 - prob)) / lpWin);

    const losses = totalGames - wins;

    results.push({
      winRate: prob * 100,
      totalGames,
      wins,
      losses,
    });
  }

  return results;
};

const renderTier = (tier, division, wins, losses, currentLp) => {
  const winratio = (wins / (wins + losses)) * 100;
  const gamesNeeded = calculateGames();
  resultSection.insertAdjacentHTML(
    "afterbegin",
    `
    <article id="player-stats">
      <img
          src="https://opgg-static.akamaized.net/images/medals_new/${tier}.png?image=q_auto:good,f_webp,w_180&v=1760669585"
          alt="tier"
      />
      <h4>${tier} ${division} ${currentLp}LP</h4>
      <div id="wr-stat">
          <p class="wins">${wins}W</p>
          <p class="losses">${losses}L</p>
          <p class="win-ratio-player">${winratio.toFixed(2)}% WR</p>
      </div>
    </article>
    `,
  );
};

const createAllRanks = () => {
  allRanks.length = 0;
  for (let tier of tiers) {
    for (let division of divisions) {
      const rank = `${tier} ${division}`;
      allRanks.push(rank);
    }
  }
  allRanks.push("MASTER I");
  return allRanks;
};

const tierOptions = (currentIndexTier) => {
  let optionsHTML = "";
  for (let i = currentIndexTier + 1; i < allRanks.length; i++) {
    optionsHTML += `<option value="${allRanks[i]}">${allRanks[i]}</option>`;
  }
  return optionsHTML;
};

const renderResultArticleDynamic = (rank, leaguePoints) => {
  const indexRank = allRanks.indexOf(rank);
  const defaultNextRank = allRanks[indexRank + 1];
  const lpToNext = lpToReachTarget(indexRank, leaguePoints, defaultNextRank);
  const results = calculateGames(20, 18, lpToNext);

  const article = document.createElement("article");
  article.id = "info-game";
  resultSection.appendChild(article);

  const divSelectTier = document.createElement("div");
  divSelectTier.id = "select-tier";
  article.appendChild(divSelectTier);

  const select = document.createElement("select");
  select.name = "tier";
  select.id = "tier";
  select.innerHTML = tierOptions(indexRank);
  divSelectTier.appendChild(select);

  const gamesH2 = document.createElement("h2");
  gamesH2.id = `games`;
  article.appendChild(gamesH2);

  const inputWin = document.createElement("input");
  inputWin.type = "text";
  inputWin.placeholder = "+20 LP";
  divSelectTier.appendChild(inputWin);

  const inputLose = document.createElement("input");
  inputLose.type = "text";
  inputLose.placeholder = "-18 LP";
  divSelectTier.appendChild(inputLose);

  const btn = document.createElement("button");
  btn.id = "btn-act";
  btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 24 24">
          <path d="M12 2l10 10-10 10-1.41-1.41L19.17 13H2v-2h17.17l-8.58-8.59L12 2z"/>
      </svg>
  `;
  divSelectTier.appendChild(btn);

  const resultsDiv = document.createElement("div");
  resultsDiv.id = "results";
  const renderWinsAndLoses = (results, gamesH2, resultsDiv) => {
    if (!results || results.length === 0) {
      gamesH2.innerHTML = `0<span>WINS NEEDED</span>`;
      resultsDiv.innerHTML = `<span>No se puede calcular</span>`;
      return;
    }

    resultsDiv.innerHTML = results
      .map(
        (result) => `
        <span>${result.winRate.toFixed(0)}%wr → ${result.totalGames} games, ${result.wins}W/${result.losses}L</span>
      `,
      )
      .join("");

    gamesH2.innerHTML = `${results[0].totalGames}<span>GAMES NEEDED</span>`;
  };

  renderWinsAndLoses(results, gamesH2, resultsDiv);
  article.appendChild(resultsDiv);

  select.addEventListener("change", () => {
    const lpTarget = lpToReachTarget(indexRank, leaguePoints, select.value);
    const lpWin = Number(inputWin.value) || 20;
    const lpLose = Number(inputLose.value) || 18;
    const results = calculateGames(lpWin, lpLose, lpTarget);
    renderWinsAndLoses(results, gamesH2, resultsDiv);
  });

  // Evento click del botón
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const lpWin = Number(inputWin.value) || 20;
    const lpLose = Number(inputLose.value) || 18;
    const lpTarget = lpToReachTarget(indexRank, leaguePoints, select.value);
    const results = calculateGames(lpWin, lpLose, lpTarget);
    renderWinsAndLoses(results, gamesH2, resultsDiv);
  });
};
