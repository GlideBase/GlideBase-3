// Supabase-Konfiguration
const supabaseUrl = 'https://tzvwghchxzklzcgjqoex.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dndnaGNoeHprbHpjZ2pxb2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMzY5NjcsImV4cCI6MjA2NDYxMjk2N30.d_LPinE6_-hQRQX2y-IjSdzZ3oA9nK9pDp0dSlh5-YI'; // DEIN echter anon-Key
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// UI-Elemente
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const uploadStatus = document.getElementById("upload-status");

checkSession();

function checkSession() {
  const user = supabase.auth.user();
  if (user) {
    showApp();
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
// EXCEL-HOCHLADEN
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
      flugzeug: row.Flugzeug ? String(row.Flugzeug).trim() : "",
      start: excelTimeToString(row.Start),
      landung: excelTimeToString(row.Landung),
      flugzeit: parseFloat(row.Flugzeit)
    }));

    const ungültig = umgewandelt.filter(e => !e.flugzeug).length;
    const gültig = umgewandelt.filter(e => e.flugzeug);

    if (gültig.length === 0) {
      uploadStatus.textContent = "❌ Keine gültigen Zeilen zum Hochladen.";
      return;
    }

    const { error } = await supabase.from("fluege").insert(gültig);

    if (error) {
      uploadStatus.textContent = "❌ Fehler: " + error.message;
    } else {
      let msg = `✅ ${gültig.length} Einträge erfolgreich hochgeladen.`;
      if (ungültig > 0) {
        msg += ` ⚠️ ${ungültig} Zeile(n) wurden übersprungen (fehlender Flugzeug-Wert).`;
      }
      uploadStatus.textContent = msg;
    }
  };

  reader.readAsBinaryString(file);
});

// AUSWERTUNG & DIAGRAMME
document.getElementById("load-analysis").addEventListener("click", async () => {
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const user = supabase.auth.user();
  if (!user) return alert("Nicht eingeloggt.");

  const { data: fluege, error } = await supabase
    .from("fluege")
    .select("flugzeug, flugzeit")
    .gte("datum", yearStart);

  if (error || !fluege) return alert("Fehler beim Laden der Daten.");

  // Gruppierung für Analyse
  const countMap = {};
  const sumMap = {};

  fluege.forEach(f => {
    if (!f.flugzeug) return;
    countMap[f.flugzeug] = (countMap[f.flugzeug] || 0) + 1;
    sumMap[f.flugzeug] = (sumMap[f.flugzeug] || 0) + (f.flugzeit || 0);
  });

  // Meistgeflogen
  const meist = Object.entries(countMap).sort((a, b) => b[1] - a[1])[0];
  const langst = Object.entries(sumMap).sort((a, b) => b[1] - a[1])[0];

  document.getElementById("most-flown").textContent = meist ? `${meist[0]} (${meist[1]})` : "Keine Daten";
  document.getElementById("longest-time").textContent = langst ? `${langst[0]} (${langst[1].toFixed(2)} h)` : "Keine Daten";

  // Daten aufbereiten für Charts
  const haeufigkeitData = Object.entries(countMap).map(([k, v]) => ({ flugzeug: k, count: v }));
  const zeitData = Object.entries(sumMap).map(([k, v]) => ({ flugzeug: k, sum: v }));

  zeigePieChart(haeufigkeitData);
  zeigeBarChart(zeitData);
});

function zeigePieChart(data) {
  const ctx = document.getElementById("flughaeufigkeit-chart").getContext("2d");
  new Chart(ctx, {
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
      responsive: true,
      plugins: {
        title: { display: true, text: "Flüge je Flugzeug (Anzahl)" }
      }
    }
  });
}

function zeigeBarChart(data) {
  const ctx = document.getElementById("flugzeit-chart").getContext("2d");
  new Chart(ctx, {
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
