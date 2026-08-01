const products = [
  {
    id: 1,
    name: 'Motorenteile',
    description: 'Qualitätskomponenten für beste Motorleistung, von Dichtungen bis Zylinderkopfteilen.',
    category: 'Motor'
  },
  {
    id: 2,
    name: 'Bremsensysteme',
    description: 'Bremsbeläge, Bremsscheiben und Zubehör für sichere Verzögerung.',
    category: 'Bremsen'
  },
  {
    id: 3,
    name: 'Fahrwerk & Lenkung',
    description: 'Stoßdämpfer, Querlenker und Spurstangen für stabile Fahrdynamik.',
    category: 'Fahrwerk'
  },
  {
    id: 4,
    name: 'Elektrik & Beleuchtung',
    description: 'Sensoren, Lampen und Batteriekomponenten für zuverlässige Elektrik.',
    category: 'Elektrik'
  }
];

module.exports = {
  register(app) {
    app.get('/api/plugin/products', (req, res) => {
      res.json({ products });
    });

    app.get('/api/plugin/products/:id', (req, res) => {
      const id = Number(req.params.id);
      const product = products.find(item => item.id === id);
      if (!product) {
        return res.status(404).json({ message: 'Produkt nicht gefunden.' });
      }
      res.json({ product });
    });
  }
};
