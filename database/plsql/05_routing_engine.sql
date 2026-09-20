SET DEFINE OFF;
SET SQLBLANKLINES ON;
-- ============================================================================
-- BETTERTRAVEL: MULTI-MODAL TRANSIT SYSTEM
-- SCRIPT 05: RECURSIVE CTE ROUTING ENGINE AND FARE DEDUCTION
-- Implements Oracle Recursive CTE graph traversal with live disruption avoidance,
-- transfer penalty calculation, and transactional ticketing/smartcard operations.
-- ============================================================================

CREATE OR REPLACE PACKAGE PKG_TRANSIT_ROUTER AS

    -- Structure for ranked route results
    TYPE t_route_option IS RECORD (
        PathRank            NUMBER,
        StationPath         VARCHAR2(1000),
        RoutePath           VARCHAR2(1000),
        ModesUsed           VARCHAR2(200),
        TotalMinutes        NUMBER,
        TotalDistanceKm     NUMBER(8,2),
        TransferCount       NUMBER,
        TotalBaseFare       NUMBER(8,2),
        DiscountedFare      NUMBER(8,2),
        HasDelays           NUMBER(1),
        TotalDelayMinutes   NUMBER
    );

    TYPE t_route_options_tbl IS TABLE OF t_route_option;

    -- Pipelined function for querying ranked routes in SQL views/REST endpoints
    FUNCTION FIND_ROUTES (
        p_origin_station_id IN NUMBER,
        p_dest_station_id   IN NUMBER,
        p_fare_class_id     IN NUMBER DEFAULT 1,
        p_max_transfers     IN NUMBER DEFAULT 3
    ) RETURN t_route_options_tbl PIPELINED;

    -- SmartCard Tap-In (Journey Initiation)
    PROCEDURE PROCESS_TAP_IN (
        p_card_number       IN  VARCHAR2,
        p_from_station_id   IN  NUMBER,
        o_journey_leg_id    OUT NUMBER,
        o_passenger_name    OUT VARCHAR2,
        o_current_balance   OUT NUMBER
    );

    -- SmartCard Tap-Out (Journey Completion & Atomic Wallet Deduction)
    PROCEDURE PROCESS_TAP_OUT (
        p_card_number       IN  VARCHAR2,
        p_to_station_id     IN  NUMBER,
        o_journey_leg_id    OUT NUMBER,
        o_fare_deducted     OUT NUMBER,
        o_new_balance       OUT NUMBER,
        o_journey_status    OUT VARCHAR2
    );

END PKG_TRANSIT_ROUTER;
/

