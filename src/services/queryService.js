const pool = require('../config/db');
const neo4jRepository = require('../repositories/neo4jRepository');

const query1Postgres = async (userId, level) => {
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
        SELECT oi.product_id, p.name, SUM(oi.quantity) AS total_quantity
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN unique_followers uf ON o.user_id = uf.follower_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.user_id != $1
        GROUP BY oi.product_id, p.name;
    `, [userId, level]);
    return result.rows;
};

const query1Neo4j = async (userId, level) => {
    const query = `
        MATCH (u:User {id: $user_id})<-[:FOLLOWS*${parseInt(level)}]-(follower:User)
        WITH DISTINCT follower
        MATCH (follower)-[:ORDERED]->(o:Order)-[op:ORDERED_PRODUCTS]->(p:Product)
        RETURN p.id AS product_id, p.name AS product_name, SUM(op.quantity) AS total_quantity
    `;
    const records = await neo4jRepository.runQuery(query, { user_id: parseInt(userId) });
    return records.map(record => ({
        product_id: record.get('product_id').toNumber ? record.get('product_id').toNumber() : record.get('product_id'),
        product_name: record.get('product_name'),
        total_quantity: record.get('total_quantity').toNumber ? record.get('total_quantity').toNumber() : record.get('total_quantity')
    }));
};

const query2Postgres = async (userId, level, productName) => {
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
    `, [userId, level, productName]);
    return result.rows;
};

const query2Neo4j = async (userId, level, productName) => {
    const query = `
        MATCH (u:User {id: $user_id})<-[:FOLLOWS*${parseInt(level)}]-(follower:User)
        WITH DISTINCT follower
        MATCH (follower)-[:ORDERED]->(o:Order)-[op:ORDERED_PRODUCTS]->(p:Product {name: $product_name})
        RETURN p.id AS product_id, p.name AS product_name, SUM(op.quantity) AS total_quantity
    `;
    const records = await neo4jRepository.runQuery(query, { user_id: parseInt(userId), product_name: productName });
    return records.map(record => ({
        product_id: record.get('product_id').toNumber ? record.get('product_id').toNumber() : record.get('product_id'),
        product_name: record.get('product_name'),
        total_quantity: record.get('total_quantity').toNumber ? record.get('total_quantity').toNumber() : record.get('total_quantity')
    }));
};

const query3Postgres = async (productName, level) => {
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
            SELECT f.follower_id AS user_id, fc.level + 1
            FROM follows f
            JOIN followers_cte fc ON f.followed_id = fc.user_id
            JOIN orders o ON o.user_id = f.follower_id
            JOIN order_items oi ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE p.name = $1 AND fc.level < $2
        )
        SELECT COUNT(DISTINCT user_id) as buyer_number
        FROM followers_cte
        WHERE level = $2;
    `, [productName, level]);
    return result.rows;
};

const query3Neo4j = async (productName, level) => {
    const query = `
        MATCH (p:Product {name: $product_name})<-[:ORDERED_PRODUCTS]-(o:Order)<-[:ORDERED]-(u:User)
        WITH COLLECT(DISTINCT u) AS buyers, p

        MATCH path = (buyer:User)<-[:FOLLOWS*${parseInt(level)}]-(follower:User)
        WHERE buyer IN buyers 
        AND follower IN buyers
        AND ALL(intermediate IN NODES(path) WHERE 
            (intermediate:User) 
            AND EXISTS { (intermediate)-[:ORDERED]->(:Order)-[:ORDERED_PRODUCTS]->(p) }
        )
        RETURN COUNT(DISTINCT follower.id) AS buyer_number
    `;
    const records = await neo4jRepository.runQuery(query, { product_name: productName, level: parseInt(level) });
    return records.map(record => ({
        buyer_number: record.get('buyer_number').toNumber ? record.get('buyer_number').toNumber() : record.get('buyer_number')
    }));
};

module.exports = {
    query1Postgres,
    query1Neo4j,
    query2Postgres,
    query2Neo4j,
    query3Postgres,
    query3Neo4j
};