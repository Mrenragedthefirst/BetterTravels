-- ============================================================================
-- BETTERTRAVEL: MULTI-MODAL TRANSIT SYSTEM
-- SCRIPT 03: SECURITY & USER ACCESS VIEWS
-- Enforces kernel-level read-only access (WITH READ ONLY) for the user portal
-- ============================================================================

SET SQLBLANKLINES ON;

-- 1. Active Stations Directory for Start/End selection
CREATE OR REPLACE VIEW V_USER_ACTIVE_STATIONS AS
SELECT 
    s.StationID,
    s.Name AS StationName,
    s.City,
    s.Latitude,
    s.Longitude,
    s.Address,
    NVL(ast.StatusType, 'Normal') AS StationStatus,
    ast.Reason AS DisruptionReason
FROM STATION s
LEFT JOIN (
    SELECT 
        af.StationID,
        af.StatusType,
        af.Reason
    FROM AFFECTEDSTATION af
    JOIN INCIDENT inc ON af.IncidentID = inc.IncidentID
    WHERE inc.StartTime <= SYSTIMESTAMP AND (inc.EndTime IS NULL OR inc.EndTime > SYSTIMESTAMP)
) ast ON s.StationID = ast.StationID
WHERE s.IsActive = 1
WITH READ ONLY;

-- 2. Transit Network Adjacency Graph with live disruption telemetry
CREATE OR REPLACE VIEW V_USER_NETWORK_GRAPH AS
SELECT 
    seg.SegmentID,
    r.RouteID,
    r.Name AS RouteName,
    r."Mode" AS TransitMode,
    r.Operator,
    rs_from.Sequence AS FromSequence,
    st_from.StationID AS FromStationID,
    st_from.Name AS FromStationName,
    rs_to.Sequence AS ToSequence,
    st_to.StationID AS ToStationID,
    st_to.Name AS ToStationName,
    seg.Distance AS DistanceKm,
    seg.ScheduledTime AS ScheduledMinutes,
    NVL(sf.BaseAmount, 2.00) AS BaseFare,
    NVL(aff.StatusType, 'Normal') AS DisruptionStatus,
    NVL(aff.DelayMinutes, 0) AS DelayMinutes,
    (seg.ScheduledTime + NVL(aff.DelayMinutes, 0)) AS EffectiveMinutes,
    inc.Title AS IncidentTitle,
    inc.Severity AS IncidentSeverity
FROM SEGMENT seg
JOIN ROUTE r ON seg.RouteID = r.RouteID AND r.IsActive = 1
JOIN ROUTESTOP rs_from ON seg.FromRouteStopID = rs_from.RouteStopID AND rs_from.IsActive = 1
JOIN STATION st_from ON rs_from.StationID = st_from.StationID AND st_from.IsActive = 1
JOIN ROUTESTOP rs_to ON seg.ToRouteStopID = rs_to.RouteStopID AND rs_to.IsActive = 1
JOIN STATION st_to ON rs_to.StationID = st_to.StationID AND st_to.IsActive = 1
LEFT JOIN SEGMENTFARE sf ON seg.SegmentID = sf.SegmentID 
    AND sf.IsActive = 1 
    AND SYSTIMESTAMP BETWEEN sf.ValidFrom AND NVL(sf.ValidTo, SYSTIMESTAMP + INTERVAL '1' DAY)
LEFT JOIN (
    SELECT 
        a.SegmentID,
        a.StatusType,
        a.DelayMinutes,
        a.IncidentID
    FROM AFFECTEDSEGMENT a
    JOIN INCIDENT i ON a.IncidentID = i.IncidentID
    WHERE i.StartTime <= SYSTIMESTAMP AND (i.EndTime IS NULL OR i.EndTime > SYSTIMESTAMP)
) aff ON seg.SegmentID = aff.SegmentID
LEFT JOIN INCIDENT inc ON aff.IncidentID = inc.IncidentID
WHERE seg.IsActive = 1
WITH READ ONLY;

-- 3. Live Disruption & Incident Advisory Bulletin
CREATE OR REPLACE VIEW V_USER_ACTIVE_DISRUPTIONS AS
SELECT 
    inc.IncidentID,
    inc.Title,
    inc.Description,
    inc.Severity,
    TO_CHAR(inc.StartTime, 'YYYY-MM-DD HH24:MI') AS DisruptionStart,
    TO_CHAR(inc.EndTime, 'YYYY-MM-DD HH24:MI') AS EstimatedRestoration,
    'SEGMENT' AS AffectedEntityType,
    aff_seg.SegmentID AS AffectedEntityID,
    r.Name || ' (' || st_from.Name || ' -> ' || st_to.Name || ')' AS ImpactDetails,
    aff_seg.StatusType,
    aff_seg.DelayMinutes
