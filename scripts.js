document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('contactForm');
  const msg = document.getElementById('formMessage');

  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    msg.textContent = '';

    const honey = form.querySelector('input[name="_honey"]');
    if (honey && honey.value) {
      return;
    }

    const name = form.querySelector('#name').value.trim();
    const email = form.querySelector('#email').value.trim();
    const message = form.querySelector('#message').value.trim();
    const button = form.querySelector('button[type="submit"]');

    if (!name || !email || !message) {
      msg.textContent = 'Bitte alle Felder ausfüllen.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Sende...';

    try {
      const isLocal = location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      const apiUrl = isLocal
        ? 'http://localhost:3000/api/contact'
        : form.action;
      const formData = new FormData(form);
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        }
      };

      if (apiUrl === form.action) {
        fetchOptions.body = formData;
      } else {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify({ name, email, message });
      }

      const res = await fetch(apiUrl, fetchOptions);

      if (res.ok) {
        msg.style.color = 'var(--accent)';
        msg.textContent = 'Vielen Dank — Ihre Nachricht wurde gesendet.';
        form.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        msg.textContent = data.message || 'Beim Senden ist ein Fehler aufgetreten. Bitte versuchen Sie es später.';
      }
    } catch (err) {
      msg.style.color = 'var(--muted)';
      msg.textContent = 'Netzwerkfehler. Bitte erneut versuchen.';
    } finally {
      button.disabled = false;
      button.textContent = 'Senden';
    }
  });
});
