import React, { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const MJPackingList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 새 패킹리스트 생성 페이지로 이동
  const handleCreateNewPackingList = () => {
    navigate('/dashboard/mj-packing-list/create');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MJ 패킹리스트</h1>
            <p className="text-gray-600">MJ 프로젝트의 패킹리스트를 관리합니다</p>
          </div>
        </div>
      </div>

      {/* 새 패킹리스트 생성 버튼 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="text-center">
          <button
            onClick={handleCreateNewPackingList}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 패킹리스트 생성
          </button>
        </div>
      </div>

            {/* 프로젝트 목록 제거됨 */}
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            MJ 패킹리스트 관리
          </h2>
          <p className="text-gray-600 mb-6">
            MJ 프로젝트의 패킹리스트를 관리할 수 있습니다.
          </p>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              • 새 패킹리스트 생성: 새로운 패킹리스트를 만들 수 있습니다
            </p>
            <p className="text-sm text-gray-500">
              • 패킹리스트 관리: 기존 패킹리스트를 편집하고 관리할 수 있습니다
            </p>
          </div>
        </div>
      </div>


    </div>
  );
};

export default MJPackingList; 