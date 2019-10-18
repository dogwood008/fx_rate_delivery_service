import pandas as pd
import subprocess
import json
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta, timezone

JST = timezone(timedelta(hours=+9), 'JST')

class SQLiteStore:
    def __init__(self, path_to_sqlite3: str, table_name: str):
        self._conn = sqlite3.connect(path_to_sqlite3)
        self._table_name = table_name

    def conn(self) -> sqlite3:
        return self._conn

    def write(self, df: pd.DataFrame):
        df.to_sql(self._table_name, self._conn, if_exists='append',
                index=True, index_label='timestamp')

    def close(self):
        return self._conn.close()

    def delete_lt(self, dt: datetime, verbose=False):
        print(f'Delete before "{dt}"') if verbose else None
        sql = 'DELETE FROM `%s` WHERE timestamp <= "%s"' % \
            (self._table_name, dt.strftime('%Y-%m-%dT%H:%M:%S%z'))
        c = self._conn.cursor()
        c.execute(sql)
        self._conn.commit()

def main():
    NODE_PATH = '/Users/kit/.nodenv/shims/node'
    SQLITE3_PATH = './db.sqlite3'
    json_str = subprocess.check_output([NODE_PATH, 'index.js'])
    instrument = 'USD_JPY'
    df = pd.read_json(json.dumps(json.loads(json_str)[instrument]), orient='index')
    df.index.name = 'timestamp'
    df.index = df.index.strftime('%Y-%m-%dT%H:%M:%S%z')
    with closing(SQLiteStore(SQLITE3_PATH, instrument)) as ss:
        ss.write(df)
        ss.delete_lt(datetime.now(JST) - timedelta(hours=2), verbose=True)
main()
