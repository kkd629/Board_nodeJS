var express  = require('express');
var router = express.Router();
var multer = require('multer');
var upload = multer({dest: 'uploadedFiles/'});
var Post = require('../models/Post');
var Club = require('../models/Club');
var Membership = require('../models/Membership');
var Comment = require('../models/Comment');
var File = require('../models/File');
var util = require('../util');

// Index
// router.get('/:clubid', checkClubPermission, async function(req, res){
//   var page = Math.max(1, parseInt(req.query.page));
//   var limit = Math.max(1, parseInt(req.query.limit));
//   page = !isNaN(page)?page:1;
//   limit = !isNaN(limit)?limit:10;

//   var searchQuery = createSearchQuery(req.query);

//   var skip = (page-1)*limit;
//   var test = await Post.countDocuments({clubid:req.params.clubid});
//   //var test = await Post.countDocuments({clubid:req.params.clubid});
//   //var count = await Post.countDocuments({});
//   var maxPage = Math.ceil(test/limit);
//   var posts = await Post.find(searchQuery);
  
//   Club.findOne({_id:req.params.clubid}, function(err, club){
//     //if(err) req.json(err);
//     Post.find({clubid:req.params.clubid})
//     .find(searchQuery) // 조건 먼저 찾기
//     .populate('author')
//     .sort('-createdAt')
//     .skip(skip)
//     .limit(limit)
//     .exec(function(err, posts){
//       if(err) return res.json(err);
//       res.render('posts/index', {
//         posts:posts,
//         currentPage:page,
//         maxPage:maxPage, 
//         limit:limit,
//         club:club,
//         views:1,
//         searchType:req.query.searchType,
//         searchText:req.query.searchText
//       });
//     });
//   });
// });

router.get('/:clubid', checkClubPermission, async function(req, res){
  var page = Math.max(1, parseInt(req.query.page));
  var limit = Math.max(1, parseInt(req.query.limit));
  page = !isNaN(page)?page:1;
  limit = !isNaN(limit)?limit:10;

  var searchQuery = createSearchQuery(req.query);

  var skip = (page-1)*limit;
  var test = await Post.countDocuments({clubid:req.params.clubid});
  //var test = await Post.countDocuments({clubid:req.params.clubid});
  //var count = await Post.countDocuments({});
  var maxPage = Math.ceil(test/limit);
  var posts = await Post.find(searchQuery);
  
  Club.findOne({_id:req.params.clubid}, function(err, club){
    //if(err) req.json(err);
    Post.find({clubid:req.params.clubid})
    .find(searchQuery) // 조건 먼저 찾기
    .populate('author')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .exec(function(err, posts){
      if(err) return res.json(err);

      
      Comment.find({}, function(err, comments){
        if(err) return res.json(err);

        File.find({}, function(err, files){
          if(err) return res.json(err);

          res.render('posts/index', {
            posts:posts,
            currentPage:page,
            maxPage:maxPage, 
            limit:limit,
            club:club,
            views:1,
            cnt:1,
            comments:comments,
            files:files,
            searchType:req.query.searchType,
            searchText:req.query.searchText
          });
        })
        // console.log(comments);
        
      })
      
    });
  });
});


// New
router.get('/:clubid/new', util.isLoggedin, function(req, res){
  var post;
  var errors;

  Club.findOne({_id:req.params.clubid}, function(err, club){
    if(err) req.json(err);

    post = req.flash('post')[0] || {};
    errors = req.flash('errors')[0] || {};
    res.render('posts/new', { post:post, errors:errors, club:club });
  });
  
});

// create
router.post('/:clubid', util.isLoggedin, upload.single('attachment'), async function(req, res){
  var attachment = req.file?await File.createNewInstance(req.file, req.user._id):undefined;
  req.body.attachment = attachment;
  req.body.clubid = req.params.clubid;
  req.body.author = req.user._id;
  var club = Club.findOne({_id:req.params.clubid}, function(err, club){
    if(err) req.json(err);

    Post.create(req.body, function(err, post){
      if(err){
        req.flash('post', req.body);
        req.flash('errors', util.parseError(err));
        console.log(err);
        return res.redirect('/posts/'+ club._id +'/new' + res.locals.getPostQueryString());
      }
      if(attachment){
        attachment.postId = post._id;
        attachment.save();
      }
      res.redirect('/posts/' + club._id + res.locals.getPostQueryString(false, {page:1}));
    });
  })
});

