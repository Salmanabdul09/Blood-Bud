USE my_project_db;

CREATE TABLE userInformation (
    client_id INT,
    age INT,
    gender VARCHAR(10),
    diseases TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
);