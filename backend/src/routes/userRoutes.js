const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/routingController');

// Network & Stations
router.get('/stations',     ctrl.getStations);
router.get('/disruptions',  ctrl.getDisruptions);
router.get('/fare-classes', ctrl.getFareClasses);

// Route Planning
router.get('/routes', ctrl.findRoutes);

// SmartCard & Wallet
router.get('/card/:cardNumber',   ctrl.getCardWallet);
router.get('/history/:cardNumber',ctrl.getHistory);

// Tap-in / Tap-out Ticketing
router.post('/tap-in',  ctrl.processTapIn);
router.post('/tap-out', ctrl.processTapOut);

module.exports = router;
