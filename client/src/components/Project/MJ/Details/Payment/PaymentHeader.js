import React from 'react';
import { DollarSign } from 'lucide-react';

const PaymentHeader = ({ isAdmin, isAdminLoading, paymentStatus }) => {
  return (
    <div className="border-b border-gray-200 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            결제 정보
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            프로젝트의 가격 및 결제 관련 정보를 확인할 수 있습니다.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* 결제 상태 정보 */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">결제 상태</h3>
            <div className="flex items-center">
              {paymentStatus.advance && paymentStatus.balance ? (
                // 선금과 잔금이 모두 완료된 경우 - 결제 완료
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
                  <span className="text-sm text-gray-600">결제 완료</span>
                </div>
              ) : paymentStatus.advance ? (
                // 선금만 완료된 경우 - 잔금 대기
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-400 mr-2"></div>
                  <span className="text-sm text-gray-600">잔금 대기</span>
                </div>
              ) : (
                // 아무것도 완료되지 않은 경우 - 선금 대기
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
                  <span className="text-sm text-gray-600">선금 대기</span>
                </div>
              )}
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

export default PaymentHeader; 