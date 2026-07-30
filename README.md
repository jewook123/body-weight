# body-weight

체중 기록 앱. 정적 프론트엔드(`index.html`, `app.js`, `style.css`)와 Vercel 서버리스 API(`api/`)로 구성되어 있습니다.

기본적으로는 브라우저 `localStorage`에 기록을 저장합니다. 아래 설정을 마치면 이메일 로그인 후 여러 기기에서 같은 기록을 동기화할 수 있습니다 (헤더의 `☁️ 동기화` 버튼).

## 클라우드 동기화 설정 (Supabase + Vercel)

### 1. Supabase 프로젝트 생성

1. https://supabase.com 에서 새 프로젝트 생성
2. 프로젝트의 **SQL Editor**에서 [`supabase/schema.sql`](./supabase/schema.sql) 내용을 실행해 `weight_records` 테이블과 RLS 정책 생성
3. **Authentication > Providers**에서 Email 로그인이 활성화되어 있는지 확인 (기본 활성화되어 있음, "Confirm email" / magic link 방식 사용)
4. **Authentication > URL Configuration**의 Redirect URLs에 배포될 Vercel 도메인(예: `https://your-app.vercel.app`)을 추가

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

앱 헤더의 `☁️ 동기화` 버튼을 눌러 이메일을 입력하면 로그인 링크가 전송됩니다. 로그인하면 이후 기록 추가/수정/삭제가 자동으로 서버와 동기화됩니다. 환경변수를 설정하지 않으면 이 기능은 조용히 비활성화되고, 앱은 기존처럼 `localStorage`만 사용합니다.
