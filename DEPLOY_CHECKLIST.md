# EZCRM GitHub Pages + 실시간 DB 배포 체크리스트

## 1. GitHub Pages 정적 파일 업로드

- `index.html`, `ezmain.html`, `ezcrm.html`
- `assets/`
- `data/`
- `.nojekyll`

## 2. 온라인 DB 방식 선택

### 권장: Firebase Realtime Database

`assets/js/firebase-config.js`에서 `enabled:true`와 Firebase 값을 입력합니다.

```js
window.EZCRM_FIREBASE_CONFIG = {
  enabled: true,
  apiKey: "...",
  authDomain: "...firebaseapp.com",
  databaseURL: "https://...-default-rtdb.firebaseio.com",
  projectId: "...",
  storageBucket: "...appspot.com",
  messagingSenderId: "...",
  appId: "...",
  path: "ezcrm/v36"
};
```

Realtime Database Rules 테스트용 예시:

```json
{
  "rules": {
    "ezcrm": {
      "v36": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

운영 시에는 반드시 로그인/권한 규칙으로 바꾸세요.

### 선택: 자체 REST 서버

별도 서버에서 `server-example`을 실행하고 `assets/js/firebase-config.js`의 REST 설정을 켭니다.

```js
window.EZCRM_SERVER_PUSH_CONFIG = {
  enabled: true,
  endpoint: "https://YOUR_SERVER_DOMAIN/api/ezcrm-sync",
  readEndpoint: "https://YOUR_SERVER_DOMAIN/api/ezcrm-sync",
  method: "POST",
  token: "",
  mode: "cors",
  pollMs: 3000
};
```

## 3. 동기화 확인

1. PC A와 PC B에서 같은 GitHub Pages `ezcrm.html` 접속
2. PC A에서 고객 또는 A/S 데이터 저장
3. PC B의 우측 하단 상태가 `서버 DB 수신·화면 동기화 완료`로 바뀌는지 확인
4. PC B 화면 목록이 자동으로 갱신되는지 확인
5. `데이터 백업/복원 > 서버 DB 실시간 체크 > 서버 DB 즉시 불러오기`로 수동 확인

## 4. 중요

- GitHub Pages 자체에는 DB 쓰기 기능이 없습니다.
- 여러 클라이언트 동일 화면은 Firebase 또는 REST 서버가 켜져 있어야 가능합니다.
- 저장 전 입력 초안 전송과 실제 화면 DB 동기화는 별개입니다. 실제 화면 통일은 `payload` 전체 DB로 처리됩니다.
