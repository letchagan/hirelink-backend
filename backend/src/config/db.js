const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const useSqlite = process.env.USE_SQLITE === 'true';
let mysqlPool = null;
let sqliteDb = null;

// Initialize SQLite database
function initSQLite() {
  const dbPath = path.resolve(__dirname, '../../hirescheduler.db');
  sqliteDb = new sqlite3.Database(dbPath);
  return sqliteDb;
}

// Unified query wrapper
async function query(sql, params = []) {
  if (useSqlite) {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  } else {
    const [rows] = await mysqlPool.execute(sql, params);
    return rows;
  }
}

// Unified run wrapper (for INSERT, UPDATE, DELETE)
async function run(sql, params = []) {
  if (useSqlite) {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve({ insertId: this.lastID, affectedRows: this.changes });
      });
    });
  } else {
    const [result] = await mysqlPool.execute(sql, params);
    return { insertId: result.insertId, affectedRows: result.affectedRows };
  }
}

// Unified get single row wrapper
async function get(sql, params = []) {
  if (useSqlite) {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  } else {
    const [rows] = await mysqlPool.execute(sql, params);
    return rows[0] || null;
  }
}

async function connectAndBootstrap() {
  if (useSqlite) {
    console.log('Using SQLite database layer...');
    initSQLite();
    
    // Create tables with SQLite dialect
    await run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone_number VARCHAR(20) NULL,
      password VARCHAR(50) NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'interviewer',
      employee_id VARCHAR(50) NULL
    )`);

    await run(`CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(150) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      deadline DATETIME NOT NULL,
      max_selectable_dates INT DEFAULT 3,
      location VARCHAR(250) NULL,
      status VARCHAR(20) DEFAULT 'active'
    )`);

    await run(`CREATE TABLE IF NOT EXISTS campaign_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      date DATE NOT NULL,
      max_capacity INTEGER NOT NULL,
      location VARCHAR(250) NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )`);

    await run(`CREATE TABLE IF NOT EXISTS campaign_interviewers (
      campaign_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (campaign_id, user_id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    await run(`CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      campaign_id INTEGER NOT NULL,
      campaign_date_id INTEGER NOT NULL,
      slot_type VARCHAR(20) DEFAULT 'offline',
      comments TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_date_id) REFERENCES campaign_dates(id) ON DELETE CASCADE,
      UNIQUE(user_id, campaign_id, campaign_date_id)
    )`);

    await run(`CREATE TABLE IF NOT EXISTS mail_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_email VARCHAR(100) NOT NULL,
      from_email VARCHAR(100) NOT NULL,
      subject VARCHAR(250) NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('SQLite tables initialized successfully.');
  } else {
    console.log('Connecting to MySQL database...');
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hirescheduler',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Create tables with MySQL dialect
    await run(`CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone_number VARCHAR(20) NULL,
      password VARCHAR(50) NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'interviewer',
      employee_id VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS campaigns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      deadline DATETIME NOT NULL,
      max_selectable_dates INT DEFAULT 3,
      location VARCHAR(250) NULL,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS campaign_dates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      campaign_id INT NOT NULL,
      date DATE NOT NULL,
      max_capacity INT NOT NULL,
      location VARCHAR(250) NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await run(`CREATE TABLE IF NOT EXISTS campaign_interviewers (
      campaign_id INT NOT NULL,
      user_id INT NOT NULL,
      PRIMARY KEY (campaign_id, user_id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await run(`CREATE TABLE IF NOT EXISTS availability (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      campaign_id INT NOT NULL,
      campaign_date_id INT NOT NULL,
      slot_type VARCHAR(20) DEFAULT 'offline',
      comments TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_date_id) REFERENCES campaign_dates(id) ON DELETE CASCADE,
      UNIQUE(user_id, campaign_id, campaign_date_id)
    )`);

    await run(`CREATE TABLE IF NOT EXISTS mail_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      to_email VARCHAR(100) NOT NULL,
      from_email VARCHAR(100) NOT NULL,
      subject VARCHAR(250) NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('MySQL database connected and tables initialized.');
  }

  // Insert default administrator and default interviewers for easy testing if users table is empty
  const usersCount = await get(`SELECT COUNT(*) as cnt FROM users`);
  if (usersCount.cnt === 0) {
    console.log('Seeding initial system users...');
    // Seed HR Admin with password
    await run(
      `INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)`,
      ['hr@hirescheduler.com', 'HR Administrator', 'hr123', 'admin']
    );

    // Seed some Interviewers matching your requested report details
    const interviewers = [
      { email: 'john@gmail.com', name: 'John', phone_number: '9678845155' },
      { email: 'david@gmail.com', name: 'David', phone_number: '7861684844' },
      { email: 'alex@hirescheduler.com', name: 'Alex Johnson', phone_number: '9988776655' },
      { email: 'kumar@hirescheduler.com', name: 'Kumar Patel', phone_number: '9876543210' }
    ];

    for (const intv of interviewers) {
      await run(
        `INSERT INTO users (email, name, phone_number, role) VALUES (?, ?, ?, ?)`,
        [intv.email, intv.name, intv.phone_number, 'interviewer']
      );
    }
    console.log('Default users successfully seeded.');
  }

  // Always ensure Letchagan HR admin exists
  const existingKavi = await get(`SELECT * FROM users WHERE email = ?`, ['letchagan.a.cse26@psvpec.in']);
  if (!existingKavi) {
    await run(
      `INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)`,
      ['letchagan.a.cse26@psvpec.in', 'Letchagan', 'Kavi1234#', 'admin']
    );
    console.log('Dummy HR Admin Letchagan seeded.');
  }
}

module.exports = {
  query,
  run,
  get,
  connectAndBootstrap
};
