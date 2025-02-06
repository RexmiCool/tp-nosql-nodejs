const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Route de test
app.get("/", (req, res) => {
    res.send("Hello, Node.js Server !");
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
