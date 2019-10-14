'use strict';

const fs = require('fs');
const fetch = require('node-fetch');
const moment = require('moment-timezone');

/*
Environment           <Domain>
fxTrade               stream-fxtrade.oanda.com
fxTrade Practice      stream-fxpractice.oanda.com
sandbox               stream-sandbox.oanda.com
*/

const ENV = process.env.OANDA_ENV;
const DOMAIN = ((env) => {
  //return 'localhost:8000';
  switch (env) {
    case 'sandbox':
      return 'api-sandbox.oanda.com';
    case 'practice':
      return 'api-fxpractice.oanda.com';
    case 'production':
      return 'api-fxtrade.oanda.com';
  }
}) (ENV);
const ACCESS_TOKEN = process.env.OANDA_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;
// Up to 10 instruments, separated by URL-encoded comma (%2C)
const instruments = ((list) => { return list.join('%2C') })(['USD_JPY']);

const PROTOCOL = ((env) => {
  //return 'http';
  if (env === 'sandbox') {
    return 'http';
  } else {
    return 'https';
  }
})(ENV);

const PATH = `/v1/prices?accountId=${ACCOUNT_ID}&instruments=${instruments}`;
const URL = `${PROTOCOL}://${DOMAIN}${PATH}`;

const dataframe_json_resp = (instrument, time, bid, ask, mid) => {
  return JSON.stringify(
    { [instrument]: {
      [time]: {
        'bid': bid,
        'ask': ask,
        'mid': mid
      }
    }
    }
  );
};

(async () => {
  try {
    const oanda_resp = await fetch(URL, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const usdjpy = (await oanda_resp.json())['prices'][0];
    debugger;
    const bid = 0.0 + usdjpy['bid'];
    const ask = 0.0 + usdjpy['ask'];
    const mid = (bid + ask) / 2.0;
    const time = moment(usdjpy['time']).tz("Asia/Tokyo").format();
    const instrument = 'USD_JPY';

    console.log(dataframe_json_resp(instrument, time, bid, ask, mid));
  } catch (e) {
    console.error(e);
  }
})();
