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
INSERT INTO users (username, age) VALUES ('Bob', 30);
INSERT INTO users (username, age) VALUES ('Charlie', 35);
INSERT INTO users (username, age) VALUES ('David', 40);
INSERT INTO users (username, age) VALUES ('Eve', 45);
INSERT INTO users (username, age) VALUES ('Frank', 50);
INSERT INTO users (username, age) VALUES ('Grace', 55);
INSERT INTO users (username, age) VALUES ('Heidi', 60);
INSERT INTO users (username, age) VALUES ('Ivan', 65);
INSERT INTO users (username, age) VALUES ('Judy', 70);

SELECT * FROM users;

CREATE TABLE follows (
    follower_id INT REFERENCES users(id) ON DELETE CASCADE,
    followed_id INT REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id <> followed_id) -- Un utilisateur ne peut pas se suivre lui-même directement
);

INSERT INTO follows (follower_id, followed_id) VALUES (1, 2);
INSERT INTO follows (follower_id, followed_id) VALUES (1, 3);
INSERT INTO follows (follower_id, followed_id) VALUES (1, 4);
INSERT INTO follows (follower_id, followed_id) VALUES (3, 5);
INSERT INTO follows (follower_id, followed_id) VALUES (2, 6);
INSERT INTO follows (follower_id, followed_id) VALUES (4, 3);
INSERT INTO follows (follower_id, followed_id) VALUES (3, 4);
INSERT INTO follows (follower_id, followed_id) VALUES (5, 6);
INSERT INTO follows (follower_id, followed_id) VALUES (6, 7);
INSERT INTO follows (follower_id, followed_id) VALUES (7, 8);
INSERT INTO follows (follower_id, followed_id) VALUES (8, 9);
INSERT INTO follows (follower_id, followed_id) VALUES (9, 10);
INSERT INTO follows (follower_id, followed_id) VALUES (10, 1);

SELECT * FROM follows;


CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

INSERT INTO products (name, price) VALUES ('Apple', 1.00);
INSERT INTO products (name, price) VALUES ('Banana', 2.00);
INSERT INTO products (name, price) VALUES ('Cherry', 3.00);
INSERT INTO products (name, price) VALUES ('Date', 4.00);
INSERT INTO products (name, price) VALUES ('Elderberry', 5.00);
INSERT INTO products (name, price) VALUES ('Fig', 6.00);
INSERT INTO products (name, price) VALUES ('Grape', 7.00);

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

SELECT * FROM orders;


CREATE TABLE order_items (
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    quantity INT CHECK (quantity > 0),
    PRIMARY KEY (order_id, product_id)
);

INSERT INTO order_items (order_id, product_id, quantity) VALUES (1, 1, 1);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (1, 2, 2);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (2, 3, 3);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (2, 4, 4);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (3, 5, 5);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (3, 6, 6);

SELECT * FROM order_items;