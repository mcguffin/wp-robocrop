var gulp = require('gulp');
var concat = require('gulp-concat');  
var uglify = require('gulp-uglify');  
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');


gulp.task('styles:prod', function() {
	// prod
	return gulp.src('scss/wp-robocrop-admin.scss')
		.pipe( sass( { 
			outputStyle: 'compressed', omitSourceMapUrl: true 
		} ).on('error', sass.logError) )
		.pipe(rename('wp-robocrop-admin.min.css'))
		.pipe( gulp.dest('./css/'));
});
gulp.task('styles:dev', function() {
	// dev
    return gulp.src('scss/wp-robocrop-admin.scss')
		.pipe(sourcemaps.init())
        .pipe( sass( { outputStyle: 'expanded' } ).on('error', sass.logError) )
        .pipe(sourcemaps.write())
        .pipe( gulp.dest('./css/'));
});

gulp.task('scripts', function() {
	return gulp.src([
			'./js/src/robocrop-base.js',
			'./js/src/robocrop-media-view.js',
			'./js/src/robocrop-focuspoint-media-view.js',
			'./js/src/robocrop-wp-media-view.js',
			'./js/src/robocrop-focuspoint-wp-uploader.js' 
		])
		.pipe( uglify() )
		.pipe(concat('wp-robocrop.combined.min.js'))
	    .pipe(gulp.dest('./js/'))
	
});


gulp.task('default', function() {
	// place code for your default task here
	gulp.watch('scss/**/*.scss',['styles:prod']);
	gulp.watch('scss/**/*.scss',['styles:dev']);
	gulp.watch('js/src/*.js',['scripts']);
});