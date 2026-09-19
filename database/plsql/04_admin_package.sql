-- ============================================================================
-- BETTERTRAVEL: MULTI-MODAL TRANSIT SYSTEM
-- SCRIPT 04: ADMIN DISRUPTION & NETWORK MANAGEMENT PACKAGE
-- Provides atomic, transactional stored procedures for administrator operations
-- ============================================================================

CREATE OR REPLACE PACKAGE PKG_BETTERTRAVEL_ADMIN AS
    -- Incident lifecycle
    PROCEDURE PRC_REPORT_INCIDENT (
        p_title         IN  VARCHAR2,
        p_description   IN  VARCHAR2,
        p_severity      IN  VARCHAR2,
        p_start_time    IN  TIMESTAMP DEFAULT SYSTIMESTAMP,
        p_end_time      IN  TIMESTAMP DEFAULT NULL,
        o_incident_id   OUT NUMBER
    );

    PROCEDURE PRC_DISRUPT_SEGMENT (
        p_incident_id   IN  NUMBER,
        p_segment_id    IN  NUMBER,
        p_status_type   IN  VARCHAR2,
        p_delay_minutes IN  NUMBER DEFAULT 0
    );

    PROCEDURE PRC_DISRUPT_STATION (
        p_incident_id   IN  NUMBER,
        p_station_id    IN  NUMBER,
        p_status_type   IN  VARCHAR2,
        p_reason        IN  VARCHAR2
    );

    PROCEDURE PRC_RESOLVE_INCIDENT (
        p_incident_id   IN  NUMBER
    );

    -- Network configuration
    PROCEDURE PRC_ADD_STATION (
        p_name          IN  VARCHAR2,
        p_city          IN  VARCHAR2,
        p_lat           IN  NUMBER,
        p_lng           IN  NUMBER,
        p_address       IN  VARCHAR2,
        o_station_id    OUT NUMBER
    );

    -- Wallet operations (kiosk / customer care top-up)
    PROCEDURE PRC_TOPUP_WALLET (
        p_card_number   IN  VARCHAR2,
        p_amount        IN  NUMBER,
        p_reference     IN  VARCHAR2,
        o_new_balance   OUT NUMBER
    );
END PKG_BETTERTRAVEL_ADMIN;
/

