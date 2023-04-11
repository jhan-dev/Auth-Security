//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({ 
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery", true);

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, done) {
  process.nextTick(function () {
    done (null, { id: user.id, username: user.username, name: user.name });
  });
});
 
passport.deserializeUser(function (user, done) {
  process.nextTick(function () {
    return done (null, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, done) {
  User.findOne({ 'googleId': profile.id })
  .then(user => {
      if (!user) {
          user = new User({
              googleId: profile.id
          });
          user.save()
              .then(() => done(null, user))
              .catch(err => done(err));

        //found user
      } else {
          done(null, user);
      }
  })
  .catch(err => done(err));
}));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google", 
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  if (req.isAuthenticated()){
    res.render("secrets");
  }
  else {
    res.redirect("/login");
  }
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  }
  else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  
})

app.get("/logout", function (req, res) { 
  req.logout(function (err) {
    if (err) {
      console.log(err);
    }
    else {
      console.log("logged out");
    }
    });
 
  res.redirect("/");
 });

app.post("/register", function(req, res){

  // bcrypt.hash(req.body.password, saltRounds, function(err, hash){
  //   // Store hash in pw DB
  //   const newUser = new User({
  //     email: req.body.username,
  //     // password: md5(req.body.password)
  //     password: hash
  //   });
  
  //   newUser.save()
  //   .then(() => {
  //     res.render("secrets")
  //   })
  //   .catch(() => {
  //     console.log("Error while saving data.")
  //   })
  // });

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    }
    else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets")
      });
    }
  })
});

app.post("/login", function(req, res){

//   const username = req.body.username;
//   const password = req.body.password;

//   User.findOne()
//   .then({email: username}, function(foundUser){
//     if(foundUser){
//       if(foundUser.password === password){
//         res.render("secrets");
//       }
//     }
//   })
//   .catch(function(err){
//     res.render(err)
//   })

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err){
      console.log(err);
      res.redirect("/register");
    }
    else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  })
});

app.listen(3000, function(){
  console.log("Server started on port 3000.");
});