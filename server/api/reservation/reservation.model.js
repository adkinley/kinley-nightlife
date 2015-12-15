'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var ReservationSchema = new Schema({
  name: String,
  yelp_id: String,
  confirms: []
});

module.exports = mongoose.model('Reservation', ReservationSchema);