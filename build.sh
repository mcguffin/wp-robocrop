#!/bin/bash

export CLOSURE_COMPILER="/usr/local/compiler-latest/compiler.jar"

combined=./js/wp-robocrop.combined.min.js
tmp_min=./js/tmp.js

rm $combined
touch $combined

# minify robocrop-base.js
java -jar \
	$CLOSURE_COMPILER \
	--js ./js/robocrop-base.js \
	--js_output_file $tmp_min

cat $tmp_min >> $combined

# minify robocrop-focuspoint-media-view.js
java -jar \
	$CLOSURE_COMPILER \
	--js ./js/robocrop-focuspoint-media-view.js \
	--js_output_file $tmp_min

cat $tmp_min >> $combined

# minify robocrop-media-view.js
java -jar \
	$CLOSURE_COMPILER \
	--js ./js/robocrop-media-view.js \
	--js_output_file $tmp_min

cat $tmp_min >> $combined

# minify robocrop-focuspoint-wp-uploader.js
java -jar \
	$CLOSURE_COMPILER \
	--js ./js/robocrop-focuspoint-wp-uploader.js \
	--js_output_file $tmp_min

cat $tmp_min >> $combined

# combine

rm $tmp_min
