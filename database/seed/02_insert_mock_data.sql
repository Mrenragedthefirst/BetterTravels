-- ============================================================================
-- BETTERTRAVEL: MULTI-MODAL TRANSIT SYSTEM
-- SCRIPT 02: SEED MOCK DATA
-- Inserts realistic multi-modal network, fares, passengers, and incidents
-- ============================================================================

SET DEFINE OFF;
SET SQLBLANKLINES ON;

-- 1. STATIONS
INSERT INTO STATION (StationID, Name, City, Latitude, Longitude, Address, IsActive) VALUES (101, 'Central Hub', 'Metro City', 40.7128, -74.0060, '100 Grand Concourse', 1);
INSERT INTO STATION (StationID, Name, City, Latitude, Longitude, Address, IsActive) VALUES (102, 'Financial Center', 'Metro City', 40.7075, -74.0090, '25 Wall St', 1);
INSERT INTO STATION (StationID, Name, City, Latitude, Longitude, Address, IsActive) VALUES (103, 'Midtown West', 'Metro City', 40.7549, -73.9840, '400 8th Ave', 1);
INSERT INTO STATION (StationID, Name, City, Latitude, Longitude, Address, IsActive) VALUES (104, 'Metro North', 'Metro City', 40.7890, -73.9500, '850 Grand Blvd', 1);
INSERT INTO STATION (StationID, Name, City, Latitude, Longitude, Address, IsActive) VALUES (105, 'Tech Park', 'Metro City', 40.7300, -73.9950, '50 Innovation Way', 1);
INSERT INTO STATION (StationID, Name, City, Latitude, Longitude, Address, IsActive) VALUES (106, 'Harbor View', 'Metro City', 40.6900, -74.0200, '12 Ferry Terminal Rd', 1);
INSERT INTO STATION (StationID, Name, City, Latitude, Longitude, Address, IsActive) VALUES (107, 'University Village', 'Metro City', 40.7295, -73.9965, '30 Scholars Plaza', 1);
INSERT INTO STATION (StationID, Name, City, Latitude, Longitude, Address, IsActive) VALUES (108, 'Airport Terminal 1', 'Metro City', 40.6413, -73.7781, 'Airport Pkwy Bldg 1', 1);

-- 2. ROUTES
INSERT INTO ROUTE (RouteID, Name, "Mode", Operator, IsActive) VALUES (1, 'Red Metro Line', 'Metro', 'City Transit Authority', 1);
INSERT INTO ROUTE (RouteID, Name, "Mode", Operator, IsActive) VALUES (2, 'Blue Metro Line', 'Metro', 'City Transit Authority', 1);
INSERT INTO ROUTE (RouteID, Name, "Mode", Operator, IsActive) VALUES (3, 'Express Commuter Train', 'Train', 'Regional Rail Corp', 1);
INSERT INTO ROUTE (RouteID, Name, "Mode", Operator, IsActive) VALUES (4, 'Downtown Express Bus 101', 'Bus', 'Metro Bus Systems', 1);

-- 3. ROUTE STOPS
INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (1001, 1, 104, 1, '1A', 1);
INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (1002, 1, 103, 2, '1A', 1);
INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (1003, 1, 101, 3, '1A', 1);
INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (1004, 1, 102, 4, '1A', 1);
INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (1005, 1, 106, 5, '1A', 1);

INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (2001, 2, 105, 1, '2B', 1);
INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (2002, 2, 101, 2, '2B', 1);
INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (2003, 2, 107, 3, '2B', 1);
INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (2004, 2, 108, 4, '2B', 1);

INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (3001, 3, 104, 1, 'T1', 1);
INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (3002, 3, 101, 2, 'T2', 1);
INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (3003, 3, 108, 3, 'T3', 1);

INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (4001, 4, 103, 1, 'Bay 4', 1);
INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (4002, 4, 105, 2, 'Bay 1', 1);
INSERT INTO ROUTESTOP (RouteStopID, RouteID, StationID, Sequence, PlatformNumber, IsActive) VALUES (4003, 4, 102, 3, 'Bay 2', 1);

