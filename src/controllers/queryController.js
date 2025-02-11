const queryService = require('../services/queryService');

const query1Postgres = async (req, res) => {
    const { user_id, level } = req.query;
    const start = Date.now();
    try {
        const rows = await queryService.query1Postgres(user_id, level);
        const duration = Date.now() - start;
        res.json({ duration, rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
};

const query1Neo4j = async (req, res) => {
    const { user_id, level } = req.query;
    const start = Date.now();
    try {
        const rows = await queryService.query1Neo4j(user_id, level);
        const duration = Date.now() - start;
        res.json({ duration, rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
};

const query2Postgres = async (req, res) => {
    const { user_id, level, product_name } = req.query;
    const start = Date.now();
    try {
        const rows = await queryService.query2Postgres(user_id, level, product_name);
        const duration = Date.now() - start;
        res.json({ duration, rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
};

const query2Neo4j = async (req, res) => {
    const { user_id, level, product_name } = req.query;
    const start = Date.now();
    try {
        const rows = await queryService.query2Neo4j(user_id, level, product_name);
        const duration = Date.now() - start;
        res.json({ duration, rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
};

const query3Postgres = async (req, res) => {
    const { product_name, level } = req.query;
    const start = Date.now();
    try {
        const rows = await queryService.query3Postgres(product_name, level);
        const duration = Date.now() - start;
        res.json({ duration, rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
};

const query3Neo4j = async (req, res) => {
    const { product_name, level } = req.query;
    const start = Date.now();
    try {
        const rows = await queryService.query3Neo4j(product_name, level);
        const duration = Date.now() - start;
        res.json({ duration, rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
};

module.exports = {
    query1Postgres,
    query1Neo4j,
    query2Postgres,
    query2Neo4j,
    query3Postgres,
    query3Neo4j
};