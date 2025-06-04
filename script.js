const supabaseUrl = 'https://tzvwghchxzklzcgjqoex.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dndnaGNoeHprbHpjZ2pxb2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMzY5NjcsImV4cCI6MjA2NDYxMjk2N30.d_LPinE6_-hQRQX2y-IjSdzZ3oA9nK9pDp0dSlh5-YI'
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.getElementById("upload-btn").addEventListener("click", async () => {
  const fileInput = document.getElementById("excel-file");
  const status = document.getElementById("upload-status");

  if (!fileInput.files.length) {
    status.textContent = "❌ Bitte wähle eine Datei aus.";
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = async function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    // Hole aktuellen User
    const { data: session } = await supabase.auth.getSession();
    const user_id = session?.session?.user?.id;
    if (!user_id) {
      status.textContent = "❌ Nicht eingeloggt.";
      return;
    }

    // Formatieren & einfügen
    const daten = json.map(row => ({
      user_id,
      datum: row.Datum,
      flugzeug: row.Flugzeug,
      start: row.Start,
      landung: row.Landung,
      flugzeit: parseFloat(row.Flugzeit)
    }));

    const { error } = await supabase.from("fluege").insert(daten);

    if (error) {
      status.textContent = "❌ Fehler beim Hochladen: " + error.message;
    } else {
      status.textContent = "✅ Upload erfolgreich!";
    }
  };

  reader.readAsArrayBuffer(file);
});

// Auswertung laden
document.getElementById("load-analysis").addEventListener("click", async () => {
  const yearStart = `${new Date().getFullYear()}-01-01`;

  // meistgeflogen
  const { data: mostFlown } = await supabase
    .from("fluege")
    .select("flugzeug, count:flugzeug", { count: "exact", head: false })
    .gte("datum", yearStart)
    .group("flugzeug")
    .order("count", { ascending: false })
    .limit(1);

  // längste Zeit
  const { data: mostTime } = await supabase
    .from("fluege")
    .select("flugzeug, sum:flugzeit", { head: false })
    .gte("datum", yearStart)
    .group("flugzeug")
    .order("sum", { ascending: false })
    .limit(1);

  document.getElementById("most-flown").textContent =
    mostFlown?.[0]?.flugzeug || "Keine Daten";
  document.getElementById("longest-time").textContent =
    mostTime?.[0]?.flugzeug || "Keine Daten";
});
