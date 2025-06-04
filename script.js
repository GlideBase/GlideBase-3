// === Supabase-Konfiguration ===

import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://tzvwghchxzklzcgjqoex.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// === LOGIN mit E-Mail-Bestätigung ===
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

    const user = data.user;

    if (!user.email_confirmed_at) {
      alert("⚠️ Deine E-Mail ist noch nicht bestätigt. Bitte überprüfe dein Postfach.");
      await supabase.auth.signOut(); // Sicherheitshalber ausloggen
      return;
    }

    alert("✅ Willkommen, " + user.email);
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error(err);
    alert("Ein technischer Fehler ist aufgetreten.");
  }
});

// === REGISTRIERUNG mit Hinweis zur Bestätigung ===
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

    alert("✅ Registrierung erfolgreich! Bitte bestätige deine E-Mail, bevor du dich einloggst.");
    
    // Optional: automatisch Profil anlegen, falls Trigger NICHT aktiv ist
    /*
    const user = data.user;
    if (user) {
      await supabase.from('profiles').insert([{ id: user.id, email: user.email }]);
    }
    */

  } catch (err) {
    console.error(err);
    alert("Ein technischer Fehler ist aufgetreten.");
  }
});
