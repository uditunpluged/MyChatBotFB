var express = require('express');
var app = express();
var bodyParser=require('body-parser');
var PAGE_ACCESS_TOKEN='EAAQ0rqoF1uABAIs4pYBVkZCySs4AHvF1SLtykll6B5NKdmx93mJmBWgO4qngbrFvxTLtFfwXyE5uHQtLUCTeJw8fQQAy36YFPua7YvgVECZBlvCVBDiDMViPeu6rLC3Jkp0ZBQ91ZARxAmSJHtPZBIr0ZBSYszGqNtvkfYTwQgZAAZDZD';
var VALIDATION_TOKEN='phantasmist';
var request=require('request');
var firebase = require("firebase");
var sleep = require('sleep');
var config = {
    apiKey: "AIzaSyDyoFVDbLmbvnp1t-QXfO4MzgefGgEaysE",
    authDomain: "chatbot-d601d.firebaseapp.com",
    databaseURL: "https://chatbot-d601d.firebaseio.com",
    storageBucket: "chatbot-d601d.appspot.com",
  };
  firebase.initializeApp(config);
  var rootRef = firebase.database().ref();

// Attach an asynchronous callback to read the data at our posts reference
function searchResponse(senderID,messageFromUser){
  rootRef.child('questions').on("value", function(snapshot) {
    var arrayFound = snapshot.val().filter(function(item) {
      if(item.userMessage == messageFromUser){
        sendTypingOn(senderID);
        console.log(item.answer);
        sendTextMessage(senderID,item.answer);
        sendTypingOff(senderID);
        return item.answer;
      }else{
        sendTypingOff(senderID);
        return 'not found';
      }
    });
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });
}

function searchForPayload(senderID,message){
  console.log("Searching for payload "+message);
  rootRef.child('quick_replies').on("value", function(snapshot) {
    var arrayFound = snapshot.val().filter(function(item) {
      if(item.title == message){
        sleep.sleep(5);
        console.log("Sending Payload "+item.payload);
        fetchList(senderID,item.payload);
        sleep.sleep(10);
        sendPriceRangeButtons(senderID);
        return item.payload;
      }else{
        return 'not found';
      }
    });
    console.log(arrayFound);

  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });
}

// Test
app.get('/ping',function(req, res){
  fetchList("tezt");
  sendGenericMessage("test")
});
app.use(bodyParser.json());
//TO VERIFY
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
setGreetingText();
setPersistentMenu();

function getUserNameForPersonalization(uid){
  var url="https://graph.facebook.com/v2.6/"+uid+"?access_token="+PAGE_ACCESS_TOKEN;
  var firstName='s';
  request({
    uri:url,
    method:'GET'
  },function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var obj = JSON.parse(body);
      firstName=obj.first_name;
      sendTextMessage(uid, "Hi "+firstName+" ! I am Soni, your personal advisor. \nI am here to help you find joy.");
      console.log("userName "+obj.first_name);

      sendYesNoQuickReplyButtons(uid);
    }else {
      console.error("Get User Details Error : "+response);
    }
  });

}
// all the stuff to be coded below
/** Should do stuff that we want the app to do
*/
//SET GREETING TEXT message

function setGreetingText(){
  console.log("Setting Greeeting text");

  var jsonObject = {
    setting_type: 'greeting',
    thread_state:'existing_thread',
    greeting: {
      text: "Welocome to CRI Kasauli. You can ask us queries. We are in developement phase."
    }
  };
  setThread(jsonObject);
}

// SET PERSISTENT MENU
function setPersistentMenu(){
  console.log("Setting Persistent Menu");

  var jsonObject={
  "setting_type" : "call_to_actions",
  "thread_state" : "existing_thread",
  "call_to_actions":[
    {
      "type":"postback",
      "title":"Help",
      "payload":"1"
    },
    {
      "type":"postback",
      "title":"Buy a property",
      "payload":"2"
    },
    {
      "type":"postback",
      "title":"Filters",
      "payload":"3"
    }
  ]
};
  setThread(jsonObject);
}

function setThread(jsonObject){
    request({
      uri: 'https://graph.facebook.com/v2.6/me/thread_settings?access_token='+PAGE_ACCESS_TOKEN,
      method: 'POST',
      json: jsonObject

    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var variabel = body;
        // var messageId = body.message_id;
          console.log(""+variabel);
        // if (messageId) {
        //   console.log("Successfully sent message with id %s to recipient %s",
        //     messageId, recipientId);
        // } else {
        // console.log("Successfully called Send API for recipient %s",
        //   recipientId);
        // }
      } else {
        console.error("Error : "+response);
      }
    });
  }

