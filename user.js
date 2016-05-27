var mongoose = require('mongoose');

var userSchema = {
  profile: {
    username: {
      type: String,
      required: true,
      lowercase: true
    },
    picture: {
      type: String,
      match: /^http:\/\//i
    },
  },
  data: {
    oauth: {
      type: String,
      required: true
    },
    cart: [{
      product: {
        type: mongoose.Schema.Types.ObjectId
      },
      quantity: {
        type: Number,
        default: 1,
        min: 1
      }
    }]
  }
};

module.exports = new mongoose.Schema(userSchema);

module.exports.set('toObject', { virtuals: true });
module.exports.set('toJSON', { virtuals: true });
