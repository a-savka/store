var assert = require('assert');
var expres = require('express');
var superagent = require('superagent');
var wagner = require('wagner-core');

var URL_ROOT = 'http://localhost:3000';

describe('Category API', function() {

  var server;
  var Category;

  before(function() {
    app = express();

    var models = require('./models')(wagner);
    app.use('/api/v1', require('./api')(wagner));

    server = app.listen(3000);

    Category = models.Category;
  });


  after(function() {
    server.close();
  });


  beforeEach(function(done) {
    Category.remove({}, function(error) {
      assert.ifError(error);
      done();
    });
  });


  it('can load a category by id', function(done) {

    Category.create({ _id: 'Electronics' }, function(error, doc) {

      assert.ifError(error);
      var url = URL_ROOT + '/category/id/Electronics';

      superagent.get(url, function(error, res) {
        assert.ifError(error);
        var result;

        assert.doesNotThrow(function() {
          result = JSON.parse(res.text);
        });

        assert.ok(result.category);
        assert.equal(result.category._id, 'Electronics');
        done();

      });
    });
  });


  it('can load all categories that have a certain parent', function(done) {

    var categories = [
      { _id: 'Electronics' },
      { _id: 'Phones', parent: 'Electronics' },
      { _id: 'Laptops', parent: 'Electronics' },
      { _id: 'Bacon' }
    ];

    Category.create(categories, function(error, categories) {

      assert.ifError(error);
      var url = URL_ROOT + '/categories/parent/Electronics';

      superagent.get(url, function(error, res) {

        assert.ifError(error);
        var result;

        assert.doesNotThrow(function() {
          result = JSON.parse(result);
        });

        assert.ok(result.categories);
        assert.equal(result.categories.length, 2);
        assert.equal(result.categories[0]._id, 'Laptops');
        assert.equal(result.categories[1]._id, 'Phones');
        done();

      });
    });
  });

});
