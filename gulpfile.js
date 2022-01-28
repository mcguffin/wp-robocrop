var autoprefixer = require('gulp-autoprefixer');
var concat = require('gulp-concat');
var gulp = require('gulp');
var rename = require('gulp-rename');
var sass = require('gulp-sass')( require( 'sass' ) );
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

function do_scss( src ) {
	var dir = src.substring( 0, src.lastIndexOf('/') );
	return gulp.src( './src/scss/' + src + '.scss' )
		.pipe( sourcemaps.init() )
		.pipe( sass( { outputStyle: 'expanded' } ).on('error', sass.logError) )
		.pipe( autoprefixer() )
		.pipe( gulp.dest( './css/' + dir ) )
        .pipe( sass( { outputStyle: 'compressed' } ).on('error', sass.logError) )
		.pipe( rename( { suffix: '.min' } ) )
        .pipe( gulp.dest( './css/' + dir ) );

}

function do_js( src ) {
	var dir = src.substring( 0, src.lastIndexOf('/') );
	return gulp.src( './src/js/' + src + '.js' )
		.pipe( sourcemaps.init() )
		.pipe( gulp.dest( './js/' + dir ) )
		.pipe( uglify() )
		.pipe( rename( { suffix: '.min' } ) )
		.pipe( sourcemaps.write() )
		.pipe( gulp.dest( './js/' + dir ) );
}

function concat_js( src, dest ) {
	return gulp.src( src )
		.pipe( sourcemaps.init() )
		.pipe( concat( dest ) )
		.pipe( sourcemaps.write() )
		.pipe( gulp.dest( './js/' ) )
		.pipe( uglify() )
		.pipe( rename( { suffix: '.min' } ) )
		.pipe( gulp.dest( './js/' ) );

}


gulp.task('scss-admin', function() {
	return do_scss('admin/admin');
});
gulp.task('scss-settings', function() {
	return do_scss('settings/media');
});


gulp.task( 'js-admin', function(){
	return concat_js( [
			'./src/js/admin/robocrop-base.js',
			'./src/js/admin/robocrop-media-view.js',
			'./src/js/admin/robocrop-focuspoint-media-view.js',
			'./src/js/admin/robocrop-wp-media-view.js',
			'./src/js/admin/robocrop-focuspoint-wp-uploader.js'
		], 'admin/wp-robocrop.js');
} );
gulp.task( 'js-settings', function(){
	return do_js('settings/media');
});
gulp.task('js', gulp.parallel( 'js-admin', 'js-settings' ) );
gulp.task('scss', gulp.parallel( 'scss-admin', 'scss-settings' ) );


gulp.task('build', gulp.parallel( 'scss', 'js' ) );


gulp.task('watch', function() {
	// place code for your default task here
	gulp.watch('./src/scss/**/*.scss', gulp.parallel( 'scss' ) );
	gulp.watch('./src/js/**/*.js', gulp.parallel( 'js' ) );
});

gulp.task('default', gulp.parallel('build','watch'));
gulp.task('dev', gulp.parallel( 'build', 'watch' ) );
