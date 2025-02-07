const express = require('express');
const pool = require('./db');
const neo4j = require('./neo4j');

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
            const batchSize = 50;
            await client.query('BEGIN');
            for (let i = 0; i < user_count; i += batchSize) {
                const batchCount = Math.min(batchSize, user_count - i);
                const query = `
                    DO $$
                    DECLARE
                        user_count INT := ${batchCount};
                        start_index INT := ${i + 1};
                        username TEXT;
                        age INT;
                    BEGIN
                        FOR j IN 0..user_count - 1 LOOP
                            username := 'user' || (start_index + j) || floor(random() * 1000000)::TEXT;
                            age := floor(random() * 50 + 18)::INT;
                            INSERT INTO users (username, age) VALUES (username, age);
                        END LOOP;
                    END $$;
                `;
                await client.query(query);
                await client.query('COMMIT');
                if (i + batchSize < user_count) {
                    await client.query('BEGIN');
                }
            }
        }
        console.log("Users generated " + (Date.now() - start) + " ms");

        // Générer des relations de suivi
        const followStart = Date.now();
        const followQuery = `
            DO $$
            DECLARE
                user_count INT;
                max_follows INT := ${parseInt(max_follows)};
                user_ids INT[];
                followQueries TEXT := '';
                user_id INT;
                follow_id INT;
                num_follows INT;
                i INT;
                j INT;
            BEGIN
                SELECT array_agg(id) INTO user_ids FROM users;
                user_count := array_length(user_ids, 1);
                FOR i IN 1..user_count LOOP
                    user_id := user_ids[i];
                    num_follows := floor(random() * (max_follows + 1))::INT;
                    FOR j IN 1..num_follows LOOP
                        follow_id := user_ids[floor(random() * user_count + 1)::INT];
                        IF user_id != follow_id THEN
                            followQueries := followQueries || format('(%s, %s),', user_id, follow_id);
                            IF array_length(string_to_array(followQueries, ','), 1) >= 50 THEN
                                followQueries := rtrim(followQueries, ',');
                                EXECUTE format('INSERT INTO follows (follower_id, followed_id) VALUES %s ON CONFLICT DO NOTHING', followQueries);
                                followQueries := '';
                            END IF;
                        END IF;
                    END LOOP;
                END LOOP;
                IF followQueries != '' THEN
                    followQueries := rtrim(followQueries, ',');
                    EXECUTE format('INSERT INTO follows (follower_id, followed_id) VALUES %s ON CONFLICT DO NOTHING', followQueries);
                END IF;
            END $$;
            `;

        await client.query(followQuery);
        const followDuration = Date.now() - followStart;
        console.log(`Follows generation took ${followDuration} ms`);

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

        console.log("Products generated " + (Date.now() - start) + " ms");

        const orderStart = Date.now();

        // Première partie : Insérer les commandes dans la table orders
        const orderInsertQuery = `
        DO $$
        DECLARE
            user_count INT;
            max_products INT := ${parseInt(max_products)};
            user_ids INT[];
            orderQueries TEXT := '';
            user_id INT;
            order_id INT;
            numOrders INT;
            i INT;
            j INT;
        BEGIN
            SELECT array_agg(id) INTO user_ids FROM users;
            user_count := array_length(user_ids, 1);
            FOR i IN 1..user_count LOOP
                user_id := user_ids[i];
                numOrders := floor(random() * (max_products + 1))::INT;
                FOR j IN 1..numOrders LOOP
                    order_id := nextval('orders_id_seq');
                    orderQueries := orderQueries || format('(%s, %s),', order_id, user_id);
                    IF array_length(string_to_array(orderQueries, ','), 1) >= 50 THEN
                        orderQueries := rtrim(orderQueries, ',');
                        EXECUTE format('INSERT INTO orders (id, user_id) VALUES %s', orderQueries);
                        orderQueries := '';
                    END IF;
                END LOOP;
            END LOOP;
            IF orderQueries != '' THEN
                orderQueries := rtrim(orderQueries, ',');
                EXECUTE format('INSERT INTO orders (id, user_id) VALUES %s', orderQueries);
            END IF;
        END $$;
        `;

        await client.query(orderInsertQuery);
        console.log(`Orders insertion took ${Date.now() - orderStart} ms`);

        // Deuxième partie : Insérer les éléments de commande dans la table order_items
        const orderItemsStart = Date.now();
        const orderItemsInsertQuery = `
            DO $$ 
            DECLARE
                max_products INT := ${parseInt(max_products)};
                product_ids INT[];
                order_ids INT[];
                orderItemQueries TEXT := '';
                v_order_id INT;
                v_product_id INT;
                v_quantity INT;
                numOrderItems INT;
                i INT;
                j INT;
            BEGIN
                SELECT array_agg(id) INTO product_ids FROM products;
                SELECT array_agg(id) INTO order_ids FROM orders;
                
                FOR i IN 1..array_length(order_ids, 1) LOOP
                    v_order_id := order_ids[i];
                    numOrderItems := floor(random() * (max_products + 1))::INT;
                    
                    FOR j IN 1..numOrderItems LOOP
                        v_product_id := product_ids[floor(random() * array_length(product_ids, 1) + 1)::INT];
                        v_quantity := floor(random() * 10 + 1)::INT;

                        orderItemQueries := orderItemQueries || format('(%s, %s, %s),', v_order_id, v_product_id, v_quantity);

                        IF array_length(string_to_array(orderItemQueries, ','), 1) >= 50 THEN
                            orderItemQueries := rtrim(orderItemQueries, ',');
                            EXECUTE format(
                                'INSERT INTO order_items (order_id, product_id, quantity) VALUES %s ON CONFLICT (order_id, product_id) DO NOTHING',
                                orderItemQueries
                            );
                            orderItemQueries := '';
                        END IF;
                    END LOOP;
                END LOOP;

                IF orderItemQueries != '' THEN
                    orderItemQueries := rtrim(orderItemQueries, ',');
                    EXECUTE format(
                        'INSERT INTO order_items (order_id, product_id, quantity) VALUES %s ON CONFLICT (order_id, product_id) DO NOTHING',
                        orderItemQueries
                    );
                END IF;
            END $$;
            `;

        await client.query(orderItemsInsertQuery);
        console.log(`Order items insertion took ${Date.now() - orderItemsStart} ms`);

        client.release();
        const duration = Date.now() - start;
        res.json({ message: `Generated ${user_count} users, ${product_count} products, and orders with max ${max_products} products per user`, duration });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});

