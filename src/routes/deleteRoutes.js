const express = require('express');
const deleteController = require('../controllers/deleteController');
const router = express.Router();

router.get('/delete-all-postgres', deleteController.deleteAllPostgres);
router.get('/delete-all-neo4j', deleteController.deleteAllNeo4j);

module.exports = router;