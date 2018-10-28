'use strict';

const express = require('express');
const line = require('@line/bot-sdk');
const middleware = require('@line/bot-sdk').middleware
const JSONParseError = require('@line/bot-sdk').JSONParseError
const SignatureValidationFailed = require('@line/bot-sdk').SignatureValidationFailed
const os = require('os');
const hostname = os.hostname();
const request = require('request');

const axios = require('axios');
const PORT = process.env.PORT || 3000;
var can_flag = "0";

const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();

var user_hash = {};

app.post('/webhook', line.middleware(config), (req, res) => {
    console.log(req.body.events);
    // res.json(req.body.events); // req.body will be webhook event object

    Promise
      .all(req.body.events.map(handleEvent))
      .catch(function (err) {
        console.log("before then");
        console.log(err);
      })
      .then((result) => res.json(result))
      .catch(function (err) {
        console.log( "Something bad happens in webhook call");
        console.log(err);
        process.exit(1);
      });
});

app.get('/trashcan/1/status', function (req, res) {
  res.send(can_flag);
})

app.get('/', function (req, res) {
  res.send("https://" + hostname + "/images/img.jpg");
})

app.use('/images', express.static('images'))

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
const img_url = "https://hack-api-gomi.now.sh/images/img.jpg"

function getObjectName(image_data) {
  console.log(image_data.length)
  let result;
  let body_json;
  let url = "https://www3.arche.blue/mvp5/v1/1031/search";
  let req = request.post(url, function (err, resp, body) {
    if (err) {
      console.log('Error!');
    } else {
      console.log(body)
      body_json = JSON.parse(body);
      result = body_json[0].associatedInfo[1];
      console.log('Object Name: ' + body_json[0].associatedInfo[1]);
      if (result == "Trash Can") {
        client.pushMessage(event.source.userId, [{
          "text" : '画像の投稿ありがとうございます！',
          "type" : 'text'
        }]);
      } else {

        client.pushMessage(event.source.userId, [{
          "text" : '残念ながらこれはゴミ箱ではありません',
          "type" : 'text'
        }]);
      }
    }
  });

  let form = req.form();
  form.append('image', image_data);
    // form.append('image', new Blob(image_buf, { name : 'posted_image.jpg' }));
    // File([buffer], 'ファイル名', { type:mimeType } );
    // form.append('image', image_buf,   {
    //   filename: 'posted_image.jpg',
    //   name: 'posted_image.jpg',
    //   contentType: 'image/jpg'
    // });
}

function handleEvent(event) {

  if(event.beacon){
    if (event.beacon.type === 'enter'){
      if (user_hash[event.source.userId] == undefined) {
        user_hash[event.source.userId] = {}
        user_hash[event.source.userId]["areaID"] = "";
        user_hash[event.source.userId]["level"] = 0; 
      }
      user_hash[event.source.userId]["areaID"] = event.beacon.hwid; 

      client.pushMessage(event.source.userId, [ {
        type: 'template',
        altText: 'スマートフォンから確認してください',
        template: {
          type: 'buttons',
          title: 'お知らせ', // 40文字以内
          text: '近くに燃えるゴミ用のゴミ箱があります。ゴミはゴミ箱へ捨てましょう！捨てに行きますか？', // 60文字以内
          thumbnailImageUrl: img_url, // httpsのみ可
          actions: [{
            type: 'message',
            label: 'はい',
            text: 'はい'
          }, {
            type: 'message',
            label: 'いいえ',
            text: 'いいえ'
          }]
        }
      }, {
        type: 'location',
        title: 'ここにあります。',
        address: '東京大学本郷キャンパス工学部２号館',
        latitude: 35.7144598,
        longitude: 139.7620094
      }]
      );
    } else if (event.beacon.type === 'leave'){
      user_hash[event.source.userId]["areaID"] = ""; 
      // Exiting from zone
      client.pushMessage(event.source.userId, [{
        "text" : 'ばいばい',
        "type" : 'text'
      }]);    
    }
  }

  if (event.message.type == 'image') {
    let image_buf;
    const options = {
      url: `https://api.line.me/v2/bot/message/${event.message.id}/content`,
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + config.channelAccessToken,
      },
      encoding: null
    };
    var req = https.request(send_options, function(res){
      var data = [];
      res.on('data', function(chunk){
        //image data dividing it in to multiple request
        data.push(new Buffer(chunk));
      }).on('error', function(err){
        console.log(err);
      }).on('end', function(){
        // ここに画像取得後の処理を書く
        // この場合は、引数で受け取った画像取得後の処理用callbackを実行
        // dataに画像のバイナリデータが入ってる
        getObjectName(data);
      });
    });
    // request(options, function(error, response, body) {
    //   if (!error && response.statusCode == 200) {
    //     // image_buf = body
    //     image_buf = new Buffer(body)
    //     console.log('file recieved');
    //     getObjectName(image_buf.toString('binary'));
    //   } else {
    //     console.log(error);
    //     process.exit(1);
    //   }
    // });
    
  }

  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }


  if (event.message.text === 'いっぱい' || event.message.text === 'まだ大丈夫' || event.message.text === 'ポイントは？') {
    // level++;
    client.pushMessage(event.source.userId, [{
      "text" : 'ありがとうございます！',
      "type" : 'text'
    },{
      "text" : 'あなたは'+ user_hash[event.source.userId]["level"] + 'pointあります。',
      "type" : 'text'
    }]
  );

    setTimeout(myFunc, 3000);

  } else if (event.message.text === 'はい') {
    can_flag = "1";
    let cur_user_level = user_hash[event.source.userId]["level"];
    if (cur_user_level > 5) {
      user_hash[event.source.userId]["level"] = 0;
    } else {
      user_hash[event.source.userId]["level"] = cur_user_level + 1;
    }
    client.pushMessage(event.source.userId, [{
      "type": "template",
      "altText": "ゴミ箱はいっぱいでしたか？",
      "template": {
          "type": "confirm",
          "text": "ゴミ箱はいっぱいでしたか？",
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
  } else {
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
