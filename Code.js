// 트리거 설정하기
// sendMondayMessage() - 매일 8~9시
//sendDailyMessage() - 매일 8~9시

// 파일 최상단에 추가
const IS_DEV_MODE = true; // 개발 모드 여부
const DEV_TEST_DATE = '2024-09-30'; // 테스트용 날짜

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

  var message = "💬";
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

function getWeekNumber(date) {
  // 다음 달의 첫 주차인지 확인
  var lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  var daysUntilEndOfMonth = lastDayOfMonth.getDate() - date.getDate();
  
  if (date.getDay() === 1 && daysUntilEndOfMonth < 7) { // 월요일이고 월말이 7일 이내인 경우
    return 1; // 다음 달의 1주차로 처리
  }
  
  var firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  var firstMonday = new Date(firstDayOfMonth);
  var day = firstMonday.getDay();
  var diff = firstMonday.getDate() - day + (day === 0 ? -6 : 1);
  firstMonday.setDate(diff);
  
  var currentMonday = new Date(date);
  day = currentMonday.getDay();
  diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
  currentMonday.setDate(diff);
  
  var weekNumber = Math.floor((currentMonday - firstMonday) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  return weekNumber;
}
function getWeekStartDate(date) {
  var month = date.getMonth();
  var year = date.getFullYear();
  
  // 해당 월의 첫 번째 날짜
  var firstDayOfMonth = new Date(year, month, 1);
  
  // 현재 날짜의 월요일 찾기
  var currentMonday = new Date(date);
  var day = currentMonday.getDay();
  var diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
  currentMonday.setDate(diff);
  currentMonday.setHours(0, 0, 0, 0);
  
  return currentMonday;
}


function isDateInWeek(dateInfo, referenceDate) {
  var weekStartDate = getWeekStartDate(referenceDate);
  var weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6); // 일요일

  // 시간 부분 제거
  weekStartDate.setHours(0, 0, 0, 0);
  weekEndDate.setHours(23, 59, 59, 999);
  dateInfo.startDate.setHours(0, 0, 0, 0);
  dateInfo.endDate.setHours(23, 59, 59, 999);

  // 이벤트의 날짜 범위와 주차의 날짜 범위가 겹치는지 확인
  return (dateInfo.startDate <= weekEndDate && dateInfo.endDate >= weekStartDate);
}


function parseDate(dateStr) {
  dateStr = dateStr.trim();
  if (dateStr.indexOf('→') !== -1) {
    var parts = dateStr.split('→');
    var startDateStr = parts[0].trim();
    var endDateStr = parts[1].trim();
    var startDate = parseDateString(startDateStr);
    var endDate = parseDateString(endDateStr);
    return {
      startDate: startDate,
      endDate: endDate
    };
  } else {
    var date = parseDateString(dateStr);
    return {
      startDate: date,
      endDate: date
    };
  }
}

function parseDateString(dateStr) {
  var dateParts = dateStr.split(/[\/\-]/);
  if (dateParts.length >= 3) {
    var year = parseInt(dateParts[0], 10);
    var month = parseInt(dateParts[1], 10) - 1;
    var day = parseInt(dateParts[2], 10);
    var date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    return date;
  } else {
    var date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date;
  }
}

function formatDate(date) {
  var month = date.getMonth() + 1;
  var day = date.getDate();
  return month + "월 " + day + "일";
}

function formatDateTime(date) {
  var hour = date.getHours();
  var minute = date.getMinutes();
  if (hour === 0 && minute === 0 || hour === 23 && minute === 59 ) {
    return ''; // 시간이 00:00인 경우 빈 문자열 반환
  }
  var period = hour >= 12 ? "오후" : "오전";
  hour = hour % 12 || 12;
  return period + " " + hour + "시 " + (minute > 0 ? minute + "분" : "");
}

function formatDateAndTime(date) {
  var dateStr = formatDate(date);
  var timeStr = formatDateTime(date);
  if (timeStr) {
    return dateStr + " " + timeStr;
  } else {
    return dateStr;
  }
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
  
  var message = "*💬오늘의 행사 및 위링타임 일정입니다.*\n\n\n";
  
  if (startingPromotions.length > 0) {
    message += "*오늘 시작하는 프로모션 : 총 " + startingPromotions.length + "건*\n";
    message += startingPromotions.join("\n") + "\n";
  }
  
  if (endingPromotions.length > 0) {
    message += "\n\n*오늘 끝나는 프로모션 : 총 " + endingPromotions.length + "건*\n";
    message += endingPromotions.join("\n") + "\n";
  }
  
  if (weRingData.length > 0) {
    message += "\n\n*오늘 진행 위링타임*\n";
    for (var i = 0; i < weRingData.length; i++) {
      var item = weRingData[i];
      var userMentions = getUserMentions(item.person, userIdMapping);
      message += item.name + " : " + userMentions + "\n";
    }
  }
  
  sendToSlackForPromotion(message);
}

