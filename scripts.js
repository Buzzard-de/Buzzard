/* ================================================
   Buzzard – scripts.js
   Warenkorb, Filter, Suche, Formular, Navigation
   ================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ══════════════════════════════════════════════
     WARENKORB (localStorage)
     ══════════════════════════════════════════════ */
  const Cart = {
    get: () => JSON.parse(localStorage.getItem('buzzard_cart') || '[]'),
    save(items) { localStorage.setItem('buzzard_cart', JSON.stringify(items)); },
    add(name, price) {
      const items = this.get();
      const existing = items.find(i => i.name === name);
      if (existing) { existing.qty += 1; } else { items.push({ name, price, qty: 1 }); }
      this.save(items);
      this.updateHeader();
    },
    total() { return this.get().reduce((s, i) => s + i.price * i.qty, 0); },
    count() { return this.get().reduce((s, i) => s + i.qty, 0); },
    updateHeader() {
      const count = this.count();
      const total = this.total();
      // Preis-Anzeige aktualisieren
      document.querySelectorAll('.cart-price').forEach(el => {
        el.textContent = total.toFixed(2).replace('.', ',') + ' €';
      });
      // Warenkorb-Label
      document.querySelectorAll('.cart-action span').forEach(el => {
        if (el.childNodes[0]) el.childNodes[0].textContent = count > 0 ? `Warenkorb (${count})` : 'Warenkorb';
      });
      // Badge
      let badge = document.getElementById('cart-badge');
      const cartSvg = document.querySelector('.cart-action svg');
      if (count > 0) {
        if (!badge && cartSvg) {
          badge = document.createElement('span');
          badge.id = 'cart-badge';
          badge.style.cssText = 'position:absolute;top:-6px;right:-6px;background:#c9a840;color:#111;border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;line-height:1;';
          cartSvg.style.position = 'relative';
          cartSvg.parentElement.style.position = 'relative';
          cartSvg.parentElement.appendChild(badge);
        }
        if (badge) { badge.textContent = count; badge.style.display = 'flex'; }
      } else if (badge) {
        badge.style.display = 'none';
      }
    }
  };

  Cart.updateHeader();

  // "In den Warenkorb" Buttons
  document.querySelectorAll('.product-card-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const card  = this.closest('.product-card');
      const name  = card?.querySelector('.product-card-name')?.textContent?.trim() || 'Artikel';
      const raw   = card?.querySelector('.product-card-price')?.textContent?.trim() || '0';
      const price = parseFloat(raw.replace(',', '.').replace(/[^\d.]/g, '')) || 0;
      Cart.add(name, price);
      const orig = this.textContent;
      this.textContent = '✓ Hinzugefügt';
      this.style.cssText = 'background:rgba(34,197,94,0.15);border-color:#22c55e;color:#22c55e;';
      setTimeout(() => { this.textContent = orig; this.style.cssText = ''; }, 1800);
    });
  });

  /* ══════════════════════════════════════════════
     PRODUKT-FILTER (URL-Parameter + Buttons)
     ══════════════════════════════════════════════ */
  const filterBtns   = document.querySelectorAll('.filter-btn');
  const productCards = document.querySelectorAll('.product-card');

  function applyFilter(f) {
    const filter = (f || 'alle').toLowerCase().trim();
    filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
    productCards.forEach(card => {
      const cat   = (card.querySelector('.product-card-category')?.textContent || '').toLowerCase().trim();
      const match = filter === 'alle' || cat === filter || cat.includes(filter) || filter.includes(cat);
      card.style.display = match ? '' : 'none';
    });
  }

  const urlFilter = new URLSearchParams(window.location.search).get('filter');
  if (urlFilter && filterBtns.length) applyFilter(urlFilter);

  filterBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      applyFilter(this.dataset.filter);
      const next = this.dataset.filter === 'alle'
        ? window.location.pathname
        : `${window.location.pathname}?filter=${encodeURIComponent(this.dataset.filter)}`;
      history.replaceState(null, '', next);
    });
  });

  /* ══════════════════════════════════════════════
     SUCHE
     ══════════════════════════════════════════════ */
  const searchInput = document.querySelector('.search-bar input[type="search"]');
  const searchBtn   = document.querySelector('.search-btn');

  function doSearch() {
    const q = searchInput?.value?.trim();
    if (q) window.location.href = `products.html?q=${encodeURIComponent(q)}`;
  }

  if (searchBtn) searchBtn.addEventListener('click', doSearch);
  if (searchInput) searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  const urlQ = new URLSearchParams(window.location.search).get('q');
  if (urlQ && productCards.length) {
    productCards.forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(urlQ.toLowerCase()) ? '' : 'none';
    });
    if (searchInput) searchInput.value = urlQ;
  }

  /* ══════════════════════════════════════════════
     KONTAKTFORMULAR
     ══════════════════════════════════════════════ */
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
