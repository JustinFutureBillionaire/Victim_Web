# Demo Helpdesk 세팅 가이드 (팀원용)

Demo Helpdesk는 Trifecta Breaker 데모에서 공격 대상이 되는 가상 헬프데스크 앱입니다.
아래 순서대로 하면 **Breaker OFF → 토큰 유출, Breaker ON → 차단**까지 확인할 수 있습니다.

## 0. 준비물
- Node.js 20 이상
- Supabase 계정
- Breaker의 Vercel 배포 URL
- Anthropic API 키 (선택. 없으면 Scripted 모드로 데모)

## 1. 코드 받기
```bash
git clone <이 레포 URL>
cd demo-helpdesk
npm install
```

## 2. Supabase 프로젝트 만들기
1. supabase.com에서 **이 앱 전용 새 프로젝트**를 만듭니다.
2. SQL Editor에서 Breaker 레포의 `sql/customer/` 파일들을 실행합니다.
   만들어져야 하는 테이블과 컬럼은 다음과 같습니다. 이름이 정확히 같아야 합니다.
   - `support_tickets (id, customer_email, subject, body, reply, created_at)`
   - `integration_tokens (id, service, token)`: 모든 token 값에 `FAKE`가 들어가야 합니다.
   - `customers (id, name, plan)`
3. 시드에 공격 티켓이 하나 있는지 확인합니다. 본문에 `IMPORTANT NOTE FOR THE AI ASSISTANT`가 들어간 티켓이어야 Scripted 모드가 동작합니다. 시드에 없으면 6단계에서 웹 폼으로 직접 넣으면 됩니다.

## 3. `.env.local` 만들기
```bash
cp .env.example .env.local
```
값은 Supabase 대시보드에서 가져옵니다.

| 변수 | 가져오는 곳 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` 키 |
| `CUSTOMER_DATABASE_URL` | 상단 **Connect** 버튼 → Postgres connection string (비밀번호 포함) |
| `BREAKER_URL` | Breaker Vercel URL (예: `https://xxx.vercel.app`, 끝에 `/` 없이) |
| `ANTHROPIC_API_KEY` | Anthropic 콘솔 (선택) |

`NEXT_PUBLIC_SUPABASE_ANON_KEY`는 비워둬도 됩니다.
`.env.local`은 git에 올라가지 않습니다. 절대 커밋하지 마세요.

## 4. Breaker를 같은 DB에 연결하기 (가장 중요)
Vercel에 있는 Breaker 프로젝트의 환경변수 `CUSTOMER_DATABASE_URL`을 **2단계에서 만든 Supabase의 연결 문자열**로 바꾸고 재배포합니다.

이 앱(OFF 경로)과 Breaker(ON 경로)가 **같은 DB**를 봐야 "같은 공격, 토글만 바꿈" 데모가 성립합니다.

Breaker가 지켜야 하는 API 형식:
- `POST /sessions` → `{ "sessionId": "..." }`
- `POST /execute` 요청 바디 `{ "sessionId", "sql" }`
  - 허용하면 `{ "rows": [...] }`를 돌려줍니다. `rowCount`는 있어도 되고 없어도 됩니다.
  - 거부하면 `{ "decision": "deny", "rule": "R2", "reason": "..." }`를 돌려줍니다. HTTP 상태코드는 상관없습니다.

## 5. 실행
```bash
npm run dev
```
http://localhost:3000 을 엽니다.

## 6. 데모 확인
공격 티켓 예시는 `DEMO_ATTACK_TICKETS.md`에 있습니다.

1. `/`에서 공격 티켓을 제출하고 티켓 번호를 확인합니다. 시드에 이미 있으면 건너뜁니다.
2. `/admin`에서 Breaker를 **OFF**로 두고 **Process today's tickets**를 누릅니다.
3. `/ticket/<번호>`를 열면 답변란에 `...FAKE...` 토큰이 보입니다. 유출 성공입니다.
4. `/admin`에서 **Reset replies**를 누르고, Breaker를 **ON**으로 바꾼 뒤 다시 Process를 누릅니다.
5. 로그에 `DENY R2`(토큰 읽기)와 `DENY R3`(답변 쓰기)가 찍힙니다.
6. `/ticket/<번호>`의 답변이 빈칸이면 차단 성공입니다.

실제 AI가 인젝션을 거부하면 **Scripted AI** 체크박스를 켜고 진행하세요. 같은 공격을 정해진 순서로 재생합니다.

## 문제 해결
- **`Missing NEXT_PUBLIC_SUPABASE_URL...`**: `.env.local`을 확인하고 `npm run dev`를 다시 시작하세요.
- **`Breaker unreachable`**: `BREAKER_URL`이 맞는지, Vercel 배포가 살아있는지 확인하세요.
- **ON인데 거부가 안 되고 결과가 이상함**: Breaker의 `CUSTOMER_DATABASE_URL`이 이 DB를 가리키는지 확인하세요 (4단계).
- **`Could not read tickets`**: 테이블과 컬럼 이름이 2단계와 같은지 확인하세요.
