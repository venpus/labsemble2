import React, { useState, useRef, useEffect } from 'react';
import { Package, Camera, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const WarehouseEntry = ({ project, isAdmin, isAdminLoading, onDeliveryStatusChange }) => {
  // 입고 기록 배열 상태 (여러 행을 관리)
  const [warehouseEntries, setWarehouseEntries] = useState([
    {
      id: 1,
      date: null,
      quantity: '',
      images: []
    }
  ]);
  
  // 이미지 미리보기 모달 상태
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 파일 입력 참조
  const fileInputRef = useRef(null);

  // 총 입고 수량 계산
  const totalEnteredQuantity = warehouseEntries.reduce((total, entry) => {
    return total + (parseInt(entry.quantity) || 0);
  }, 0);

  // 남은 입고 수량 계산
  const remainingQuantity = (project.quantity || 0) - totalEnteredQuantity;

  // 첫 번째 행의 입고 상태를 확인하고 납기상태 자동 변경
  useEffect(() => {
    console.log('🔍 WarehouseEntry useEffect 실행:', {
      hasCallback: !!onDeliveryStatusChange,
      entriesCount: warehouseEntries.length,
      firstEntry: warehouseEntries[0]
    });

    if (onDeliveryStatusChange && warehouseEntries.length > 0) {
      const firstEntry = warehouseEntries[0];
      const hasFirstEntryData = firstEntry.date && firstEntry.quantity && parseInt(firstEntry.quantity) > 0;
      
      console.log('🚚 첫 번째 입고 기록 상태 확인:', {
        date: firstEntry.date,
        quantity: firstEntry.quantity,
        hasData: hasFirstEntryData,
        willCallCallback: hasFirstEntryData
      });
      
      if (hasFirstEntryData) {
        // 첫 번째 행에 입고날짜와 수량이 입력되면 "입고중" 상태로 변경
        console.log('🚚 첫 번째 입고 기록 완성 감지:', {
          date: firstEntry.date,
          quantity: firstEntry.quantity,
          hasData: hasFirstEntryData
        });
        console.log('📞 onDeliveryStatusChange 콜백 호출: 입고중');
        onDeliveryStatusChange('입고중');
      }
    }
  }, [warehouseEntries, onDeliveryStatusChange]);

  // 남은 수량이 0이 되면 "입고 완료" 상태로 자동 변경
  useEffect(() => {
    if (onDeliveryStatusChange && remainingQuantity === 0 && totalEnteredQuantity > 0) {
      console.log('🎉 모든 입고 완료 감지:', {
        totalEnteredQuantity,
        remainingQuantity,
        projectQuantity: project.quantity
      });
      console.log('📞 onDeliveryStatusChange 콜백 호출: 입고 완료');
      onDeliveryStatusChange('입고 완료');
    }
  }, [remainingQuantity, totalEnteredQuantity, onDeliveryStatusChange]);

  // 새로운 입고 기록 행 추가
  const addWarehouseEntry = () => {
    if (warehouseEntries.length >= 10) {
      toast.error('최대 10개까지만 추가할 수 있습니다.');
      return;
    }

    const newEntry = {
      id: Date.now() + Math.random(),
      date: null,
      quantity: '',
      images: []
    };

    setWarehouseEntries(prev => [...prev, newEntry]);
    toast.success('새로운 입고 기록 행이 추가되었습니다.');
  };

  // 입고 기록 행 삭제
  const removeWarehouseEntry = (entryId) => {
    if (warehouseEntries.length <= 1) {
      toast.error('최소 1개의 입고 기록은 유지해야 합니다.');
      return;
    }

    setWarehouseEntries(prev => prev.filter(entry => entry.id !== entryId));
    toast.success('입고 기록 행이 삭제되었습니다.');
  };

  // 특정 행의 날짜 변경
  const handleDateChange = (entryId, newDate) => {
    setWarehouseEntries(prev => prev.map(entry => 
      entry.id === entryId 
        ? { ...entry, date: newDate }
        : entry
    ));

    if (newDate) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      console.log('📅 날짜 선택됨:', newDate, '자동 시간 설정:', currentTime);
      toast.success(`날짜가 선택되었습니다. 현재 시간(${currentTime})이 자동으로 저장됩니다.`);
    }
  };

  // 특정 행의 수량 변경
  const handleQuantityChange = (entryId, newQuantity) => {
    setWarehouseEntries(prev => prev.map(entry => 
      entry.id === entryId 
        ? { ...entry, quantity: newQuantity }
        : entry
    ));
  };

  // 특정 행에 이미지 업로드
  const handleImageUpload = async (event, entryId) => {
    const files = Array.from(event.target.files);
    const targetEntry = warehouseEntries.find(entry => entry.id === entryId);
    
    if (!targetEntry) return;
    
    if (targetEntry.images.length + files.length > 5) {
      toast.error('최대 5개까지만 업로드할 수 있습니다.');
      return;
    }

    try {
      const newImages = [];
      
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name}은 이미지 파일이 아닙니다.`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}의 크기가 5MB를 초과합니다.`);
          continue;
        }

        const reader = new FileReader();
        const imageData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newImages.push({
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          data: imageData
        });
      }

      setWarehouseEntries(prev => prev.map(entry => 
        entry.id === entryId 
          ? { ...entry, images: [...entry.images, ...newImages] }
          : entry
      ));

      toast.success(`${newImages.length}개의 이미지가 추가되었습니다.`);
      
      // 파일 입력 초기화
      event.target.value = '';
    } catch (error) {
      console.error('이미지 처리 오류:', error);
      toast.error('이미지 처리 중 오류가 발생했습니다.');
    }
  };

  // 특정 행에서 이미지 제거
  const removeImage = (entryId, imageId) => {
    setWarehouseEntries(prev => prev.map(entry => 
      entry.id === entryId 
        ? { ...entry, images: entry.images.filter(img => img.id !== imageId) }
        : entry
    ));
    toast.success('이미지가 제거되었습니다.');
  };

  // 이미지 미리보기 모달 열기
  const openImageModal = (image) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  // 이미지 미리보기 모달 닫기
  const closeImageModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  // 첫 번째 행의 입고 상태 확인
  const firstEntry = warehouseEntries[0];
  const isFirstEntryComplete = firstEntry.date && firstEntry.quantity && parseInt(firstEntry.quantity) > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* 입고 내용 입력 표 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="w-5 h-5 mr-2 text-green-600" />
            <h3 className="text-lg font-medium text-gray-900">
              입고 기록
            </h3>
            {/* 첫 번째 행 완성 상태 표시 */}
            {isFirstEntryComplete && (
              <div className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full border border-green-200">
                🚚 납기상태 자동 변경됨
              </div>
            )}
          </div>
          
          {/* 총 입고 수량 정보 - 헤더 옆에 표시 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                총 입고 예정:
              </span>
              <span className="text-lg font-bold text-blue-900">
                {project.quantity?.toLocaleString() || '0'}
              </span>
              <span className="text-sm text-blue-700">개</span>
            </div>
            
            {/* 현재까지 입고된 수량 */}
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
              <Package className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                입고 완료:
              </span>
              <span className="text-lg font-bold text-green-900">
                {totalEnteredQuantity.toLocaleString()}
              </span>
              <span className="text-sm text-green-700">개</span>
            </div>
            
            {/* 남은 입고 수량 */}
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
              remainingQuantity === 0 
                ? 'bg-green-50 border-green-200' 
                : 'bg-orange-50 border-orange-200'
            }`}>
              <Package className={`w-4 h-4 ${
                remainingQuantity === 0 ? 'text-green-600' : 'text-orange-600'
              }`} />
              <span className={`text-sm font-medium ${
                remainingQuantity === 0 ? 'text-green-900' : 'text-orange-900'
              }`}>
                남은 수량:
              </span>
              <span className={`text-lg font-bold ${
                remainingQuantity === 0 ? 'text-green-900' : 'text-orange-900'
              }`}>
                {remainingQuantity.toLocaleString()}
              </span>
              <span className={`text-sm ${
                remainingQuantity === 0 ? 'text-green-700' : 'text-orange-700'
              }`}>개</span>
              {remainingQuantity === 0 && (
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full border border-green-200">
                  🎉 완료!
                </span>
              )}
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mt-2">
          실제 입고된 제품의 정보를 입력하고 기록합니다. 여러 번에 걸쳐 입고할 수 있습니다.
          {isFirstEntryComplete && (
            <span className="text-green-600 font-medium ml-2">
              첫 번째 입고 기록이 완성되어 납기상태가 "입고중"으로 자동 변경되었습니다.
            </span>
          )}
        </p>
      </div>

      {/* 입고 내용 입력 폼 */}
      <div className="p-6">
        {!isAdmin && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <Package className="w-4 h-4 mr-2 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                입고 내용 입력은 admin 권한이 필요합니다. 현재 읽기 전용 모드입니다.
              </span>
            </div>
          </div>
        )}

        {/* 입고 기록 행들 */}
        {warehouseEntries.map((entry, index) => (
          <div key={entry.id} className={`mb-6 p-4 border rounded-lg ${
            index === 0 && isFirstEntryComplete 
              ? 'border-green-300 bg-green-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            {/* 행 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${
                  index === 0 && isFirstEntryComplete ? 'text-green-700' : 'text-gray-700'
                }`}>
                  입고 기록 #{index + 1}
                  {index === 0 && isFirstEntryComplete && (
                    <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      ✓ 완성됨
                    </span>
                  )}
                </span>
                {entry.date && (
                  <span className="text-xs text-gray-500">
                    ({entry.date})
                  </span>
                )}
              </div>
              
              {/* 행 삭제 버튼 */}
              {isAdmin && warehouseEntries.length > 1 && (
                <button
                  onClick={() => removeWarehouseEntry(entry.id)}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  title="이 행 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 입고 내용 입력 폼 */}
            <div className="flex flex-col lg:flex-row items-end space-y-4 lg:space-y-0 lg:space-x-6">
              {/* 입고 날짜와 수량을 하나의 그룹으로 묶기 */}
              <div className="flex items-end space-x-4">
                {/* 입고 날짜 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    입고 날짜
                  </label>
                  <input
                    type="date"
                    value={entry.date || ''}
                    onChange={(e) => handleDateChange(entry.id, e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 입고 수량 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    입고 수량
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={entry.quantity}
                      onChange={(e) => handleQuantityChange(entry.id, e.target.value)}
                      disabled={!isAdmin}
                      min="1"
                      max={remainingQuantity + (parseInt(entry.quantity) || 0)}
                      placeholder="수량 입력"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <span className="ml-2 text-sm text-gray-600">개</span>
                  </div>
                </div>
              </div>

              {/* 이미지 업로드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  입고 사진
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isAdmin || entry.images.length >= 5}
                    className="flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    사진 추가
                  </button>
                  <span className="text-sm text-gray-500">
                    {entry.images.length}/5
                  </span>
                  
                  {/* 업로드된 이미지 썸네일 */}
                  {entry.images.length > 0 && (
                    <div className="flex items-center space-x-2 ml-2">
                      {entry.images.map((image) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.data}
                            alt="입고 이미지"
                            className="w-10 h-10 object-cover rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openImageModal(image)}
                            title="클릭하여 크게 보기"
                          />
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(entry.id, image.id);
                              }}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors flex items-center justify-center"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* 숨겨진 파일 입력 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, entry.id)}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        ))}

        {/* 새로운 행 추가 버튼 */}
        {isAdmin && (
          <div className="flex justify-center">
            <button
              onClick={addWarehouseEntry}
              disabled={warehouseEntries.length >= 10}
              className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              새로운 입고 기록 추가
            </button>
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="mt-4 text-center text-sm text-gray-500">
          {warehouseEntries.length >= 10 && (
            <p>최대 10개까지 입고 기록을 추가할 수 있습니다.</p>
          )}
          {remainingQuantity < 0 && (
            <p className="text-red-600 font-medium">
              ⚠️ 입고 수량이 예정 수량을 초과했습니다. ({Math.abs(remainingQuantity).toLocaleString()}개 초과)
            </p>
          )}
          {isFirstEntryComplete && (
            <p className="text-green-600 font-medium">
              🎉 첫 번째 입고 기록이 완성되어 납기상태가 자동으로 "입고중"으로 변경되었습니다!
            </p>
          )}
          {remainingQuantity === 0 && totalEnteredQuantity > 0 && (
            <p className="text-green-600 font-medium">
              🎉 모든 입고가 완료되어 납기상태가 자동으로 "입고 완료"로 변경되었습니다!
            </p>
          )}
        </div>
      </div>

      {/* 이미지 미리보기 모달 */}
      {isModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative w-full h-full flex items-center justify-center p-2">
            {/* 모달 닫기 버튼 */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 w-12 h-12 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 z-10 border border-white border-opacity-30"
            >
              <X className="w-7 h-7" />
            </button>
            
            {/* 이미지 */}
            <img
              src={selectedImage.data}
              alt="입고 이미지 미리보기"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseEntry; 