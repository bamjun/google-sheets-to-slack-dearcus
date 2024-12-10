
function getWeekNumber(date) {
  // 다음 달의 첫 주차인지 확인
  var lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  var daysUntilEndOfMonth = lastDayOfMonth.getDate() - date.getDate();
  
  if (date.getDay() === 1 && daysUntilEndOfMonth < 5) { // 7에서 4로 변경
    return 1; // 다음 달의 1주차로 처리
  }
  
  var firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  var firstMonday = new Date(firstDayOfMonth);
  var firstDay = firstMonday.getDay();
  
  // 월의 첫날이 월~금요일인 경우, 해당 주를 1주차로 계산
  if (firstDay >= 1 && firstDay <= 5) {
    // 현재 날짜가 월의 첫 주에 속하는지 확인
    if (date.getDate() <= (7 - firstDay + 1)) {
      return 1;
    }
  }
  
  var diff = firstMonday.getDate() - firstDay + (firstDay === 0 ? -6 : 1);
  firstMonday.setDate(diff);
  
  var currentMonday = new Date(date);
  var day = currentMonday.getDay();
  diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
  currentMonday.setDate(diff);
  
  var weekNumber = Math.floor((currentMonday - firstMonday) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  // 월의 첫날이 토/일요일인 경우, 다음 주부터 1주차로 계산
  if (firstDay === 0) {
    weekNumber -= 1;
  }
  
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



