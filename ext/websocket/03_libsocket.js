// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
"use strict";

/// <reference path="../../core/internal.d.ts" />



((window) => {
    const core = window.Deno.core;
    const webidl = window.__bootstrap.webidl;
    const { defineEventHandler } = window.__bootstrap.event;
    const {
      PromisePrototypeThen,
      ErrorPrototypeToString,
      ObjectDefineProperties,
      Symbol,
    } = window.__bootstrap.primordials;;

    const _readyState = Symbol("[[readyState]]");
    const _eventLoop = Symbol("[[eventLoop]]");
    const _rid = Symbol("[[rid]]");

    const CONNECTING = 0;
    const OPEN = 1;
    const CLOSING = 2;
    const CLOSED = 3;


    const AsyncGetNextLsScoket = async () => {
      return core.opAsync("op_ls_next_event", this[_rid])
    }
    
    class LibSocket {

        [_rid] = -1;
        [_readyState] = CONNECTING;

        callbacks = [];

        constructor() {

          const create = core.opAsync(
            "op_ls_create",
          );
          create.then(res => {
            console.info('LibSocket::constructor::create async res', res)
            this[_readyState] = OPEN;
            this[_rid] = res.rid;
            this.dispatchEvent({
              kind: 'life',
              value: 'open'
            });
          })
        }

        onData(eventListenerCallback) {
            this.callbacks.push(eventListenerCallback)
        }

        start() {
          setTimeout(() => {
            if (this[_readyState] === OPEN) {
              this.dispatchEvent({
                kind: 'life',
                value: 'start'
              });
              this[_eventLoop]();
            } else {
              this.start();
            }
          },10)
        }

        send(data) {
            if (!typeof data === 'string') {
                try {
                    data = JSON.stringify(data)
                } catch (err) {
                    data = err + ''
                }
            }
            core.opAsync(
                "op_ls_send",
                data
            )
        }

        close() {
            this[_readyState] = CLOSING;
            PromisePrototypeThen(
                core.opAsync("op_ls_close", this[_rid], code, reason),
                () => {
                  this[_readyState] = CLOSED;
                  this.dispatchEvent({
                    kind: 'life',
                    value: 'close'
                  });
                  core.tryClose(this[_rid]);
                },
              );
        }

        async [_eventLoop]() {
            console.info('_eventLoop')
            while(true) {
              if (this[_readyState] == OPEN) {
                console.info('op_ls_next_event before');
                const { kind, value } = await core.opAsync("op_ls_next_event", this[_rid])
                console.info('op_ls_next_event res', kind, value);
                this.dispatchEvent({
                    kind: kind,
                    value: value
                })
              }
            }
        }

        dispatchEvent(event) {
            for(let x in this.callbacks) {
                this.callbacks[x](event)
            }
        }
        
    }

    ObjectDefineProperties(LibSocket, {
      CONNECTING: {
        value: 0,
      },
      OPEN: {
        value: 1,
      },
      CLOSING: {
        value: 2,
      },
      CLOSED: {
        value: 3,
      },
    });

    defineEventHandler(LibSocket.prototype, "message");
    defineEventHandler(LibSocket.prototype, "error");
    defineEventHandler(LibSocket.prototype, "close");
    defineEventHandler(LibSocket.prototype, "open");
  
    webidl.configurePrototype(LibSocket);
    const LibSocketPrototype = LibSocket.prototype;

    window.__bootstrap.libSocket = {
        LibSocket,
        AsyncGetNextLsScoket,
        _rid,
        _readyState,
        _eventLoop
      };
})(this)