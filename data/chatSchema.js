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
            type: Schema.Types.Mixed
        }],
        chatStatus: {
            type: Boolean,
            required: true,
            default: true
        },
        crm:{
            isSupport: {
                type: Boolean,
                default: false
            },
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
            },
            isAdmin:{
                type: Boolean,
                default: false,
                adminId: {
                    type: String,
                    ref: 'NoSoloUser'
                }
            }
        }
    }
);

module.exports = connection.model('NoSoloChat', chatSchema);


/* new version
messageBox: {
    type: Schema.Types.ObjectId,
        ref: 'ChatMessageBox'
},*/

