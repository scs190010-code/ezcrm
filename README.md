# EZCRM GitHub Pages Static Edition

첨부된 `ezmain(1).html`, `ezcrm(1).html`을 GitHub Pages 정적 호스팅에 맞게 분리한 버전입니다.

## 구성

```text
ezcrm_github_static/
├─ index.html              # GitHub Pages 기본 진입 페이지 / EZCRM 포털
├─ ezmain.html             # 기존 링크 호환용 포털 별칭
├─ ezcrm.html              # 실제 CRM 단일 페이지 앱
├─ .nojekyll               # GitHub Pages Jekyll 처리 비활성화
└─ assets/
   ├─ css/
   │  ├─ portal.css        # 포털 CSS
   │  └─ ezcrm.css         # CRM 앱 CSS
   ├─ js/
   │  ├─ portal.js         # 포털 보호/상호작용 스크립트
   │  ├─ security.js       # CRM 보호/상호작용 스크립트
   │  └─ ezcrm-app.js      # CRM 업무 로직
   └─ img/                 # 향후 이미지 자산 위치
```

## 배포 방법

1. 이 폴더의 전체 파일을 GitHub 저장소 루트에 업로드합니다.
2. GitHub 저장소에서 **Settings → Pages**로 이동합니다.
3. **Build and deployment → Source**를 `Deploy from a branch`로 선택합니다.
4. Branch를 `main`, Folder를 `/root`로 선택하고 저장합니다.
5. 배포 주소는 보통 `https://계정명.github.io/저장소명/` 형태입니다.

## 주의사항

- 현재 버전은 서버 없이 동작하는 정적 웹앱입니다.
- 고객/A/S/설치/자재 데이터는 브라우저 `localStorage`에 저장됩니다.
- 다른 PC나 다른 브라우저와 자동 동기화되지는 않습니다.
- 첨부 사진과 서명은 Base64 형태로 브라우저 저장소에 들어가므로, 너무 많은 이미지를 저장하면 용량 제한이 발생할 수 있습니다.
- 외부 CDN 의존성: Tailwind CDN, Daum 우편번호 API, Chart.js, Pretendard 웹폰트.
- GitHub Pages에서 Daum 우편번호 API와 Chart.js는 인터넷 연결이 가능한 상태에서 작동합니다.

## 운영형 확장 권장

정적 호스팅 후 실제 운영형으로 확장하려면 다음을 추가하는 것이 좋습니다.

- Firebase/Supabase 같은 서버리스 DB 연동
- 로그인/권한 분리: 본사, 대리점, 엔지니어
- 이미지 파일 저장소: Firebase Storage, Supabase Storage, S3 등
- 데이터 백업 자동화
- 민감정보 접근 제어 및 개인정보 처리방침
```


## 2026-06-22 첨부 DB 반영

`data/seed.json`에는 사용자가 업로드한 `EZCRM_DB_2026-06-22.json` 데이터가 현재 EZCRM 화면 구조에 맞게 반영되어 있습니다.

- 고객: 4건
- 상담: 1건
- A/S: 3건
- 설치: 4건
- 자재: 4건
- 엔지니어: 6건
- 사용자: 1건

처음 접속한 브라우저는 `localStorage`가 비어 있을 경우 이 데이터를 자동으로 불러옵니다. Firebase Realtime Database가 설정되어 있고 온라인 DB가 비어 있으면 이 데이터가 최초 온라인 JSON DB로 자동 업로드됩니다.

기존 온라인 DB를 강제로 이 데이터로 교체하려면 CRM의 `데이터 백업/복원` 메뉴에서 `첨부 DB를 온라인 DB에 업로드` 버튼을 사용하세요.
