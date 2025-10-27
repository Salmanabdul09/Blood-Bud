# Database Setup Guide

This guide provides instructions for setting up the MySQL database for the health report analysis application.

## Prerequisites

- MySQL Server 5.7+ installed and running
- Access to a MySQL client or command-line interface
- Database credentials with permissions to create databases and tables

## Database Structure

The application uses the following database structure:

### Clients Table

Stores user authentication information:

| Field     | Type         | Description                                    |
| --------- | ------------ | ---------------------------------------------- |
| client_id | INT          | Primary key, auto-increment                    |
| username  | VARCHAR(255) | Unique username for login                      |
| password  | VARCHAR(255) | User password (should be hashed in production) |

### UserInformation Table

Stores user health information:

| Field     | Type        | Description                  |
| --------- | ----------- | ---------------------------- |
| id        | INT         | Primary key, auto-increment  |
| client_id | INT         | Foreign key to clients table |
| age       | INT         | User's age                   |
| gender    | VARCHAR(50) | User's gender                |
| diseases  | TEXT        | User's medical conditions    |

### Reports Table

Stores uploaded health reports:

| Field            | Type         | Description                    |
| ---------------- | ------------ | ------------------------------ |
| report_id        | INT          | Primary key, auto-increment    |
| client_id        | INT          | Foreign key to clients table   |
| title            | VARCHAR(255) | Report title                   |
| file_url         | VARCHAR(255) | URL to the uploaded file       |
| upload_date      | DATETIME     | Date and time of upload        |
| analysis_results | TEXT         | Results of the report analysis |

## Setup Instructions

1. **Create the database**:

   ```sql
   CREATE DATABASE IF NOT EXISTS health_reports;
   USE health_reports;
   ```

2. **Run the setup script**:

   - Execute the `setup_db.sql` script to create the necessary tables and sample data
   - You can run it using the MySQL command line:
     ```
     mysql -u your_username -p health_reports < setup_db.sql
     ```
   - Or copy and paste the contents into your MySQL client

3. **Configure the connection**:
   - Update the database connection parameters in `next_app/app/lib/db.tsx` if needed
   - Default configuration:
     ```javascript
     const pool = mysql.createPool({
       host: "localhost",
       user: "root",
       password: "password",
       database: "health_reports",
       waitForConnections: true,
       connectionLimit: 10,
       queueLimit: 0,
     });
     ```

## Sample Data

The setup script includes sample data for testing:

### Sample Clients

| Username | Password   | Description           |
| -------- | ---------- | --------------------- |
| admin    | admin123   | Administrator account |
| doctor   | doctor123  | Doctor account        |
| patient  | patient123 | Patient account       |

### Sample User Information

| Client ID | Age | Gender | Diseases               |
| --------- | --- | ------ | ---------------------- |
| 1         | 35  | Male   | None                   |
| 2         | 42  | Female | None                   |
| 3         | 28  | Male   | Diabetes, Hypertension |

## Troubleshooting

- **Connection Issues**: Ensure MySQL server is running and credentials are correct
- **Permission Errors**: Verify the database user has sufficient privileges
- **Table Creation Failures**: Check for syntax errors in the SQL script

## Security Notes

For production environments:

- Use strong, hashed passwords
- Implement proper authentication and authorization
- Consider using environment variables for database credentials
- Enable SSL for database connections
