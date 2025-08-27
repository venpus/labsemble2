import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export const useDeliveryState = (project) => {
  // 통합된 Delivery 상태
  const [deliveryState, setDeliveryState] = useState({
    actualOrderDate: '',
    expectedFactoryShippingDate: '',
    actualFactoryShippingDate: '',
    isOrderCompleted: false,
    isFactoryShippingCompleted: false,
    deliveryStatus: '발주대기'
  });

  // Admin 권한 상태
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  // 토스트 중복 방지를 위한 ref
  const lastToastMessage = useRef('');
  const isInitialized = useRef(false);

  // Admin 권한 확인
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAdmin(false);
          setIsAdminLoading(false);
          return;
        }

        const response = await axios.get('/api/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setIsAdmin(response.data.is_admin || false);
      } catch (error) {
        console.error('Admin 권한 확인 오류:', error);
        setIsAdmin(false);
      } finally {
        setIsAdminLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  // Project 데이터로부터 Delivery 상태 동기화
  const syncWithProject = useCallback((projectData) => {
    if (projectData) {
      // DB 값 기반으로 정확한 상태 설정
      const syncedState = {
        actualOrderDate: projectData.actual_order_date || '',
        expectedFactoryShippingDate: projectData.expected_factory_shipping_date || '',
        actualFactoryShippingDate: projectData.actual_factory_shipping_date || '',
        isOrderCompleted: Boolean(projectData.is_order_completed),
        isFactoryShippingCompleted: Boolean(projectData.is_factory_shipping_completed),
        deliveryStatus: projectData.delivery_status || '발주대기'
      };
      
      setDeliveryState(syncedState);
      return syncedState;
    }
  }, []);



  // DB 값과 상태 비교하여 납기상태 검증 및 업데이트
  const validateAndUpdateDeliveryStatus = useCallback((projectData) => {
    if (!projectData) return;
    
    // DB에서 가져온 실제 값들
    const dbValues = {
      isOrderCompleted: Boolean(projectData.is_order_completed),
      isFactoryShippingCompleted: Boolean(projectData.is_factory_shipping_completed),
      actualFactoryShippingDate: projectData.actual_factory_shipping_date || null,
      expectedFactoryShippingDate: projectData.expected_factory_shipping_date || null,
      actualOrderDate: projectData.actual_order_date || null,
      deliveryStatus: projectData.delivery_status || '발주대기'
    };
    
    // DB 값 기반으로 정확한 납기상태 계산
    let correctDeliveryStatus = '발주대기';
    
    if (dbValues.isOrderCompleted && !dbValues.isFactoryShippingCompleted) {
      correctDeliveryStatus = '출고 대기';
    } else if (dbValues.isOrderCompleted && dbValues.isFactoryShippingCompleted && !dbValues.actualFactoryShippingDate) {
      correctDeliveryStatus = '공장 출고 완료';
    } else if (dbValues.isOrderCompleted && dbValues.isFactoryShippingCompleted && dbValues.actualFactoryShippingDate) {
      correctDeliveryStatus = '입고 대기';
    }
    
    // DB 값과 현재 상태 비교
    const needsUpdate = 
      deliveryState.isOrderCompleted !== dbValues.isOrderCompleted ||
      deliveryState.isFactoryShippingCompleted !== dbValues.isFactoryShippingCompleted ||
      deliveryState.actualFactoryShippingDate !== dbValues.actualFactoryShippingDate ||
      deliveryState.expectedFactoryShippingDate !== dbValues.expectedFactoryShippingDate ||
      deliveryState.actualOrderDate !== dbValues.actualOrderDate ||
      deliveryState.deliveryStatus !== correctDeliveryStatus;
    
    if (needsUpdate) {
      // DB 값으로 상태 완전 동기화
      const updatedState = {
        isOrderCompleted: dbValues.isOrderCompleted,
        isFactoryShippingCompleted: dbValues.isFactoryShippingCompleted,
        actualFactoryShippingDate: dbValues.actualFactoryShippingDate,
        expectedFactoryShippingDate: dbValues.expectedFactoryShippingDate,
        actualOrderDate: dbValues.actualOrderDate,
        deliveryStatus: correctDeliveryStatus
      };
      
      setDeliveryState(updatedState);
      
      // 사용자에게 알림 (토스트 중복 방지)
      const toastMessage = `납기상태가 자동으로 수정되었습니다: ${dbValues.deliveryStatus} → ${correctDeliveryStatus}`;
      
      if (dbValues.deliveryStatus !== correctDeliveryStatus && 
          deliveryState.deliveryStatus !== correctDeliveryStatus &&
          lastToastMessage.current !== toastMessage &&
          isInitialized.current) {
        
        lastToastMessage.current = toastMessage;
        
        toast(toastMessage, {
          icon: '🔄',
          duration: 4000
        });
      }
    }
  }, [deliveryState]);

  // Project prop 변경 시 상태 동기화 및 DB 값 검증 (함수 정의 후에 배치)
  useEffect(() => {
    if (project) {
      // 1. 프로젝트 데이터로 상태 동기화
      syncWithProject(project);
      
      // 2. DB 값과 상태 비교하여 납기상태 검증
      validateAndUpdateDeliveryStatus(project);
      
      // 3. 초기화 완료 플래그 설정
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
    }
  }, [project, syncWithProject, validateAndUpdateDeliveryStatus]);

  // DB 저장 함수 (먼저 정의)
  const saveDeliveryData = useCallback(async (dataToSave) => {
    if (!project?.id) {
      toast.error('프로젝트 정보를 찾을 수 없습니다.');
      return false;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return false;
      }

      // Delivery 데이터 저장 시도

      const response = await axios.post(
        `/api/mj-project/${project.id}/delivery`,
        dataToSave,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10초 타임아웃 설정
        }
      );

      // Delivery 데이터 저장 성공
      toast.success('납기 일정이 저장되었습니다.');
      return true;
    } catch (error) {
      console.error('Delivery 데이터 저장 오류:', error);
      
      // 네트워크 오류 처리
      if (error.code === 'ECONNABORTED') {
        toast.error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('네트워크 연결을 확인해주세요.');
      } else {
        const errorMessage = getErrorMessage(error);
        toast.error(errorMessage);
      }
      
      return false;
    }
  }, [project?.id]);

  // 새로운 납기상태 계산 로직 (확장)
  const calculateDeliveryStatus = useCallback((isOrderCompleted, actualFactoryShippingDate) => {
    if (!isOrderCompleted) {
      return '발주 대기';
    } else if (actualFactoryShippingDate) {
      return '입고 대기';
    } else {
      return '출고 대기';
    }
  }, []);

  // 납기상태 자동 업데이트 및 DB 저장 (확장)
  const updateDeliveryStatus = useCallback(async (isOrderCompleted, actualFactoryShippingDate = null) => {
    const newStatus = calculateDeliveryStatus(isOrderCompleted, actualFactoryShippingDate);

    // 로컬 상태 업데이트
    setDeliveryState(prev => ({
      ...prev,
      isOrderCompleted,
      actualFactoryShippingDate: actualFactoryShippingDate || prev.actualFactoryShippingDate,
      deliveryStatus: newStatus
    }));

    // DB에 저장
    try {
      const dataToSave = {
        isOrderCompleted,
        actualFactoryShippingDate: actualFactoryShippingDate || deliveryState.actualFactoryShippingDate,
        deliveryStatus: newStatus
      };

      const success = await saveDeliveryData(dataToSave);
      if (success) {
        toast.success(`납기상태가 "${newStatus}"로 업데이트되었습니다.`);
      }
    } catch (error) {
        console.error('납기상태 DB 저장 실패:', error);
    }
  }, [calculateDeliveryStatus, saveDeliveryData, deliveryState.actualFactoryShippingDate]);

  // actualFactoryShippingDate 변경 시 납기상태 자동 업데이트
  const updateActualFactoryShippingDate = useCallback(async (actualFactoryShippingDate) => {
    // 현재 발주 완료 상태 확인
    const currentIsOrderCompleted = deliveryState.isOrderCompleted;
    
    // 납기상태 자동 계산 및 업데이트
    await updateDeliveryStatus(currentIsOrderCompleted, actualFactoryShippingDate);
  }, [deliveryState.isOrderCompleted, updateDeliveryStatus]);

  // 상태 업데이트 함수 - 실시간 반영을 위한 개선
  const updateDeliveryState = useCallback((updates) => {
    setDeliveryState(prev => {
      const newState = { ...prev, ...updates };
      return newState;
    });
  }, []);

  // 에러 메시지 처리
  const getErrorMessage = (error) => {
    if (error.response?.status === 404) {
      return '프로젝트를 찾을 수 없습니다.';
    } else if (error.response?.status === 401) {
      return '로그인이 필요합니다.';
    } else if (error.response?.status === 403) {
      return '관리자 권한이 필요합니다.';
    } else if (error.response?.status === 500) {
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    return '납기 일정 저장 중 오류가 발생했습니다.';
  };

  // 납기 상태 저장 함수 - 상태만 업데이트하고 API 호출하지 않음
  const saveDeliveryStatus = useCallback(async (status) => {
    // 상태만 업데이트하고 별도 API 호출하지 않음
    // 이 함수는 이제 상태 동기화만 담당
    
    // 상태 변경에 따른 사용자 피드백 - 수정된 상태들
    const statusMessages = {
      '발주대기': '⏳ 발주 완료가 해제되어 납기상태가 "발주대기"로 변경되었습니다!',
      '출고 대기': '📦 발주가 완료되어 납기상태가 "출고 대기"로 변경되었습니다!',
      '공장 출고 완료': '🚚 공장 출고가 완료되어 납기상태가 "공장 출고 완료"로 변경되었습니다!',
      '입고 대기': '📦 공장에서 제품이 출고되어 납기상태가 "입고 대기"로 변경되었습니다!',
      '입고 완료': '🎉 축하합니다! 모든 입고가 완료되어 납기상태가 "입고 완료"로 변경되었습니다!'
    };

    if (statusMessages[status]) {
      toast.success(statusMessages[status]);
    }

    return true;
  }, []);

  return {
    deliveryState,
    isAdmin,
    isAdminLoading,
    updateDeliveryState,
    saveDeliveryData,
    saveDeliveryStatus,
    syncWithProject,
    calculateDeliveryStatus,
    updateDeliveryStatus,
    updateActualFactoryShippingDate
  };
}; 