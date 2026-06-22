# EZCRM 자체 서버 수신 예제

GitHub Pages는 정적 호스팅이므로 서버 저장 기능이 없습니다. 이 폴더는 별도 VPS/클라우드/사내 서버에서 실행할 수 있는 선택형 REST 수신 예제입니다.

## 실행

```bash
cd server-example
npm install
EZCRM_ALLOWED_ORIGIN=https://YOUR_GITHUB_ID.github.io EZCRM_TOKEN=optional-token npm start
```

## EZCRM 설정

`assets/js/firebase-config.js`에서 다음처럼 설정합니다.

```js
window.EZCRM_SERVER_PUSH_CONFIG = {
  enabled: true,
  endpoint: "https://YOUR_SERVER_DOMAIN/api/ezcrm-sync",
  method: "POST",
  token: "optional-token",
  mode: "cors"
};
```

## 저장 파일

```text
server-example/data/ezcrm-server-events.ndjson  # 모든 입력/저장 이벤트 로그
server-example/data/ezcrm-server-latest.json    # 마지막 전체 DB 저장본
```
