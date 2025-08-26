import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Package, Calculator, Truck, Save, Lock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Payment = ({ project }) => {
  // admin 권한 상태
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  // 날짜 형식 처리 유틸리티 함수
  const formatDateForDB = (dateValue) => {
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
  };
  
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
  
  // 수수료 비율 옵션
  const feeRateOptions = [0, 5, 7, 8, 10];
  
  // 계산된 값들
  const unitPrice = editableUnitPrice;
  const quantity = project.quantity || 0;
  const subtotal = editableSubtotal;
  const factoryShippingCost = editableShippingCost;
  
  // 수수료 계산 (editableFee 상태 사용)
  const fee = editableFee;
  
  // 추가 비용 항목들을 관리하는 상태 (최대 5개)
  const [additionalCostItems, setAdditionalCostItems] = useState([]);
  
  // 추가 비용 입력 중 상태 (자동 저장 방지용)
  const [isAdditionalCostFocused, setIsAdditionalCostFocused] = useState(false);
  
  // 최종 결제 금액 계산 (모든 추가 비용 항목 포함)
  const totalAmount = editableSubtotal + editableShippingCost + editableFee + 
    additionalCostItems.reduce((sum, item) => sum + item.cost, 0);
  
  // 추가 비용 항목들의 총합 계산
  const totalAdditionalCosts = additionalCostItems.reduce((sum, item) => sum + item.cost, 0);
  
  // 수수료 비율 변경 시
  const handleFeeRateChange = (rate) => {
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
    setSelectedFeeRate(rate);
    setEditableFee(newFee);
    
    console.log('수수료 재계산:', editableFee + ' →', newFee);
    
    // 사용자에게 피드백 제공
    toast.success(`수수료율이 ${rate}%로 변경되었습니다.`);
    
    // 수수료율 변경 시 DB에 자동 저장 (useEffect에서 처리됨)
  };
  
  // 결제 여부 변경 시
  const handlePaymentStatusChange = async (type) => {
    if (!isAdmin) {
      toast.error('admin 권한이 필요합니다.');
      return;
    }

    const newStatus = !paymentStatus[type];
    
    // 상태 업데이트
    setPaymentStatus(prev => ({
      ...prev,
      [type]: newStatus
    }));
    
    // 날짜 업데이트
    let newDates;
    if (newStatus) {
      const today = new Date().toISOString().split('T')[0];
      newDates = {
        ...paymentDates,
        [type]: today
      };
    } else {
      newDates = {
        ...paymentDates,
        [type]: ''
      };
    }
    setPaymentDates(newDates);
    
    // DB에 즉시 저장
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      const paymentData = {
        unitPrice: editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: {
          ...paymentStatus,
          [type]: newStatus
        },
        paymentDates: newDates,
        balanceDueDate: formatDateForDB(balanceDueDate),
        advanceDueDate: formatDateForDB(advanceDueDate),
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
        paymentData,
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
      setPaymentStatus(prev => ({
        ...prev,
        [type]: !newStatus
      }));
      setPaymentDates(prev => ({
        ...prev,
        [type]: newStatus ? '' : paymentDates[type]
      }));
    }
  };
  
  // 컴포넌트 마운트 시 admin 권한 확인 및 기존 데이터 설정
  useEffect(() => {
    // admin 권한 확인
    const checkAdminStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('🔑 토큰이 없습니다.');
          setIsAdmin(false);
          setIsAdminLoading(false);
          return;
        }

        console.log('🔍 Admin 권한 확인 중...');
        const response = await axios.get('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('👤 사용자 정보:', response.data);
        const adminStatus = response.data.is_admin || false;
        console.log('👑 Admin 권한:', adminStatus);
        
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('❌ Admin 권한 확인 오류:', error);
        setIsAdmin(false);
      } finally {
        setIsAdminLoading(false);
        console.log('✅ Admin 권한 확인 완료. isAdmin:', isAdmin, 'isAdminLoading:', false);
      }
    };

    checkAdminStatus();
  }, []);

  // 컴포넌트 마운트 시 기존 데이터 설정
  useEffect(() => {
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
      setEditableUnitPrice(Number(project.unit_price));
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
    
    // 최종 결제 금액 초기값 설정 (기존 저장된 값 또는 계산된 값)
    if (project.total_amount !== undefined && project.total_amount !== null) {
      // totalAmount는 계산된 값이므로 별도 상태로 저장하지 않고 계산식으로 사용
      console.log('기존 최종 결제 금액:', Number(project.total_amount));
    }
  }, [project.fee_rate, project.payment_status, project.payment_dates, project.balance_due_date, project.advance_due_date, project.payment_due_dates, project.subtotal, project.unit_price, project.quantity, project.fee, project.total_amount, project.additional_cost_items]);
  

  
  // Payment 데이터 저장 함수
  const handleSavePayment = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }
      
      const paymentData = {
        unitPrice: editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: formatDateForDB(balanceDueDate),
        advanceDueDate: formatDateForDB(advanceDueDate),
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: editableSubtotal,
        fee: editableFee,
        totalAmount: totalAmount,
        advancePayment: editableSubtotal,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };
      
      const response = await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentData,
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
  };
  
  // 단가 또는 수량 변경 시 총계 자동 재계산 및 DB 저장
  useEffect(() => {
    const newSubtotal = editableUnitPrice * quantity;
    setEditableSubtotal(newSubtotal);
    
    // 총계가 변경되면 자동으로 DB에 저장
    if (newSubtotal !== 0) {
      saveSubtotalToDB(newSubtotal);
    }
  }, [editableUnitPrice, quantity]);

    // 총계를 DB에 저장하는 함수
  const saveSubtotalToDB = useCallback(async (newSubtotal) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴 (사용자에게 에러 표시하지 않음)
      }

      const paymentData = {
        unitPrice: editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: formatDateForDB(balanceDueDate),
        advanceDueDate: formatDateForDB(advanceDueDate),
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: newSubtotal,
        fee: editableFee,
        totalAmount: totalAmount,
        advancePayment: editableSubtotal,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('총계가 자동으로 DB에 저장되었습니다:', newSubtotal);
    } catch (error) {
      console.error('총계 자동 저장 오류:', error);
      // 사용자에게 에러 표시하지 않음 (자동 저장이므로)
    }
  }, [editableUnitPrice, selectedFeeRate, paymentStatus, paymentDates, balanceDueDate, editableShippingCost, editableFee, editableSubtotal, totalAmount, project.id, additionalCostItems]);

  // 공장 배송비를 DB에 저장하는 함수
  const saveShippingCostToDB = useCallback(async (newShippingCost) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴 (사용자에게 에러 표시하지 않음)
      }

      const paymentData = {
        unitPrice: editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: formatDateForDB(balanceDueDate),
        advanceDueDate: formatDateForDB(advanceDueDate),
        paymentDueDates: paymentDueDates,
        factoryShippingCost: newShippingCost,
        subtotal: editableSubtotal,
        fee: editableFee,
        totalAmount: totalAmount,
        advancePayment: editableSubtotal,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('공장 배송비가 자동으로 DB에 저장되었습니다:', newShippingCost);
    } catch (error) {
      console.error('공장 배송비 자동 저장 오류:', error);
      // 사용자에게 에러 표시하지 않음 (자동 저장이므로)
    }
  }, [editableUnitPrice, selectedFeeRate, paymentStatus, paymentDates, balanceDueDate, editableSubtotal, editableFee, totalAmount, project.id, additionalCostItems]);

  // 수수료율을 DB에 저장하는 함수
  const saveFeeRateToDB = useCallback(async (newFeeRate) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴 (사용자에게 에러 표시하지 않음)
      }

      const paymentData = {
        unitPrice: editableUnitPrice,
        selectedFeeRate: newFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: formatDateForDB(balanceDueDate),
        advanceDueDate: formatDateForDB(advanceDueDate),
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
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('수수료율이 자동으로 DB에 저장되었습니다:', newFeeRate);
    } catch (error) {
      console.error('수수료율 자동 저장 오류:', error);
      // 사용자에게 에러 표시하지 않음 (자동 저장이므로)
    }
  }, [editableUnitPrice, paymentStatus, paymentDates, balanceDueDate, editableShippingCost, editableSubtotal, editableFee, totalAmount, project.id, additionalCostItems]);

  // 수수료를 DB에 저장하는 함수
  const saveFeeToDB = useCallback(async (newFee) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴 (사용자에게 에러 표시하지 않음)
      }

      const paymentData = {
        unitPrice: editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: formatDateForDB(balanceDueDate),
        advanceDueDate: formatDateForDB(advanceDueDate),
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
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('수수료가 자동으로 DB에 저장되었습니다:', newFee);
    } catch (error) {
      console.error('수수료 자동 저장 오류:', error);
      // 사용자에게 에러 표시하지 않음 (자동 저장이므로)
    }
  }, [editableUnitPrice, selectedFeeRate, paymentStatus, paymentDates, balanceDueDate, editableShippingCost, editableSubtotal, editableFee, totalAmount, project.id, additionalCostItems]);

  // 추가 비용 항목을 DB에 저장하는 함수
  const saveAdditionalCostItemsToDB = useCallback(async (newItems) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴 (사용자에게 에러 표시하지 않음)
      }

      const paymentData = {
        unitPrice: editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: formatDateForDB(balanceDueDate),
        advanceDueDate: formatDateForDB(advanceDueDate),
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: editableSubtotal,
        fee: editableFee,
        totalAmount: totalAmount,
        advancePayment: editableSubtotal,
        additionalCostItems: JSON.stringify(newItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('추가 비용 항목이 자동으로 DB에 저장되었습니다:', newItems);
    } catch (error) {
      console.error('추가 비용 항목 자동 저장 오류:', error);
      // 사용자에게 에러 표시하지 않음 (자동 저장이므로)
    }
  }, [editableUnitPrice, selectedFeeRate, paymentStatus, paymentDates, balanceDueDate, editableShippingCost, editableSubtotal, editableFee, totalAmount, project.id, additionalCostItems]);

  // 최종 결제 금액을 DB에 저장하는 함수
  const saveTotalAmountToDB = useCallback(async (newTotalAmount) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴 (사용자에게 에러 표시하지 않음)
      }

      const paymentData = {
        unitPrice: editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: formatDateForDB(balanceDueDate),
        advanceDueDate: formatDateForDB(advanceDueDate),
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: editableSubtotal,
        fee: editableFee,
        totalAmount: newTotalAmount,
        advancePayment: editableSubtotal,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('최종 결제 금액이 자동으로 DB에 저장되었습니다:', newTotalAmount);
    } catch (error) {
      console.error('최종 결제 금액 자동 저장 오류:', error);
      // 사용자에게 에러 표시하지 않음 (자동 저장이므로)
    }
  }, [editableUnitPrice, selectedFeeRate, paymentStatus, paymentDates, balanceDueDate, editableShippingCost, editableSubtotal, editableFee, project.id, additionalCostItems]);

  // 선금을 DB에 저장하는 함수
  const saveAdvancePaymentToDB = useCallback(async (newAdvancePayment) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return; // 토큰이 없으면 조용히 리턴 (사용자에게 에러 표시하지 않음)
      }

      const paymentData = {
        unitPrice: editableUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: formatDateForDB(balanceDueDate),
        advanceDueDate: formatDateForDB(advanceDueDate),
        paymentDueDates: paymentDueDates,
        factoryShippingCost: editableShippingCost,
        subtotal: editableSubtotal,
        fee: editableFee,
        totalAmount: totalAmount,
        advancePayment: newAdvancePayment,
        additionalCostItems: JSON.stringify(additionalCostItems)
      };

      await axios.post(
        `/api/mj-project/${project.id}/payment`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('선금이 자동으로 DB에 저장되었습니다:', newAdvancePayment);
    } catch (error) {
      console.error('선금 자동 저장 오류:', error);
      // 사용자에게 에러 표시하지 않음 (자동 저장이므로)
    }
  }, [editableUnitPrice, selectedFeeRate, paymentStatus, paymentDates, balanceDueDate, editableShippingCost, editableSubtotal, editableFee, totalAmount, project.id, additionalCostItems]);

  // 단가 변경 시 자동 저장
  const handleUnitPriceChange = async (newUnitPrice) => {
    if (!isAdmin) {
      toast.error('admin 권한이 필요합니다.');
      return;
    }

    setEditableUnitPrice(newUnitPrice);
    
    // 단가가 변경되면 자동으로 DB에 저장
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      const paymentData = {
        unitPrice: newUnitPrice,
        selectedFeeRate: selectedFeeRate,
        paymentStatus: paymentStatus,
        paymentDates: paymentDates,
        balanceDueDate: formatDateForDB(balanceDueDate),
        advanceDueDate: formatDateForDB(advanceDueDate),
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
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success('단가가 자동으로 저장되었습니다.');
    } catch (error) {
      console.error('단가 자동 저장 오류:', error);
      toast.error('단가 저장 중 오류가 발생했습니다.');
    }
  };
  


  // 총계, 공장 배송비, 수수료 변경 시 최종 결제 금액 자동 DB 저장
  useEffect(() => {
    const newTotalAmount = editableSubtotal + editableShippingCost + editableFee + 
      additionalCostItems.reduce((sum, item) => sum + item.cost, 0);
    
    // 최종 결제 금액이 변경되면 자동으로 DB에 저장
    if (newTotalAmount !== 0) {
      saveTotalAmountToDB(newTotalAmount);
    }
  }, [editableSubtotal, editableShippingCost, editableFee, additionalCostItems, saveTotalAmountToDB]);

  // 총계 변경 시 선금 자동 DB 저장
  useEffect(() => {
    if (editableSubtotal !== 0) {
      saveAdvancePaymentToDB(editableSubtotal);
    }
  }, [editableSubtotal, saveAdvancePaymentToDB]);

  // 공장 배송비 변경 시 자동 DB 저장
  useEffect(() => {
    if (editableShippingCost !== 0) {
      saveShippingCostToDB(editableShippingCost);
    }
  }, [editableShippingCost, saveShippingCostToDB]);

  // 수수료율 변경 시 자동 DB 저장 (초기 로딩 시에는 저장하지 않음)
  useEffect(() => {
    // 초기 로딩이 아닌 실제 사용자 변경 시에만 저장
    if (selectedFeeRate !== 0 && project.fee_rate !== selectedFeeRate) {
      console.log('수수료율 변경 감지, DB에 자동 저장:', selectedFeeRate + '%');
      saveFeeRateToDB(selectedFeeRate);
    }
  }, [selectedFeeRate, saveFeeRateToDB, project.fee_rate]);
  
  // 수수료 변경 시 자동 DB 저장 (수수료율 변경으로 인한 재계산 후)
  useEffect(() => {
    // 초기 로딩이 아닌 실제 사용자 변경 시에만 저장
    if (editableFee !== 0 && project.fee !== editableFee) {
      console.log('수수료 변경 감지, DB에 자동 저장:', editableFee);
      saveFeeToDB(editableFee);
    }
  }, [editableFee, saveFeeToDB, project.fee]);

  // 추가 비용 항목 추가/삭제 시 자동 DB 저장
  useEffect(() => {
    if (JSON.stringify(additionalCostItems) !== JSON.stringify(project.additional_cost_items) && !isAdditionalCostFocused) {
      console.log('추가 비용 항목 변경 감지, DB에 자동 저장:', additionalCostItems);
      saveAdditionalCostItemsToDB(additionalCostItems);
    }
  }, [additionalCostItems, saveAdditionalCostItemsToDB, project.additional_cost_items, isAdditionalCostFocused]);


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

  return (
    <div className="space-y-6">
      {/* 결제 정보 헤더 */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              결제 정보
            </h2>
            <p className="text-sm text-gray-600 mt-1">프로젝트의 가격 및 결제 관련 정보를 확인할 수 있습니다.</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 저장 버튼 */}
            {!isAdminLoading && isAdmin && (
              <button
                onClick={handleSavePayment}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                저장
              </button>
            )}
            
            {/* 결제 상태 정보 */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">결제 상태</h3>
              <div className="flex items-center space-x-4">
                {/* 선금 대기 상태 - 선금이 미완료인 경우에만 표시 */}
                {!paymentStatus.advance && (
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
                    <span className="text-sm text-gray-600">선금 대기</span>
                  </div>
                )}
                
                {/* 잔금 대기 상태 - 선금이 완료된 경우에만 표시 */}
                {paymentStatus.advance && (
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      paymentStatus.balance ? 'bg-green-400' : 'bg-blue-400'
                    }`}></div>
                    <span className="text-sm text-gray-600">잔금 대기</span>
                </div>
                )}
                
                {/* 결제 완료 상태 - 최종금액이 완료된 경우에만 표시 */}
                {paymentStatus.total && (
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
                    <span className="text-sm text-gray-600">결제 완료</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 결제 상세 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {!isAdminLoading && !isAdmin && (
          <div className="p-4 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center">
              <Lock className="w-4 h-4 mr-2 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                결제 정보 수정은 admin 권한이 필요합니다. 현재 읽기 전용 모드입니다.
              </span>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <tbody className="bg-white divide-y divide-gray-200">
              {/* 단가와 수량 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="w-4 h-4 mr-3 rounded-full bg-blue-600"></div>
                      <span className="text-sm font-medium text-gray-900">단가</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 mr-3 rounded-full bg-green-600"></div>
                      <span className="text-sm font-medium text-gray-900">수량</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <span className="font-medium">1개당 × {quantity.toLocaleString()}개</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {!isAdminLoading && isAdmin ? (
                      <input
                        type="number"
                        value={editableUnitPrice}
                        onChange={(e) => handleUnitPriceChange(Number(e.target.value) || 0)}
                        className="w-24 px-2 py-1 text-right border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        step="0.1"
                      />
                    ) : !isAdminLoading ? (
                      <span className="text-sm text-gray-900">
                        ¥{editableUnitPrice.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">권한 확인 중...</span>
                    )}
                  </div>
                </td>
              </tr>

              {/* 총계 */}
              <tr className="hover:bg-gray-50 bg-blue-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-3 rounded-full bg-yellow-600"></div>
                    <span className="text-sm font-medium text-blue-900">총계</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-blue-700">
                    <span className="font-medium">단가 × 수량</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-lg font-bold text-blue-900">
                    ¥{editableSubtotal.toLocaleString()}
                  </div>
                </td>
              </tr>

              {/* 공장 배송비 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-3 rounded-full bg-purple-600"></div>
                    <span className="text-sm font-medium text-gray-900">공장 배송비</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <span className="font-medium">공장에서 배송지까지</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {!isAdminLoading && isAdmin ? (
                      <input
                        type="number"
                        value={editableShippingCost}
                        onChange={(e) => {
                          const newValue = Number(e.target.value) || 0;
                          setEditableShippingCost(newValue);
                        }}
                        className="w-24 px-2 py-1 text-right border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        min="0"
                        step="0.01"
                      />
                    ) : !isAdminLoading ? (
                      <span className="text-sm text-gray-900">
                        ¥{editableShippingCost.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">권한 확인 중...</span>
                    )}
                  </div>
                </td>
              </tr>

              {/* 수수료 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-3 rounded-full bg-orange-600"></div>
                    <span className="text-sm font-medium text-gray-900">수수료</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-3">
                    {!isAdminLoading && isAdmin ? (
                      feeRateOptions.map((rate) => (
                        <label key={rate} className="flex items-center cursor-pointer p-2 rounded hover:bg-orange-50 transition-colors">
                          <input
                            type="radio"
                            name="feeRate"
                            value={rate}
                            checked={selectedFeeRate === rate}
                            onChange={(e) => handleFeeRateChange(Number(e.target.value))}
                            className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500 focus:ring-2 cursor-pointer"
                            id={`feeRate-${rate}`}
                          />
                          <span className={`ml-2 text-sm select-none ${
                            selectedFeeRate === rate 
                              ? 'text-orange-700 font-semibold' 
                              : 'text-gray-900'
                          }`}>
                            {rate}%
                          </span>
                        </label>
                      ))
                    ) : !isAdminLoading ? (
                      <span className="text-sm text-gray-900 px-3 py-2">
                        {selectedFeeRate}%
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 px-3 py-2">권한 확인 중...</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    ¥{editableFee.toLocaleString()}
                  </div>
                </td>
              </tr>

              {/* 추가 비용 항목 추가/삭제 버튼 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-3 rounded-full bg-blue-600"></div>
                    <span className="text-sm font-medium text-gray-900">추가 비용 항목 관리</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <span className="font-medium">
                      {additionalCostItems.length === 0 
                        ? '추가 비용 항목을 추가해주세요' 
                        : `${additionalCostItems.length}개 항목 관리 중`
                      }
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {!isAdminLoading && isAdmin ? (
                    <button
                      onClick={() => {
                        if (additionalCostItems.length < 5) {
                          const newId = additionalCostItems.length > 0 
                            ? Math.max(...additionalCostItems.map(item => item.id)) + 1 
                            : 1;
                          setAdditionalCostItems(prev => [...prev, { id: newId, cost: 0, description: '' }]);
                        } else {
                          toast.error('최대 5개까지만 추가할 수 있습니다.');
                        }
                      }}
                      disabled={additionalCostItems.length >= 5}
                      className={`px-3 py-1 text-xs rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                        additionalCostItems.length >= 5
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                      }`}
                    >
                      {additionalCostItems.length >= 5 ? '최대 항목 수 도달' : '추가 비용 항목 추가'}
                    </button>
                  ) : !isAdminLoading ? (
                    <span className="text-sm text-gray-500">관리자 전용</span>
                  ) : (
                    <span className="text-sm text-gray-400">권한 확인 중...</span>
                  )}
                </td>
              </tr>

              {/* 추가 비용 항목 목록 - 항목이 있을 때만 표시 */}
              {additionalCostItems.length > 0 && additionalCostItems.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-4 h-4 mr-3 rounded-full bg-red-600"></div>
                      <span className="text-sm font-medium text-gray-900">추가 비용 {index + 1}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {!isAdminLoading && isAdmin ? (
                        <input
                          type="text"
                          placeholder="비용 설명 입력..."
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...additionalCostItems];
                            newItems[index].description = e.target.value;
                            setAdditionalCostItems(newItems);
                          }}
                          onFocus={() => setIsAdditionalCostFocused(true)}
                          onBlur={() => {
                            setIsAdditionalCostFocused(false);
                            // 포커스가 해제되면 즉시 저장
                            if (item.description !== '' && project.additional_cost_items?.[index]?.description !== item.description) {
                              saveAdditionalCostItemsToDB(additionalCostItems);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur(); // 포커스 해제하여 onBlur 트리거
                            }
                          }}
                          className="w-64 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        />
                      ) : !isAdminLoading ? (
                        <span className="text-sm text-gray-900 px-3 py-2">
                          {item.description || '-'}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 px-3 py-2">권한 확인 중...</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {!isAdminLoading && isAdmin ? (
                        <input
                          type="number"
                          value={item.cost}
                          onChange={(e) => {
                            const newItems = [...additionalCostItems];
                            newItems[index].cost = Number(e.target.value) || 0;
                            setAdditionalCostItems(newItems);
                          }}
                          onFocus={() => setIsAdditionalCostFocused(true)}
                          onBlur={() => {
                            setIsAdditionalCostFocused(false);
                            // 포커스가 해제되면 즉시 저장
                            if (item.cost !== 0 && project.additional_cost_items?.[index]?.cost !== item.cost) {
                              saveAdditionalCostItemsToDB(additionalCostItems);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur(); // 포커스 해제하여 onBlur 트리거
                            }
                          }}
                          className="w-24 px-2 py-1 text-right border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          min="0"
                          step="0.01"
                        />
                      ) : !isAdminLoading ? (
                        <span className="text-sm text-gray-900 px-2 py-1">
                          ¥{item.cost.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 px-2 py-1">권한 확인 중...</span>
                      )}
                      {!isAdminLoading && isAdmin && (
                        <button
                          onClick={() => {
                            setAdditionalCostItems(prev => prev.filter(i => i.id !== item.id));
                          }}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {/* 추가 비용 항목들의 총합 */}
              {additionalCostItems.length > 0 && (
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-4 h-4 mr-3 rounded-full bg-gray-600"></div>
                      <span className="text-sm font-medium text-gray-900">추가 비용 총합</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <span className="font-medium">
                        추가 비용 항목들의 총합
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      ¥{totalAdditionalCosts.toLocaleString()}
                    </div>
                  </td>
                </tr>
              )}

              {/* 최종 결제 금액 */}
              <tr className="hover:bg-gray-50 bg-green-50 border-t-2 border-green-200">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-3 rounded-full bg-green-600"></div>
                    <span className="text-lg font-bold text-green-900">최종 결제 금액</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-green-700">
                    <span className="font-medium">
                      총계 + 공장 배송비 + 수수료{additionalCostItems.length > 0 ? ' + 추가 비용 총합' : ''}
                    </span>
                    <div className="text-xs text-green-600 mt-1">
                      {editableSubtotal.toLocaleString()} + {editableShippingCost.toLocaleString()} + {editableFee.toLocaleString()}{additionalCostItems.length > 0 ? ` + ${totalAdditionalCosts.toLocaleString()}` : ''} = {totalAmount.toLocaleString()}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-xl font-bold text-green-900">
                    ¥{totalAmount.toLocaleString()}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 결제 정보 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calculator className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">선금</span>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={paymentStatus.advance}
                onChange={() => handlePaymentStatusChange('advance')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="ml-2 text-xs text-blue-700">결제완료</span>
            </label>
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-2">
            ¥{subtotal.toLocaleString()}
          </div>
          

          
          {/* 선금 결제 확정일 */}
          {paymentStatus.advance && paymentDates.advance && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-700 font-medium">결제 확정일</span>
                <span className="text-xs text-blue-600 font-semibold">
                  {paymentDates.advance}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Package className="w-5 h-5 text-orange-600 mr-2" />
              <span className="text-sm font-medium text-orange-900">잔금</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                수수료 + 배송비{additionalCostItems.length > 0 ? ' + 추가비용' : ''}
              </span>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentStatus.balance}
                  onChange={() => handlePaymentStatusChange('balance')}
                  className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                />
                <span className="ml-2 text-xs text-orange-700">결제완료</span>
              </label>
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-900 mt-2">
            ¥{(fee + factoryShippingCost + totalAdditionalCosts).toLocaleString()}
          </div>
          
          {/* 잔금 계산 과정 표시 */}
          <div className="text-xs text-orange-600 mt-1">
            {editableFee.toLocaleString()} + {editableShippingCost.toLocaleString()}{additionalCostItems.length > 0 ? ` + ${totalAdditionalCosts.toLocaleString()}` : ''} = {(editableFee + factoryShippingCost + totalAdditionalCosts).toLocaleString()}
          </div>
          
          {/* 잔금 결제 예정일 */}
          <div className="mt-3 pt-3 border-t border-orange-200">
            <div className="flex items-center mb-2">
              <div className="w-2 h-2 rounded-full bg-orange-400 mr-2"></div>
              <span className="text-xs font-medium text-orange-800">결제 예정일 관리</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-orange-700 font-medium">결제 예정일</span>
                {balanceDueDate && (
                  <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                    설정됨
                  </span>
                )}
              </div>
              <input
                type="date"
                value={balanceDueDate}
                onChange={async (e) => {
                  const newDate = e.target.value;
                  setBalanceDueDate(newDate);
                  
                  // paymentDueDates도 함께 업데이트
                  const newPaymentDueDates = {
                    ...paymentDueDates,
                    balance: newDate
                  };
                  setPaymentDueDates(newPaymentDueDates);
                  
                  // DB에 즉시 저장
                  try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                      toast.error('로그인이 필요합니다.');
                      return;
                    }

                    const paymentData = {
                      unitPrice: editableUnitPrice,
                      selectedFeeRate: selectedFeeRate,
                      paymentStatus: paymentStatus,
                      paymentDates: paymentDates,
                      balanceDueDate: formatDateForDB(newDate),
                      advanceDueDate: formatDateForDB(advanceDueDate),
                      paymentDueDates: newPaymentDueDates,
                      factoryShippingCost: editableShippingCost,
                      subtotal: editableSubtotal,
                      fee: editableFee,
                      totalAmount: totalAmount,
                      advancePayment: editableSubtotal,
                      additionalCostItems: JSON.stringify(additionalCostItems)
                    };

                    await axios.post(
                      `/api/mj-project/${project.id}/payment`,
                      paymentData,
                      {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                      }
                    );

                    console.log('잔금 결제 예정일이 DB에 저장되었습니다:', newDate);
                  } catch (error) {
                    console.error('잔금 결제 예정일 저장 오류:', error);
                    toast.error('잔금 결제 예정일 저장 중 오류가 발생했습니다.');
                    
                    // 저장 실패 시 상태 롤백
                    setBalanceDueDate(balanceDueDate);
                    setPaymentDueDates(paymentDueDates);
                  }
                }}
                className={`text-xs px-2 py-1 border rounded focus:outline-none focus:ring-2 transition-colors ${
                  balanceDueDate 
                    ? 'border-orange-400 bg-orange-50 text-orange-900 focus:ring-orange-500 focus:border-orange-500' 
                    : 'border-orange-300 bg-white text-orange-900 focus:ring-orange-500 focus:border-orange-500'
                }`}
                min={new Date().toISOString().split('T')[0]} // 오늘 날짜부터 선택 가능
                placeholder="날짜 선택"
              />
            </div>
            
          </div>
          
          {/* 잔금 결제 확정일 */}
          {paymentStatus.balance && paymentDates.balance && (
            <div className="mt-3 pt-3 border-t border-orange-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-orange-700 font-medium">결제 확정일</span>
                <span className="text-xs text-orange-600 font-semibold">
                  {paymentDates.balance}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-900">최종 금액</span>
            </div>
            <label className={`flex items-center ${paymentStatus.advance && paymentStatus.balance ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={paymentStatus.total}
                onChange={() => handlePaymentStatusChange('total')}
                disabled={!(paymentStatus.advance && paymentStatus.balance)}
                className={`w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2 ${
                  !(paymentStatus.advance && paymentStatus.balance) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
              <span className={`ml-2 text-xs ${paymentStatus.advance && paymentStatus.balance ? 'text-green-700' : 'text-green-500'}`}>
                {paymentStatus.advance && paymentStatus.balance ? '결제완료' : '자동완료'}
              </span>
            </label>
          </div>
          <div className="text-2xl font-bold text-green-900 mt-2">
            ¥{totalAmount.toLocaleString()}
          </div>
          
          {/* 최종 금액 결제 확정일 */}
          {paymentStatus.total && paymentDates.total && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-700 font-medium">결제 확정일</span>
                <span className="text-xs text-green-600 font-semibold">
                  {paymentDates.total}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Payment; 