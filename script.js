// Supabase-Konfiguration
const supabaseUrl = 'https://tzvwghchxzklzcgjqoex.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dndnaGNoeHprbHpjZ2pxb2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMzY5NjcsImV4cCI6MjA2NDYxMjk2N30.d_LPinE6_-hQRQX2y-IjSdzZ3oA9nK9pDp0dSlh5-YI'; // ← deinen anon Key einsetzen
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// UI-Elemente
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const uploadStatus = document.getElementById("upload-status");
const jahrDropdown = document.getElementById("jahr-auswahl");

let flughaeufigkeitChart = null;
let flugzeitChart = null;

checkSession();

function checkSession() {
  const user = supabase.auth.user();
  if (user) {
    showApp();
    ladeJahrauswahl();
    ladeUndZeigeDiagramme();
  } else {
    showLogin();
  }
}

function showApp() {
  authSection.style.display = "none";
  appSection.style.display = "block";
}

function showLogin() {
  authSection.style.display = "flex";
  appSection.style.display = "none";
}

// LOGIN
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const { error } = await supabase.auth.signIn({ email, password });
  if (error) return alert("❌ " + error.message);

  checkSession();
});

// SIGNUP
document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert("❌ " + error.message);

  alert("✅ Registrierung erfolgreich. Bitte bestätige deine E-Mail.");
});

// LOGOUT
document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  checkSession();
});

// Jahr-Auswahl Dropdown füllen
function ladeJahrauswahl() {
  const aktuellesJahr = new Date().getFullYear();
  jahrDropdown.innerHTML = "";
  for (let y = aktuellesJahr; y >= 2020; y--) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    jahrDropdown.appendChild(opt);
  }
  jahrDropdown.value = aktuellesJahr;
}

// HELPER: Excel-Datum (Seriennummer) → ISO
function excelDateToISO(excelValue) {
  if (typeof excelValue === 'number') {
    const date = new Date((excelValue - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  } else if (typeof excelValue === 'string') {
    return excelValue;
  } else {
    return null;
  }
}

// HELPER: Excel-Zeit → hh:mm:ss
function excelTimeToString(value) {
  if (typeof value === "number") {
    const seconds = Math.floor(value * 86400);
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  } else if (typeof value === "string") {
    return value;
  } else {
    return null;
  }
}
// Excel-Hochladen mit Duplikatprüfung
document.getElementById("upload-btn").addEventListener("click", async () => {
  const file = document.getElementById("excel-file").files[0];
  if (!file) return alert("❌ Bitte eine Datei auswählen.");

  const reader = new FileReader();
  reader.onload = async (e) => {
    const workbook = XLSX.read(e.target.result, { type: "binary" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const user = supabase.auth.user();
    if (!user) return alert("Nicht eingeloggt.");

    const umgewandelt = rows.map(row => ({
      user_id: user.id,
      datum: excelDateToISO(row.Datum),
      flugzeug: row.Flugzeug ? String(row.Flugzeug).trim() : null,
      start: excelTimeToString(row.Start),
      landung: excelTimeToString(row.Landung),
      flugzeit: parseFloat(row.Flugzeit)
    }));

    const ungültig = umgewandelt.filter(e => !e.flugzeug).length;
    const gültig = umgewandelt.filter(e => e.flugzeug);

    const { data: vorhandene } = await supabase
      .from("fluege")
      .select("datum, flugzeug, start")
      .eq("user_id", user.id);

    const filtered = gültig.filter(e =>
      !vorhandene.some(v =>
        v.datum === e.datum &&
        v.flugzeug === e.flugzeug &&
        v.start === e.start
      )
    );

    if (filtered.length === 0) {
      uploadStatus.textContent = "⚠️ Alle Zeilen sind bereits vorhanden (Duplikate).";
      return;
    }

    const { error } = await supabase.from("fluege").insert(filtered);

    if (error) {
      uploadStatus.textContent = "❌ Fehler: " + error.message;
    } else {
      let msg = `✅ ${filtered.length} Einträge erfolgreich hochgeladen.`;
      if (ungültig > 0) {
        msg += ` ⚠️ ${ungültig} ungültige Zeile(n) übersprungen.`;
      }
      uploadStatus.textContent = msg;
      ladeUndZeigeDiagramme();
    }
  };
  reader.readAsBinaryString(file);
});

// Jahr-Auswahl aktualisiert Diagramme
jahrDropdown.addEventListener("change", ladeUndZeigeDiagramme);

// Diagramm-Logik
async function ladeUndZeigeDiagramme() {
  const user = supabase.auth.user();
  const jahr = jahrDropdown.value;
  const yearStart = `${jahr}-01-01`;
  const yearEnd = `${jahr}-12-31`;

  const { data: fluege, error } = await supabase
    .from("fluege")
    .select("flugzeug, flugzeit, datum")
    .gte("datum", yearStart)
    .lte("datum", yearEnd)
    .eq("user_id", user.id);

  if (error || !fluege || fluege.length === 0) {
    document.getElementById("most-flown").textContent = "Keine Daten";
    document.getElementById("longest-time").textContent = "Keine Daten";
    return;
  }

  const countMap = {};
  const sumMap = {};

  fluege.forEach(f => {
    if (!f.flugzeug) return;
    countMap[f.flugzeug] = (countMap[f.flugzeug] || 0) + 1;
    sumMap[f.flugzeug] = (sumMap[f.flugzeug] || 0) + (f.flugzeit || 0);
  });

  const meist = Object.entries(countMap).sort((a, b) => b[1] - a[1])[0];
  const langst = Object.entries(sumMap).sort((a, b) => b[1] - a[1])[0];

  document.getElementById("most-flown").textContent = meist ? `${meist[0]} (${meist[1]} Flüge)` : "Keine Daten";
  document.getElementById("longest-time").textContent = langst ? `${langst[0]} (${langst[1].toFixed(2)} h)` : "Keine Daten";

  const haeufigkeitData = Object.entries(countMap).map(([flugzeug, count]) => ({ flugzeug, count }));
  const zeitData = Object.entries(sumMap).map(([flugzeug, sum]) => ({ flugzeug, sum }));

  zeigePieChart(haeufigkeitData);
  zeigeBarChart(zeitData);
}

function zeigePieChart(data) {
  const ctx = document.getElementById("flughaeufigkeit-chart").getContext("2d");
  if (flughaeufigkeitChart) flughaeufigkeitChart.destroy();

  flughaeufigkeitChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: data.map(e => e.flugzeug),
      datasets: [{
        label: "Anzahl Flüge",
        data: data.map(e => e.count),
        borderWidth: 1
      }]
    },
    options: {
      responsive: false,
      plugins: {
        title: { display: true, text: "Flüge je Flugzeug (Anzahl)" }
      }
    }
  });
}

function zeigeBarChart(data) {
  const ctx = document.getElementById("flugzeit-chart").getContext("2d");
  if (flugzeitChart) flugzeitChart.destroy();

  flugzeitChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map(e => e.flugzeug),
      datasets: [{
        label: "Gesamtflugzeit (h)",
        data: data.map(e => e.sum),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: "Flugzeit je Flugzeug (Summe)" }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
