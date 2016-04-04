/**
 * Created by Ignat on 2/22/2016.
 */

 var mongoose = require('../lib/db.js').mongoose;
 var connection = require('../lib/db.js').connection;
 var Schema = mongoose.Schema;

 var messageBox = new Schema({
     userId: {
         type: String,
         ref: 'NoSoloUser',
         required: true
     },
     chatId: {
         type: String,
         ref: 'NoSoloChat',
         required: true
     },
     lastMessageId: {
         type: String,
         ref: 'NoSoloMessage'
     }
 });

 module.exports = connection.model('ChatMessageBox', messageBox);
