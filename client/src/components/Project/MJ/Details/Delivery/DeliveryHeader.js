import React from 'react';
import { Truck, Clock, Package, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const DeliveryHeader = ({ deliveryStatus, onStatusChange }) => {
  // 납기 상태에 따른 아이콘과 색상 설정
  const getStatusConfig = (status) => {
    switch (status) {
      case '발주대기':
        return {
          icon: AlertCircle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800'
        };
      case '출고 대기':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800'
        };
      case '공장 출고 완료':
        return {
          icon: Truck,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200',
          textColor: 'text-indigo-800'
        };
      case '입고 대기':
        return {
          icon: Package,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800'
        };
      case '입고중':
        return {
          icon: Loader2,
          color: 'text-purple-600',
          bgColor: 'bg-gradient-to-r from-purple-50 to-pink-50',
          borderColor: 'border-purple-300',
          textColor: 'text-purple-800',
          special: true // 특별한 스타일 적용을 위한 플래그
        };
      case '입고 완료':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800'
        };
    }
  };

  const statusConfig = getStatusConfig(deliveryStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="border-b border-gray-200 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Truck className="w-5 h-5 mr-2 text-blue-600" />
            납기 일정
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            프로젝트의 발주 및 공장 출고 일정을 관리할 수 있습니다.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* 납기 상태 표시 - 실시간 업데이트 */}
          <div className={`${statusConfig.bgColor} p-4 rounded-lg border-2 ${statusConfig.borderColor} ${
            statusConfig.special 
              ? 'shadow-lg shadow-purple-200/50 transform hover:scale-105 transition-all duration-300' 
              : 'shadow-sm'
          } transition-all duration-200`}>
            <h3 className="text-sm font-medium text-gray-900 mb-2">납기 상태</h3>
            <div className="flex items-center">
              <StatusIcon className={`w-5 h-5 mr-2 ${statusConfig.color} ${
                statusConfig.special ? 'animate-spin' : ''
              } transition-colors duration-200`} />
              <span className={`text-sm font-medium ${statusConfig.textColor} ${
                statusConfig.special ? 'font-bold' : ''
              } transition-all duration-200`}>
                {deliveryStatus || '상태 확인 중...'}
              </span>
            </div>
            
            {/* 실시간 상태 변경 표시 */}
            <div className="mt-1 text-xs text-gray-500">
              실시간 업데이트
            </div>
            
            {/* 입고중 상태일 때 추가 시각적 효과 */}
            {statusConfig.special && (
              <div className="mt-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <div className="mt-1 text-xs text-purple-600 font-medium">
                  🚚 입고 진행 중...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryHeader; 