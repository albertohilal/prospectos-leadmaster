#!/bin/bash
cd "$(dirname "$0")"
exec node src/api/server.js 2>&1