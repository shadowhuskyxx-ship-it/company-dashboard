#!/bin/bash
# Stable tunnel script using localtunnel
# Usage: ./tunnel.sh [port] [subdomain]

PORT=${1:-5173}
SUBDOMAIN=${2:-companydash}

echo "Starting HTTP server on port $PORT..."
cd /home/user8397/clawd/company-dashboard/dist
python3 -m http.server $PORT --bind 0.0.0.0 &
SERVER_PID=$!
sleep 2

echo "Starting tunnel at https://$SUBDOMAIN.loca.lt..."
npx localtunnel --port $PORT --subdomain $SUBDOMAIN

# Cleanup
echo "Shutting down server..."
kill $SERVER_PID 2>/dev/null