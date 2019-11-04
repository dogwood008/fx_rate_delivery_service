'use strict';

const sqlite3 = require('sqlite3');

class Db {
  constructor (pathToSqlite=null, defaultTableName=null) {
    this.PATH_TO_SQLITE = pathToSqlite || process.env.PATH_TO_SQLITE || './db.sqlite3';
    this.DEFAULT_TABLE_NAME = defaultTableName || process.env.DEFAULT_TABLE_NAME || 'USD_JPY';
    this.db = new sqlite3.Database(this.PATH_TO_SQLITE);
    console.log(`Path to sqlite: ${this.PATH_TO_SQLITE}`);
    console.log(`Default table name: ${this.DEFAULT_TABLE_NAME}`);
  }

  close () {
    this.db.close();
  }

  _tableName (tableName=null) {
    return tableName || this.DEFAULT_TABLE_NAME;
  }

  // https://qiita.com/tashxii/items/7c86f39fced68ea9903d#テーブル作成---create-table-if-not-exists
  createIfNotExist (tableName=null) {
    return new Promise((resolve, reject) => {
      try {
        const sql = `CREATE TABLE IF NOT EXISTS ${_this.tableName(tableName)} (
              "timestamp" TEXT,
                "ask" REAL,
                "bid" REAL,
                "mid" REAL
           );`;
        this.db.serialize(() => {
          this.db.run(sql);
        })
        return resolve()
      } catch (err) {
        return reject(err)
      }
    });
  }

  // https://qiita.com/tashxii/items/7c86f39fced68ea9903d#データ作成更新---insert-or-replace
  insert (entry, tableName=null) {
    const sql = `INSERT INTO ${this._tableName(tableName)}
    (timestamp, ask, bid, mid)
    VALUES ($timestamp, $ask, $bid, $mid)`;
    const params = {
      $timestamp: entry.timestamp,
      $ask: entry.ask,
      $bid: entry.bid,
      $mid: entry.mid
    };
    return new Promise((resolve, reject) => {
      try {
        this.db.run(sql, params);
        return resolve()
      } catch (err) {
        return reject(err)
      }
    })
  }
}

module.exports = Db
