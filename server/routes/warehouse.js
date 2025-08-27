const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');

// 입고기록 CRUD API
// 입고기록 생성
router.post('/entries', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId, entryDate, shippingDate, quantity } = req.body;
    
    if (!projectId || !entryDate || !shippingDate || !quantity) {
      return res.status(400).json({ 
        error: '필수 필드가 누락되었습니다. (projectId, entryDate, shippingDate, quantity)' 
      });
    }
    

    
    // 입고기록 생성
    const [result] = await connection.execute(`
      INSERT INTO warehouse_entries 
      (project_id, entry_date, shipping_date, quantity, status)
      VALUES (?, ?, ?, ?, '입고중')
    `, [projectId, entryDate, shippingDate, quantity]);
    
    const entryId = result.insertId;
    
    // 생성된 입고기록 조회
    const [entries] = await connection.execute(`
      SELECT * FROM warehouse_entries WHERE id = ?
    `, [entryId]);
    
    if (entries.length === 0) {
      throw new Error('생성된 입고기록을 찾을 수 없습니다.');
    }
    
    const newEntry = entries[0];
    

    
    res.status(201).json({
      success: true,
      message: '입고기록이 성공적으로 생성되었습니다.',
      entry: {
        id: newEntry.id,
        projectId: newEntry.project_id,
        entryDate: newEntry.entry_date,
        shippingDate: newEntry.shipping_date,
        quantity: newEntry.quantity,
        status: newEntry.status,
        createdAt: newEntry.created_at,
        updatedAt: newEntry.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ Warehouse 입고기록 생성 오류:', error);
    res.status(500).json({ 
      error: '입고기록 생성 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 프로젝트별 입고기록 목록 조회
router.get('/project/:projectId/entries', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId } = req.params;
    
    const [entries] = await connection.execute(`
      SELECT * FROM warehouse_entries 
      WHERE project_id = ?
      ORDER BY entry_date DESC, created_at DESC
    `, [projectId]);
    
    // 각 입고기록에 연결된 이미지 정보도 함께 조회
    const responseData = await Promise.all(entries.map(async (entry) => {
      // 해당 entry에 연결된 이미지들 조회
      const [images] = await connection.execute(`
        SELECT id, original_filename, stored_filename, file_size, mime_type, created_at
        FROM warehouse_images 
        WHERE entry_id = ?
        ORDER BY created_at ASC
      `, [entry.id]);
      
      // 디버깅: 이미지 조회 결과 확인
      console.log(`🔍 Entry ${entry.id} 이미지 조회 결과:`, {
        entryId: entry.id,
        imagesFound: images.length,
        imagesData: images
      });
      
      // 이미지 데이터 매핑
      const mappedImages = images.map(image => ({
        id: image.id,
        name: image.original_filename,
        size: image.file_size,
        url: `/uploads/project/mj/warehouse/${image.stored_filename}`,
        thumbnailUrl: `/uploads/project/mj/warehouse/${image.stored_filename}`,
        storedName: image.stored_filename,
        filename: image.original_filename,
        mimeType: image.mime_type,
        createdAt: image.created_at
      }));
      
      console.log(`📸 Entry ${entry.id} 매핑된 이미지:`, {
        entryId: entry.id,
        mappedImagesCount: mappedImages.length,
        mappedImages: mappedImages
      });
      
      return {
        id: entry.id,
        projectId: entry.project_id,
        entryDate: entry.entry_date,
        shippingDate: entry.shipping_date,
        quantity: entry.quantity,
        status: entry.status,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
        images: mappedImages
      };
    }));
    
    // 디버깅: 최종 응답 데이터 확인
    console.log('📤 최종 응답 데이터:', {
      totalEntries: responseData.length,
      entriesWithImages: responseData.filter(entry => entry.images && entry.images.length > 0).length,
      fullResponseData: responseData
    });
    
    res.json({
      success: true,
      entries: responseData
    });
    
  } catch (error) {
    console.error('❌ Warehouse 입고기록 목록 조회 오류:', error);
    res.status(500).json({ 
      error: '입고기록 목록 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 입고기록 수정
router.put('/entries/:entryId', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { entryId } = req.params;
    const { entryDate, shippingDate, quantity, status } = req.body;
    
    if (!entryDate || !shippingDate || !quantity) {
      return res.status(400).json({ 
        error: '필수 필드가 누락되었습니다. (entryDate, shippingDate, quantity)' 
      });
    }
    

    
    // 입고기록 수정
    await connection.execute(`
      UPDATE warehouse_entries 
      SET entry_date = ?, shipping_date = ?, quantity = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [entryDate, shippingDate, quantity, status || '입고중', entryId]);
    
    // 수정된 입고기록 조회
    const [entries] = await connection.execute(`
      SELECT * FROM warehouse_entries WHERE id = ?
    `, [entryId]);
    
    if (entries.length === 0) {
      return res.status(404).json({ error: '입고기록을 찾을 수 없습니다.' });
    }
    
    const updatedEntry = entries[0];
    

    
    res.json({
      success: true,
      message: '입고기록이 성공적으로 수정되었습니다.',
      entry: {
        id: updatedEntry.id,
        projectId: updatedEntry.project_id,
        entryDate: updatedEntry.entry_date,
        shippingDate: updatedEntry.shipping_date,
        quantity: updatedEntry.quantity,
        status: updatedEntry.status,
        createdAt: updatedEntry.created_at,
        updatedAt: updatedEntry.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ Warehouse 입고기록 수정 오류:', error);
    res.status(500).json({ 
      error: '입고기록 수정 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 입고기록 삭제
router.delete('/entries/:entryId', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { entryId } = req.params;
    

    
    // 입고기록에 연결된 이미지들 조회
    const [images] = await connection.execute(`
      SELECT * FROM warehouse_images WHERE entry_id = ?
    `, [entryId]);
    
    // 연결된 이미지들 파일 시스템에서 삭제
    for (const image of images) {
      try {
        await fs.unlink(image.file_path);
        // 연결된 이미지 파일 삭제 완료
      } catch (fileError) {
        // 연결된 이미지 파일 삭제 실패
      }
    }
    
    // 연결된 이미지들 DB에서 삭제
    if (images.length > 0) {
      await connection.execute(`
        DELETE FROM warehouse_images WHERE entry_id = ?
      `, [entryId]);
    }
    
    // 입고기록 삭제
    const [result] = await connection.execute(`
      DELETE FROM warehouse_entries WHERE id = ?
    `, [entryId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '입고기록을 찾을 수 없습니다.' });
    }
    

    
    res.json({
      success: true,
      message: '입고기록이 성공적으로 삭제되었습니다.',
      deletedImages: images.length
    });
    
  } catch (error) {
    console.error('❌ Warehouse 입고기록 삭제 오류:', error);
    res.status(500).json({ 
      error: '입고기록 삭제 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 입고기록 상태 업데이트
router.patch('/entries/:entryId/status', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { entryId } = req.params;
    const { status } = req.body;
    
    if (!status || !['입고중', '입고완료'].includes(status)) {
      return res.status(400).json({ 
        error: '유효하지 않은 상태입니다. (입고중, 입고완료)' 
      });
    }
    

    
    // 상태 업데이트
    await connection.execute(`
      UPDATE warehouse_entries 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, entryId]);
    
    // 업데이트된 입고기록 조회
    const [entries] = await connection.execute(`
      SELECT * FROM warehouse_entries WHERE id = ?
    `, [entryId]);
    
    if (entries.length === 0) {
      return res.status(404).json({ error: '입고기록을 찾을 수 없습니다.' });
    }
    
    const updatedEntry = entries[0];
    

    
    res.json({
      success: true,
      message: '입고기록 상태가 성공적으로 업데이트되었습니다.',
      entry: {
        id: updatedEntry.id,
        projectId: updatedEntry.project_id,
        entryDate: updatedEntry.entry_date,
        shippingDate: updatedEntry.shipping_date,
        quantity: updatedEntry.quantity,
        status: updatedEntry.status,
        createdAt: updatedEntry.created_at,
        updatedAt: updatedEntry.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ Warehouse 입고기록 상태 업데이트 오류:', error);
    res.status(500).json({ 
      error: '입고기록 상태 업데이트 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// multer 설정 - 이미지 파일 업로드 (단순화된 경로)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // uploads/project/mj/warehouse 경로로 단순화 (하위 폴더 없음)
      const uploadPath = path.join(__dirname, '..', 'uploads', 'project', 'mj', 'warehouse');
      
      // 디렉토리가 없으면 생성
      await fs.mkdir(uploadPath, { recursive: true });
      
      // 디버깅: 실제 업로드 경로 확인
      console.log('📁 이미지 업로드 경로:', uploadPath);
      
      cb(null, uploadPath);
    } catch (error) {
      console.error('업로드 디렉토리 생성 오류:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // 파일명: timestamp_originalname
    const timestamp = Date.now();
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    
    const filename = `${timestamp}_${nameWithoutExt}${extension}`;
    cb(null, filename);
  }
});

// 파일 필터링 - 이미지 파일만 허용
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('지원하지 않는 파일 형식입니다. 이미지 파일만 업로드 가능합니다.'), false);
  }
};

// multer 설정
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // 최대 5개 파일
  }
});

// 이미지 업로드 API
router.post('/upload-images', authMiddleware, upload.array('images', 5), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId, entryId } = req.body;
    const uploadedFiles = req.files;
    
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ error: '업로드된 파일이 없습니다.' });
    }
    

    
    // entry_id 유효성 검증
    const [entries] = await connection.execute(
      'SELECT id FROM warehouse_entries WHERE id = ? AND project_id = ?',
      [entryId, projectId]
    );
    
    if (entries.length === 0) {
      return res.status(400).json({ 
        error: '유효하지 않은 입고기록 ID입니다. 입고기록을 먼저 저장한 후 이미지를 업로드해주세요.' 
      });
    }
    
    // 업로드된 이미지 정보를 DB에 저장
    const imageRecords = [];
    
    for (const file of uploadedFiles) {
      // 디버깅: 업로드된 파일 정보 확인
      console.log('📤 업로드된 파일 정보:', {
        originalname: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      });
      
      const imageRecord = {
        project_id: parseInt(projectId),
        entry_id: parseInt(entryId),
        original_filename: file.originalname,
        stored_filename: file.filename,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        created_at: new Date()
      };
      
      imageRecords.push(imageRecord);
    }
    
    // DB에 이미지 정보 저장
    const insertPromises = imageRecords.map(record => {
      const query = `
        INSERT INTO warehouse_images 
        (project_id, entry_id, original_filename, stored_filename, file_path, file_size, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      return connection.execute(query, [
        record.project_id,
        record.entry_id,
        record.original_filename,
        record.stored_filename,
        record.file_path,
        record.file_size,
        record.mime_type,
        record.created_at
      ]);
    });
    
    await Promise.all(insertPromises);
    
    // 응답 데이터 구성
    const responseData = imageRecords.map(record => ({
      id: record.id,
      originalName: record.original_filename,
      storedName: record.stored_filename,
      filePath: record.file_path,
      fileSize: record.file_size,
      mimeType: record.mime_type,
      url: `/uploads/project/mj/warehouse/${record.stored_filename}`,
      thumbnailUrl: `/uploads/project/mj/warehouse/${record.stored_filename}`
    }));
    

    
    res.json({
      success: true,
      message: `${responseData.length}개의 이미지가 성공적으로 업로드되었습니다.`,
      images: responseData
    });
    
  } catch (error) {
    console.error('❌ Warehouse 이미지 업로드 오류:', error);
    res.status(500).json({ 
      error: '이미지 업로드 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 이미지 삭제 API
router.delete('/delete-image/:imageId', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { imageId } = req.params;
    
    // 이미지 정보 조회
    const [images] = await connection.execute(
      'SELECT * FROM warehouse_images WHERE id = ?',
      [imageId]
    );
    
    if (images.length === 0) {
      return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
    }
    
    const image = images[0];
    
    // 파일 시스템에서 이미지 삭제
    try {
      await fs.unlink(image.file_path);
      // 파일 시스템에서 이미지 삭제 완료
    } catch (fileError) {
      // 파일 시스템에서 이미지 삭제 실패 (DB에서만 삭제)
    }
    
    // DB에서 이미지 정보 삭제
    await connection.execute(
      'DELETE FROM warehouse_images WHERE id = ?',
      [imageId]
    );
    
    res.json({
      success: true,
      message: '이미지가 성공적으로 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ Warehouse 이미지 삭제 오류:', error);
    res.status(500).json({ 
      error: '이미지 삭제 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 프로젝트별 이미지 목록 조회 API
router.get('/project/:projectId/images', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId } = req.params;
    
    const [images] = await connection.execute(`
      SELECT wi.*, we.entry_date, we.shipping_date, we.quantity
      FROM warehouse_images wi
      JOIN warehouse_entries we ON wi.entry_id = we.id
      WHERE wi.project_id = ?
      ORDER BY we.entry_date DESC, wi.created_at DESC
    `, [projectId]);
    
    const responseData = images.map(image => ({
      id: image.id,
      entryId: image.entry_id,
      originalName: image.original_filename,
      storedName: image.stored_filename,
      fileSize: image.file_size,
      mimeType: image.mime_type,
      url: `/uploads/project/mj/warehouse/${image.stored_filename}`,
      entryDate: image.entry_date,
      shippingDate: image.shipping_date,
      quantity: image.quantity,
      createdAt: image.created_at
    }));
    
    res.json({
      success: true,
      images: responseData
    });
    
  } catch (error) {
    console.error('❌ Warehouse 이미지 목록 조회 오류:', error);
    res.status(500).json({ 
      error: '이미지 목록 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

module.exports = router; 