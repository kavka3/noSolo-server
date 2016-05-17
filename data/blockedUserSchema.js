var mongoose = require('../lib/db.js').mongoose,
    connection = require('../lib/db.js').connection,
    Schema = mongoose.Schema;

var blockedUserSchema = new Schema({
    userId: {
        type: String,
        unique: true,
        required: true
    }
});

module.exports = connection.model('blockedUser', blockedUserSchema);