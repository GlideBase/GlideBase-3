// === Supabase v2 Setup ===
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.5/+esm';

const supabaseUrl = 'https://tzvwghchxzklzcgjqoex.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dndnaGNoeHprbHpjZ2pxb2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMzY5NjcsImV4cCI6MjA2NDYxMjk2N30.d_LPinE6_-hQRQX2y-IjSdzZ3oA9nK9pDp0dSlh5-YI'
const supabase = createClient(supabaseUrl, supabaseKey);

// === LOGIN ===
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert("❌ Login fehlgeschlagen: " + error.message);
      return;
    }

    const user = data.user;

    if (!user.email_confirmed_at) {
      alert("⚠️ Deine E-Mail ist noch nicht bestätigt. Bitte überprüfe dein Postfach.");
      await supabase.auth.signOut();
      return;
    }

    alert("✅ Willkommen, " + user.email);
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error(err);
    alert("Ein technischer Fehler ist aufgetreten.");
  }
});

// === REGISTRIERUNG ===
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert("❌ Registrierung fehlgeschlagen: " + error.message);
      return;
    }

    alert("✅ Registrierung erfolgreich! Bitte bestätige deine E-Mail, bevor du dich einloggst.");

    // Optional: automatisch Profil anlegen (nur wenn du 'profiles'-Tabelle verwendest)
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
