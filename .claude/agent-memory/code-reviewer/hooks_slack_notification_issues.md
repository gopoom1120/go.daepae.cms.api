---
name: hooks_slack_notification_issues
description: notification-hook.sh / stop-hook.sh (Slack 웹훅 알림 훅) 신뢰성 이슈 — 2026-07-25 1차 리뷰에서 발견, 같은 날 2차 리뷰에서 Major 3건 해소 확인(APPROVED)
type: project
---

## 상태 업데이트 (2026-07-25, 2차 리뷰)

1~3번(Major) 모두 해소 확인, APPROVED로 판정 변경됨.

- `--fail --max-time 5 --connect-timeout 3` curl 옵션 추가 확인 (두 파일 동일).
- JSON 조립을 `printf`(TEXT 생성, 개행 포함) → `jq -n --arg text "$TEXT" '{...}'`로 변경. `--arg`가 셸 인자 확장 이후의 완성된 문자열을 바인딩하므로 따옴표/백슬래시/개행 모두 안전하게 이스케이프됨. jq 프로그램 문자열에 값을 직접 concat하지 않아 jq 인젝션도 없음.
- Minor 5번(DEBUG 로그 게이팅)도 `if [ -n "$HOOK_DEBUG" ]; then ... fi`로 반영됨.
- Minor 4번(두 스크립트 90%+ 중복, 공통 lib 미추출)은 그대로 남아있음 — 여전히 선택적 개선 사항.
- 새로 발견된 사소한 관찰: curl 호출부의 `> /dev/null 2>&1`이 `-sS`로 노출하려던 curl 에러 메시지까지 함께 삼켜, 실패 시 스크립트가 원인 불명의 "전송 실패" 메시지만 남김 (진단성 저하, blocking 아님). `--data-urlencode "payload=$PAYLOAD"` 방식은 Slack Incoming Webhook의 구식이지만 유효한 방식이라 문제 없음.

## 원본 이슈 (1차 리뷰)

2026-07-25 리뷰에서 `.claude/hooks/notification-hook.sh`(신규)와 `.claude/hooks/stop-hook.sh`(신규)에 다음 Major 이슈를 발견함(당시 BLOCKED 판정 근거). 두 스크립트는 osascript 기반 구식 `notify.sh`를 대체해 Slack 웹훅으로 알림을 보내는 용도이며 로직이 거의 동일(90%+ 중복).

1. **curl 실패를 감지하지 못함**: `curl -X POST ... "$SLACK_WEBHOOK_URL"` 뒤 `$?`만 체크하는데, curl은 네트워크 레벨 오류에서만 0이 아닌 값을 반환하고 Slack이 4xx/5xx를 응답해도 exit code는 0이다. `--fail`(-f) 플래그가 없어 웹훅이 거부되어도 "성공적으로 전송되었습니다"가 출력됨.
2. **타임아웃 없음**: `--max-time`/`--connect-timeout` 미설정. Claude Code 훅은 동기 실행되므로 네트워크가 응답하지 않으면 Notification/Stop 이벤트마다 세션이 무한 대기할 위험이 있음.
3. **JSON 인젝션 가능성**: `$MESSAGE`(notification-hook.sh) / `$REASON`(stop-hook.sh) 값을 `printf`로 JSON 문자열에 그대로 삽입. 값에 따옴표·백슬래시·개행이 포함되면(예: 권한 요청 메시지에 포함된 파일 경로나 커맨드) JSON이 깨져 Slack이 400을 반환하거나 메시지가 손상됨. `jq -n --arg`로 payload를 생성하는 방식으로 교체 필요.
4. (Minor) 두 스크립트가 env 로드·webhook 체크·payload 생성·curl 전송 로직을 거의 그대로 복제 — 공통 함수로 추출(`.claude/hooks/lib/slack-notify.sh` 등) 권장.
5. (Minor) `echo "DEBUG: ..." >&2` 가 항상 활성화되어 있어 매 이벤트마다 stderr에 디버그 로그가 남음 — 디버그 플래그로 게이팅 권장.

**Why:** 알림 기능 자체의 신뢰성 문제로, 조용히 실패하면 사용자가 알림 미수신 사실을 인지하기 어려움. 웹훅 URL은 `.env.local`/`.env`에서만 로드하고 `settings.json`의 `permissions.deny`에 `.env*` Read/Write가 이미 막혀있어 URL 노출 자체는 안전함(이 부분은 잘 처리됨).

**How to apply:** 이 두 파일이 다시 diff에 포함되면 위 5가지 항목이 수정됐는지 확인. 1~3번이 해결되지 않았다면 여전히 Major로 취급해 BLOCKED 근거로 삼을 것. notify.sh 자체는 이 커밋에서 완전히 삭제되고 모든 참조가 제거되어 dangling reference 문제는 해소됨(재확인 완료).