-- 4. SEGMENTS
INSERT INTO SEGMENT (SegmentID, RouteID, FromRouteStopID, ToRouteStopID, Distance, ScheduledTime, IsActive) VALUES (5001, 1, 1001, 1002, 4.5, 7, 1);
INSERT INTO SEGMENT (SegmentID, RouteID, FromRouteStopID, ToRouteStopID, Distance, ScheduledTime, IsActive) VALUES (5002, 1, 1002, 1003, 3.8, 6, 1);
INSERT INTO SEGMENT (SegmentID, RouteID, FromRouteStopID, ToRouteStopID, Distance, ScheduledTime, IsActive) VALUES (5003, 1, 1003, 1004, 2.2, 4, 1);
INSERT INTO SEGMENT (SegmentID, RouteID, FromRouteStopID, ToRouteStopID, Distance, ScheduledTime, IsActive) VALUES (5004, 1, 1004, 1005, 3.1, 5, 1);
INSERT INTO SEGMENT (SegmentID, RouteID, FromRouteStopID, ToRouteStopID, Distance, ScheduledTime, IsActive) VALUES (5005, 2, 2001, 2002, 2.8, 5, 1);
INSERT INTO SEGMENT (SegmentID, RouteID, FromRouteStopID, ToRouteStopID, Distance, ScheduledTime, IsActive) VALUES (5006, 2, 2002, 2003, 1.9, 4, 1);
INSERT INTO SEGMENT (SegmentID, RouteID, FromRouteStopID, ToRouteStopID, Distance, ScheduledTime, IsActive) VALUES (5007, 2, 2003, 2004, 14.2, 18, 1);
INSERT INTO SEGMENT (SegmentID, RouteID, FromRouteStopID, ToRouteStopID, Distance, ScheduledTime, IsActive) VALUES (5008, 3, 3001, 3002, 8.1, 11, 1);
INSERT INTO SEGMENT (SegmentID, RouteID, FromRouteStopID, ToRouteStopID, Distance, ScheduledTime, IsActive) VALUES (5009, 3, 3002, 3003, 18.5, 22, 1);
INSERT INTO SEGMENT (SegmentID, RouteID, FromRouteStopID, ToRouteStopID, Distance, ScheduledTime, IsActive) VALUES (5010, 4, 4001, 4002, 3.5, 12, 1);
INSERT INTO SEGMENT (SegmentID, RouteID, FromRouteStopID, ToRouteStopID, Distance, ScheduledTime, IsActive) VALUES (5011, 4, 4002, 4003, 2.4, 9, 1);

-- 5. TRANSFERS
INSERT INTO STATION_PAIR_TRANSFER (TransferID, FromStationID, ToStationID, WalkingDistance, WalkingTime, IsDirectConnection) VALUES (6001, 105, 107, 180, 3, 1);
INSERT INTO STATION_PAIR_TRANSFER (TransferID, FromStationID, ToStationID, WalkingDistance, WalkingTime, IsDirectConnection) VALUES (6002, 107, 105, 180, 3, 1);
INSERT INTO STATION_PAIR_TRANSFER (TransferID, FromStationID, ToStationID, WalkingDistance, WalkingTime, IsDirectConnection) VALUES (6003, 102, 106, 550, 8, 0);
INSERT INTO STATION_PAIR_TRANSFER (TransferID, FromStationID, ToStationID, WalkingDistance, WalkingTime, IsDirectConnection) VALUES (6004, 106, 102, 550, 8, 0);

