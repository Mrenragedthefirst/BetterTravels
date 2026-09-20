const db = require('../config/database');
const oracledb = db.oracledb;

/**
 * Controller for Admin Portal: Provides direct management of stations,
 * incidents, network status, and kiosk wallet operations using PKG_BETTERTRAVEL_ADMIN.
 */

// 1. Get all incidents (Active & Past)
exports.getIncidents = async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT 
        i.IncidentID,
        i.Title,
        i.Description,
        i.Severity,
        TO_CHAR(i.StartTime, 'YYYY-MM-DD HH24:MI') AS StartTime,
        TO_CHAR(i.EndTime, 'YYYY-MM-DD HH24:MI') AS EndTime,
        CASE 
          WHEN i.EndTime IS NULL OR i.EndTime > SYSTIMESTAMP THEN 'Active'
          ELSE 'Resolved'
        END AS Status
       FROM INCIDENT i
       ORDER BY i.StartTime DESC`
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Get network segments for disruption target dropdown
exports.getSegments = async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT 
        s.SegmentID,
        r.Name AS RouteName,
        r."Mode" AS "MODE",
        st_from.Name AS FromStation,
        st_to.Name AS ToStation,
        s.Distance,
        s.ScheduledTime,
        s.IsActive
       FROM SEGMENT s
       JOIN ROUTE r ON s.RouteID = r.RouteID
       JOIN ROUTESTOP rs_from ON s.FromRouteStopID = rs_from.RouteStopID
       JOIN STATION st_from ON rs_from.StationID = st_from.StationID
       JOIN ROUTESTOP rs_to ON s.ToRouteStopID = rs_to.RouteStopID
       JOIN STATION st_to ON rs_to.StationID = st_to.StationID
       ORDER BY r.RouteID, rs_from.Sequence`
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 3. Create Incident & optionally link affected segment/station atomically
exports.reportIncident = async (req, res) => {
  try {
    const { title, description, severity, segmentId, stationId, statusType, delayMinutes } = req.body;

    if (!title || !severity) {
      return res.status(400).json({ success: false, error: 'Title and Severity are required.' });
    }

    // Step A: Report incident via procedure
    const sqlIncident = `
      BEGIN
        PKG_BETTERTRAVEL_ADMIN.PRC_REPORT_INCIDENT(
          p_title       => :p_title,
          p_description => :p_description,
          p_severity    => :p_severity,
          p_start_time  => SYSTIMESTAMP,
          p_end_time    => NULL,
          o_incident_id => :o_incident_id
        );
      END;
    `;

    const bindsIncident = {
      p_title: title,
      p_description: description || '',
      p_severity: severity,
      o_incident_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    };

    const resultInc = await db.execute(sqlIncident, bindsIncident, { autoCommit: true });
    const incidentId = resultInc.outBinds.o_incident_id;

    // Step B: Disrupted Segment if specified
    if (segmentId) {
      const sqlSeg = `
        BEGIN
          PKG_BETTERTRAVEL_ADMIN.PRC_DISRUPT_SEGMENT(
            p_incident_id   => :p_incident_id,
            p_segment_id    => :p_segment_id,
            p_status_type   => :p_status_type,
            p_delay_minutes => :p_delay_minutes
          );
        END;
      `;
      await db.execute(sqlSeg, {
        p_incident_id: incidentId,
        p_segment_id: parseInt(segmentId, 10),
        p_status_type: statusType || 'Delayed',
        p_delay_minutes: parseInt(delayMinutes, 10) || 15
      }, { autoCommit: true });
    }

    // Step C: Disrupted Station if specified
    if (stationId) {
      const sqlStat = `
        BEGIN
          PKG_BETTERTRAVEL_ADMIN.PRC_DISRUPT_STATION(
            p_incident_id => :p_incident_id,
            p_station_id  => :p_station_id,
            p_status_type => :p_status_type,
            p_reason      => :p_reason
          );
        END;
      `;
      await db.execute(sqlStat, {
        p_incident_id: incidentId,
        p_station_id: parseInt(stationId, 10),
        p_status_type: statusType || 'PartiallyClosed',
        p_reason: description || 'Advisory station impact'
      }, { autoCommit: true });
    }

    res.json({
      success: true,
      message: 'Incident reported and network assets updated successfully.',
      incidentId
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Resolve Incident (re-opens line)
exports.resolveIncident = async (req, res) => {
  try {
    const incidentId = parseInt(req.params.incidentId, 10);
    if (!incidentId) {
      return res.status(400).json({ success: false, error: 'Valid Incident ID is required.' });
    }

    const sql = `
      BEGIN
        PKG_BETTERTRAVEL_ADMIN.PRC_RESOLVE_INCIDENT(p_incident_id => :p_incident_id);
      END;
    `;

    await db.execute(sql, { p_incident_id: incidentId }, { autoCommit: true });

    res.json({
      success: true,
      message: `Incident #${incidentId} marked as resolved. Normal transit service restored.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 5. Kiosk / Admin Top-Up Wallet
exports.topUpWallet = async (req, res) => {
  try {
    const { cardNumber, amount, reference } = req.body;
    if (!cardNumber || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Valid cardNumber and positive amount are required.' });
    }

    const sql = `
      BEGIN
        PKG_BETTERTRAVEL_ADMIN.PRC_TOPUP_WALLET(
          p_card_number => :p_card_number,
          p_amount      => :p_amount,
          p_reference   => :p_reference,
          o_new_balance => :o_new_balance
        );
      END;
    `;

    const binds = {
      p_card_number: cardNumber,
      p_amount: parseFloat(amount),
      p_reference: reference || 'KIOSK-TOPUP',
      o_new_balance: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    };

    const result = await db.execute(sql, binds, { autoCommit: true });

    res.json({
      success: true,
      message: `Successfully topped up $${parseFloat(amount).toFixed(2)}.`,
      cardNumber,
      newBalance: result.outBinds.o_new_balance
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// 6. Add Station
exports.addStation = async (req, res) => {
  try {
    const { name, city, latitude, longitude, address } = req.body;
    if (!name || !city || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'Station Name, City, Latitude, and Longitude are required.' });
    }

    const sql = `
      BEGIN
        PKG_BETTERTRAVEL_ADMIN.PRC_ADD_STATION(
          p_name       => :p_name,
          p_city       => :p_city,
          p_lat        => :p_lat,
          p_lng        => :p_lng,
          p_address    => :p_address,
          o_station_id => :o_station_id
        );
      END;
    `;

    const binds = {
      p_name: name,
      p_city: city,
      p_lat: parseFloat(latitude),
      p_lng: parseFloat(longitude),
      p_address: address || '',
      o_station_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    };

    const result = await db.execute(sql, binds, { autoCommit: true });

    res.json({
      success: true,
      message: `Station "${name}" successfully registered with ID ${result.outBinds.o_station_id}.`,
      stationId: result.outBinds.o_station_id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 7. Get All Stations (including address and active status)
exports.getStations = async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT StationID, Name, City, Latitude, Longitude, Address, IsActive
       FROM STATION
       ORDER BY StationID ASC`
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 8. Toggle Station Active / Inactive
exports.toggleStation = async (req, res) => {
  try {
    const stationId = parseInt(req.params.stationId, 10);
    const { isActive } = req.body;
    if (!stationId || isActive === undefined) {
      return res.status(400).json({ success: false, error: 'stationId and isActive (0 or 1) are required.' });
    }
    await db.execute(
      `UPDATE STATION SET IsActive = :isActive WHERE StationID = :stationId`,
      { isActive: isActive ? 1 : 0, stationId },
      { autoCommit: true }
    );
    res.json({ success: true, message: `Station #${stationId} ${isActive ? 'activated' : 'deactivated'}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 9. Get all walking transfers (with station names joined)
exports.getTransfers = async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT 
         t.TransferID,
         t.FromStationID,
         sf.Name AS FromStation,
         t.ToStationID,
         st.Name AS ToStation,
         t.WalkingDistance,
         t.WalkingTime,
         t.IsDirectConnection
       FROM STATION_PAIR_TRANSFER t
       JOIN STATION sf ON t.FromStationID = sf.StationID
       JOIN STATION st ON t.ToStationID   = st.StationID
       ORDER BY t.TransferID ASC`
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 10. Add walking transfer — inserts both directions (A→B and B→A) in one transaction
exports.addTransfer = async (req, res) => {
  const conn = await db.oracledb.getConnection();
  try {
    const { fromStationId, toStationId, walkingDistance, walkingTime } = req.body;

    if (!fromStationId || !toStationId || !walkingDistance || !walkingTime) {
      return res.status(400).json({ success: false, error: 'fromStationId, toStationId, walkingDistance, and walkingTime are required.' });
    }
    if (parseInt(fromStationId, 10) === parseInt(toStationId, 10)) {
      return res.status(400).json({ success: false, error: 'From and To stations must be different.' });
    }

    const fromId = parseInt(fromStationId, 10);
    const toId   = parseInt(toStationId, 10);
    const dist   = parseInt(walkingDistance, 10);
    const time   = parseInt(walkingTime, 10);

    // Insert A -> B
    await conn.execute(
      `INSERT INTO STATION_PAIR_TRANSFER (FromStationID, ToStationID, WalkingDistance, WalkingTime, IsDirectConnection)
       VALUES (:from, :to, :dist, :time, 1)`,
      { from: fromId, to: toId, dist, time }
    );

    // Insert B -> A (reverse leg, same values)
    await conn.execute(
      `INSERT INTO STATION_PAIR_TRANSFER (FromStationID, ToStationID, WalkingDistance, WalkingTime, IsDirectConnection)
       VALUES (:from, :to, :dist, :time, 1)`,
      { from: toId, to: fromId, dist, time }
    );

    await conn.commit();

    res.json({
      success: true,
      message: `Walking transfer registered between stations #${fromId} and #${toId} (${time} min, ${dist}m, bidirectional).`
    });
  } catch (err) {
    await conn.rollback();
    // ORA-00001 = unique constraint — pair already exists
    if (err.errorNum === 1) {
      res.status(409).json({ success: false, error: 'A walking transfer between these stations already exists.' });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  } finally {
    await conn.close();
  }
};
