/*
 * EZCRM Online JSON DB / Client Auto Server Push 설정 파일
 * ------------------------------------------------------------
 * A. Firebase Realtime Database 방식
 * 1) Firebase Console에서 Web App을 생성합니다.
 * 2) Realtime Database를 생성합니다.
 * 3) 아래 Firebase 값을 본인 프로젝트 값으로 교체합니다.
 * 4) enabled: true 로 변경하면 GitHub Pages에서도 온라인 JSON DB 동기화가 켜집니다.
 *
 * B. 자체 서버 REST API 방식
 * - Firebase 대신/추가로 직접 만든 서버 API에 입력값과 전체 DB 저장 이벤트를 POST 할 수 있습니다.
 * - 서버는 CORS에서 GitHub Pages 도메인을 허용해야 합니다.
 */
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

/* 자체 서버 자동전송 옵션. endpoint를 넣고 enabled:true로 바꾸면 모든 저장/입력 이벤트가 POST 됩니다. */
window.EZCRM_SERVER_PUSH_CONFIG = {
  enabled: false,
  endpoint: "https://YOUR_SERVER_DOMAIN/api/ezcrm-sync",
  method: "POST",
  token: "",
  mode: "cors"
};

/* 입력 중인 값 자동전송 옵션 */
window.EZCRM_CLIENT_AUTOSYNC_CONFIG = {
  enabled: true,
  debounceMs: 900,
  queueWhenOffline: true,
  includeHidden: false,
  maxTextLength: 5000
};
