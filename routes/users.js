var express = require('express');
var router = express.Router();
var multer = require('multer');
var upload = multer({ dest: 'images/' });
var User = require('../models/User');
var File = require('../models/File');

var Membership = require('../models/Membership');
var util = require('../util');

// New
router.get('/new', function(req, res){
  var user = req.flash('user')[0] || {};
  var errors = req.flash('errors')[0] || {};
  res.render('users/new', { user:user, errors:errors });
});

// create
router.post('/', upload.single('image'), async function(req, res){
  var image = req.file?await File.createNewInstance(req.file):undefined;
  req.body.image = image;
  //console.log(image);
 
  User.create(req.body, function(err, user){
    if(err){
      req.flash('user', req.body);
      req.flash('errors', util.parseError(err));
      return res.redirect('/users/new');
    }
    if(image){                
      image.userId = user._id; 
      image.save();            
    }
    res.redirect('/');
  });
});

// show
router.get('/:username', util.isLoggedin, function(req, res){
  User.findOne({username:req.params.username})
    .populate({path:'image',match:{isDeleted:false}})
    .exec(function(err, user){
      if(err) return res.json(err);
      res.render('users/show', {user:user});
    });
});

// edit
router.get('/:username/edit', util.isLoggedin, checkPermission, function(req, res){
  var user = req.flash('user')[0];
  var errors = req.flash('errors')[0] || {};
  if(!user){
    User.findOne({username:req.params.username}, function(err, user){
      if(err) return res.json(err);
      res.render('users/edit', { username:req.params.username, user:user, errors:errors });
    });
  }
  else {
    res.render('users/edit', { username:req.params.username, user:user, errors:errors });
  }
});

// update
router.put('/:username', util.isLoggedin, checkPermission, function(req, res, next){
  User.findOne({username:req.params.username})
    .select('password')
    .exec(function(err, user){
      if(err) return res.json(err);

      // update user object
      user.originalPassword = user.password;
      user.password = req.body.newPassword? req.body.newPassword : user.password;
      for(var p in req.body){
        user[p] = req.body[p];
      }

      // save updated user
      user.save(function(err, user){
        if(err){
          req.flash('user', req.body);
          req.flash('errors', util.parseError(err));
          return res.redirect('/users/'+req.params.username+'/edit');
        }
        res.redirect('/users/'+user.username);
      });
  });
});

router.delete('/:username', util.isLoggedin, checkPermission, function(req, res){
  User.findOne({username:req.params.username}, function(err, user){
    if(err) return res.json(err);
    Membership.deleteMany({userid:user._id},function(err){
      if(err) return res.json(err);
    });
  });
  User.deleteOne({username:req.params.username}, function(err, user){
    if(err) return res.json(err);
    Membership.deleteMany({userid:user._id});
    res.redirect('/');
  });
});

module.exports = router;

// private functions
function checkPermission(req, res, next){
  User.findOne({username:req.params.username}, function(err, user){
    if(err) return res.json(err);
    if(user.id != req.user.id) return util.noPermission(req, res);

    next();
  });
}
