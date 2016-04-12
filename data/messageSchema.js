var mongoose = require('../lib/db.js').mongoose,
    connection = require('../lib/db.js').connection,
    Schema = mongoose.Schema;

var messageSchema =  new Schema({
    _id: {
        type: String,
        unique: true,
        required: true
    },
    creator: {
        type: String,
        ref: 'NoSoloUser',
        required: true
    },
    chatId: {
        type: Schema.Types.ObjectId,
        ref: 'NoSoloChat',
        required: true
    },
    messageTime: {
        type: Number,
        required: true
    },
    messageText: {
        type: String
    },
    messageType: {
        type: String,
        default: 'text', // or 'picture' or something else...
        required: true
    },
    imageUrl: {
        type: String
    },
    userName:{
        type:String
    },
    tbNlImageUrl:{
        type:String
    },
    notForCreator:{
        type: Schema.Types.Mixed // {notForCreator: true, activityCreator: activity._id, notForOthers: true }
    },
    usersViewed:[{
        type: String,
        ref: 'NoSoloUser'
    }]
});

//messageSchema.plugin(autoIncrement.plugin, 'NoSoloMessage');
module.exports = connection.model('NoSoloMessage', messageSchema);