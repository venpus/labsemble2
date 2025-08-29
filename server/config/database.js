const mysql = require('mysql2/promise');

// 데이터베이스 연결 설정
const dbConfig = {
  host: process.env.DB_HOST || 'labsemble.com',
  user: process.env.DB_USER || 'venpus',
  password: process.env.DB_PASSWORD || 'TianXian007!',
  database: process.env.DB_NAME || 'labsemble',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+09:00', // 한국 시간대 (KST)
  charset: 'utf8mb4',
  // 추가 시간대 설정
  dateStrings: true, // 날짜를 문자열로 반환
  supportBigNumbers: true,
  bigNumberStrings: true
};

// 연결 풀 생성
const pool = mysql.createPool(dbConfig);

// factory_shipping_status 필드 마이그레이션 함수
async function migrateFactoryShippingStatus() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 factory_shipping_status 필드 마이그레이션 시작...');
    
    // factory_shipping_status 필드 존재 여부 확인
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM mj_project LIKE 'factory_shipping_status'"
    );

    if (columns.length === 0) {
      // 필드가 없으면 추가
      await connection.execute(`
        ALTER TABLE mj_project 
        ADD COLUMN factory_shipping_status VARCHAR(50) DEFAULT '출고 대기' 
        COMMENT '공장 출고 상태 (정시출고, 조기출고, 출고연기, 출고 대기)'
      `);
      
      console.log('✅ factory_shipping_status 필드 추가 완료');
      
      // 기존 데이터에 대한 기본값 설정
      await connection.execute(`
        UPDATE mj_project 
        SET factory_shipping_status = '출고 대기' 
        WHERE factory_shipping_status IS NULL
      `);
      
      console.log('✅ 기존 데이터 기본값 설정 완료');
      
      return { success: true, added: true, message: 'factory_shipping_status 필드 마이그레이션이 완료되었습니다.' };
    } else {
      console.log('ℹ️ factory_shipping_status 필드가 이미 존재합니다.');
      return { success: true, added: false, message: 'factory_shipping_status 필드가 이미 존재합니다.' };
    }
    
  } catch (error) {
    console.error('❌ factory_shipping_status 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  } finally {
    connection.release();
  }
}

