import mysql from "mysql2/promise";

export async function connectToDB() {
    const pool = mysql.createPool({
        host: "127.0.0.1",
        user: "root",
        password: "12345",
        database: "my_project_db",
        port: 3306
    });
    return pool;
}