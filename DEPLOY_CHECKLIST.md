# GitHub Pages 빠른 배포 체크리스트

- [ ] 저장소 생성
- [ ] 압축 해제 후 `index.html`, `ezcrm.html`, `assets/`를 저장소 루트에 업로드
- [ ] Settings → Pages → Deploy from a branch 설정
- [ ] Branch: `main`, Folder: `/root`
- [ ] 배포 후 `index.html` 접속 확인
- [ ] 포털의 본사/대리점/엔지니어 접속 버튼이 `ezcrm.html`로 이동하는지 확인
- [ ] CRM 화면에서 대시보드, 고객관리, A/S, 설치, 자재관리 탭 클릭 확인
- [ ] 테스트 데이터 저장 후 새로고침해 `localStorage` 유지 확인

## 클라이언트 자동 서버전송 확인

- [ ] `assets/js/firebase-config.js`에서 Firebase 또는 자체 서버 API 설정 완료
- [ ] Firebase 사용 시 `enabled: true` 적용
- [ ] 자체 서버 사용 시 `EZCRM_SERVER_PUSH_CONFIG.enabled: true` 및 CORS 허용
- [ ] GitHub Pages 접속 후 `데이터 백업/복원 > 클라이언트 입력값 자동전송` 상태 확인
- [ ] 고객사/AS/설치 폼에 값을 입력한 뒤 Firebase `_clientInputs` 또는 자체 서버 로그 확인
- [ ] 저장 버튼 클릭 후 `payload`, `meta`, `_changeLog` 반영 확인
