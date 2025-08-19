const mysql = require('mysql2/promise');

// 데이터베이스 연결 풀 생성
const pool = mysql.createPool({
  host: 'labsemble.com',
  user: 'venpus',
  password: 'TianXian007!',
  database: 'labsemble',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// 연결 테스트 함수
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MariaDB 연결 성공!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MariaDB 연결 실패:', error.message);
    return false;
  }
};

// 사용자 테이블 생성 및 마이그레이션 함수
const createUsersTable = async () => {
  try {
    const connection = await pool.getConnection();
    
    // 테이블 생성
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        contact_person VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        company_name VARCHAR(200) DEFAULT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        partner_name VARCHAR(200) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ 사용자 테이블 생성/확인 완료');
    
    // 기존 테이블에 새 필드 추가 (마이그레이션)
    try {
      await connection.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE');
      console.log('✅ is_admin 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    try {
      await connection.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_name VARCHAR(200) DEFAULT NULL');
      console.log('✅ partner_name 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }

    // 회사명 필드를 NULL 허용으로 변경
    try {
      await connection.execute('ALTER TABLE users MODIFY COLUMN company_name VARCHAR(200) DEFAULT NULL');
      console.log('✅ company_name 필드 NULL 허용으로 변경 완료');
    } catch (error) {
      // 이미 변경된 경우 무시
    }

    // role 필드 삭제
    try {
      await connection.execute('ALTER TABLE users DROP COLUMN role');
      console.log('✅ role 필드 삭제 완료');
    } catch (error) {
      // 이미 삭제된 경우 무시
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ 사용자 테이블 생성/마이그레이션 실패:', error.message);
  }
};

module.exports = {
  pool,
  testConnection,
  createUsersTable
}; 