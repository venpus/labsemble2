import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Plus, Package } from 'lucide-react';

const MJPackingList = () => {
  const navigate = useNavigate();
  const [packingLists, setPackingLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 패킹 리스트 데이터 가져오기
  const fetchPackingLists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const response = await fetch('/api/packing-list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('패킹 리스트 조회에 실패했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        // pl_date별로 그룹화하여 데이터 정리
        const groupedData = result.data.reduce((acc, item) => {
          const plDate = item.pl_date || '날짜 미지정';
          const existingGroup = acc.find(group => group.pl_date === plDate);
          
          if (existingGroup) {
            // 기존 그룹에 상품명 추가
            if (!existingGroup.product_names.includes(item.product_name)) {
              existingGroup.product_names.push(item.product_name);
            }
            
            // packing_code별로 box_count를 추적하여 중복 합산 방지
            if (!existingGroup.packing_codes.includes(item.packing_code)) {
              existingGroup.packing_codes.push(item.packing_code);
              const oldBoxCount = existingGroup.total_box_count;
              existingGroup.total_box_count += (item.box_count || 0);
              console.log(`🔄 [MJPackingList] ${plDate} 그룹에 새로운 포장코드 ${item.packing_code} 추가: ${oldBoxCount} + ${item.box_count || 0} = ${existingGroup.total_box_count}`);
            } else {
              console.log(`ℹ️ [MJPackingList] ${plDate} 그룹에 이미 존재하는 포장코드 ${item.packing_code} - 박스수 중복 합산 방지`);
            }
            
            // 물류회사가 다를 경우 배열에 추가 (중복 제거)
            if (item.logistic_company && !existingGroup.logistic_companies.includes(item.logistic_company)) {
              existingGroup.logistic_companies.push(item.logistic_company);
            }
          } else {
            // 새로운 그룹 생성
            acc.push({
              pl_date: plDate,
              total_box_count: item.box_count || 0,
              packing_codes: [item.packing_code], // 포장코드 추적을 위한 배열 추가
              product_names: [item.product_name],
              logistic_companies: item.logistic_company ? [item.logistic_company] : [],
              created_at: item.created_at,
              updated_at: item.updated_at
            });
          }
          
          return acc;
        }, []);
        
        // pl_date 기준으로 정렬 (최신 날짜가 위로)
        groupedData.sort((a, b) => {
          if (a.pl_date === '날짜 미지정') return 1;
          if (b.pl_date === '날짜 미지정') return -1;
          return new Date(b.pl_date) - new Date(a.pl_date);
        });

        setPackingLists(groupedData);
        console.log('📊 [MJPackingList] 패킹 리스트 데이터 로드 완료:', {
          totalGroups: groupedData.length,
          groupDetails: groupedData.map(group => ({
            pl_date: group.pl_date,
            packing_codes: group.packing_codes,
            total_box_count: group.total_box_count,
            product_count: group.product_names.length,
            logistic_companies: group.logistic_companies
          }))
        });
      } else {
        throw new Error(result.error || '패킹 리스트 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ [MJPackingList] 패킹 리스트 조회 오류:', error);
      setError(error.message);
      toast.error('패킹 리스트 조회에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 사용자 권한 확인
  const checkUserRole = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // JWT 토큰에서 사용자 정보 추출
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload.isAdmin || false);
        console.log('🔐 [MJPackingList] 사용자 권한 확인:', {
          isAdmin: payload.isAdmin,
          userId: payload.userId
        });
      }
    } catch (error) {
      console.error('❌ [MJPackingList] 사용자 권한 확인 오류:', error);
      setIsAdmin(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드 및 권한 확인
  useEffect(() => {
    checkUserRole();
    fetchPackingLists();
  }, []);

  // 새로고침 버튼 클릭
  const handleRefresh = () => {
    fetchPackingLists();
  };

  // 출고일자 클릭 시 상세페이지로 이동
  const handleDateClick = (plDate) => {
    console.log('🔗 [MJPackingList] 출고일자 클릭 시작');
    console.log('🔗 [MJPackingList] 클릭된 출고일자:', plDate);
    
    // 즉시 피드백 제공
    toast.success(`${plDate} 상세페이지로 이동합니다...`);
    
    // 날짜를 URL 파라미터로 전달 (날짜 미지정인 경우 'no-date'로 처리)
    const dateParam = plDate === '날짜 미지정' ? 'no-date' : plDate;
    const targetPath = `/dashboard/mj-packing-list/date/${dateParam}`;
    console.log('🔗 [MJPackingList] 이동할 경로:', targetPath);
    
    try {
      console.log('🔗 [MJPackingList] navigate 함수 호출 시작');
      navigate(targetPath);
      console.log('🔗 [MJPackingList] navigate 함수 호출 완료');
    } catch (error) {
      console.error('❌ [MJPackingList] 네비게이션 오류:', error);
      toast.error('페이지 이동에 실패했습니다: ' + error.message);
    }
  };

  // 패킹리스트 작성 페이지로 이동
  const handleCreatePackingList = () => {
    console.log('🔗 [MJPackingList] 패킹리스트 작성 버튼 클릭');
    toast.success('패킹리스트 작성 페이지로 이동합니다...');
    navigate('/dashboard/mj-packing-list/create');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64">
        <div className="text-red-600 text-lg mb-4">오류가 발생했습니다</div>
        <div className="text-gray-600 mb-4">{error}</div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">MJ 패킹 리스트</h1>
            <p className="text-gray-600">출고일자별로 그룹화된 패킹 리스트 정보를 확인할 수 있습니다.</p>
          </div>
          
          {/* 패킹리스트 작성 버튼 - Admin 권한 사용자에게만 표시 */}
          {isAdmin && (
            <button
              onClick={handleCreatePackingList}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
              title="새 패킹리스트 작성 (Admin 전용)"
            >
              <Plus className="w-5 h-5 mr-2" />
              패킹리스트 작성
            </button>
          )}
        </div>
      </div>

      {/* 새로고침 버튼 */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          총 {packingLists.length}개의 출고일자
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          새로고침
        </button>
      </div>

      {/* 패킹 리스트 테이블 */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  출고일자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  총 박스수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  포함 상품명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  물류회사
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {packingLists.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    저장된 패킹 리스트가 없습니다.
                  </td>
                </tr>
              ) : (
                packingLists.map((item, index) => (
                  <tr 
                    key={item.pl_date} 
                    className="hover:bg-blue-50 cursor-pointer transition-colors duration-200"
                    onClick={() => handleDateClick(item.pl_date)}
                    title={`${item.pl_date} 상세보기 - 클릭하여 상세페이지로 이동`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium hover:bg-blue-100 transition-colors">
                          📅 {item.pl_date === '날짜 미지정' ? '날짜 미지정' : new Date(item.pl_date).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <span className="font-semibold text-lg text-blue-600">
                          {item.total_box_count.toLocaleString()} 박스
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1 max-w-md">
                        {item.product_names.map((productName, productIndex) => (
                          <div key={productIndex} className="flex items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {productName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        {item.logistic_companies.length > 0 ? (
                          item.logistic_companies.map((company, companyIndex) => (
                            <span key={companyIndex} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {company}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">미지정</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 데이터 요약 */}
      {packingLists.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-2">📊 데이터 요약:</div>
            <div>• 총 출고일자: {packingLists.length}개</div>
            <div>• 총 상품 수: {packingLists.reduce((sum, item) => sum + item.product_names.length, 0)}개</div>
            <div>• 총 박스 수: {packingLists.reduce((sum, item) => sum + item.total_box_count, 0).toLocaleString()}박스 (포장코드별 1회씩 합산)</div>
            <div>• 사용된 물류회사: {Array.from(new Set(packingLists.flatMap(item => item.logistic_companies))).join(', ') || '없음'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MJPackingList; 