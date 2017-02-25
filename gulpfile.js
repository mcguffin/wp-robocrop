var gulp = require('gulp');
var concat = require('gulp-concat');  
var uglify = require('gulp-uglify');  
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');


gulp.task('styles:dev', function() {
	// dev
    return gulp.src('scss/frontend.scss')
		.pipe(sourcemaps.init())
        .pipe( sass( { outputStyle: 'expanded' } ).on('error', sass.logError) )
        .pipe( sourcemaps.write() )
		.pipe(rename('frontend.css'))
        .pipe( gulp.dest('./css/'));
});


gulp.task('styles:prod', function() {
	// dev
    return gulp.src('scss/frontend.scss')
		.pipe( sass( { 
			outputStyle: 'compressed', omitSourceMapUrl: true 
		} ).on('error', sass.logError) )
		.pipe(rename('frontend.min.css'))
		.pipe( gulp.dest('./css/'));
});


gulp.task('styles:admin:dev', function() {
	// dev
    return gulp.src('scss/admin/admin.scss')
		.pipe(sourcemaps.init())
        .pipe( sass( { outputStyle: 'expanded' } ).on('error', sass.logError) )
        .pipe( sourcemaps.write() )
		.pipe(rename('admin.css'))
        .pipe( gulp.dest('./css/admin/'));
});

gulp.task('styles:admin:prod', function() {
	// dev
    return gulp.src('scss/admin/admin.scss')
		.pipe(sourcemaps.init())
        .pipe( sass( { outputStyle: 'compressed', omitSourceMapUrl: true  } ).on('error', sass.logError) )
        .pipe( sourcemaps.write() )
		.pipe(rename('admin.min.css'))
        .pipe( gulp.dest('./css/admin/'));
});




gulp.task('scripts', function() {
	return gulp.src([
			'./js/src/admin/robocrop-base.js',
			'./js/src/admin/robocrop-media-view.js',
			'./js/src/admin/robocrop-focuspoint-media-view.js',
			'./js/src/admin/robocrop-wp-media-view.js',
			'./js/src/admin/robocrop-focuspoint-wp-uploader.js' 
		])
		.pipe( uglify() )
		.pipe(concat('wp-robocrop.min.js'))
	    .pipe(gulp.dest('./js/admin/'))
	
});

gulp.task('watch', function() {
	// place code for your default task here
	gulp.watch('scss/**/*.scss',[ 
// 		'styles:dev', 
// 		'styles:prod',
		'styles:admin:dev', 
		'styles:admin:prod',
		]);
	gulp.watch('js/src/*.js',['scripts']);
});
gulp.task('default', [ 'watch' ] );

gulp.start( 'default', [ 
// 	'styles:dev', 
// 	'styles:prod', 
	'styles:admin:dev', 
	'styles:admin:prod', 
	'scripts' 
] );
