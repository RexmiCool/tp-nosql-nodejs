const driver = require('../config/neo4j');

const generateUsers = async (session, users) => {
    await session.run(
        'UNWIND $users AS user CREATE (u:User {id: user.id, username: user.username, age: user.age})',
        { users }
    );
};

const getUserIds = async (session) => {
    const result = await session.run('MATCH (u:User) RETURN u.id AS id');
    return result.records.map(record => record.get('id'));
};

const generateFollows = async (session, follows) => {
    await session.run(
        'UNWIND $follows AS follow MATCH (a:User {id: follow.userId}), (b:User {id: follow.followId}) CREATE (a)-[:FOLLOWS]->(b)',
        { follows }
    );
};

const generateProducts = async (session, products) => {
    await session.run(
        'UNWIND $products AS product CREATE (p:Product {id: product.id, name: product.name, price: product.price})',
        { products }
    );
};

const getProductIds = async (session) => {
    const result = await session.run('MATCH (p:Product) RETURN p.id AS id');
    return result.records.map(record => record.get('id'));
};

const generateOrders = async (session, orders) => {
    await session.run(
        'UNWIND $orders AS order CREATE (o:Order {id: order.id, created_at: order.created_at})',
        { orders }
    );
};

const generateOrderRelations = async (session, orderRelations) => {
    await session.run(
        'UNWIND $orderRelations AS relation MATCH (u:User {id: relation.userId}), (o:Order {id: relation.orderId}) CREATE (u)-[:ORDERED]->(o)',
        { orderRelations }
    );
};

const generateOrderProducts = async (session, orderProducts) => {
    await session.run(
        'UNWIND $orderProducts AS op MATCH (o:Order {id: op.orderId}), (p:Product {id: op.productId}) CREATE (o)-[:ORDERED_PRODUCTS {quantity: op.quantity}]->(p)',
        { orderProducts }
    );
};

const deleteAllData = async (session) => {
    await session.run('MATCH (n) DETACH DELETE n');
};

const runQuery = async (query, params) => {
    const session = driver.session();
    try {
        const result = await session.run(query, params);
        return result.records;
    } finally {
        session.close();
    }
};

module.exports = {
    driver,
    generateUsers,
    getUserIds,
    generateFollows,
    generateProducts,
    getProductIds,
    generateOrders,
    generateOrderRelations,
    generateOrderProducts,
    deleteAllData,
    runQuery
};