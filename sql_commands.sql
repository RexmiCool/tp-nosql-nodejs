--POSTGRES - V17

\connect postgres
DROP DATABASE IF EXISTS social_network;
CREATE DATABASE social_network;
\connect social_network

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    age INT NOT NULL
);

INSERT INTO users (username, age) VALUES ('Alice', 25);
INSERT INTO users (username, age) VALUES ('Benoit', 23);
INSERT INTO users (username, age) VALUES ('Charlie', 30);
INSERT INTO users (username, age) VALUES ('David', 35);
INSERT INTO users (username, age) VALUES ('Eve', 20);

SELECT * FROM users;

CREATE TABLE follows (
    follower_id INT REFERENCES users(id) ON DELETE CASCADE,
    followed_id INT REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id <> followed_id) -- Un utilisateur ne peut pas se suivre lui-même directement
);

INSERT INTO follows (follower_id, followed_id) VALUES (2, 1);
INSERT INTO follows (follower_id, followed_id) VALUES (1, 2);
INSERT INTO follows (follower_id, followed_id) VALUES (3, 1);
INSERT INTO follows (follower_id, followed_id) VALUES (4, 1);
INSERT INTO follows (follower_id, followed_id) VALUES (5, 1);
INSERT INTO follows (follower_id, followed_id) VALUES (1, 3);
INSERT INTO follows (follower_id, followed_id) VALUES (1, 4);
INSERT INTO follows (follower_id, followed_id) VALUES (1, 5);
INSERT INTO follows (follower_id, followed_id) VALUES (2, 3);
INSERT INTO follows (follower_id, followed_id) VALUES (3, 4);
INSERT INTO follows (follower_id, followed_id) VALUES (3, 2);
INSERT INTO follows (follower_id, followed_id) VALUES (3, 5);
INSERT INTO follows (follower_id, followed_id) VALUES (4, 5);
INSERT INTO follows (follower_id, followed_id) VALUES (5, 2);
INSERT INTO follows (follower_id, followed_id) VALUES (5, 3);
INSERT INTO follows (follower_id, followed_id) VALUES (5, 4);
INSERT INTO follows (follower_id, followed_id) VALUES (2, 4);
INSERT INTO follows (follower_id, followed_id) VALUES (2, 5);

SELECT * FROM follows;


CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

INSERT INTO products (name, price) VALUES ('Apple', 1.00);
INSERT INTO products (name, price) VALUES ('Banana', 0.50);
INSERT INTO products (name, price) VALUES ('Cherry', 2.00);
INSERT INTO products (name, price) VALUES ('Date', 1.50);
INSERT INTO products (name, price) VALUES ('Elderberry', 3.00);

SELECT * FROM products;


CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO orders (user_id) VALUES (1);
INSERT INTO orders (user_id) VALUES (2);
INSERT INTO orders (user_id) VALUES (3);
INSERT INTO orders (user_id) VALUES (4);
INSERT INTO orders (user_id) VALUES (5);

INSERT INTO orders (user_id) VALUES (4);


SELECT * FROM orders;


CREATE TABLE order_items (
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    quantity INT CHECK (quantity > 0),
    PRIMARY KEY (order_id, product_id)
);

INSERT INTO order_items (order_id, product_id, quantity) VALUES (2, 1, 1);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (2, 2, 2);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (2, 2, 2);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (3, 1, 3);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (3, 2, 1);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (3, 3, 18000);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (4, 1, 1);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (4, 2, 1);


SELECT * FROM order_items;


WITH RECURSIVE followers_cte AS (
    SELECT follower_id, followed_id, 1 AS level
    FROM follows
    WHERE followed_id = 1 -- Replace with the actual individual_id
    UNION ALL
    SELECT f.follower_id, f.followed_id, fc.level + 1
    FROM follows f
    INNER JOIN followers_cte fc ON f.followed_id = fc.follower_id
    WHERE fc.level < 3 -- Replace with the desired level n
),
unique_followers AS (
    SELECT DISTINCT follower_id
    FROM followers_cte
)
SELECT oi.product_id, SUM(oi.quantity) AS total_quantity
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN unique_followers uf ON o.user_id = uf.follower_id
WHERE o.user_id != 1 -- Replace with the actual individual_id
GROUP BY oi.product_id;


WITH RECURSIVE followers_cte AS (
    SELECT follower_id, followed_id, 1 AS level
    FROM follows
    WHERE followed_id = 1 -- Replace with the actual individual_id
    UNION ALL
    SELECT f.follower_id, f.followed_id, fc.level + 1
    FROM follows f
    INNER JOIN followers_cte fc ON f.followed_id = fc.follower_id
    WHERE fc.level < 3 -- Replace with the desired level n
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
WHERE o.user_id != 1 -- Replace with the actual individual_id
AND p.name = 'Apple' -- Replace with the desired product name
GROUP BY p.name;


WITH RECURSIVE followers_cte AS ( 
    SELECT DISTINCT follower_id, followed_id, 
    1 AS level FROM follows 
    WHERE followed_id = 1 -- Replace with the actual individual_id 
    UNION ALL 
    SELECT DISTINCT f.follower_id, f.followed_id, fc.level + 1 
    FROM follows f 
    INNER JOIN followers_cte fc ON f.followed_id = fc.follower_id 
    WHERE fc.level < 5 -- Replace with the desired level n 
) 
SELECT oi.product_id, COUNT(DISTINCT o.user_id) AS product_count 
FROM order_items oi 
JOIN orders o ON oi.order_id = o.id 
JOIN followers_cte fc ON o.user_id = fc.follower_id 
WHERE o.user_id != 1 -- Replace with the actual individual_id 
GROUP BY oi.product_id;