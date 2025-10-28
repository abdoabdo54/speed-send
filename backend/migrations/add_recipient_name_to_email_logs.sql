-- Add recipient_name column to email_logs table
ALTER TABLE email_logs ADD COLUMN recipient_name VARCHAR(255);
