const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
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
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 제공 (업로드된 이미지)
app.use('/uploads', express.static('uploads'));

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
    const [projects] = await pool.execute(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN additional_cost_items IS NOT NULL THEN 1 END) as projects_with_additional_costs,
        COUNT(CASE WHEN unit_weight IS NOT NULL THEN 1 END) as projects_with_unit_weight,
        COUNT(CASE WHEN packaging_method IS NOT NULL THEN 1 END) as projects_with_packaging_method,
        COUNT(CASE WHEN box_dimensions IS NOT NULL THEN 1 END) as projects_with_box_dimensions,
        COUNT(CASE WHEN box_weight IS NOT NULL THEN 1 END) as projects_with_box_weight,
        COUNT(CASE WHEN factory_delivery_days IS NOT NULL THEN 1 END) as projects_with_delivery_days,
        COUNT(CASE WHEN actual_order_date IS NOT NULL THEN 1 END) as projects_with_actual_order_date,
        COUNT(CASE WHEN expected_factory_shipping_date IS NOT NULL THEN 1 END) as projects_with_expected_shipping_date,
        COUNT(CASE WHEN actual_factory_shipping_date IS NOT NULL THEN 1 END) as projects_with_actual_shipping_date,
        COUNT(CASE WHEN is_order_completed = 1 THEN 1 END) as projects_with_completed_orders,
        COUNT(CASE WHEN is_factory_shipping_completed = 1 THEN 1 END) as projects_with_completed_factory_shipping
      FROM mj_project
    `);

    const migration_status = {
      has_additional_costs: projects[0].projects_with_additional_costs > 0,
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
      total_projects: projects[0].total_projects
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
    
    console.log('✅ 데이터베이스 초기화 완료!');
    
    // 서버 시작
    app.listen(PORT, () => {
      console.log(`🚀 Manufacturing API 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📊 마이그레이션 상태 확인: http://localhost:${PORT}/api/migration/status`);
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
};

// 서버 시작
startServer(); 