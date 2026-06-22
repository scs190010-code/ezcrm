# EZCRM 자체 서버 실시간 동기화 예제

GitHub Pages는 정적 호스팅이라 서버에 JSON 파일을 직접 쓸 수 없습니다. 이 폴더는 별도 VPS/클라우드/사내 PC 서버에서 실행할 수 있는 REST JSON DB 서버 예제입니다.

## 기능

```text
GET  /api/ezcrm-sync  → 최신 전체 JSON DB 읽기
POST /api/ezcrm-sync  → 최신 전체 JSON DB 저장 + 이벤트 로그 기록
```

각 클라이언트의 `ezcrm.html`은 서버를 주기적으로 체크하고, 서버 DB가 바뀌면 화면과 로컬 DB를 자동 갱신합니다.

## 실행

```bash
cd server-example
npm install
EZCRM_ALLOWED_ORIGIN=https://YOUR_GITHUB_ID.github.io EZCRM_TOKEN=optional-token npm start
```

로컬 테스트는 다음처럼 할 수 있습니다.

```bash
EZCRM_ALLOWED_ORIGIN=* npm start
```

## EZCRM 설정

`assets/js/firebase-config.js`에서 다음처럼 설정합니다.

```js
window.EZCRM_SERVER_PUSH_CONFIG = {
  enabled: true,
  endpoint: "https://YOUR_SERVER_DOMAIN/api/ezcrm-sync",
  readEndpoint: "https://YOUR_SERVER_DOMAIN/api/ezcrm-sync",
  method: "POST",
  token: "optional-token",
  mode: "cors",
  pollMs: 3000
};
```

## 저장 파일

```text
server-example/data/ezcrm-server-events.ndjson  # 모든 입력/저장 이벤트 로그
server-example/data/ezcrm-server-latest.json    # 마지막 전체 DB 저장본 payload/meta
```
