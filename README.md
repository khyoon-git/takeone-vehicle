# 테이크원 차량 신청 (GitHub + Vercel + Neon Postgres)

학부모는 `/` 에서 신청하고, 원장님은 `/admin` 에서 전체 현황을 확인·삭제·엑셀 다운로드하는 웹앱입니다.
모든 신청은 **공용 데이터베이스(Neon Postgres)** 에 저장되므로, 누가 어느 기기에서 신청하든 관리자 페이지에 모두 모입니다.

## 폴더 구조

```
vehicle-app/
├── index.html          # 공개 신청 페이지 (/)
├── admin.html          # 관리자 페이지 (/admin)
├── api/
│   ├── _db.js          # 공통 헬퍼(DB 연결·인증)  ※ _ 로 시작하면 URL로 노출 안 됨
│   ├── records.js      # GET 목록(관리자) / POST 신청(공개)
│   ├── lookup.js       # POST 이름+PIN 조회(공개)
│   ├── edit.js         # POST 신청 수정(공개, 본인 PIN 확인)
│   ├── delete.js       # POST 개별/전체 삭제(관리자)
│   └── login.js        # POST 관리자 비밀번호 확인
├── schema.sql          # 데이터베이스 테이블 정의
├── vercel.json         # /admin 깔끔한 주소(cleanUrls) 설정
└── package.json        # 의존성(@neondatabase/serverless)
```

## 배포 절차 (처음 한 번만)

### 1. GitHub에 코드 올리기
- GitHub에서 새 저장소(repository)를 만듭니다. (예: `take1-vehicle`)
- 이 폴더의 파일 전체를 그 저장소에 올립니다.
  - 쉬운 방법: 저장소 페이지의 **Add file → Upload files** 로 폴더 내용을 드래그해 업로드.
  - 또는 터미널에서:
    ```bash
    git init
    git add .
    git commit -m "차량 신청 앱"
    git branch -M main
    git remote add origin https://github.com/<사용자명>/take1-vehicle.git
    git push -u origin main
    ```

### 2. Vercel에 배포
1. https://vercel.com 에 GitHub 계정으로 로그인 (무료 Hobby 플랜).
2. **Add New → Project** → 방금 만든 저장소를 **Import**.
3. Framework Preset은 **Other** 로 두고(빌드 설정 불필요) **Deploy**.
4. 몇 초 뒤 `https://<프로젝트>.vercel.app` 주소가 생깁니다. (아직 DB 연결 전이라 신청은 동작하지 않습니다.)

### 3. 데이터베이스(Neon) 연결
1. Vercel 프로젝트 → **Storage** 탭 → **Create Database**.
2. **Neon (Serverless Postgres)** 선택 → 생성.
   - 연결 후 `DATABASE_URL` 환경변수가 프로젝트에 **자동 주입**됩니다.
3. 테이블 만들기: Neon 콘솔(또는 Vercel Storage의 **Query** 탭)을 열고 `schema.sql` 내용을 붙여넣어 실행합니다.

### 4. 관리자 비밀번호 설정
1. Vercel 프로젝트 → **Settings → Environment Variables**.
2. 이름 `ADMIN_PASSWORD`, 값에는 **원하는 관리자 비밀번호**를 입력하고 저장합니다. (Production/Preview/Development 모두 체크)
3. **Deployments → 가장 최근 배포 → Redeploy** 로 환경변수를 반영합니다.

### 5. 완료
- 신청 페이지: `https://<프로젝트>.vercel.app`
- 관리자 페이지: `https://<프로젝트>.vercel.app/admin`  (설정한 `ADMIN_PASSWORD` 로 로그인)

## 이후 수정/업데이트
코드를 고쳐 GitHub에 **push** 하면 Vercel이 자동으로 다시 배포합니다. 별도 작업이 필요 없습니다.

## 보안 및 참고 사항
- **`/admin`은 주소를 숨긴 것일 뿐, 그 자체가 보안은 아닙니다.** 실제 보호는 `ADMIN_PASSWORD`가 담당하므로 추측하기 어려운 비밀번호를 쓰세요. 관리자용 API(목록 조회·삭제)는 서버에서 이 비밀번호를 검증하므로, 비밀번호 없이는 데이터를 볼 수 없습니다.
- 검색엔진 노출을 줄이기 위해 관리자 페이지에는 `noindex` 태그를 넣어 두었습니다.
- **관리자 비밀번호 변경**은 Vercel의 `ADMIN_PASSWORD` 환경변수를 바꾼 뒤 Redeploy 하면 됩니다.
- 무료 Neon 데이터베이스는 한동안 사용이 없으면 잠자기(scale-to-zero) 상태가 되어, 오랜만의 첫 요청이 1~2초 느릴 수 있습니다. 이후 요청은 정상 속도입니다.
- 같은 학생이 같은 요일로 다시 신청하면 기존 내용을 **새 내용으로 덮어씁니다**(요일당 1건 유지). 조회·수정 페이지에서 이름+PIN으로 언제든 수정할 수 있습니다.

## 로컬에서 미리 실행해 보기(선택)
```bash
npm i -g vercel
vercel link            # 프로젝트 연결
vercel env pull        # DATABASE_URL 등 내려받기
vercel dev             # http://localhost:3000
```
