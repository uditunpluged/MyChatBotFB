var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var PAGE_ACCESS_TOKEN = 'EAAQ0rqoF1uABAIs4pYBVkZCySs4AHvF1SLtykll6B5NKdmx93mJmBWgO4qngbrFvxTLtFfwXyE5uHQtLUCTeJw8fQQAy36YFPua7YvgVECZBlvCVBDiDMViPeu6rLC3Jkp0ZBQ91ZARxAmSJHtPZBIr0ZBSYszGqNtvkfYTwQgZAAZDZD';
var VALIDATION_TOKEN = 'phantasmist';
var request = require('request');
var firebase = require("firebase");
var HashMap = require('hashmap');
var http = require('http');
var async = require('async');
var schedule = require('node-schedule');

var config = {
    apiKey: "AIzaSyDyoFVDbLmbvnp1t-QXfO4MzgefGgEaysE",
    authDomain: "chatbot-d601d.firebaseapp.com",
    databaseURL: "https://chatbot-d601d.firebaseio.com",
    storageBucket: "chatbot-d601d.appspot.com",
};
firebase.initializeApp(config);
var rootRef = firebase.database().ref();
console.log("Started new app");




//Store User response
var usersMap = new HashMap();
var quickRepliesArray = [];
var quickAnswersArray = [];
// Test
app.get('/ping', function(req, res) {
    fetchList("tezt");
    sendGenericMessage("test")
});
app.use(bodyParser.json());

//TO LET FACEBOOK VERIFY OUR HOOK
app.get('/webhook', function(req, res) {
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === VALIDATION_TOKEN) {
        console.log("Validating webhook");
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
    }
});






// SET GREETING AS WELL AS PERSISTENT MENU
setGreetingText();
setPersistentMenu();
quickReplies();
quickAnswersArrayFetch();
// searchResponse("uk", "looking for property in Gurgaon");
// searchResponse("uk", "apartment");


function quickAnswersArrayFetch() {
    rootRef.child('questions').on("value", function(snapshot) {
            quickAnswersArray = snapshot.val();
        },
        function(errorObject) {
            console.log("The read failed: " + errorObject.code);
        });
}

function quickReplies() {
    rootRef.child('quick_replies').on("value", function(snapshot) {
        quickRepliesArray = snapshot.val();
        console.log("QUICKREPLIES ====>" + quickRepliesArray);

    }, function(errorObject) {
        console.log("The read failed: " + errorObject.code);
    });
}

function getUserNameForPersonalization(uid) {
    var url = "https://graph.facebook.com/v2.6/" + uid + "?access_token=" + PAGE_ACCESS_TOKEN;
    var firstName;
    console.log("Personalising");
    request({
        uri: url,
        method: 'GET'
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var obj = JSON.parse(body);
            firstName = obj.first_name;
            usersMap.set(uid, "");
            console.log("userName " + obj.first_name);
            sendTextMessage(uid, "Hi " + firstName + " ! I am Nucleya, your personal advisor. \nI am here to help you find joy.", function(data) {
                sendTypingOn(uid, function(data) {
                    var j = schedule.scheduleJob('*/10 * * * * *', function() {
                        sendCitySelectionButtons(uid, function(data) {

                        });
                        j.cancel();
                    });
                });
            });

        } else {
            console.error("Get User Details Error : " + response);
        }
    });

}

