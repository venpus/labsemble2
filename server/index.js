const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// 설정 파일 로드
const config = require('./config/config');

// 시간대 설정 - config에서 가져온 값 사용
process.env.TZ = config.timezone;

const { 
  testConnection, 
  createUsersTable, 
  createMJProjectTable, 
  createMJProjectReferenceLinksTable, 
  createMJProjectImagesTable,
  migratePaymentColumns,
  runAllMigrations
} = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = config.port;

// 서버 환경 정보 로그 출력
console.log('\n🚀 [Server] ========================================');
console.log('🚀 [Server] 서버 시작');
console.log('🚀 [Server] ========================================');
console.log('🌍 [Server] 환경 정보:');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('  - 감지된 환경:', config.env);
console.log('  - 상용서버 여부:', config.isProduction ? '✅ YES' : '❌ NO');
console.log('  - 개발서버 여부:', config.isDevelopment ? '✅ YES' : '❌ NO');
console.log('  - 포트:', config.port);
console.log('  - 시간대:', config.timezone);
console.log('  - 이미지 URL:', config.imageBaseUrl);
console.log('  - 정적 URL:', config.staticBaseUrl);
console.log('  - 업로드 경로:', config.uploadPath);
console.log('  - CORS Origin:', config.corsOrigin);
console.log('🚀 [Server] ========================================\n');

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 제공 (업로드된 이미지) - CORS 헤더 추가
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static('uploads'));

// 이미지 전용 정적 파일 제공 (프로젝트 등록 이미지)
app.use('/images', express.static(config.uploadPath, {
  setHeaders: (res, filePath) => {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // 캐시 설정
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    // 보안 헤더
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // MIME 타입 설정
    const path = require('path');
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') res.setHeader('Content-Type', 'image/png');
    else if (ext === '.jpg' || ext === '.jpeg') res.setHeader('Content-Type', 'image/jpeg');
    else if (ext === '.gif') res.setHeader('Content-Type', 'image/gif');
    else if (ext === '.webp') res.setHeader('Content-Type', 'image/webp');
    
    // 디버그: 각 이미지 요청 로깅 (개발환경에서만)
    if (config.isDevelopment) {
      console.log(`🖼️ [Static] 이미지 요청: ${filePath} -> ${res.getHeader('Content-Type')}`);
    }
  }
}));

// 디버그: 정적 파일 경로 확인
console.log('📁 [Server] 정적 파일 미들웨어 설정:');
console.log('  - /images 경로:', config.uploadPath);
console.log('  - 절대 경로:', require('path').resolve(config.uploadPath));
console.log('  - 폴더 존재:', require('fs').existsSync(config.uploadPath));

// 폴더 내용 확인
try {
  const fs = require('fs');
  const files = fs.readdirSync(config.uploadPath);
  console.log('  - 폴더 내 파일 개수:', files.length);
  if (files.length > 0) {
    console.log('  - 첫 번째 파일:', files[0]);
    console.log('  - 마지막 파일:', files[files.length - 1]);
    
    // 첫 번째 파일의 전체 경로 확인
    const firstFilePath = require('path').join(config.uploadPath, files[0]);
    console.log('  - 첫 번째 파일 전체 경로:', firstFilePath);
    console.log('  - 첫 번째 파일 존재:', fs.existsSync(firstFilePath));
    
    if (fs.existsSync(firstFilePath)) {
      const stats = fs.statSync(firstFilePath);
      console.log('  - 첫 번째 파일 크기:', stats.size, 'bytes');
      console.log('  - 첫 번째 파일 권한:', stats.mode.toString(8));
    }
  }
} catch (error) {
  console.log('  - 폴더 읽기 오류:', error.message);
}

