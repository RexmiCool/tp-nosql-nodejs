const express = require('express');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// Route de test
app.get("/", (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Route pour générer des utilisateurs, des relations de suivi, des produits et des commandes
app.get('/generate-all', async (req, res) => {
    const { user_count, max_follows, product_count, max_products } = req.query;
    const start = Date.now();
    try {
        const client = await pool.connect();

        if (user_count > 0) {
            await client.query('BEGIN');
            // Générer des utilisateurs
            for (let i = 0; i < user_count; i++) {
                const username = `user${Date.now()}${i}`;
                const age = Math.floor(Math.random() * 50) + 18;
                await client.query('INSERT INTO users (username, age) VALUES ($1, $2)', [username, age]);
                if (i % 50 === 0) {
                    await client.query('COMMIT');
                    await client.query('BEGIN');
                }
            }
            await client.query('COMMIT');
        }

        // Générer des relations de suivi
        const users = await client.query('SELECT id FROM users');
        const userIds = users.rows.map(row => row.id);

        for (const userId of userIds) {
            await client.query('BEGIN');
            const numFollows = Math.floor(Math.random() * (parseInt(max_follows) + 1));
            const shuffledUserIds = userIds.sort(() => 0.5 - Math.random()).slice(0, numFollows);
            for (const followId of shuffledUserIds) {
                if (userId !== followId) {
                    await client.query('INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, followId]);
                }
            }
            await client.query('COMMIT');
        }

        if (product_count > 0) {
            await client.query('BEGIN');
            // Générer des produits
            for (let i = 0; i < product_count; i++) {
                const name = `product${Date.now()}${i}`;
                const price = (Math.random() * 100).toFixed(2);
                await client.query('INSERT INTO products (name, price) VALUES ($1, $2)', [name, price]);
                if (i % 50 === 0) {
                    await client.query('COMMIT');
                    await client.query('BEGIN');

                }
            }
            await client.query('COMMIT');
        }

        // Générer des commandes
        const products = await client.query('SELECT id FROM products');
        const productIds = products.rows.map(row => row.id);

        if (userIds) {
            await client.query('BEGIN');
            for (const [index, userId] of userIds.entries()) {
                const numOrders = Math.floor(Math.random() * (parseInt(max_products) + 1));
                for (let i = 0; i < numOrders; i++) {
                    const orderResult = await client.query('INSERT INTO orders (user_id) VALUES ($1) RETURNING id', [userId]);
                    const orderId = orderResult.rows[0].id;
                    const numOrderItems = Math.floor(Math.random() * (parseInt(max_products) + 1));
                    const shuffledProductIds = productIds.sort(() => 0.5 - Math.random()).slice(0, numOrderItems);
                    for (const productId of shuffledProductIds) {
                        const quantity = Math.floor(Math.random() * 10) + 1;
                        await client.query('INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)', [orderId, productId, quantity]);
                    }
                }
                if (index % 10 === 0) {
                    await client.query('COMMIT');
                    await client.query('BEGIN');
                }
            }
            await client.query('COMMIT');
        }

        client.release();
        const duration = Date.now() - start;
        res.json({ message: `Generated ${user_count} users, ${product_count} products, and orders with max ${max_products} products per user`, duration });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});

// Route pour la première requête
app.get('/query1', async (req, res) => {
    const { user_id, level } = req.query;
    const start = Date.now();
    try {
        const result = await pool.query(`
            WITH RECURSIVE followers_cte AS (
                SELECT follower_id, followed_id, 1 AS level
                FROM follows
                WHERE followed_id = $1
                UNION ALL
                SELECT f.follower_id, f.followed_id, fc.level + 1
                FROM follows f
                INNER JOIN followers_cte fc ON f.followed_id = fc.follower_id
                WHERE fc.level < $2
            ),
            unique_followers AS (
                SELECT DISTINCT follower_id
                FROM followers_cte
            )
            SELECT oi.product_id, SUM(oi.quantity) AS total_quantity
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN unique_followers uf ON o.user_id = uf.follower_id
            WHERE o.user_id != $1
            GROUP BY oi.product_id;
        `, [user_id, level]);
        const duration = Date.now() - start;
        res.json({ duration, rows: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});

// Route pour la deuxième requête
app.get('/query2', async (req, res) => {
    const { user_id, level, product_name } = req.query;
    const start = Date.now();
    try {
        const result = await pool.query(`
            WITH RECURSIVE followers_cte AS (
                SELECT follower_id, followed_id, 1 AS level
                FROM follows
                WHERE followed_id = $1
                UNION ALL
                SELECT f.follower_id, f.followed_id, fc.level + 1
                FROM follows f
                INNER JOIN followers_cte fc ON f.followed_id = fc.follower_id
                WHERE fc.level < $2
            ),
            unique_followers AS (
                SELECT DISTINCT follower_id
                FROM followers_cte
            )
            SELECT p.name, SUM(oi.quantity) AS total_quantity
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN unique_followers uf ON o.user_id = uf.follower_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id != $1
            AND p.name = $3
            GROUP BY p.name;
        `, [user_id, level, product_name]);
        const duration = Date.now() - start;
        res.json({ duration, rows: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});

// Route pour la troisième requête
app.get('/query3', async (req, res) => {
    const { user_id, level, product_name } = req.query;
    const start = Date.now();
    try {
        const result = await pool.query(`
            WITH RECURSIVE followers_cte AS (
                SELECT DISTINCT follower_id, followed_id, 1 AS level
                FROM follows
                WHERE followed_id = $1
                UNION ALL
                SELECT DISTINCT f.follower_id, f.followed_id, fc.level + 1
                FROM follows f
                INNER JOIN followers_cte fc ON f.followed_id = fc.follower_id
                WHERE fc.level < $2
            )
            SELECT p.name, COUNT(DISTINCT o.user_id) AS product_count
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN followers_cte fc ON o.user_id = fc.follower_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id != $1
            AND p.name = $3
            GROUP BY p.name;
        `, [user_id, level, product_name]);
        const duration = Date.now() - start;
        res.json({ duration, rows: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});