# body-weight

체중 기록 앱. 정적 프론트엔드(`index.html`, `app.js`, `style.css`)와 Vercel 서버리스 API(`api/`)로 구성되어 있습니다.

아래 클라우드 동기화 설정을 마치면 앱 진입 시 이메일 로그인 화면이 먼저 뜨고, 로그인 후에는 기록이 서버에 저장되어 여러 기기에서 동기화됩니다. 환경변수를 설정하지 않으면 로그인 화면 없이 기존처럼 브라우저 `localStorage`만 사용하는 게스트 모드로 동작합니다.

## 클라우드 동기화 설정 (Supabase + Vercel)

### 1. Supabase 프로젝트 생성

1. https://supabase.com 에서 새 프로젝트 생성
2. 프로젝트의 **SQL Editor**에서 [`supabase/schema.sql`](./supabase/schema.sql) 내용을 실행해 `weight_records` 테이블과 RLS 정책 생성
3. **Authentication > Providers**에서 Email 로그인이 활성화되어 있는지 확인 (기본 활성화되어 있음, "Confirm email" / magic link 방식 사용)
4. **Authentication > URL Configuration**에서:
   - **Site URL**을 배포될 Vercel 도메인(예: `https://your-app.vercel.app`)으로 변경 (기본값 `http://localhost:3000`으로 두면 로그인 링크가 localhost로 이동해버립니다)
   - **Redirect URLs**에도 같은 도메인을 추가

### 2. API 키 확인

Supabase 프로젝트의 **Project Settings > API**에서 다음 값을 확인합니다.

- `Project URL` → `SUPABASE_URL`
- `anon public` key → `SUPABASE_ANON_KEY`

(anon key는 공개되어도 안전한 키입니다. 접근 제어는 Postgres Row Level Security로 처리됩니다.)

### 3. Vercel 환경변수 설정

Vercel 프로젝트 **Settings > Environment Variables**에 아래 두 값을 추가하고 재배포합니다.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### 4. 배포

이 저장소를 Vercel에 연결하면 `index.html` 등 정적 파일과 `api/` 폴더의 서버리스 함수가 함께 배포됩니다. 별도 빌드 설정은 필요 없습니다.

### 완료 후

환경변수가 설정된 상태로 배포하면 앱 진입 시 로그인 화면이 먼저 뜹니다. 이메일을 입력하면 로그인 링크가 전송되고, 로그인하면 앱으로 진입하면서 이후 기록 추가/수정/삭제가 자동으로 서버와 동기화됩니다. 헤더의 `👤 계정` 버튼으로 로그인된 이메일 확인 및 로그아웃이 가능합니다. 환경변수를 설정하지 않으면 로그인 화면 없이 앱은 기존처럼 `localStorage`만 사용합니다.