// warehouse 관련 테이블 마이그레이션 함수
async function migrateWarehouseTables() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 warehouse 관련 테이블 마이그레이션 시작...');
    
    // warehouse_entries 테이블 존재 여부 확인
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'warehouse_entries'"
    );

    if (tables.length === 0) {
      // warehouse_entries 테이블 생성
      await connection.execute(`
        CREATE TABLE warehouse_entries (
          id INT PRIMARY KEY AUTO_INCREMENT,
          project_id INT NOT NULL,
          entry_date DATE NOT NULL COMMENT '입고 날짜',
          shipping_date DATE NOT NULL COMMENT '출고 날짜',
          quantity INT NOT NULL COMMENT '입고 수량',
          status ENUM('입고중', '입고완료') DEFAULT '입고중' COMMENT '입고 상태',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_project_id (project_id),
          INDEX idx_entry_date (entry_date),
          INDEX idx_shipping_date (shipping_date),
          INDEX idx_status (status),
          
          FOREIGN KEY (project_id) REFERENCES mj_project(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='입고 기록 테이블'
      `);
      
      console.log('✅ warehouse_entries 테이블 생성 완료');
    } else {
      console.log('ℹ️ warehouse_entries 테이블이 이미 존재합니다.');
    }

    // warehouse_images 테이블 존재 여부 확인
    const [imageTables] = await connection.execute(
      "SHOW TABLES LIKE 'warehouse_images'"
    );

    if (imageTables.length === 0) {
      // warehouse_images 테이블 생성
      await connection.execute(`
        CREATE TABLE warehouse_images (
          id INT PRIMARY KEY AUTO_INCREMENT,
          project_id INT NOT NULL COMMENT '프로젝트 ID',
          entry_id INT NOT NULL COMMENT '입고 기록 ID',
          original_filename VARCHAR(255) NOT NULL COMMENT '원본 파일명',
          stored_filename VARCHAR(255) NOT NULL COMMENT '저장된 파일명',
          file_path VARCHAR(500) NOT NULL COMMENT '파일 경로',
          file_size INT NOT NULL COMMENT '파일 크기 (bytes)',
          mime_type VARCHAR(100) NOT NULL COMMENT 'MIME 타입',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_project_id (project_id),
          INDEX idx_entry_id (entry_id),
          INDEX idx_created_at (created_at),
          
          FOREIGN KEY (project_id) REFERENCES mj_project(id) ON DELETE CASCADE,
          FOREIGN KEY (entry_id) REFERENCES warehouse_entries(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='입고 이미지 테이블'
      `);
      
      console.log('✅ warehouse_images 테이블 생성 완료');
    } else {
      console.log('ℹ️ warehouse_images 테이블이 이미 존재합니다.');
    }

    // 기존 테이블에 누락된 컬럼이 있는지 확인하고 추가
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM warehouse_entries LIKE 'status'"
    );

    if (columns.length === 0) {
      // status 컬럼 추가
      await connection.execute(`
        ALTER TABLE warehouse_entries 
        ADD COLUMN status ENUM('입고중', '입고완료') DEFAULT '입고중' 
        COMMENT '입고 상태'
      `);
      
      console.log('✅ warehouse_entries 테이블에 status 컬럼 추가 완료');
    }

    return { success: true, message: 'warehouse 관련 테이블 마이그레이션이 완료되었습니다.' };
    
  } catch (error) {
    console.error('❌ warehouse 테이블 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  } finally {
    connection.release();
  }
}

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
    
    // supplier_name 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(200) DEFAULT NULL COMMENT "공급자 이름"');
      console.log('✅ supplier_name 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    connection.release();
    return { success: true, message: 'Payment 관련 컬럼 마이그레이션이 완료되었습니다.' };
  } catch (error) {
    console.error('❌ Payment 컬럼 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  }
};

// 데이터베이스 연결 테스트 및 마이그레이션 실행
async function initializeDatabase() {
  try {
    console.log('🔄 데이터베이스 연결 테스트 중...');
    
    // 연결 테스트
    const connection = await pool.getConnection();
    console.log('✅ 데이터베이스 연결 성공');
    connection.release();
    
    // factory_shipping_status 마이그레이션 실행
    console.log('🔄 factory_shipping_status 마이그레이션 시작...');
    const factoryMigrationResult = await migrateFactoryShippingStatus();
    if (factoryMigrationResult.success) {
      console.log('✅ factory_shipping_status 마이그레이션 완료:', factoryMigrationResult.message);
    } else {
      console.error('❌ factory_shipping_status 마이그레이션 실패:', factoryMigrationResult.error);
    }
    
    // warehouse 테이블 마이그레이션 실행
    console.log('🔄 warehouse 테이블 마이그레이션 시작...');
    const warehouseMigrationResult = await migrateWarehouseTables();
    if (warehouseMigrationResult.success) {
      console.log('✅ warehouse 테이블 마이그레이션 완료:', warehouseMigrationResult.message);
    } else {
      console.error('❌ warehouse 테이블 마이그레이션 실패:', warehouseMigrationResult.error);
    }
    
    // Payment 관련 컬럼 마이그레이션 실행
    console.log('🔄 Payment 관련 컬럼 마이그레이션 시작...');
    const paymentMigrationResult = await migratePaymentColumns();
    if (paymentMigrationResult.success) {
      console.log('✅ Payment 관련 컬럼 마이그레이션 완료:', paymentMigrationResult.message);
    } else {
      console.error('❌ Payment 관련 컬럼 마이그레이션 실패:', paymentMigrationResult.error);
    }
    
    console.log('🎉 모든 마이그레이션이 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 오류:', error);
  }
}

// 서버 시작 시 자동으로 마이그레이션 실행
initializeDatabase();

// 연결 테스트 함수
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MariaDB 연결 성공!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MariaDB 연결 실패:', error.message);
    
    // 연결 오류 상세 정보 로깅
    if (error.code === 'ECONNRESET') {
      console.error('🔌 연결이 재설정되었습니다. 재연결을 시도합니다.');
    } else if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('🔌 연결이 끊어졌습니다. 재연결을 시도합니다.');
    } else if (error.code === 'ER_CON_COUNT_ERROR') {
      console.error('🔌 연결 수가 제한을 초과했습니다.');
    }
    
    return false;
  }
};

module.exports = {
  pool,
  testConnection
}; 