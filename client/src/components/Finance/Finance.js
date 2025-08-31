import React, { useState, useEffect } from 'react';
import { Plus, Download, Filter, Search, Calendar, DollarSign, TrendingUp, TrendingDown, Truck } from 'lucide-react';
import FinanceLedger from './FinanceLedger';
import FinanceTransaction from './FinanceTransaction';
import { useAuth } from '../../contexts/AuthContext';

const Finance = () => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const [activeTab, setActiveTab] = useState('ledger');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  const [summaryData, setSummaryData] = useState({
    totalAmountKRW: 0,
    totalAmountUSD: 0,
    totalAmountCNY: 0
  });

  // Finance 카드 상태 변수들
  const [totalAdvancePayment, setTotalAdvancePayment] = useState(0);
  const [totalTransactionAmount, setTotalTransactionAmount] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalShippingCost, setTotalShippingCost] = useState(0);
  const [totalUnpaidAdvance, setTotalUnpaidAdvance] = useState(0);
  const [totalUnpaidBalance, setTotalUnpaidBalance] = useState(0);

  // Admin이 아닌 경우 거래내역 탭을 선택했을 때 장부 탭으로 자동 전환
  useEffect(() => {
    if (!isAdmin && activeTab === 'transaction') {
      setActiveTab('ledger');
    }
  }, [isAdmin, activeTab]);

  // advance_payment 정보 가져오기 (CNY 단위로 직접 사용)
  const fetchAdvancePayment = async () => {
    try {
      console.log('[Finance] advance_payment 정보 조회 시작...');
      
      const response = await fetch('/api/finance/advance-payment', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Finance] advance_payment 정보 API 응답:', data);
        
        if (data.success) {
          // advance_payment는 이미 CNY 단위로 저장되어 있음
          const advancePaymentCNY = Number(data.data.totalAdvancePayment ?? 0) || 0;
          
          console.log('[Finance] advance_payment 계산 과정:');
          console.log(`  - 원본 advance_payment (CNY): ${advancePaymentCNY}`);
          console.log(`  - 환율 변환 불필요 (이미 CNY 단위)`);
          console.log(`  - 최종 설정된 advance_payment: ${advancePaymentCNY}`);
          console.log(`  - 프로젝트 수: ${data.data.projectCount}`);
          
          // advance_payment가 0보다 큰 경우에만 설정
          if (advancePaymentCNY > 0) {
            setTotalAdvancePayment(advancePaymentCNY);
            console.log('[Finance] advance_payment 정보 설정 완료');
          } else {
            setTotalAdvancePayment(0);
            console.log('[Finance] advance_payment 정보가 없거나 0으로 설정됨');
          }
        } else {
          console.error('[Finance] advance_payment 정보 API 응답 실패:', data.message);
          setTotalAdvancePayment(0);
        }
      } else {
        console.error('[Finance] advance_payment 정보 API 응답 오류:', response.status, response.statusText);
        setTotalAdvancePayment(0);
      }
    } catch (error) {
      console.error('[Finance] advance_payment 정보 조회 실패:', error);
      setTotalAdvancePayment(0);
    }
  };

  // 입금 및 지출 내역 데이터 가져오기
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // 입금 내역과 지출 내역을 병렬로 가져오기
      const [incomingResponse, expenseResponse] = await Promise.all([
        fetch('/api/finance/incoming', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch('/api/finance/expense', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);
      
      if (incomingResponse.ok && expenseResponse.ok) {
        const incomingData = await incomingResponse.json();
        const expenseData = await expenseResponse.json();
        
        if (incomingData.success && expenseData.success) {
          // 입금 내역 변환 (숫자 타입 보장)
          const incomingTransactions = incomingData.data.transactions.map(transaction => ({
            id: `incoming-${transaction.id}`,
            date: transaction.transaction_date,
            description: transaction.notes || '입금 내역',
            category: transaction.currency,
            amount: Number(transaction.amount_cny) || 0,
            type: 'income',
            reference: `FIN-${transaction.id.toString().padStart(3, '0')}`,
            notes: transaction.notes || ''
          }));
          
          // 지출 내역 변환 (숫자 타입 보장)
          const expenseTransactions = expenseData.data.transactions.map(transaction => ({
            id: `expense-${transaction.id}`,
            date: transaction.transaction_date,
            description: transaction.notes || '지출 내역',
            category: transaction.category || '기타',
            amount: -Number(Math.abs(transaction.amount_cny)) || 0, // 음수로 표시
            type: 'expense',
            reference: `EXP-${transaction.id.toString().padStart(3, '0')}`,
            notes: transaction.notes || ''
          }));
          
          // 모든 거래를 날짜순으로 정렬하고 잔액 계산
          const allTransactions = [...incomingTransactions, ...expenseTransactions]
            .sort((a, b) => new Date(a.date) - new Date(b.date));
          
          // 잔액 계산 (CNY 기준, 숫자 타입 보장)
          let runningBalance = 0;
          const transactionsWithBalance = allTransactions.map(transaction => {
            const amount = Number(transaction.amount) || 0; // 이미 CNY 기준으로 변환된 금액
            runningBalance += amount;
            return {
              ...transaction,
              amount: amount,
              balance: Number(runningBalance) // CNY 기준 누적 잔액
            };
          });
          
          setTransactions(transactionsWithBalance);
          
          // 요약 통계 데이터 설정 (CNY 기준)
          if (incomingData.data.summary) {
            setSummaryData(incomingData.data.summary);
          }
        }
      }
    } catch (error) {
      console.error('거래 내역 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // mj_project에서 총 거래금액 정보 가져오기
  const fetchTotalAmount = async () => {
    try {
      console.log('[Finance] 총 거래금액 정보 조회 시작...');
      
      const response = await fetch('/api/finance/total-amount', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Finance] 총 거래금액 API 응답:', data);
        
        if (data.success) {
          const totalAmount = Number(data.data.totalTransactionAmount ?? 0) || 0;
          
          console.log('[Finance] 총 거래금액 계산 과정:');
          console.log(`  - 원본 총액 (CNY): ${totalAmount}`);
          console.log(`  - 프로젝트 수: ${data.data.projectCount}`);
          
          // 총 거래금액 설정
          if (totalAmount > 0) {
            setTotalTransactionAmount(totalAmount);
            console.log('[Finance] 총 거래금액 설정 완료');
          } else {
            setTotalTransactionAmount(0);
            console.log('[Finance] 총 거래금액이 없거나 0으로 설정됨');
          }
        } else {
          console.error('[Finance] 총 거래금액 API 응답 실패:', data.message);
          setTotalTransactionAmount(0);
        }
      } else {
        console.error('[Finance] 총 거래금액 API 응답 오류:', response.status, response.statusText);
        setTotalTransactionAmount(0);
      }
    } catch (error) {
      console.error('[Finance] 총 거래금액 정보 조회 실패:', error);
      setTotalTransactionAmount(0);
    }
  };

  // mj_project에서 총 balance_amount 정보 가져오기
  const fetchTotalFee = async () => {
    try {
      console.log('[Finance] 총 balance_amount 정보 조회 시작...');
      
      const response = await fetch('/api/finance/total-fee', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Finance] 총 balance_amount API 응답:', data);
        
        if (data.success) {
          const totalFee = Number(data.data.totalFeeAmount ?? 0) || 0;
          
          console.log('[Finance] 총 balance_amount 계산 과정:');
          console.log(`  - 원본 총 balance_amount (CNY): ${totalFee}`);
          console.log(`  - 프로젝트 수: ${data.data.projectCount}`);
          
          // 총 balance_amount 설정 (총 잔금으로 사용)
          if (totalFee > 0) {
            setTotalBalance(totalFee);
            console.log('[Finance] 총 balance_amount 정보 설정 완료 (총 잔금으로 사용)');
          } else {
            setTotalBalance(0);
            console.log('[Finance] 총 balance_amount 정보가 없거나 0으로 설정됨');
          }
        } else {
          console.error('[Finance] 총 balance_amount API 응답 실패:', data.message);
          setTotalBalance(0);
        }
      } else {
        console.error('[Finance] 총 balance_amount API 응답 오류:', response.status, response.statusText);
        setTotalBalance(0);
      }
    } catch (error) {
      console.error('[Finance] 총 balance_amount 정보 조회 실패:', error);
      setTotalBalance(0);
    }
  };

  // mj_project에서 미지급 선금 정보 가져오기
  const fetchUnpaidAdvance = async () => {
    try {
      console.log('[Finance] 미지급 선금 정보 조회 시작...');
      
      const response = await fetch('/api/finance/unpaid-advance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Finance] 미지급 선금 API 응답:', data);
        
        if (data.success) {
          const unpaidAdvance = Number(data.data.totalUnpaidAdvance ?? 0) || 0;
          
          console.log('[Finance] 미지급 선금 계산 과정:');
          console.log(`  - 원본 미지급 선금 (CNY): ${unpaidAdvance}`);
          console.log(`  - 프로젝트 수: ${data.data.projectCount}`);
          
          // 미지급 선금 설정
          if (unpaidAdvance > 0) {
            setTotalUnpaidAdvance(unpaidAdvance);
            console.log('[Finance] 미지급 선금 정보 설정 완료');
          } else {
            setTotalUnpaidAdvance(0);
            console.log('[Finance] 미지급 선금 정보가 없거나 0으로 설정됨');
          }
        } else {
          console.error('[Finance] 미지급 선금 API 응답 실패:', data.message);
          setTotalUnpaidAdvance(0);
        }
      } else {
        console.error('[Finance] 미지급 선금 API 응답 오류:', response.status, response.statusText);
        setTotalUnpaidAdvance(0);
      }
    } catch (error) {
      console.error('[Finance] 미지급 선금 정보 조회 실패:', error);
      setTotalUnpaidAdvance(0);
    }
  };

  // mj_project에서 미지급 잔금 정보 가져오기
  const fetchUnpaidBalance = async () => {
    try {
      console.log('[Finance] 미지급 잔금 정보 조회 시작...');
      
      const response = await fetch('/api/finance/unpaid-balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Finance] 미지급 잔금 API 응답:', data);
        
        if (data.success) {
          const unpaidBalance = Number(data.data.totalUnpaidBalance ?? 0) || 0;
          
          console.log('[Finance] 미지급 잔금 계산 과정:');
          console.log(`  - 원본 미지급 잔금 (CNY): ${unpaidBalance}`);
          console.log(`  - 프로젝트 수: ${data.data.projectCount}`);
          
          // 미지급 잔금 설정
          if (unpaidBalance > 0) {
            setTotalUnpaidBalance(unpaidBalance);
            console.log('[Finance] 미지급 잔금 정보 설정 완료');
          } else {
            setTotalUnpaidBalance(0);
            console.log('[Finance] 미지급 잔금 정보가 없거나 0으로 설정됨');
          }
        } else {
          console.error('[Finance] 미지급 잔금 API 응답 실패:', data.message);
          setTotalUnpaidBalance(0);
        }
      } else {
        console.error('[Finance] 미지급 잔금 API 응답 오류:', response.status, response.statusText);
        setTotalUnpaidBalance(0);
      }
    } catch (error) {
      console.error('[Finance] 미지급 잔금 정보 조회 실패:', error);
      setTotalUnpaidBalance(0);
    }
  };





  useEffect(() => {
    fetchTransactions();
    fetchAdvancePayment();
    fetchTotalAmount();
    fetchTotalFee();
    fetchUnpaidAdvance();
    fetchUnpaidBalance();
  }, []);

  const filteredTransactions = transactions.filter(transaction => {
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch = (transaction.description?.toLowerCase() || '').includes(searchLower) ||
                         (transaction.reference?.toLowerCase() || '').includes(searchLower);
    const matchesDate = (!dateFilter?.startDate || (transaction.date && transaction.date >= dateFilter.startDate)) &&
                       (!dateFilter?.endDate || (transaction.date && transaction.date <= dateFilter.endDate));
    
    return matchesSearch && matchesDate;
  });

  const handleAddTransaction = (newTransaction) => {
    if (!newTransaction) return;
    
    // 새 거래 내역이 추가되면 목록을 새로고침
    fetchTransactions();
  };

  const calculateNewBalance = (amount) => {
    if (!transactions || transactions.length === 0) return amount;
    return (transactions[0]?.balance || 0) + amount;
  };

  const exportToExcel = () => {
    // Excel 내보내기 기능 (실제 구현 시 xlsx 라이브러리 사용)
    console.log('Excel 내보내기 기능');
  };

  // CNY 기준 요약 통계 (API에서 가져온 데이터 사용, 숫자 타입 보장)
  
  // 요약 통계 계산 로그
  console.log('[Finance] 요약 통계 계산:');
  console.log(`  - 총 거래금액 (CNY): ${totalTransactionAmount} (mj_project.total_amount 합계)`);
  console.log(`  - 총 advance_payment (CNY): ${totalAdvancePayment} (${Number(totalAdvancePayment).toFixed(2)})`);
  console.log(`  - 총 잔금 (CNY): ${totalBalance} (mj_project.balance_amount 합계)`);
  console.log(`  - 총 배송비 (CNY): ${totalShippingCost}`);
              console.log(`  - 미지급 선금 (CNY): ${totalUnpaidAdvance} (payment_status.advance = false인 프로젝트들의 advance_payment 합계)`);
  console.log(`  - 미지급 잔금 (CNY): ${totalUnpaidBalance} (payment_status.balance = false인 프로젝트들의 balance_amount 합계)`);
  console.log(`  - 참고: advance_payment, total_amount, fee는 이미 CNY 단위로 저장되어 있어 환율 변환 불필요`);
  console.log(`  - 변경사항: 모든 프로젝트의 advance_payment 합산 (payment_status.advance 조건 제거)`);
  console.log(`  - 변경사항: 총 잔금을 mj_project.fee 합계로 변경 (기존: total_amount - advance_payment)`);
              console.log(`  - 변경사항: 미지급 선금을 payment_status.advance = false인 프로젝트들의 advance_payment 합계로 계산`);
              console.log(`  - 변경사항: 미지급 잔금을 payment_status.balance = false인 프로젝트들의 fee 합계로 계산`);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">회계 장부</h1>
              <p className="text-gray-600 mt-1">수입/지출 관리 및 재무 현황</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Excel 내보내기</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('transaction')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>거래내역 추가</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats Table */}
          <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">재무 현황 요약</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                {/* 첫 번째 헤더 */}
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      총 거래금액
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      총 선금
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      총 잔금
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      총 배송비
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-300">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-green-600">
                          ¥{totalTransactionAmount.toLocaleString()} CNY
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-300">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-red-600">
                          ¥{Number(totalAdvancePayment).toLocaleString()} CNY
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-300">
                      <div className="flex flex-col items-center">
                        <span className={`text-xl font-bold ${totalBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          ¥{totalBalance.toLocaleString()} CNY
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-300">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center mb-2">
                          <Truck className="w-6 h-6 text-orange-600 mr-2" />
                          <span className="text-xl font-bold text-orange-600">
                            ¥{totalShippingCost.toLocaleString()} CNY
                          </span>
                        </div>

                      </div>
                    </td>
                  </tr>

                </tbody>
                {/* 두 번째 헤더 */}
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      미지급 선금
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      미지급 잔금
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      미지급 배송비
                    </th>
                  </tr>
                </thead>
                {/* 두 번째 본문 */}
                <tbody className="bg-white">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-300">
                      <div className="flex flex-col items-center">
                        <span className="text-sm text-gray-500">-</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-300">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-red-600">
                          ¥{Number(totalUnpaidAdvance).toLocaleString()} CNY
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-300">
                      <div className="flex flex-col items-center">
                        <span className={`text-xl font-bold ${totalUnpaidBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          ¥{Number(totalUnpaidBalance).toLocaleString()} CNY
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-300">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center mb-2">
                          <Truck className="w-6 h-6 text-orange-600 mr-2" />
                          <span className="text-xl font-bold text-orange-600">
                            ¥{totalShippingCost.toLocaleString()}
                          </span>
                        </div>

                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="거래내역 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'ledger', label: '장부', icon: Calendar },
                ...(isAdmin ? [{ id: 'transaction', label: '입금내역', icon: Plus }] : [])
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'ledger' && (
            <FinanceLedger 
              transactions={filteredTransactions}
              loading={loading}
            />
          )}
          {activeTab === 'transaction' && isAdmin && (
            <FinanceTransaction 
              onAddTransaction={handleAddTransaction}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Finance; 