// 이미지 접근 테스트 엔드포인트 추가
app.get('/api/test/image-access/:filename', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const filename = req.params.filename;
    const imagePath = path.join(config.uploadPath, filename);
    
    console.log(`🧪 [Test] 이미지 접근 테스트: ${filename}`);
    console.log(`  - 요청 파일명: ${filename}`);
    console.log(`  - 전체 경로: ${imagePath}`);
    console.log(`  - 파일 존재: ${fs.existsSync(imagePath)}`);
    
    if (fs.existsSync(imagePath)) {
      const stats = fs.statSync(imagePath);
      console.log(`  - 파일 크기: ${stats.size} bytes`);
      console.log(`  - 파일 권한: ${stats.mode.toString(8)}`);
      
      res.json({
        success: true,
        filename,
        fullPath: imagePath,
        exists: true,
        size: stats.size,
        permissions: stats.mode.toString(8),
        config: {
          uploadPath: config.uploadPath,
          imageBaseUrl: config.imageBaseUrl
        }
      });
    } else {
      res.json({
        success: false,
        filename,
        fullPath: imagePath,
        exists: false,
        error: 'File not found'
      });
    }
  } catch (error) {
    console.error('❌ [Test] 이미지 접근 테스트 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  // X-Forwarded-For 헤더 관련 경고 해결
  skip: (req) => req.headers['x-forwarded-for']
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/users', require('./routes/users'));
app.use('/api/mj-project', require('./routes/mj-project'));
app.use('/api/warehouse', require('./routes/warehouse'));
app.use('/api/packing-list', require('./routes/packing-list'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/logistic-payment', require('./routes/logistic-payment'));
// app.use('/api/products', require('./routes/products'));
// app.use('/api/orders', require('./routes/orders'));
// app.use('/api/quotations', require('./routes/quotations'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Manufacturing API is running' });
});

// Migration status check
app.get('/api/migration/status', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    
    // mj_project 테이블 마이그레이션 상태 확인
    const [projects] = await pool.execute(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN additional_cost_items IS NOT NULL THEN 1 END) as projects_with_additional_costs,
        COUNT(CASE WHEN unit_price IS NOT NULL THEN 1 END) as projects_with_unit_price,
        COUNT(CASE WHEN unit_weight IS NOT NULL THEN 1 END) as projects_with_unit_weight,
        COUNT(CASE WHEN packaging_method IS NOT NULL THEN 1 END) as projects_with_packaging_method,
        COUNT(CASE WHEN box_dimensions IS NOT NULL THEN 1 END) as projects_with_box_dimensions,
        COUNT(CASE WHEN box_weight IS NOT NULL THEN 1 END) as projects_with_box_weight,
        COUNT(CASE WHEN factory_delivery_days IS NOT NULL THEN 1 END) as projects_with_delivery_days,
        COUNT(CASE WHEN actual_order_date IS NOT NULL THEN 1 END) as projects_with_actual_order_date,
        COUNT(CASE WHEN expected_factory_shipping_date IS NOT NULL THEN 1 END) as projects_with_expected_shipping_date,
        COUNT(CASE WHEN actual_factory_shipping_date IS NOT NULL THEN 1 END) as projects_with_actual_shipping_date,
        COUNT(CASE WHEN is_order_completed = 1 THEN 1 END) as projects_with_completed_orders,
        COUNT(CASE WHEN is_factory_shipping_completed = 1 THEN 1 END) as projects_with_completed_factory_shipping,
        COUNT(CASE WHEN entry_quantity IS NOT NULL THEN 1 END) as projects_with_entry_quantity,
        COUNT(CASE WHEN export_quantity IS NOT NULL THEN 1 END) as projects_with_export_quantity,
        COUNT(CASE WHEN remain_quantity IS NOT NULL THEN 1 END) as projects_with_remain_quantity
      FROM mj_project
    `);

    // warehouse stock 필드 마이그레이션 상태 확인
    let warehouseStockStatus = { has_stock_fields: false, total_entries: 0, entries_with_stock: 0 };
    try {
      const [stockColumns] = await pool.execute(
        "SHOW COLUMNS FROM warehouse_entries LIKE 'stock_quantity'"
      );
      warehouseStockStatus.has_stock_fields = stockColumns.length > 0;
      
      if (warehouseStockStatus.has_stock_fields) {
        const [stockData] = await pool.execute(
          "SELECT COUNT(*) as total, COUNT(CASE WHEN stock_quantity IS NOT NULL THEN 1 END) as with_stock FROM warehouse_entries"
        );
        warehouseStockStatus.total_entries = stockData[0].total;
        warehouseStockStatus.entries_with_stock = stockData[0].with_stock;
      }
    } catch (error) {
      console.error('warehouse stock 상태 확인 오류:', error);
    }

    // logistic_payment 테이블 마이그레이션 상태 확인
    let logisticPaymentStatus = { table_exists: false, total_records: 0, table_structure: [] };
    try {
      const [logisticTables] = await pool.execute(
        "SHOW TABLES LIKE 'logistic_payment'"
      );
      logisticPaymentStatus.table_exists = logisticTables.length > 0;
      
      if (logisticPaymentStatus.table_exists) {
        const [logisticData] = await pool.execute(
          "SELECT COUNT(*) as total FROM logistic_payment"
        );
        logisticPaymentStatus.total_records = logisticData[0].total;
        
        const [logisticColumns] = await pool.execute(
          "DESCRIBE logistic_payment"
        );
        logisticPaymentStatus.table_structure = logisticColumns.map(col => ({
          field: col.Field,
          type: col.Type,
          null: col.Null,
          default: col.Default,
          key: col.Key
        }));
      }
    } catch (error) {
      console.error('logistic_payment 상태 확인 오류:', error);
    }

    // mj_project 테이블 quantity 필드 마이그레이션 상태 확인
    let mjProjectQuantityStatus = { has_quantity_fields: false, total_projects: 0, projects_with_quantity: 0 };
    try {
      const [quantityColumns] = await pool.execute("SHOW COLUMNS FROM mj_project LIKE 'entry_quantity'");
      const [quantityData] = await pool.execute("SELECT COUNT(*) as total, COUNT(CASE WHEN entry_quantity IS NOT NULL THEN 1 END) as with_entry_quantity FROM mj_project");
      
      mjProjectQuantityStatus = {
        has_quantity_fields: quantityColumns.length > 0,
        total_projects: quantityData[0].total,
        projects_with_entry_quantity: quantityData[0].with_entry_quantity
      };
    } catch (error) {
      console.log('mj_project 테이블 quantity 필드 확인 중 오류 (무시됨):', error.message);
    }

    const migration_status = {
      // mj_project 테이블 상태
      has_additional_costs: projects[0].projects_with_additional_costs > 0,
      has_unit_price: projects[0].projects_with_unit_price > 0,
      has_unit_weight: projects[0].projects_with_unit_weight > 0,
      has_packaging_method: projects[0].projects_with_packaging_method > 0,
      has_box_dimensions: projects[0].projects_with_box_dimensions > 0,
      has_box_weight: projects[0].projects_with_box_weight > 0,
      has_delivery_days: projects[0].projects_with_delivery_days > 0,
      has_actual_order_date: projects[0].projects_with_actual_order_date > 0,
      has_expected_shipping_date: projects[0].projects_with_expected_shipping_date > 0,
      has_actual_shipping_date: projects[0].projects_with_actual_shipping_date > 0,
      has_completed_orders: projects[0].projects_with_completed_orders > 0,
      has_completed_factory_shipping: projects[0].projects_with_completed_factory_shipping > 0,
      has_entry_quantity: projects[0].projects_with_entry_quantity > 0,
      has_export_quantity: projects[0].projects_with_export_quantity > 0,
      has_remain_quantity: projects[0].projects_with_remain_quantity > 0,
      total_projects: projects[0].total_projects,
      
      // warehouse_entries 테이블 상태
      warehouse_stock: warehouseStockStatus,
      
      // logistic_payment 테이블 상태
      logistic_payment: logisticPaymentStatus,
      
      // mj_project 테이블 quantity 필드 상태
      mj_project_quantity: mjProjectQuantityStatus
    };

    res.json({ migration_status });
  } catch (error) {
    console.error('마이그레이션 상태 확인 오류:', error);
    res.status(500).json({ error: '마이그레이션 상태 확인 중 오류가 발생했습니다.' });
  }
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working correctly!' });
});

// unit_price 데이터 확인용 테스트 엔드포인트
app.get('/api/test/unit-price', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    const [projects] = await pool.execute(`
      SELECT id, project_name, unit_price, target_price, quantity 
      FROM mj_project 
      LIMIT 5
    `);
    
    res.json({ 
      message: 'unit_price 데이터 확인',
      projects: projects,
      total_count: projects.length
    });
  } catch (error) {
    console.error('unit_price 테스트 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// warehouse stock 필드 상태 확인용 테스트 엔드포인트
app.get('/api/test/warehouse-stock', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    
    // warehouse_entries 테이블 구조 확인
    const [columns] = await pool.execute('DESCRIBE warehouse_entries');
    
    // stock 필드가 있는지 확인
    const hasStockField = columns.some(col => col.Field === 'stock');
    const hasOutQuantityField = columns.some(col => col.Field === 'out_quantity');
    
    // 데이터 샘플 확인
    let sampleData = [];
    if (hasStockField) {
      const [data] = await pool.execute(`
        SELECT id, project_id, quantity, stock, out_quantity, entry_date, status
        FROM warehouse_entries 
        LIMIT 5
      `);
      sampleData = data;
    }
    
    res.json({ 
      message: 'warehouse stock 필드 상태 확인',
      table_structure: {
        has_stock_field: hasStockField,
        has_out_quantity_field: hasOutQuantityField,
        total_columns: columns.length
      },
      sample_data: sampleData,
      columns: columns.map(col => ({
        field: col.Field,
        type: col.Type,
        null: col.Null,
        default: col.Default,
        comment: col.Comment
      }))
    });
  } catch (error) {
    console.error('warehouse stock 테스트 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// mj_project quantity 필드 상태 확인용 테스트 엔드포인트
app.get('/api/test/mj-project-quantity', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    
    // mj_project 테이블 구조 확인
    const [columns] = await pool.execute('DESCRIBE mj_project');
    
    // quantity 필드들이 있는지 확인
    const hasEntryQuantityField = columns.some(col => col.Field === 'entry_quantity');
    const hasExportQuantityField = columns.some(col => col.Field === 'export_quantity');
    const hasRemainQuantityField = columns.some(col => col.Field === 'remain_quantity');
    
    // 데이터 샘플 확인
    let sampleData = [];
    if (hasEntryQuantityField && hasExportQuantityField && hasRemainQuantityField) {
      const [data] = await pool.execute(`
        SELECT id, project_name, quantity, entry_quantity, export_quantity, remain_quantity,
               (entry_quantity - export_quantity) as calculated_remaining_quantity
        FROM mj_project 
        LIMIT 5
      `);
      sampleData = data;
    }
    
    res.json({ 
      message: 'mj_project quantity 필드 상태 확인',
      table_structure: {
        has_entry_quantity_field: hasEntryQuantityField,
        has_export_quantity_field: hasExportQuantityField,
        has_remain_quantity_field: hasRemainQuantityField,
        total_columns: columns.length
      },
      sample_data: sampleData,
      columns: columns.filter(col => 
        col.Field === 'entry_quantity' || 
        col.Field === 'export_quantity' || 
        col.Field === 'remain_quantity' || 
        col.Field === 'quantity'
      ).map(col => ({
        field: col.Field,
        type: col.Type,
        null: col.Null,
        default: col.Default,
        comment: col.Comment
      }))
    });
  } catch (error) {
    console.error('mj_project quantity 테스트 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 서버 시작 및 데이터베이스 초기화
const startServer = async () => {
  try {
    // 데이터베이스 연결 테스트
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ 데이터베이스 연결 실패로 서버를 시작할 수 없습니다.');
      process.exit(1);
    }

    // 데이터베이스 마이그레이션은 database.js에서 자동으로 실행됩니다
    console.log('🔧 데이터베이스 마이그레이션 확인 중...');
    console.log('🔄 자동 마이그레이션이 백그라운드에서 실행 중입니다...');
    
    console.log('✅ 데이터베이스 초기화 완료!');
    
    // 서버 시작
    app.listen(PORT, () => {
      console.log('\n🎉 [Server] ========================================');
      console.log('🎉 [Server] 서버 시작 완료!');
      console.log('🎉 [Server] ========================================');
      console.log(`🌐 [Server] 서버 정보:`);
      console.log(`  - URL: http${config.isProduction ? 's' : ''}://${config.isProduction ? 'labsemble.com' : 'localhost'}:${PORT}`);
      console.log(`  - 환경: ${config.env.toUpperCase()}`);
      console.log(`  - 모드: ${config.isProduction ? '🟢 PRODUCTION' : '🟡 DEVELOPMENT'}`);
      console.log(`  - 포트: ${PORT}`);
      console.log(`  - 시간대: ${process.env.TZ}`);
      console.log(`  - 이미지 서비스: ${config.imageBaseUrl}`);
      console.log(`  - 업로드 경로: ${config.uploadPath}`);
      console.log(`📊 [Server] API 엔드포인트:`);
      console.log(`  - 상태 확인: http${config.isProduction ? 's' : ''}://${config.isProduction ? 'labsemble.com' : 'localhost'}:${PORT}/api/health`);
      console.log(`  - 마이그레이션: http${config.isProduction ? 's' : ''}://${config.isProduction ? 'labsemble.com' : 'localhost'}:${PORT}/api/migration/status`);
      console.log(`  - 이미지 디버그: http${config.isProduction ? 's' : ''}://${config.isProduction ? 'labsemble.com' : 'localhost'}:${PORT}/api/warehouse/debug/images`);
      console.log('🎉 [Server] ========================================\n');
      console.log('💡 서버가 완전히 시작되기까지 몇 초 정도 소요될 수 있습니다.');
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
};

// 서버 시작
startServer(); 