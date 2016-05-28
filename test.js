var assert = require('assert');
var express = require('express');
var superagent = require('superagent');
var wagner = require('wagner-core');
var status = require('http-status');

var env = require('node-env-file');
env(__dirname + '/.env', { overwrite: true });

var URL_ROOT = 'http://localhost:3000';
var PRODUCT_ID = "000000000000000000000001";



describe('API', function() {

  var models;
  var Stripe;

  before(function() {
    models = require('./models')(wagner);
    Stripe = require('./dependencies')(wagner).Stripe;
  });

  describe('Category', function() {

    var server;
    var Category;

    before(function() {
      app = express();
      app.use(require('./api')(wagner));
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

      var categories = test_data.categories;

      Category.create(categories, function(error, categories) {

        assert.ifError(error);
        var url = URL_ROOT + '/category/parent/Electronics';

        superagent.get(url, function(error, res) {

          assert.ifError(error);
          var result;

          assert.doesNotThrow(function() {
            result = JSON.parse(res.text);
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


  describe('Product', function() {

    var server;
    var Product;
    var Category;

    before(function() {
      app = express();
      app.use(require('./api')(wagner));
      server = app.listen(3000);
      Product = models.Product;
      Category = models.Category;
    });


    after(function() {
      server.close();
    });


    beforeEach(function(done) {
      Category.remove({}, function(error) {
        assert.ifError(error);
        Product.remove({}, function(error) {
          assert.ifError(error);
          done();
        })
      });
    });


    it('can load a product by id', function(done) {

      var product = {
        name: "LG G4",
        _id: PRODUCT_ID,
        price: {
          amount: 300,
          currency: "USD"
        }
      };

      Product.create(product, function(error, doc) {

        assert.ifError(error);
        var url = URL_ROOT + '/product/id/' + PRODUCT_ID;

        superagent.get(url, function(error, res) {
          assert.ifError(error);
          var result;

          assert.doesNotThrow(function() {
            result = JSON.parse(res.text);
          });

          assert.ok(result.product);
          assert.equal(result.product._id, PRODUCT_ID);
          assert.equal(result.product.name, 'LG G4');
          done();

        });
      });
    });


    it('can load all products in a category with subcategories', function(done) {

      var categories = test_data.categories;
      var products = test_data.products;

      Category.create(categories, function(error, categories) {

        assert.ifError(error);
        Product.create(products, function(error, products) {

          assert.ifError(error);
          var url = URL_ROOT + "/product/category/Electronics";

          superagent.get(url, function(error, res) {
            assert.ifError(error);
            var result;
            assert.doesNotThrow(function() {
              result = JSON.parse(res.text);
            });
            assert.equal(result.products.length, 2);
            assert.equal(result.products[0].name, "Asus Zenbook Prime");
            assert.equal(result.products[1].name, "LG G4");

            var url = URL_ROOT + "/product/category/Electronics?price=1";
            superagent.get(url, function(error, res) {

              assert.ifError(error);
              var result;
              assert.doesNotThrow(function() {
                result = JSON.parse(res.text);
              });

              assert.equal(result.products.length, 2);
              assert.equal(result.products[0].name, "LG G4");
              assert.equal(result.products[1].name, "Asus Zenbook Prime");
              done();

            });
          });
        });


      });
    });

  });

  describe('User', function() {

    var server;
    var Category;
    var Product;
    var User;

    before(function() {
      var app = express();
      Category = models.Category;
      Product = models.Product;
      User = models.User;

      app.use(function(req, res, next) {
        User.findOne({}, function(error, user) {
          assert.ifError(error);
          req.user = user;
          next();
        });
      });

      app.use(require('./api')(wagner));
      server = app.listen(3000);
    });

    after(function() {
      server.close();
    });

    beforeEach(function(done) {
      Category.remove({}, function(error) {
        assert.ifError(error);
        Product.remove({}, function(error) {
          assert.ifError(error);
          User.remove({}, function(error) {
            assert.ifError(error);
            done();
          })
        });
      });
    });

    beforeEach(function(done) {

      var categories = test_data.categories;
      var products = test_data.products;
      var users = test_data.users;

      Category.create(categories, function(error) {
        assert.ifError(error);
        Product.create(products, function(error) {
          assert.ifError(error);
          User.create(users, function(error) {
            assert.ifError(error);
            done();
          });
        });
      });

    });


    it("can save user's cart", function(done) {
      var url = URL_ROOT + "/me/cart";
      superagent.
        put(url).
        send({
          data: {
            cart: [{ product: PRODUCT_ID, quantity: 1 }]
          }
        }).
        end(function(error, res) {
          assert.ifError(error);
          assert.equal(res.status, status.OK)
          User.findOne({}, function(error, user) {
            assert.ifError(error);
            assert.equal(user.data.cart.length, 1);
            assert.equal(user.data.cart[0].product, PRODUCT_ID);
            assert.equal(user.data.cart[0].quantity, 1);
            done();
          });
        });
    });


    it("can load user cart", function(done) {
      var url = URL_ROOT + "/me";
      User.findOne({}, function(error, user) {
        assert.ifError(error);
        user.data.cart = [{ product: PRODUCT_ID, quantity: 1 }];
        user.save(function(error) {
          assert.ifError(error);
          superagent.get(url, function(error, res) {
            assert.ifError(error);
            var result;
            assert.doesNotThrow(function() {
              result = JSON.parse(res.text).user;
            });
            assert.equal(result.data.cart.length, 1);
            assert.equal(result.data.cart[0].product.name, 'Asus Zenbook Prime');
            assert.equal(result.data.cart[0].quantity, 1);
            done();
          });
        });
      });
    });

    it("can checkout", function(done) {
      this.timeout(4000);
      var url = URL_ROOT + "/checkout";
      User.findOne({}, function(error, user) {
        assert.ifError(error);
        user.data.cart = [{ product: PRODUCT_ID, quantity: 1 }];
        user.save(function(error) {
          assert.ifError(error);

          superagent.
            post(url).
            send({
              stripeToken: {
                number: '4242424242424242',
                cvc: '123',
                exp_month: '12',
                exp_year: '2016'
              }
            }).
            end(function(error, res) {
              assert.ifError(error);
              assert.equal(res.status, 200);
              var result;
              assert.doesNotThrow(function() {
                result = JSON.parse(res.text);
              })
              assert.ok(result.id);

              Stripe.charges.retrieve(result.id, function(error, charge) {
                assert.ifError(error);
                assert.ok(charge);
                assert.equal(charge.amount, 2000 * 100);
                done();
              });

            });
        });

      });
    });


  });
});




describe("Object.keys", function() {

  it("return object keys array", function() {

    var obj = {
      Category: "1",
      Product: "2"
    }

    var keys = Object.keys(obj);
    assert.equal(keys[0], "Category");
    assert.equal(keys[1], "Product");

  });

});

describe("Env", function() {
  it("is working", function() {
    assert.equal(process.env.FOO, "bar");
  });
});


var test_data = {

  categories: [
    { _id: 'Electronics' },
    { _id: 'Phones', parent: 'Electronics' },
    { _id: 'Laptops', parent: 'Electronics' },
    { _id: 'Bacon' }
  ],

  products: [
     {
       name: "LG G4",
       category: { _id: "Phones", ancestors: ["Electronics", "Phones"] },
       price: {
         amount: 300,
         currency: "USD"
       }
     },
     {
       _id: PRODUCT_ID,
       name: "Asus Zenbook Prime",
       category: { _id: "Laptops", ancestors: ["Electronics", "Laptops"] },
       price: {
         amount: 2000,
         currency: "USD"
       }
     },
     {
       name: "Flying Pigs Farm Pasture Raised Pork Bacon",
       category: { _id: "Bacon", ancestors: ["Bacon"] },
       price: {
         amount: 20,
         currency: "USD"
       }
     }
  ],

  users: [{
    profile: {
      username: 'vkarpov15',
      picture: 'http://pbs.twimg.com/profile_images/550304223036854272/Wwmwuh2t.png'
    },
    data: {
      oauth: 'invalid',
      cart: []
    }
  }]

};
