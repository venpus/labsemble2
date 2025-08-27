import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Package,
  Hash
} from 'lucide-react';

const MJCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [activeTab, setActiveTab] = useState('order'); // 'order' 또는 'logistics'
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    assignee: '',
    productName: '',
    quantity: '',
    unit: '개'
  });

  // 샘플 데이터 (실제로는 API에서 가져올 데이터)
  useEffect(() => {
    const orderEvents = [
      // 오늘 날짜 (많은 상품)
      {
        id: 1,
        title: 'MJ 프로젝트 A',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        location: '공장 A',
        description: '첫 번째 배치 생산 시작',
        assignee: '김철수',
        productName: 'LED 모듈',
        quantity: '1000',
        unit: '개',
        createdAt: new Date().toISOString()
      },

      // 8월 4일 (3개 상품) - 임시 배치
      {
        id: 40,
        title: 'MJ 프로젝트 NN',
        date: '2024-08-04',
        time: '09:00',
        location: '공장 X',
        description: '여름 특별 프로젝트 시작',
        assignee: '김여름',
        productName: '냉각 팬',
        quantity: '500',
        unit: '개',
        createdAt: new Date().toISOString()
      },
      {
        id: 41,
        title: 'MJ 프로젝트 OO',
        date: '2024-08-04',
        time: '14:00',
        location: '창고 S',
        description: '부품 입고 및 검수',
        assignee: '박여름',
        productName: '히트싱크',
        quantity: '300',
        unit: '개',
        createdAt: new Date().toISOString()
      },
      {
        id: 42,
        title: 'MJ 프로젝트 PP',
        date: '2024-08-04',
        time: '16:00',
        location: '공장 Y',
        description: '품질 테스트 진행',
        assignee: '이여름',
        productName: '온도 센서',
        quantity: '200',
        unit: '개',
        createdAt: new Date().toISOString()
      },

      // 8월 12일 (5개 상품) - 임시 배치
      {
        id: 43,
        title: 'MJ 프로젝트 QQ',
        date: '2024-08-12',
        time: '09:00',
        location: '공장 Z',
        description: '가을 시즌 준비 시작',
        assignee: '최가을',
        productName: 'LED 스트립',
        quantity: '1000',
        unit: 'm',
        createdAt: new Date().toISOString()
      },
      {
        id: 44,
        title: 'MJ 프로젝트 RR',
        date: '2024-08-12',
        time: '10:00',
        location: '창고 T',
        description: '부품 대량 입고',
        assignee: '김가을',
        productName: '컨트롤러 보드',
        quantity: '400',
        unit: '개',
        createdAt: new Date().toISOString()
      },
      {
        id: 45,
        title: 'MJ 프로젝트 SS',
        date: '2024-08-12',
        time: '14:00',
        location: '공장 AA',
        description: '조립 라인 가동',
        assignee: '박가을',
        productName: '전원 모듈',
        quantity: '250',
        unit: '개',
        createdAt: new Date().toISOString()
      },
      {
        id: 46,
        title: 'MJ 프로젝트 TT',
        date: '2024-08-12',
        time: '16:00',
        location: '창고 U',
        description: '품질 검사 및 포장',
        assignee: '이가을',
        productName: '커넥터 세트',
        quantity: '800',
        unit: '개',
        createdAt: new Date().toISOString()
      },
      {
        id: 47,
        title: 'MJ 프로젝트 UU',
        date: '2024-08-12',
        time: '18:00',
        location: '공장 BB',
        description: '최종 테스트 완료',
        assignee: '최가을',
        productName: '디스플레이 패널',
        quantity: '150',
        unit: '개',
        createdAt: new Date().toISOString()
      }
    ];

    const logisticsEvents = [
      // 오늘 날짜 (물류 일정)
      {
        id: 100,
        title: '배송 일정 A',
        date: new Date().toISOString().split('T')[0],
        time: '08:00',
        location: '창고 A',
        description: '첫 번째 배송 출발',
        assignee: '배송팀 A',
        productName: 'LED 모듈',
        quantity: '1000',
        unit: '개',
        createdAt: new Date().toISOString()
      },
      {
        id: 101,
        title: '배송 일정 B',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        location: '창고 B',
        description: '두 번째 배송 출발',
        assignee: '배송팀 B',
        productName: '센서 부품',
        quantity: '500',
        unit: '개',
        createdAt: new Date().toISOString()
      },
      {
        id: 102,
        title: '배송 일정 C',
        date: new Date().toISOString().split('T')[0],
        time: '14:00',
        location: '창고 C',
        description: '세 번째 배송 출발',
        assignee: '배송팀 C',
        productName: '컨트롤러',
        quantity: '200',
        unit: '개',
        createdAt: new Date().toISOString()
      },

      // 8월 4일 (물류 일정)
      {
        id: 103,
        title: '물류 일정 D',
        date: '2024-08-04',
        time: '09:00',
        location: '창고 X',
        description: '여름 특별 물류 시작',
        assignee: '물류팀 여름',
        productName: '냉각 팬',
        quantity: '500',
        unit: '개',
        createdAt: new Date().toISOString()
      },
      {
        id: 104,
        title: '물류 일정 E',
        date: '2024-08-04',
        time: '15:00',
        location: '창고 Y',
        description: '물류 검수 및 포장',
        assignee: '물류팀 여름',
        productName: '히트싱크',
        quantity: '300',
        unit: '개',
        createdAt: new Date().toISOString()
      },

      // 8월 12일 (물류 일정)
      {
        id: 105,
        title: '물류 일정 F',
        date: '2024-08-12',
        time: '08:00',
        location: '창고 Z',
        description: '가을 시즌 물류 준비',
        assignee: '물류팀 가을',
        productName: 'LED 스트립',
        quantity: '1000',
        unit: 'm',
        createdAt: new Date().toISOString()
      },
      {
        id: 106,
        title: '물류 일정 G',
        date: '2024-08-12',
        time: '12:00',
        location: '창고 AA',
        description: '물류 대량 처리',
        assignee: '물류팀 가을',
        productName: '컨트롤러 보드',
        quantity: '400',
        unit: '개',
        createdAt: new Date().toISOString()
      },
      {
        id: 107,
        title: '물류 일정 H',
        date: '2024-08-12',
        time: '16:00',
        location: '창고 BB',
        description: '최종 물류 검수',
        assignee: '물류팀 가을',
        productName: '전원 모듈',
        quantity: '250',
        unit: '개',
        createdAt: new Date().toISOString()
      }
    ];

    // 활성 탭에 따라 다른 데이터 설정
    if (activeTab === 'order') {
      setEvents(orderEvents);
    } else {
      setEvents(logisticsEvents);
    }
  }, [activeTab]);

  // 현재 월의 첫 번째 날과 마지막 날 계산
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

  // 캘린더 그리드 생성
  const generateCalendarDays = () => {
    const days = [];
    const currentDateObj = new Date(startDate);

    // 한달 전체 표시 (42일 - 6주)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDateObj));
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }

    return days;
  };

  // 이전 월로 이동
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // 다음 월로 이동
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 오늘 날짜로 이동
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // 날짜 선택
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setNewEvent(prev => ({ ...prev, date: date.toISOString().split('T')[0] }));
  };

  // 새 이벤트 추가
  const handleAddEvent = () => {
    if (newEvent.title && newEvent.date && newEvent.productName && newEvent.quantity) {
      const event = {
        id: Date.now(),
        ...newEvent,
        createdAt: new Date().toISOString()
      };
      setEvents([...events, event]);
      setNewEvent({
        title: '',
        date: '',
        time: '',
        location: '',
        description: '',
        assignee: '',
        productName: '',
        quantity: '',
        unit: '개'
      });
      setShowEventModal(false);
    }
  };

  // 이벤트 삭제
  const handleDeleteEvent = (eventId) => {
    setEvents(events.filter(event => event.id !== eventId));
  };

  // 선택된 날짜의 이벤트들
  const selectedDateEvents = events.filter(event => 
    event.date === selectedDate?.toISOString().split('T')[0]
  );

  const calendarDays = generateCalendarDays();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">MJ 캘린더</h1>
              <p className="text-gray-600 mt-1">
                {activeTab === 'order' ? '주문 일정 및 상품 생산 관리' : '물류 일정 및 배송 관리'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                오늘
              </button>
              <button
                onClick={() => setShowEventModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>일정 추가</span>
              </button>
            </div>
          </div>
        </div>

        {/* 탭 버튼 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('order')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'order'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              주문달력
            </button>
            <button
              onClick={() => setActiveTab('logistics')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'logistics'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-600'
              }`}
            >
              물류달력
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* 캘린더 - 전체 너비 사용 */}
          <div className="w-full">
            <div className="bg-white rounded-lg shadow-sm">
              {/* 캘린더 헤더 */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currentDate.toLocaleDateString('ko-KR', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </h2>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 border-b">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* 캘린더 그리드 - 한달 전체 표시 */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = day.toDateString() === new Date().toISOString().split('T')[0];
                  const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
                  const dayEvents = events.filter(event => 
                    event.date === day.toISOString().split('T')[0]
                  );
                  
                  // 행의 마지막 날짜인지 확인 (7의 배수 - 1)
                  const isEndOfRow = (index + 1) % 7 === 0;
                  // 행의 첫 번째 날짜인지 확인 (7의 배수)
                  const isStartOfRow = (index + 1) % 7 === 1;

                  return (
                    <div
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={`border-b cursor-pointer transition-colors ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${
                        isToday ? 'bg-blue-50' : ''
                      } ${
                        isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                      } hover:bg-gray-50 ${
                        isStartOfRow ? 'border-l' : ''
                      } ${
                        isEndOfRow ? 'border-r' : 'border-r'
                      }`}
                      style={{
                        minHeight: `${Math.max(100, dayEvents.length * 32 + 50)}px`,
                        height: `${Math.max(100, dayEvents.length * 32 + 50)}px`
                      }}
                    >
                      <div className={`text-sm font-medium p-1.5 ${
                        isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${
                        isToday ? 'text-white bg-orange-500 px-2 py-1 rounded-full font-bold shadow-md' : ''
                      }`}>
                        {day.getDate()}
                      </div>
                      
                      {/* 상품 정보 표시 - 동적 높이 조절 */}
                      <div className="px-1.5 pb-1.5 space-y-0.5">
                        {dayEvents.slice(0, 10).map(event => (
                          <div
                            key={event.id}
                            className="text-xs p-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md"
                            title={`${event.productName} ${event.quantity}${event.unit}`}
                          >
                            <div className="flex items-center justify-between text-blue-700">
                              <span className="truncate flex-1">
                                {event.productName}
                              </span>
                              <span className="text-green-700 font-medium ml-1 flex-shrink-0">
                                {event.quantity}{event.unit}
                              </span>
                            </div>
                          </div>
                        ))}
                        {dayEvents.length > 10 && (
                          <div className="text-xs text-gray-500 text-center py-0.5">
                            +{dayEvents.length - 10} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 이벤트 추가 모달 */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">새 일정 추가</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  프로젝트명 *
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="프로젝트명을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  날짜 *
                </label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품명 *
                </label>
                <input
                  type="text"
                  value={newEvent.productName}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, productName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="상품명을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    수량 *
                  </label>
                  <input
                    type="number"
                    value={newEvent.quantity}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="수량"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    단위
                  </label>
                  <select
                    value={newEvent.unit}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="개">개</option>
                    <option value="박스">박스</option>
                    <option value="세트">세트</option>
                    <option value="kg">kg</option>
                    <option value="m">m</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시간
                </label>
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  장소
                </label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="장소를 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당자
                </label>
                <input
                  type="text"
                  value={newEvent.assignee}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, assignee: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="담당자를 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="일정에 대한 설명을 입력하세요"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddEvent}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

export default MJCalendar; 