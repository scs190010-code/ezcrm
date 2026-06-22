# EZCRM GitHub Pages Static + Online JSON DB Edition

첨부된 `ezmain(1).html`, `ezcrm(1).html`을 GitHub Pages 정적 호스팅 구조로 분리하고, Firebase Realtime Database 기반 온라인 JSON DB 동기화 계층을 추가한 버전입니다.

## 구성

```text
ezcrm_github_static_online_jsondb/
├─ index.html              # GitHub Pages 기본 진입 페이지 / EZCRM 포털
├─ ezmain.html             # 기존 링크 호환용 포털 별칭
├─ ezcrm.html              # 실제 CRM 단일 페이지 앱
├─ .nojekyll               # GitHub Pages Jekyll 처리 비활성화
├─ README.md
├─ ONLINE_JSON_DB_README.md
├─ DEPLOY_CHECKLIST.md
├─ SOURCE_ANALYSIS.md
├─ PROJECT_ANALYSIS.json
├─ docs/
│  └─ FIREBASE_REALTIME_DB_SETUP.md
├─ data/
│  └─ seed.json
└─ assets/
   ├─ css/
   │  ├─ portal.css
   │  └─ ezcrm.css
   ├─ js/
   │  ├─ portal.js
   │  ├─ security.js
   │  ├─ firebase-config.js
   │  ├─ firebase-config.example.js
   │  ├─ remote-db.js
   │  └─ ezcrm-app.js
   └─ img/
```

## 핵심 변경

- 기존 로컬 저장 방식은 유지했습니다.
- `assets/js/firebase-config.js` 설정 전에는 기존처럼 브라우저 `localStorage`에 저장됩니다.
- Firebase 설정 후 `enabled: true`로 바꾸면 모든 접속자가 같은 온라인 JSON DB를 실시간 공유합니다.
- 우측 하단에 온라인/로컬 저장 상태 배지가 표시됩니다.
- `데이터 백업/복원` 메뉴에 온라인 JSON DB 상태, 현재 데이터 업로드, 온라인 DB 새로고침 버튼을 추가했습니다.

## GitHub Pages 배포 방법

1. 이 폴더의 전체 파일을 GitHub 저장소 루트에 업로드합니다.
2. GitHub 저장소에서 **Settings → Pages**로 이동합니다.
3. **Build and deployment → Source**를 `Deploy from a branch`로 선택합니다.
4. Branch를 `main`, Folder를 `/root`로 선택하고 저장합니다.
5. 배포 주소는 보통 `https://계정명.github.io/저장소명/` 형태입니다.

## 온라인 JSON DB 설정

자세한 설정은 `docs/FIREBASE_REALTIME_DB_SETUP.md`를 보세요.
핵심은 `assets/js/firebase-config.js`에서 Firebase Web App 값을 넣고 `enabled: true`로 바꾸는 것입니다.

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

## 주의사항

- GitHub Pages 자체는 정적 호스팅이므로 JSON 파일을 직접 수정 저장할 수 없습니다. 온라인 업데이트는 Firebase Realtime Database가 담당합니다.
- 공개 읽기/쓰기 규칙을 쓰면 접속자는 모두 데이터를 수정할 수 있습니다. 시연용에는 편하지만 실운영에는 인증/권한 규칙이 필요합니다.
- 사진과 서명은 base64 문자열로 JSON DB에 저장됩니다. 데이터가 커지면 이미지 저장소 분리가 필요합니다.
- 동시에 여러 명이 같은 데이터를 수정하면 마지막 저장값이 우선될 수 있습니다.
