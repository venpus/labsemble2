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
  migratePaymentColumns
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
    const connection = await pool.getConnection();
    
    // additional_cost_items 컬럼 존재 여부 확인
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'labsemble' 
      AND TABLE_NAME = 'mj_project' 
      AND COLUMN_NAME IN ('additional_cost', 'additional_cost_description', 'additional_cost_items')
    `);
    
    // 기존 데이터 확인
    const [projects] = await connection.execute(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN additional_cost > 0 THEN 1 END) as projects_with_legacy_cost,
        COUNT(CASE WHEN additional_cost_items IS NOT NULL THEN 1 END) as projects_with_new_items
      FROM mj_project
    `);
    
    connection.release();
    
    res.json({
      status: 'OK',
      columns: columns,
      data_summary: projects[0],
      migration_status: {
        has_legacy_cost: projects[0].projects_with_legacy_cost > 0,
        has_new_items: projects[0].projects_with_new_items > 0,
        needs_migration: projects[0].projects_with_legacy_cost > 0 && projects[0].projects_with_new_items === 0
      }
    });
  } catch (error) {
    console.error('마이그레이션 상태 확인 오류:', error);
    res.status(500).json({ error: '마이그레이션 상태 확인 실패', message: error.message });
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

app.listen(PORT, async () => {
  console.log(`🚀 Manufacturing server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  
  // 데이터베이스 연결 테스트 및 테이블 생성
  try {
    await testConnection();
    await createUsersTable();
    await createMJProjectTable();
    await createMJProjectReferenceLinksTable();
    await createMJProjectImagesTable();
    await migratePaymentColumns();
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error.message);
  }
}); 