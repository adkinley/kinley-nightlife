exports.setup = function (User, config) {
  var passport = require('passport');
  var TwitterStrategy = require('passport-twitter').Strategy;

  passport.use(new TwitterStrategy({
      consumerKey: 'ucIMbM5RBeg1Acuk1jvW4GHJn',
    consumerSecret: 'b7HiCubRQnNXD8rEGG90ieCIR1yombtNCkZFolVtoDexFW4C3F',
    callbackURL: 'http://127.0.0.1:9000/auth/twitter/callback'
  },
  function(token, tokenSecret, profile, done) {
    console.log("Profile is " + profile);
    User.findOne({
      'twitter.id_str': profile.id
    }, function(err, user) {
      if (err) {
        return done(err);
      }
      if (!user) {
        user = new User({
          name: profile.displayName,
          username: profile.username,
          role: 'user',
          provider: 'twitter',
          twitter: profile._json
        });
        user.save(function(err) {
          if (err) return done(err);
          done(err, user);
        });
      } else {
        return done(err, user);
      }
    });
    }
  ));
};
