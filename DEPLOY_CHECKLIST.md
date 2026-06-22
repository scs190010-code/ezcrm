# EZCRM 배포 체크리스트

## GitHub Pages

- [ ] 저장소 루트에 `index.html`, `ezcrm.html`, `assets/`가 있는지 확인
- [ ] `.nojekyll` 파일 포함 확인
- [ ] GitHub Settings → Pages → Deploy from branch 설정
- [ ] 배포 URL에서 `index.html` 접속 확인
- [ ] 포털에서 `본사/대행점/엔지니어 접속` 클릭 시 `ezcrm.html` 이동 확인

## 온라인 JSON DB

- [ ] Firebase 프로젝트 생성
- [ ] Realtime Database 생성
- [ ] `assets/js/firebase-config.js` 값 교체
- [ ] `enabled: true`로 변경
- [ ] Realtime Database Rules 설정
- [ ] 브라우저 2개에서 고객 등록 후 실시간 반영 확인
- [ ] 우측 하단 배지가 `온라인 JSON DB 연결됨`으로 표시되는지 확인

## 운영 전 보강 권장

- [ ] 기본 관리자 비밀번호 변경
- [ ] Firebase Authentication 적용
- [ ] 사용자 권한별 쓰기 규칙 적용
- [ ] 사진/서명 Firebase Storage 분리 저장 검토
- [ ] 정기 JSON 백업 다운로드 테스트
