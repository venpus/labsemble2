const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

// 패킹리스트 자동 저장 (포커스 아웃 시)
router.post('/auto-save', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
        const { 
      packing_code, 
      box_count, 
      pl_date,
      logistic_company,
      product_name, 
      product_sku, 
      product_image, 
      packaging_method, 
      packaging_count, 
      quantity_per_box,
      force_insert = false,
      client_product_id
    } = req.body;

    console.log('📥 [auto-save] 요청 데이터:', {
      packing_code,
      box_count,
      pl_date,
      logistic_company,
      product_name,
      product_sku,
      packaging_method,
      packaging_count,
      quantity_per_box,
      force_insert,
      client_product_id
    });

    // 필수 필드 검증
    if (!packing_code || !product_name) {
      return res.status(400).json({ 
        error: '포장코드와 상품명은 필수입니다.' 
      });
    }

    // force_insert가 true이면 무조건 새 데이터 삽입
    if (force_insert) {
      console.log('🆕 [auto-save] 강제 삽입 모드: 새 데이터 삽입 시작');
      console.log('📊 [auto-save] 삽입할 데이터:', {
        packing_code,
        box_count,
        pl_date,
        logistic_company,
        product_name,
        product_sku,
        product_image,
        packaging_method,
        packaging_count,
        quantity_per_box,
        client_product_id
      });
      
      const [insertResult] = await connection.execute(
        `INSERT INTO mj_packing_list (
         packing_code, box_count, pl_date, logistic_company, product_name, product_sku, 
         product_image, packaging_method, packaging_count, quantity_per_box, client_product_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          packing_code,
          box_count || 0,
          pl_date || null,
          logistic_company || null,
          product_name,
          product_sku || null,
          product_image || null,
          packaging_method || 0,
          packaging_count || 0,
          quantity_per_box || 0,
          client_product_id || null
        ]
      );
      
      const result = {
        success: true,
        message: '새 상품이 추가되었습니다.',
        id: insertResult.insertId,
        action: 'inserted',
        forceInsert: true,
        newProductName: product_name
      };
      
      console.log('✅ [auto-save] 강제 삽입 완료:', result);
      return res.json(result);
    }

    // client_product_id가 있으면 해당 ID로 정확한 상품 검색
    let existingRows = [];
    if (client_product_id) {
      const [rows] = await connection.execute(
        `SELECT id, product_name FROM mj_packing_list 
         WHERE client_product_id = ?`,
        [client_product_id]
      );
      existingRows = rows;
      
      console.log('🔍 [auto-save] client_product_id로 정확한 상품 검색:', {
        client_product_id,
        packing_code,
        product_name,
        existingRowsCount: existingRows.length,
        existingRows
      });
    } else {
      // client_product_id가 없으면 포장코드로 검색 (하위 호환성)
      const [rows] = await connection.execute(
        `SELECT id, product_name FROM mj_packing_list 
         WHERE packing_code = ?`,
        [packing_code]
      );
      existingRows = rows;
      
      console.log('🔍 [auto-save] 포장코드로 검색 (하위 호환성):', {
        packing_code,
        product_name,
        existingRowsCount: existingRows.length,
        existingRows
      });
    }

    let result;
    if (existingRows.length > 0) {
      // 기존 데이터가 있으면 첫 번째 항목을 업데이트 (상품명 변경 고려)
      const existingId = existingRows[0].id;
      const oldProductName = existingRows[0].product_name;
      
      console.log('🔄 [auto-save] 기존 데이터 업데이트:', {
        existingId,
        oldProductName,
        newProductName: product_name,
        packing_code,
        logistic_company,
        pl_date
      });
      
      const [updateResult] = await connection.execute(
        `UPDATE mj_packing_list SET
         box_count = ?,
         pl_date = ?,
         logistic_company = ?,
         product_name = ?,
         product_sku = ?,
         product_image = ?,
         packaging_method = ?,
         packaging_count = ?,
         quantity_per_box = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          box_count || 0,
          pl_date || null,
          logistic_company || null,
          product_name,
          product_sku || null,
          product_image || null,
          packaging_method || 0,
          packaging_count || 0,
          quantity_per_box || 0,
          existingId
        ]
      );
      
      result = {
        success: true,
        message: '패킹리스트가 업데이트되었습니다.',
        id: existingId,
        action: 'updated',
        oldProductName,
        newProductName: product_name
      };
    } else {
      // 새 데이터 삽입
      console.log('🆕 [auto-save] 새 데이터 삽입:', {
        packing_code,
        product_name,
        box_count,
        pl_date,
        logistic_company,
        packaging_method,
        packaging_count
      });
      
      const [insertResult] = await connection.execute(
        `INSERT INTO mj_packing_list (
         packing_code, box_count, pl_date, logistic_company, product_name, product_sku, 
         product_image, packaging_method, packaging_count, quantity_per_box, client_product_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          packing_code,
          box_count || 0,
          pl_date || null,
          logistic_company || null,
          product_name,
          product_sku || null,
          product_image || null,
          packaging_method || 0,
          packaging_count || 0,
          quantity_per_box || 0,
          client_product_id || null
        ]
      );
      
      result = {
        success: true,
        message: '패킹리스트가 저장되었습니다.',
        id: insertResult.insertId,
        action: 'inserted',
        newProductName: product_name
      };
    }

    res.json(result);
    
  } catch (error) {
    console.error('패킹리스트 자동 저장 오류:', error);
    res.status(500).json({ 
      error: '패킹리스트 저장 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 패킹리스트 조회 (포장코드별)
router.get('/by-packing-code/:packingCode', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { packingCode } = req.params;
    
    const [rows] = await connection.execute(
      `SELECT * FROM mj_packing_list 
       WHERE packing_code = ? 
       ORDER BY created_at DESC`,
      [packingCode]
    );
    
    res.json({
      success: true,
      data: rows,
      total: rows.length
    });
    
  } catch (error) {
    console.error('패킹리스트 조회 오류:', error);
    res.status(500).json({ 
      error: '패킹리스트 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 패킹리스트 전체 조회
router.get('/', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [rows] = await connection.execute(
      `SELECT * FROM mj_packing_list 
       ORDER BY created_at DESC`
    );
    
    res.json({
      success: true,
      data: rows,
      total: rows.length
    });
    
  } catch (error) {
    console.error('패킹리스트 전체 조회 오류:', error);
    res.status(500).json({ 
      error: '패킹리스트 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 패킹리스트 개별 삭제 (ID별)
router.delete('/:id', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    
    const [result] = await connection.execute(
      'DELETE FROM mj_packing_list WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: '해당 패킹리스트를 찾을 수 없습니다.' 
      });
    }
    
    res.json({
      success: true,
      message: '패킹리스트가 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('패킹리스트 삭제 오류:', error);
    res.status(500).json({ 
      error: '패킹리스트 삭제 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 패킹리스트 포장코드별 전체 삭제
router.delete('/packing-code/:packingCode', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { packingCode } = req.params;
    console.log('🗑️ [packing-list] 포장코드별 전체 삭제 시작:', packingCode);
    
    // 삭제 전 데이터 확인
    const [checkRows] = await connection.execute(
      `SELECT COUNT(*) as count FROM mj_packing_list WHERE packing_code = ?`,
      [packingCode]
    );
    
    if (checkRows[0].count === 0) {
      connection.release();
      return res.status(404).json({ 
        success: false, 
        message: '삭제할 포장코드의 패킹리스트를 찾을 수 없습니다.' 
      });
    }
    
    // 해당 포장코드의 모든 데이터 삭제
    const [deleteResult] = await connection.execute(
      `DELETE FROM mj_packing_list WHERE packing_code = ?`,
      [packingCode]
    );
    
    connection.release();
    
    console.log('✅ [packing-list] 포장코드별 전체 삭제 성공:', packingCode, '→', deleteResult.affectedRows, '개 항목 삭제');
    res.json({ 
      success: true, 
      message: `포장코드 ${packingCode}의 모든 패킹리스트가 삭제되었습니다.`,
      deletedCount: deleteResult.affectedRows
    });
    
  } catch (error) {
    console.error('❌ [packing-list] 포장코드별 전체 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '패킹리스트 삭제 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

module.exports = router; 