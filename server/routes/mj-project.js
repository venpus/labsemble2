const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 이미지 업로드를 위한 multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/project/mj/registImage';
    
    // 폴더가 없으면 생성
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // 파일명 중복 방지를 위해 타임스탬프 추가
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'mj-project-' + uniqueSuffix + ext);
  }
});

// 제품 이미지 업로드를 위한 multer 설정
const realImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/project/mj/realImage';
    
    // 폴더가 없으면 생성
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // 파일명 중복 방지를 위해 타임스탬프 추가
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'mj-real-image-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 제한
  },
  fileFilter: function (req, file, cb) {
    // 이미지 파일만 허용
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  }
});

const realImageUpload = multer({ 
  storage: realImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 제한
  },
  fileFilter: function (req, file, cb) {
    // 이미지와 비디오 파일 허용
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 또는 비디오 파일만 업로드 가능합니다.'), false);
    }
  }
});

// MJ 프로젝트 등록
router.post('/register', authMiddleware, upload.array('images', 10), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { projectName, description, quantity, targetPrice, referenceLinks, selectedUserId } = req.body;
    
    // admin 사용자의 경우 선택된 사용자 ID 사용, 그렇지 않으면 현재 로그인한 사용자 ID 사용
    let projectOwnerId = req.user?.userId;  // 프로젝트 소유자 ID
    let projectCreatorId = req.user?.userId; // 프로젝트 등록자 ID
    let isAdminUser = req.user?.isAdmin;
    
    // JWT에서 admin 권한이 제대로 전달되지 않은 경우, 데이터베이스에서 직접 확인
    if (isAdminUser === undefined || isAdminUser === null) {
      try {
        const [adminCheck] = await connection.execute(
          'SELECT is_admin FROM users WHERE id = ?',
          [req.user.userId]
        );
        if (adminCheck.length > 0) {
          isAdminUser = adminCheck[0].is_admin;
        }
      } catch (error) {
        console.error('admin 권한 확인 오류:', error);
        isAdminUser = false;
      }
    }
    
    if (selectedUserId && isAdminUser) {
      projectOwnerId = parseInt(selectedUserId);  // 문자열을 숫자로 변환
      projectCreatorId = req.user.userId; // 현재 로그인한 admin
    }
    
    // referenceLinks가 문자열인 경우 JSON으로 파싱
    let parsedReferenceLinks = [];
    if (referenceLinks) {
      try {
        parsedReferenceLinks = typeof referenceLinks === 'string' 
          ? JSON.parse(referenceLinks) 
          : referenceLinks;
      } catch (error) {
        console.error('참고링크 파싱 오류:', error);
        parsedReferenceLinks = [];
      }
    }
    
    // 프로젝트 등록 데이터 준비 완료 // JWT에서 사용자 ID 추출 (인증 미들웨어 필요)
    
    if (!projectOwnerId) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    // 필수 필드 검증
    if (!projectName || !quantity) {
      return res.status(400).json({ error: '프로젝트명과 수량은 필수입니다.' });
    }
    
    // 1. MJ 프로젝트 생성
    const [projectResult] = await connection.execute(
      'INSERT INTO mj_project (project_name, description, quantity, target_price, user_id, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [projectName, description || null, quantity, targetPrice || null, projectOwnerId, projectCreatorId]
    );
    
    const projectId = projectResult.insertId;
    
    // 2. 참고링크 저장
    if (parsedReferenceLinks && parsedReferenceLinks.length > 0) {
      for (const link of parsedReferenceLinks) {
        await connection.execute(
          'INSERT INTO mj_project_reference_links (project_id, url) VALUES (?, ?)',
          [projectId, link.url]
        );
      }
    }
    
    // 3. 이미지 저장
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await connection.execute(
          'INSERT INTO mj_project_images (project_id, file_name, file_path, original_name) VALUES (?, ?, ?, ?)',
          [projectId, file.filename, file.filename, file.originalname]
        );
      }
    }
    
    await connection.commit();
    
    res.status(201).json({
      message: 'MJ 프로젝트가 성공적으로 등록되었습니다.',
      projectId: projectId
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('MJ 프로젝트 등록 오류:', error);
    res.status(500).json({ error: '프로젝트 등록 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// MJ 프로젝트 목록 조회
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdmin = req.user.isAdmin;
    
    let sql = `
      SELECT 
        p.id,
        p.project_name,
        p.description,
        p.quantity,
        p.target_price,
        p.status,
        p.user_id,
        p.created_by,
        p.created_at,
        u.username,
        u.company_name,
        c.username as created_by_username,
        c.company_name as created_by_company,
        (SELECT file_path FROM mj_project_images WHERE project_id = p.id ORDER BY id ASC LIMIT 1) as representative_image
      FROM mj_project p
      JOIN users u ON p.user_id = u.id
      JOIN users c ON p.created_by = c.id
    `;
    
    let params = [];
    
    // Admin이 아닌 경우 사용자별 필터링
    if (!isAdmin) {
      // 일반 사용자는 user_id로만 검색 (자신이 소유한 프로젝트만 표시)
      sql += ' WHERE p.user_id = ?';
      params.push(userId);
    }
    
    sql += ' ORDER BY p.created_at DESC';
    
    const [projects] = await pool.execute(sql, params);
    
    res.json({ success: true, projects });
  } catch (error) {
    console.error('MJ 프로젝트 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '프로젝트 목록 조회 중 오류가 발생했습니다.' });
  }
 });

// MJ 프로젝트 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 프로젝트 기본 정보
    const [projects] = await pool.execute(`
      SELECT 
        p.*,
        u.username,
        u.company_name,
        u.phone,
        u.email,
        u.contact_person,
        u.partner_name,
        c.username as created_by_username,
        c.company_name as created_by_company
      FROM mj_project p
      JOIN users u ON p.user_id = u.id
      JOIN users c ON p.created_by = c.id
      WHERE p.id = ?
    `, [id]);
    
    if (projects.length === 0) {
      return res.status(404).json({ success: false, error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    const project = projects[0];
    
    // 참고링크 조회
    const [links] = await pool.execute(
      'SELECT * FROM mj_project_reference_links WHERE project_id = ?',
      [id]
    );
    
    // 이미지 조회
    const [images] = await pool.execute(
      'SELECT * FROM mj_project_images WHERE project_id = ?',
      [id]
    );
    
    res.json({
      success: true,
      project: {
        ...project,
        referenceLinks: links,
        images: images
      }
    });
    
  } catch (error) {
    console.error('MJ 프로젝트 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '프로젝트 상세 조회 중 오류가 발생했습니다.' });
  }
});

// MJ 프로젝트 상태 업데이트
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
    }
    
    await pool.execute(
      'UPDATE mj_project SET status = ? WHERE id = ?',
      [status, id]
    );
    
    res.json({ message: '프로젝트 상태가 업데이트되었습니다.' });
    
  } catch (error) {
    console.error('MJ 프로젝트 상태 업데이트 오류:', error);
    res.status(500).json({ error: '프로젝트 상태 업데이트 중 오류가 발생했습니다.' });
  }
});

