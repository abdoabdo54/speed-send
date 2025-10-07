-- Direct SQL to add missing columns
ALTER TABLE campaigns ADD COLUMN test_after_email VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN test_after_count INTEGER DEFAULT 0;

-- Update existing records
UPDATE campaigns SET test_after_count = 0 WHERE test_after_count IS NULL;

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('test_after_email', 'test_after_count');
