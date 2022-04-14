/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = '5fd631812086467c9323227dae2abc9c'; // Your client id
var client_secret = '7ab9dd89b7e8402ca34d23decae4b401'; // Your secret
var redirect_uri = 'http://localhost:8888/callback/'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-read-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        // var options = {
        //   url: 'https://api.spotify.com/v1/me',
        //   headers: { 'Authorization': 'Bearer ' + access_token },
        //   json: true
        // };

        // use the access token to access the Spotify Web API
        // request.get(options, function(error, response, body) {
        //   console.log(body);
        // });

        // we can also pass the token to the browser to make requests from there
        res.redirect('http://localhost:3000/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      var refresh_token = body.refresh_token;

      // res.send({
      //   'access_token': access_token
      // });

      // we can also pass the token to the browser to make requests from there
      res.redirect('http://localhost:3000/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
    }
  });

});

// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// puppeteer.use(StealthPlugin());
// const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
// puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
//{ headless: true, ignoreHTTPSErrors: true }

// URL
app.get('/url', function(req, res){
  let searchURL = req.query.searchurl;

  scrapeURL(searchURL).then((r) => {
    res.send(r);
  });
});

// async function timeout(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

scrapeURL = async (searchURL) => {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(searchURL, {"waitUntil" : "networkidle0"});
  // const [el] = await page.$x("/html/body/routable-page/ng-outlet/search-results-page/div/div[2]/div[1]/div[1]/search-result-section/div/div[2]/search-result-items/div/search-result-item/div/mini-song-card/a");
  // const href = await el.getProperty("href");
  // await timeout(2000);

  const result = await page.evaluate(() => {

    let card = document.querySelectorAll(".mini_card")[1];
    return card.getAttribute("href");

  });

  await browser.close();
  return result;
  // return href.jsonValue();
}

// Web scraping
app.get('/lyrics', function(req, res) {
  let url = req.query.url;

  scrapeProduct(url).then((r) => {
    res.send(r);
  });

});

scrapeProduct = async (url) => {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const result = await page.evaluate(() => {
    let elements = document.querySelectorAll(".lyrics");
    const list = [...elements];
    return list.map(h => h.innerText);
  });

  await browser.close();
  return result;
}


//console.log('Listening on 8888');
app.listen(8888);
