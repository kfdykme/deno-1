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

    class LibSocket {

        [_rid];
        [_readyState] = CONNECTING;

        callbacks = [];

        constructor() {

          PromisePrototypeThen(
            core.opAsync(
              "op_ls_create",
            ),
            (create) => {
              this[_rid] = create.rid;
              this.dispatchEvent({
                kind: 'life',
                value: 'open'
              });
              this[_eventLoop]();
            },
            (err) => {
              this[_readyState] = CLOSED;

              this.dispatchEvent({
                kind: 'error', 
                value:  { error: err, message: ErrorPrototypeToString(err) },
              });

              this.dispatchEvent({
                kind: 'life',
                value: 'close'
              });
            },
          );
        }

        onData(eventListenerCallback) {
            this.callbacks.push(eventListenerCallback)
        }

        start() {
            this[_readyState] = OPEN;
        }

        send(data) {
            if (!typeof data === 'string') {
                try {
                    data = JSON.stringify(data)
                } catch (err) {
                    data = err + ''
                }
            }
            core.opSync(
                "op_deno2lib",
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
            while(this[_readyState] == OPEN) {
                const { kind, value } = await core.opAsync("op_ls_next_event", this[_rid])
                this.dispatchEvent({
                    kind: kind,
                    value: value
                })
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
        _rid,
        _readyState,
        _eventLoop
      };
})(this)