'use strict';

const express = require('express');
const line = require('@line/bot-sdk');
const middleware = require('@line/bot-sdk').middleware
const JSONParseError = require('@line/bot-sdk').JSONParseError
const SignatureValidationFailed = require('@line/bot-sdk').SignatureValidationFailed

const axios = require('axios');
const PORT = process.env.PORT || 3000;
var can_flag = "0";
var level = 0;

const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();

app.post('/webhook', line.middleware(config), (req, res) => {
    console.log(req.body.events);
    res.json(req.body.events) // req.body will be webhook event object

    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => res.json(result));
});

app.get('/trashkan/1/status', function (req, res) {
  res.send(can_flag);
})


app.use((err, req, res, next) => {
  if (err instanceof SignatureValidationFailed) {
    res.status(401).send(err.signature)
    return
  } else if (err instanceof JSONParseError) {
    res.status(400).send(err.raw)
    return
  }
  next(err) // will throw default 500
})

const client = new line.Client(config);

function handleEvent(event) {

  if(event.beacon){
    if (event.beacon.type === 'enter'){

      client.pushMessage(event.source.userId, [{
        "text" : '近くに燃えるのゴミ箱があります',
        "type" : 'text'
      }, {
        "type": "template",
        "altText": "ゴミを捨てますか？",
        "template": {
            "type": "confirm",
            "text": "ゴミを捨てますか？",
            "actions": [
                {
                  "type": "message",
                  "label": "はい",
                  "text": "はい"
                },
                {
                  "type": "message",
                  "label": "いいえ",
                  "text": "いいえ"
                }
            ]
          }
        }]
      );
    }
  }

  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }


  if(event.message.text === 'いっぱい' || event.message.text === 'まだ大丈夫' || event.message.text === 'ポイントは？'){
    level ++ ;
    client.pushMessage(event.source.userId, [{
      "text" : 'ありがとうございます！',
      "type" : 'text'
    },{
      "text" : 'あなたは'+level+'pointあります。',
      "type" : 'text'
    }]
  );

    can_flag = "1";
    setTimeout(myFunc, 3000);

  }else if(event.message.text === 'はい'){
    if(level >5){
      level=0;
    }else{
      level ++ ;
    }
    client.pushMessage(event.source.userId, [{
      "type": "location",
      "title": "ここにあります。",
      "address": "東京大学本郷キャンパス工学部２号館",
      "latitude": 35.7144598,
      "longitude": 139.7620094
        }, {
      "type": "template",
      "altText": "ゴミはいっぱいですか？",
      "template": {
          "type": "confirm",
          "text": "ゴミはいっぱいですか？",
          "actions": [
              {
                "type": "message",
                "label": "いっぱい",
                "text": "いっぱい"
              },
              {
                "type": "message",
                "label": "まだ大丈夫",
                "text": "まだ大丈夫"
              }
          ]
        }
      }]
    );

    can_flag = "1";
    setTimeout(myFunc, 3000);

  }else{
    client.replyMessage(event.replyToken, {
      "text": event.message.text ,
      "type" : 'text'
      }
    );
  }

  return 0
}

function myFunc() {
  can_flag = "0";
}

const getNodeVer = async (userId) => {
    const res = await axios.get('http://weather.livedoor.com/forecast/webservice/json/v1?city=400040');
    const item = res.data;

    await client.pushMessage(userId, {
        "type": 'text',
        "text": item.description.text
    });
}

app.listen(PORT);
console.log(`Server running at ${PORT}`);
