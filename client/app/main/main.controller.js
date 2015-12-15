/*** How should the db manage the reservations ***/
/** 1) Store reservations for each restaurant by restaurant id
        a) Should contain id of authenticated user
        b) Can add or remove user ids
        c) Should there be a timestap associated with each user reservation????  Should reservations expire???
        d) Would we ever want a summary of all of a users reservations???
        e) 
***/
  (function() {
    'use strict';

    angular.module('kinleyNightlifeApp')
  .controller('MainCtrl', function ($scope, $http, YelpAPI,Auth,$window, $cookies){
  


    $scope.searchValue = "Nothing Yet";
    $scope.updateDB = true;
    $scope.awesomeThings = [];

    var mysearch = $cookies.get('searchVal');

//  On creation, if we are logged in check to see if we have a pending search
// stored in our cookie    
  if (Auth.isLoggedIn()) { // logged in, retrieve any old seraches
        if (mysearch!=undefined) { // there was an old search to deal with
          $scope.searchValue = mysearch;
          YelpAPI.retrieveYelp($scope.searchValue,function(data){
            $scope.restaurants = data.businesses;
          });
        
          var pos = parseInt($cookies.get('restaurantPos'));

          // Clean up the cookies
          $cookies.remove('searchVal');
          $cookies.remove('restaurantPos');
          var cur = $scope.restaurants[pos];
          getReservationsForRestaurant(cur.id, cur, Auth.getCurrentUser().name);
          }
        }
    else { 
    // if not logged in (ignore any old searches) and cleanup any existing cookies
      if (mysearch!=undefined) { 
        $cookies.remove('searchVal');
        if ($cookies.get('restaurantPos')!=undefined)
          $cookies.remove('restaurantPos');
      }

    }

/** Create a DB Model from the yelp data **/
  function createDBEntryFromYelp(item) {
    var entry = {name: item.name, yelp_id:item.id, confirms:[]};
    return entry;
  };

// presmumes entry not in the confirms
function addUsernameToDBConfirms(entry, username) {
  entry.confirms.push(username);
  return entry;
};
// presume entry exists
function removeUsernameFromDBConfirms(entry, username) {
  entry.confirms = entry.confirms.filter(function (val) {
    return val != username;
  });
  return entry;
};

// determine if username exists in entry
function hasUsernameInConfirms(entry, username) {
  var result = entry.confirms.find(function (element, index, array) {
    return (element== username);
  });
  return (result!=undefined);
}

/* Put this value into the array or reservatons **/
/** Assumes element is found **/
function updateCount(id, count) {
  var pos = $scope.restaurants.findIndex(function(element, index, array) {
    return id == element.id;
  });
  $scope.restaurants[pos].count = count;
}
/** getReservationsForRestaurants 
    Query the database for restaurant ID 
    If restaurant exists, set count of the corresponding 
    restaurant in $scope.restaurants to be the number of confirms
    Otherwise if it does not exist set the count to 0
    Not sure how this is going to force update on the screen. I will presume it
    is with angulars double binding
    **/
  function getReservationsForRestaurant(yelp_id, item, username) {
      $http.get('/api/reservations/name/'+yelp_id).success(function(data) {
       if (data.length == 0) {
        // there are no current reservations for this yelp_id;
        // make one and add it
       
        var entry = createDBEntryFromYelp(item);
        entry = addUsernameToDBConfirms(entry, username);  // we should already be authenticated (db will confirm it)

        $http.post('/api/reservations',entry).success(function(data) {
          var count = data.confirms.length;
          var yelp_id = data.yelp_id;
          updateCount(yelp_id, count);
        });
        return;  // new entry created with username added
       }
       // Entry exists and is stored as data need to check or username
       data = data[0];
       var entry = undefined;
       if (hasUsernameInConfirms(data, username)) {
         entry = removeUsernameFromDBConfirms(data, username);
       }
       else
        entry = addUsernameToDBConfirms(data,username);
        // now replace the entry

        $http.put('/api/reservations/'+entry._id, entry).success(function(result) {
          var count = data.confirms.length;
          var yelp_id = data.yelp_id;
          updateCount(yelp_id, count);
          if(count ==0) {
            $http.delete('/api/reservations/'+data._id).success(function (data) {

            });
          }
        });
       
       return;

    });

  }


// SIDE NOTE - MAKING THESE BE JUST RESTARUANT ADD AND DELTES FOR THE MOMETN
/** Add my name to the reservation list.  
    Precondition: User is not in the list
    **/
    $scope.current = undefined;
  function addToReservation(reservation, name) {
    $http.post('/api/reservations/', reservation).success(function(data) {
      $scope.current = data;

    });
  }


/** Remove name from reservation
    Precondition: User is not in the list
    **/
    function removeFromReservation(reservation, name) {
      $http.delete('/api/reservations/'+reservation._id).success(function(data) {
       
      });
    }

    /** Check if I current have a reservation **/
    function checkReservation(yelp_id) {
      $http.get('/api/reservations/name/'+yelp_id).success(function(data) {
        var count = 0;
       if (data.length != 0) {
         count = data[0].confirms.length;
        }
        updateCount(yelp_id, count);
        return;  // new entry created with username added
    })
      .error(function(item) {   // this means there is no entry in the database so I probably need to make one
    });
  }
    

    // make the call to yelp, autofill for now
    $scope.search = function() {

      $scope.searchValue = $scope.searchInfo;
        YelpAPI.retrieveYelp($scope.searchInfo,function(data){
          $scope.restaurants = data.businesses;
          $scope.restaurants.forEach(function (element) {
            checkReservation(element.id);
          });

        });
      };


  /** Set or Unset reservation to restaurant
      Find restaurant with id "id" and then "get" the reservations
      Will update the button

  **/
  $scope.reserveRestaurant = function(id) {
    var pos  = $scope.restaurants.findIndex(function(element,index, array) {
      return (element.id == id);
    });

// THIS STUFF BELOW HERE IS INCREDIBLY IMPORTANT TO ENSURE THAT THE USER IS AUTHENTICATED BEFORE THEY CAN CONFIRM A RESERVATION
   if (!Auth.isLoggedIn()) {
    $cookies.put('searchVal', $scope.searchValue);
    $cookies.put('restaurantPos', pos);
    $window.location.href = '/auth/twitter';
   }
   else {
    $cookies.remove('searchVal');
    $cookies.remove('restaurantPos');
    var cur = $scope.restaurants[pos];
    getReservationsForRestaurant(cur.id, cur, Auth.getCurrentUser().name);
  }


  }
  $scope.searchInfo = "04105";
  $scope.search();
  })
  .factory("YelpAPI",
      function ($http) {


        var randomString = function (length, chars) {
          var result = '';
          for (var i = length; i > 0; --i) {
            result += chars[Math.round(Math.random() * (chars.length - 1))];
          }
          return result;
        };
        var retrieveYelp = function (name, callback) {
          var method =  'GET';
          var url =     'http://api.yelp.com/v2/search';
          var params = {
            callback:    'angular.callbacks._0',
             location: name,
            oauth_consumer_key: '0kdnA_RYyI7whV48xPkslA', //Consumer Key
            oauth_token: '5RAr8eQY_5Z-ZQ65WO1VZG7d2AL3pLCj', //Token
            oauth_signature_method:   'HMAC-SHA1',
            oauth_timestamp:          new Date().getTime(),
            oauth_nonce:              randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'),
            term:                     'food'
          }; // end params
            var consumerSecret = 'SC5b6lxQ3ErKtGzkcVWNjI4XpVU'; //Consumer Secret
            var tokenSecret = 'Cg2dRxWCLA_mM0tW9oMk1c2-l7M'; //Token Secret
             var signature = 
            oauthSignature.generate(
              method, 
              url, 
              params, 
              consumerSecret, 
              tokenSecret, 
              { encodeSignature: false }
            ); 
            // end signature
          params['oauth_signature'] = signature;
     $http.jsonp(url, { params : params })
            .success(callback);
        }; // end retrieveYelp
        return {
          retrieveYelp: retrieveYelp      
        };
      } // end function

    ); // end factory

})();