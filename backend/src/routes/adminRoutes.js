const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');

router.get('/incidents',               ctrl.getIncidents);
router.get('/segments',                ctrl.getSegments);
router.post('/incidents',              ctrl.reportIncident);
router.patch('/incidents/:incidentId/resolve', ctrl.resolveIncident);
router.post('/topup',                  ctrl.topUpWallet);

module.exports = router;
