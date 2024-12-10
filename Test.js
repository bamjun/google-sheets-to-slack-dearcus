function debugGetWeekPrint() {
  // 시작 날짜 설정
  let currentDate = new Date('2024-12-02');
  // 종료 날짜 설정
  const endDate = new Date('2025-12-21');
  
  // 매주 월요일마다 반복
  while (currentDate <= endDate) {
    console.log(`${currentDate.toISOString().split('T')[0]}: Week ${getWeekNumber(currentDate)}`);
    // 다음 월요일로 이동 (7일 추가)
    currentDate.setDate(currentDate.getDate() + 7);
  }
}