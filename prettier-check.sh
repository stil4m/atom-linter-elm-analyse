#!/bin/sh
jsfiles=$(find js -name "*.js" ! -path "js/public/editor-elm.js" ! -path "js/backend-elm.js" ! -path "js/public/client-elm.js" ! -path "js/public/sigma/*"  | grep '\.jsx\?$' | tr '\n' ' ')
[ -z "$jsfiles" ] && exit 0

diffs=$(node_modules/.bin/prettier --single-quote --tab-width 4 -l $jsfiles)
[ -z "$diffs" ] && exit 0

echo $diffs
exit 1

