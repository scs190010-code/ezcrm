# EZCRM Firebase 자동 REST 동기화 설정

## 1. 이미 반영된 프로젝트 정보

```txt
projectId: eco-precept-499606-b4
projectNumber: 216968504440
```

`assets/js/firebase-config.js`에는 위 값이 이미 반영되어 있습니다.

## 2. 왜 Firebase가 필요한가?

GitHub Pages는 `index.html`, `ezcrm.html`, `assets/js/*.js` 같은 정적 파일을 보여주는 호스팅입니다.  
그러나 사용자가 입력한 고객, A/S, 설치, 자재 DB를 서버에 저장해서 여러 PC/모바일이 같이 보게 하는 기능은 없습니다.

그래서 온라인 JSON DB 역할을 Firebase Realtime Database가 담당합니다.

## 3. 이 버전의 특징

이 버전은 Firebase 웹앱 등록에서 나오는 `apiKey`, `appId`가 없어도 작동하도록 `firebase-rest-auto` 방식을 사용합니다.

```js
window.EZCRM_SYNC_ENGINE = 'firebase-rest-auto';
```

즉, 아래 두 가지 조건만 맞으면 됩니다.

1. Firebase Realtime Database가 생성되어 있을 것
2. Rules에서 `ezcrm/v36` 읽기/쓰기가 허용되어 있을 것

## 4. Firebase Rules 테스트 설정

Firebase Console > Realtime Database > Rules에 아래를 넣고 게시합니다.

```json
{
  "rules": {
    "ezcrm": {
      "v36": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

이 규칙은 테스트용입니다. 실운영에서는 로그인/권한 규칙을 붙여야 합니다.

## 5. 업로드 순서

1. ZIP 압축 풀기
2. 압축 푼 파일 전체를 GitHub 저장소 루트에 업로드
3. GitHub Pages가 켜져 있는지 확인
4. `ezcrm.html` 접속
5. PC 2대 또는 브라우저 2개로 동기화 테스트

## 6. DB URL이 다를 때

화면에 계속 `Firebase DB 읽기 실패`가 뜨면 Firebase의 실제 Realtime Database URL이 다른 것입니다.

Firebase Console > Realtime Database > 데이터 탭 상단의 URL을 복사해서 아래 파일에 넣습니다.

```txt
assets/js/firebase-config.js
```

수정 위치:

```js
databaseURL: "여기에 실제 Realtime Database URL 붙여넣기",
```

예:

```js
databaseURL: "https://eco-precept-499606-b4-default-rtdb.asia-southeast1.firebasedatabase.app",
```
