# REST 서버 읽기 실패(Failed to fetch) 수정 안내

## 원인

`REST 서버 읽기 실패 Failed to fetch`는 대부분 `assets/js/firebase-config.js`에서 `EZCRM_SERVER_PUSH_CONFIG.enabled`가 `true`인데 실제 REST API 서버가 없거나, GitHub Pages 주소를 endpoint로 넣었을 때 발생합니다. GitHub Pages는 정적 호스팅이라 `/api/ezcrm-sync` 같은 서버 API를 실행할 수 없습니다.

## 이번 수정 내용

1. 기본 동기화 엔진을 Firebase로 고정했습니다.
2. Firebase 설정이 켜져 있으면 REST 폴링은 자동으로 실행하지 않습니다.
3. `YOUR_SERVER_DOMAIN`, GitHub Pages, Netlify, Vercel 같은 정적 URL은 REST 서버로 오인하지 않도록 차단했습니다.
4. REST를 직접 쓰는 경우에만 `window.EZCRM_SYNC_ENGINE = 'rest'` 와 실제 API endpoint를 함께 설정하도록 변경했습니다.

## Firebase 방식 권장 설정

```js
window.EZCRM_SYNC_ENGINE = 'firebase';

window.EZCRM_FIREBASE_CONFIG = {
  enabled: true,
  apiKey: '실제 Firebase apiKey',
  authDomain: '프로젝트ID.firebaseapp.com',
  databaseURL: 'https://프로젝트ID-default-rtdb.firebaseio.com',
  projectId: '프로젝트ID',
  storageBucket: '프로젝트ID.appspot.com',
  messagingSenderId: '실제 senderId',
  appId: '실제 appId',
  path: 'ezcrm/v36'
};

window.EZCRM_SERVER_PUSH_CONFIG = {
  enabled: false,
  engine: 'rest',
  forceRest: false,
  endpoint: '',
  readEndpoint: '',
  method: 'POST',
  token: '',
  mode: 'cors',
  pollMs: 3000
};
```

## REST 자체 서버를 쓰는 경우

REST를 쓰려면 GitHub Pages가 아니라 별도의 Node.js/Express 서버가 필요합니다. 이때만 아래처럼 켭니다.

```js
window.EZCRM_SYNC_ENGINE = 'rest';
window.EZCRM_SERVER_PUSH_CONFIG = {
  enabled: true,
  engine: 'rest',
  forceRest: true,
  endpoint: 'https://실제서버도메인/api/ezcrm-sync',
  readEndpoint: 'https://실제서버도메인/api/ezcrm-sync',
  method: 'POST',
  token: '',
  mode: 'cors',
  pollMs: 3000
};
```
