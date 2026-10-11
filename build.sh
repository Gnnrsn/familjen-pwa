#!/bin/sh
# Bygger dist/ med ENDAST de statiska app-filerna (ingen worker/, lib/, test, README).
# Cloudflare Pages: Build command "sh build.sh", Build output directory "dist".
set -e
rm -rf dist && mkdir -p dist
cp index.html app.js data.js styles.css sw.js manifest.webmanifest _routes.json dist/
cp -R icons dist/icons
echo "dist/ klar:"; ls -R dist
