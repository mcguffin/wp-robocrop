var gulp = require('gulp');
var concat = require('gulp-concat');  
var uglify = require('gulp-uglify');  
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');

// 
// gulp.task('styles:dev', function() {
// 	// dev
//     return gulp.src('./src/scss/frontend.scss')
// 		.pipe(sourcemaps.init())
//         .pipe( sass( { outputStyle: 'expanded' } ).on('error', sass.logError) )
//         .pipe( sourcemaps.write() )
// 		.pipe(rename('frontend.css'))
//         .pipe( gulp.dest('./css/'));
// });
// 
// 
// gulp.task('styles:prod', function() {
// 	// dev
//     return gulp.src('./src/scss/frontend.scss')
// 		.pipe( sass( { 
// 			outputStyle: 'compressed', omitSourceMapUrl: true 
// 		} ).on('error', sass.logError) )
// 		.pipe(rename('frontend.min.css'))
// 		.pipe( gulp.dest('./css/'));
// });
// 
// 
// gulp.task('styles:admin:dev', function() {
// 	// dev
//     return gulp.src('./src/scss/admin/admin.scss')
// 		.pipe(sourcemaps.init())
//         .pipe( sass( { outputStyle: 'expanded' } ).on('error', sass.logError) )
//         .pipe( sourcemaps.write() )
// 		.pipe(rename('admin.css'))
//         .pipe( gulp.dest('./css/admin/'));
// });

gulp.task('styles', function() {
	// dev
    return [
    	gulp.src('./src/scss/admin/admin.scss')
			.pipe( sourcemaps.init() )
			.pipe( sass( { 
				outputStyle: 'compressed', 
				omitSourceMapUrl: true  
			} ).on('error', sass.logError) )
			.pipe( sourcemaps.write() )
			.pipe( rename('admin.min.css') )
			.pipe( gulp.dest('./css/admin/') )
			.pipe( sass( { 
				outputStyle: 'expanded', 
				omitSourceMapUrl: true  
			} ).on('error', sass.logError) )
			.pipe( sourcemaps.write() )
			.pipe( rename('admin.css') )
			.pipe( gulp.dest('./css/admin/') )
	];
});


gulp.task('scripts', function() {
	return gulp.src([
			'./src/js/admin/robocrop-base.js',
			'./src/js/admin/robocrop-media-view.js',
			'./src/js/admin/robocrop-focuspoint-media-view.js',
			'./src/js/admin/robocrop-wp-media-view.js',
			'./src/js/admin/robocrop-focuspoint-wp-uploader.js' 
		])
		.pipe( concat('wp-robocrop.js') )
	    .pipe( gulp.dest('./js/admin/') )
		.pipe( sourcemaps.init() )
		.pipe( uglify() )
		.pipe( rename('wp-robocrop.min.js') )
		.pipe( sourcemaps.write() )
	    .pipe( gulp.dest('./js/admin/') )
});

gulp.task('watch', function() {
	// place code for your default task here
	gulp.watch( './src/scss/**/*.scss', [ 'styles' ] );
	gulp.watch( './src/js/**/*.js', [ 'scripts' ] );
});

gulp.task('default', [ 'styles', 'scripts', 'watch' ] );

