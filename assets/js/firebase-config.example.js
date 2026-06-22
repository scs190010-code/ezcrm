/*
 * EZCRM Online JSON DB / Realtime Sync 설정 파일
 * ------------------------------------------------------------
 * A. Firebase Realtime Database 방식
 * - GitHub Pages 같은 정적 호스팅에서도 모든 클라이언트가 같은 DB를 보게 하는 권장 방식입니다.
 * - Firebase Console > Project settings > Web app 설정값을 아래에 넣고 enabled:true 로 바꾸세요.
 * - databaseURL은 Realtime Database URL이어야 합니다.
 *
 * B. 자체 서버 REST API 방식
 * - Firebase 대신 직접 만든 서버를 사용할 경우 endpoint/readEndpoint를 설정합니다.
 * - 서버는 POST 저장과 GET 읽기를 모두 지원해야 클라이언트 화면 동기화가 됩니다.
 */
// 기본 동기화 엔진: Firebase 사용자는 그대로 'firebase'를 유지하세요.
// REST 자체 서버를 직접 운영할 때만 'rest'로 바꿉니다.
window.EZCRM_SYNC_ENGINE = 'firebase';

window.EZCRM_FIREBASE_CONFIG = {
  enabled: false,
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  path: "ezcrm/v36"
};

/* 자체 서버 동기화 옵션. GET으로 전체 DB를 읽고 POST로 저장할 수 있어야 합니다. */
window.EZCRM_SERVER_PUSH_CONFIG = {
  // 중요: GitHub Pages 주소를 endpoint로 넣으면 Failed to fetch가 납니다.
  // Firebase 방식이면 반드시 false로 두세요.
  enabled: false,
  engine: 'rest',
  forceRest: false,
  endpoint: "https://YOUR_SERVER_DOMAIN/api/ezcrm-sync",
  readEndpoint: "https://YOUR_SERVER_DOMAIN/api/ezcrm-sync",
  method: "POST",
  token: "",
  mode: "cors",
  pollMs: 3000
};

/* 입력 중인 값 자동전송 옵션: 저장 전 초안/이벤트 로그 용도입니다. 실제 화면 DB 동기화는 payload 실시간 수신으로 처리됩니다. */
window.EZCRM_CLIENT_AUTOSYNC_CONFIG = {
  enabled: true,
  debounceMs: 900,
  queueWhenOffline: true,
  includeHidden: false,
  maxTextLength: 5000
};
