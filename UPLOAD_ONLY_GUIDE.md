# EZCRM GitHub Pages 업로드용 최종본

이 압축파일은 GitHub Pages 정적 호스팅에 바로 올릴 수 있도록 루트 구조로 정리된 최종본입니다.

## 반영 완료

- REST 서버 `Failed to fetch` 오류 방지
- Firebase 우선 동기화 구조
- REST 서버 기본 비활성화
- `ezcrm.html` 접속 시 서버 DB 1회 조회 및 실시간 수신 구조
- `data/seed.json`에 업로드 DB 반영
- 새 브라우저 최초 접속 시 기본 DB 자동 반영
- 고객/A/S/설치/자재/엔지니어 데이터 구조 보정
- GitHub Pages용 `.nojekyll` 포함

## 그대로 업로드하는 방법

1. 이 ZIP을 압축 해제합니다.
2. 압축 해제된 파일과 폴더 전체를 GitHub 저장소 루트에 올립니다.
3. GitHub Pages를 켭니다.
4. `index.html` 또는 `ezcrm.html`을 엽니다.

## 온라인 실시간 동기화 필수 조건

GitHub Pages 자체는 서버 저장 기능이 없으므로, 여러 클라이언트가 같은 DB를 보려면 Firebase Realtime Database 설정값이 필요합니다.

`assets/js/firebase-config.js`의 Firebase 값을 실제 값으로 넣고 `enabled: true`로 바꾸면 실시간 동기화가 켜집니다.

REST 서버는 기본적으로 꺼져 있으므로 `/api/ezcrm-sync` 관련 `Failed to fetch` 오류가 뜨지 않습니다.
