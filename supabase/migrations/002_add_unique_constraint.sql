-- Add unique constraint to prevent duplicate access records
ALTER TABLE user_tool_access ADD CONSTRAINT unique_user_tool UNIQUE (user_id, tool_id);
