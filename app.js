var createError = require('http-errors');
var express = require('express');
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var ObjectId = require('mongodb').ObjectID;


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({ 
  secret : 'key',
  saveUninitialized : true,
  resave : true
 }));
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
app.use('/users', usersRouter);
// app.all('*', isauth);


// GET
app.get('/signup',function(req,res){
  res.render('signup');
});

app.get('/', function(req, res, next) {
  console.log("Printing session");
  console.log(req.session.lid);
  console.log("Done Printing")
  if(req.session.lid){
    res.redirect('/home');
  }
  else{
    res.render('index');
  }
});

app.get('/home', function(req,res){
  if(req.session.lid){
  var MongoClient = require("mongodb").MongoClient;
  MongoClient.connect("mongodb://localhost:27017/", function(err, db){
  var dbs = db.db('messenger');
  dbs.collection('online').find({}).toArray(function(err,result){
    var id = req.session.lid;
    console.log("Session id "+id);
    dbs.collection('auth').findOne({ _id : ObjectId(id) }, function(err, r){
    if(err) next(err);
        res.render('home', { name: r.name ,id: ObjectId(r._id), ousers: result,cuser:r._id});
      });
    });
    });
  }
  else{
    res.redirect('/');
  }
});

app.get('/logout/:id', function(req,res,next){
  var MongoClient = require("mongodb").MongoClient;
  MongoClient.connect("mongodb://localhost:27017/", function(err, db){
    if(err) next(err)
    console.log("Database Connected");
    var dbs = db.db('messenger');
    dbs.collection('online').deleteOne({_id:ObjectId(req.params.id)}, function(err,r){
      if(err) next(err);
      req.session.destroy(function(err){
        next(err);
      });
      res.redirect('/');
    });
  });
});

app.get('/chatwindow', function(req,res,next){
  if( req.session.sender && req.session.receiver )
  {
    var MongoClient = require("mongodb").MongoClient;
    MongoClient.connect("mongodb://localhost:27017/", function(err, db){
      var dbs = db.db('messenger');
      dbs.collection('online').findOne({ _id: ObjectId(req.session.receiver) }, function(err,r){
        if(err) next(err);
        dbs.collection('messages').find({ $or: [ { $and: [ { from: req.session.sender },{ to: req.session.receiver } ] }, { $and: [{ from: req.session.receiver },{to:req.session.sender}] } ] }).toArray(function(er,re){
          console.log("Printing Messages"+re);
          res.render('chatwindow', { name: r.name ,from: req.session.sender, to: req.session.receiver, messages : re });
        });
      });
    });
  }
});

app.get('/online',function(req,res){
  var MongoClient = require("mongodb").MongoClient;
  MongoClient.connect("mongodb://localhost:27017/", function(err, db){
    var dbs = db.db('messenger');
    dbs.collection('online').count(function(e,r){
      if(!req.session.ousers){
        req.session.ousers = r;
        dbs.collection('online').find({}).toArray(function(err,re){
          console.log("Result sent");
          re.lid = req.session.lid;
          res.send(re);
        });
      }
      else if(req.session.ousers != r)
      {
        dbs.collection('online').find({}).toArray(function(err,re){
          console.log("Result sent");
          req.session.ousers = r;
          re.lid = req.session.lid;
          res.send(re);
        });
      }
      else{
        res.status(500);
        res.end();
      } 
      console.log("Count"+r);
    });
    
  });
});

app.get('/getm',function(req,res){
  var MongoClient = require("mongodb").MongoClient;
    MongoClient.connect("mongodb://localhost:27017/", function(err, db){
      var dbs = db.db('messenger');

      dbs.collection('messages').find({ $or: [ { $and: [ { from: req.session.sender },{ to: req.session.receiver } ] }, { $and: [{ from: req.session.receiver },{to:req.session.sender}] } ] }).toArray(function(er,re){
        res.send(re);
      });
    });
});

// POST
app.post('/login',function(req,res){
  console.log("Printing session");
  console.log(req.session.lid);
  console.log("Done Printing")
  if(req.session.lid){
    res.redirect('/home');
  }
  else{
    var MongoClient = require("mongodb").MongoClient;
    MongoClient.connect("mongodb://localhost:27017/", function(err, db){
      if(err) next(err)
      console.log("Database Connected");
      var dbs = db.db('messenger');
      dbs.collection('auth').findOne({ name : req.body.username, pass: req.body.password },function(err,r){
        if(r){
          req.session.lid = r._id;
          console.log("Session set : "+ req.session.lid);
          var obj = { _id : r._id, name: r.name };
          dbs.collection('online').insertOne(obj,function(){}); 
          res.redirect('/home');
        }
        else
          res.send("Authentication Failed");
      });
    });
  }
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

app.post('/chat',function(req,res,next){
  var receiver = req.body.receiver;
  if(receiver == 'nos')
  {
    res.redirect('/home');
  }
  else{
    console.log("Sender is"+ req.body.sender);
    console.log("Receiver is" + req.body.receiver);
    req.session.sender = req.body.sender;
    req.session.receiver = req.body.receiver;
    res.redirect('/chatwindow');
  }
});

app.post('/message', function(req,res,next){
  console.log("Message Received\nFrom "+req.body.from+"\nTo "+req.body.to+"\nMessage "+req.body.message);
  var mongoClient = require("mongodb").MongoClient;
  mongoClient.connect("mongodb://localhost:27017/", function(err, db){
    if(err) next(err);
    var dbs = db.db('messenger');
    var dateTime = require('node-datetime');
    var date = dateTime.create();
    var format = date.format('d-m-Y H-M-S');
    dbs.collection('auth').findOne({_id:ObjectId(req.body.from)}, function(er,re){
      if(er) next(er);
      var obj = { from : req.body.from,fname: re.name , to : req.body.to, message : req.body.message , time: format};
      console.log("Obj : "+obj);
      dbs.collection('messages').insertOne(obj , function(e,r){
        if(e) next(e);
      });
    });
  });
  res.redirect('/chatwindow');
});

// Functions

// var isauth = function (req,res,next){
//     // if(req.session.lid)
//     // {
//     //   res.redirect('/');
//     // }
//     console.log("Middleware invoked")
//     next()
// }

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
