import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar Component */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              환영합니다, {user?.username}님!
            </h1>
            <p className="text-gray-600 mb-6">
              LABSEMBLE 대시보드에 오신 것을 환영합니다.
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">주문 현황</h3>
                <p className="text-2xl font-bold text-blue-600">0</p>
                <p className="text-sm text-blue-600">진행 중인 주문</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-green-800 mb-2">견적 요청</h3>
                <p className="text-2xl font-bold text-green-600">0</p>
                <p className="text-sm text-green-600">대기 중인 견적</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-800 mb-2">프로젝트</h3>
                <p className="text-2xl font-bold text-purple-600">0</p>
                <p className="text-sm text-purple-600">진행 중인 프로젝트</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">최근 활동</h3>
              <p className="text-gray-600 text-center py-8">
                아직 활동 내역이 없습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 