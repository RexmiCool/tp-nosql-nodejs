const pool = require('../config/db');

const generateUsers = async (userCount) => {
    const client = await pool.connect();
    try {
        const batchSize = 50;
        await client.query('BEGIN');
        for (let i = 0; i < userCount; i += batchSize) {
            const batchCount = Math.min(batchSize, userCount - i);
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
            if (i + batchSize < userCount) {
                await client.query('BEGIN');
            }
        }
    } finally {
        client.release();
    }
};

const generateFollows = async (maxFollows) => {
    const client = await pool.connect();
    try {
        const followQuery = `
            DO $$
            DECLARE
                user_count INT;
                max_follows INT := ${parseInt(maxFollows)};
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
    } finally {
        client.release();
    }
};

const generateProducts = async (productCount) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (let i = 0; i < productCount; i++) {
            const name = `product${Date.now()}${i}`;
            const price = (Math.random() * 100).toFixed(2);
            await client.query('INSERT INTO products (name, price) VALUES ($1, $2)', [name, price]);
            if (i % 50 === 0) {
                await client.query('COMMIT');
                await client.query('BEGIN');
            }
        }
        await client.query('COMMIT');
    } finally {
        client.release();
    }
};

const generateOrders = async (maxProducts) => {
    const client = await pool.connect();
    try {
        const orderInsertQuery = `
            DO $$
            DECLARE
                user_count INT;
                max_products INT := ${parseInt(maxProducts)};
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

        const orderItemsInsertQuery = `
            DO $$ 
            DECLARE
                max_products INT := ${parseInt(maxProducts)};
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
    } finally {
        client.release();
    }
};

const deleteAllData = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('TRUNCATE TABLE order_items, orders, products, follows, users RESTART IDENTITY CASCADE');
        await client.query('COMMIT');
    } finally {
        client.release();
    }
};

module.exports = {
    generateUsers,
    generateFollows,
    generateProducts,
    generateOrders,
    deleteAllData
};