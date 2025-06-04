// === Supabase-Konfiguration ===
const SUPABASE_URL = 'https://DEIN-PROJEKT.supabase.co'; // z. B. https://xyzcompany.supabase.co
const SUPABASE_ANON_KEY = 'DEIN_ANON_KEY'; // z. B. public-anonymous-key

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === LOGIN ===
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("Login fehlgeschlagen: " + error.message);
  } else {
    alert("Willkommen, " + data.user.email);
    // Weiterleitung z. B.: window.location.href = "/dashboard.html";
  }
});

// === REGISTRIERUNG ===
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    alert("Registrierung fehlgeschlagen: " + error.message);
  } else {
    alert("Registrierung erfolgreich! Bitte bestätige deine E-Mail.");
  }
});
