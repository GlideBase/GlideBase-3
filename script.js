// === Supabase-Konfiguration ===

import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://tzvwghchxzklzcgjqoex.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
// === LOGIN ===
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert("❌ Login fehlgeschlagen: " + error.message);
      return;
    }

    alert("✅ Willkommen zurück, " + data.user.email);

    // Optional: Weiterleitung nach Login
    // window.location.href = "dashboard.html";

  } catch (err) {
    alert("Ein technischer Fehler ist aufgetreten.");
    console.error(err);
  }
});

// === REGISTRIERUNG ===
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      alert("❌ Registrierung fehlgeschlagen: " + error.message);
      return;
    }

    alert("✅ Registrierung erfolgreich! Bitte bestätige deine E-Mail.");
    
    // Falls kein Trigger eingerichtet ist, kannst du hier manuell ein Profil erstellen (optional):
    /*
    const { user } = data;
    await supabase.from('profiles').insert([
      { id: user.id, email: user.email }
    ]);
    */

  } catch (err) {
    alert("Ein technischer Fehler ist aufgetreten.");
    console.error(err);
  }
});
