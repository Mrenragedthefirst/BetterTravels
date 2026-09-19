const db = require('../config/database');
const oracledb = db.oracledb;

/**
 * Controller for Admin Portal: Provides direct management of incidents,
 * network status, and kiosk wallet operations using PKG_BETTERTRAVEL_ADMIN.
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
        r."Mode" AS Mode,
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
