import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, ArrowLeft, Plus, Trash2, Edit, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProjectSearchModal from './ProjectSearchModal';
import { toast } from 'react-hot-toast';

const MakePackingList = () => {
  const navigate = useNavigate();
  
  // 포장 코드별 상품 데이터 상태
  const [packingData, setPackingData] = useState([]);
  const [plDate, setPlDate] = useState(new Date().toISOString().split('T')[0]);
  const [logisticCompany, setLogisticCompany] = useState('비전');
  
  // 검색 모달 상태
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [currentSearchContext, setCurrentSearchContext] = useState(null);
  
  // 자동 저장 상태
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle, saving, success, error
  const [lastSavedAt, setLastSavedAt] = useState(null);
  
  // 포장코드 입력을 위한 임시 상태
  const [editingPackingCodes, setEditingPackingCodes] = useState({});
  const packingCodeRefs = useRef({});
  
  // 포장코드 추가 모달 상태
  const [isAddPackingCodeModalOpen, setIsAddPackingCodeModalOpen] = useState(false);
  const [newPackingCodeInput, setNewPackingCodeInput] = useState('');
  


  const handleBack = () => {
    navigate('/dashboard/mj-packing-list');
  };

  // 자동 저장 함수
  const autoSavePackingList = useCallback(async (packingCode, product, forceInsert = false) => {
    console.log('🚀 [autoSavePackingList] 자동 저장 시작:', {
      packingCode,
      productId: product.id,
      productName: product.productName,
      currentTime: new Date().toISOString(),
      productData: product
    });
    
    if (!packingCode || !product.productName) {
      console.log('⚠️ [autoSavePackingList] 필수 필드 누락으로 저장 건너뜀:', {
        packingCode: !!packingCode,
        productName: !!product.productName
      });
      return; // 필수 필드가 없으면 저장하지 않음
    }

    setAutoSaveStatus('saving');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      // packingGroup에서 pl_date와 logistic_company 가져오기
      const packingGroup = packingData.find(item => item.packingCode === packingCode);
      
      console.log('🔍 [autoSavePackingList] 전체 packingData 상태:', {
        totalPackingCodes: packingData.length,
        allPackingCodes: packingData.map(item => ({
          packingCode: item.packingCode,
          plDate: item.plDate,
          productCount: item.products.length
        }))
      });
      
      if (!packingGroup) {
        console.warn('⚠️ [autoSavePackingList] packingGroup을 찾을 수 없음:', {
          packingCode,
          availablePackingCodes: packingData.map(item => item.packingCode),
          totalPackingCodes: packingData.length
        });
      }
      
      console.log('🔍 [autoSavePackingList] packingGroup 정보:', {
        packingCode,
        packingGroup: packingGroup ? '찾음' : '찾을 수 없음',
        packingGroupData: packingGroup,
        globalPlDate: plDate,
        packingGroupPlDate: packingGroup?.plDate,
        productPlDate: product.plDate,
        globalLogisticCompany: logisticCompany,
        packingGroupLogisticCompany: packingGroup?.logisticCompany
      });
      
      // 날짜 우선순위: 날짜 입력 필드 > product.plDate > packingGroup.plDate > global plDate
      let finalPlDate = plDate;
      let finalLogisticCompany = logisticCompany;
      
      // 날짜 입력 필드에서 직접 현재 값을 읽어오기
      const dateInputElement = document.getElementById('pl-date-input');
      const currentDateInputValue = dateInputElement ? dateInputElement.value : null;
      
      if (currentDateInputValue && currentDateInputValue.trim() !== '') {
        // 날짜 입력 필드의 현재 값 사용 (가장 신뢰할 수 있는 값)
        finalPlDate = currentDateInputValue;
        console.log('📅 [autoSavePackingList] 날짜 입력 필드 값 사용:', finalPlDate);
      } else if (product.plDate) {
        // handleDateChange에서 전달된 product의 plDate 사용
        finalPlDate = product.plDate;
        console.log('📅 [autoSavePackingList] product.plDate 사용:', finalPlDate);
      } else if (packingGroup?.plDate) {
        // packingGroup의 plDate 사용
        finalPlDate = packingGroup.plDate;
        console.log('📅 [autoSavePackingList] packingGroup.plDate 사용:', finalPlDate);
      } else {
        // 전역 plDate 사용
        console.log('📅 [autoSavePackingList] global plDate 사용:', finalPlDate);
      }
      
      if (packingGroup?.logisticCompany) {
        finalLogisticCompany = packingGroup.logisticCompany;
      }
      
      const saveData = {
        packing_code: packingCode,
        box_count: product.boxCount || 0,
        pl_date: finalPlDate,
        logistic_company: finalLogisticCompany,
        product_name: product.productName,
        product_sku: product.sku || '',
        product_image: product.firstImage?.url || '',
        packaging_method: product.packagingMethod || 0,
        packaging_count: product.packagingCount || 0,
        quantity_per_box: product.packagingMethod && product.packagingMethod > 0 && product.packagingCount > 0
          ? (product.packagingMethod * product.packagingCount)
          : 0,
        // 새 상품 추가 시 강제 삽입 플래그
        force_insert: forceInsert,
        // 디버깅을 위한 추가 정보
        client_product_id: product.id,
        timestamp: new Date().toISOString()
      };
      
      console.log('📤 [autoSavePackingList] 최종 saveData:', {
        packing_code: saveData.packing_code,
        pl_date: saveData.pl_date,
        pl_date_source: currentDateInputValue ? '날짜 입력 필드' : (product.plDate ? 'product.plDate' : (packingGroup?.plDate ? 'packingGroup.plDate' : 'global plDate')),
        dateInputValue: currentDateInputValue,
        productPlDate: product.plDate,
        packingGroup_plDate: packingGroup?.plDate,
        global_plDate: plDate
      });

      console.log('📤 [autoSavePackingList] 서버로 전송할 데이터:', saveData);

      const response = await fetch('/api/packing-list/auto-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(saveData)
      });

      if (!response.ok) {
        throw new Error('저장에 실패했습니다.');
      }

      const result = await response.json();
      
      console.log('📥 [autoSavePackingList] 서버 응답:', result);
      
      if (result.success) {
        setAutoSaveStatus('success');
        setLastSavedAt(new Date());
        
        // 3초 후 상태를 idle로 변경
        setTimeout(() => {
          setAutoSaveStatus('idle');
        }, 3000);
        
        console.log('✅ [autoSavePackingList] 패킹리스트 자동 저장 성공:', {
          message: result.message,
          action: result.action,
          id: result.id,
          productName: product.productName
        });
      } else {
        throw new Error(result.error || '저장에 실패했습니다.');
      }
      
    } catch (error) {
      console.error('❌ [autoSavePackingList] 패킹리스트 자동 저장 오류:', {
        error: error.message,
        productName: product.productName,
        packingCode,
        stack: error.stack
      });
      setAutoSaveStatus('error');
      
      // 5초 후 상태를 idle로 변경
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 5000);
      
      toast.error('자동 저장에 실패했습니다: ' + error.message);
    }
  }, []);

  // 포커스 아웃 시 자동 저장
  const handleBlur = useCallback((packingCode, product) => {
    console.log('🔍 [handleBlur] 포커스 아웃 감지:', {
      packingCode,
      productId: product.id,
      productName: product.productName,
      currentTime: new Date().toISOString(),
      productData: product
    });
    
    autoSavePackingList(packingCode, product);
  }, [autoSavePackingList]);

  // 포장코드 변경 시 자동 저장 (포커스 아웃 시에만 실행)
  const handlePackingCodeChange = useCallback((oldPackingCode, newPackingCode) => {
    // 포장코드가 실제로 변경되었는지 확인
    if (oldPackingCode === newPackingCode) {
      return;
    }

    // 먼저 로컬 상태 업데이트
    setPackingData(prev => {
      const updatedData = prev.map(item => {
        if (item.packingCode === oldPackingCode) {
          return { ...item, packingCode: newPackingCode };
        }
        return item;
      });
      
      return updatedData;
    });
    
    // 포장코드 변경 시 자동저장 실행
    console.log(`ℹ️ 포장코드 변경: ${oldPackingCode} → ${newPackingCode} (자동저장 시작)`);
    
    // 해당 포장코드의 모든 상품에 대해 자동저장 실행
    const packingGroup = packingData.find(item => item.packingCode === newPackingCode);
    if (packingGroup && packingGroup.products.length > 0) {
      packingGroup.products.forEach(product => {
        if (product.productName && product.productName.trim() !== '') {
          console.log(`💾 [handlePackingCodeChange] 포장코드 변경 자동저장: ${newPackingCode} - ${product.productName}`);
          autoSavePackingList(newPackingCode, product);
        }
      });
    }
  }, [packingData, autoSavePackingList]);

  // 박스수 변경 시 자동 저장 (포커스 아웃 시에만 실행)
  const handleBoxCountChange = useCallback((packingCode, newBoxCount) => {
    setPackingData(prev => {
      const updatedData = prev.map(item => {
        if (item.packingCode === packingCode) {
          return {
            ...item,
            products: item.products.map(product => ({
              ...product,
              boxCount: newBoxCount
            }))
          };
        }
        return item;
      });
      
      return updatedData;
    });
    
    // 박스수 변경 시 자동저장 실행
    console.log(`ℹ️ 박스수 변경: ${packingCode} → ${newBoxCount} (자동저장 시작)`);
    
    // 해당 포장코드의 모든 상품에 대해 자동저장 실행
    const packingGroup = packingData.find(item => item.packingCode === packingCode);
    if (packingGroup && packingGroup.products.length > 0) {
      packingGroup.products.forEach(product => {
        if (product.productName && product.productName.trim() !== '') {
          console.log(`💾 [handleBoxCountChange] 박스수 변경 자동저장: ${packingCode} - ${product.productName}`);
          autoSavePackingList(packingCode, product);
        }
      });
    }
  }, [packingData, autoSavePackingList]);

  // 작성 날짜 변경 시 자동 저장
  const handleDateChange = useCallback((newDate) => {
    console.log(`ℹ️ [handleDateChange] 작성 날짜 변경 시작: ${newDate}`);
    
    // 전역 날짜 상태 업데이트
    setPlDate(newDate);
    
    // 기존 포장코드들의 plDate도 업데이트
    setPackingData(prev => {
      const updatedData = prev.map(item => ({
        ...item,
        plDate: newDate
      }));
      
      console.log('🔄 [handleDateChange] 포장코드 데이터 plDate 업데이트 완료:', {
        newDate,
        updatedData: updatedData.map(item => ({
          packingCode: item.packingCode,
          plDate: item.plDate
        }))
      });
      
      return updatedData;
    });
    
    // 날짜 변경 시 자동저장은 필요 없음 - autoSavePackingList에서 날짜 입력 필드 값을 직접 읽어옴
    console.log('ℹ️ [handleDateChange] 날짜 변경 완료. 자동저장 시 날짜 입력 필드 값 사용 예정.');
  }, []);

  // 물류회사 변경 시 자동 저장 (더 이상 사용되지 않음)
  const handleLogisticCompanyChange = useCallback((newCompany) => {
    console.log('🚚 [handleLogisticCompanyChange] 물류회사 변경:', newCompany);
    setLogisticCompany(newCompany);
  }, []);

  // 포장코드 추가 모달 열기
  const openAddPackingCodeModal = () => {
    setIsAddPackingCodeModalOpen(true);
    setNewPackingCodeInput('');
  };

  // 포장코드 추가 모달 닫기
  const closeAddPackingCodeModal = () => {
    setIsAddPackingCodeModalOpen(false);
    setNewPackingCodeInput('');
  };



  // UUID 생성 함수
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 새로운 포장코드 추가
  const addPackingCode = () => {
    console.log('🏷️ [addPackingCode] 새 포장코드 추가 시작:', {
      inputValue: newPackingCodeInput,
      currentTime: new Date().toISOString()
    });
    
    if (!newPackingCodeInput || newPackingCodeInput.trim() === '') {
      console.log('⚠️ [addPackingCode] 포장코드 입력값이 비어있음');
      toast.error('포장코드를 입력해주세요.');
      return;
    }
    
    // 중복 포장코드 확인
    const isDuplicate = packingData.some(item => item.packingCode === newPackingCodeInput.trim());
    if (isDuplicate) {
      console.log('⚠️ [addPackingCode] 중복 포장코드 감지:', newPackingCodeInput.trim());
      toast.error('이미 존재하는 포장코드입니다.');
      return;
    }
    
    const newPackingCode = {
      packingCode: newPackingCodeInput.trim(),
      plDate: plDate,
      logisticCompany: logisticCompany || '비전',
      products: [
        {
          id: generateUUID(), // UUID 사용
          productName: '새 상품',
          sku: 'SKU-' + Date.now(),
          boxCount: 0,
          packagingMethod: 0,
          packagingCount: 0,
          firstImage: null  // 이미지 정보 초기화
        }
      ]
    };
    
    console.log('🆕 [addPackingCode] 새 포장코드 생성:', {
      newPackingCode: newPackingCode.packingCode,
      newProductId: newPackingCode.products[0].id,
      plDate: newPackingCode.plDate,
      logisticCompany: newPackingCode.logisticCompany,
      globalLogisticCompany: logisticCompany
    });
    
    setPackingData(prev => {
      const updatedData = [...prev, newPackingCode];
      console.log('📊 [addPackingCode] 포장코드 추가 후 전체 데이터 상태:', {
        totalPackingCodes: updatedData.length,
        totalProducts: updatedData.reduce((sum, item) => sum + item.products.length, 0),
        packingCodes: updatedData.map(item => ({
          packingCode: item.packingCode,
          productCount: item.products.length,
          productIds: item.products.map(p => p.id)
        }))
      });
      return updatedData;
    });
    
    // 새 포장코드 추가 후 자동 저장
    setTimeout(() => {
      console.log('💾 [addPackingCode] 새 포장코드 자동 저장 시작:', {
        packingCode: newPackingCode.packingCode,
        productCount: newPackingCode.products.length
      });
      newPackingCode.products.forEach(product => {
        autoSavePackingList(newPackingCode.packingCode, product);
      });
    }, 100);
    
    toast.success(`포장코드 '${newPackingCodeInput.trim()}'가 추가되었습니다.`);
    closeAddPackingCodeModal();
  };

  // 상품 추가
  const addProduct = (packingCode) => {
    console.log('➕ [addProduct] 새 상품 추가 시작:', {
      packingCode,
      currentTime: new Date().toISOString()
    });
    
              // 고유한 상품명 생성 (중복 방지)
          const timestamp = Date.now();
          const newProduct = {
            id: generateUUID(), // UUID 사용 (변경되지 않는 고유 ID)
            productName: `새 상품 ${timestamp}`,  // 고유한 상품명으로 변경
            sku: 'SKU-' + timestamp,
            boxCount: 0, // 기본값으로 설정
            packagingMethod: 0,
            packagingCount: 0,
            firstImage: null  // 이미지 정보 초기화
          };
    
    console.log('🆕 [addProduct] 새 상품 생성:', {
      newProductId: newProduct.id,
      newProductName: newProduct.productName,
      packingCode,
      timestamp: new Date().toISOString()
    });
    
    setPackingData(prev => {
      const updatedData = prev.map(item => {
        if (item.packingCode === packingCode) {
          // 기존 상품들의 박스수 중 첫 번째 상품의 박스수를 사용
          const existingBoxCount = item.products.length > 0 ? item.products[0].boxCount : 0;
          
          // 박스수 상속
          newProduct.boxCount = existingBoxCount;
          
          return {
            ...item,
            products: [...item.products, newProduct]
          };
        }
        return item;
      });
      
      console.log('📊 [addProduct] 상품 추가 후 전체 데이터 상태:', {
        totalPackingCodes: updatedData.length,
        totalProducts: updatedData.reduce((sum, item) => sum + item.products.length, 0),
        packingCodes: updatedData.map(item => ({
          packingCode: item.packingCode,
          productCount: item.products.length,
          productIds: item.products.map(p => p.id)
        }))
      });
      
      return updatedData;
    });
    
    // 상태 업데이트 후 자동 저장 실행
    setTimeout(() => {
      console.log('💾 [addProduct] 새 상품 자동 저장 시작:', {
        productId: newProduct.id,
        productName: newProduct.productName
      });
      // 새 상품 추가 시에는 forceInsert 플래그를 true로 설정
      autoSavePackingList(packingCode, newProduct, true);
    }, 100);
  };

  // 포장코드 삭제
  const removePackingCode = (packingCode) => {
    // 삭제 전에 해당 포장코드의 모든 상품을 DB에서 제거
    const packingGroup = packingData.find(item => item.packingCode === packingCode);
    if (packingGroup) {
      packingGroup.products.forEach(product => {
        // DB에서 삭제하는 API 호출 (선택사항)
        // deletePackingListItems(packingCode, product.id);
      });
    }
    
    setPackingData(prev => prev.filter(item => item.packingCode !== packingCode));
  };

  // 상품 삭제
  const removeProduct = (packingCode, productId) => {
    // 삭제 전에 해당 상품을 DB에서 제거
    const packingGroup = packingData.find(item => item.packingCode === packingCode);
    if (packingGroup) {
      const productToDelete = packingGroup.products.find(product => product.id === productId);
      if (productToDelete) {
        // DB에서 삭제하는 API 호출 (선택사항)
        // deletePackingListItems(packingCode, productId);
      }
    }
    
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
    console.log('✏️ [updateProduct] 상품 정보 수정:', {
      packingCode,
      productId,
      field,
      oldValue: '이전 값 (확인 불가)',
      newValue: value,
      currentTime: new Date().toISOString()
    });
    
    setPackingData(prev => {
      const updatedData = prev.map(item => {
        if (item.packingCode === packingCode) {
          return {
            ...item,
            products: item.products.map(product => {
              if (product.id === productId) {
                const updatedProduct = { ...product, [field]: value };
                console.log('🔄 [updateProduct] 상품 업데이트 완료:', {
                  productId,
                  field,
                  newValue: value,
                  updatedProduct
                });
                return updatedProduct;
              }
              return product;
            })
          };
        }
        return item;
      });
      
      console.log('📊 [updateProduct] 전체 데이터 상태:', {
        totalPackingCodes: updatedData.length,
        totalProducts: updatedData.reduce((sum, item) => sum + item.products.length, 0),
        packingCodes: updatedData.map(item => ({
          packingCode: item.packingCode,
          productCount: item.products.length,
          productIds: item.products.map(p => p.id)
        }))
      });
      
      return updatedData;
    });
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
            <div className="mt-2 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="plDate" className="text-sm font-medium text-gray-700">
                  작성 날짜:
                </label>
                <input
                  type="date"
                  id="pl-date-input"
                  value={plDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-blue-500"
                />
              </div>
              

              
              {/* 자동 저장 상태 표시 */}
              <div className="ml-4 flex items-center space-x-2">
                {autoSaveStatus === 'saving' && (
                  <div className="flex items-center space-x-1 text-blue-600">
                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">저장 중...</span>
                  </div>
                )}
                {autoSaveStatus === 'success' && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <span className="text-xs">저장 완료</span>
                  </div>
                )}
                {autoSaveStatus === 'error' && (
                  <div className="flex items-center space-x-1 text-red-600">
                    <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                    <span className="text-xs">저장 실패</span>
                  </div>
                )}
                {lastSavedAt && (
                  <span className="text-xs text-gray-500">
                    마지막 저장: {lastSavedAt.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={openAddPackingCodeModal}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              포장코드 추가
            </button>
            
            <button
              onClick={() => {
                // 모든 데이터를 수동으로 저장
                packingData.forEach(packingGroup => {
                  packingGroup.products.forEach(product => {
                    autoSavePackingList(packingGroup.packingCode, product);
                  });
                });
                toast.success('모든 데이터가 저장되었습니다.');
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Package className="w-4 h-4 mr-2" />
              전체 저장
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  포장코드
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  물류회사
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
                  <td colSpan="9" className="px-6 py-12 text-center">
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
                            ref={(el) => {
                              if (el) {
                                packingCodeRefs.current[packingGroup.packingCode] = el;
                              }
                            }}
                            type="text"
                            value={editingPackingCodes[packingGroup.packingCode] !== undefined 
                              ? editingPackingCodes[packingGroup.packingCode] 
                              : packingGroup.packingCode
                            }
                            onChange={(e) => {
                              const newPackingCode = e.target.value;
                              setEditingPackingCodes(prev => ({
                                ...prev,
                                [packingGroup.packingCode]: newPackingCode
                              }));
                            }}
                            onFocus={() => {
                              // 포커스 시 현재 값을 임시 상태에 설정
                              setEditingPackingCodes(prev => ({
                                ...prev,
                                [packingGroup.packingCode]: packingGroup.packingCode
                              }));
                            }}
                            onBlur={(e) => {
                              const newPackingCode = e.target.value;
                              const oldPackingCode = packingGroup.packingCode;
                              
                              if (newPackingCode && newPackingCode !== oldPackingCode) {
                                // 포커스가 벗어날 때만 자동저장 실행
                                handlePackingCodeChange(oldPackingCode, newPackingCode);
                              }
                              
                              // 임시 상태 정리
                              setEditingPackingCodes(prev => {
                                const newState = { ...prev };
                                delete newState[oldPackingCode];
                                return newState;
                              });
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
                      {/* 물류회사 셀 - 첫 번째 상품일 때만 표시하고 rowSpan 적용 */}
                      {productIndex === 0 && (
                        <td 
                          rowSpan={packingGroup.products.length + 1} 
                          className="px-6 py-4 whitespace-nowrap border-r border-gray-200"
                        >
                          <select
                            value={packingGroup.logisticCompany || logisticCompany || '비전'}
                            onChange={(e) => {
                              const newCompany = e.target.value;
                              console.log('🚚 [테이블] 물류회사 변경:', {
                                packingCode: packingGroup.packingCode,
                                oldCompany: packingGroup.logisticCompany,
                                newCompany
                              });
                              
                              // 해당 포장코드의 물류회사만 업데이트
                              setPackingData(prev => {
                                const updatedData = prev.map(item => {
                                  if (item.packingCode === packingGroup.packingCode) {
                                    return { ...item, logisticCompany: newCompany };
                                  }
                                  return item;
                                });
                                return updatedData;
                              });
                              
                              // 모든 상품에 대해 자동저장 실행
                              packingGroup.products.forEach(product => {
                                if (product.productName && product.productName.trim() !== '') {
                                  console.log(`💾 [테이블] 물류회사 변경 자동저장: ${packingGroup.packingCode} - ${product.productName}`);
                                  autoSavePackingList(packingGroup.packingCode, product);
                                }
                              });
                            }}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="비전">비전</option>
                            <option value="청도">청도</option>
                            <option value="항공특송">항공특송</option>
                          </select>
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
                            onBlur={(e) => {
                              const newValue = parseInt(e.target.value) || 0;
                              handleBoxCountChange(packingGroup.packingCode, newValue);
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
                            onBlur={() => handleBlur(packingGroup.packingCode, product)}
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
                            onBlur={() => handleBlur(packingGroup.packingCode, product)}
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
                            onBlur={() => handleBlur(packingGroup.packingCode, product)}
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

      {/* 포장코드 추가 모달 */}
      {isAddPackingCodeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">새 포장코드 추가</h3>
              <button
                onClick={closeAddPackingCodeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="newPackingCode" className="block text-sm font-medium text-gray-700 mb-2">
                포장코드
              </label>
              <input
                type="text"
                id="newPackingCode"
                value={newPackingCodeInput}
                onChange={(e) => setNewPackingCodeInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addPackingCode();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="포장코드를 입력하세요"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeAddPackingCodeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                취소
              </button>
              <button
                onClick={addPackingCode}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default MakePackingList; 