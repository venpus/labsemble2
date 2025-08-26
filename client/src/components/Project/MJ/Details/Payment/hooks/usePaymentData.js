import { useState, useEffect, useCallback } from 'react';

export const usePaymentData = (project) => {
  // 초기 로딩 상태
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 수수료 비율 상태 (기본값: 0%)
  const [selectedFeeRate, setSelectedFeeRate] = useState(0);
  
  // 수수료 금액 상태
  const [editableFee, setEditableFee] = useState(0);
  
  // 결제 여부 상태
  const [paymentStatus, setPaymentStatus] = useState({
    advance: false,    // 선금 결제 여부
    balance: false,    // 잔금 결제 여부
    total: false       // 최종 금액 결제 여부
  });
  
  // 결제 확정일 상태
  const [paymentDates, setPaymentDates] = useState({
    advance: '',       // 선금 결제 확정일
    balance: '',       // 잔금 결제 확정일
    total: ''          // 최종 금액 결제 확정일
  });
  
  // 잔금 결제 예정일 상태
  const [balanceDueDate, setBalanceDueDate] = useState('');
  
  // 선금 결제 예정일 상태
  const [advanceDueDate, setAdvanceDueDate] = useState('');
  
  // 결제 예정일 상태 (JSON 형태로 관리)
  const [paymentDueDates, setPaymentDueDates] = useState({
    advance: '',       // 선금 결제 예정일
    balance: ''        // 잔금 결제 예정일
  });
  
  // 단가 수정 상태
  const [editableUnitPrice, setEditableUnitPrice] = useState(Number(project.unit_price) || 0);
  
  // 배송비 수정 상태
  const [editableShippingCost, setEditableShippingCost] = useState(Number(project.factory_shipping_cost) || 0);
  
  // 총계 수정 상태
  const [editableSubtotal, setEditableSubtotal] = useState(0);
  
  // 추가 비용 항목들을 관리하는 상태 (최대 5개)
  const [additionalCostItems, setAdditionalCostItems] = useState([]);

  // 날짜 형식 처리 유틸리티 함수
  const formatDateForDB = useCallback((dateValue) => {
    if (!dateValue || dateValue === '') {
      return null;
    }
    
    // 이미 YYYY-MM-DD 형식인 경우
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    
    // Date 객체나 ISO 문자열인 경우 YYYY-MM-DD로 변환
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('날짜 변환 오류:', error);
      return null;
    }
  }, []);

  // 컴포넌트 마운트 시 기존 데이터 설정
  useEffect(() => {
    if (isInitialized) return; // 이미 초기화된 경우 스킵
    
    console.log('🔄 Payment 데이터 초기화 시작...');
    
    // 수수료율 설정 (기존 저장된 값 또는 기본값 0%) - 초기 로딩 시에만
    if (project.fee_rate !== undefined && project.fee_rate !== null && selectedFeeRate === 0) {
      const savedFeeRate = Number(project.fee_rate);
      setSelectedFeeRate(savedFeeRate);
      console.log('✅ DB에서 수수료율 로드:', savedFeeRate + '%');
    } else if (selectedFeeRate === 0) {
      setSelectedFeeRate(0); // 기본값 0% 설정
      console.log('ℹ️ 수수료율 기본값 설정: 0% (DB에 저장된 값 없음)');
    }

    if (project.payment_status) {
      try {
        const status = JSON.parse(project.payment_status);
        setPaymentStatus(status);
      } catch (error) {
        console.error('결제 상태 파싱 오류:', error);
      }
    }

    if (project.payment_dates) {
      try {
        const dates = JSON.parse(project.payment_dates);
        setPaymentDates(dates);
      } catch (error) {
        console.error('결제 확정일 파싱 오류:', error);
      }
    }

    // 잔금 결제 예정일 설정
    if (project.balance_due_date && project.balance_due_date !== 'null' && project.balance_due_date !== 'undefined') {
      setBalanceDueDate(project.balance_due_date);
    } else {
      setBalanceDueDate(''); // 빈 값으로 초기화
    }
    
    // 선금 결제 예정일 설정
    if (project.advance_due_date) {
      setAdvanceDueDate(project.advance_due_date);
    }
    
    // 결제 예정일 JSON 설정
    if (project.payment_due_dates) {
      try {
        const dueDates = JSON.parse(project.payment_due_dates);
        setPaymentDueDates(dueDates);
        
        // payment_due_dates에서 balance 값이 있으면 balanceDueDate에도 설정
        if (dueDates.balance && dueDates.balance !== 'null' && dueDates.balance !== 'undefined') {
          setBalanceDueDate(dueDates.balance);
        }
      } catch (error) {
        console.error('결제 예정일 파싱 오류:', error);
      }
    }
    
      // 단가 초기값 설정 (기존 저장된 값 또는 기본값)
  if (project.unit_price !== undefined && project.unit_price !== null) {
    const newUnitPrice = Number(project.unit_price);
    setEditableUnitPrice(newUnitPrice);
    // 총계도 함께 계산
    const newSubtotal = newUnitPrice * (project.quantity || 0);
    setEditableSubtotal(newSubtotal);
  }
    
    // 총계 초기값 설정 (기존 저장된 값 또는 기본값)
    if (project.subtotal !== undefined && project.subtotal !== null) {
      setEditableSubtotal(Number(project.subtotal));
    }
    
    // 수수료 초기값 설정 (기존 저장된 값 또는 계산된 값) - 초기 로딩 시에만
    if (project.fee !== undefined && project.fee !== null && editableFee === 0) {
      setEditableFee(Number(project.fee));
      console.log('DB에서 수수료 로드:', Number(project.fee));
    } else if (editableFee === 0) {
      // 수수료율과 총계를 기반으로 수수료 계산
      const initialFee = ((Number(project.subtotal) || 0) * (Number(project.fee_rate) || 0)) / 100;
      setEditableFee(initialFee);
      console.log('수수료 계산됨:', initialFee, '(총계:', Number(project.subtotal), '× 수수료율:', Number(project.fee_rate), '%)');
    }
    
    // 추가 비용 항목들 초기값 설정 (기존 저장된 값 또는 기본값)
    if (project.additional_cost_items) {
      try {
        const items = JSON.parse(project.additional_cost_items);
        if (items && items.length > 0) {
          setAdditionalCostItems(items);
        }
      } catch (error) {
        console.error('추가 비용 항목 파싱 오류:', error);
      }
    } else if (project.additional_cost > 0 || project.additional_cost_description) {
      // 기존 additional_cost 데이터가 있는 경우 (마이그레이션 전 데이터)
      const legacyItems = [];
      if (project.additional_cost > 0) {
        legacyItems.push({
          id: 1,
          cost: Number(project.additional_cost),
          description: project.additional_cost_description || '기존 추가 비용'
        });
      }
      if (legacyItems.length > 0) {
        setAdditionalCostItems(legacyItems);
        console.log('기존 추가 비용 데이터를 항목으로 변환:', legacyItems);
      }
    }
    
    // 초기화 완료 표시
    setIsInitialized(true);
    console.log('✅ Payment 데이터 초기화 완료');
  }, [project.fee_rate, project.payment_status, project.payment_dates, project.balance_due_date, project.advance_due_date, project.payment_due_dates, project.subtotal, project.unit_price, project.quantity, project.fee, project.total_amount, project.additional_cost_items, isInitialized]);

  // 단가 또는 수량 변경 시 총계 자동 재계산
  useEffect(() => {
    const newSubtotal = editableUnitPrice * (project.quantity || 0);
    setEditableSubtotal(newSubtotal);
  }, [editableUnitPrice, project.quantity]);

  // 프로젝트 데이터 변경 시 단가 동기화 (초기 로딩 시에만)
  useEffect(() => {
    if (!isInitialized) return; // 초기화되지 않은 경우 스킵
    
    if (project.unit_price !== undefined && project.unit_price !== null) {
      const newUnitPrice = Number(project.unit_price);
      // 초기 로딩 시에만 동기화 (사용자가 직접 수정한 경우 덮어쓰지 않음)
      if (newUnitPrice !== editableUnitPrice && editableUnitPrice === 0) {
        setEditableUnitPrice(newUnitPrice);
        console.log('프로젝트 데이터에서 단가 초기 동기화:', newUnitPrice);
      }
    }
  }, [project.unit_price, isInitialized]); // isInitialized 의존성 추가

  // 선금과 잔금이 모두 완료되면 최종 금액 자동 완료
  useEffect(() => {
    if (paymentStatus.advance && paymentStatus.balance) {
      // 최종 금액 자동 체크
      setPaymentStatus(prev => ({
        ...prev,
        total: true
      }));
      
      // 최종 금액 확정일 설정 (현재 날짜)
      const today = new Date().toISOString().split('T')[0];
      setPaymentDates(prev => ({
        ...prev,
        total: today
      }));
    } else {
      // 선금이나 잔금 중 하나라도 해제되면 최종 금액도 해제
      setPaymentStatus(prev => ({
        ...prev,
        total: false
      }));
      
      // 최종 금액 확정일 초기화
      setPaymentDates(prev => ({
        ...prev,
        total: ''
      }));
    }
  }, [paymentStatus.advance, paymentStatus.balance]);

  // 계산된 값들
  const totalAmount = editableSubtotal + editableShippingCost + editableFee + 
    additionalCostItems.reduce((sum, item) => sum + item.cost, 0);
  
  const totalAdditionalCosts = additionalCostItems.reduce((sum, item) => sum + item.cost, 0);

  // 결제 데이터 업데이트 함수
  const updatePaymentData = useCallback((updates) => {
    console.log('Payment 데이터 업데이트:', updates);
    
    Object.entries(updates).forEach(([key, value]) => {
      switch (key) {
        case 'selectedFeeRate':
          setSelectedFeeRate(value);
          // 수수료율 변경 시 수수료 금액 즉시 재계산
          const newFee = (editableSubtotal * value) / 100;
          setEditableFee(newFee);
          console.log('수수료율 및 수수료 업데이트:', value, newFee);
          break;
        case 'editableFee':
          setEditableFee(value);
          console.log('수수료 업데이트:', value);
          break;
        case 'paymentStatus':
          setPaymentStatus(value);
          console.log('결제 상태 업데이트:', value);
          break;
        case 'paymentDates':
          setPaymentDates(value);
          console.log('결제 날짜 업데이트:', value);
          break;
        case 'balanceDueDate':
          setBalanceDueDate(value);
          console.log('잔금 예정일 업데이트:', value);
          break;
        case 'advanceDueDate':
          setAdvanceDueDate(value);
          console.log('선금 예정일 업데이트:', value);
          break;
        case 'paymentDueDates':
          setPaymentDueDates(value);
          console.log('결제 예정일 업데이트:', value);
          break;
        case 'editableUnitPrice':
          console.log('단가 상태 업데이트:', value);
          setEditableUnitPrice(value);
          // 단가가 숫자인 경우에만 총계와 수수료 재계산
          if (typeof value === 'number' && !isNaN(value)) {
            const newSubtotal = value * (project.quantity || 0);
            const newFee = (newSubtotal * selectedFeeRate) / 100;
            setEditableSubtotal(newSubtotal);
            setEditableFee(newFee);
            console.log('총계 및 수수료 자동 재계산:', { 총계: newSubtotal, 수수료: newFee });
          }
          break;
        case 'editableShippingCost':
          setEditableShippingCost(value);
          console.log('배송비 업데이트:', value);
          break;
        case 'editableSubtotal':
          setEditableSubtotal(value);
          console.log('총계 업데이트:', value);
          break;
        case 'additionalCostItems':
          setAdditionalCostItems(value);
          console.log('추가 비용 항목 업데이트:', value);
          break;
        default:
          console.log('알 수 없는 업데이트 키:', key, value);
          break;
      }
    });
  }, [project.quantity, selectedFeeRate]);

  // 결제 데이터 초기화 함수
  const resetPaymentData = useCallback(() => {
    setSelectedFeeRate(0);
    setEditableFee(0);
    setPaymentStatus({
      advance: false,
      balance: false,
      total: false
    });
    setPaymentDates({
      advance: '',
      balance: '',
      total: ''
    });
    setBalanceDueDate('');
    setAdvanceDueDate('');
    setPaymentDueDates({
      advance: '',
      balance: ''
    });
    setEditableUnitPrice(Number(project.unit_price) || 0);
    setEditableShippingCost(Number(project.factory_shipping_cost) || 0);
    setEditableSubtotal(0);
    setAdditionalCostItems([]);
  }, [project.unit_price, project.factory_shipping_cost]);

  return {
    paymentData: {
      selectedFeeRate,
      editableFee,
      paymentStatus,
      paymentDates,
      balanceDueDate,
      advanceDueDate,
      paymentDueDates,
      editableUnitPrice,
      editableShippingCost,
      editableSubtotal,
      additionalCostItems,
      totalAmount,
      totalAdditionalCosts
    },
    updatePaymentData,
    resetPaymentData,
    formatDateForDB,
    // onBlur 시 자동 저장을 위한 함수들
    saveUnitPriceOnBlur: (newUnitPrice) => {
      console.log('단가 onBlur 자동 저장:', newUnitPrice);
      setEditableUnitPrice(newUnitPrice);
      const newSubtotal = newUnitPrice * (project.quantity || 0);
      setEditableSubtotal(newSubtotal);
    },
    saveShippingCostOnBlur: (newShippingCost) => {
      console.log('배송비 onBlur 자동 저장:', newShippingCost);
      setEditableShippingCost(newShippingCost);
    }
  };
}; 