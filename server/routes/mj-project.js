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
          [projectId, file.filename, file.path, file.originalname]
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
router.get('/', async (req, res) => {
  try {
    const [projects] = await pool.execute(`
      SELECT 
        p.id,
        p.project_name,
        p.description,
        p.quantity,
        p.target_price,
        p.status,
        p.created_at,
        u.username,
        u.company_name,
        c.username as created_by_username,
        c.company_name as created_by_company
      FROM mj_project p
      JOIN users u ON p.user_id = u.id
      JOIN users c ON p.created_by = c.id
      ORDER BY p.created_at DESC
    `);
    
    res.json({ projects });
  } catch (error) {
    console.error('MJ 프로젝트 목록 조회 오류:', error);
    res.status(500).json({ error: '프로젝트 목록 조회 중 오류가 발생했습니다.' });
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
        c.username as created_by_username,
        c.company_name as created_by_company
      FROM mj_project p
      JOIN users u ON p.user_id = u.id
      JOIN users c ON p.created_by = c.id
      WHERE p.id = ?
    `, [id]);
    
    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
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
      project: {
        ...project,
        referenceLinks: links,
        images: images
      }
    });
    
  } catch (error) {
    console.error('MJ 프로젝트 상세 조회 오류:', error);
    res.status(500).json({ error: '프로젝트 상세 조회 중 오류가 발생했습니다.' });
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

// MJ 프로젝트 삭제
router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // 이미지 파일 삭제
    const [images] = await connection.execute(
      'SELECT file_path FROM mj_project_images WHERE project_id = ?',
      [id]
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