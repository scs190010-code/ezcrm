/*
 * EZCRM GitHub Pages + Firebase Realtime Database 자동설정 파일
 * ------------------------------------------------------------
 * 현재 확인된 Firebase 프로젝트 정보:
 * - Project ID: eco-precept-499606-b4
 * - Project Number: 216968504440
 *
 * 이 최종본은 Firebase 웹앱 apiKey/appId가 아직 없어도 동작하도록
 * Firebase Realtime Database REST 자동연결 모드(firebase-rest-auto)를 기본 사용합니다.
 *
 * 대표님이 해야 할 것은 Firebase 콘솔에서 Realtime Database만 만들고 Rules를 열어주는 것입니다.
 * GitHub Pages에는 이 ZIP 압축을 풀어 그대로 업로드하면 됩니다.
 */

// 기본 동기화 엔진
// firebase-rest-auto: 웹앱 apiKey 없이도 Realtime Database REST API로 읽기/쓰기/폴링 동기화
// firebase: Firebase Web SDK 설정값(apiKey/appId 포함)을 넣었을 때 실시간 이벤트 구독
// rest: 자체 Node.js 서버 API를 직접 운영할 때만 사용
window.EZCRM_SYNC_ENGINE = 'firebase-rest-auto';

window.EZCRM_FIREBASE_CONFIG = {
  enabled: true,

  // 현재 화면에서 확인된 Firebase 프로젝트 정보
  projectId: "eco-precept-499606-b4",
  projectNumber: "216968504440",

  // Realtime Database 기본 예상 URL입니다.
  // Firebase에서 DB 위치를 다른 지역으로 만들면 아래 databaseURLs 후보를 자동 순차 시도합니다.
  databaseURL: "https://eco-precept-499606-b4-default-rtdb.firebaseio.com",

  // 지역형 Firebase DB URL 후보입니다. 실제 DB URL과 맞는 것을 자동으로 찾아 사용합니다.
  // Firebase 콘솔 > Realtime Database > 데이터 탭 상단에 보이는 URL과 정확히 일치하는 항목이 있으면 가장 좋습니다.
  databaseURLs: [
    "https://eco-precept-499606-b4-default-rtdb.firebaseio.com",
    "https://eco-precept-499606-b4-default-rtdb.asia-southeast1.firebasedatabase.app",
    "https://eco-precept-499606-b4-default-rtdb.asia-northeast3.firebasedatabase.app",
    "https://eco-precept-499606-b4-default-rtdb.us-central1.firebasedatabase.app",
    "https://eco-precept-499606-b4-default-rtdb.europe-west1.firebasedatabase.app"
  ],

  // Firebase Web SDK용 값입니다. 웹앱을 등록해서 firebaseConfig 전체를 받으면 여기에 넣어도 됩니다.
  // 현재 최종본은 firebase-rest-auto 방식이라 이 값들이 비어 있어도 서버 DB 동기화를 시도합니다.
  apiKey: "",
  authDomain: "eco-precept-499606-b4.firebaseapp.com",
  storageBucket: "eco-precept-499606-b4.appspot.com",
  messagingSenderId: "216968504440",
  appId: "",

  // EZCRM 데이터 저장 경로. 모든 클라이언트가 반드시 같은 path를 봐야 합니다.
  path: "ezcrm/v36",

  // REST 자동 폴링 주기: 다른 PC/모바일 변경사항을 이 주기마다 확인합니다.
  pollMs: 3000
};

/* 자체 서버 동기화 옵션. 지금은 사용하지 않습니다. 켜면 REST Failed to fetch가 날 수 있으므로 false 유지. */
window.EZCRM_SERVER_PUSH_CONFIG = {
  enabled: false,
  engine: 'rest',
  forceRest: false,
  endpoint: "",
  readEndpoint: "",
  method: "POST",
  token: "",
  mode: "cors",
  pollMs: 3000
};

/* 입력 중인 값 자동전송 옵션: 저장 전 초안/이벤트 로그 용도입니다. 실제 화면 DB 동기화는 payload 수신으로 처리됩니다. */
window.EZCRM_CLIENT_AUTOSYNC_CONFIG = {
  enabled: true,
  debounceMs: 900,
  queueWhenOffline: true,
  includeHidden: false,
  maxTextLength: 5000
};
