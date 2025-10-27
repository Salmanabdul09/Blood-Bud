-- Create clients table if it doesn't exist
CREATE TABLE IF NOT EXISTS clients (
    client_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);
-- Create userinformation table if it doesn't exist
CREATE TABLE IF NOT EXISTS userinformation (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    age INT,
    gender VARCHAR(50),
    diseases TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
);
-- Create report table if it doesn't exist
CREATE TABLE IF NOT EXISTS report (
    report_ID INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT,
    results TEXT,
    report_number INT,
    report_date VARCHAR(255),
    report_name TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
);
-- Create reports table if it doesn't exist (legacy - keeping for backward compatibility)
CREATE TABLE IF NOT EXISTS reports (
    report_id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT,
    title VARCHAR(255) NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    analysis_results TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE
    SET NULL
);
-- Insert sample clients (if they don't already exist)
INSERT IGNORE INTO clients (username, password)
VALUES ('admin', 'admin123'),
    ('doctor', 'doctor123'),
    ('patient', 'patient123');
-- Insert sample user information
INSERT IGNORE INTO userinformation (client_id, age, gender, diseases)
VALUES (1, 35, 'Male', 'None'),
    (2, 42, 'Female', 'None'),
    (3, 28, 'Male', 'Diabetes, Hypertension');
-- Create a view to display client information without passwords
CREATE OR REPLACE VIEW client_info AS
SELECT c.client_id,
    c.username,
    u.age,
    u.gender,
    u.diseases
FROM clients c
    LEFT JOIN userinformation u ON c.client_id = u.client_id;