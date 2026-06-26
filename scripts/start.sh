#!/bin/bash
# TIC Analysis - start backend + frontend as background daemons.
# Usage: ./scripts/start.sh [start|stop|restart|status]

set -e
ROOT="/root/.openclaw/workspace/tic-analysis"
BACKEND_LOG="/tmp/tic-backend.log"
FRONTEND_LOG="/tmp/tic-frontend.log"
BACKEND_PID_FILE="/tmp/tic-backend.pid"
FRONTEND_PID_FILE="/tmp/tic-frontend.pid"
BACKEND_PORT=3001
FRONTEND_PORT=5174

start_backend() {
  if [ -f "$BACKEND_PID_FILE" ] && kill -0 "$(cat "$BACKEND_PID_FILE")" 2>/dev/null; then
    echo "[backend] already running, pid=$(cat "$BACKEND_PID_FILE")"
    return
  fi
  echo "[backend] starting..."
  cd "$ROOT/backend"
  if [ ! -d node_modules ]; then
    echo "[backend] installing deps..."
    npm install --no-audit --no-fund
  fi
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "[backend] .env created from .env.example"
  fi
  # ensure dist exists (nest puts main.js at dist/src/main.js with sourceRoot=src)
  if [ ! -f dist/src/main.js ]; then
    echo "[backend] building..."
    npm run build
  fi
  nohup node dist/src/main.js >>"$BACKEND_LOG" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
  sleep 3
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:$BACKEND_PORT/api/health" || echo "000")
  if [ "$code" = "200" ]; then
    echo "[backend] OK pid=$(cat "$BACKEND_PID_FILE") port=$BACKEND_PORT"
  else
    echo "[backend] FAILED (http=$code), check $BACKEND_LOG"
    return 1
  fi
}

start_frontend() {
  if [ -f "$FRONTEND_PID_FILE" ] && kill -0 "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null; then
    echo "[frontend] already running, pid=$(cat "$FRONTEND_PID_FILE")"
    return
  fi
  echo "[frontend] starting..."
  cd "$ROOT/frontend"
  if [ ! -d node_modules ]; then
    echo "[frontend] installing deps..."
    npm install --no-audit --no-fund
  fi
  nohup npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT >>"$FRONTEND_LOG" 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
  sleep 6
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:$FRONTEND_PORT/" || echo "000")
  if [ "$code" = "200" ]; then
    echo "[frontend] OK pid=$(cat "$FRONTEND_PID_FILE") port=$FRONTEND_PORT"
  else
    echo "[frontend] FAILED (http=$code), check $FRONTEND_LOG"
    return 1
  fi
}

stop_one() {
  local pidfile="$1" name="$2"
  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    kill "$(cat "$pidfile")" 2>/dev/null || true
    sleep 1
    kill -9 "$(cat "$pidfile")" 2>/dev/null || true
    echo "[$name] stopped"
  else
    echo "[$name] not running"
  fi
  rm -f "$pidfile"
}

status() {
  for name in backend frontend; do
    if [ "$name" = "backend" ]; then port=$BACKEND_PORT; pidfile="$BACKEND_PID_FILE"; else port=$FRONTEND_PORT; pidfile="$FRONTEND_PID_FILE"; fi
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:$port/" 2>/dev/null || echo "000")
    pid=$(cat "$pidfile" 2>/dev/null || echo "-")
    echo "[$name] port=$port http=$code pid=$pid"
  done
}

case "${1:-start}" in
  start)
    start_backend
    start_frontend
    ;;
  stop)
    stop_one "$BACKEND_PID_FILE" backend
    stop_one "$FRONTEND_PID_FILE" frontend
    ;;
  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;
  status)
    status
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
