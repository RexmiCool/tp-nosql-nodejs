const deleteService = require('../services/deleteService');

const deleteAllPostgres = async (req, res) => {
    const start = Date.now();
    try {
        await deleteService.deleteAllPostgres();
        const duration = Date.now() - start;
        res.json({ message: 'All PostgreSQL data deleted', duration });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
};

const deleteAllNeo4j = async (req, res) => {
    const start = Date.now();
    try {
        await deleteService.deleteAllNeo4j();
        const duration = Date.now() - start;
        res.json({ message: 'All Neo4j data deleted', duration });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
};

module.exports = {
    deleteAllPostgres,
    deleteAllNeo4j
};