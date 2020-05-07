var mongoose = require('mongoose');

// schema
var membershipSchema = mongoose.Schema({ 
  userid:{type:mongoose.Schema.Types.ObjectId, ref:'user', required:true},
  clubid:{type:mongoose.Schema.Types.ObjectId, ref:'club', required:true},
  role:{type:String, enum:['president', 'member'], default:'member'},
});

// model & export
var  Membership = mongoose.model('membership', membershipSchema);
module.exports = Membership;