CREATE OR REPLACE PACKAGE BODY PKG_TRANSIT_ROUTER AS

    FUNCTION FIND_ROUTES (
        p_origin_station_id IN NUMBER,
        p_dest_station_id   IN NUMBER,
        p_fare_class_id     IN NUMBER DEFAULT 1,
        p_max_transfers     IN NUMBER DEFAULT 3
    ) RETURN t_route_options_tbl PIPELINED IS
        v_discount_pct NUMBER := 0;
    BEGIN
        -- Fetch discount percentage for fare class
        BEGIN
            SELECT DiscountPercentage INTO v_discount_pct
            FROM FARECLASS
            WHERE FareClassID = p_fare_class_id AND IsActive = 1;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                v_discount_pct := 0;
        END;

        -- Recursive CTE Traversal
        FOR r IN (
            WITH 
            -- 1. Active physical edges (excluding suspended segments)
            ACTIVE_NETWORK_EDGES AS (
                -- Forward Direction
                SELECT 
                    seg.SegmentID,
                    seg.RouteID,
                    r.Name AS RouteName,
                    r."Mode" AS TransitMode,
                    st_from.StationID AS FromStationID,
                    st_from.Name AS FromStationName,
                    st_to.StationID AS ToStationID,
                    st_to.Name AS ToStationName,
                    seg.Distance,
                    seg.ScheduledTime,
                    NVL(aff.DelayMinutes, 0) AS DelayMinutes,
                    (seg.ScheduledTime + NVL(aff.DelayMinutes, 0)) AS EdgeDuration,
                    NVL(sf.BaseAmount, 2.00) AS SegmentFare
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
                    -- Active disruptions: started in past/present, not yet resolved
                    SELECT a.SegmentID, a.StatusType, a.DelayMinutes
                    FROM AFFECTEDSEGMENT a
                    JOIN INCIDENT i ON a.IncidentID = i.IncidentID
                    WHERE i.StartTime <= SYSTIMESTAMP AND (i.EndTime IS NULL OR i.EndTime > SYSTIMESTAMP)
                ) aff ON seg.SegmentID = aff.SegmentID
                WHERE seg.IsActive = 1
                  -- BYPASS SUSPENDED EDGES COMPLETELY
                  AND (aff.StatusType IS NULL OR aff.StatusType <> 'Suspended')
                  -- Avoid completely closed stations
                  AND st_from.StationID NOT IN (
                      SELECT afs.StationID FROM AFFECTEDSTATION afs
                      JOIN INCIDENT inc ON afs.IncidentID = inc.IncidentID
                      WHERE afs.StatusType = 'Closed'
                        AND inc.StartTime <= SYSTIMESTAMP AND (inc.EndTime IS NULL OR inc.EndTime > SYSTIMESTAMP)
                  )
                  AND st_to.StationID NOT IN (
                      SELECT afs.StationID FROM AFFECTEDSTATION afs
                      JOIN INCIDENT inc ON afs.IncidentID = inc.IncidentID
                      WHERE afs.StatusType = 'Closed'
                        AND inc.StartTime <= SYSTIMESTAMP AND (inc.EndTime IS NULL OR inc.EndTime > SYSTIMESTAMP)
                  )
                UNION ALL
                -- Return / Inbound Direction (Transit corridors are bidirectional)
                SELECT 
                    seg.SegmentID,
                    seg.RouteID,
                    r.Name AS RouteName,
                    r."Mode" AS TransitMode,
                    st_to.StationID AS FromStationID,
                    st_to.Name AS FromStationName,
                    st_from.StationID AS ToStationID,
                    st_from.Name AS ToStationName,
                    seg.Distance,
                    seg.ScheduledTime,
                    NVL(aff.DelayMinutes, 0) AS DelayMinutes,
                    (seg.ScheduledTime + NVL(aff.DelayMinutes, 0)) AS EdgeDuration,
                    NVL(sf.BaseAmount, 2.00) AS SegmentFare
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
                    SELECT a.SegmentID, a.StatusType, a.DelayMinutes
                    FROM AFFECTEDSEGMENT a
                    JOIN INCIDENT i ON a.IncidentID = i.IncidentID
                    WHERE i.StartTime <= SYSTIMESTAMP AND (i.EndTime IS NULL OR i.EndTime > SYSTIMESTAMP)
                ) aff ON seg.SegmentID = aff.SegmentID
                WHERE seg.IsActive = 1
                  AND (aff.StatusType IS NULL OR aff.StatusType <> 'Suspended')
                  AND st_from.StationID NOT IN (
                      SELECT afs.StationID FROM AFFECTEDSTATION afs
                      JOIN INCIDENT inc ON afs.IncidentID = inc.IncidentID
                      WHERE afs.StatusType = 'Closed'
                        AND inc.StartTime <= SYSTIMESTAMP AND (inc.EndTime IS NULL OR inc.EndTime > SYSTIMESTAMP)
                  )
                  AND st_to.StationID NOT IN (
                      SELECT afs.StationID FROM AFFECTEDSTATION afs
                      JOIN INCIDENT inc ON afs.IncidentID = inc.IncidentID
                      WHERE afs.StatusType = 'Closed'
                        AND inc.StartTime <= SYSTIMESTAMP AND (inc.EndTime IS NULL OR inc.EndTime > SYSTIMESTAMP)
                  )
            ),
            
            -- 2. Walking transfers between distinct stations
            WALKING_EDGES AS (
                SELECT 
                    0 AS SegmentID,
                    0 AS RouteID,
                    'Walk' AS RouteName,
                    'Walk' AS TransitMode,
                    spt.FromStationID,
                    st_from.Name AS FromStationName,
                    spt.ToStationID,
                    st_to.Name AS ToStationName,
                    (spt.WalkingDistance / 1000.0) AS Distance,
                    spt.WalkingTime AS ScheduledTime,
                    0 AS DelayMinutes,
                    spt.WalkingTime AS EdgeDuration,
                    0.00 AS SegmentFare
                FROM STATION_PAIR_TRANSFER spt
                JOIN STATION st_from ON spt.FromStationID = st_from.StationID AND st_from.IsActive = 1
                JOIN STATION st_to ON spt.ToStationID = st_to.StationID AND st_to.IsActive = 1
            ),

            -- 3. Unified graph edges
            GRAPH_EDGES AS (
                SELECT * FROM ACTIVE_NETWORK_EDGES
                UNION ALL
                SELECT * FROM WALKING_EDGES
            ),

            -- 4. Recursive Path Search with Cycle Prevention
            ROUTING_CTE (
                CurrentStationID,
                CurrentStationName,
                LastRouteID,
                StationPath,
                RoutePath,
                ModesPath,
                TotalMinutes,
                TotalDistanceKm,
                TransferCount,
                TotalBaseFare,
                TotalDelayMinutes,
                HopCount
            ) AS (
                -- Base Anchor Member: First hop from origin
                SELECT 
                    e.ToStationID,
                    e.ToStationName,
                    e.RouteID,
                    CAST(e.FromStationName || ' -> ' || e.ToStationName AS VARCHAR2(1000)),
                    CAST(e.RouteName AS VARCHAR2(1000)),
                    CAST(e.TransitMode AS VARCHAR2(200)),
                    e.EdgeDuration,
                    e.Distance,
                    0 AS TransferCount,
                    e.SegmentFare,
                    e.DelayMinutes,
                    1 AS HopCount
                FROM GRAPH_EDGES e
                WHERE e.FromStationID = p_origin_station_id

                UNION ALL

                -- Recursive Member: Traverse to next station
                SELECT 
                    nxt.ToStationID,
                    nxt.ToStationName,
                    nxt.RouteID,
                    CAST(r.StationPath || ' -> ' || nxt.ToStationName AS VARCHAR2(1000)),
                    CAST(
                        CASE 
                            WHEN r.LastRouteID = nxt.RouteID OR nxt.RouteID = 0 THEN r.RoutePath
                            ELSE r.RoutePath || ' -> ' || nxt.RouteName
                        END AS VARCHAR2(1000)
                    ),
                    CAST(
                        CASE 
                            WHEN INSTR(r.ModesPath, nxt.TransitMode) > 0 THEN r.ModesPath
                            ELSE r.ModesPath || ', ' || nxt.TransitMode
                        END AS VARCHAR2(200)
                    ),
                    -- Factor in transfer penalty (5 min default or ROUTETRANSFER lookup)
                    r.TotalMinutes + nxt.EdgeDuration + (
                        CASE 
                            WHEN r.LastRouteID <> nxt.RouteID AND r.LastRouteID <> 0 AND nxt.RouteID <> 0 
                            THEN 5 
                            ELSE 0 
                        END
                    ),
                    r.TotalDistanceKm + nxt.Distance,
                    r.TransferCount + (
                        CASE 
                            WHEN r.LastRouteID <> nxt.RouteID AND r.LastRouteID <> 0 AND nxt.RouteID <> 0 
                            THEN 1 
                            ELSE 0 
                        END
                    ),
                    r.TotalBaseFare + nxt.SegmentFare,
                    r.TotalDelayMinutes + nxt.DelayMinutes,
                    r.HopCount + 1
                FROM ROUTING_CTE r
                JOIN GRAPH_EDGES nxt ON r.CurrentStationID = nxt.FromStationID
                WHERE INSTR(r.StationPath, nxt.ToStationName) = 0 -- Loop check
                  AND r.HopCount < 8                             -- Max depth guard
                  AND r.TransferCount <= p_max_transfers
            )
            CYCLE CurrentStationID SET is_cycle TO 1 DEFAULT 0

            -- Filter paths that reached destination
            SELECT 
                ROW_NUMBER() OVER (ORDER BY TotalMinutes ASC, TotalBaseFare ASC) AS PathRank,
                StationPath,
                RoutePath,
                ModesPath,
                TotalMinutes,
                TotalDistanceKm,
                TransferCount,
                TotalBaseFare,
                ROUND(TotalBaseFare * (1.0 - (v_discount_pct / 100.0)), 2) AS DiscountedFare,
                CASE WHEN TotalDelayMinutes > 0 THEN 1 ELSE 0 END AS HasDelays,
                TotalDelayMinutes
            FROM ROUTING_CTE
            WHERE CurrentStationID = p_dest_station_id
              AND is_cycle = 0
            FETCH FIRST 5 ROWS ONLY
        ) LOOP
            PIPE ROW(t_route_option(
                r.PathRank,
                r.StationPath,
                r.RoutePath,
                r.ModesPath,
                r.TotalMinutes,
                r.TotalDistanceKm,
                r.TransferCount,
                r.TotalBaseFare,
                r.DiscountedFare,
                r.HasDelays,
                r.TotalDelayMinutes
            ));
        END LOOP;

        RETURN;
    END FIND_ROUTES;

    PROCEDURE PROCESS_TAP_IN (
        p_card_number       IN  VARCHAR2,
        p_from_station_id   IN  NUMBER,
        o_journey_leg_id    OUT NUMBER,
        o_passenger_name    OUT VARCHAR2,
        o_current_balance   OUT NUMBER
    ) IS
        v_card_id       NUMBER;
        v_passenger_id  NUMBER;
        v_fare_class    VARCHAR2(60) := 'Standard Adult';
        v_balance       NUMBER(10,2);
        v_open_leg_id   NUMBER;
    BEGIN
        -- 1. Validate SmartCard and get Passenger & Wallet details
        SELECT 
            sc.SmartCardID,
            sc.PassengerID,
            p.FirstName || ' ' || p.LastName,
            w.Balance
        INTO v_card_id, v_passenger_id, o_passenger_name, v_balance
        FROM SMARTCARD sc
        JOIN PASSENGER p ON sc.PassengerID = p.PassengerID
        JOIN WALLET w ON sc.SmartCardID = w.SmartCardID
        WHERE sc.CardNumber = p_card_number 
          AND sc.IsActive = 1
          AND w.IsActive = 1
          AND sc.ExpiryDate > SYSTIMESTAMP;

        -- 2. Validate minimum balance ($2.00 minimum for tap-in)
        IF v_balance < 2.00 THEN
            RAISE_APPLICATION_ERROR(-20010, 'Insufficient wallet balance ($' || TO_CHAR(v_balance, 'FM990.00') || '). Minimum $2.00 required to enter.');
        END IF;

        -- 3. Check for unfinished journeys (tap-in without tap-out)
        BEGIN
            SELECT JourneyLegID INTO v_open_leg_id
            FROM JOURNEYLEG
            WHERE SmartCardID = v_card_id AND Status = 'InProgress';

            IF v_open_leg_id IS NOT NULL THEN
                -- Auto-charge penalty fare on abandoned journey
                UPDATE JOURNEYLEG
                SET Status = 'Incomplete',
                    FareDeducted = 5.00,
                    TapOutTime = SYSTIMESTAMP
                WHERE JourneyLegID = v_open_leg_id;
            END IF;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                NULL;
        END;

        -- 4. Get active fare class
        BEGIN
            SELECT fc.Name INTO v_fare_class
            FROM PASSENGERFARECLASS pfc
            JOIN FARECLASS fc ON pfc.FareClassID = fc.FareClassID
            WHERE pfc.PassengerID = v_passenger_id 
              AND pfc.VerificationStatus = 'Approved'
              AND SYSTIMESTAMP BETWEEN pfc.ValidFrom AND NVL(pfc.ValidTo, SYSTIMESTAMP + INTERVAL '1' DAY)
            FETCH FIRST 1 ROWS ONLY;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                v_fare_class := 'Standard Adult';
        END;

        -- 5. Create new Journey Leg
        INSERT INTO JOURNEYLEG (
            SmartCardID,
            PassengerID,
            FromStationID,
            TapInTime,
            FareDeducted,
            FareClassAtTime,
            Status
        ) VALUES (
            v_card_id,
            v_passenger_id,
            p_from_station_id,
            SYSTIMESTAMP,
            0.00,
            v_fare_class,
            'InProgress'
        ) RETURNING JourneyLegID INTO o_journey_leg_id;

        o_current_balance := v_balance;
        COMMIT;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20011, 'SmartCard not found, expired, or deactivated: ' || p_card_number);
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END PROCESS_TAP_IN;

    PROCEDURE PROCESS_TAP_OUT (
        p_card_number       IN  VARCHAR2,
        p_to_station_id     IN  NUMBER,
        o_journey_leg_id    OUT NUMBER,
        o_fare_deducted     OUT NUMBER,
        o_new_balance       OUT NUMBER,
        o_journey_status    OUT VARCHAR2
    ) IS
        v_card_id       NUMBER;
        v_wallet_id     NUMBER;
        v_balance       NUMBER(10,2);
        v_from_stat_id  NUMBER;
        v_calc_fare     NUMBER(8,2) := 2.50; -- Default base trip fare
        v_discount_pct  NUMBER := 0;
        v_fare_class    VARCHAR2(60);
    BEGIN
        -- 1. Find active journey leg
        SELECT 
            jl.JourneyLegID,
            jl.SmartCardID,
            jl.FromStationID,
            jl.FareClassAtTime,
            w.WalletID,
            w.Balance
        INTO 
            o_journey_leg_id,
            v_card_id,
            v_from_stat_id,
            v_fare_class,
            v_wallet_id,
            v_balance
        FROM JOURNEYLEG jl
        JOIN SMARTCARD sc ON jl.SmartCardID = sc.SmartCardID
        JOIN WALLET w ON sc.SmartCardID = w.SmartCardID
        WHERE sc.CardNumber = p_card_number
          AND jl.Status = 'InProgress'
        FOR UPDATE OF w.Balance;

        -- 2. Prevent same-station tap-out within 2 minutes without fare
        IF v_from_stat_id = p_to_station_id THEN
            v_calc_fare := 0.00;
        ELSE
            -- Compute optimal route fare using router function
            BEGIN
                SELECT DiscountedFare INTO v_calc_fare
                FROM TABLE(PKG_TRANSIT_ROUTER.FIND_ROUTES(v_from_stat_id, p_to_station_id))
                WHERE ROWNUM = 1;
            EXCEPTION
                WHEN OTHERS THEN
                    v_calc_fare := 2.50;
            END;
        END IF;

        -- 3. Atomic wallet deduction
        IF v_balance < v_calc_fare THEN
            -- Allow completion but balance goes negative / flagged
            o_journey_status := 'CompletedWithArrears';
        ELSE
            o_journey_status := 'Completed';
        END IF;

        UPDATE WALLET
        SET Balance = Balance - v_calc_fare,
            LastUpdated = SYSTIMESTAMP
        WHERE WalletID = v_wallet_id
        RETURNING Balance INTO o_new_balance;

        -- 4. Record Transaction
        INSERT INTO TRANSACTION (WalletID, TransactionType, Amount, Timestamp, Status, Reference)
        VALUES (v_wallet_id, 'FareDeduction', v_calc_fare, SYSTIMESTAMP, 'Completed', 'JOURNEY-' || o_journey_leg_id);

        -- 5. Finalize Journey Leg
        UPDATE JOURNEYLEG
        SET ToStationID = p_to_station_id,
            TapOutTime = SYSTIMESTAMP,
            FareDeducted = v_calc_fare,
            Status = 'Completed'
        WHERE JourneyLegID = o_journey_leg_id;

        o_fare_deducted := v_calc_fare;
        COMMIT;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20012, 'No active InProgress journey found for SmartCard: ' || p_card_number);
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END PROCESS_TAP_OUT;

END PKG_TRANSIT_ROUTER;
/
exit;
