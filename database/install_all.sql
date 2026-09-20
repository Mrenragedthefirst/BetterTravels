-- ============================================================================
-- BETTERTRAVEL: MASTER DATABASE INSTALLATION SCRIPT
-- Verified build: schema v1, seed v1, views v2 (timestamp fix),
--                 admin_package v1, routing_engine v2 (bidirectional + timestamp fix)
--
-- Usage (SQL*Plus or SQLcl connected as BTAPP to XEPDB1):
--   @database/install_all.sql
--
-- Or run the single-file version:
--   @database/bettertravel_complete.sql
-- ============================================================================

SET ECHO ON;
SET FEEDBACK ON;
SET SERVEROUTPUT ON;
SET DEFINE OFF;

PROMPT ============================================================
PROMPT STEP 1: Creating Schema Tables, Constraints & Indexes...
PROMPT ============================================================
@@schema/01_schema_ddl.sql

PROMPT ============================================================
PROMPT STEP 2: Seeding Initial Mock Data...
PROMPT ============================================================
@@seed/02_insert_mock_data.sql

PROMPT ============================================================
PROMPT STEP 3: Creating Read-Only Security Views for Users...
PROMPT ============================================================
@@views/03_security_views.sql

PROMPT ============================================================
PROMPT STEP 4: Creating Admin Disruption & Management Package...
PROMPT ============================================================
@@plsql/04_admin_package.sql

PROMPT ============================================================
PROMPT STEP 5: Creating Recursive CTE Routing Engine & Ticketing...
PROMPT ============================================================
@@plsql/05_routing_engine.sql

PROMPT ============================================================
PROMPT INSTALLATION COMPLETE! Running sanity checks...
PROMPT ============================================================

SELECT table_name FROM user_tables ORDER BY table_name;
SELECT view_name  FROM user_views  ORDER BY view_name;
SELECT object_name, object_type, status
  FROM user_objects
 WHERE object_type IN ('PACKAGE', 'PACKAGE BODY')
 ORDER BY object_name;

PROMPT
PROMPT BetterTravel database is ready.
PROMPT Start the Node.js backend: cd backend && npm.cmd start
PROMPT
