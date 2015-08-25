/**
 * Created by ignat on 3/11/2015.
 */


var AWS = require('aws-sdk'),
    config = require('../config/config'),
    awsKey = process.env.AWS_ACCESS_KEY || config,
    secret = process.env.AWS_SECRET_KEY;

//don't hard code your credential :)
AWS.config.update({accessKeyId: awsKey, secretAccessKey: secret,
    region: 'us-west-2'});
var sns = new AWS.SNS();
var endPoint = null;

function sentMessageToOne() {
    console.log("in send");
    console.log(endPoint);
    var params = {
        Message: 'test from node',//  required
        MessageAttributes:{
            coldstart: {
                DataType: 'String',
                StringValue: 'true'
            },
            msgcnt:{
                DataType: 'String',
                StringValue: '3'
            }
        },
        MessageStructure: 'String',
        Subject: 'AWS and node',
        TargetArn: 'arn:aws:sns:us-west-2:483527748797:endpoint/GCM/NoSolo/72e39431-528f-39d5-9135-9c09291e0191'//endPoint.EndpointArn
    };
    sns.publish(params, function (err, data) {
        if (err) {
            console.log('in sent err');
            console.log(err, err.stack);

        } // an error occurred
        else {
            console.log(data);
        }
        // successful response
    });
};

function createAndroidEndPoint() {//APA91bHPBdP0nVQpu-SBTjB2KY__S32zIPML6ryCRZIpmCGWFfVB-qVvgJQjZ66J4I7f-YQtc1qlBU5L-R9iLL2XqVS5FTlYl3jD9aniTEGz9oSRQJrk3GqE5arUsqzLtjFMQ_AkcrAeV1XfzMolSc32hJvKkmwHrg
    var endPointParams = {
        PlatformApplicationArn: 'arn:aws:sns:us-west-2:483527748797:app/GCM/NoSolo',
        Token: 'APA91bHPBdP0nVQpu-SBTjB2KY__S32zIPML6ryCRZIpmCGWFfVB-qVvgJQjZ66J4I7f-YQtc1qlBU5L-R9iLL2XqVS5FTlYl3jD9aniTEGz9oSRQJrk3GqE5arUsqzLtjFMQ_AkcrAeV1XfzMolSc32hJvKkmwHrg',
        CustomUserData: 'Hey noSolo waiting for you!'
    };
    sns.createPlatformEndpoint(endPointParams, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else{
            endPoint = data;
            console.log(endPoint.EndpointArn);
            sentMessageToOne();
        }             // successful response
    });
};

createAndroidEndPoint();
//sentMessageToOne();