// Route pour générer toutes les données dans Neo4j
app.get('/generate-all-neo4j', async (req, res) => {
    const { user_count, max_follows, product_count, max_products } = req.query;
    const start = Date.now();
    const session = neo4j.session();
    try {
        // Générer des utilisateurs
        for (let i = 0; i < user_count; i++) {
            const username = `user${Date.now()}${i}`;
            const age = Math.floor(Math.random() * 50) + 18;
            await session.run(
                'CREATE (u:User {id: $id, username: $username, age: $age})',
                { id: i, username, age }
            );
        }

        // Générer des relations de suivi
        const usersResult = await session.run('MATCH (u:User) RETURN u.id AS id');
        const userIds = usersResult.records.map(record => parseInt(record.get('id')));

        for (const userId of userIds) {
            const numFollows = Math.floor(Math.random() * (parseInt(max_follows) + 1));
            const shuffledUserIds = userIds.sort(() => 0.5 - Math.random()).slice(0, numFollows);
            for (const followId of shuffledUserIds) {
                if (userId !== followId) {
                    await session.run(
                        'MATCH (a:User {id: $userId}), (b:User {id: $followId}) CREATE (a)-[:FOLLOWS]->(b)',
                        { userId, followId }
                    );
                }
            }
        }

        // Générer des produits
        for (let i = 0; i < product_count; i++) {
            const name = `product${Date.now()}${i}`;
            const price = (Math.random() * 100).toFixed(2);
            await session.run(
                'CREATE (p:Product {id: $id, name: $name, price: $price})',
                { id: i, name, price }
            );
        }

        // Générer des commandes
        const productsResult = await session.run('MATCH (p:Product) RETURN p.id AS id');
        const productIds = productsResult.records.map(record => parseInt(record.get('id')));

        for (const userId of userIds) {
            const numOrders = Math.floor(Math.random() * (parseInt(max_products) + 1));
            for (let i = 0; i < numOrders; i++) {
                const orderId = `order${Date.now()}${i}`;
                const createdAt = new Date().toISOString();
                await session.run(
                    'CREATE (o:Order {id: $orderId, created_at: $createdAt})',
                    { orderId, createdAt }
                );
                await session.run(
                    'MATCH (u:User {id: $userId}), (o:Order {id: $orderId}) CREATE (u)-[:ORDERED {id: $orderId}]->(o)',
                    { userId, orderId }
                );

                const numOrderItems = Math.floor(Math.random() * (parseInt(max_products) + 1));
                const shuffledProductIds = productIds.sort(() => 0.5 - Math.random()).slice(0, numOrderItems);
                for (const productId of shuffledProductIds) {
                    const quantity = Math.floor(Math.random() * 10) + 1;
                    await session.run(
                        'MATCH (o:Order {id: $orderId}), (p:Product {id: $productId}) CREATE (o)-[:ORDERED_PRODUCTS {id: $orderId, quantity: $quantity}]->(p)',
                        { orderId, productId, quantity }
                    );
                }
            }
        }

        session.close();
        const duration = Date.now() - start;
        res.json({ message: `Generated ${user_count} users, ${product_count} products, and orders with max ${max_products} products per user in Neo4j`, duration });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});

// Route pour supprimer toutes les données de PostgreSQL
app.get('/delete-all-postgres', async (req, res) => {
    const start = Date.now();
    try {
        const client = await pool.connect();
        await client.query('BEGIN');
        await client.query('TRUNCATE TABLE order_items, orders, products, follows, users RESTART IDENTITY CASCADE');
        await client.query('COMMIT');
        client.release();
        const duration = Date.now() - start;
        res.json({ message: 'All PostgreSQL data deleted', duration });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});

// Route pour supprimer toutes les données de Neo4j
app.get('/delete-all-neo4j', async (req, res) => {
    const start = Date.now();
    const session = neo4j.session();
    try {
        await session.run('MATCH (n) DETACH DELETE n');
        session.close();
        const duration = Date.now() - start;
        res.json({ message: 'All Neo4j data deleted', duration });
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
                -- Niveau 0 : utilisateurs qui ont commandé le produit
                SELECT DISTINCT o.user_id, 0 AS level
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN products p ON oi.product_id = p.id
                WHERE p.name = $1

                UNION ALL

                -- Niveaux suivants : followers des utilisateurs précédents
                SELECT f.followed_id AS user_id, fc.level + 1
                FROM follows f
                JOIN followers_cte fc ON f.follower_id = fc.user_id
                WHERE fc.level < $2
            )
            SELECT DISTINCT user_id
            FROM followers_cte
            WHERE level = $2;
        `, [product_name, level]);
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