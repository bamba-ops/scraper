const express = require("express");
const app = express();

const port = 80;

// Import des routes
const scrapeRoutes = require('./routes/scrape');
const checkRoutes = require('./routes/check');

app.use(express.json());

// Montage des routes sous le préfixe '/api'
app.use('/api', scrapeRoutes);
app.use('/api', checkRoutes);

app.get("/", (req, res) => {
  return res.status(200).send({
    message: "Use /api/[your endpoint]"
  });
});

app.listen(port, () => {
  console.log("Listening on " + port);
});

module.exports = app;