# EZCRM_DB_2026-06-22.json 반영 내역

이 패키지는 업로드된 `EZCRM_DB_2026-06-22.json`을 GitHub Pages 정적 호스팅 버전에 반영한 버전입니다.

## 반영 위치

- `data/seed.json`: 앱이 처음 실행될 때 자동 반영하는 기본 DB
- `data/EZCRM_DB_2026-06-22.original.json`: 업로드 원본 보관본
- `data/firebase_import_payload.json`: Firebase Realtime Database 콘솔에서 직접 가져오기용 payload 구조
- `data/seed-meta.json`: 반영 메타정보와 해시

## 반영 데이터 수

```json
{
  "customers": 4,
  "consults": 1,
  "asReqs": 3,
  "installs": 4,
  "materials": 4,
  "engineers": 6,
  "users": 1
}
```

## 자동 반영 방식

1. 사용자가 새 브라우저에서 GitHub Pages 사이트에 접속합니다.
2. 브라우저의 기존 EZCRM 데이터가 비어 있으면 `data/seed.json`을 자동 로드합니다.
3. Firebase 설정이 켜져 있고 온라인 DB가 비어 있으면 이 seed 데이터가 온라인 DB에 최초 업로드됩니다.
4. 이후에는 누가 접속하든 같은 온라인 JSON DB 값을 실시간으로 받아옵니다.

## 수동 반영

CRM 화면의 `데이터 백업/복원` 메뉴에서 다음 버튼을 사용할 수 있습니다.

- `첨부 DB를 화면에 다시 반영`: 현재 브라우저 데이터에 반영
- `첨부 DB를 온라인 DB에 업로드`: Firebase 온라인 JSON DB에 반영


## Firebase 스크립트 로드 순서

`ezcrm.html` 하단에는 다음 순서로 스크립트가 로드됩니다.

1. Firebase App compat SDK
2. Firebase Realtime Database compat SDK
3. `assets/js/firebase-config.js`
4. `assets/js/remote-db.js`
5. `assets/js/ezcrm-app.js`

이 순서가 유지되어야 온라인 JSON DB 동기화가 정상 작동합니다.
