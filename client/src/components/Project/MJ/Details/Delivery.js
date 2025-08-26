import React, { useState, useEffect } from 'react';
import { Truck, Calendar, Clock, Package, ShoppingCart, Lock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Delivery = ({ project }) => {
  // admin 권한 상태
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  // 납기 일정 상태
  const [actualOrderDate, setActualOrderDate] = useState('');
  const [expectedFactoryShippingDate, setExpectedFactoryShippingDate] = useState('');
  const [actualFactoryShippingDate, setActualFactoryShippingDate] = useState('');
  const [isOrderCompleted, setIsOrderCompleted] = useState(false);
  const [isFactoryShippingCompleted, setIsFactoryShippingCompleted] = useState(false);

  // 컴포넌트 마운트 시 admin 권한 확인
  useEffect(() => {
    console.log('🚀 Delivery 컴포넌트 마운트, project:', project);
    
    const checkAdminStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('🔑 토큰이 없습니다.');
          setIsAdmin(false);
          setIsAdminLoading(false);
          return;
        }

        console.log('🔍 Admin 권한 확인 중...');
        const response = await axios.get('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('👤 사용자 정보:', response.data);
        const adminStatus = response.data.is_admin || false;
        console.log('👑 Admin 권한:', adminStatus);
        
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('❌ Admin 권한 확인 오류:', error);
        setIsAdmin(false);
      } finally {
        setIsAdminLoading(false);
        console.log('✅ Admin 권한 확인 완료. isAdmin:', isAdmin, 'isAdminLoading:', false);
      }
    };

    checkAdminStatus();
  }, []);

  // project prop 변경 시 상태 업데이트
  useEffect(() => {
    console.log('🔄 Project prop 변경 감지:', project);
    
    if (project) {
      console.log('📦 Project 데이터 업데이트:', {
        actual_order_date: project.actual_order_date,
        expected_factory_shipping_date: project.expected_factory_shipping_date,
        actual_factory_shipping_date: project.actual_factory_shipping_date,
        is_order_completed: project.is_order_completed,
        is_factory_shipping_completed: project.is_factory_shipping_completed
      });

      // 실제 발주일 상태 업데이트
      const orderDate = project.actual_order_date || '';
      setActualOrderDate(orderDate);
      console.log('📅 실제 발주일 상태 설정:', orderDate, '원본 DB 값:', project.actual_order_date);

      // 예상 공장 출고일 상태 업데이트
      const expectedDate = project.expected_factory_shipping_date || '';
      setExpectedFactoryShippingDate(expectedDate);
      console.log('📦 예상 공장 출고일 상태 설정:', expectedDate, '원본 DB 값:', project.expected_factory_shipping_date);

      // 실제 공장 출고일 상태 업데이트
      const actualDate = project.actual_factory_shipping_date || '';
      setActualFactoryShippingDate(actualDate);
      console.log('🚚 실제 공장 출고일 상태 설정:', actualDate, '원본 DB 값:', project.actual_factory_shipping_date);

      // 발주 완료 상태 업데이트
      const orderCompleted = project.is_order_completed || false;
      setIsOrderCompleted(orderCompleted);
      console.log('✅ 발주 완료 상태 설정:', orderCompleted, '원본 DB 값:', project.is_order_completed);

      // 공장 출고 완료 상태 업데이트
      const shippingCompleted = project.is_factory_shipping_completed || false;
      setIsFactoryShippingCompleted(shippingCompleted);
      console.log('🏭 공장 출고 완료 상태 설정:', shippingCompleted, '원본 DB 값:', project.is_factory_shipping_completed);
    } else {
      console.log('⚠️ Project prop이 없습니다.');
    }
  }, [project]);

  // 날짜 형식 처리 유틸리티 함수
  const formatDateForDB = (dateValue) => {
    if (!dateValue || dateValue === '') {
      return null;
    }
    
    // 이미 YYYY-MM-DD 형식인 경우
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    
    // Date 객체나 ISO 문자열인 경우 YYYY-MM-DD로 변환
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('날짜 변환 오류:', error);
      return null;
    }
  };

  // 납기 일정 정보를 DB에 저장하는 함수
  const saveDeliveryScheduleToDB = async (fieldName, value) => {
    if (!isAdmin) {
      toast.error('admin 권한이 필요합니다.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      // 날짜 필드인지 체크박스 필드인지 구분
      const isDateField = ['actual_order_date', 'expected_factory_shipping_date', 'actual_factory_shipping_date'].includes(fieldName);
      const isCheckboxField = ['is_order_completed', 'is_factory_shipping_completed'].includes(fieldName);
      
      let processedValue;
      if (isDateField) {
        processedValue = formatDateForDB(value);
      } else if (isCheckboxField) {
        processedValue = value; // boolean 값 그대로 사용
      } else {
        processedValue = value; // 기타 필드는 그대로 사용
      }

      const updateData = {
        [fieldName]: processedValue
      };

      await axios.patch(
        `/api/mj-project/${project.id}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success('납기 일정이 저장되었습니다.');
      console.log(`${fieldName}가 DB에 저장되었습니다:`, processedValue);
    } catch (error) {
      console.error(`${fieldName} 저장 오류:`, error);
      toast.error('납기 일정 저장 중 오류가 발생했습니다.');
    }
  };

  // 날짜 변경 처리 함수들
  const handleActualOrderDateChange = async (newDate) => {
    setActualOrderDate(newDate);
    await saveDeliveryScheduleToDB('actual_order_date', newDate);
  };

  const handleExpectedFactoryShippingDateChange = async (newDate) => {
    setExpectedFactoryShippingDate(newDate);
    await saveDeliveryScheduleToDB('expected_factory_shipping_date', newDate);
  };

  // 실제 공장 출고일 변경 처리 함수
  const handleActualFactoryShippingDateChange = async (newDate) => {
    setActualFactoryShippingDate(newDate);
    
    // 날짜가 설정되면 공장 출고 완료 상태도 자동으로 true로 설정
    if (newDate) {
      setIsFactoryShippingCompleted(true);
      // 공장 출고 완료 상태도 함께 저장
      await saveDeliveryScheduleToDB('is_factory_shipping_completed', true);
    } else {
      setIsFactoryShippingCompleted(false);
      // 날짜가 삭제되면 공장 출고 완료 상태도 false로 설정
      await saveDeliveryScheduleToDB('is_factory_shipping_completed', false);
    }
    
    await saveDeliveryScheduleToDB('actual_factory_shipping_date', newDate);
  };

  // 발주완료 체크박스 변경 처리 함수
  const handleOrderCompletedChange = async (checked) => {
    setIsOrderCompleted(checked);
    await saveDeliveryScheduleToDB('is_order_completed', checked);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {!isAdminLoading && !isAdmin && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center">
            <Lock className="w-4 h-4 mr-2 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              납기 일정 수정은 admin 권한이 필요합니다. 현재 읽기 전용 모드입니다.
            </span>
          </div>
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Truck className="w-6 h-6 text-orange-600 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">납기 정보</h2>
        </div>

        {/* 공장 납기소요일 카드 */}
        <div className="bg-orange-50 p-6 rounded-lg border border-orange-200 mb-6">
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-orange-900">공장 납기소요일</h3>
          </div>
          
          <div className="space-y-3">
            <div className="text-2xl font-bold text-orange-900">
              {project.factory_delivery_days ? `${project.factory_delivery_days}일` : '설정되지 않음'}
            </div>
            
            <div className="text-sm text-orange-700">
              공장에서 제품 생산 완료 후 납기까지 소요되는 기간입니다.
            </div>
          </div>
        </div>

        {/* 납기 일정 정보 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* 실제 발주일 */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center mb-4">
              <ShoppingCart className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-blue-900">실제 발주일</h3>
            </div>
            
            <div className="space-y-3">
              {!isAdminLoading && isAdmin ? (
                <div>
                  <input
                    type="date"
                    value={actualOrderDate}
                    onChange={(e) => handleActualOrderDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="text-xs text-blue-600 mt-1">
                    DB 값: {project.actual_order_date || 'NULL'} | 로컬 상태: {actualOrderDate || '빈 값'}
                  </div>
                </div>
              ) : !isAdminLoading ? (
                <div>
                  <div className="text-2xl font-bold text-blue-900">
                    {actualOrderDate ? new Date(actualOrderDate).toLocaleDateString('ko-KR') : '미설정'}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    DB 값: {project.actual_order_date || 'NULL'} | 로컬 상태: {actualOrderDate || '빈 값'}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">권한 확인 중...</div>
              )}
              
              <div className="text-sm text-blue-700">
                실제로 공장에 발주한 날짜입니다.
              </div>
              
              {/* 발주완료 체크박스 */}
              <div className="flex items-center space-x-3">
                {!isAdminLoading && isAdmin ? (
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOrderCompleted}
                      onChange={(e) => handleOrderCompletedChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-white border-blue-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-blue-900">발주 완료</span>
                  </label>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded border-2 ${
                      isOrderCompleted 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'bg-white border-gray-300'
                    }`}>
                      {isOrderCompleted && (
                        <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-blue-900">발주 완료</span>
                  </div>
                )}
                
                {isOrderCompleted && (
                  <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    발주 완료
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 예상 공장 출고일 */}
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <div className="flex items-center mb-4">
              <Package className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-green-900">예상 공장 출고일</h3>
            </div>
            
            <div className="space-y-3">
              {!isAdminLoading && isAdmin ? (
                <input
                  type="date"
                  value={expectedFactoryShippingDate}
                  onChange={(e) => handleExpectedFactoryShippingDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              ) : !isAdminLoading ? (
                <div className="text-2xl font-bold text-green-900">
                  {expectedFactoryShippingDate ? new Date(expectedFactoryShippingDate).toLocaleDateString('ko-KR') : '미설정'}
                </div>
              ) : (
                <div className="text-gray-400">권한 확인 중...</div>
              )}
              
              <div className="text-sm text-green-700">
                공장에서 제품 출고 예정일입니다.
              </div>
              
              {expectedFactoryShippingDate && (
                <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full inline-block">
                  출고 예정
                </div>
              )}
            </div>
          </div>

          {/* 실제 공장 출고일 */}
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <div className="flex items-center mb-4">
              <Truck className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-semibold text-purple-900">실제 공장 출고일</h3>
            </div>
            
            <div className="space-y-3">
              {!isAdminLoading && isAdmin ? (
                <input
                  type="date"
                  value={actualFactoryShippingDate}
                  onChange={(e) => handleActualFactoryShippingDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              ) : !isAdminLoading ? (
                <div className="text-2xl font-bold text-purple-900">
                  {actualFactoryShippingDate ? new Date(actualFactoryShippingDate).toLocaleDateString('ko-KR') : '미설정'}
                </div>
              ) : (
                <div className="text-gray-400">권한 확인 중...</div>
              )}
              
              <div className="text-sm text-purple-700">
                공장에서 실제로 제품이 출고된 날짜입니다.
              </div>
              
              {/* 공장 출고 완료 상태 표시 */}
              <div className="flex items-center space-x-3">
                {!isAdminLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded border-2 ${
                      isFactoryShippingCompleted 
                        ? 'bg-purple-600 border-purple-600' 
                        : 'bg-white border-gray-300'
                    }`}>
                      {isFactoryShippingCompleted && (
                        <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-purple-900">공장 출고 완료</span>
                  </div>
                ) : (
                  <div className="text-gray-400">권한 확인 중...</div>
                )}
                
                {isFactoryShippingCompleted && (
                  <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                    출고 완료
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 납기 일정 요약 */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">납기 일정 요약</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">실제 발주일:</span>
              <span className="font-medium text-gray-900">
                {actualOrderDate ? new Date(actualOrderDate).toLocaleDateString('ko-KR') : '미설정'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">예상 공장 출고일:</span>
              <span className="font-medium text-gray-900">
                {expectedFactoryShippingDate ? new Date(expectedFactoryShippingDate).toLocaleDateString('ko-KR') : '미설정'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">실제 공장 출고일:</span>
              <span className="font-medium text-gray-900">
                {actualFactoryShippingDate ? new Date(actualFactoryShippingDate).toLocaleDateString('ko-KR') : '미설정'}
              </span>
            </div>
          </div>
        </div>

        {/* 추가 납기 정보 안내 */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
          <div className="text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 mb-1">추가 납기 정보</h4>
            <p className="text-xs text-gray-500">
              상세한 납기 일정 및 배송 정보는 향후 업데이트 예정입니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Delivery; 