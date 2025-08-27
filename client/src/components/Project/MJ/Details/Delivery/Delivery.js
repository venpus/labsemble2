import React, { useCallback } from 'react';
import { Truck, Calendar, Clock, Package, ShoppingCart, Lock } from 'lucide-react';
import DeliveryHeader from './DeliveryHeader';
import DeliverySchedule from './DeliverySchedule';
import { useDeliveryState } from './hooks/useDeliveryState';

const Delivery = ({ project }) => {
  // Custom Hook을 사용한 상태 관리
  const {
    deliveryState,
    isAdmin,
    isAdminLoading,
    updateDeliveryState,
    saveDeliveryData,
    saveDeliveryStatus,
    updateDeliveryStatus,
    updateActualFactoryShippingDate
  } = useDeliveryState(project);

  // 납기 상태 업데이트 처리 - 납기상태 자동 계산 포함 (확장)
  const handleDeliveryUpdate = useCallback(async (updates) => {
    // isOrderCompleted가 변경된 경우 납기상태 자동 업데이트
    if ('isOrderCompleted' in updates) {
      await updateDeliveryStatus(updates.isOrderCompleted);
    } else if ('actualFactoryShippingDate' in updates) {
      // actualFactoryShippingDate가 변경된 경우 납기상태 자동 업데이트
      await updateActualFactoryShippingDate(updates.actualFactoryShippingDate);
    } else {
      // 다른 상태 업데이트는 일반적으로 처리
      updateDeliveryState(updates);
    }
  }, [updateDeliveryState, updateDeliveryStatus, updateActualFactoryShippingDate]);





  return (
    <div className="space-y-6">
      {/* 납기 일정 헤더 */}
      <DeliveryHeader 
        deliveryStatus={deliveryState.deliveryStatus}
        onStatusChange={(status) => {
          handleDeliveryUpdate({ deliveryStatus: status });
        }}
      />

      {/* 납기 일정 관리 */}
      <DeliverySchedule
        project={project}
        actualOrderDate={deliveryState.actualOrderDate}
        expectedFactoryShippingDate={deliveryState.expectedFactoryShippingDate}
        actualFactoryShippingDate={deliveryState.actualFactoryShippingDate}
        isOrderCompleted={deliveryState.isOrderCompleted}
        isFactoryShippingCompleted={deliveryState.isFactoryShippingCompleted}
        isAdmin={isAdmin}
        isAdminLoading={isAdminLoading}
        onUpdate={handleDeliveryUpdate}
        onSave={saveDeliveryData}
      />
    </div>
  );
};

export default Delivery; 