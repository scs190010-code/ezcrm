/*
 * EZCRM Online JSON DB 설정 파일
 * ------------------------------------------------------------
 * 1) Firebase Console에서 Web App을 생성합니다.
 * 2) Realtime Database를 생성합니다.
 * 3) 아래 값을 본인 프로젝트 값으로 교체합니다.
 * 4) enabled: true 로 변경하면 GitHub Pages에서도 온라인 JSON DB 동기화가 켜집니다.
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
