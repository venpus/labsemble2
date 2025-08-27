import React from 'react';

const OrderCheck = ({ project, onDateChange, handleMultipleUpdates, isAdmin, isAdminLoading }) => {
  // 한국 시간대 기준 오늘 날짜 계산
  const getTodayString = () => {
    const today = new Date();
    const kstDate = new Date(today.getTime() + (9 * 60 * 60 * 1000));
    return kstDate.toISOString().split('T')[0];
  };

  // 날짜를 년-월-일 형식으로 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // 예상 공장 출고일 계산 (발주 실제일 + 공장 납기 소요일)
  const calculateExpectedFactoryShippingDate = (orderDate) => {
    if (!orderDate) {
      return null;
    }

    const orderDateObj = new Date(orderDate);
    // 공장 납기 소요일 (DB의 factory_delivery_days 필드 우선 사용, 없으면 기본값 7일)
    const leadTime = project?.factory_delivery_days || 7;
    
    // 발주일 + 납기 소요일 계산
    const expectedDate = new Date(orderDateObj);
    expectedDate.setDate(orderDateObj.getDate() + leadTime);
    
    return expectedDate.toISOString().split('T')[0];
  };

  // 체크박스 상태 변경 처리
  const handleCheckboxChange = (field, checked) => {
    if (field === 'is_order_completed' && checked) {
      // 체크박스가 체크될 때: is_order_completed, actual_order_date, expected_factory_shipping_date를 함께 전송
      const today = getTodayString();
      const expectedFactoryShippingDate = calculateExpectedFactoryShippingDate(today);
      
      if (handleMultipleUpdates && typeof handleMultipleUpdates === 'function') {
        // 다중 업데이트 함수 사용
        const updateData = {
          is_order_completed: 1,
          actual_order_date: today
        };
        
        // 예상 공장 출고일이 계산 가능한 경우에만 추가
        if (expectedFactoryShippingDate) {
          updateData.expected_factory_shipping_date = expectedFactoryShippingDate;
        }
        
        handleMultipleUpdates(updateData);
      } else if (onDateChange && typeof onDateChange === 'function') {
        // 기존 방식으로 개별 업데이트
        onDateChange('is_order_completed', 1);
        onDateChange('actual_order_date', today);
        if (expectedFactoryShippingDate) {
          onDateChange('expected_factory_shipping_date', expectedFactoryShippingDate);
        }
      }
    } else if (field === 'is_order_completed' && !checked) {
      // 체크박스가 해제될 때: is_order_completed만 전송, actual_order_date는 null로 설정
      
      if (handleMultipleUpdates && typeof handleMultipleUpdates === 'function') {
        // 다중 업데이트 함수 사용
        handleMultipleUpdates({
          is_order_completed: 0,
          actual_order_date: null,
          expected_factory_shipping_date: null
        });
      } else if (onDateChange && typeof onDateChange === 'function') {
        // 기존 방식으로 개별 업데이트
        onDateChange('is_order_completed', 0);
        onDateChange('actual_order_date', null);
        onDateChange('expected_factory_shipping_date', null);
      }
    } else {
      // 다른 필드의 경우 기존 로직 사용
      if (onDateChange && typeof onDateChange === 'function') {
        onDateChange(field, checked ? 1 : 0);
      }
    }
  };



  // Admin 권한 상태에 따른 체크박스 비활성화
  const isCheckboxDisabled = !project || isAdminLoading || !isAdmin;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-900">발주</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${
              isCheckboxDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            }`}
            checked={Boolean(project?.is_order_completed)}
            onChange={(e) => handleCheckboxChange('is_order_completed', e.target.checked)}
            disabled={isCheckboxDisabled}
          />
          <span className="text-sm text-gray-700">
            {project?.is_order_completed ? '발주 완료' : '발주 대기'}
          </span>
          {isAdminLoading && (
            <span className="text-xs text-gray-500">(권한 확인 중...)</span>
          )}
          {!isAdminLoading && !isAdmin && (
            <span className="text-xs text-red-500">(Admin 권한 필요)</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        -
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {project?.actual_order_date ? (
          <span className="text-gray-900 font-medium">
            {formatDate(project.actual_order_date)}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {project?.is_order_completed ? (
          <span className="text-green-600 font-medium">발주 완료</span>
        ) : (
          <span className="text-yellow-600">발주 대기</span>
        )}
      </td>
    </tr>
  );
};

export default OrderCheck; 