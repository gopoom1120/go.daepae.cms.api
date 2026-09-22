#!/bin/bash
# Claude Code Notification 훅 - 권한 요청 및 사용자 입력 대기 알림
#
# 이 스크립트는 Claude Code가 Notification 이벤트를 발생시킬 때 실행됩니다.
# 주로 권한 요청이나 사용자 입력 대기 상황에서 Slack 알림을 보냅니다.

# .env.local 또는 .env 파일에서 Slack 웹훅 URL 로드 (.env.local 우선)
if [ -f "$CLAUDE_PROJECT_DIR/.env.local" ]; then
    source "$CLAUDE_PROJECT_DIR/.env.local"
elif [ -f "$CLAUDE_PROJECT_DIR/.env" ]; then
    source "$CLAUDE_PROJECT_DIR/.env"
else
    echo "오류: .env.local 또는 .env 파일을 찾을 수 없습니다: $CLAUDE_PROJECT_DIR" >&2
    exit 1
fi

# Slack 웹훅 URL 확인
if [ -z "$SLACK_WEBHOOK_URL" ]; then
    echo "오류: SLACK_WEBHOOK_URL이 설정되지 않았습니다." >&2
    exit 1
fi

# JSON 입력에서 메시지 추출 (있는 경우)
MESSAGE=$(jq -r '.message')

# 프로젝트명 추출
PROJECT_NAME=$(basename "$CLAUDE_PROJECT_DIR")

# 현재 시간
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# 디버깅을 위한 변수 출력 (HOOK_DEBUG=1일 때만, stderr로 출력)
if [ -n "$HOOK_DEBUG" ]; then
    echo "DEBUG: MESSAGE = '$MESSAGE'" >&2
    echo "DEBUG: PROJECT_NAME = '$PROJECT_NAME'" >&2
    echo "DEBUG: TIMESTAMP = '$TIMESTAMP'" >&2
fi

# 알림 본문 생성 (printf로 개행 처리, 특수문자는 이후 jq가 안전하게 이스케이프)
TEXT=$(printf '🔔 권한 요청 알림\n\n프로젝트: %s\n상태: %s\n시간: %s\n\nClaude Code에서 알림이 도착했습니다.' "$PROJECT_NAME" "$MESSAGE" "$TIMESTAMP")

# JSON payload 생성 (jq -n --arg로 JSON 인젝션 방지)
PAYLOAD=$(jq -n --arg text "$TEXT" \
  '{channel: "#claude-code", username: "Claude Code", text: $text, icon_emoji: ":bell:"}')

[ -n "$HOOK_DEBUG" ] && echo "DEBUG: PAYLOAD = '$PAYLOAD'" >&2

# Slack으로 알림 전송 (--fail로 HTTP 오류 감지, 타임아웃 설정)
if curl -sS --fail --max-time 5 --connect-timeout 3 -X POST \
  --data-urlencode "payload=$PAYLOAD" \
  "$SLACK_WEBHOOK_URL" > /dev/null 2>&1; then
    echo "Slack 알림이 성공적으로 전송되었습니다." >&2
else
    echo "Slack 알림 전송에 실패했습니다." >&2
    exit 1
fi