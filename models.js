var mongoose = require('mongoose');

module.exports = function(wagner) {

  mongoose.connect('mongodb://localhost:27017/test');

  var Category =
    mongoose.model('Category', require('./category.js'), 'categories');
  var Product =
    mongoose.model('Product', require('./product.js'), 'products');
  var User =
    mongoose.model('User', require('./user.js'), 'users');

  var models = {
    Category: Category,
    Product: Product,
    User: User
  };

  Object.keys(models).forEach(function(key) {
    wagner.factory(key, function() {
      return models[key];
    });
  });

  wagner.factory('Category', function() {
    return Category;
  });

  return models;

}
