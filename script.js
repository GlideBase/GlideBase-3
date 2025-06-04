// Supabase-Konfiguration
const supabaseUrl = 'https://tzvwghchxzklzcgjqoex.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dndnaGNoeHprbHpjZ2pxb2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMzY5NjcsImV4cCI6MjA2NDYxMjk2N30.d_LPinE6_-hQRQX2y-IjSdzZ3oA9nK9pDp0dSlh5-YI'; // dein echter Key
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// UI-Elemente
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const uploadStatus = document.getElementById("upload-status");

// Session prüfen
checkSession();

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
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

// Login
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const { error } = await supabase.auth.signIn({ email, password });
  if (error) return alert("❌ " + error.message);
  showApp();
});

// Signup
document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert("❌ " + error.message);
  alert("✅ Bitte bestätige deine E-Mail.");
});

// Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  showLogin();
});

// Excel-Upload
document.getElementById("upload-btn").addEventListener("click", async () => {
  const file = document.getElementById("excel-file").files[0];
  if (!file) return alert("❌ Bitte eine Datei auswählen.");

  const reader = new FileReader();
  reader.onload = async (e) => {
    const workbook = XLSX.read(e.target.result, { type: "binary" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const { data: session } = await supabase.auth.getSession();
    const user_id = session?.session?.user?.id;
    if (!user_id) return alert("Nicht eingeloggt!");

    const daten = rows.map(row => ({
      user_id,
      datum: row.Datum,
      flugzeug: row.Flugzeug,
      start: row.Start,
      landung: row.Landung,
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

// Auswertung
document.getElementById("load-analysis").addEventListener("click", async () => {
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const { data: countData } = await supabase
    .rpc('meistgeflogenes_flugzeug', { ab_datum: yearStart });

  const { data: zeitData } = await supabase
    .rpc('flugzeug_mit_gesamtzeit', { ab_datum: yearStart });

  document.getElementById("most-flown").textContent =
    countData?.[0]?.flugzeug || "Keine Daten";

  document.getElementById("longest-time").textContent =
    zeitData?.[0]?.flugzeug || "Keine Daten";
});