// MJ 프로젝트 정보 업데이트
router.patch('/:id', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const projectId = req.params.id;
    const updateData = req.body;
    
    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (프로젝트 소유자 또는 admin만 수정 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin && project[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: '프로젝트를 수정할 권한이 없습니다.' });
    }
    
    // 업데이트 가능한 필드들
    const allowedFields = [
      'unit_weight', 'packaging_method', 'box_dimensions', 'box_weight',
      'project_name', 'description', 'quantity', 'target_price', 'reference_links'
    ];
    
    // 허용된 필드만 필터링
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });
    
    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({ error: '업데이트할 수 있는 필드가 없습니다.' });
    }
    
    // SQL 쿼리 동적 생성
    const setClause = Object.keys(filteredData).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(filteredData), projectId];
    
    await connection.execute(
      `UPDATE mj_project SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      values
    );
    
    res.json({ message: '프로젝트 정보가 성공적으로 업데이트되었습니다.' });
    
  } catch (error) {
    console.error('MJ 프로젝트 정보 업데이트 오류:', error);
    res.status(500).json({ error: '프로젝트 정보 업데이트 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// 제품 이미지/비디오 업로드
router.post('/:id/real-images', authMiddleware, realImageUpload.array('files', 10), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const projectId = req.params.id;
    
    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (프로젝트 소유자 또는 admin만 수정 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin && project[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: '프로젝트를 수정할 권한이 없습니다.' });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '업로드할 파일이 없습니다.' });
    }
    
    // 업로드된 파일 정보 수집
    const uploadedFiles = req.files.map(file => ({
      original_name: file.originalname,
      file_path: file.path,
      file_size: file.size,
      mime_type: file.mimetype,
      project_id: projectId
    }));
    
    // 데이터베이스에 파일 정보 저장
    for (const fileInfo of uploadedFiles) {
      await connection.execute(
        'INSERT INTO mj_project_real_images (original_name, file_path, file_size, mime_type, project_id) VALUES (?, ?, ?, ?, ?)',
        [fileInfo.original_name, fileInfo.file_path, fileInfo.file_size, fileInfo.mime_type, fileInfo.project_id]
      );
    }
    
    res.json({ 
      message: `${uploadedFiles.length}개 파일이 성공적으로 업로드되었습니다.`,
      files: uploadedFiles
    });
    
  } catch (error) {
    console.error('제품 이미지 업로드 오류:', error);
    res.status(500).json({ error: '제품 이미지 업로드 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// 제품 이미지/비디오 조회
router.get('/:id/real-images', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const projectId = req.params.id;
    
    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (프로젝트 소유자 또는 admin만 조회 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin && project[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: '프로젝트를 조회할 권한이 없습니다.' });
    }
    
    // 프로젝트의 모든 이미지/비디오 조회
    const [files] = await connection.execute(
      'SELECT * FROM mj_project_real_images WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );
    
    res.json({ files });
    
  } catch (error) {
    console.error('제품 이미지 조회 오류:', error);
    res.status(500).json({ error: '제품 이미지 조회 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// 제품 이미지/비디오 삭제
router.delete('/:id/real-images/:imageId', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id: projectId, imageId } = req.params;
    
    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (프로젝트 소유자 또는 admin만 수정 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin && project[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: '프로젝트를 수정할 권한이 없습니다.' });
    }
    
    // 이미지 정보 조회
    const [image] = await connection.execute(
      'SELECT * FROM mj_project_real_images WHERE id = ? AND project_id = ?',
      [imageId, projectId]
    );
    
    if (image.length === 0) {
      return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
    }
    
    // 파일 시스템에서 파일 삭제
    if (fs.existsSync(image[0].file_path)) {
      fs.unlinkSync(image[0].file_path);
    }
    
    // 데이터베이스에서 이미지 정보 삭제
    await connection.execute(
      'DELETE FROM mj_project_real_images WHERE id = ?',
      [imageId]
    );
    
    res.json({ message: '이미지가 성공적으로 삭제되었습니다.' });
    
  } catch (error) {
    console.error('제품 이미지 삭제 오류:', error);
    res.status(500).json({ error: '제품 이미지 삭제 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// Payment 데이터 저장
router.post('/:id/payment', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const projectId = req.params.id;
    const {
      unitPrice,
      selectedFeeRate,
      paymentStatus,
      paymentDates,
      balanceDueDate,
      advanceDueDate,
      paymentDueDates,
      factoryShippingCost,
      subtotal,
      fee,
      totalAmount,
      advancePayment,
      additionalCostItems
    } = req.body;

    // 숫자 타입으로 변환
    const numericUnitPrice = Number(unitPrice) || 0;
    const numericSelectedFeeRate = Number(selectedFeeRate) || 0;
    const numericFactoryShippingCost = Number(factoryShippingCost) || 0;
    const numericSubtotal = Number(subtotal) || 0;
    const numericFee = Number(fee) || 0;
    const numericTotalAmount = Number(totalAmount) || 0;
    const numericAdvancePayment = Number(advancePayment) || 0;
    
    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (프로젝트 소유자 또는 admin만 수정 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin && project[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: '프로젝트를 수정할 권한이 없습니다.' });
    }
    
    // 날짜 형식 처리 함수
    const processDate = (dateValue) => {
      if (!dateValue || dateValue === '') {
        return null;
      }
      
      // ISO 문자열인 경우 YYYY-MM-DD 형식으로 변환
      if (typeof dateValue === 'string' && dateValue.includes('T')) {
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            return null; // 유효하지 않은 날짜
          }
          return date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        } catch (error) {
          console.error('날짜 변환 오류:', error);
          return null;
        }
      }
      
      // 이미 YYYY-MM-DD 형식인 경우 그대로 사용
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      
      return null;
    };
    
    // balance_due_date 처리
    const processedBalanceDueDate = processDate(balanceDueDate);
    
    // advance_due_date 처리
    const processedAdvanceDueDate = processDate(advanceDueDate);
    
    // Payment 데이터 업데이트
    await connection.execute(
      `UPDATE mj_project SET 
        unit_price = ?,
        fee_rate = ?,
        payment_status = ?,
        payment_dates = ?,
        balance_due_date = ?,
        advance_due_date = ?,
        payment_due_dates = ?,
        factory_shipping_cost = ?,
        subtotal = ?,
        fee = ?,
        total_amount = ?,
        advance_payment = ?,
        additional_cost_items = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [
        numericUnitPrice,
        numericSelectedFeeRate,
        JSON.stringify(paymentStatus),
        JSON.stringify(paymentDates),
        processedBalanceDueDate,
        processedAdvanceDueDate,
        JSON.stringify(paymentDueDates),
        numericFactoryShippingCost,
        numericSubtotal,
        numericFee,
        numericTotalAmount,
        numericAdvancePayment,
        additionalCostItems,
        projectId
      ]
    );
    
    // additional_cost_items가 있는 경우 기존 additional_cost 필드도 동기화 (하위 호환성)
    if (additionalCostItems) {
      try {
        const items = JSON.parse(additionalCostItems);
        if (items && items.length > 0) {
          const totalAdditionalCost = items.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
          const firstItemDescription = items[0]?.description || '';
          
          await connection.execute(
            'UPDATE mj_project SET additional_cost = ?, additional_cost_description = ? WHERE id = ?',
            [totalAdditionalCost, firstItemDescription, projectId]
          );
        }
      } catch (error) {
        console.error('추가 비용 항목 동기화 실패:', error);
      }
    }
    
    res.json({ message: 'Payment 데이터가 성공적으로 저장되었습니다.' });
    
  } catch (error) {
    console.error('Payment 데이터 저장 오류:', error);
    res.status(500).json({ error: 'Payment 데이터 저장 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// MJ 프로젝트 삭제
router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // 이미지 파일 삭제
    const [images] = await connection.execute(
      'SELECT file_path FROM mj_project_images WHERE project_id = ?',
      [req.params.id]
    );
    
    for (const image of images) {
      if (fs.existsSync(image.file_path)) {
        fs.unlinkSync(image.file_path);
      }
    }
    
    // 프로젝트 삭제 (CASCADE로 관련 데이터도 자동 삭제)
    await connection.execute('DELETE FROM mj_project WHERE id = ?', [id]);
    
    await connection.commit();
    
    res.json({ message: '프로젝트가 삭제되었습니다.' });
    
  } catch (error) {
    await connection.rollback();
    console.error('MJ 프로젝트 삭제 오류:', error);
    res.status(500).json({ error: '프로젝트 삭제 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

module.exports = router; 