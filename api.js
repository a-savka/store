var express = require('express');
var status = require('http-status');
var bodyparser = require('body-parser');

module.exports = function(wagner) {
  var api = express.Router();

  api.use(bodyparser.json());

  api.get("/category/id/:id", wagner.invoke(function(Category) {
    return function(req, res) {

      Category.findOne({ _id: req.params.id },
        handleOne.bind(null, 'category', res));

    };
  }));

  api.get("/category/parent/:id", wagner.invoke(function(Category) {
    return function(req, res) {

      Category.find({ parent: req.params.id }).
        sort({ _id: 1 }).
        exec(handleMany.bind(null, 'categories', res));

    };
  }));

  api.get("/product/id/:id", wagner.invoke(function(Product) {
    return function(req, res) {

      Product.findOne({ _id: req.params.id },
        handleOne.bind(null, 'product', res));

    };
  }));

  api.get("/product/category/:id", wagner.invoke(function(Product) {
    return function(req, res) {

      var sort = { name: 1 };
      if(req.query.price === "1") {
        sort = { "internal.approximatePriceUSD": 1 };
      }
      else if(req.query.price === "-1") {
        sort = { "internal.approximatePriceUSD": -1 };
      }

      Product.
        find({ "category.ancestors": req.params.id }).
        sort(sort).
        exec( handleMany.bind(null, 'products', res));

    };
  }));

  api.get("/product/search/:query", wagner.invoke(function(Product) {
    return function(req, res) {

      Product.
        find(
          { $text: { $search: req.params.query } },
          { score: { $meta: 'textScore' } }).
        sort(
          { score: { $meta: 'textScore' } }).
        limit(10).
        exec(handleMany.bind(null, "products", res));

    };
  }));


  api.put("/me/cart", wagner.invoke(function(User) {
    return function(req, res) {

      try {
        var cart = req.body.data.cart;
      }
      catch (e) {
        return res.
          status(status.BAD_REQUEST).
          json({ error: "No cart specified" });
      }

      req.user.data.cart = cart;
      req.user.save(function(error, user) {
        if(error) {
          return res.
            status(status.INTERNAL_SERVER_ERROR).
            json({ error: error.toString() });
        }
        res.json({ user: user });
      });

    };
  }));


  api.get("/me", function(req, res) {

    if(!req.user) {
      return res.
        status(status.UNAUTHORIZED).
        json({ message: 'Not logged in' });
    }

    req.user.populate(
      { path: 'data.cart.product', model: 'Product' },
      handleOne.bind(null, 'user', res)
    );

  });


  api.post("/checkout", wagner.invoke(function(User, Stripe) {
    return function(req, res) {

      if(!req.user) {
        return res.
          status(status.UNAUTHORIZED).
          json({ message: "Not logged in" });
      }

      req.user.populate({ path: "data.cart.product", model: "Product" }, function(error, user) {

        var totalCostUSD = user.data.cart.reduce(function(total, item){
          return total + item.product.internal.approximatePriceUSD * item.quantity;
        }, 0);

        Stripe.charges.create(
          {
            amount: Math.ceil(totalCostUSD * 100),
            currency: "USD",
            source: req.body.stripeToken,
            description: "Example charge"
          },
          function(err, charge) {

            if(err && err.type === 'StripeCardError') {
              return res.
                status(status.BAD_REQUEST).
                json({ message: err.toString() });
            }

            if(err) {
              console.log(err);
              return res.
                status(status.INTERNAL_SERVER_ERROR).
                json({ message: err.toString() })
            }

            req.user.data.cart = [];
            req.user.save(function() {
              res.json({ id: charge.id })
            });

          });

      });

    };
  }));

  return api;

}


function handleOne(property, res, error, result) {
  if(error) {
    return res.
      status.INTERNAL_SERVER_ERROR.
      json({ error: error.toString() });
  }
  if(!result) {
    return res.
      status.NOT_FOUND.
      json({ error: 'Not found' });
  }
  var json = {};
  json[property] = result;
  res.json(json);
}


function handleMany(property, res, error, result) {
  if(error) {
    return res.
      status.INTERNAL_SERVER_ERROR.
      json({ error: error.toString() });
  }
  var json = {}
  json[property] = result;
  res.json(json);
}
