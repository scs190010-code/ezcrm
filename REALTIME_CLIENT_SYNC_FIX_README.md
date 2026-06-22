# EZCRM 클라이언트 실시간 DB 동기화 보강본

## 이번 수정의 목적

기존 자동전송 기능은 입력 초안/이벤트를 서버에 보내는 기능에 가까웠습니다. 이번 보강본은 `ezcrm.html`이 열리는 즉시 서버의 최신 JSON DB를 읽고, 이후 서버 DB 변경을 계속 체크하여 모든 클라이언트가 같은 화면과 같은 DB를 보도록 수정했습니다.

## 핵심 동작

### Firebase Realtime Database 사용 시

1. `ezcrm.html` 로드
2. Firebase `ezcrm/v36` 경로를 1회 강제 조회
3. 서버에 payload가 있으면 로컬 DB와 화면을 서버값으로 덮어쓰기
4. 서버가 비어 있으면 `data/seed.json` 또는 현재 로컬 DB를 최초 payload로 업로드
5. 이후 Firebase `value` 이벤트로 서버 변경을 실시간 수신
6. 다른 PC/모바일에서 저장하면 현재 접속 중인 모든 클라이언트 화면이 자동 갱신

### 자체 REST 서버 사용 시

1. `ezcrm.html` 로드
2. `GET /api/ezcrm-sync`로 최신 DB 조회
3. 서버값으로 화면 갱신
4. `pollMs` 간격으로 계속 서버 DB 체크
5. 현재 클라이언트에서 저장하면 `POST /api/ezcrm-sync`로 전체 DB 저장
6. 다른 클라이언트는 다음 폴링 때 같은 DB로 자동 갱신

## 수정/추가 파일

```text
assets/js/remote-db.js                    # 서버 실시간/폴링 동기화 핵심 로직 재작성
assets/js/firebase-config.js              # Firebase/REST 동기화 설정 옵션 보강
assets/js/firebase-config.example.js      # 설정 예시 동기화
ezcrm.html                                # 서버 DB 실시간 체크 카드 추가
server-example/server.js                  # GET/POST 모두 지원하는 자체 서버 예제
server-example/README.md                  # 자체 서버 실행 설명 보강
REALTIME_CLIENT_SYNC_FIX_README.md        # 본 설명서
```

## Firebase 설정 예시

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

## 자체 서버 설정 예시

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

## 화면에서 확인할 곳

`데이터 백업/복원` 메뉴에 다음 카드가 추가되었습니다.

```text
🛰️ 서버 DB 실시간 체크
- 서버 DB 즉시 불러오기
- 현재 화면 서버 저장
```

우측 하단 상태 배지에도 다음 상태가 표시됩니다.

```text
Firebase 서버 연결됨
서버 DB 수신·화면 동기화 완료
REST 서버 DB 확인 완료
서버 자동 저장 중
```

## 주의사항

- GitHub Pages만으로는 서버에 JSON을 쓸 수 없습니다. 반드시 Firebase Realtime Database 또는 자체 REST 서버가 필요합니다.
- `ClientAutoSync`는 입력 중인 초안/로그 전송용이고, 실제 동일 화면 동기화는 `payload` 전체 DB 수신/저장으로 처리됩니다.
- 동시에 두 클라이언트가 같은 자료를 수정하면 마지막 저장값이 서버 기준 DB가 됩니다.
- Firebase 보안 규칙을 공개 쓰기로 둘 경우 URL을 아는 사람이 데이터를 수정할 수 있으므로 운영 전에는 인증/권한 규칙을 붙여야 합니다.
