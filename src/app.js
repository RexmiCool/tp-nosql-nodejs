const express = require('express');
const generateRoutes = require('./routes/generateRoutes');
const neo4jRoutes = require('./routes/neo4jRoutes');
const queryRoutes = require('./routes/queryRoutes');
const deleteRoutes = require('./routes/deleteRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.use('/', generateRoutes);
app.use('/', neo4jRoutes);
app.use('/', queryRoutes);
app.use('/', deleteRoutes);

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});