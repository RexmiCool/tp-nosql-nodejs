const neo4jService = require('../services/neo4jService');

const generateAllNeo4j = async (req, res) => {
    console.log(`Generating all Neo4j data at ${new Date().toISOString()}`);
    
    const { user_count, max_follows, product_count, max_products } = req.query;
    const start = Date.now();

    try {
        await neo4jService.generateAllData(user_count, max_follows, product_count, max_products);
        const duration = Date.now() - start;
        res.json({ message: `Generated ${user_count} users, ${product_count} products, and orders with max ${max_products} products per user in Neo4j`, duration });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
    console.log(`End generating all Neo4j data at ${new Date().toISOString()}`);
};

module.exports = {
    generateAllNeo4j
};