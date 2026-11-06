-- ==============================================================================
-- Migration: 014_clear_old_audit_logs.sql
-- ShopFlow: Clear legacy demo activity logs
-- ==============================================================================

-- Clear all past demo/test activity logs so recent activities start fresh
DELETE FROM audit_logs;
