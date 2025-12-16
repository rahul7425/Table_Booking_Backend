const express = require('express');
const router = express.Router();
const { getGlobalHomeData } = require('../Controllers/homeController'); // Path update करें

// Home route
router.get('/', getGlobalHomeData);

module.exports = router;