# EZCRM Online JSON DB Edition

## 핵심 변경

- 기존 브라우저 `localStorage` 단독 저장 구조를 유지하면서 Firebase Realtime Database 온라인 JSON DB 동기화 계층을 추가했습니다.
- `assets/js/firebase-config.js`에 Firebase 값을 넣고 `enabled: true`로 바꾸면 GitHub Pages 정적 호스팅 상태에서도 여러 접속자가 같은 데이터를 공유합니다.
- 설정 전에는 기존처럼 로컬 저장 모드로 안전하게 동작합니다.

## 추가/변경 파일

```text
assets/js/firebase-config.js          # 실제 Firebase 설정 파일
assets/js/firebase-config.example.js  # 설정 예시 백업
assets/js/remote-db.js                # Firebase Realtime Database 어댑터
data/seed.json                        # 초기 JSON DB 샘플
docs/FIREBASE_REALTIME_DB_SETUP.md    # 설정 가이드
ONLINE_JSON_DB_README.md              # 이번 버전 변경 요약
```

## 데이터 저장 경로

기본 경로는 Firebase Realtime Database의 `ezcrm/v36` 입니다.
저장 형태는 다음과 같습니다.

```json
{
  "payload": {
    "customers": [],
    "consults": [],
    "asReqs": [],
    "installs": [],
    "materials": [],
    "engineers": [],
    "users": []
  },
  "meta": {
    "app": "EZCRM Static GitHub Edition",
    "version": "v36-online-jsondb",
    "updatedAt": 1710000000000,
    "updatedAtLocal": "2026-06-22T00:00:00.000Z"
  }
}
```
