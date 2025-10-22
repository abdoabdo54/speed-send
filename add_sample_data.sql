-- Add sample service account
INSERT INTO service_accounts (name, client_email, domain, encrypted_json, status, total_users, daily_limit, quota_limit, quota_used_today) 
VALUES (
    'Sample Google Workspace Account',
    'sample-service@your-project.iam.gserviceaccount.com',
    'yourdomain.com',
    'encrypted_json_placeholder_here',
    'active',
    5,
    2000,
    500,
    0
);

-- Add sample contact list
INSERT INTO contact_lists (name, description) 
VALUES (
    'Sample Contact List',
    'A sample contact list for testing'
);

-- Add sample contacts
INSERT INTO contacts (contact_list_id, email, first_name, last_name) 
VALUES 
(1, 'john.doe@example.com', 'John', 'Doe'),
(1, 'jane.smith@example.com', 'Jane', 'Smith'),
(1, 'bob.wilson@example.com', 'Bob', 'Wilson'),
(1, 'alice.brown@example.com', 'Alice', 'Brown'),
(1, 'charlie.davis@example.com', 'Charlie', 'Davis');

-- Add sample data list
INSERT INTO data_lists (name, description, recipients, total_recipients, list_type) 
VALUES (
    'Sample Data List',
    'A sample data list for testing',
    '["test1@example.com", "test2@example.com", "test3@example.com"]',
    3,
    'custom'
);

-- Add sample workspace users
INSERT INTO workspace_users (service_account_id, email, full_name, first_name, last_name, is_active, quota_limit, emails_sent_today) 
VALUES 
(1, 'user1@yourdomain.com', 'User One', 'User', 'One', true, 100, 0),
(1, 'user2@yourdomain.com', 'User Two', 'User', 'Two', true, 100, 0),
(1, 'user3@yourdomain.com', 'User Three', 'User', 'Three', true, 100, 0),
(1, 'user4@yourdomain.com', 'User Four', 'User', 'Four', true, 100, 0),
(1, 'user5@yourdomain.com', 'User Five', 'User', 'Five', true, 100, 0);
