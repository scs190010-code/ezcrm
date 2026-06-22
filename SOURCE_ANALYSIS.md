# 원본 소스 분석 요약

## 1. 원본 파일 역할

- `ezmain(1).html`: EZCRM 접속 포털/랜딩 페이지입니다. 본사, 대리점, 엔지니어 접속 카드가 있으며 모두 CRM 본 화면으로 이동합니다.
- `ezcrm(1).html`: 실제 CRM 단일 페이지 앱입니다. 대시보드, 월간 스케줄러, 고객관리, 상담이력, A/S, 납품·설치, 정산, 자재관리, 엔지니어 기초정보, 관리자, 백업/복원 기능을 포함합니다.

## 2. 정적 호스팅 적합성

- 서버 코드가 없고 HTML/CSS/JavaScript만으로 구성되어 GitHub Pages 정적 호스팅이 가능합니다.
- 데이터는 서버 DB가 아닌 브라우저 `localStorage`에 저장됩니다.
- 외부 CDN을 사용합니다: Tailwind CDN, Daum 우편번호 API, Chart.js, Pretendard 웹폰트.

## 3. 분리 작업 내용

- 포털 CSS → `assets/css/portal.css`
- 포털 JS → `assets/js/portal.js`
- CRM CSS → `assets/css/ezcrm.css`
- CRM 보안/선택방지 JS → `assets/js/security.js`
- CRM 업무 로직 JS → `assets/js/ezcrm-app.js`
- GitHub Pages 기본 진입점 → `index.html`
- 기존 링크 호환용 → `ezmain.html`
- CRM 앱 화면 → `ezcrm.html`

## 4. 운영 전 주의점

- 현재 구조는 개인/소규모 데모 또는 내부 테스트용 정적 앱에 적합합니다.
- 여러 직원이 동시에 쓰는 운영형 CRM으로 쓰려면 DB, 로그인, 권한, 파일 저장소, 백업 정책이 필요합니다.
- 우클릭/개발자도구 차단 스크립트는 사용 편의 제한 기능일 뿐 실제 보안 수단은 아닙니다.
- 개인정보와 고객정보를 실제 운영 데이터로 저장하려면 보안·백업·접근권한 설계가 필요합니다.
