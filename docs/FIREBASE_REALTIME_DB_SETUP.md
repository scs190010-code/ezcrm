# EZCRM 온라인 JSON DB 설정 가이드

이 버전은 GitHub Pages 같은 정적 호스팅에서도 여러 접속자가 같은 데이터를 공유하도록 Firebase Realtime Database를 붙인 구조입니다.
Firebase Realtime Database는 JSON 트리 구조라서 `ezcrm/v36` 경로에 CRM 전체 데이터가 저장됩니다.

## 1. Firebase 프로젝트 생성

1. Firebase Console에서 새 프로젝트를 만듭니다.
2. Web App을 추가합니다.
3. 앱 설정의 `firebaseConfig` 값을 복사합니다.
4. Realtime Database를 생성합니다.

## 2. `assets/js/firebase-config.js` 수정

아래 항목을 본인 프로젝트 값으로 교체하고 `enabled`를 `true`로 바꿉니다.

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

## 3. 개발/시연용 공개 읽기·쓰기 규칙

누가 접속하든 업데이트되게 하려면 아래처럼 공개 읽기/쓰기를 허용할 수 있습니다.
단, 이 규칙은 URL을 아는 사람이 데이터를 읽고 쓸 수 있으므로 내부 시연용으로만 권장합니다.

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

## 4. 배포 순서

1. 이 폴더 전체를 GitHub 저장소에 업로드합니다.
2. Settings → Pages에서 Branch를 `main`, Folder를 `/root`로 설정합니다.
3. 배포 URL에서 `index.html` 또는 `ezcrm.html`을 엽니다.
4. 우측 하단 배지에 `온라인 JSON DB 연결됨`이 표시되는지 확인합니다.
5. PC 2대 또는 브라우저 2개에서 고객 정보를 등록해 실시간 반영 여부를 확인합니다.

## 5. 운영상 주의

- 현재 방식은 전체 JSON을 통째로 저장하는 구조입니다. 동시에 여러 명이 같은 순간 저장하면 마지막 저장 데이터가 우선될 수 있습니다.
- 사진/서명은 base64 문자열로 JSON DB에 들어갑니다. 사진을 많이 첨부하면 DB 용량이 커질 수 있습니다.
- 실운영 보안을 강화하려면 Firebase Authentication, 사용자별 권한, Storage 이미지 분리 저장, 데이터별 쓰기 규칙을 추가해야 합니다.
