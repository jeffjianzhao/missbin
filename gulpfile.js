var gulp = require('gulp'),
	nodemon = require('gulp-nodemon'),
	gutil = require('gulp-util'),
	sass = require('gulp-sass')(require('sass')),
	uglify = require('gulp-uglify');

var browserify = require('browserify'),
	source = require('vinyl-source-stream'),
	buffer = require('vinyl-buffer');

// gulp.task('css', function() {
//     return gulp.src('client/css/*.css')
//         .pipe(gulp.dest('public/css'));
// });

gulp.task('css', function() {
    return gulp.src('client/css/*.scss')
    	.pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('public/css'));
});

gulp.task('scripts', function() {
	return browserify('client/js/main.js', {debug: true})
  		.bundle()
    	.pipe(source('app.js'))
    	.pipe(gulp.dest('public/js'));
});

gulp.task('scripts-min', function() {
	return browserify('client/js/main.js')
  		.bundle()
    	.pipe(source('app.js'))
    	.pipe(buffer())
    	.pipe(uglify().on('error', gutil.log))
    	.pipe(gulp.dest('public/js'));
});

gulp.task('html', function() {
	return gulp.src('client/*.html')
		.pipe(gulp.dest('public'));
});

// gulp.task('components', function() {
// 	return gulp.src('client/components/**/*')
// 		.pipe(gulp.dest('public/components'));
// });

gulp.task('resources', function() {
	return gulp.src('client/resources/**/*')
		.pipe(gulp.dest('public/resources'));
});

gulp.task('watch', function() {
	gulp.watch('client/css/*.scss', gulp.series(['css']));
	gulp.watch('client/js/*.js', gulp.series(['scripts']));
	gulp.watch('client/*.html', gulp.series(['html']));
});

gulp.task('develop', gulp.series(['scripts', 'css', 'html', 'resources'], function () {
	nodemon({
		script: 'server/server.js',
	})
	.on('start', ['watch'])
    .on('change', ['watch'])
    .on('restart', function () {
      console.log('restarted!');
    });
}));

gulp.task('default', gulp.series(['develop']));

gulp.task('build', gulp.series(['scripts-min', 'css', 'html', 'resources']));
