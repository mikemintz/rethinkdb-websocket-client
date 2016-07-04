/*eslint-env mocha */

import assert from 'assert';
import {Server} from 'ws';
import {rethinkdb as r, Promise, connect, protodef} from '../dist/node';

const path = '/db';
const db = 'my_database_name';
const queryRequest = r.table('turtles');
const queryResults = [{id: '1'}, {id: '2'}];

describe('RethinkdbWebsocketClient', () => {
  const serverPromise = new Promise(resolve => {
    const serverOptions = {
      port: 0,
      path,
      perMessageDeflate: false, // necessary due to https://github.com/websockets/ws/issues/523
    };
    const server = new Server(serverOptions, () => resolve(server));
  });

  serverPromise.then(server => {
    server.on('connection', webSocket => {
      let buf = new Buffer(0);
      let handshakeComplete = false;

      const processNextMessage = () => {
        if (!handshakeComplete) {
          if (buf.length >= 12) {
            const protocolVersion = buf.readUInt32LE(0);
            const keyLength = buf.readUInt32LE(4);
            const protocolType = buf.readUInt32LE(8);
            assert.strictEqual(protocolVersion, protodef.VersionDummy.Version.V0_4);
            assert.strictEqual(keyLength, 0);
            assert.strictEqual(protocolType, protodef.VersionDummy.Protocol.JSON);
            webSocket.send(new Buffer("SUCCESS\u0000"));
            handshakeComplete = true;
            return 12;
          }
        } else {
          if (buf.length >= 12) {
            const encodedQueryLength = buf.readUInt32LE(8);
            const queryEndOffset = 12 + encodedQueryLength;
            if (queryEndOffset <= buf.length) {
              // Confirm it's the query we expected the client to send
              const cmdBuf = buf.slice(0, queryEndOffset);
              const queryCmdBuf = cmdBuf.slice(12, cmdBuf.length);
              const [type, query, queryOptions] = JSON.parse(queryCmdBuf);
              assert.strictEqual(type, protodef.Query.QueryType.START);
              assert.deepEqual(query, queryRequest.build());
              const expectedQueryOptions = {db: [protodef.Term.TermType.DB, [db]]};
              assert.deepEqual(queryOptions, expectedQueryOptions);

              // Send the response the client expects to receive
              const responseJson = {
                t: protodef.Response.ResponseType.SUCCESS_SEQUENCE,
                r: queryResults,
              };
              const responsePayloadBuf = new Buffer(JSON.stringify(responseJson));
              const responseHeaderBuf = new Buffer(12);
              responseHeaderBuf.writeUInt32LE(cmdBuf.readUInt32LE(0), 0); // token 1st 4 bytes
              responseHeaderBuf.writeUInt32LE(cmdBuf.readUInt32LE(4), 4); // token 2nd 4 bytes
              responseHeaderBuf.writeUInt32LE(responsePayloadBuf.length, 8);
              webSocket.send(Buffer.concat([responseHeaderBuf, responsePayloadBuf]));
              return queryEndOffset;
            }
          }
        }
        return 0;
      };

      webSocket.onmessage = event => {
        buf = Buffer.concat([buf, event.data]);
        let keepGoing = true;
        while (keepGoing) {
          let bytesConsumed = processNextMessage();
          buf = buf.slice(bytesConsumed);
          keepGoing = bytesConsumed > 0;
        }
      };
    });
  });

  it('should connect, issue a query, and receive a response', done => {
    serverPromise.then(server => {
      const {address, port} = server._server.address();
      const connectOptions = {host: address, port, path, db};
      connect(connectOptions).then(conn => {
        queryRequest.run(conn, (err1, cursor) => {
          assert(!err1);
          cursor.toArray((err2, results) => {
            assert(!err2);
            assert.deepEqual(results, queryResults);
            done();
          });
        });
      });
    });
  });

});
