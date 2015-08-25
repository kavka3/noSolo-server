var mongoose = require('../lib/db.js').mongoose;
var connection = require('../lib/db.js').connection;
var Schema = mongoose.Schema;

var tagSchema = new Schema({
    _title: {
        type: String,
        //unique: true,
        required: true
    },
    _id: {
        type: String
    },
    activities: [{
        type: Schema.Types.ObjectId,
        ref: 'NoSoloActivity'
    }],
    tagDictionary: [Schema.Types.Mixed],
    tagCategory: [{
        type: String,
        ref: 'NoSoloTag'
    }],
    imageUrl:{
        type: String,
        required: true,
        default: 'https://s3.amazonaws.com/nosoloimages/tdefault.png'
    },
    tagStatus:{//NOSOLOTAG: 0, PENDING: 1, APPROVED: 2, DENIED: 3, USERTAG: 4
        type: Number,
        required: true,
        default: 0
    }
});

module.exports = connection.model('NoSoloTag', tagSchema);

tagSchema.pre('save', function(next){
    this._id = this._title;
    next();
});