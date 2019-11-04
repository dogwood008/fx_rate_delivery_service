'use strict';

Array.prototype.sum = function () {
  return numbers.reduce(function(total, num) {
    return total + num
  });
}

// https://stabucky.com/wp/archives/6737
Array.prototype.mean = function() {
  const array_length = this.length;
  let value = 0.0;
  for (let i = 0; i < array_length; i++) {
    value += this[i];
  }
  return value / array_length;
}

const fs = require('fs');
const moment = require('moment-timezone');
const Context = require('@oanda/v20/context').Context;

const Db = require('./db');

const pp = v => console.dir(v, { depth: null, colors: true });


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
const STREAM_DOMAIN = 'stream-fxpractice.oanda.com'; //() => DOMAIN.replace('api-', 'stream-');
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

const streamingContext = ((host, port, ssl, application, token) => {
  const ctx = new Context(host, port, ssl, application);
  ctx.setToken(token);
  return ctx;
});

// stream(accountID, queryParams, streamChunkHandler, responseHandler)
const streamArgs = ((account_id, instruments, snapshot, heartbeat, db) => {
  // snapshot: https://developer.oanda.com/rest-live-v20/best-practices/
  const streamChunkHandler = (msg) => {
    if (msg.type === 'HEARTBEAT' && heartbeat) { console.debug(msg.toString()); return; }
    const pair = {
      asks: msg.asks.map(p => parseFloat(p.price)),
      bids: msg.bids.map(p => parseFloat(p.price)) };
    pair.ask = pair.asks.mean();
    pair.bid = pair.bids.mean();
    const entry = {
      timestamp: moment().tz('Asia/Tokyo').format(),
      ask: pair.ask,
      bid: pair.bid,
      mid: (0.0 + pair.ask + pair.bid) / 2.0
    }
    db.insert(entry)
    console.debug(pair);
  };
  const responseHandler = (resp) => {
    if (parseInt(msg.statusCode) >= 500) {
      throw `Server Error: ${msg}`;
    }
    console.debug(resp);
  };
  return [
    account_id,
    { instruments: instruments, snapshot: snapshot },
    (message) => streamChunkHandler(message),
    (response) => responseHandler(response)
  ];
});

const closeDb = (db) => {
  if (typeof db !== 'undefined') {
    console.error('Close DB.');
    db.close();
  }
};

const setFinallyActions = (db) => {
  for(let signal of ['SIGHUP', 'SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      console.log(signal);
      console.log("Caught interrupt signal");
      closeDb(db);
      process.exit();
    });
  }
};

const main = () => {
  const instruments = 'USD_JPY';
  const sc = streamingContext(STREAM_DOMAIN, 443, true, 'OANDA', ACCESS_TOKEN);
  const db = new Db('./db.sqlite3', instruments);
  const args = streamArgs(ACCOUNT_ID, instruments, false, true, db);
  try {
    setFinallyActions(db);
    sc.pricing.stream(...args);
  } catch {
    closeDb(db);
  }
}

main();