function searchForPayload(senderID, message, messagePayload) {
    console.log("Searching for payload " + message);

    var arrayFound = quickRepliesArray.filter(function(item) {
        if (item.title == message) {

            if (item.payload.hasOwnProperty('projectMaxPrice') && item.payload.hasOwnProperty('projectMinPrice')) {
                var newMap = new HashMap();
                newMap.set('projectMaxPrice', item.payload.projectMaxPrice);
                newMap.set('projectMinPrice', item.payload.projectMinPrice);
                newMap.set('cityId', "" + messagePayload);
                usersMap.set(senderID, newMap);
                console.log("Sending Payload " + JSON.stringify(usersMap));
                if (usersMap.has(senderID)) {
                    console.log("Fetching user DDetails:" + JSON.stringify(usersMap));
                    console.log("max Price : " + JSON.stringify(usersMap.get(senderID).get("projectMaxPrice")));
                    console.log("min Price : " + JSON.stringify(usersMap.get(senderID).get("projectMinPrice")));
                    console.log("cityId : " + usersMap.get(senderID).get("cityId"));

                    // fetchList(senderID, usersMap.get(senderID).get("cityId"), usersMap.get(senderID).get("projectMaxPrice"), usersMap.get(senderID).get("projectMinPrice"), function(data) {
                    //     quickRepliesArray.filter(function(item) {
                    //         if (item.payload == usersMap.get(senderID).get("cityId")) {
                    //             sendTextMessage(senderID, "Let me know a bit more about what you are looking in " + item.title, function(data) {
                    //
                    //                 sendBHKButtons(senderID, function(data) {
                    //                     // return callback(data);
                    //                 });
                    //             });
                    //         }
                    //     });
                    //
                    // });
                }

            } else if (!item.payload.hasOwnProperty('projectMaxPrice') && !item.payload.hasOwnProperty('projectMinPrice') && item.payload !== "other" && !item.payload.hasOwnProperty('bhkCount') && !item.payload.hasOwnProperty('val')) {
                console.log("CITY ID", item.payload);
                var firstMap = new HashMap();
                firstMap.set('cityId', "" + item.payload);
                usersMap.set(senderID, firstMap);
                sendTypingOn(senderID, function(data) {

                    var j = schedule.scheduleJob('*/6 * * * * *', function() {
                        sendTextMessage(senderID, "Let me know what can I help you with, you can type in the project name/location and other real estate related queries anytime during the chat...", function(data) {

                        });
                        j.cancel();
                    });


                });

            } else if (item.payload.hasOwnProperty('bhkCount')) {
                // console.log("BHK count " + JSON.stringify(usersMap));
                // var bhkCountMap = new HashMap();
                // bhkCountMap.set('projectMaxPrice', usersMap.get(senderID).get("projectMaxPrice"));
                // bhkCountMap.set('projectMinPrice', usersMap.get(senderID).get("projectMinPrice"));
                // bhkCountMap.set('cityId', "" + usersMap.get(senderID).get("cityId"));
                // bhkCountMap.set('bhkCount', "" + item.payload.bhkCount);
                // usersMap.set(senderID, bhkCountMap);
                // //
                // console.log('==============================================');
                // console.log("BHK COUnT : " + bhkCountMap.get("cityId"));
                // console.log('==============================================');
                // sendStatusButtons(senderID, function(data) {
                //
                // });
            } else if (item.payload.hasOwnProperty('val')) {
                // var statusMap = new HashMap();
                // statusMap.set('projectMaxPrice', usersMap.get(senderID).get("projectMaxPrice"));
                // statusMap.set('projectMinPrice', usersMap.get(senderID).get("projectMinPrice"));
                // statusMap.set('cityId', "" + usersMap.get(senderID).get("cityId"));
                // statusMap.set('bhkCount', "" + usersMap.get(senderID).get("bhkCount"));
                // statusMap.set('status', "" + item.payload.val);
                // usersMap.set(senderID, statusMap);
                // //
                // console.log('==============================================');
                // console.log("BHK count " + JSON.stringify(usersMap));
                // console.log("City Id : " + usersMap.get(senderID).get("bhkCount") + " Status " + usersMap.get(senderID).get("status"));
                // console.log('==============================================');

            }
        }
    });
}

//SET GREETING TEXT message
function setGreetingText() {
    console.log("Setting Greeeting text");

    var jsonObject = {
        setting_type: 'greeting',
        thread_state: 'existing_thread',
        greeting: {
            text: "Welocome to CRI Kasauli. You can ask us queries. We are in developement phase."
        }
    };
    setThread(jsonObject);
}

