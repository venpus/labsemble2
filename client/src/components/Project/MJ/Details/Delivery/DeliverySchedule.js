import React, { useState, useRef } from 'react';
import { Calendar, Clock, Package, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import WarehouseEntry from './WarehouseEntry';

const DeliverySchedule = ({
  project,
  actualOrderDate,
  expectedFactoryShippingDate,
  actualFactoryShippingDate,
  isOrderCompleted,
  isFactoryShippingCompleted,
  isAdmin,
  isAdminLoading,
  onUpdate,
  onSave
}) => {
  // 날짜 형식 처리 유틸리티 함수 - 한국 시간대 고려
  const formatDateForDB = (dateValue) => {
    if (!dateValue || dateValue === '') {
      return null;
    }
    
    try {
      // 이미 YYYY-MM-DD 형식인 경우 그대로 사용
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return null;
      }
      
      // 한국 시간대(KST)로 변환하여 YYYY-MM-DD 형식 반환
      const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
      return kstDate.toISOString().split('T')[0];
    } catch (error) {
      console.error('날짜 형식 처리 오류:', error);
      return null;
    }
  };

  // 발주 완료 상태 변경 처리
  const handleOrderStatusChange = async () => {
    if (!isAdmin) {
      toast.error('관리자 권한이 필요합니다.');
      return;
    }

    if (isAdminLoading) {
      toast.error('권한 확인 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const newStatus = !isOrderCompleted;
    
    // 한국 시간대(KST) 고려한 오늘 날짜 계산
    const today = new Date();
    const kstDate = new Date(today.getTime() + (9 * 60 * 60 * 1000));
    const todayString = kstDate.toISOString().split('T')[0];
    
    // 날짜 계산 완료
    
    // 발주 완료 시 예상 출고일 자동 계산, 해제 시 초기화
    let calculatedExpectedDate = '';
    if (newStatus && project.factory_delivery_days) {
      const deliveryDays = parseInt(project.factory_delivery_days);
      if (deliveryDays > 0) {
        const expectedDate = new Date(todayString);
        expectedDate.setDate(expectedDate.getDate() + deliveryDays);
        calculatedExpectedDate = expectedDate.toISOString().split('T')[0];
        // 예상 출고일 자동 계산 완료
      }
    } else if (!newStatus) {
      // 발주 완료 해제 시 예상 출고일 초기화
      calculatedExpectedDate = '';
    }
    
    // DB 저장할 데이터 준비
    const dataToSave = {
      isOrderCompleted: newStatus,
      actualOrderDate: newStatus ? todayString : '',
      expectedFactoryShippingDate: calculatedExpectedDate
    };

    // DB 저장 데이터 준비 완료

    try {
      const success = await onSave(dataToSave);
      
      if (success) {
        // 상태 업데이트 (납기상태는 자동으로 계산됨)
        const allUpdates = {
          isOrderCompleted: newStatus,
          actualOrderDate: newStatus ? todayString : '',
          expectedFactoryShippingDate: calculatedExpectedDate
        };
        
        // 상태 업데이트만 수행 (API 호출은 하지 않음)
        onUpdate(allUpdates);
        
        // 사용자에게 피드백 제공
        if (newStatus) {
          if (calculatedExpectedDate) {
            toast.success(`발주 완료! 예상 출고일이 ${calculatedExpectedDate}로 자동 설정되었습니다.`);
          } else {
            toast.success('발주 완료! (공장 납기소요일이 설정되지 않아 예상 출고일을 자동 계산할 수 없습니다.)');
          }
        } else {
          toast.success('발주 완료 상태가 해제되었습니다.');
        }
      } else {
        console.log('❌ DB 저장 실패');
        toast.error('발주 상태 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('❌ 발주 상태 변경 중 오류:', error);
      
      // 구체적인 에러 메시지 제공
      if (error.response?.status === 403) {
        toast.error('관리자 권한이 필요합니다.');
      } else if (error.response?.status === 401) {
        toast.error('로그인이 필요합니다.');
      } else if (error.response?.status === 500) {
        toast.error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error('발주 상태 변경 중 오류가 발생했습니다.');
      }
    }
  };

  // const handleExpectedDateChange = async (newDate) => { ... };

  // 입고 내용 저장 함수 (저장 버튼이 제거되어 더 이상 사용되지 않음)
  // const handleWarehouseEntrySave = async () => { ... };

  // 컴포넌트 마운트 시 기본값 설정 (선택사항)
  // React.useEffect(() => {
  //   // 기본값을 설정하지 않고 null로 유지
  // }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 발주 완료 섹션 */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex flex-col h-full">
              <div className="flex items-center mb-3">
                <ShoppingCart className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">발주 완료</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    실제 발주가 완료되었는지 확인하고 완료일을 기록합니다.
                  </p>
                </div>
              </div>
              
              <div className="mt-auto">
                {/* 발주 완료일 표시 */}
                {isOrderCompleted && (
                  <div className="text-sm text-blue-700 mb-3">
                    <span className="font-medium">발주일:</span> {actualOrderDate || '오늘'}
                  </div>
                )}
                
                {/* 발주 완료 체크박스 */}
                <label className={`flex items-center ${!isAdmin || isAdminLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={isOrderCompleted}
                    onChange={handleOrderStatusChange}
                    disabled={!isAdmin || isAdminLoading}
                    className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-2 focus:ring-offset-2 ${
                      !isAdmin || isAdminLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                  <span className={`ml-2 text-sm ${!isAdmin || isAdminLoading ? 'text-blue-500' : 'text-blue-700'}`}>
                    {!isAdmin || isAdminLoading ? '권한 확인 중...' : '발주 완료'}
                  </span>
                </label>
                

              </div>
            </div>
          </div>

          {/* 예상 공장 출고일 섹션 */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex flex-col h-full">
              <div className="flex items-center mb-3">
                <Calendar className="w-5 h-5 text-orange-600 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-orange-900">예상 공장 출고일</h4>
                  <p className="text-xs text-orange-700 mt-1">
                    공장에서 제품을 출고할 예상 날짜를 설정합니다.
                  </p>
                </div>
              </div>
              
              <div className="mt-auto">
                {/* 예상 출고일 표시 */}
                {isOrderCompleted && expectedFactoryShippingDate && (
                  <div className="text-sm text-orange-700 mb-3">
                    <span className="font-medium">예상 출고일:</span> {expectedFactoryShippingDate}
                    <span className="text-xs text-orange-500 ml-2">(자동 계산됨)</span>
                  </div>
                )}
                

                
                {/* 예상 출고일 안내 */}
                <div className="text-sm text-orange-700">
                  {isOrderCompleted ? (
                    <div>
                      {expectedFactoryShippingDate ? (
                        <div className="text-xs text-orange-500 mt-1">
                          (자동 계산됨 - 발주일 + {project.factory_delivery_days || '?'}일)
                        </div>
                      ) : (
                        <div className="text-orange-600">
                          예상 출고일 계산 중...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-orange-600">
                      발주 완료 후 자동으로 계산됩니다.
                    </div>
                  )}
                </div>
                
                {/* 공장 납기소요일이 설정되지 않은 경우 안내 */}
                {isOrderCompleted && !project.factory_delivery_days && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    ⚠️ 공장 납기소요일이 설정되지 않아 예상 출고일을 자동 계산할 수 없습니다.
                    <br />
                    <span className="text-yellow-700">ProdInfo에서 공장 납기소요일을 설정해주세요.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 공장 출고 완료 섹션 */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex flex-col h-full">
              <div className="flex items-center mb-3">
                <Package className="w-5 h-5 text-purple-600 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-purple-900">공장 출고 완료</h4>
                  <p className="text-xs text-purple-700 mt-1">
                    공장에서 제품 출고가 완료되었는지 확인하고 출고일을 기록합니다.
                  </p>
                </div>
              </div>
              
              <div className="mt-auto">
                {/* 공장 출고 상태 표시 */}
                <div className="text-sm text-purple-700 mb-3">
                  {isFactoryShippingCompleted ? (
                    <div>
                      <span className="font-medium">출고일:</span> {actualFactoryShippingDate || '오늘'}
                    </div>
                  ) : (
                    <div className="text-purple-600">
                      공장 출고 대기 중
                    </div>
                  )}
                </div>
                
                {/* 공장 출고 완료 상태 표시 (체크박스 제거됨) */}
                <div className={`text-sm ${isFactoryShippingCompleted ? 'text-purple-700' : 'text-purple-500'}`}>
                  {isFactoryShippingCompleted ? '공장 출고 완료' : '공장 출고 대기 중'}
                </div>
                
                {/* 출고일 선택 입력 필드 */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-purple-700 mb-2">
                    출고일 선택
                  </label>
                  <input
                    type="date"
                    value={actualFactoryShippingDate || ''}
                    onChange={async (e) => {
                      const newDate = e.target.value;
                      console.log('📅 공장 출고일 변경:', newDate);
                      
                      // 날짜가 선택되면 공장 출고 완료 상태를 true로 설정
                      const newStatus = !!newDate;
                      
                      // DB에 저장
                      const dataToSave = {
                        isFactoryShippingCompleted: newStatus,
                        actualFactoryShippingDate: newDate || null
                      };
                      
                      const success = await onSave(dataToSave);
                      if (success) {
                        // 저장 성공 시 상태 업데이트
                        onUpdate({
                          isFactoryShippingCompleted: newStatus,
                          actualFactoryShippingDate: newDate || null
                        });
                        
                        // 출고일이 설정되면 납기상태를 "입고 대기"로 변경
                        if (newDate && isOrderCompleted) {
                          console.log('🚚 공장 출고 완료 - 납기상태를 "입고 대기"로 변경');
                          onUpdate({ deliveryStatus: '입고 대기' });
                          toast.success(`공장 출고일이 ${newDate}로 설정되었습니다. 납기상태가 "입고 대기"로 변경되었습니다.`);
                        } else if (!newDate) {
                          // 출고일이 해제되면 납기상태를 "출고 대기"로 변경
                          console.log('🔄 공장 출고일 해제 - 납기상태를 "출고 대기"로 변경');
                          onUpdate({ deliveryStatus: '출고 대기' });
                          toast.success('공장 출고일이 해제되었습니다. 납기상태가 "출고 대기"로 변경되었습니다.');
                        }
                      } else {
                        toast.error('공장 출고일 저장에 실패했습니다.');
                      }
                    }}
                    disabled={!isAdmin}
                    className="w-full px-2 py-1 text-sm border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                
                {/* 출고일 안내 메시지 */}
                <div className="mt-2 text-xs text-purple-600">
                  {actualFactoryShippingDate ? (
                    <span>✅ 출고일이 설정되었습니다. 납기상태가 "입고 대기"로 변경되었습니다.</span>
                  ) : (
                    <span>📅 출고일을 선택하면 자동으로 출고 완료 상태가 됩니다.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 입고 기록 컴포넌트 */}
      <WarehouseEntry 
        project={project}
        isAdmin={isAdmin}
        isAdminLoading={isAdminLoading}
        onDeliveryStatusChange={(newStatus) => {
          // 납기상태 변경을 부모 컴포넌트로 전달
          if (onUpdate) {
            onUpdate({ deliveryStatus: newStatus });
          }
        }}
      />
    </div>
  );
};

export default DeliverySchedule; 