// router.get('/:clubid/:id', checkClubPermission, function(req, res){
//   Club.findOne({_id:req.params.clubid}, function(err, club){
//     if(err) req.json(err);

//     Post.findOne({_id:req.params.id})
//     .populate('author')
//     .exec(function(err, post){
//       if(err) return res.json(err);
//       post.views++;
//       post.save();
//       res.render('posts/show', {post:post, club:club});
//     });
//   });
// });

// show
router.get('/:clubid/:id', function(req, res){
  var commentForm = req.flash('commentForm')[0] || {_id: null, form: {}};
  var commentError = req.flash('commentError')[0] || { _id:null, parentComment: null, errors:{}};

  Club.findOne({_id:req.params.clubid}, function(err, club){
    //if(err) req.json(err);
    Promise.all([
      Post.findOne({_id:req.params.id}).populate({ path: 'author', select: 'username' }).populate({path:'attachment',match:{isDeleted:false}}),
      Comment.find({post:req.params.id}).sort('createdAt').populate({ path: 'author', select: 'username' })
    ])
    .then(([post, comments]) => {
      post.views++;
      post.save();
      res.render('posts/show', { post:post, club:club, comments:comments, commentForm:commentForm, commentError:commentError});
    })
    .catch((err) => {
      console.log('err: ', err);
      return res.json(err);
    });
  });
  
});

// edit
router.get('/:clubid/:id/edit', util.isLoggedin, checkPermission, checkClubPermission, function(req, res){
  var post = req.flash('post')[0];
  var errors = req.flash('errors')[0] || {};
  Club.findOne({_id:req.params.clubid}, function(err, club){
    if(err) req.json(err);

    if(!post){
      Post.findOne({_id:req.params.id}, function(err, post){
          if(err) return res.json(err);
          res.render('posts/edit', { post:post, errors:errors, club:club });
        });
    }
    else {
      post._id = req.params.id;
      res.render('posts/edit', { post:post, errors:errors, club:club });
    }
  });
});

// update
router.put('/:clubid/:id', util.isLoggedin, checkPermission, checkClubPermission, function(req, res){
  req.body.updatedAt = Date.now();
  var club = Club.findOne({_id:req.params.clubid}, function(err, club){
    if(err) req.json(err);

    Post.findOneAndUpdate({_id:req.params.id}, req.body, {runValidators:true}, function(err, post){
      if(err){
        req.flash('post', req.body);
        req.flash('errors', util.parseError(err));
        return res.redirect('/posts/'+ club._id + '/' + req.params.id+'/edit' + res.locals.getPostQueryString());
      }
      res.redirect('/posts/'+ club._id + '/' + req.params.id + res.locals.getPostQueryString());
    });
  })
  
});

// destroy
router.delete('/:clubid/:id', util.isLoggedin, checkPermission, function(req, res){
  Club.findOne({_id:req.params.clubid}, function(err, club){
    if(err) require.json(err);

    Post.deleteOne({_id:req.params.id}, function(err){
      if(err) return res.json(err);
      res.redirect('/posts/' + club._id + res.locals.getPostQueryString());
    });
  });
});

module.exports = router;

// private functions
function checkPermission(req, res, next){
  Post.findOne({_id:req.params.id}, function(err, post){
    if(err) return res.json(err);
    if(post.author != req.user.id) return util.noPermission(req, res);

    next();
  });
}

function createSearchQuery(queries){ 
  var searchQuery = {};
  if(queries.searchType && queries.searchText && queries.searchText.length >= 3){
    var searchTypes = queries.searchType.toLowerCase().split(',');
    var postQueries = [];
    if(searchTypes.indexOf('title')>=0){
      postQueries.push({ title: { $regex: new RegExp(queries.searchText, 'i') } });
    }
    if(searchTypes.indexOf('body')>=0){
      postQueries.push({ body: { $regex: new RegExp(queries.searchText, 'i') } });
    }
    if(postQueries.length > 0) searchQuery = {$or:postQueries};
  }
  return searchQuery;
}

function checkClubPermission(req, res, next){
  Membership.findOne({clubname:req.params.clubid, username:req.params.id}, function(err, membership){
    if(err) return res.json(err);
    //console.log(membership);
    //console.log(req.user.id);
    //if(club.admin != req.user.id) return util.clubPermission(req, res);

    next();
  });
}