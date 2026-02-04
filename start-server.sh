#!/bin/bash
cd /home/user8397/clawd/company-dashboard
pkill -f "node.*server" 2>/dev/null
sleep 1
node server.cjs &
sleep 2
echo "Server started on http://100.65.124.35:3001"