// SET PERSISTENT MENU
function setPersistentMenu() {
    console.log("Setting Persistent Menu");

    var jsonObject = {
        "setting_type": "call_to_actions",
        "thread_state": "existing_thread",
        "call_to_actions": [{
            "type": "postback",
            "title": "Help",
            "payload": "1"
        }, {
            "type": "postback",
            "title": "Buy a property",
            "payload": "2"
        }, {
            "type": "postback",
            "title": "Filters",
            "payload": "3"
        }]
    };
    setThread(jsonObject);
}
// SET THREAD
function setThread(jsonObject) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/thread_settings?access_token=' + PAGE_ACCESS_TOKEN,
        method: 'POST',
        json: jsonObject

    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var variabel = body;
            // var messageId = body.message_id;
            console.log("" + variabel);
            // if (messageId) {
            //   console.log("Successfully sent message with id %s to recipient %s",
            //     messageId, recipientId);
            // } else {
            // console.log("Successfully called Send API for recipient %s",
            //   recipientId);
            // }
        } else {
            console.error("Set Thread Error : " + response.statusCode);
        }
    });
}

// Receive text message
app.post('/webhook', function(req, res) {
    var data = req.body;

    // Make sure this is a page subscription
    if (data.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function(pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            pageEntry.messaging.forEach(function(messagingEvent) {
                if (messagingEvent.optin) {
                    receivedAuthentication(messagingEvent);
                } else if (messagingEvent.message) {
                    receivedMessage(messagingEvent);
                } else if (messagingEvent.delivery) {
                    // receivedDeliveryConfirmation(messagingEvent);
                } else if (messagingEvent.postback) {
                    receivedPostback(messagingEvent);
                } else if (messagingEvent.read) {
                    receivedMessageRead(messagingEvent);
                } else {
                    console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                }
            });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know you've
        // successfully received the callback. Otherwise, the request will time out.
        res.sendStatus(200);
    }
});


function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    // console.log("Received message for user %d and page %d at %d with message:",
    //     senderID, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));


    var messageId = message.mid;

    // You may get a text or attachment but not both
    var messageText = message.text;
    var messageAttachments = message.attachments

    var userResponses = [];

    if (message.hasOwnProperty('quick_reply')) {
        if (message.quick_reply.payload != 'Yes-Property' && message.quick_reply.payload != 'No-Property') {
            userResponses.push(messageText);
            console.log("USER RESPONSES :" + userResponses);
            searchForPayload(senderID, messageText, message.quick_reply.payload);
        }
        if (message.quick_reply.payload == 'Yes-Property') {
            // userResponses.push(messageText);
            // console.log("USER RESPONSES :"+userResponses);
            // searchForPayload(senderID,messageText);
            // sendCitySelectionButtons(senderID);

        }
        if (message.quick_reply.payload === 'No-Property') {
            sendTextMessage(senderID, "Please let us know what are you what are you looking for.", function(data) {

                setTimeout(function() {
                    sendTextMessage(senderID, "I can help you with real-estate related queries if you're looking for buying or selling a property.", function(data) {
                        // sendCallMeButton(senderID, function(data) {
                        // setTimeout(function() {
                        //     sendTextMessage(senderID, "meanwhile you can try our need based recommendation tool.", function(data) {
                        //         // sendNBRTool(senderID, function(data) {});
                        //     });
                        // }, 2000);

                        // });
                    });

                }, 2000);
            })
        }
    }


    if (messageText) {

        // If we receive a text message, check to see if it matches any special
        // keywords and send back the corresponding example. Otherwise, just echo
        // the text we received.

        switch (messageText) {
            case 'image':
                sendImageMessage(senderID);
                break;

            case 'button':
                sendButtonMessage(senderID);
                break;

            case 'generic':
                // sendGenericMessage(senderID);

                break;

            case 'receipt':
                // sendReceiptMessage(senderID);
                break;
            case 'read receipt':
                // sendReadReceipt(senderID);
                break;

            case 'typing on':
                // sendTypingOn(senderID);
                break;

            case 'typing off':
                // sendTypingOff(senderID);
                break;
                // case 'Yes':
                //     if(message.quick_reply.payload =='Yes-Property') {
                //         sendCitySelectionButtons(senderID);
                //     }
                //     break;
            default:
                // searchForAnswers(senderID, messageText);
                break;
        }
    } else if (messageAttachments) {
        sendTextMessage(senderID, "Message with attachment received");
    }
}

