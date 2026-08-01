module.exports = {
  register(app) {
    app.get('/api/plugin/hello', (req, res) => {
      res.json({ message: 'Hello from Buzzard plugin' });
    });
  }
};
