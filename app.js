var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var mongoClient = require("mongodb").MongoClient;
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// app.use(body-parser());

app.use('/', indexRouter);
app.use('/users', usersRouter);

// GET
app.get('/signup',function(req,res){
  res.render('signup');
});

app.get('/logout/:name', function(req,res){
  var MongoClient = require("mongodb").MongoClient;
  MongoClient.connect("mongodb://localhost:27017/", function(err, db){
    if(err) next(err)
    console.log("Database Connected");
    var dbs = db.db('messenger');
    dbs.collection('online').deleteOne({name:req.params.name}, function(err,r){
      if(err) next(err);
      res.redirect('/');
    });
  });
});

// POST
app.post('/login',function(req,res){
  var MongoClient = require("mongodb").MongoClient;
  MongoClient.connect("mongodb://localhost:27017/", function(err, db){
    if(err) next(err)
    console.log("Database Connected");
    var dbs = db.db('messenger');
    dbs.collection('auth').findOne({ name : req.body.username, pass: req.body.password },function(err,r){
      if(r){
        dbs.collection('online').find({}).toArray(function(err,result){
          dbs.collection('online').insertOne({ name : req.body.username }, function(err){
            if(err) next(err);
            res.render('home', { name: req.body.username, ousers: result });
          });
        }); 
        }
        else
          res.send("Authentication Failed");
      });
  });
});

app.post('/signup',function(req,res){
  var mongoClient = require("mongodb").MongoClient;
  mongoClient.connect("mongodb://localhost:27017/", function(err, db){
    if(err) next(err)
    console.log("Database Connected");
    var obj = { name: req.body.username, pass: req.body.password };
    var dbs = db.db('messenger');
    dbs.collection('auth').insertOne(obj,function(err,r){
      if(err) next(err)
      res.send("Successfully Registered");
    });
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
