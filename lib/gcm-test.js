/**
 * Created by Ignat on 6/24/2015.
 */
var GCM = require('gcm').GCM;

var apiKey = 'AIzaSyBmzybfNhBxhz2xTwVvK7oSxQudY3aRvCo';
var gcm = new GCM(apiKey);

var message = {
    registration_id: 'APA91bHnVyXwU8s15Pn30lAiQgMfgQr7XDzVyggUUDkkhKi8AAR9lRi0bteT0TpgvU-lAYclDgX4jTPkFZftOFir5Q8oov42JbfrCOQBYGpIYPqvqB5Ka5aFDz0r9dmLdZZqDt7_ydPjsthxlkzaLGnLg8cHaTN9Lg', // required APA91bH6Zqoom1I4YMyuKVn05d5rSQ94o4uz-g8jYiQsbzvnz0ewVCDc8wUh7Wmxu6u0izAEONoXWVMnQ9fl5ADWhu8Q-suJ1VgmleKZ0QU6SIPyeDuIMRK8mDWS0WG00UyyEmxq_6FpRX12kyd3Z7LjsXnw7Oz5vQ
    collapse_key: 'Collapse key',
    'data.key1': 'test message4',
    'data.key2': 'noSolo push it! oh mine...'
};

gcm.send(message, function(err, messageId){
    if (err){
        console.log("Something has gone wrong!", err);
    }
    else{
        console.log("Sent with message ID: ", messageId);
    }
});