// 사용자 멘션 생성 함수
function getUserMentions(personStr, userIdMapping) {
  var names = personStr.split(",").map(function(name) {
    name = name.trim();
    var userId = userIdMapping[name];
    if (userId) {
      return "<@" + userId + ">";
    } else {
      // 이름의 전체 자릿수를 가져와 앞에서부터 자릿수까지 검사
      var matchingKeys = [];
      for (var key in userIdMapping) {
        if (key.startsWith(name)) {
          matchingKeys.push(key);
        }
      }
      if (matchingKeys.length === 1) {
        // 정확히 하나의 일치하는 사용자가 있는 경우
        var matchedUserId = userIdMapping[matchingKeys[0]];
        return "<@" + matchedUserId + ">";
      } else {
        // 일치하는 사용자가 없거나 여러 명인 경우 이름 그대로 표시
        return "@" + name;
      }
    }
  });
  return names.join(", ");
}

function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}



function groupDataByDate(dataArray) {
  var groupedData = {};
  for (var i = 0; i < dataArray.length; i++) {
    var item = dataArray[i];
    var startDate = formatDate(item.dateInfo.startDate);
    var endDate = formatDate(item.dateInfo.endDate);
    var dateKey = startDate;
    if (startDate !== endDate) {
      dateKey += " ~ " + endDate;
    }
    if (!groupedData[dateKey]) {
      groupedData[dateKey] = [];
    }
    groupedData[dateKey].push(item);
  }
  return groupedData;
}


function sendToSlack(message) {
  if (IS_DEV_MODE) {
    Logger.log('DEV MODE - Message:');
    Logger.log(message);
    return;
  }
  
  var scriptProperties = PropertiesService.getScriptProperties();
  var url = scriptProperties.getProperty('SlackWebhookId'); // 슬랙 웹훅 URL을 입력하세요
  var payload = {
    text: message,
    unfurl_links: false, // 링크 미리보기 비활성화
    unfurl_media: false  // 미디어 미리보기 비활성화
  };
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch (error) {
    Logger.log('Slack 메시지 전송 실패: ' + error.toString());
  }
}

function sendToSlackForPromotion(message) {
  if (IS_DEV_MODE) {
    Logger.log('DEV MODE - Message:');
    Logger.log(message);
    return;
  }
  var scriptProperties = PropertiesService.getScriptProperties();
  var url = scriptProperties.getProperty('SlackWebhookIdForPromotion'); // 슬랙 웹훅 URL을 입력하세요
  var payload = {
    text: message
  };
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  UrlFetchApp.fetch(url, options);
}





function getUserIdMapping() {
  // dev return 지우기
  // return {
  //   '모건': 'U05PELYA1RB',
  //   '헤이든': 'U076CD9UF7X',
  //   '어스': 'U07744AUMMW',
  //   '엘렌': 'U077A0REBPS',
  //   '제이스': 'U078C8M9DPU',
  //   '안나': 'U076CD9MQHK',
  //   '제니': 'U078RS0M21X',
  //   '플라워': 'U076F74122X',
  //   '퍼핏캣': 'U07Q01M13UJ',
  //   'Slackbot': 'USLACKBOT',
  //   '엘린': 'U077WTB7MPC',
  //   '루피': 'U076M9V3M0B',
  //   '앤디': 'U076JU8AFB7',
  //   '레오': 'U0760PBKBD5',
  //   '톰': 'U07K12U4MM1',
  //   '소피아': 'U07AFGWCSTS',
  //   '류영광': 'U05PELYA1RB',
  //   '스칼렛': 'U0760PBP6G7',
  //   '대니': 'U05PAV3L006',
  //   '프레디(정현민)': 'U076KDK410D',
  //   '소나': 'U0766SWB2R5',
  //   '이안': 'U07JY9HUAKF',
  //   '샐리': 'U076HQEJPBN',
  //   '헌트': 'U076HQEGCTE',
  //   '샤이닝': 'U0768M8KP2A',
  //   '마이클': 'U05Q77CCHME',
  //   '김혜승': 'U0760PBKBD5',
  //   '아론': 'U0768M8T3U6'
  // };
  var scriptProperties = PropertiesService.getScriptProperties();
  var token = scriptProperties.getProperty('OAuthToken');
  
  if (!token) {
    throw new Error('OAuth 토큰이 설정되어 있지 않습니다. 스크립트 속성에 OAuthToken을 설정하세요.');
  }
  
  var url = 'https://slack.com/api/users.list';
  var options = {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());
  
  if (!result.ok) {
    throw new Error('슬랙 API 호출 오류: ' + result.error);
  }
  
  var members = result.members;
  var mapping = {};
  
  for (var i = 0; i < members.length; i++) {
    var member = members[i];
    if (member.deleted || member.is_bot) {
      continue; // 탈퇴한 사용자나 봇은 제외
    }
    var realName = member.real_name_normalized || member.real_name;
    var displayName = member.profile.display_name_normalized || member.profile.display_name;
    var userId = member.id;
    
    // 필요에 따라 realName, displayName 등을 조합하여 매핑
    mapping[realName] = userId;
    mapping[displayName] = userId;
  }
  return mapping;
}


