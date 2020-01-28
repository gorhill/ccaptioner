#!/usr/bin/env bash
#
# This script assumes a linux environment

echo "*** CCaptioner: Creating extension packages"

DES=~/Downloads/ccaptioner
rm -rf $DES

# Chromium
echo "*** Creating ccaptioner.chromium"
DESCH=$DES/ccaptioner.chromium
mkdir -p $DESCH
cp -R ./src/* $DESCH/
cp ./LICENSE.txt $DESCH/
cp ./manifest-chromium.json $DESCH/manifest.json

# Firefox
echo "*** Creating ccaptioner.firefox"
DESFF=$DES/ccaptioner.firefox
mkdir -p $DESFF
cp -R ./src/* $DESFF/
cp ./LICENSE.txt $DESFF/
cp ./manifest-firefox.json $DESFF/manifest.json
pushd $DESFF > /dev/null
zip ../$(basename $DESFF).xpi -qr *
popd > /dev/null
