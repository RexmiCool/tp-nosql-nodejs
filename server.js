const express = require('express');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// Route de test
app.get("/", (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
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