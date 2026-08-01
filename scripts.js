document.addEventListener('DOMContentLoaded', function () {

  /* ── Kontaktformular ──────────────────────────────── */
  const form = document.getElementById('contactForm');
  const msg  = document.getElementById('formMessage');

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (msg) msg.textContent = '';

      const honey  = form.querySelector('input[name="_honey"]');
      if (honey && honey.value) return;

      const name    = (form.querySelector('#name')    || {}).value?.trim();
      const email   = (form.querySelector('#email')   || {}).value?.trim();
      const message = (form.querySelector('#message') || {}).value?.trim();
      const button  = form.querySelector('button[type="submit"]');

      if (!name || !email || !message) {
        if (msg) msg.textContent = 'Bitte alle Felder ausfüllen.';
        return;
      }

      if (button) { button.disabled = true; button.textContent = 'Sende…'; }

      try {
        const isLocal = location.protocol === 'file:' ||
                        location.hostname === 'localhost' ||
                        location.hostname === '127.0.0.1';
        const apiUrl = isLocal ? 'http://localhost:3000/api/contact' : form.action;
        const fetchOpts = { method: 'POST', headers: { Accept: 'application/json' } };

        if (apiUrl === form.action) {
          fetchOpts.body = new FormData(form);
        } else {
          fetchOpts.headers['Content-Type'] = 'application/json';
          fetchOpts.body = JSON.stringify({ name, email, message });
        }

        const res = await fetch(apiUrl, fetchOpts);
        if (res.ok) {
          if (msg) { msg.style.color = '#c9a840'; msg.textContent = 'Vielen Dank — Ihre Nachricht wurde gesendet.'; }
          form.reset();
        } else {
          const data = await res.json().catch(() => ({}));
          if (msg) msg.textContent = data.message || 'Beim Senden ist ein Fehler aufgetreten.';
        }
      } catch {
        if (msg) { msg.style.color = '#888'; msg.textContent = 'Netzwerkfehler. Bitte erneut versuchen.'; }
      } finally {
        if (button) { button.disabled = false; button.textContent = 'Nachricht senden'; }
      }
    });
  }

  /* ── Produkt-Filter ───────────────────────────────── */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const productCards = document.querySelectorAll('.product-card');

  if (filterBtns.length && productCards.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const filter = this.dataset.filter;
        productCards.forEach(card => {
          const category = (card.querySelector('.product-card-category')?.textContent || '').toLowerCase().trim();
          const match = filter === 'alle' || category === filter ||
                        category.includes(filter) || filter.includes(category);
          card.style.display = match ? '' : 'none';
          card.style.opacity = match ? '1' : '0';
        });
      });
    });
  }

  /* ── Warenkorb-Button Feedback ────────────────────── */
  document.querySelectorAll('.product-card-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const orig = this.textContent;
      this.textContent = '✓ Hinzugefügt';
      this.style.background = 'rgba(34,197,94,0.15)';
      this.style.borderColor = '#22c55e';
      this.style.color = '#22c55e';
      setTimeout(() => {
        this.textContent = orig;
        this.style.background = '';
        this.style.borderColor = '';
        this.style.color = '';
      }, 1800);
    });
  });

  /* ── Aktiven Nav-Link markieren ───────────────────── */
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.style.color = 'var(--gold, #c9a840)';
    }
  });

  /* ── Smooth-Scroll für Anker-Links ───────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const target = document.querySelector(this.hash);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});

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
