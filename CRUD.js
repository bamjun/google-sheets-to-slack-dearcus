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
