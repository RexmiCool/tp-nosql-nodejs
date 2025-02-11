const express = require('express');
const queryController = require('../controllers/queryController');
const router = express.Router();

router.get('/query1', queryController.query1Postgres);
router.get('/query1-neo4j', queryController.query1Neo4j);
router.get('/query2', queryController.query2Postgres);
router.get('/query2-neo4j', queryController.query2Neo4j);
router.get('/query3', queryController.query3Postgres);
router.get('/query3-neo4j', queryController.query3Neo4j);

module.exports = router;