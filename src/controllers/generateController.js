const generateService = require('../services/generateService');

const generateAll = async (req, res) => {
    const { user_count, max_follows, product_count, max_products } = req.query;
    const start = Date.now();
    try {
        await generateService.generateUsers(user_count);
        await generateService.generateFollows(max_follows);
        await generateService.generateProducts(product_count);
        await generateService.generateOrders(max_products);
        const duration = Date.now() - start;
        res.json({ message: `Generated ${user_count} users, ${product_count} products, and orders with max ${max_products} products per user`, duration });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
};

module.exports = {
    generateAll
};