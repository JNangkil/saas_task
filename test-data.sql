-- Test Data for Invitation Workflow Testing
-- This file contains sample data to manually test the invitation workflow

-- Clean up existing data (run in order)
-- 1. Clear existing data
-- 2. Insert fresh test data

-- 1. Clear existing data
DELETE FROM workspace_user;
DELETE FROM tenant_user;
DELETE FROM invitations;
DELETE FROM users WHERE email LIKE '%@example.com';
DELETE FROM workspaces WHERE name LIKE 'Test%';
DELETE FROM tenants WHERE name LIKE 'Test%';

-- 2. Insert fresh test data

-- Insert test users
INSERT INTO users (id, name, email, email_verified_at, password, created_at, updated_at) VALUES
(1, 'John Doe', 'john.doe@example.com', NOW(), 'password123', NOW(), NOW()),
(2, 'Jane Smith', 'jane.smith@example.com', NOW(), 'password123', NOW(), NOW()),
(3, 'Bob Johnson', 'bob.johnson@example.com', NOW(), 'password123', NOW(), NOW()),
(4, 'Alice Williams', 'alice.williams@example.com', NOW(), 'password123', NOW(), NOW()),
(5, 'New User', 'newuser@example.com', NOW(), 'password123', NOW(), NOW());

-- Insert test tenant
INSERT INTO tenants (id, name, created_at, updated_at) VALUES
(1, 'Test Tenant', NOW(), NOW());

-- Associate users with tenant
INSERT INTO tenant_user (tenant_id, user_id, role, created_at, updated_at) VALUES
(1, 1, 'owner', NOW(), NOW()),
(1, 2, 'admin', NOW(), NOW()),
(1, 3, 'member', NOW(), NOW()),
(1, 4, 'member', NOW(), NOW()),
(1, 5, 'member', NOW(), NOW());

-- Insert test workspace
INSERT INTO workspaces (id, tenant_id, name, description, created_at, updated_at) VALUES
(1, 1, 'Test Workspace', 'A test workspace for invitation workflow testing', NOW(), NOW());

-- Associate users with workspace
INSERT INTO workspace_user (workspace_id, user_id, role, joined_at, created_at, updated_at) VALUES
(1, 1, 'owner', NOW(), NOW(), NOW()),
(1, 2, 'admin', NOW(), NOW(), NOW()),
(1, 3, 'member', NOW(), NOW(), NOW()),
(1, 4, 'member', NOW(), NOW(), NOW()),
(1, 5, 'member', NOW(), NOW(), NOW());

-- Create test invitations
INSERT INTO invitations (id, workspace_id, tenant_id, email, role, token, status, invited_by, message, expires_at, created_at, updated_at) VALUES
(1, 1, 1, 'alice.williams@example.com', 'member', 'test-invitation-1', 'pending', 1, 'Welcome to our workspace!', DATE_ADD(NOW(), INTERVAL 7 DAY), NOW(), NOW()),
(2, 1, 1, 'bob.johnson@example.com', 'member', 'test-invitation-2', 'pending', 1, 'Welcome to the team!', DATE_ADD(NOW(), INTERVAL 7 DAY), NOW(), NOW()),
(3, 1, 1, 'newuser@example.com', 'member', 'test-invitation-3', 'pending', 1, 'Join our workspace!', DATE_ADD(NOW(), INTERVAL 7 DAY), NOW(), NOW());

-- Create an expired invitation for testing
INSERT INTO invitations (id, workspace_id, tenant_id, email, role, token, status, invited_by, message, expires_at, created_at, updated_at) VALUES
(4, 1, 1, 'expired@example.com', 'member', 'expired-invitation', 'expired', 1, 'This invitation has expired', DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), NOW());

-- Create an already accepted invitation for testing
INSERT INTO invitations (id, workspace_id, tenant_id, email, role, token, status, invited_by, message, expires_at, created_at, updated_at) VALUES
(5, 1, 1, 'accepted@example.com', 'member', 'accepted-invitation', 'accepted', 1, 'This invitation was already accepted', DATE_ADD(NOW(), INTERVAL 7 DAY), NOW(), NOW());