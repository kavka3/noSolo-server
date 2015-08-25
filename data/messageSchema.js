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
        type: Date,
        default: Date.now,
        required: true
    },
    messageText: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        default: 'text', // or 'picture' or something else...
        required: true
    },
    imageLink: {
        type: String
    },
    userName:{
        type:String
    },
    notForCreator:{
        type: Schema.Types.Mixed // {notForCreator: true, activityCreator: activity._id, notForOthers: true }
    }
});

//messageSchema.plugin(autoIncrement.plugin, 'NoSoloMessage');
module.exports = connection.model('NoSoloMessage', messageSchema);