INSERT INTO ROUTETRANSFER (RouteTransferID, FromRouteID, ToRouteID, CommonStationID, TransferTime, MinimumWaitTime, IsActive) VALUES (7001, 1, 2, 101, 4, 3, 1);
INSERT INTO ROUTETRANSFER (RouteTransferID, FromRouteID, ToRouteID, CommonStationID, TransferTime, MinimumWaitTime, IsActive) VALUES (7002, 2, 1, 101, 4, 3, 1);
INSERT INTO ROUTETRANSFER (RouteTransferID, FromRouteID, ToRouteID, CommonStationID, TransferTime, MinimumWaitTime, IsActive) VALUES (7003, 1, 3, 101, 6, 5, 1);
INSERT INTO ROUTETRANSFER (RouteTransferID, FromRouteID, ToRouteID, CommonStationID, TransferTime, MinimumWaitTime, IsActive) VALUES (7004, 3, 1, 101, 6, 5, 1);
INSERT INTO ROUTETRANSFER (RouteTransferID, FromRouteID, ToRouteID, CommonStationID, TransferTime, MinimumWaitTime, IsActive) VALUES (7005, 2, 3, 101, 7, 5, 1);
INSERT INTO ROUTETRANSFER (RouteTransferID, FromRouteID, ToRouteID, CommonStationID, TransferTime, MinimumWaitTime, IsActive) VALUES (7006, 3, 2, 101, 7, 5, 1);
INSERT INTO ROUTETRANSFER (RouteTransferID, FromRouteID, ToRouteID, CommonStationID, TransferTime, MinimumWaitTime, IsActive) VALUES (7007, 1, 3, 104, 5, 4, 1);
INSERT INTO ROUTETRANSFER (RouteTransferID, FromRouteID, ToRouteID, CommonStationID, TransferTime, MinimumWaitTime, IsActive) VALUES (7008, 3, 1, 104, 5, 4, 1);

