import React, { useState } from 'react';
import { Package, ArrowLeft, Plus, Trash2, Edit, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProjectSearchModal from './ProjectSearchModal';

const MakePackingList = () => {
  const navigate = useNavigate();
  
  // 포장 코드별 상품 데이터 상태
  const [packingData, setPackingData] = useState([]);
  const [packingListDate, setPackingListDate] = useState(new Date().toISOString().split('T')[0]);
  
  // 검색 모달 상태
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [currentSearchContext, setCurrentSearchContext] = useState(null);

  const handleBack = () => {
    navigate('/dashboard/mj-packing-list');
  };

  // 새로운 포장코드 추가
  const addPackingCode = () => {
    const newPackingCode = {
      packingCode: `A${packingData.length + 1}`,
      date: packingListDate,
      products: [
        {
          id: Date.now(),
          productName: '새 상품',
          sku: 'SKU-' + Date.now(),
          boxCount: 0,
          packagingMethod: '기본 포장',
          packagingDetail: '포장 방법을 입력하세요',
          totalQuantity: 0,
          quantityPerBox: 0,
          firstImage: null  // 이미지 정보 초기화
        }
      ]
    };
    setPackingData(prev => [...prev, newPackingCode]);
  };

  // 상품 추가
  const addProduct = (packingCode) => {
    setPackingData(prev => prev.map(item => {
      if (item.packingCode === packingCode) {
        const newProduct = {
          id: Date.now(),
          productName: '새 상품',
          sku: 'SKU-' + Date.now(),
          boxCount: 0,
          packagingMethod: 0,
          packagingCount: 0,
          firstImage: null  // 이미지 정보 초기화
        };
        return {
          ...item,
          products: [...item.products, newProduct]
        };
      }
      return item;
    }));
  };

  // 포장코드 삭제
  const removePackingCode = (packingCode) => {
    setPackingData(prev => prev.filter(item => item.packingCode !== packingCode));
  };

  // 상품 삭제
  const removeProduct = (packingCode, productId) => {
    setPackingData(prev => prev.map(item => {
      if (item.packingCode === packingCode) {
        return {
          ...item,
          products: item.products.filter(product => product.id !== productId)
        };
      }
      return item;
    }));
  };

  // 상품 정보 수정
  const updateProduct = (packingCode, productId, field, value) => {
    setPackingData(prev => prev.map(item => {
      if (item.packingCode === packingCode) {
        return {
          ...item,
          products: item.products.map(product => {
            if (product.id === productId) {
              return { ...product, [field]: value };
            }
            return product;
          })
        };
      }
      return item;
    }));
  };

  // 검색 모달 열기
  const openSearchModal = (packingCode, productId) => {
    setCurrentSearchContext({ packingCode, productId });
    setIsSearchModalOpen(true);
  };

  // 프로젝트 선택 처리
  const handleProjectSelect = (selectedProject) => {
    if (currentSearchContext) {
      const { packingCode, productId } = currentSearchContext;
      
      setPackingData(prev => prev.map(item => {
        if (item.packingCode === packingCode) {
          return {
            ...item,
            products: item.products.map(product => {
              if (product.id === productId) {
                return {
                  ...product,
                  productName: selectedProject.productName,
                  sku: selectedProject.sku,
                  firstImage: selectedProject.firstImage
                };
              }
              return product;
            })
          };
        }
        return item;
      }));
    }
  };



  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={handleBack}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title="뒤로 가기"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">새 패킹리스트 생성</h1>
            <p className="text-gray-600">새로운 MJ 프로젝트 패킹리스트를 생성합니다</p>
          </div>
        </div>
      </div>

      {/* 패킹리스트 테이블 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">패킹리스트 상세</h2>
            <p className="text-sm text-gray-600">포장 정보를 확인하고 관리할 수 있습니다</p>
            <div className="mt-2 flex items-center space-x-2">
              <label htmlFor="packingListDate" className="text-sm font-medium text-gray-700">
                작성 날짜:
              </label>
              <input
                type="date"
                id="packingListDate"
                value={packingListDate}
                onChange={(e) => setPackingListDate(e.target.value)}
                className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <button
            onClick={addPackingCode}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            포장코드 추가
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  포장코드
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  박스수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품사진
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  소포장 구성
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  포장수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  한박스 내 수량
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {packingData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">패킹리스트가 비어있습니다</p>
                      <p className="text-sm">위의 "포장코드 추가" 버튼을 클릭하여 첫 번째 포장코드를 추가해주세요.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                packingData.map((packingGroup, groupIndex) => (
                <React.Fragment key={packingGroup.packingCode}>
                  {packingGroup.products.map((product, productIndex) => (
                    <tr key={product.id} className={`hover:bg-gray-50 ${groupIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {/* 포장코드 셀 - 첫 번째 상품일 때만 표시하고 rowSpan 적용 */}
                      {productIndex === 0 && (
                        <td 
                          rowSpan={packingGroup.products.length + 1} 
                          className="px-6 py-4 whitespace-nowrap border-r border-gray-200 bg-blue-50"
                        >
                          <input
                            type="text"
                            value={packingGroup.packingCode}
                            onChange={(e) => {
                              const newPackingCode = e.target.value;
                              setPackingData(prev => prev.map(item => {
                                if (item.packingCode === packingGroup.packingCode) {
                                  return { ...item, packingCode: newPackingCode };
                                }
                                return item;
                              }));
                            }}
                            className="w-24 text-sm font-medium text-gray-900 mb-2 border border-gray-300 rounded px-2 py-1 bg-white"
                            placeholder="코드"
                          />
                          <button
                            onClick={() => removePackingCode(packingGroup.packingCode)}
                            className="text-red-600 hover:text-red-900 text-xs"
                            title="포장코드 삭제"
                          >
                            삭제
                          </button>
                        </td>
                      )}
                      {/* 박스수 셀 - 첫 번째 상품일 때만 표시하고 rowSpan 적용 */}
                      {productIndex === 0 && (
                        <td 
                          rowSpan={packingGroup.products.length + 1} 
                          className="px-6 py-4 whitespace-nowrap border-r border-gray-200"
                        >
                          <input
                            type="number"
                            value={packingGroup.products[0].boxCount}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value) || 0;
                              // 같은 포장코드의 모든 상품의 박스수를 동일하게 업데이트
                              packingGroup.products.forEach(product => {
                                updateProduct(packingGroup.packingCode, product.id, 'boxCount', newValue);
                              });
                            }}
                            className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                          />
                          <div className="text-sm text-gray-500">박스</div>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <input
                            type="text"
                            value={product.productName}
                            onChange={(e) => updateProduct(packingGroup.packingCode, product.id, 'productName', e.target.value)}
                            className="w-40 text-sm border border-gray-300 rounded px-2 py-1"
                            placeholder="상품명 입력"
                          />
                          <button
                            onClick={() => openSearchModal(packingGroup.packingCode, product.id)}
                            className="px-2 py-1 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 transition-colors"
                            title="상품 검색"
                          >
                            <Search className="w-4 h-4 text-blue-600" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex-shrink-0 h-12 w-12">
                          {product.firstImage ? (
                            <img
                              src={product.firstImage.url}
                              alt={product.productName || '상품 이미지'}
                              className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                              onError={(e) => {
                                console.log('❌ [MakePackingList] 테이블 이미지 로드 실패:', {
                                  url: product.firstImage.url,
                                  fileName: product.firstImage.stored_filename,
                                  filePath: product.firstImage.file_path,
                                  error: '이미지 로드 실패'
                                });
                                // 이미지 로드 실패 시 기본 아이콘 표시
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                              onLoad={() => {
                                console.log('✅ [MakePackingList] 테이블 이미지 로드 성공:', {
                                  url: product.firstImage.url,
                                  fileName: product.firstImage.stored_filename
                                });
                              }}
                            />
                          ) : null}
                          <div 
                            className={`h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center ${
                              product.firstImage ? 'hidden' : 'flex'
                            }`}
                          >
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={product.packagingMethod}
                            onChange={(e) => updateProduct(packingGroup.packingCode, product.id, 'packagingMethod', e.target.value)}
                            className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                            placeholder="소포장 구성"
                          />
                          <span className="text-sm text-gray-500 flex-shrink-0">개</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={product.packagingCount}
                            onChange={(e) => updateProduct(packingGroup.packingCode, product.id, 'packagingCount', parseInt(e.target.value) || 0)}
                            className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                            placeholder="포장수"
                          />
                          <span className="text-sm text-gray-500 flex-shrink-0">개</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-bold">
                          {product.packagingMethod && product.packagingCount && product.packagingMethod > 0 && product.packagingCount > 0 
                            ? `${((product.packagingMethod || 0) * (product.packagingCount || 0)).toLocaleString()} 개/박스`
                            : '-'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => removeProduct(packingGroup.packingCode, product.id)}
                            className="text-red-600 hover:text-red-900"
                            title="상품 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* 포장 코드별 상품 추가 버튼 */}
                  <tr className="bg-blue-100 border-b-4 border-blue-300">
                    <td colSpan="6" className="px-6 py-4">
                      <button
                        onClick={() => addProduct(packingGroup.packingCode)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {packingGroup.packingCode}에 상품 추가
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* 테이블 하단 정보 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>총 {packingData.reduce((total, group) => total + group.products.length, 0)}개 상품</span>
            <span>마지막 업데이트: {new Date().toLocaleDateString('ko-KR')} {new Date().toLocaleTimeString('ko-KR')}</span>
          </div>
        </div>
      </div>

      {/* 검색 모달 */}
      <ProjectSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectProject={handleProjectSelect}
      />
    </div>
  );
};

export default MakePackingList; 