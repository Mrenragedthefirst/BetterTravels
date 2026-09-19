-- ============================================================================
-- BETTERTRAVEL: MASTER DATABASE INSTALLATION SCRIPT
-- Run this script in SQLcl or SQL*Plus: @database/install_all.sql
-- ============================================================================

SET ECHO ON;
SET FEEDBACK ON;
SET SERVEROUTPUT ON;

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

SELECT table_name, num_rows FROM user_tables ORDER BY table_name;
SELECT view_name FROM user_views ORDER BY view_name;
SELECT object_name, object_type, status FROM user_objects WHERE object_type IN ('PACKAGE', 'PACKAGE BODY');

PROMPT Ready for Phase 3!
