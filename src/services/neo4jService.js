const neo4jRepository = require('../repositories/neo4jRepository');

const generateAllData = async (userCount, maxFollows, productCount, maxProducts) => {
    const session = neo4jRepository.driver.session();
    let batchSize = 1000; // Taille du lot pour les transactions
    try {
        // Générer des utilisateurs en batch
        console.time('generateUsers');
        for (let i = 0; i < userCount; i += batchSize) {
            const batchEnd = Math.min(i + batchSize, userCount);
            const userQuery = `
                UNWIND range($start, $end) AS id
                CREATE (u:User {id: id, username: 'user' + id + toString(timestamp()), age: toInteger(rand() * 50) + 18})
            `;
            await session.run(userQuery, { start: i + 1, end: batchEnd });
        }
        console.timeEnd('generateUsers');

        // Générer des relations de suivi en batch
        console.time('generateFollows');
        batchSize = 100;
        for (let i = 0; i < userCount; i += batchSize) {
            const batchEnd = Math.min(i + batchSize, userCount);
            const followQuery = `
                CALL {
                    WITH $start AS start, $end AS end, $maxFollows AS maxFollows
                    MATCH (u:User)
                    WHERE u.id >= start AND u.id < end
                    WITH u
                    MATCH (f:User)
                    WHERE u.id <> f.id
                    WITH u, f, rand() AS r
                    ORDER BY r
                    WITH u, collect(f) AS followers
                    UNWIND range(0, toInteger(rand() * $maxFollows)) AS i
                    WITH u, followers[i] AS f
                    WHERE f IS NOT NULL AND rand() < 0.5
                    CREATE (u)-[:FOLLOWS]->(f)
                } IN TRANSACTIONS OF 1 ROW
            `;
            await session.run(followQuery, { start: i + 1, end: batchEnd, maxFollows: parseInt(maxFollows, 10) });
        }
        console.timeEnd('generateFollows');

        // Générer des produits en batch
        batchSize = 1000;
        console.time('generateProducts');
        for (let i = 0; i < productCount; i += batchSize) {
            const batchEnd = Math.min(i + batchSize, productCount);
            const productQuery = `
                UNWIND range($start, $end) AS id
                CREATE (p:Product {id: id, name: 'product' + id + toString(timestamp()), price: round(rand() * 100 * 100) / 100.0})
            `;
            await session.run(productQuery, { start: i + 1, end: batchEnd });
        }
        console.timeEnd('generateProducts');

        // Générer des commandes et leurs relations en batch
        console.time('generateOrders');
        for (let i = 0; i < userCount; i += batchSize) {
            const batchEnd = Math.min(i + batchSize, userCount);
            const orderQuery = `
                CALL {
                    WITH $start AS start, $end AS end, $maxProducts AS maxProducts
                    MATCH (u:User)
                    WHERE u.id >= start AND u.id < end AND rand() < 0.7 // 70% de chance qu'un utilisateur passe une commande
                    WITH u
                    MATCH (p:Product)
                    WITH u, p, rand() AS r
                    ORDER BY r
                    WITH u, collect(p) AS products
                    UNWIND range(0, toInteger(rand() * $maxProducts)) AS i
                    WITH u, products[i] AS p
                    WHERE p IS NOT NULL
                    CREATE (o:Order {id: 'order' + toString(timestamp()), created_at: datetime()})
                    CREATE (u)-[:ORDERED]->(o)
                    CREATE (o)-[:ORDERED_PRODUCTS {quantity: toInteger(rand() * 10) + 1}]->(p)
                } IN TRANSACTIONS OF 1 ROW
            `;
            await session.run(orderQuery, { start: i + 1, end: batchEnd, maxProducts: parseInt(maxProducts, 10) });
        }
        console.timeEnd('generateOrders');
    } finally {
        session.close();
    }
};

module.exports = {
    generateAllData
};
