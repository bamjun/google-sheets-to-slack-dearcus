// 트리거 설정하기
// sendMondayMessage() - 매일 8~9시
//sendDailyMessage() - 매일 8~9시

// 파일 최상단에 추가
const IS_DEV_MODE = true; // 개발 모드 여부
const DEV_TEST_DATE = '2025-2-17'; // 테스트용 날짜

function sendMondayMessage() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0]; // 첫 번째 시트를 가져옵니다
  var dataRange = sheet.getDataRange();
  var data = dataRange.getValues();

  var headers = data[0];
  var rows = data.slice(1);

  // 날짜 처리 로직 개선
  var today = IS_DEV_MODE ? new Date(DEV_TEST_DATE) : new Date();
  if (today.getDay() !== 1) {
    // 오늘이 월요일이 아니면 종료
    return;
  }

  // 사용자 ID 매핑 가져오기
  var userIdMapping = getUserIdMapping();

  var weekNumber = getWeekNumber(today);
  var month = today.getMonth() + 1;

  var leaveTypes = ["연차", "반차", "반반차", "공가"];
  var meetingTypes = ["사내미팅", "외부미팅", "인터뷰", "업무/외근", "자문"];

  var leaveData = [];
  var meetingData = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var person = row[0];
    var type = row[1];
    var name = row[2];
    var dateStr = row[3];
    var dateInfo = parseDate(dateStr);

    if (isDateInWeek(dateInfo, today)) {
      if (leaveTypes.indexOf(type) !== -1) {
        leaveData.push({
          person: person,
          type: type,
          name: name,
          dateInfo: dateInfo
        });
      } else if (meetingTypes.indexOf(type) !== -1) {
        meetingData.push({
          person: person,
          type: type,
          name: name,
          dateInfo: dateInfo
        });
      }
    }
  }

  var message = "";
  if (today.getDay() === 1 && today.getDate() >= 25) {
    var nextMonth = new Date(today);
    nextMonth.setDate(1);
    nextMonth.setMonth(today.getMonth() + 1);
    message += "*디어커스 " + (nextMonth.getMonth() + 1) + "월 1주차 일정입니다.*\n\n\n";
  } else {
    message += "*디어커스 " + month + "월 " + weekNumber + "주차 일정입니다.*\n\n\n";
  }

  // 연차/공가
  message += "*연차/공가 사용인원 : 총 " + leaveData.length + "명*\n";
  var leaveByDate = groupDataByDate(leaveData);
  for (var dateKey in leaveByDate) {
    var items = leaveByDate[dateKey];
    message += dateKey + " : ";
    var names = items.map(function(item) {
      var userMention = getUserMentions(item.person, userIdMapping);
      return userMention + " " + item.name;
    });
    message += names.join(", ") + "\n";
  }

  // 미팅 등
  message += "\n\n*미팅, 외근, 자문 일정 : 총 " + meetingData.length + "건*\n";
  for (var i = 0; i < meetingData.length; i++) {
    var item = meetingData[i];
    var userMentions = getUserMentions(item.person, userIdMapping);
    message += "[" + item.type + "] " + item.name + " : " + userMentions + " ";
    message += formatDateAndTime(item.dateInfo.startDate) + "\n";
  }

  message += "\n\n이번주도 화이팅!";

  sendToSlack(message);
}

function sendDailyMessage() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0]; // ss.getSheetByName('시트이름');  스프레드시트의 시트 이름을 지정하세요
  var dataRange = sheet.getDataRange();
  var data = dataRange.getValues();
  
  var headers = data[0];
  var rows = data.slice(1);
  
  // 날짜 처리 로직 개선
  var today = IS_DEV_MODE ? new Date(DEV_TEST_DATE) : new Date();
  if (today.getDay() === 0 || today.getDay() === 6) {
    // 주말이면 행사/프로모션만
    return;
    var weRingTypes = [];
  } else {
    var weRingTypes = ["위링타임"];
  }
  
  // 사용자 ID 매핑 가져오기
  var userIdMapping = getUserIdMapping();
  
  var eventTypes = ["행사/프로모션"];
  
  
  var startingPromotions = [];
  var endingPromotions = [];
  var weRingData = [];
  
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var person = row[0];
    var type = row[1];
    var name = row[2];
    var dateStr = row[3];
    var dateInfo = parseDate(dateStr);
    
    if (eventTypes.indexOf(type) !== -1) {
      if (isSameDay(dateInfo.startDate, today)) {
        startingPromotions.push(name);
      }
      if (isSameDay(dateInfo.endDate, today)) {
        endingPromotions.push(name);
      }
    } else if (weRingTypes.indexOf(type) !== -1) {
      if (isSameDay(dateInfo.startDate, today)) {
        weRingData.push({
          name: name,
          person: person
        });
      }
    }
  }
  
  // 시작하거나 끝나는 프로모션이 없으면 메시지를 전송하지 않음
  if (startingPromotions.length === 0 && endingPromotions.length === 0) {
    return;
  }

  var message = "*오늘의 행사 일정입니다.*\n\n\n";
  
  if (startingPromotions.length > 0) {
    message += "*오늘 시작하는 프로모션 : 총 " + startingPromotions.length + "건*\n";
    message += startingPromotions.join("\n") + "\n";
  }
  
  if (endingPromotions.length > 0) {
    message += "\n\n*오늘 끝나는 프로모션 : 총 " + endingPromotions.length + "건*\n";
    message += endingPromotions.join("\n") + "\n";
  }
  
  // if (weRingData.length > 0) {
  //   message += "\n\n*오늘 진행 위링타임*\n";
  //   for (var i = 0; i < weRingData.length; i++) {
  //     var item = weRingData[i];
  //     var userMentions = getUserMentions(item.person, userIdMapping);
  //     message += item.name + " : " + userMentions + "\n";
  //   }
  // }
  
  sendToSlackForPromotion(message);
}

