# SDA 자료 만들기

서울도슨트협회 소식지와 행사 사진 콜라주를 만드는 웹사이트입니다.
서버가 하는 일이 없습니다. 사진과 글은 모두 브라우저 안에서만 처리되고 어디에도 올라가지 않습니다.

- `/` 첫 화면
- `/newsletter` 소식지 만들기 — 3종 포맷, 미리보기, PNG · PPTX 저장
- `/collage` 사진 콜라주 — 사진을 고르면 4장씩 묶어 콜라주 생성

## 내 컴퓨터에서 확인하기

```bash
npm install
npm run dev      # http://localhost:3000
```

## Vercel에 올리기 (무료, 월 0원)

1. **GitHub 저장소 만들기**
   - github.com 에서 새 저장소 생성 (예: `sda-tools`, Private 가능)
   - 이 폴더에서:
     ```bash
     git init
     git add .
     git commit -m "SDA 자료 만들기"
     git branch -M main
     git remote add origin https://github.com/<아이디>/sda-tools.git
     git push -u origin main
     ```
2. **Vercel 연결**
   - vercel.com 에 GitHub 계정으로 가입 → Add New → Project
   - 방금 만든 저장소를 고르고 Deploy (설정은 기본값 그대로, Next.js가 자동 인식됨)
   - 2~3분 뒤 `프로젝트이름.vercel.app` 주소가 나옵니다
3. **이후 수정**
   - 코드를 고쳐 `git push` 하면 Vercel이 알아서 다시 배포합니다

환경변수나 API 키는 쓰지 않습니다. 서버 함수도 없어서 무료 플랜(Hobby) 한도에 걸릴 일이 거의 없습니다.
협회 활동은 비영리이므로 무료 플랜 조건에 맞습니다. 광고나 유료 서비스로 쓰려면 Pro 플랜이 필요합니다.

## 바꾸고 싶을 때

- 포맷 색과 이름: `lib/formats.js`
- 소식지 조판(글자 크기, 여백, 사진 배치): `lib/draw.js`
- PPTX 내보내기: `lib/pptx.js`
- 콜라주 배치: `lib/collage.js`
- 로고 파일: `public/sda-logo.png` (가로형), `public/sda-wordmark.png` (헤더용)

## 알아둘 점

- 글꼴은 Google Fonts의 Noto Sans KR을 불러옵니다.
- PPTX는 브라우저에서 pptxgenjs로 만듭니다. 파워포인트·구글 슬라이드에서 열립니다.
- 소식지 사진은 최대 5장까지 들어갑니다. 더 많은 사진은 콜라주 쪽을 쓰세요.
