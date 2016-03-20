#!/bin/bash

export CLOSURE_COMPILER="/usr/local/compiler-latest/compiler.jar"

# minify media-view.js
java -jar \
	$CLOSURE_COMPILER \
	--js ./js/media-view.js \
	--js_output_file ./js/media-view.min.js

# minify wp-uploader.js
java -jar \
	$CLOSURE_COMPILER \
	--js ./js/wp-uploader.js \
	--js_output_file ./js/wp-uploader.min.js



# combine

cat ./js/wp-uploader.min.js >> ./js/wp-robocrop.combined.min.js
cat ./js/media-view.min.js >> ./js/wp-robocrop.combined.min.js

rm ./js/media-view.min.js
rm ./js/wp-uploader.min.js
