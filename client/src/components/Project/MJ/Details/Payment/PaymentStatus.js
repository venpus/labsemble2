import React from 'react';

const PaymentStatus = ({ paymentStatus, isAdmin, isAdminLoading }) => {
  return (
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
  );
};

export default PaymentStatus; 