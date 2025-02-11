const express = require('express');
const generateController = require('../controllers/generateController');
const router = express.Router();

router.get('/generate-all', generateController.generateAll);

module.exports = router;