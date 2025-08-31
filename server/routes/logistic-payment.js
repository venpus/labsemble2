const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

// 물류 결제 정보 저장/업데이트
router.put('/update', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { data, date } = req.body;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '저장할 데이터가 없습니다.' 
      });
    }

    console.log('💾 [LogisticPayment] 저장 요청 데이터:', { data, date });

    // 트랜잭션 시작
    await connection.beginTransaction();

    let savedCount = 0;
    let updatedCount = 0;
    let errors = [];

    for (const item of data) {
      try {
        const {
          mj_packing_list_id,
          pl_date, // 클라이언트에서 전송한 pl_date 사용
          packing_code,
          logistic_company,
          box_no,
          tracking_number,
          logistic_fee,
          is_paid,
          description
        } = item;
        
        // pl_date 검증
        if (!pl_date) {
          errors.push(`pl_date가 누락되었습니다: ${JSON.stringify(item)}`);
          continue;
        }

        // mj_packing_list_id 검증
        if (!mj_packing_list_id) {
          errors.push(`mj_packing_list_id가 누락되었습니다: ${JSON.stringify(item)}`);
          continue;
        }

        // 필수 필드 검증
        if (!packing_code) {
          errors.push(`포장코드가 누락되었습니다: ${JSON.stringify(item)}`);
          continue;
        }

        if (!box_no || box_no < 1) {
          errors.push(`박스 번호가 올바르지 않습니다: ${JSON.stringify(item)}`);
          continue;
        }

        // 기존 데이터 확인 (packing_code, mj_packing_list_id, box_no로 고유 식별)
        const [existingRecords] = await connection.execute(`
          SELECT id FROM logistic_payment 
          WHERE packing_code = ? AND mj_packing_list_id = ? AND box_no = ?
        `, [packing_code, mj_packing_list_id, box_no]);

                  if (existingRecords.length > 0) {
            // 기존 데이터 업데이트
            await connection.execute(`
              UPDATE logistic_payment SET
                pl_date = ?,
                tracking_number = ?,
                logistic_fee = ?,
                is_paid = ?,
                description = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE packing_code = ? AND mj_packing_list_id = ? AND box_no = ?
            `, [
              pl_date,
              tracking_number || null,
              logistic_fee || 0,
              is_paid || false,
              description || null,
              packing_code,
              mj_packing_list_id,
              box_no
            ]);
            updatedCount++;
            console.log(`✅ [LogisticPayment] 데이터 업데이트 완료: ${packing_code} (박스 ${box_no})`);
          } else {
            // 새 데이터 삽입
            await connection.execute(`
              INSERT INTO logistic_payment (
                mj_packing_list_id,
                pl_date,
                packing_code,
                logistic_company,
                box_no,
                tracking_number,
                logistic_fee,
                is_paid,
                description
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              mj_packing_list_id,
              pl_date,
              packing_code,
              logistic_company || null,
              box_no,
              tracking_number || null,
              logistic_fee || 0,
              is_paid || false,
              description || null
            ]);
            savedCount++;
            console.log(`✅ [LogisticPayment] 새 데이터 저장 완료: ${packing_code} (박스 ${box_no})`);
          }
      } catch (error) {
        console.error(`❌ [LogisticPayment] 데이터 처리 오류:`, error);
        errors.push(`데이터 처리 오류 (${item.packing_code}): ${error.message}`);
      }
    }

    // 트랜잭션 커밋
    await connection.commit();

    console.log(`🎉 [LogisticPayment] 저장 완료: ${savedCount}개 새로 저장, ${updatedCount}개 업데이트`);

    res.json({
      success: true,
      message: '물류 결제 정보가 성공적으로 저장되었습니다.',
      data: {
        saved: savedCount,
        updated: updatedCount,
        total: data.length,
        errors: errors.length > 0 ? errors : null
      }
    });

  } catch (error) {
    // 트랜잭션 롤백
    await connection.rollback();
    
    console.error('❌ [LogisticPayment] 저장 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '데이터 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 특정 날짜의 물류 결제 정보 조회
router.get('/by-date/:date', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { date } = req.params;
    
    console.log('📅 [LogisticPayment] 날짜별 데이터 조회:', date);

    const [records] = await connection.execute(`
      SELECT 
        lp.*,
        mpl.box_count,
        mpl.product_name,
        mpl.packaging_count
      FROM logistic_payment lp
      JOIN mj_packing_list mpl ON lp.mj_packing_list_id = mpl.id
      WHERE lp.pl_date = ?
      ORDER BY lp.packing_code, lp.created_at
    `, [date]);

    console.log(`✅ [LogisticPayment] 조회 완료: ${records.length}개 레코드`);

    res.json({
      success: true,
      data: records
    });

  } catch (error) {
    console.error('❌ [LogisticPayment] 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '데이터 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 특정 날짜의 포장코드별 물류비 합계 조회
router.get('/summary-by-date/:date', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { date } = req.params;
    
    console.log('📊 [LogisticPayment] 날짜별 물류비 합계 조회:', date);

    const [records] = await connection.execute(`
      SELECT 
        packing_code,
        SUM(CAST(logistic_fee AS DECIMAL(10,2))) as total_logistic_fee,
        COUNT(*) as total_records,
        SUM(CASE WHEN is_paid = 1 THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN is_paid = 0 THEN 1 ELSE 0 END) as unpaid_count
      FROM logistic_payment lp
      WHERE lp.pl_date = ?
      GROUP BY packing_code
      ORDER BY packing_code
    `, [date]);

    console.log(`✅ [LogisticPayment] 물류비 합계 조회 완료: ${records.length}개 포장코드`);

    res.json({
      success: true,
      data: records
    });

  } catch (error) {
    console.error('❌ [LogisticPayment] 물류비 합계 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '물류비 합계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 물류 결제 정보 삭제
router.delete('/:id', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    
    console.log('🗑️ [LogisticPayment] 데이터 삭제:', id);

    const [result] = await connection.execute(`
      DELETE FROM logistic_payment WHERE id = ?
    `, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '삭제할 데이터를 찾을 수 없습니다.'
      });
    }

    console.log(`✅ [LogisticPayment] 삭제 완료: ID ${id}`);

    res.json({
      success: true,
      message: '물류 결제 정보가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ [LogisticPayment] 삭제 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '데이터 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

module.exports = router; 