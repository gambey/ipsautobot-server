-- ips_autobot_svr schema (MySQL 8.0) — multi-app: zhiling / yifei

CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  admin_type TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '0=超级管理员 1=普通管理员',
  phone VARCHAR(32) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) DEFAULT NULL COMMENT '用户名',
  phone VARCHAR(32) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  login_ip VARCHAR(45) DEFAULT NULL,
  last_login_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  member_type_zhiling TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '智灵 0普通 1充值',
  member_type_yifei TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '翼飞',
  member_expire_at_zhiling DATETIME DEFAULT NULL,
  member_expire_at_yifei DATETIME DEFAULT NULL,
  score_zhiling INT NOT NULL DEFAULT 0 COMMENT '智灵积分',
  score_yifei INT NOT NULL DEFAULT 0 COMMENT '翼飞积分',
  `30d_score_zhiling` INT NOT NULL DEFAULT 300,
  `90d_score_zhiling` INT NOT NULL DEFAULT 900,
  `180d_score_zhiling` INT NOT NULL DEFAULT 1800,
  `365d_score_zhiling` INT NOT NULL DEFAULT 3600,
  `30d_score_yifei` INT NOT NULL DEFAULT 300,
  `90d_score_yifei` INT NOT NULL DEFAULT 900,
  `180d_score_yifei` INT NOT NULL DEFAULT 1800,
  `365d_score_yifei` INT NOT NULL DEFAULT 3600,
  mac_addr_zhiling VARCHAR(32) DEFAULT NULL COMMENT '智灵网卡 MAC',
  mac_addr_yifei VARCHAR(32) DEFAULT NULL COMMENT '翼飞网卡 MAC',
  status TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '0=禁用 1=正常',
  UNIQUE KEY uq_users_mac_zhiling (mac_addr_zhiling),
  UNIQUE KEY uq_users_mac_yifei (mac_addr_yifei)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recharge_records_zhiling (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  username VARCHAR(64) NOT NULL,
  recharge_date DATETIME NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  result TINYINT UNSIGNED NOT NULL COMMENT '0=失败 1=成功',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recharge_records_yifei (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  username VARCHAR(64) NOT NULL,
  recharge_date DATETIME NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  result TINYINT UNSIGNED NOT NULL COMMENT '0=失败 1=成功',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_login_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id INT UNSIGNED DEFAULT NULL,
  username VARCHAR(64) NOT NULL,
  ip VARCHAR(45) DEFAULT NULL,
  success TINYINT UNSIGNED NOT NULL COMMENT '0=fail 1=success',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_id (admin_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_login_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED DEFAULT NULL,
  phone VARCHAR(32) NOT NULL,
  ip VARCHAR(45) DEFAULT NULL,
  success TINYINT UNSIGNED NOT NULL COMMENT '0=fail 1=success',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS score_record (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  client_app VARCHAR(16) NOT NULL DEFAULT 'zhiling' COMMENT 'zhiling|yifei',
  username VARCHAR(64) DEFAULT NULL,
  phone VARCHAR(32) NOT NULL,
  score_before INT NOT NULL,
  score_after INT NOT NULL,
  score_change INT NOT NULL,
  change_type TINYINT UNSIGNED NOT NULL COMMENT '0=增加 1=减少',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_phone (phone),
  INDEX idx_change_type (change_type),
  INDEX idx_created_at (created_at),
  INDEX idx_client_app (client_app),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
