const db = require('../config/database');
const oracledb = db.oracledb;

/**
 * Controller for User Portal: Queries strictly through protected views
 * and invokes user-facing routing and ticketing PL/SQL procedures.
 */

// 1. Get all active stations from protected view
exports.getStations = async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT StationID, StationName, City, Latitude, Longitude, StationStatus, DisruptionReason 
       FROM V_USER_ACTIVE_STATIONS 
       ORDER BY StationName ASC`
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Get active disruptions advisory feed
exports.getDisruptions = async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT IncidentID, Title, Description, Severity, DisruptionStart, EstimatedRestoration,
              AffectedEntityType, AffectedEntityID, ImpactDetails, StatusType, DelayMinutes
       FROM V_USER_ACTIVE_DISRUPTIONS
       ORDER BY DisruptionStart DESC`
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 3. Find optimal multi-modal routes using Recursive CTE package function
exports.findRoutes = async (req, res) => {
  try {
    const origin = parseInt(req.query.origin, 10);
    const destination = parseInt(req.query.destination, 10);
    const fareClass = parseInt(req.query.fareClass, 10) || 1;
    const maxTransfers = parseInt(req.query.maxTransfers, 10) || 3;

    if (!origin || !destination) {
      return res.status(400).json({ success: false, error: 'Origin and Destination Station IDs are required.' });
    }

    if (origin === destination) {
      return res.status(400).json({ success: false, error: 'Origin and Destination must be different stations.' });
    }

    const sql = `
      SELECT 
        PathRank,
        StationPath,
        RoutePath,
        ModesUsed,
        TotalMinutes,
        TotalDistanceKm,
        TransferCount,
        TotalBaseFare,
        DiscountedFare,
        HasDelays,
        TotalDelayMinutes
      FROM TABLE(PKG_TRANSIT_ROUTER.FIND_ROUTES(:origin, :destination, :fareClass, :maxTransfers))
      ORDER BY PathRank ASC
    `;

    const binds = {
      origin,
      destination,
      fareClass,
      maxTransfers
    };

    const result = await db.execute(sql, binds);
    res.json({
      success: true,
      origin,
      destination,
      optionsCount: result.rows.length,
      routes: result.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Get available fare classes
exports.getFareClasses = async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT FareClassID, Name, DiscountPercentage, RequiresVerification 
       FROM FARECLASS 
       WHERE IsActive = 1 
       ORDER BY FareClassID ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 5. Look up SmartCard and Wallet balance from protected view
exports.getCardWallet = async (req, res) => {
  try {
    const cardNumber = req.params.cardNumber;
    const result = await db.execute(
      `SELECT CardNumber, CardIsActive, ExpirationDate, WalletID, Balance, 
              WalletIsActive, LastUpdated, PassengerDisplayName, FareClassName, DiscountPercentage
       FROM V_USER_CARD_WALLET
       WHERE CardNumber = :cardNumber`,
      { cardNumber }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'SmartCard not found.' });
    }

    res.json({ success: true, card: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 6. Simulate SmartCard Tap-In
exports.processTapIn = async (req, res) => {
  try {
    const { cardNumber, stationId } = req.body;
    if (!cardNumber || !stationId) {
      return res.status(400).json({ success: false, error: 'cardNumber and stationId are required.' });
    }

    const sql = `
      BEGIN
        PKG_TRANSIT_ROUTER.PROCESS_TAP_IN(
          p_card_number     => :p_card_number,
          p_from_station_id => :p_from_station_id,
          o_journey_leg_id  => :o_journey_leg_id,
          o_passenger_name  => :o_passenger_name,
          o_current_balance => :o_current_balance
        );
      END;
    `;

    const binds = {
      p_card_number: cardNumber,
      p_from_station_id: parseInt(stationId, 10),
      o_journey_leg_id:  { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      o_passenger_name:  { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 120 },
      o_current_balance: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    };

    const result = await db.execute(sql, binds, { autoCommit: true });

    res.json({
      success: true,
      message: 'Tap-in successful. Journey commenced.',
      journeyLegId: result.outBinds.o_journey_leg_id,
      passengerName: result.outBinds.o_passenger_name,
      currentBalance: result.outBinds.o_current_balance
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// 7. Simulate SmartCard Tap-Out & Fare Deduction
exports.processTapOut = async (req, res) => {
  try {
    const { cardNumber, stationId } = req.body;
    if (!cardNumber || !stationId) {
      return res.status(400).json({ success: false, error: 'cardNumber and stationId are required.' });
    }

    const sql = `
      BEGIN
        PKG_TRANSIT_ROUTER.PROCESS_TAP_OUT(
          p_card_number    => :p_card_number,
          p_to_station_id  => :p_to_station_id,
          o_journey_leg_id => :o_journey_leg_id,
          o_fare_deducted  => :o_fare_deducted,
          o_new_balance    => :o_new_balance,
          o_journey_status => :o_journey_status
        );
      END;
    `;

    const binds = {
      p_card_number: cardNumber,
      p_to_station_id: parseInt(stationId, 10),
      o_journey_leg_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      o_fare_deducted:  { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      o_new_balance:    { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      o_journey_status: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 }
    };

    const result = await db.execute(sql, binds, { autoCommit: true });

    res.json({
      success: true,
      message: 'Tap-out recorded. Fare successfully deducted.',
      journeyLegId: result.outBinds.o_journey_leg_id,
      fareDeducted: result.outBinds.o_fare_deducted,
      newBalance: result.outBinds.o_new_balance,
      journeyStatus: result.outBinds.o_journey_status
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// 8. Get passenger travel history
exports.getHistory = async (req, res) => {
  try {
    const cardNumber = req.params.cardNumber;
    const result = await db.execute(
      `SELECT JourneyLegID, CardNumber, OriginStation, DestinationStation,
              TapInTimeFormatted, TapOutTimeFormatted, FareDeducted, FareClassAtTime, Status
       FROM V_USER_JOURNEY_HISTORY
       WHERE CardNumber = :cardNumber
       FETCH FIRST 10 ROWS ONLY`,
      { cardNumber }
    );
    res.json({ success: true, count: result.rows.length, history: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