-- 6. INCIDENTS & DISRUPTIONS
INSERT INTO INCIDENT (IncidentID, Title, Description, StartTime, EndTime, Severity) VALUES (8001, 'Signal Failure at Downtown Tunnel', 'Track circuit fault between Central and Financial Center', TO_TIMESTAMP('2026-09-19 07:30:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-09-19 12:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Major');
INSERT INTO INCIDENT (IncidentID, Title, Description, StartTime, EndTime, Severity) VALUES (8002, 'Escalator Maintenance', 'North concourse escalator undergoing overhaul', TO_TIMESTAMP('2026-09-18 22:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-09-20 06:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Minor');
INSERT INTO INCIDENT (IncidentID, Title, Description, StartTime, EndTime, Severity) VALUES (8003, 'Express Track Flooding', 'Flash flood warning impacting Commuter Train', TO_TIMESTAMP('2026-09-19 08:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-09-19 10:30:00', 'YYYY-MM-DD HH24:MI:SS'), 'Critical');

INSERT INTO AFFECTEDSEGMENT (AffectedSegmentID, IncidentID, SegmentID, StatusType, DelayMinutes) VALUES (8101, 8001, 5003, 'Delayed', 15);
INSERT INTO AFFECTEDSEGMENT (AffectedSegmentID, IncidentID, SegmentID, StatusType, DelayMinutes) VALUES (8102, 8003, 5008, 'Suspended', 999);

INSERT INTO AFFECTEDSTATION (AffectedStationID, IncidentID, StationID, StatusType, Reason) VALUES (8201, 8002, 104, 'PartiallyClosed', 'Escalator outage affecting Platform 1A');
INSERT INTO AFFECTEDSTATION (AffectedStationID, IncidentID, StationID, StatusType, Reason) VALUES (8202, 8003, 104, 'Congested', 'Passenger backlog due to suspended train service');

-- 7. FARE CLASSES & FARES
INSERT INTO FARECLASS (FareClassID, Name, DiscountPercentage, RequiresVerification, IsActive) VALUES (1, 'Standard Adult', 0.00, 0, 1);
INSERT INTO FARECLASS (FareClassID, Name, DiscountPercentage, RequiresVerification, IsActive) VALUES (2, 'Student', 30.00, 1, 1);
INSERT INTO FARECLASS (FareClassID, Name, DiscountPercentage, RequiresVerification, IsActive) VALUES (3, 'Senior Citizen', 50.00, 1, 1);
INSERT INTO FARECLASS (FareClassID, Name, DiscountPercentage, RequiresVerification, IsActive) VALUES (4, 'Child Under 12', 100.00, 0, 1);

INSERT INTO SEGMENTFARE (SegmentFareID, SegmentID, BaseAmount, ValidFrom, ValidTo, IsActive) VALUES (9001, 5001, 2.50, TO_TIMESTAMP('2026-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 1);
INSERT INTO SEGMENTFARE (SegmentFareID, SegmentID, BaseAmount, ValidFrom, ValidTo, IsActive) VALUES (9002, 5002, 2.25, TO_TIMESTAMP('2026-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 1);
INSERT INTO SEGMENTFARE (SegmentFareID, SegmentID, BaseAmount, ValidFrom, ValidTo, IsActive) VALUES (9003, 5003, 2.00, TO_TIMESTAMP('2026-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 1);
INSERT INTO SEGMENTFARE (SegmentFareID, SegmentID, BaseAmount, ValidFrom, ValidTo, IsActive) VALUES (9004, 5004, 2.25, TO_TIMESTAMP('2026-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 1);
INSERT INTO SEGMENTFARE (SegmentFareID, SegmentID, BaseAmount, ValidFrom, ValidTo, IsActive) VALUES (9005, 5005, 2.00, TO_TIMESTAMP('2026-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 1);
INSERT INTO SEGMENTFARE (SegmentFareID, SegmentID, BaseAmount, ValidFrom, ValidTo, IsActive) VALUES (9006, 5006, 1.75, TO_TIMESTAMP('2026-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 1);
INSERT INTO SEGMENTFARE (SegmentFareID, SegmentID, BaseAmount, ValidFrom, ValidTo, IsActive) VALUES (9007, 5007, 5.50, TO_TIMESTAMP('2026-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 1);
INSERT INTO SEGMENTFARE (SegmentFareID, SegmentID, BaseAmount, ValidFrom, ValidTo, IsActive) VALUES (9008, 5008, 4.50, TO_TIMESTAMP('2026-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 1);
INSERT INTO SEGMENTFARE (SegmentFareID, SegmentID, BaseAmount, ValidFrom, ValidTo, IsActive) VALUES (9009, 5009, 8.50, TO_TIMESTAMP('2026-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 1);
INSERT INTO SEGMENTFARE (SegmentFareID, SegmentID, BaseAmount, ValidFrom, ValidTo, IsActive) VALUES (9010, 5010, 1.50, TO_TIMESTAMP('2026-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 1);
INSERT INTO SEGMENTFARE (SegmentFareID, SegmentID, BaseAmount, ValidFrom, ValidTo, IsActive) VALUES (9011, 5011, 1.50, TO_TIMESTAMP('2026-01-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 1);

-- 8. PASSENGERS & SMARTCARDS & WALLETS
INSERT INTO PASSENGER (PassengerID, Email, FirstName, LastName, DateOfBirth, Phone, RegistrationDate) VALUES (10001, 'alice.chen@example.com', 'Alice', 'Chen', TO_DATE('1998-04-12', 'YYYY-MM-DD'), '+15550101', TO_TIMESTAMP('2026-02-15 09:20:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO PASSENGER (PassengerID, Email, FirstName, LastName, DateOfBirth, Phone, RegistrationDate) VALUES (10002, 'marcus.vance@example.com', 'Marcus', 'Vance', TO_DATE('1972-11-03', 'YYYY-MM-DD'), '+15550102', TO_TIMESTAMP('2026-03-01 14:10:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO PASSENGER (PassengerID, Email, FirstName, LastName, DateOfBirth, Phone, RegistrationDate) VALUES (10003, 'elena.rostova@example.com', 'Elena', 'Rostova', TO_DATE('2004-08-25', 'YYYY-MM-DD'), '+15550103', TO_TIMESTAMP('2026-05-18 11:45:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO PASSENGER (PassengerID, Email, FirstName, LastName, DateOfBirth, Phone, RegistrationDate) VALUES (10004, 'david.kim@example.com', 'David', 'Kim', TO_DATE('1958-01-30', 'YYYY-MM-DD'), '+15550104', TO_TIMESTAMP('2026-06-10 16:30:00', 'YYYY-MM-DD HH24:MI:SS'));

INSERT INTO PASSENGERFARECLASS (PassengerFareClassID, PassengerID, FareClassID, ValidFrom, ValidTo, VerificationStatus) VALUES (11001, 10001, 1, TO_TIMESTAMP('2026-02-15 09:20:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2029-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 'Approved');
INSERT INTO PASSENGERFARECLASS (PassengerFareClassID, PassengerID, FareClassID, ValidFrom, ValidTo, VerificationStatus) VALUES (11002, 10002, 1, TO_TIMESTAMP('2026-03-01 14:10:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2029-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 'Approved');
INSERT INTO PASSENGERFARECLASS (PassengerFareClassID, PassengerID, FareClassID, ValidFrom, ValidTo, VerificationStatus) VALUES (11003, 10003, 2, TO_TIMESTAMP('2026-05-18 11:45:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2027-05-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 'Approved');
INSERT INTO PASSENGERFARECLASS (PassengerFareClassID, PassengerID, FareClassID, ValidFrom, ValidTo, VerificationStatus) VALUES (11004, 10004, 3, TO_TIMESTAMP('2026-06-10 16:30:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2030-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 'Approved');

INSERT INTO SMARTCARD (SmartCardID, PassengerID, CardNumber, IsActive, ActivationDate, ExpiryDate) VALUES (20001, 10001, 'MC-9901-4412-0001', 1, TO_TIMESTAMP('2026-02-15 09:30:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2031-02-15 00:00:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO SMARTCARD (SmartCardID, PassengerID, CardNumber, IsActive, ActivationDate, ExpiryDate) VALUES (20002, 10002, 'MC-9901-4412-0002', 1, TO_TIMESTAMP('2026-03-01 14:20:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2031-03-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO SMARTCARD (SmartCardID, PassengerID, CardNumber, IsActive, ActivationDate, ExpiryDate) VALUES (20003, 10003, 'MC-9901-4412-0003', 1, TO_TIMESTAMP('2026-05-18 12:00:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2031-05-18 00:00:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO SMARTCARD (SmartCardID, PassengerID, CardNumber, IsActive, ActivationDate, ExpiryDate) VALUES (20004, 10004, 'MC-9901-4412-0004', 1, TO_TIMESTAMP('2026-06-10 16:40:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2031-06-10 00:00:00', 'YYYY-MM-DD HH24:MI:SS'));

INSERT INTO WALLET (WalletID, SmartCardID, Balance, LastUpdated, IsActive) VALUES (30001, 20001, 42.50, TO_TIMESTAMP('2026-09-19 08:05:00', 'YYYY-MM-DD HH24:MI:SS'), 1);
INSERT INTO WALLET (WalletID, SmartCardID, Balance, LastUpdated, IsActive) VALUES (30002, 20002, 18.00, TO_TIMESTAMP('2026-09-18 19:30:00', 'YYYY-MM-DD HH24:MI:SS'), 1);
INSERT INTO WALLET (WalletID, SmartCardID, Balance, LastUpdated, IsActive) VALUES (30003, 20003, 25.75, TO_TIMESTAMP('2026-09-19 07:45:00', 'YYYY-MM-DD HH24:MI:SS'), 1);
INSERT INTO WALLET (WalletID, SmartCardID, Balance, LastUpdated, IsActive) VALUES (30004, 20004, 50.00, TO_TIMESTAMP('2026-09-17 12:00:00', 'YYYY-MM-DD HH24:MI:SS'), 1);

-- 9. TRANSACTIONS & JOURNEYS
INSERT INTO TRANSACTION (TransactionID, WalletID, TransactionType, Amount, Timestamp, Status, Reference) VALUES (40001, 30001, 'TopUp', 50.00, TO_TIMESTAMP('2026-09-15 10:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Completed', 'TOPUP-CC-89410');
INSERT INTO TRANSACTION (TransactionID, WalletID, TransactionType, Amount, Timestamp, Status, Reference) VALUES (40002, 30001, 'FareDeduction', 4.75, TO_TIMESTAMP('2026-09-18 08:45:00', 'YYYY-MM-DD HH24:MI:SS'), 'Completed', 'TRIP-LEG-50001');
INSERT INTO TRANSACTION (TransactionID, WalletID, TransactionType, Amount, Timestamp, Status, Reference) VALUES (40003, 30001, 'FareDeduction', 2.75, TO_TIMESTAMP('2026-09-19 08:05:00', 'YYYY-MM-DD HH24:MI:SS'), 'Completed', 'TRIP-LEG-50002');
INSERT INTO TRANSACTION (TransactionID, WalletID, TransactionType, Amount, Timestamp, Status, Reference) VALUES (40004, 30002, 'TopUp', 20.00, TO_TIMESTAMP('2026-09-18 18:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Completed', 'TOPUP-CASH-1022');
INSERT INTO TRANSACTION (TransactionID, WalletID, TransactionType, Amount, Timestamp, Status, Reference) VALUES (40005, 30003, 'TopUp', 30.00, TO_TIMESTAMP('2026-09-10 12:15:00', 'YYYY-MM-DD HH24:MI:SS'), 'Completed', 'TOPUP-CC-33921');
INSERT INTO TRANSACTION (TransactionID, WalletID, TransactionType, Amount, Timestamp, Status, Reference) VALUES (40006, 30003, 'FareDeduction', 4.25, TO_TIMESTAMP('2026-09-19 07:45:00', 'YYYY-MM-DD HH24:MI:SS'), 'Completed', 'TRIP-LEG-50003');

INSERT INTO JOURNEYLEG (JourneyLegID, SmartCardID, PassengerID, FromStationID, ToStationID, TapInTime, TapOutTime, FareDeducted, FareClassAtTime, Status) VALUES (50001, 20001, 10001, 104, 101, TO_TIMESTAMP('2026-09-18 08:25:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-09-18 08:45:00', 'YYYY-MM-DD HH24:MI:SS'), 4.75, 'Standard Adult', 'Completed');
INSERT INTO JOURNEYLEG (JourneyLegID, SmartCardID, PassengerID, FromStationID, ToStationID, TapInTime, TapOutTime, FareDeducted, FareClassAtTime, Status) VALUES (50002, 20001, 10001, 101, 106, TO_TIMESTAMP('2026-09-19 07:48:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-09-19 08:05:00', 'YYYY-MM-DD HH24:MI:SS'), 2.75, 'Standard Adult', 'Completed');
INSERT INTO JOURNEYLEG (JourneyLegID, SmartCardID, PassengerID, FromStationID, ToStationID, TapInTime, TapOutTime, FareDeducted, FareClassAtTime, Status) VALUES (50003, 20003, 10003, 105, 108, TO_TIMESTAMP('2026-09-19 07:15:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-09-19 07:45:00', 'YYYY-MM-DD HH24:MI:SS'), 4.25, 'Student', 'Completed');
INSERT INTO JOURNEYLEG (JourneyLegID, SmartCardID, PassengerID, FromStationID, ToStationID, TapInTime, TapOutTime, FareDeducted, FareClassAtTime, Status) VALUES (50004, 20002, 10002, 103, 102, TO_TIMESTAMP('2026-09-19 08:20:00', 'YYYY-MM-DD HH24:MI:SS'), NULL, 0.00, 'Standard Adult', 'InProgress');

INSERT INTO JOURNEYROUTE (JourneyRouteUsedID, JourneyLegID, RouteID, Sequence, BoardingTime, AlightingTime) VALUES (60001, 50001, 1, 1, TO_TIMESTAMP('2026-09-18 08:27:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-09-18 08:43:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO JOURNEYROUTE (JourneyRouteUsedID, JourneyLegID, RouteID, Sequence, BoardingTime, AlightingTime) VALUES (60002, 50002, 1, 1, TO_TIMESTAMP('2026-09-19 07:50:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-09-19 08:03:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO JOURNEYROUTE (JourneyRouteUsedID, JourneyLegID, RouteID, Sequence, BoardingTime, AlightingTime) VALUES (60003, 50003, 2, 1, TO_TIMESTAMP('2026-09-19 07:18:00', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2026-09-19 07:43:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO JOURNEYROUTE (JourneyRouteUsedID, JourneyLegID, RouteID, Sequence, BoardingTime, AlightingTime) VALUES (60004, 50004, 4, 1, TO_TIMESTAMP('2026-09-19 08:22:00', 'YYYY-MM-DD HH24:MI:SS'), NULL);

COMMIT;
