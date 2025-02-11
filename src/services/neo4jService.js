const neo4jRepository = require('../repositories/neo4jRepository');

const generateAllData = async (userCount, maxFollows, productCount, maxProducts) => {
    const session = neo4jRepository.driver.session();
    try {
        // Générer des utilisateurs en batch
        let users = [];
        for (let i = 0; i < userCount; i++) {
            users.push({ id: i, username: `user${Date.now()}${i}`, age: Math.floor(Math.random() * 50) + 18 });
        }
        await neo4jRepository.generateUsers(session, users);

        // Récupérer les IDs des utilisateurs
        const userIds = await neo4jRepository.getUserIds(session);

        // Générer des relations de suivi en batch
        let follows = [];
        for (const userId of userIds) {
            const numFollows = Math.floor(Math.random() * (parseInt(maxFollows) + 1));
            const shuffledUserIds = userIds.filter(id => id !== userId).slice(0, numFollows);
            shuffledUserIds.forEach(followId => follows.push({ userId, followId }));
        }
        if (follows.length > 0) {
            await neo4jRepository.generateFollows(session, follows);
        }

        // Générer des produits en batch
        let products = [];
        for (let i = 0; i < productCount; i++) {
            products.push({ id: i, name: `product${Date.now()}${i}`, price: (Math.random() * 100).toFixed(2) });
        }
        await neo4jRepository.generateProducts(session, products);

        // Récupérer les IDs des produits
        const productIds = await neo4jRepository.getProductIds(session);

        // Générer des commandes et leurs relations en batch
        let orders = [];
        let orderRelations = [];
        let orderProducts = [];
        let orderIndex = 0;

        for (const userId of userIds) {
            const numOrders = Math.floor(Math.random() * (parseInt(maxProducts) + 1));
            for (let i = 0; i < numOrders; i++) {
                const orderId = `order${Date.now()}${orderIndex++}`;
                const createdAt = new Date().toISOString();
                orders.push({ id: orderId, created_at: createdAt });
                orderRelations.push({ userId, orderId });

                const numOrderItems = Math.floor(Math.random() * (parseInt(maxProducts) + 1));
                const shuffledProductIds = productIds.slice(0, numOrderItems);
                shuffledProductIds.forEach(productId => {
                    orderProducts.push({ orderId, productId, quantity: Math.floor(Math.random() * 10) + 1 });
                });
            }
        }

        if (orders.length > 0) {
            await neo4jRepository.generateOrders(session, orders);
        }
        if (orderRelations.length > 0) {
            await neo4jRepository.generateOrderRelations(session, orderRelations);
        }
        if (orderProducts.length > 0) {
            await neo4jRepository.generateOrderProducts(session, orderProducts);
        }
    } finally {
        session.close();
    }
};

module.exports = {
    generateAllData
};