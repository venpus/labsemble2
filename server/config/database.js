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
  connectTimeout: 60000,
  readTimeout: 60000,
  writeTimeout: 60000,
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
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

// Payment 관련 컬럼 마이그레이션 함수
const migratePaymentColumns = async () => {
  try {
    const connection = await pool.getConnection();
    
    // unit_price 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,2) DEFAULT NULL');
      console.log('✅ unit_price 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // fee_rate 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS fee_rate DECIMAL(5,2) DEFAULT 0');
      console.log('✅ fee_rate 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // payment_status 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS payment_status JSON DEFAULT NULL');
      console.log('✅ payment_status 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // payment_dates 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS payment_dates JSON DEFAULT NULL');
      console.log('✅ payment_dates 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // balance_due_date 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS balance_due_date DATE DEFAULT NULL');
      console.log('✅ balance_due_date 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // advance_due_date 컬럼 추가 (선금 결제 예정일)
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS advance_due_date DATE DEFAULT NULL');
      console.log('✅ advance_due_date 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // payment_due_dates 컬럼 추가 (결제 예정일 JSON - 선금, 잔금 각각)
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS payment_due_dates JSON DEFAULT NULL');
      console.log('✅ payment_due_dates 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // subtotal 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT NULL');
      console.log('✅ subtotal 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // fee 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS fee DECIMAL(15,2) DEFAULT NULL');
      console.log('✅ fee 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // factory_shipping_cost 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS factory_shipping_cost DECIMAL(15,2) DEFAULT NULL');
      console.log('✅ factory_shipping_cost 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // total_amount 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2) DEFAULT NULL');
      console.log('✅ total_amount 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // advance_payment 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS advance_payment DECIMAL(15,2) DEFAULT NULL');
      console.log('✅ advance_payment 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // additional_cost 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS additional_cost DECIMAL(15,2) DEFAULT 0');
      console.log('✅ additional_cost 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // additional_cost_description 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS additional_cost_description TEXT DEFAULT NULL');
      console.log('✅ additional_cost_description 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // additional_cost_items 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS additional_cost_items JSON DEFAULT NULL');
      console.log('✅ additional_cost_items 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // 기존 additional_cost 데이터를 additional_cost_items로 마이그레이션
    try {
      const [projects] = await connection.execute('SELECT id, additional_cost, additional_cost_description FROM mj_project WHERE additional_cost_items IS NULL AND (additional_cost > 0 OR additional_cost_description IS NOT NULL)');
      
      for (const project of projects) {
        const items = [];
        
        // 기존 additional_cost가 있는 경우
        if (project.additional_cost > 0) {
          items.push({
            id: 1,
            cost: project.additional_cost,
            description: project.additional_cost_description || '기존 추가 비용'
          });
        }
        
        // additional_cost_items에 저장
        if (items.length > 0) {
          await connection.execute(
            'UPDATE mj_project SET additional_cost_items = ? WHERE id = ?',
            [JSON.stringify(items), project.id]
          );
          console.log(`✅ 프로젝트 ${project.id}의 추가 비용 데이터 마이그레이션 완료`);
        }
      }
      
      if (projects.length > 0) {
        console.log(`✅ 총 ${projects.length}개 프로젝트의 추가 비용 데이터 마이그레이션 완료`);
      }
    } catch (error) {
      console.error('❌ 추가 비용 데이터 마이그레이션 실패:', error.message);
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ Payment 컬럼 마이그레이션 실패:', error.message);
  }
};

// MJ 프로젝트 테이블 생성 함수
const createMJProjectTable = async () => {
  try {
    const connection = await pool.getConnection();
    
    // 테이블이 존재하는지 확인
    const [tables] = await connection.execute('SHOW TABLES LIKE "mj_project"');
    
    if (tables.length === 0) {
      // 테이블이 없는 경우 새로 생성
      const createTableSQL = `
        CREATE TABLE mj_project (
          id INT AUTO_INCREMENT PRIMARY KEY,
          project_name VARCHAR(200) NOT NULL,
          description TEXT,
          quantity INT NOT NULL,
          target_price DECIMAL(15,2) DEFAULT NULL,
          status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
          user_id INT NOT NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      await connection.execute(createTableSQL);
      console.log('✅ MJ 프로젝트 테이블 생성 완료');
    } else {
      // 테이블이 있는 경우 created_by 필드 추가
      try {
        await connection.execute('ALTER TABLE mj_project ADD COLUMN created_by INT NOT NULL AFTER user_id');
        await connection.execute('ALTER TABLE mj_project ADD CONSTRAINT fk_mj_project_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE');
        console.log('✅ MJ 프로젝트 테이블에 created_by 필드 추가 완료');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('✅ MJ 프로젝트 테이블의 created_by 필드가 이미 존재합니다');
        } else {
          console.error('❌ created_by 필드 추가 실패:', error.message);
        }
      }
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ MJ 프로젝트 테이블 생성/수정 실패:', error.message);
  }
};

// MJ 프로젝트 참고링크 테이블 생성 함수
const createMJProjectReferenceLinksTable = async () => {
  try {
    const connection = await pool.getConnection();
    
    // 테이블 생성
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS mj_project_reference_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES mj_project(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ MJ 프로젝트 참고링크 테이블 생성/확인 완료');
    
    connection.release();
  } catch (error) {
    console.error('❌ MJ 프로젝트 참고링크 테이블 생성 실패:', error.message);
  }
};

// MJ 프로젝트 이미지 테이블 생성 함수
const createMJProjectImagesTable = async () => {
  try {
    const connection = await pool.getConnection();
    
    // 테이블 생성
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS mj_project_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES mj_project(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ MJ 프로젝트 이미지 테이블 생성/확인 완료');
    
    connection.release();
  } catch (error) {
    console.error('❌ MJ 프로젝트 이미지 테이블 생성 실패:', error.message);
  }
};

module.exports = {
  pool,
  testConnection,
  createUsersTable,
  createMJProjectTable,
  createMJProjectReferenceLinksTable,
  createMJProjectImagesTable,
  migratePaymentColumns
};