// SEND MESSAGE
function callSendAPI(messageData, callback) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: PAGE_ACCESS_TOKEN
        },
        method: 'POST',
        json: messageData

    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s",
                    messageId, recipientId);
            } else {
                console.log("Successfully called Send API for recipient %s with message %s",
                    recipientId, JSON.stringify(messageData));
            }
            return callback(messageId);
        } else {
            console.error("Error : " + response.statusCode);
        }
    });
}


// SEND MESSAGES OF DIFFERENt TYPES
function sendTextMessage(recipientId, messageText, callback) {
    var messageData = {
        recipient: {
            id: "" + recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData, function(data) {
        return callback(data);
    });
}

function sendCitySelectionButtons(recipientId, callback) {
    console.log('Sending city buutons to ' + recipientId);
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "which city are you looking to invest in ..",
            quick_replies: [{
                content_type: "text",
                title: "Gurgaon",
                payload: "1"
            }, {
                content_type: "text",
                title: "Kolkata",
                payload: "17"
            }, {
                content_type: "text",
                title: "Mumbai",
                payload: "13"
            }, {
                content_type: "text",
                title: "Banglore",
                payload: "10"
            }, {
                content_type: "text",
                title: "Noida",
                payload: "4"
            }, {
                content_type: "text",
                payload: "12",
                title: "Pune"
            }, {
                content_type: "text",
                payload: "14",
                title: "Chennai"
            }, {
                content_type: "text",
                payload: "16",
                title: "Ahmedabad"
            }, {
                content_type: "text",
                payload: "2",
                title: "Delhi"
            }, {
                content_type: "text",
                payload: "other",
                title: "other"
            }]
        }
    };
    // console.log(messageData);
    callSendAPI(messageData, function(data) {
        // return callback(data);
    });
}


// What happens when user clicks on get started button
function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;
    //
    // // The 'payload' param is a developer-defined field which is set in a postback
    // // button for Structured Messages.
    var payload = event.postback.payload;

    if (payload == '1') {
        sendGenericMessage(senderID);
    } else if (payload == '2') {
        sendTextMessage(senderID, "finding");
    } else if (payload == '3') {
        sendTextMessage(senderID, "filtering");
    } else {
        getUserNameForPersonalization(senderID);
    }
    // console.log("Received postback for user %d and page %d with payload '%s' " +
    //     "at %d", senderID, recipientID, payload, timeOfPostback);

    // When a postback is called, we'll send a message back to the sender to
    // let them know it was successful
    // sendTextMessage(senderID, "Hi "+name+" ! How are you");
}


/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 *
 */
function receivedMessageRead(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    // All messages before watermark (a timestamp) or sequence have been seen.
    var watermark = event.read.watermark;
    var sequenceNumber = event.read.seq;

    console.log("Received message read event for watermark %d and sequence " +
        "number %d", watermark, sequenceNumber);

    // var j = schedule.scheduleJob('*/20 * * * * *', function() {
    //     sendTextMessage(senderID, 'The answer to life, the universe, and everything!', function(data) {
    //         j.cancel();
    //     });


    // });
}
/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId, callback) {
    console.log("Sending a read receipt to mark message as seen");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "mark_seen"
    };

    callSendAPI(messageData, function(data) {
        return callback(data);
    });
}


/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId, callback) {
    console.log("Turning typing indicator on");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_on"
    };

    callSendAPI(messageData, function(data) {
        return callback(data);
    });
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
    console.log("Turning typing indicator off");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_off"
    };

    callSendAPI(messageData);
}





app.listen(process.env.PORT || 4000);
