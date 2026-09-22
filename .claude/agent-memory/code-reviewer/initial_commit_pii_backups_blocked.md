---
name: 초기 스캐폴드 커밋 PII 백업 파일 BLOCKED 이력
description: 2026-09-22 전체 스캐폴드 초기 커밋 리뷰에서 supabase/backups/*.sql 실제 PII·결제 데이터 및 content_api_configs SELECT * 위험으로 BLOCKED
type: project
---

2026-09-22, 이 저장소(go.daepae.cms.api / statkit.cms.api)의 최초 전체 스캐폴딩 커밋(직전 커밋은 "Initial commit" 단 하나, 이후 src/·supabase/·.claude/ 등 전부 untracked) 리뷰에서 BLOCKED 판정.

## 핵심 발견

1. **`supabase/backups/260720/profiles_rows.sql`, `orders_rows.sql`에 실제 프로덕션 PII·결제 데이터 포함** — 실제 이메일 3건(`thdbsgh3443@naver.com`, `tintsanta@naver.com`, `thdbsgh3443@kakao.com`), 실제 role(`admin`), 실제 주문 금액(29000원)·상태(`paid`/`cancelled`)가 평문 INSERT문으로 저장돼 있음. `.gitignore`에 `supabase/backups/`나 `*.sql`을 제외하는 규칙이 전혀 없어(반면 `.vscode/sftp.json`의 FTP ignore 목록에는 `**/*.sql`, `**/backup*/**`이 이미 있음 — SFTP 배포에서는 막아놓고 git에는 안 막아놓은 비대칭) 이번 커밋에 그대로 포함됨. (`supabase/.temp/*`는 `.gitignore`의 bare `.temp` 패턴에 걸려 실제로는 안전 — 착각하지 말 것.)
2. **`statkit_content_api_configs` 시드의 `select_columns=null` 리스크** — 자세한 내용은 [[content_api_configs_admin_client_architecture]] 참고. `users`/`orders`/`quotes` 리소스가 `is_enabled=false`지만 select_columns 화이트리스트가 없어 토글 한 번으로 전체 컬럼(이메일·결제정보 포함)이 공개 API에 노출될 수 있는 구조가 최초 커밋 시점부터 내장됨.
3. `.env.example`은 프로젝트 자체 훅(`pre-tool-use.sh`)이 `.env*` 경로에 대한 모든 도구 접근(Read/Grep 포함)을 차단해 내용 검증 불가 — `.gitignore`에 `!.env.example`로 강제 포함되어 있는 건 확인했으나 실값 포함 여부는 사용자가 직접 확인해야 함.

**Why:** 이번 커밋이 "초기 스캐폴드"가 아니라 실제 결제(`orders`)·실제 사용자(`profiles`)가 이미 존재하는 상태의 최초 git 커밋이라는 점이 중요 — git history는 이후 삭제해도 완전히 지우기 어려우므로, 이 시점에 걸러내지 못하면 영구적으로 PII가 레포 히스토리에 남는다.

**How to apply:** 이 저장소에서 "초기 커밋"/"전체 스캐폴드 커밋" 리뷰 요청을 받으면 반드시 `supabase/backups/`, `supabase/.temp/`(단 `.temp`는 gitignore로 이미 안전), 기타 DB 덤프성 파일이 diff/untracked 목록에 있는지 확인하고 실제 데이터 값(이메일, 결제 정보 등)을 열어서 PII 여부를 직접 확인할 것 — 파일명이나 확장자만으로 판단하지 말 것. `supabase/backups/`는 `.gitignore`에 추가하고 `git rm --cached`(이미 커밋된 적 있다면 히스토리 정리까지) 권고.
