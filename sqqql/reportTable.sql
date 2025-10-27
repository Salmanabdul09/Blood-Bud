USE my_project_db;

CREATE TABLE Report (
    client_id INT,
    results TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
);