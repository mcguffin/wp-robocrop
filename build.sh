#!/bin/bash

export CLOSURE_COMPILER="/usr/local/compiler-latest/compiler.jar"

# minify smartcrop
cp ./sources/smartcrop.js/smartcrop.js ./js/vendor/smartcrop/smartcrop.js
java -jar \
	$CLOSURE_COMPILER \
	--js ./sources/smartcrop.js/smartcrop.js \
	--js_output_file ./js/vendor/smartcrop/smartcrop.min.js



# copy tracking.js
cp ./sources/tracking.js/build/tracking.js ./js/vendor/tracking.js/tracking.js
java -jar \
	$CLOSURE_COMPILER \
	--js ./js/vendor/tracking.js/tracking.js \
	--js_output_file ./js/vendor/tracking.js/tracking.min.js

cp ./sources/tracking.js/build/data/face.js ./js/vendor/tracking.js/face.js
java -jar \
	$CLOSURE_COMPILER \
	--js ./js/vendor/tracking.js/face.js \
	--js_output_file ./js/vendor/tracking.js/face.min.js
# 
# rm ./js/eye.js
# cp ./sources/tracking.js/build/data/eye.js ./js/eye.js
# java -jar \
# 	$CLOSURE_COMPILER \
# 	--js ./js/eye.js \
# 	--js_output_file ./js/eye.min.js
# 
# rm ./js/mouth.js
# cp ./sources/tracking.js/build/data/mouth.js ./js/mouth.js
# java -jar \
# 	$CLOSURE_COMPILER \
# 	--js ./js/mouth.js \
# 	--js_output_file ./js/mouth.min.js
# 

# minify smart-crop.js
java -jar \
	$CLOSURE_COMPILER \
	--js ./js/smarter-crop.js \
	--js_output_file ./js/smarter-crop.min.js


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
rm ./js/wp-smartcrop.combined.min.js
touch ./js/wp-smartcrop.combined.min.js

cat ./js/vendor/smartcrop/smartcrop.min.js >> ./js/wp-smartcrop.combined.min.js
cat ./js/vendor/tracking.js/tracking.min.js >> ./js/wp-smartcrop.combined.min.js
cat ./js/vendor/tracking.js/face.min.js >> ./js/wp-smartcrop.combined.min.js

cat ./js/smarter-crop.min.js >> ./js/wp-smartcrop.combined.min.js
cat ./js/wp-uploader.min.js >> ./js/wp-smartcrop.combined.min.js
cat ./js/media-view.min.js >> ./js/wp-smartcrop.combined.min.js

rm ./js/vendor/tracking.js/tracking.min.js
rm ./js/vendor/tracking.js/face.min.js
rm ./js/vendor/smartcrop/smartcrop.min.js
# rm ./js/smarter-crop.min.js
rm ./js/media-view.min.js
rm ./js/wp-uploader.min.js
