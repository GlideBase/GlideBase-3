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

// HELPER: Excel-Datum umwandeln (Seriennummer → YYYY-MM-DD)
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

// HELPER: Excel-Zeit umwandeln (z.B. 0.5 → 12:00:00)
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

// EXCEL-UPLOAD
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

    const daten = rows.map(row => ({
      user_id: user.id,
      datum: excelDateToISO(row.Datum),
      flugzeug: row.Flugzeug,
      start: excelTimeToString(row.Start),
      landung: excelTimeToString(row.Landung),
      flugzeit: parseFloat(row.Flugzeit)
    }));

    const { error } = await supabase.from("fluege").insert(daten);
    if (error) {
      uploadStatus.textContent = "❌ Fehler: " + error.message;
    } else {
      uploadStatus.textContent = "✅ Upload erfolgreich!";
    }
  };

  reader.readAsBinaryString(file);
});

// AUSWERTUNG (aktuelles Jahr)
document.getElementById("load-analysis").addEventListener("click", async () => {
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const user = supabase.auth.user();

  if (!user) return alert("Nicht eingeloggt.");

  const { data: countData } = await supabase
    .rpc('meistgeflogenes_flugzeug', { ab_datum: yearStart });

  const { data: zeitData } = await supabase
    .rpc('flugzeug_mit_gesamtzeit', { ab_datum: yearStart });

  document.getElementById("most-flown").textContent =
    countData?.[0]?.flugzeug || "Keine Daten";

  document.getElementById("longest-time").textContent =
    zeitData?.[0]?.flugzeug || "Keine Daten";
});
