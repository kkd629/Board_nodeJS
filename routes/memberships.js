var express  = require('express');
var router = express.Router();
var util = require('../util');
var Club = require('../models/Club');
var Post = require('../models/Post');
var Membership = require('../models/Membership');

router.post('/:clubid/:userid', function(req, res){
    req.body.userid = req.params.userid;
    req.body.clubid = req.params.clubid;
    
    Membership.create(req.body, function(err, membership){
        if(err) return res.json(err);
        res.redirect('/clubs');
    })
});

router.delete('/:clubid/:userid', function(req, res){
    Membership.deleteOne({clubid:req.params.clubid, userid:req.params.userid}, function(err){
      if(err) return res.json(err);
      res.redirect('/clubs');
    });
});

module.exports = router;