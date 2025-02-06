const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'social_network',
    password: 'admin',
    port: 5433,
});

module.exports = pool;