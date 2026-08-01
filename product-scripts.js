document.addEventListener('DOMContentLoaded', function () {
  const productGrid = document.getElementById('productGrid');
  const productStatus = document.getElementById('productStatus');

  const fallbackProducts = [
    {
      id: 1,
      name: 'Motorenteile',
      description: 'Qualitätskomponenten für beste Motorleistung, von Dichtungen bis Zylinderkopfteilen.'
    },
    {
      id: 2,
      name: 'Bremsensysteme',
      description: 'Bremsbeläge, Bremsscheiben und Zubehör für sichere Verzögerung.'
    },
    {
      id: 3,
      name: 'Fahrwerk & Lenkung',
      description: 'Stoßdämpfer, Querlenker und Spurstangen für stabile Fahrdynamik.'
    },
    {
      id: 4,
      name: 'Elektrik & Beleuchtung',
      description: 'Sensoren, Lampen und Batteriekomponenten für zuverlässige Elektrik.'
    }
  ];

  function productIcon(product) {
    const iconMap = {
      1: '🛠️',
      2: '🚗',
      3: '🧰',
      4: '🔌'
    };
    const icon = iconMap[product.id] || '📦';
    const span = document.createElement('span');
    span.className = 'card-icon';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = icon;
    return span;
  }

  function buildProductCard(product) {
    const article = document.createElement('article');
    article.className = 'highlight';

    article.appendChild(productIcon(product));

    const title = document.createElement('h3');
    title.textContent = product.name;
    article.appendChild(title);

    const description = document.createElement('p');
    description.textContent = product.description;
    article.appendChild(description);

    const link = document.createElement('a');
    link.href = `#product-${product.id}`;
    link.className = 'cta';
    link.textContent = 'Mehr';
    article.appendChild(link);

    return article;
  }

  function renderProducts(products) {
    productGrid.innerHTML = '';
    products.forEach(product => {
      productGrid.appendChild(buildProductCard(product));
    });
  }

  async function loadProducts() {
    const isLocal = location.protocol === 'file:' || !location.hostname || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    if (!isLocal) {
      return;
    }

    const apiUrl = 'http://localhost:3000/api/plugin/products';

    try {
      const res = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        throw new Error('Produktdaten konnten nicht geladen werden.');
      }

      const data = await res.json();
      const products = data.products || fallbackProducts;
      renderProducts(products);
      productStatus.textContent = '';
    } catch (err) {
      productStatus.textContent = 'Lokaler API-Server nicht erreichbar. Es werden statische Produktdaten angezeigt.';
      productStatus.style.color = 'var(--accent)';
    }
  }

  if (productGrid) {
    renderProducts(fallbackProducts);
    loadProducts();
  }
});
