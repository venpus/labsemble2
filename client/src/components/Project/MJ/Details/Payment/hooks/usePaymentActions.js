import { useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export const usePaymentActions = (project, paymentData, updatePaymentData, isAdmin) => {
  const {
    selectedFeeRate,
    paymentStatus,
    paymentDates,
    balanceDueDate,
    advanceDueDate,
    paymentDueDates,
    editableShippingCost,
    editableSubtotal,
    editableFee,
    totalAmount,
    additionalCostItems
  } = paymentData;

  // Payment 데이터 저장 함수
  const handleSavePayment = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }
      
      const paymentDataToSave = {
        unitPrice: paymentData.editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: balanceDueDate,
        advanceDueDate: advanceDueDate,
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: editableSubtotal,
        fee: editableFee,
        totalAmount: totalAmount,
        advancePayment: editableSubtotal,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };
      
      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentDataToSave,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      toast.success('Payment 데이터가 성공적으로 저장되었습니다.');
      
    } catch (error) {
      console.error('Payment 데이터 저장 오류:', error);
      toast.error(error.response?.data?.error || 'Payment 데이터 저장 중 오류가 발생했습니다.');
    }
  }, [project.id, paymentData, selectedFeeRate, paymentStatus, paymentDates, balanceDueDate, advanceDueDate, paymentDueDates, editableShippingCost, editableSubtotal, editableFee, totalAmount, additionalCostItems]);

  // 결제 여부 변경 시
  const handlePaymentStatusChange = useCallback(async (type) => {
    if (!isAdmin) {
      toast.error('admin 권한이 필요합니다.');
      return;
    }

    const newStatus = !paymentStatus[type];
    
    // 상태 업데이트
    const newPaymentStatus = {
      ...paymentStatus,
      [type]: newStatus
    };
    
    // 날짜 업데이트
    let newPaymentDates;
    if (newStatus) {
      const today = new Date().toISOString().split('T')[0];
      newPaymentDates = {
        ...paymentDates,
        [type]: today
      };
    } else {
      newPaymentDates = {
        ...paymentDates,
        [type]: ''
      };
    }

    // 로컬 상태 업데이트
    updatePaymentData({
      paymentStatus: newPaymentStatus,
      paymentDates: newPaymentDates
    });
    
    // DB에 즉시 저장
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      const paymentDataToSave = {
        unitPrice: paymentData.editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: newPaymentStatus,
        paymentDates: newPaymentDates,
        balanceDueDate: balanceDueDate,
        advanceDueDate: advanceDueDate,
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: editableSubtotal,
        fee: editableFee,
        totalAmount: totalAmount,
        advancePayment: editableSubtotal,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentDataToSave,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`${type} 결제 상태가 DB에 저장되었습니다:`, newStatus);
    } catch (error) {
      console.error(`${type} 결제 상태 저장 오류:`, error);
      toast.error(`${type} 결제 상태 저장 중 오류가 발생했습니다.`);
      
      // 저장 실패 시 상태 롤백
      updatePaymentData({
        paymentStatus: paymentStatus,
        paymentDates: paymentDates
      });
    }
  }, [isAdmin, paymentStatus, paymentDates, balanceDueDate, advanceDueDate, paymentDueDates, editableShippingCost, editableSubtotal, editableFee, totalAmount, additionalCostItems, project.id, selectedFeeRate, paymentData, updatePaymentData]);

  // 단가 변경 시
  const handleUnitPriceChange = useCallback(async (newUnitPrice) => {
    if (!isAdmin) {
      toast.error('admin 권한이 필요합니다.');
      return;
    }

    console.log('단가 변경 시작:', newUnitPrice);
    
    // 단가 변경으로 인한 모든 금액 재계산
    const newSubtotal = newUnitPrice * (project.quantity || 0);
    const newFee = (newSubtotal * selectedFeeRate) / 100;
    const totalAdditionalCosts = additionalCostItems.reduce((sum, item) => sum + item.cost, 0);
    const newTotalAmount = newSubtotal + editableShippingCost + newFee + totalAdditionalCosts;
    
    console.log('자동 계산 결과:', {
      단가: newUnitPrice,
      총계: newSubtotal,
      수수료: newFee,
      최종결제금액: newTotalAmount
    });
    
    // 로컬 상태 업데이트 (UI 즉시 반영)
    updatePaymentData({
      editableUnitPrice: newUnitPrice,
      editableSubtotal: newSubtotal,
      editableFee: newFee
    });
    
    // 단가가 변경되면 자동으로 DB에 저장
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      const paymentDataToSave = {
        unitPrice: newUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        balanceDueDate: balanceDueDate,
        advanceDueDate: advanceDueDate,
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: newSubtotal,
        fee: newFee,
        totalAmount: newTotalAmount,
        advancePayment: newSubtotal, // 선금은 총계와 동일
        additionalCostItems: JSON.stringify(additionalCostItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentDataToSave,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('단가 및 모든 금액 DB 저장 완료:', {
        단가: newUnitPrice,
        총계: newSubtotal,
        수수료: newFee,
        최종결제금액: newTotalAmount
      });
      toast.success('단가가 변경되어 모든 금액이 자동으로 계산되고 저장되었습니다.');
      
    } catch (error) {
      console.error('단가 자동 저장 오류:', error);
      toast.error('단가 저장 중 오류가 발생했습니다.');
      
      // 저장 실패 시 상태 롤백
      updatePaymentData({
        editableUnitPrice: paymentData.editableUnitPrice,
        editableSubtotal: paymentData.editableSubtotal,
        editableFee: paymentData.editableFee
      });
    }
  }, [isAdmin, project.id, selectedFeeRate, paymentStatus, balanceDueDate, advanceDueDate, paymentDueDates, editableShippingCost, additionalCostItems, updatePaymentData, paymentData]);

  // 수수료율 변경 시
  const handleFeeRateChange = useCallback(async (rate) => {
    if (!isAdmin) {
      toast.error('admin 권한이 필요합니다.');
      return;
    }

    // 현재 선택된 수수료율과 다른 경우에만 처리
    if (rate === selectedFeeRate) {
      return; // 이미 선택된 값이면 무시
    }
    
    console.log('수수료율 변경:', selectedFeeRate + '% →', rate + '%');
    
    // 수수료율 변경 시 수수료 금액 즉시 재계산
    const newFee = (editableSubtotal * rate) / 100;
    
    // 상태 업데이트 (수수료율과 수수료 금액 모두 변경)
    updatePaymentData({
      selectedFeeRate: rate,
      editableFee: newFee
    });
    
    console.log('수수료 재계산:', editableFee + ' →', newFee);
    
    // 사용자에게 피드백 제공
    toast.success(`수수료율이 ${rate}%로 변경되었습니다.`);
    
    // 수수료율 변경 시 DB에 자동 저장
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴
      }

      const paymentDataToSave = {
        unitPrice: paymentData.editableUnitPrice,
        selectedFeeRate: rate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: balanceDueDate,
        advanceDueDate: advanceDueDate,
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: editableSubtotal,
        fee: newFee,
        totalAmount: totalAmount,
        advancePayment: editableSubtotal,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentDataToSave,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('수수료율이 자동으로 DB에 저장되었습니다:', rate);
    } catch (error) {
      console.error('수수료율 자동 저장 오류:', error);
    }
  }, [isAdmin, selectedFeeRate, editableSubtotal, editableFee, paymentData, paymentStatus, paymentDates, balanceDueDate, advanceDueDate, paymentDueDates, editableShippingCost, totalAmount, additionalCostItems, project.id, updatePaymentData]);

  // 추가비용항목 저장 함수
  const handleAdditionalCostSave = useCallback(async (additionalCostItems) => {
    if (!isAdmin) {
      toast.error('admin 권한이 필요합니다.');
      return;
    }

    console.log('추가비용항목 저장 시작:', additionalCostItems);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      const paymentDataToSave = {
        unitPrice: paymentData.editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        balanceDueDate: balanceDueDate,
        advanceDueDate: advanceDueDate,
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: editableSubtotal,
        fee: editableFee,
        totalAmount: totalAmount,
        advancePayment: editableSubtotal,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentDataToSave,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('추가비용항목 DB 저장 완료:', additionalCostItems);
      toast.success('추가비용항목이 자동으로 저장되었습니다.');
      
    } catch (error) {
      console.error('추가비용항목 자동 저장 오류:', error);
      toast.error('추가비용항목 저장 중 오류가 발생했습니다.');
    }
  }, [isAdmin, project.id, selectedFeeRate, paymentStatus, balanceDueDate, advanceDueDate, paymentDueDates, editableShippingCost, editableSubtotal, editableFee, totalAmount, paymentData]);

  return {
    handleSavePayment,
    handlePaymentStatusChange,
    handleUnitPriceChange,
    handleFeeRateChange,
    handleAdditionalCostSave
  };
}; 