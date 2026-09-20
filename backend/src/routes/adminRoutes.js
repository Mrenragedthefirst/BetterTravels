const express   = require('express');
const router    = express.Router();
const ctrl      = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

// Apply token auth to every admin endpoint
router.use(adminAuth);

// Incidents
router.get('/incidents',                          ctrl.getIncidents);
router.post('/incidents',                         ctrl.reportIncident);
router.patch('/incidents/:incidentId/resolve',    ctrl.resolveIncident);

// Stations
router.get('/stations',                           ctrl.getStations);
router.post('/stations',                          ctrl.addStation);
router.patch('/stations/:stationId/toggle',       ctrl.toggleStation);

// Segments
router.get('/segments',                           ctrl.getSegments);

// Walking Transfers
router.get('/transfers',                          ctrl.getTransfers);
router.post('/transfers',                         ctrl.addTransfer);

// Wallet Top-Up
router.post('/topup',                             ctrl.topUpWallet);

module.exports = router;
