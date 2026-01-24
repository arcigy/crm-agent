-- =====================================================
-- PROJECTS TABLE MIGRATION FOR SUPABASE
-- =====================================================
-- This migration creates the projects table with soft delete support
-- Run this in Supabase SQL Editor

-- Clean start - drop existing table if any
DROP TABLE IF EXISTS projects CASCADE;

-- Create the projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    
    -- Core project fields
    date_created TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    project_type VARCHAR(100) NOT NULL,
    contact_id INTEGER,
    stage VARCHAR(50) NOT NULL DEFAULT 'planning',
    end_date DATE,
    
    -- Soft delete (SAFETY FIRST rule)
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_contact ON projects(contact_id);
CREATE INDEX IF NOT EXISTS idx_projects_stage ON projects(stage);
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_date_created ON projects(date_created DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read non-deleted projects
CREATE POLICY "Users can view non-deleted projects" ON projects
    FOR SELECT
    USING (deleted_at IS NULL);

-- Policy: Allow authenticated users to insert projects
CREATE POLICY "Users can insert projects" ON projects
    FOR INSERT
    WITH CHECK (true);

-- Policy: Allow authenticated users to update projects
CREATE POLICY "Users can update projects" ON projects
    FOR UPDATE
    USING (deleted_at IS NULL);

-- Add comment describing the table
COMMENT ON TABLE projects IS 'CRM Projects table with soft delete support';
COMMENT ON COLUMN projects.stage IS 'Project stage: planning, in_progress, review, completed, on_hold, cancelled';
COMMENT ON COLUMN projects.deleted_at IS 'Soft delete timestamp - null means active';

-- =====================================================
-- OPTIONAL: Insert sample test data
-- =====================================================
/*
INSERT INTO projects (date_created, project_type, contact_id, stage, end_date) VALUES
    (NOW() - INTERVAL '8 days', 'Web Development', 1, 'in_progress', NOW() + INTERVAL '30 days'),
    (NOW() - INTERVAL '13 days', 'E-commerce', 2, 'planning', NOW() + INTERVAL '52 days'),
    (NOW() - INTERVAL '34 days', 'Mobile App', 3, 'completed', NOW() - INTERVAL '3 days'),
    (NOW() - INTERVAL '18 days', 'Marketing Campaign', NULL, 'review', NOW() + INTERVAL '7 days'),
    (NOW() - INTERVAL '5 days', 'Branding', 1, 'on_hold', NULL);
*/
