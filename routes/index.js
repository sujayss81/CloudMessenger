var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  if(req.session.lid){
    var MongoClient = require("mongodb").MongoClient;
    MongoClient.connect("mongodb://localhost:27017/", function(err, db){
      var dbs = db.db('mydb');
      dbs.collection('online').find({}).toArray(function(err,result){
        dbs.collection('auth').find({_id: req.session._id}, function(err, r){
          console.log(r);
          res.render('home', { name: r._id, ousers: result });
        });
    });
    });
  }
  else{
    res.render('index');
  }
});


module.exports = router;
