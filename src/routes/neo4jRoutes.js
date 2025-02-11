const express = require('express');
const neo4jController = require('../controllers/neo4jController');
const router = express.Router();

router.get('/generate-all-neo4j', neo4jController.generateAllNeo4j);

module.exports = router;