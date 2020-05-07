var mongoose = require('mongoose');

// schema
var clubSchema = mongoose.Schema({ 
  clubname:{type:String, required:true, unique:true},
  admin:{type:String, required:true},
  intro:{type:String, required:true, validate:[
    function(intro){
      return intro&&intro.length>5;
    },'intro should be longer than 5'
  ]},
  member:[{
    type:mongoose.Schema.Types.ObjectId, ref:'membership', required:true
  }],
  createdAt:{type:Date, default:Date.now},
});

// model & export
var Club = mongoose.model('club', clubSchema);
module.exports = Club;