FROM INCIDENT inc
JOIN AFFECTEDSEGMENT aff_seg ON inc.IncidentID = aff_seg.IncidentID
JOIN SEGMENT s ON aff_seg.SegmentID = s.SegmentID
JOIN ROUTE r ON s.RouteID = r.RouteID
JOIN ROUTESTOP rs_from ON s.FromRouteStopID = rs_from.RouteStopID
JOIN STATION st_from ON rs_from.StationID = st_from.StationID
JOIN ROUTESTOP rs_to ON s.ToRouteStopID = rs_to.RouteStopID
JOIN STATION st_to ON rs_to.StationID = st_to.StationID
WHERE inc.StartTime <= SYSTIMESTAMP AND (inc.EndTime IS NULL OR inc.EndTime > SYSTIMESTAMP)
UNION ALL
SELECT 
    inc.IncidentID,
    inc.Title,
    inc.Description,
    inc.Severity,
    TO_CHAR(inc.StartTime, 'YYYY-MM-DD HH24:MI') AS DisruptionStart,
    TO_CHAR(inc.EndTime, 'YYYY-MM-DD HH24:MI') AS EstimatedRestoration,
    'STATION' AS AffectedEntityType,
    aff_stat.StationID AS AffectedEntityID,
    st.Name || ' (' || st.City || ')' AS ImpactDetails,
    aff_stat.StatusType,
    0 AS DelayMinutes
FROM INCIDENT inc
JOIN AFFECTEDSTATION aff_stat ON inc.IncidentID = aff_stat.IncidentID
JOIN STATION st ON aff_stat.StationID = st.StationID
WHERE inc.StartTime <= SYSTIMESTAMP AND (inc.EndTime IS NULL OR inc.EndTime > SYSTIMESTAMP)
WITH READ ONLY;

-- 4. User Safe SmartCard & Wallet View (No PII leak)
CREATE OR REPLACE VIEW V_USER_CARD_WALLET AS
SELECT 
    sc.CardNumber,
    sc.IsActive AS CardIsActive,
    TO_CHAR(sc.ExpiryDate, 'YYYY-MM-DD') AS ExpirationDate,
    w.WalletID,
    w.Balance,
    w.IsActive AS WalletIsActive,
    TO_CHAR(w.LastUpdated, 'YYYY-MM-DD HH24:MI:SS') AS LastUpdated,
    p.PassengerID,
    p.FirstName || ' ' || SUBSTR(p.LastName, 1, 1) || '.' AS PassengerDisplayName,
    NVL(fc.Name, 'Standard Adult') AS FareClassName,
    NVL(fc.DiscountPercentage, 0) AS DiscountPercentage
FROM SMARTCARD sc
JOIN WALLET w ON sc.SmartCardID = w.SmartCardID
JOIN PASSENGER p ON sc.PassengerID = p.PassengerID
LEFT JOIN PASSENGERFARECLASS pfc ON p.PassengerID = pfc.PassengerID 
    AND pfc.VerificationStatus = 'Approved'
    AND SYSTIMESTAMP BETWEEN pfc.ValidFrom AND NVL(pfc.ValidTo, SYSTIMESTAMP + INTERVAL '1' DAY)
LEFT JOIN FARECLASS fc ON pfc.FareClassID = fc.FareClassID AND fc.IsActive = 1
WHERE sc.IsActive = 1
WITH READ ONLY;

-- 5. Passenger Travel History
CREATE OR REPLACE VIEW V_USER_JOURNEY_HISTORY AS
SELECT 
    jl.JourneyLegID,
    sc.CardNumber,
    st_from.Name AS OriginStation,
    st_to.Name AS DestinationStation,
    TO_CHAR(jl.TapInTime, 'YYYY-MM-DD HH24:MI:SS') AS TapInTimeFormatted,
    TO_CHAR(jl.TapOutTime, 'YYYY-MM-DD HH24:MI:SS') AS TapOutTimeFormatted,
    jl.FareDeducted,
    jl.FareClassAtTime,
    jl.Status
FROM JOURNEYLEG jl
JOIN SMARTCARD sc ON jl.SmartCardID = sc.SmartCardID
JOIN STATION st_from ON jl.FromStationID = st_from.StationID
LEFT JOIN STATION st_to ON jl.ToStationID = st_to.StationID
ORDER BY jl.TapInTime DESC
WITH READ ONLY;
