var createError = require('http-errors');
var express = require('express');
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var ObjectId = require('mongodb').ObjectID;
var MongoClient = require("mongodb").MongoClient;

var dbs;
MongoClient.connect("mongodb://localhost:27017/", function(err, db){
  if(err) {
    console.log("Database Connection error")
    next(err)
  }
  dbs = db.db('messenger');
  console.log("Database Connected")
});

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
  if(req.session.lid){
    res.redirect('/home');
  }
  else{
    res.render('index');
  }
});

app.get('/home', function(req,res){
  if(req.session.lid){
    dbs.collection('online').find({}).toArray(function(err,result){
    var id = req.session.lid;
    dbs.collection('auth').findOne({ _id : ObjectId(id) }, function(err, r){
    if(err) next(err);
        res.render('home', { name: r.name ,id: ObjectId(r._id), ousers: result,cuser:r._id});
      });
    });
  }
  else{
    res.redirect('/');
  }
});

app.get('/logout/:id', function(req,res,next){
    dbs.collection('online').deleteOne({_id:ObjectId(req.params.id)}, function(err,r){
      if(err) next(err);
      req.session.destroy(function(err){
        next(err);
      });
      res.redirect('/');
    });
});

app.get('/chatwindow', function(req,res,next){
  if(!req.session.lid)
  {
    res.redirect("/")
  }
  if( req.session.sender && req.session.receiver )
  {
      dbs.collection('online').findOne({ _id: ObjectId(req.session.receiver) }, function(err,r){
        if(err) next(err);
        dbs.collection('messages').find({ $or: [ { $and: [ { from: req.session.sender },{ to: req.session.receiver } ] }, { $and: [{ from: req.session.receiver },{to:req.session.sender}] } ] }).toArray(function(er,re){
          res.render('chatwindow', { name: r.name ,from: req.session.sender, to: req.session.receiver, messages : re });
        });
      });
  }
  else{
    res.redirect("/home")
  }
});

app.get('/online',function(req,res){
        dbs.collection('online').find({}).toArray(function(err,re){
          re.lid = req.session.lid;
          res.send(re);
        });
});

app.get('/getm',function(req,res){
      dbs.collection('messages').find({ $or: [ { $and: [ { from: req.session.sender },{ to: req.session.receiver } ] }, { $and: [{ from: req.session.receiver },{to:req.session.sender}] } ] }).toArray(function(er,re){
        res.send(re);
      });
});

// app.get('/friends',function(req,res){
//   if(!req.session.lid)
//   {
//     res.redirect("/")
//   }
//   res.render("friends");
// });

// app.get('/showfriends/:name',function(req,res){
//   console.log("Name="+req.params.name);
//   dbs.collection('auth').find({name: { $regex: "^"+req.params.name }}).toArray(function(err,re){
//     re.lid = req.session.lid;
//     res.send(re);
//   });
// });

// app.get('/addfriend/:id',function(req,res,next){
//   var obj = { from : req.session.lid,fname : req.session.lname ,to : req.params.id }
//   dbs.collection("pendingf").insertOne(obj,function(err,r){
//     if(err) next(err)
//     res.send("Added")
//   });
// });

// app.get('/pendingf',function(req,res,next){
//   dbs.collection('pendingf').find({to: req.session.lid}).toArray(function(err,r){
//     console.log("Results")
//     console.log(r)
//     res.render("pendingf", { result: r });
//   })
// });

app.get('/cadd/:id',function(req,res,next){
  var obj = { f1: req.session.lid, f2: req.params.id }
  dbs.collection('friends').insertOne(obj,function(err,r){
    if(err) next(err)
    dbs.collection('pendingf').deleteOne({ from: req.params.id, to: req.session.lid }, function(){})
    res.send("Friend Added")
  })
})
// POST
app.post('/login',function(req,res){
  if(req.session.lid){
    res.redirect('/home');
  }
  else{
      dbs.collection('auth').findOne({ name : req.body.username, pass: req.body.password },function(err,r){
        if(r){
          req.session.lid = r._id;
          req.session.lname = r.name;
          var obj = { _id : r._id, name: r.name };
          dbs.collection('online').insertOne(obj,function(){}); 
          res.redirect('/home');
        }
        else
          res.send("Authentication Failed");
      });
  }
});

app.post('/signup',function(req,res){
    var obj = { name: req.body.username, pass: req.body.password };
    dbs.collection('auth').insertOne(obj,function(err,r){
      if(err) next(err)
      res.send("<h1>Successfully Registered</h1><a href='/'>Sign In</a>");
    });
});

app.post('/chat',function(req,res,next){
  var receiver = req.body.receiver;
  if(receiver == 'nos')
  {
    res.redirect('/home');
  }
  else{
    req.session.sender = req.body.sender;
    req.session.receiver = req.body.receiver;
    res.redirect('/chatwindow');
  }
});

app.post('/message', function(req,res,next){
  console.log("Message Received\nFrom "+req.body.from+"\nTo "+req.body.to+"\nMessage "+req.body.message);
    var dateTime = require('node-datetime');
    var date = dateTime.create();
    var format = date.format('d-m-Y H-M-S');
    dbs.collection('auth').findOne({_id:ObjectId(req.body.from)}, function(er,re){
      if(er) next(er);
      var obj = { from : req.body.from,fname: re.name , to : req.body.to, message : req.body.message , time: format};
      dbs.collection('messages').insertOne(obj , function(e,r){
        if(e) next(e);
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