// Receive text message
app.post('/webhook', function (req, res) {
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
        }else if (messagingEvent.read) {
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

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (message.hasOwnProperty('quick_reply')) {
      if(message.quick_reply.payload!='Yes-Property') {
          searchForPayload(senderID,messageText);
      };
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

          fetchList(senderID);
        break;

      case 'receipt':
        sendReceiptMessage(senderID);
        break;
      case 'read receipt':
        sendReadReceipt(senderID);
        break;

      case 'typing on':
        sendTypingOn(senderID);
        break;

      case 'typing off':
        sendTypingOff(senderID);
        break;
      case 'Yes':
          if(message.quick_reply.payload=='Yes-Property') {
              sendCitySelectionButtons(senderID);
          }
      default:
        searchResponse(senderID, messageText);
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}


function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s",
        recipientId);
      }
    } else {
      console.error("Error : "+response.message);
    }
  });
}
// SEND MESSAGES OF DIFFERENt TYPES
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: ""+recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function sendYesNoQuickReplyButtons(recipientId){
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text:"Are you looking to buy a house",
      quick_replies:[{
        content_type:"text",
        title:"Yes",
        payload:"Yes-Property"
      },
      {
        content_type:"text",
        title:"No",
        payload:"No-Property"
      }]
    }
  };
  // console.log(messageData);
  callSendAPI(messageData);
}

function sendCitySelectionButtons(recipientId){
  console.log('Sending city buutons to '+recipientId);
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text:"Please choose a city",
      quick_replies:[{
        content_type:"text",
        title:"Gurgaon",
        payload:"1"
      },
      {
        content_type:"text",
        title:"Kolkata",
        payload:"17"
      },
      {
        content_type:"text",
        title:"Mumbai",
        payload:"13"
      },
      {
        content_type:"text",
        title:"Banglore",
        payload:"10"
      },
      {
        content_type:"text",
        title:"Noida",
        payload:"4"
      }]
    }
  };
  // console.log(messageData);
  callSendAPI(messageData);
}

function sendPriceRangeButtons(recipientId){
  console.log('Sending price range buttons to '+recipientId);
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text:"what's the price range you are looking for?",
      quick_replies:[{
        content_type:"text",
        title:"0l - 30L",
        payload:"0l - 30L"
      },
      {
        content_type:"text",
        title:"30l - 70L",
        payload:"30l - 70L"
      },
      {
        content_type:"text",
        title:"70l - 1.5 Cr",
        payload:"70l - 1.5 Cr"
      },
      {
        content_type:"text",
        title:"1.5 Cr - 5 Cr",
        payload:"1.5 Cr - 5 Cr"
      },
      {
        content_type:"text",
        title:"5Cr +",
        payload:"5Cr +"
      }]
    }
  };
  // console.log(messageData);
  callSendAPI(messageData);
}

function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text:"pick a filter",
      quick_replies:[{
        content_type:"text",
        title:"0l-40L",
        payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
      },
      {
        content_type:"text",
        title:"40l-80L",
        payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_GREEN"
      },
      {
        content_type:"text",
        title:"80l-1.2Cr",
        payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_GREEN"
      },
      {
        content_type:"text",
        title:"1.2Cr-2cr",
        payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_GREEN"
      },
      {
        content_type:"text",
        title:"1.2Cr-2cr",
        payload:"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_GREEN"
      }]
    }
  };
  // console.log(messageData);
  callSendAPI(messageData);
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

  if (payload=='1') {
      sendGenericMessage(senderID);
  }else if (payload=='2') {
    sendTextMessage(senderID,"finding");
  }else if (payload=='3') {
    sendTextMessage(senderID,"filtering");
  }
  else{
    getUserNameForPersonalization(senderID);
  }
  console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientID, payload, timeOfPostback);

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
}
/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId) {
  console.log("Sending a read receipt to mark message as seen");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "mark_seen"
  };

  callSendAPI(messageData);
}


/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
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

// my logic
function searchData(text){
  request('http://www.squareyards.com/sqycore/query?q=1&wt=json&rows=5&fq='+text+'&sort=category+asc', function (error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log(body) // Show the HTML for the Google homepage.
  }
});
}

function fetchList(senderID,cityId,filterData){
  request( {
      uri: 'http://api.squareyards.com/SquareYards/site/mobile/projectlist',
      method: 'POST',
      json: {
        "cityId": ""+cityId,
        "pageno":"1",
        "mobFilterData":filterData
      }
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log(body) // Show the HTML for the Google homepage.
          parseJson(body,senderID);
        }
      });
  }

function parseJson(body,recipientId){
  // console.log(body.projectList);
  var results=[];
  for(var i=0;i < body.projectList.length; i++){
    results.push({
      title: body.projectList[i].projectName,
      subtitle: body.projectList[i].lowCost + " - "+body.projectList[i].highCost,
      item_url: body.projectList[i].projectImage,
      image_url: body.projectList[i].projectImage,
      buttons: [{
        type: "web_url",
        url: body.projectList[i].projectImage,
        title: "Open Web URL"
      }],
    });

  }

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: results
        }
      }
    }
  };
  console.log(messageData);
  callSendAPI(messageData);

}

app.listen(process.env.PORT || 4000);
