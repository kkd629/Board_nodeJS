// routes/clubs.js
var util = require('../util');

var express  = require('express');
var router = express.Router();
var Club = require('../models/Club');
var Post = require('../models/Post');
var User = require('../models/User');
var Membership = require('../models/Membership')
var util = require('../util');

// Index 
router.get('/', util.isLoggedin, function(req, res){
  Club.find({})                  
  .sort('-clubname')            
  .exec(function(err, clubs){    
    if(err) return res.json(err);
    Membership.find({}, function(err, memberships){;
      res.render('clubs/index', {clubs:clubs, memberships:memberships});
    })
    
  });
});

// New
router.get('/new', util.isLoggedin, function(req, res){
  var club = req.flash('club')[0] || {};
  var errors = req.flash('errors')[0] || {};
  res.render('clubs/new', { club:club, errors:errors });
});

// create
router.post('/', util.isLoggedin, function(req, res){
  Club.create(req.body, function(err, club){
    if(err){
      req.flash('club', req.body);
      req.flash('errors', util.parseError(err));
      return res.redirect('/clubs/new');
    }
    res.redirect('/clubs');
  });
  
  // Club.findOne(req.body, function(err, club){
  //   if(err) return res.json(err);
  //   Membership.create(req.body, function(err, membership){
  //     if(drr) return res.json(err);
  //     res.redirect('/clubs');
  //   })
  // })
  // Membership.create(req.body, function(err){
  //   if(err) return res.json(err);
  //   res.redirect('/clubs');
  // });
});

// show
router.get('/:id', checkPermission, function(req, res){
  Promise.all([
    Club.findOne({_id:req.params.id}),
    Post.find({posts:req.params.id})
  ])
  .then(([club, posts]) => {
    res.render('clubs/show', {club,club, posts:posts})
  })
  .catch((err) =>{
    console.log('err: ', err);
    return res.json(err);
  });
});

// edit
router.get('/:id/edit', util.isLoggedin, checkPermission, function(req, res){
    Club.findOne({_id:req.params.id}, function(err, club){
    if(err) return res.json(err);
    res.render('clubs/edit', {club:club});
  });
});

// update
router.put('/:id', util.isLoggedin, checkPermission, function(req, res){
  req.body.updatedAt = Date.now(); 
  Club.findOneAndUpdate({_id:req.params.id}, req.body, function(err, club){
    if(err) return res.json(err);
    res.redirect("/clubs/"+req.params.id);
  });
});

// destroy
router.delete('/:id', function(req, res){
    Club.deleteOne({_id:req.params.id}, function(err){
    if(err) return res.json(err);
    res.redirect('/clubs');
  });
});

module.exports = router;

function checkPermission(req, res, next){
  Club.findOne({_id:req.params.id}, function(err, club){
    if(err) return res.json(err);
    if(club.admin != req.user.id) return util.clubPermission(req, res);

    next();
  });
}