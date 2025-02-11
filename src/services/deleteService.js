const generateRepository = require('../repositories/generateRepository');
const neo4jRepository = require('../repositories/neo4jRepository');

const deleteAllPostgres = async () => {
    await generateRepository.deleteAllData();
};

const deleteAllNeo4j = async () => {
    const session = neo4jRepository.driver.session();
    try {
        await neo4jRepository.deleteAllData(session);
    } finally {
        session.close();
    }
};

module.exports = {
    deleteAllPostgres,
    deleteAllNeo4j
};