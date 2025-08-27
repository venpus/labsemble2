import React from 'react';
import DeliveryHeader from './DeliveryHeader';
import WarehouseEntry from './WarehouseEntry';
import { useDeliveryState } from './hooks/useDeliveryState';

const Delivery = ({ project }) => {
  // Custom Hook을 사용한 상태 관리
  const {
    isAdmin,
    isAdminLoading,
    updateDeliveryState
  } = useDeliveryState(project);

  // 납기 상태 업데이트 처리
  const handleDeliveryUpdate = (updates) => {
    updateDeliveryState(updates);
  };

  return (
    <div className="space-y-6">
      {/* 납기 일정 헤더 */}
      <DeliveryHeader project={project} />

      {/* 입고 기록 컴포넌트 */}
      <WarehouseEntry 
        project={project}
        isAdmin={isAdmin}
        isAdminLoading={isAdminLoading}
        onDeliveryStatusChange={(newStatus) => {
          handleDeliveryUpdate({ deliveryStatus: newStatus });
        }}
      />
    </div>
  );
};

export default Delivery; 