CREATE OR REPLACE PACKAGE BODY PKG_BETTERTRAVEL_ADMIN AS

    PROCEDURE PRC_REPORT_INCIDENT (
        p_title         IN  VARCHAR2,
        p_description   IN  VARCHAR2,
        p_severity      IN  VARCHAR2,
        p_start_time    IN  TIMESTAMP DEFAULT SYSTIMESTAMP,
        p_end_time      IN  TIMESTAMP DEFAULT NULL,
        o_incident_id   OUT NUMBER
    ) IS
    BEGIN
        IF p_severity NOT IN ('Minor', 'Moderate', 'Major', 'Critical') THEN
            RAISE_APPLICATION_ERROR(-20001, 'Invalid severity level. Must be Minor, Moderate, Major, or Critical.');
        END IF;

        INSERT INTO INCIDENT (Title, Description, Severity, StartTime, EndTime)
        VALUES (p_title, p_description, p_severity, NVL(p_start_time, SYSTIMESTAMP), p_end_time)
        RETURNING IncidentID INTO o_incident_id;

        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END PRC_REPORT_INCIDENT;

    PROCEDURE PRC_DISRUPT_SEGMENT (
        p_incident_id   IN  NUMBER,
        p_segment_id    IN  NUMBER,
        p_status_type   IN  VARCHAR2,
        p_delay_minutes IN  NUMBER DEFAULT 0
    ) IS
        v_dummy NUMBER;
    BEGIN
        IF p_status_type NOT IN ('Delayed', 'Suspended', 'Rerouted', 'Normal') THEN
            RAISE_APPLICATION_ERROR(-20002, 'Invalid status type. Must be Delayed, Suspended, Rerouted, or Normal.');
        END IF;

        -- Verify incident exists
        SELECT 1 INTO v_dummy FROM INCIDENT WHERE IncidentID = p_incident_id;
        -- Verify segment exists
        SELECT 1 INTO v_dummy FROM SEGMENT WHERE SegmentID = p_segment_id;

        INSERT INTO AFFECTEDSEGMENT (IncidentID, SegmentID, StatusType, DelayMinutes)
        VALUES (p_incident_id, p_segment_id, p_status_type, NVL(p_delay_minutes, 0));

        COMMIT;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20003, 'Incident ID or Segment ID does not exist.');
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END PRC_DISRUPT_SEGMENT;

    PROCEDURE PRC_DISRUPT_STATION (
        p_incident_id   IN  NUMBER,
        p_station_id    IN  NUMBER,
        p_status_type   IN  VARCHAR2,
        p_reason        IN  VARCHAR2
    ) IS
        v_dummy NUMBER;
    BEGIN
        IF p_status_type NOT IN ('Open', 'PartiallyClosed', 'Closed', 'Congested') THEN
            RAISE_APPLICATION_ERROR(-20004, 'Invalid station status. Must be Open, PartiallyClosed, Closed, or Congested.');
        END IF;

        SELECT 1 INTO v_dummy FROM INCIDENT WHERE IncidentID = p_incident_id;
        SELECT 1 INTO v_dummy FROM STATION WHERE StationID = p_station_id;

        INSERT INTO AFFECTEDSTATION (IncidentID, StationID, StatusType, Reason)
        VALUES (p_incident_id, p_station_id, p_status_type, p_reason);

        COMMIT;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20005, 'Incident ID or Station ID does not exist.');
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END PRC_DISRUPT_STATION;

    PROCEDURE PRC_RESOLVE_INCIDENT (
        p_incident_id   IN  NUMBER
    ) IS
    BEGIN
        UPDATE INCIDENT
        SET EndTime = SYSTIMESTAMP
        WHERE IncidentID = p_incident_id;

        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20006, 'Incident not found with ID: ' || p_incident_id);
        END IF;

        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END PRC_RESOLVE_INCIDENT;

    PROCEDURE PRC_ADD_STATION (
        p_name          IN  VARCHAR2,
        p_city          IN  VARCHAR2,
        p_lat           IN  NUMBER,
        p_lng           IN  NUMBER,
        p_address       IN  VARCHAR2,
        o_station_id    OUT NUMBER
    ) IS
    BEGIN
        INSERT INTO STATION (Name, City, Latitude, Longitude, Address, IsActive)
        VALUES (p_name, p_city, p_lat, p_lng, p_address, 1)
        RETURNING StationID INTO o_station_id;

        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END PRC_ADD_STATION;

    PROCEDURE PRC_TOPUP_WALLET (
        p_card_number   IN  VARCHAR2,
        p_amount        IN  NUMBER,
        p_reference     IN  VARCHAR2,
        o_new_balance   OUT NUMBER
    ) IS
        v_wallet_id NUMBER;
        v_balance   NUMBER(10,2);
    BEGIN
        IF p_amount <= 0 THEN
            RAISE_APPLICATION_ERROR(-20007, 'Top-up amount must be strictly greater than zero.');
        END IF;

        -- Lock wallet row for update
        SELECT w.WalletID, w.Balance
        INTO v_wallet_id, v_balance
        FROM WALLET w
        JOIN SMARTCARD sc ON w.SmartCardID = sc.SmartCardID
        WHERE sc.CardNumber = p_card_number AND sc.IsActive = 1
        FOR UPDATE;

        UPDATE WALLET
        SET Balance = Balance + p_amount,
            LastUpdated = SYSTIMESTAMP
        WHERE WalletID = v_wallet_id
        RETURNING Balance INTO o_new_balance;

        INSERT INTO TRANSACTION (WalletID, TransactionType, Amount, Timestamp, Status, Reference)
        VALUES (v_wallet_id, 'TopUp', p_amount, SYSTIMESTAMP, 'Completed', NVL(p_reference, 'ADMIN-TOPUP'));

        COMMIT;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20008, 'Active SmartCard not found for card number: ' || p_card_number);
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END PRC_TOPUP_WALLET;

END PKG_BETTERTRAVEL_ADMIN;
/
