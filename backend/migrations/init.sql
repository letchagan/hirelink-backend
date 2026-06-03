-- Database initialization schema for HireScheduler

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id VARCHAR(50) UNIQUE,
  email VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'interviewer' -- 'admin', 'interviewer'
);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(150) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  deadline DATETIME NOT NULL,
  max_selectable_dates INT DEFAULT 3,
  status VARCHAR(20) DEFAULT 'active' -- 'active', 'closed'
);

CREATE TABLE IF NOT EXISTS campaign_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  date DATE NOT NULL,
  max_capacity INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  campaign_id INTEGER NOT NULL,
  campaign_date_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_date_id) REFERENCES campaign_dates(id) ON DELETE CASCADE,
  UNIQUE(user_id, campaign_id, campaign_date_id)
);

CREATE TABLE IF NOT EXISTS otps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50) NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL
);
