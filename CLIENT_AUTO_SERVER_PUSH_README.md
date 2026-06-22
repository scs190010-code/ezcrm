# EZCRM 클라이언트 입력값 자동 서버전송 기능

## 목적

각 PC/모바일 클라이언트가 EZCRM 화면에서 입력하는 값을 저장 버튼 전에도 서버 쪽으로 자동 전송하도록 보강했습니다.

기존 기능은 저장 시 전체 JSON DB를 온라인 DB에 반영하는 방식이었고, 이번 버전은 다음을 추가합니다.

- 입력/수정 중인 폼 값 자동 전송
- 저장/삭제/상태변경 시 전체 DB 자동 업로드
- 클라이언트별 입력 초안 서버 보관
- 서버 변경 로그 `_changeLog` 기록
- 접속 클라이언트 상태 `_presence` 기록
- 오프라인/연결대기 시 로컬 전송 대기열 저장 후 재연결 시 재전송
- Firebase뿐 아니라 자체 REST API 서버로도 POST 가능

## 추가 파일

```text
assets/js/client-autosync.js
CLIENT_AUTO_SERVER_PUSH_README.md
```

## Firebase Realtime Database 저장 구조

Firebase 설정 후 `path: "ezcrm/v36"`를 쓰면 다음 구조로 저장됩니다.

```text
ezcrm/v36/
├─ payload              # 실제 CRM 전체 JSON DB
├─ meta                 # 마지막 저장자/시간/건수
├─ _clientInputs/       # 클라이언트별 입력 중인 초안/제출 이벤트
│  └─ client_xxx/
│     ├─ drafts/
│     └─ events/
├─ _changeLog/          # 저장/상태변경/자동전송 로그
└─ _presence/           # 현재 접속 클라이언트 상태
```

## 자동전송 대상

`form` 안의 `input`, `textarea`, `select` 값이 자동 전송됩니다.

보안상 아래 값은 초안 자동전송에서 제외 또는 축약됩니다.

- 비밀번호 필드
- 버튼/submit/reset
- 일반 hidden 필드
- 서명 데이터는 본문 원본 대신 `[signature data present]` 형태로 축약
- 파일 첨부는 원본 파일 내용이 아니라 파일명/용량/타입 등 메타데이터만 자동전송

실제 사진/서명 데이터는 기존처럼 저장 버튼을 눌러 CRM 데이터로 저장될 때 전체 DB에 포함됩니다.

## Firebase 설정

`assets/js/firebase-config.js`에서 아래 값을 설정합니다.

```js
window.EZCRM_FIREBASE_CONFIG = {
  enabled: true,
  apiKey: "Firebase API Key",
  authDomain: "프로젝트ID.firebaseapp.com",
  databaseURL: "https://프로젝트ID-default-rtdb.firebaseio.com",
  projectId: "프로젝트ID",
  storageBucket: "프로젝트ID.appspot.com",
  messagingSenderId: "Sender ID",
  appId: "App ID",
  path: "ezcrm/v36"
};
```

시연용 규칙은 다음과 같습니다.

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

실운영에서는 로그인/권한 기반 규칙으로 바꾸는 것이 안전합니다.

## 자체 서버 API로 받기

Firebase 외에 직접 만든 서버로도 전송할 수 있습니다.

```js
window.EZCRM_SERVER_PUSH_CONFIG = {
  enabled: true,
  endpoint: "https://your-domain.com/api/ezcrm-sync",
  method: "POST",
  token: "",
  mode: "cors"
};
```

서버는 JSON POST를 받으면 됩니다.

예시 요청 바디:

```json
{
  "app": "EZCRM",
  "version": "v36-online-jsondb-auto-server-push",
  "kind": "client-draft",
  "clientId": "client_...",
  "clientLabel": "Win32 · Mozilla/5.0 ...",
  "page": "https://.../ezcrm.html",
  "sentAtLocal": "2026-06-22T...",
  "data": {
    "formId": "form-customer",
    "formTitle": "고객사 정보 관리",
    "fields": {
      "c-name": "탐투스",
      "c-tel": "00000000000"
    }
  }
}
```

자체 서버를 쓸 경우 서버 응답에는 반드시 CORS 헤더가 필요합니다.

```http
Access-Control-Allow-Origin: https://사용자명.github.io
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## 화면 확인

`데이터 백업/복원` 메뉴에 다음 카드가 추가되었습니다.

- `클라이언트 입력값 자동전송`
- 현재 자동전송 상태 표시
- `현재 입력값 즉시 서버전송` 버튼

## 주의사항

정적 호스팅인 GitHub Pages는 서버 저장 기능이 없습니다. 따라서 자동 서버전송은 Firebase Realtime Database 또는 별도 REST API 서버를 통해 처리됩니다.

## 포함된 자체 서버 예제

`server-example/` 폴더에는 Node.js Express 기반의 간단한 수신 서버 예제가 포함되어 있습니다. 이 서버는 GitHub Pages가 아니라 별도 VPS/클라우드/사내 PC 서버에서 실행해야 합니다.

```bash
cd server-example
npm install
EZCRM_ALLOWED_ORIGIN=https://YOUR_GITHUB_ID.github.io EZCRM_TOKEN=optional-token npm start
```

수신된 이벤트는 `server-example/data/ezcrm-server-events.ndjson`에 누적되고, 전체 DB 저장 이벤트는 `server-example/data/ezcrm-server-latest.json`으로도 저장됩니다.
