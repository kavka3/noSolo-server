var mongoose = require('../lib/db.js').mongoose;
var connection = require('../lib/db.js').connection;
var Schema = mongoose.Schema;

var chatSchema = new Schema({
        usersInChat: [{//userId uses now only for support chats
            type: String,
            ref: 'NoSoloUser'
        }],
        messages: [{//messageId
            type: String,
            ref: 'NoSoloMessage'
        }],
        messageBox: [{//userId & last messageId
            userId: {
                type: String,
                unique: true
            },
            messageId: String
        }],
        chatStatus: {
            type: Boolean,
            required: true,
            default: true
        },
        crm:{
            isSeen: {
                type: Boolean,
                default: false
            },
            isTask: {
                type: Boolean,
                default: false
            },
            isDone: {
                type: Boolean,
                default: false
            }
        }
    }
);

module.exports = connection.model('NoSoloChat', chatSchema);

