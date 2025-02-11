const generateRepository = require('../repositories/generateRepository');

const generateUsers = async (userCount) => {
    await generateRepository.generateUsers(userCount);
};

const generateFollows = async (maxFollows) => {
    await generateRepository.generateFollows(maxFollows);
};

const generateProducts = async (productCount) => {
    await generateRepository.generateProducts(productCount);
};

const generateOrders = async (maxProducts) => {
    await generateRepository.generateOrders(maxProducts);
};

module.exports = {
    generateUsers,
    generateFollows,
    generateProducts,
    generateOrders
};