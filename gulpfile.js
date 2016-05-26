var gulp = require('gulp');
var mocha = require('mocha-gulp');

gulp.task('test', function() {

  gulp.
    src('test.js').
    pipe(mocha()).
    on('error', function(error) {
      this.emit('end');
    });

});

gulp.task('watch', function() {
  gulp.watch('./*.js', ['test']);
});
