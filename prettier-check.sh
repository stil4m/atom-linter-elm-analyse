#!/bin/sh
jsfiles=$(find lib -name "*.js" | grep '\.jsx\?$' | tr '\n' ' ')
[ -z "$jsfiles" ] && exit 0

diffs=$(node_modules/.bin/prettier --single-quote --tab-width 4 -l $jsfiles)
[ -z "$diffs" ] && exit 0

echo $diffs
exit 1

