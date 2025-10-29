try {
  !(function () {
    var e =
        "undefined" != typeof window
          ? window
          : "undefined" != typeof global
            ? global
            : "undefined" != typeof globalThis
              ? globalThis
              : "undefined" != typeof self
                ? self
                : {},
      t = new e.Error().stack;
    t &&
      ((e._sentryDebugIds = e._sentryDebugIds || {}),
      (e._sentryDebugIds[t] = "15737b7e-05a1-4764-89c2-82addcaaf66b"),
      (e._sentryDebugIdIdentifier =
        "sentry-dbid-15737b7e-05a1-4764-89c2-82addcaaf66b"));
  })();
} catch (e) {}
(() => {
  "use strict";
  let e, t, a;
  class s extends Error {
    details;
    constructor(e, t) {
      super(
        ((e, ...t) => {
          let a = e;
          return t.length > 0 && (a += ` :: ${JSON.stringify(t)}`), a;
        })(e, t),
      ),
        (this.name = e),
        (this.details = t);
    }
  }
  let n = {
      googleAnalytics: "googleAnalytics",
      precache: "precache-v2",
      prefix: "serwist",
      runtime: "runtime",
      suffix: "undefined" != typeof registration ? registration.scope : "",
    },
    r = (e) =>
      [n.prefix, e, n.suffix].filter((e) => e && e.length > 0).join("-"),
    i = {
      updateDetails: (e) => {
        var t = (t) => {
          let a = e[t];
          "string" == typeof a && (n[t] = a);
        };
        for (let e of Object.keys(n)) t(e);
      },
      getGoogleAnalyticsName: (e) => e || r(n.googleAnalytics),
      getPrecacheName: (e) => e || r(n.precache),
      getRuntimeName: (e) => e || r(n.runtime),
    };
  class c {
    promise;
    resolve;
    reject;
    constructor() {
      this.promise = new Promise((e, t) => {
        (this.resolve = e), (this.reject = t);
      });
    }
  }
  function o(e, t) {
    let a = new URL(e);
    for (let e of t) a.searchParams.delete(e);
    return a.href;
  }
  async function l(e, t, a, s) {
    let n = o(t.url, a);
    if (t.url === n) return e.match(t, s);
    let r = { ...s, ignoreSearch: !0 };
    for (let i of await e.keys(t, r))
      if (n === o(i.url, a)) return e.match(i, s);
  }
  let h = new Set(),
    u = async () => {
      for (let e of h) await e();
    };
  function d(e) {
    return new Promise((t) => setTimeout(t, e));
  }
  let f = "-precache-",
    m = async (e, t = f) => {
      let a = (await self.caches.keys()).filter(
        (a) => a.includes(t) && a.includes(self.registration.scope) && a !== e,
      );
      return await Promise.all(a.map((e) => self.caches.delete(e))), a;
    },
    g = (e, t) => {
      let a = t();
      return e.waitUntil(a), a;
    },
    p = (e, t) => t.some((t) => e instanceof t),
    w = new WeakMap(),
    y = new WeakMap(),
    _ = new WeakMap(),
    b = {
      get(e, t, a) {
        if (e instanceof IDBTransaction) {
          if ("done" === t) return w.get(e);
          if ("store" === t)
            return a.objectStoreNames[1]
              ? void 0
              : a.objectStore(a.objectStoreNames[0]);
        }
        return v(e[t]);
      },
      set: (e, t, a) => ((e[t] = a), !0),
      has: (e, t) =>
        (e instanceof IDBTransaction && ("done" === t || "store" === t)) ||
        t in e,
    };
  function v(e) {
    if (e instanceof IDBRequest) {
      let t = new Promise((t, a) => {
        let s = () => {
            e.removeEventListener("success", n),
              e.removeEventListener("error", r);
          },
          n = () => {
            t(v(e.result)), s();
          },
          r = () => {
            a(e.error), s();
          };
        e.addEventListener("success", n), e.addEventListener("error", r);
      });
      return _.set(t, e), t;
    }
    if (y.has(e)) return y.get(e);
    let s = (function (e) {
      if ("function" == typeof e)
        return (
          a ||
          (a = [
            IDBCursor.prototype.advance,
            IDBCursor.prototype.continue,
            IDBCursor.prototype.continuePrimaryKey,
          ])
        ).includes(e)
          ? function (...t) {
              return e.apply(x(this), t), v(this.request);
            }
          : function (...t) {
              return v(e.apply(x(this), t));
            };
      return (e instanceof IDBTransaction &&
        (function (e) {
          if (w.has(e)) return;
          let t = new Promise((t, a) => {
            let s = () => {
                e.removeEventListener("complete", n),
                  e.removeEventListener("error", r),
                  e.removeEventListener("abort", r);
              },
              n = () => {
                t(), s();
              },
              r = () => {
                a(e.error || new DOMException("AbortError", "AbortError")), s();
              };
            e.addEventListener("complete", n),
              e.addEventListener("error", r),
              e.addEventListener("abort", r);
          });
          w.set(e, t);
        })(e),
      p(
        e,
        t ||
          (t = [
            IDBDatabase,
            IDBObjectStore,
            IDBIndex,
            IDBCursor,
            IDBTransaction,
          ]),
      ))
        ? new Proxy(e, b)
        : e;
    })(e);
    return s !== e && (y.set(e, s), _.set(s, e)), s;
  }
  let x = (e) => _.get(e);
  function E(
    e,
    t,
    { blocked: a, upgrade: s, blocking: n, terminated: r } = {},
  ) {
    let i = indexedDB.open(e, t),
      c = v(i);
    return (
      s &&
        i.addEventListener("upgradeneeded", (e) => {
          s(v(i.result), e.oldVersion, e.newVersion, v(i.transaction), e);
        }),
      a &&
        i.addEventListener("blocked", (e) => a(e.oldVersion, e.newVersion, e)),
      c
        .then((e) => {
          r && e.addEventListener("close", () => r()),
            n &&
              e.addEventListener("versionchange", (e) =>
                n(e.oldVersion, e.newVersion, e),
              );
        })
        .catch(() => {}),
      c
    );
  }
  let S = ["get", "getKey", "getAll", "getAllKeys", "count"],
    R = ["put", "add", "delete", "clear"],
    q = new Map();
  function N(e, t) {
    if (!(e instanceof IDBDatabase && !(t in e) && "string" == typeof t))
      return;
    if (q.get(t)) return q.get(t);
    let a = t.replace(/FromIndex$/, ""),
      s = t !== a,
      n = R.includes(a);
    if (
      !(a in (s ? IDBIndex : IDBObjectStore).prototype) ||
      !(n || S.includes(a))
    )
      return;
    let r = async function (e, ...t) {
      let r = this.transaction(e, n ? "readwrite" : "readonly"),
        i = r.store;
      return (
        s && (i = i.index(t.shift())),
        (await Promise.all([i[a](...t), n && r.done]))[0]
      );
    };
    return q.set(t, r), r;
  }
  b = ((e) => ({
    ...e,
    get: (t, a, s) => N(t, a) || e.get(t, a, s),
    has: (t, a) => !!N(t, a) || e.has(t, a),
  }))(b);
  let D = ["continue", "continuePrimaryKey", "advance"],
    P = {},
    T = new WeakMap(),
    C = new WeakMap(),
    k = {
      get(e, t) {
        if (!D.includes(t)) return e[t];
        let a = P[t];
        return (
          a ||
            (a = P[t] =
              function (...e) {
                T.set(this, C.get(this)[t](...e));
              }),
          a
        );
      },
    };
  async function* A(...e) {
    let t = this;
    if ((t instanceof IDBCursor || (t = await t.openCursor(...e)), !t)) return;
    let a = new Proxy(t, k);
    for (C.set(a, t), _.set(a, x(t)); t; )
      yield a, (t = await (T.get(a) || t.continue())), T.delete(a);
  }
  function I(e, t) {
    return (
      (t === Symbol.asyncIterator &&
        p(e, [IDBIndex, IDBObjectStore, IDBCursor])) ||
      ("iterate" === t && p(e, [IDBIndex, IDBObjectStore]))
    );
  }
  b = ((e) => ({
    ...e,
    get: (t, a, s) => (I(t, a) ? A : e.get(t, a, s)),
    has: (t, a) => I(t, a) || e.has(t, a),
  }))(b);
  let U = (e) => (e && "object" == typeof e ? e : { handle: e });
  class L {
    handler;
    match;
    method;
    catchHandler;
    constructor(e, t, a = "GET") {
      (this.handler = U(t)), (this.match = e), (this.method = a);
    }
    setCatchHandler(e) {
      this.catchHandler = U(e);
    }
  }
  class W extends L {
    _allowlist;
    _denylist;
    constructor(e, { allowlist: t = [/./], denylist: a = [] } = {}) {
      super((e) => this._match(e), e),
        (this._allowlist = t),
        (this._denylist = a);
    }
    _match({ url: e, request: t }) {
      if (t && "navigate" !== t.mode) return !1;
      let a = e.pathname + e.search;
      for (let e of this._denylist) if (e.test(a)) return !1;
      return !!this._allowlist.some((e) => e.test(a));
    }
  }
  class F extends L {
    constructor(e, t, a) {
      super(
        ({ url: t }) => {
          let a = e.exec(t.href);
          if (a)
            return t.origin !== location.origin && 0 !== a.index
              ? void 0
              : a.slice(1);
        },
        t,
        a,
      );
    }
  }
  let O = async (e, t, a) => {
    let s = t.map((e, t) => ({ index: t, item: e })),
      n = async (e) => {
        let t = [];
        for (;;) {
          let n = s.pop();
          if (!n) return e(t);
          let r = await a(n.item);
          t.push({ result: r, index: n.index });
        }
      },
      r = Array.from({ length: e }, () => new Promise(n));
    return (await Promise.all(r))
      .flat()
      .sort((e, t) => (e.index < t.index ? -1 : 1))
      .map((e) => e.result);
  };
  function M(e) {
    return "string" == typeof e ? new Request(e) : e;
  }
  class B {
    event;
    request;
    url;
    params;
    _cacheKeys = {};
    _strategy;
    _handlerDeferred;
    _extendLifetimePromises;
    _plugins;
    _pluginStateMap;
    constructor(e, t) {
      for (let a of ((this.event = t.event),
      (this.request = t.request),
      t.url && ((this.url = t.url), (this.params = t.params)),
      (this._strategy = e),
      (this._handlerDeferred = new c()),
      (this._extendLifetimePromises = []),
      (this._plugins = [...e.plugins]),
      (this._pluginStateMap = new Map()),
      this._plugins))
        this._pluginStateMap.set(a, {});
      this.event.waitUntil(this._handlerDeferred.promise);
    }
    async fetch(e) {
      let { event: t } = this,
        a = M(e),
        n = await this.getPreloadResponse();
      if (n) return n;
      let r = this.hasCallback("fetchDidFail") ? a.clone() : null;
      try {
        for (let e of this.iterateCallbacks("requestWillFetch"))
          a = await e({ request: a.clone(), event: t });
      } catch (e) {
        if (e instanceof Error)
          throw new s("plugin-error-request-will-fetch", {
            thrownErrorMessage: e.message,
          });
      }
      let i = a.clone();
      try {
        let e;
        for (let s of ((e = await fetch(
          a,
          "navigate" === a.mode ? void 0 : this._strategy.fetchOptions,
        )),
        this.iterateCallbacks("fetchDidSucceed")))
          e = await s({ event: t, request: i, response: e });
        return e;
      } catch (e) {
        throw (
          (r &&
            (await this.runCallbacks("fetchDidFail", {
              error: e,
              event: t,
              originalRequest: r.clone(),
              request: i.clone(),
            })),
          e)
        );
      }
    }
    async fetchAndCachePut(e) {
      let t = await this.fetch(e),
        a = t.clone();
      return this.waitUntil(this.cachePut(e, a)), t;
    }
    async cacheMatch(e) {
      let t,
        a = M(e),
        { cacheName: s, matchOptions: n } = this._strategy,
        r = await this.getCacheKey(a, "read"),
        i = { ...n, cacheName: s };
      for (let e of ((t = await caches.match(r, i)),
      this.iterateCallbacks("cachedResponseWillBeUsed")))
        t =
          (await e({
            cacheName: s,
            matchOptions: n,
            cachedResponse: t,
            request: r,
            event: this.event,
          })) || void 0;
      return t;
    }
    async cachePut(e, t) {
      let a = M(e);
      await d(0);
      let n = await this.getCacheKey(a, "write");
      if (!t)
        throw new s("cache-put-with-no-response", {
          url: new URL(String(n.url), location.href).href.replace(
            RegExp(`^${location.origin}`),
            "",
          ),
        });
      let r = await this._ensureResponseSafeToCache(t);
      if (!r) return !1;
      let { cacheName: i, matchOptions: c } = this._strategy,
        o = await self.caches.open(i),
        h = this.hasCallback("cacheDidUpdate"),
        f = h ? await l(o, n.clone(), ["__WB_REVISION__"], c) : null;
      try {
        await o.put(n, h ? r.clone() : r);
      } catch (e) {
        if (e instanceof Error)
          throw ("QuotaExceededError" === e.name && (await u()), e);
      }
      for (let e of this.iterateCallbacks("cacheDidUpdate"))
        await e({
          cacheName: i,
          oldResponse: f,
          newResponse: r.clone(),
          request: n,
          event: this.event,
        });
      return !0;
    }
    async getCacheKey(e, t) {
      let a = `${e.url} | ${t}`;
      if (!this._cacheKeys[a]) {
        let s = e;
        for (let e of this.iterateCallbacks("cacheKeyWillBeUsed"))
          s = M(
            await e({
              mode: t,
              request: s,
              event: this.event,
              params: this.params,
            }),
          );
        this._cacheKeys[a] = s;
      }
      return this._cacheKeys[a];
    }
    hasCallback(e) {
      for (let t of this._strategy.plugins) if (e in t) return !0;
      return !1;
    }
    async runCallbacks(e, t) {
      for (let a of this.iterateCallbacks(e)) await a(t);
    }
    *iterateCallbacks(e) {
      for (let t of this._strategy.plugins)
        if ("function" == typeof t[e]) {
          let a = this._pluginStateMap.get(t),
            s = (s) => {
              let n = { ...s, state: a };
              return t[e](n);
            };
          yield s;
        }
    }
    waitUntil(e) {
      return this._extendLifetimePromises.push(e), e;
    }
    async doneWaiting() {
      let e;
      for (; (e = this._extendLifetimePromises.shift()); ) await e;
    }
    destroy() {
      this._handlerDeferred.resolve(null);
    }
    async getPreloadResponse() {
      if (
        this.event instanceof FetchEvent &&
        "navigate" === this.event.request.mode &&
        "preloadResponse" in this.event
      )
        try {
          let e = await this.event.preloadResponse;
          if (e) return e;
        } catch (e) {}
    }
    async _ensureResponseSafeToCache(e) {
      let t = e,
        a = !1;
      for (let e of this.iterateCallbacks("cacheWillUpdate"))
        if (
          ((t =
            (await e({
              request: this.request,
              response: t,
              event: this.event,
            })) || void 0),
          (a = !0),
          !t)
        )
          break;
      return !a && t && 200 !== t.status && (t = void 0), t;
    }
  }
  class K {
    cacheName;
    plugins;
    fetchOptions;
    matchOptions;
    constructor(e = {}) {
      (this.cacheName = i.getRuntimeName(e.cacheName)),
        (this.plugins = e.plugins || []),
        (this.fetchOptions = e.fetchOptions),
        (this.matchOptions = e.matchOptions);
    }
    handle(e) {
      let [t] = this.handleAll(e);
      return t;
    }
    handleAll(e) {
      e instanceof FetchEvent && (e = { event: e, request: e.request });
      let t = e.event,
        a = "string" == typeof e.request ? new Request(e.request) : e.request,
        s = new B(
          this,
          e.url
            ? { event: t, request: a, url: e.url, params: e.params }
            : { event: t, request: a },
        ),
        n = this._getResponse(s, a, t),
        r = this._awaitComplete(n, s, a, t);
      return [n, r];
    }
    async _getResponse(e, t, a) {
      let n;
      await e.runCallbacks("handlerWillStart", { event: a, request: t });
      try {
        if (
          ((n = await this._handle(t, e)), void 0 === n || "error" === n.type)
        )
          throw new s("no-response", { url: t.url });
      } catch (s) {
        if (s instanceof Error) {
          for (let r of e.iterateCallbacks("handlerDidError"))
            if (void 0 !== (n = await r({ error: s, event: a, request: t })))
              break;
        }
        if (!n) throw s;
      }
      for (let s of e.iterateCallbacks("handlerWillRespond"))
        n = await s({ event: a, request: t, response: n });
      return n;
    }
    async _awaitComplete(e, t, a, s) {
      let n, r;
      try {
        n = await e;
      } catch {}
      try {
        await t.runCallbacks("handlerDidRespond", {
          event: s,
          request: a,
          response: n,
        }),
          await t.doneWaiting();
      } catch (e) {
        e instanceof Error && (r = e);
      }
      if (
        (await t.runCallbacks("handlerDidComplete", {
          event: s,
          request: a,
          response: n,
          error: r,
        }),
        t.destroy(),
        r)
      )
        throw r;
    }
  }
  let j = {
    cacheWillUpdate: async ({ response: e }) =>
      200 === e.status || 0 === e.status ? e : null,
  };
  class $ extends K {
    _networkTimeoutSeconds;
    constructor(e = {}) {
      super(e),
        this.plugins.some((e) => "cacheWillUpdate" in e) ||
          this.plugins.unshift(j),
        (this._networkTimeoutSeconds = e.networkTimeoutSeconds || 0);
    }
    async _handle(e, t) {
      let a,
        n = [],
        r = [];
      if (this._networkTimeoutSeconds) {
        let { id: s, promise: i } = this._getTimeoutPromise({
          request: e,
          logs: n,
          handler: t,
        });
        (a = s), r.push(i);
      }
      let i = this._getNetworkPromise({
        timeoutId: a,
        request: e,
        logs: n,
        handler: t,
      });
      r.push(i);
      let c = await t.waitUntil(
        (async () => (await t.waitUntil(Promise.race(r))) || (await i))(),
      );
      if (!c) throw new s("no-response", { url: e.url });
      return c;
    }
    _getTimeoutPromise({ request: e, logs: t, handler: a }) {
      let s;
      return {
        promise: new Promise((t) => {
          s = setTimeout(async () => {
            t(await a.cacheMatch(e));
          }, 1e3 * this._networkTimeoutSeconds);
        }),
        id: s,
      };
    }
    async _getNetworkPromise({
      timeoutId: e,
      request: t,
      logs: a,
      handler: s,
    }) {
      let n, r;
      try {
        r = await s.fetchAndCachePut(t);
      } catch (e) {
        e instanceof Error && (n = e);
      }
      return e && clearTimeout(e), (n || !r) && (r = await s.cacheMatch(t)), r;
    }
  }
  class H extends K {
    _networkTimeoutSeconds;
    constructor(e = {}) {
      super(e), (this._networkTimeoutSeconds = e.networkTimeoutSeconds || 0);
    }
    async _handle(e, t) {
      let a, n;
      try {
        let a = [t.fetch(e)];
        if (this._networkTimeoutSeconds) {
          let e = d(1e3 * this._networkTimeoutSeconds);
          a.push(e);
        }
        if (!(n = await Promise.race(a)))
          throw Error(
            `Timed out the network response after ${this._networkTimeoutSeconds} seconds.`,
          );
      } catch (e) {
        e instanceof Error && (a = e);
      }
      if (!n) throw new s("no-response", { url: e.url, error: a });
      return n;
    }
  }
  let G = "requests",
    V = "queueName";
  class Q {
    _db = null;
    async addEntry(e) {
      let t = (await this.getDb()).transaction(G, "readwrite", {
        durability: "relaxed",
      });
      await t.store.add(e), await t.done;
    }
    async getFirstEntryId() {
      let e = await this.getDb(),
        t = await e.transaction(G).store.openCursor();
      return t?.value.id;
    }
    async getAllEntriesByQueueName(e) {
      let t = await this.getDb();
      return (await t.getAllFromIndex(G, V, IDBKeyRange.only(e))) || [];
    }
    async getEntryCountByQueueName(e) {
      return (await this.getDb()).countFromIndex(G, V, IDBKeyRange.only(e));
    }
    async deleteEntry(e) {
      let t = await this.getDb();
      await t.delete(G, e);
    }
    async getFirstEntryByQueueName(e) {
      return await this.getEndEntryFromIndex(IDBKeyRange.only(e), "next");
    }
    async getLastEntryByQueueName(e) {
      return await this.getEndEntryFromIndex(IDBKeyRange.only(e), "prev");
    }
    async getEndEntryFromIndex(e, t) {
      let a = await this.getDb(),
        s = await a.transaction(G).store.index(V).openCursor(e, t);
      return s?.value;
    }
    async getDb() {
      return (
        this._db ||
          (this._db = await E("serwist-background-sync", 3, {
            upgrade: this._upgradeDb,
          })),
        this._db
      );
    }
    _upgradeDb(e, t) {
      t > 0 &&
        t < 3 &&
        e.objectStoreNames.contains(G) &&
        e.deleteObjectStore(G),
        e
          .createObjectStore(G, { autoIncrement: !0, keyPath: "id" })
          .createIndex(V, V, { unique: !1 });
    }
  }
  class z {
    _queueName;
    _queueDb;
    constructor(e) {
      (this._queueName = e), (this._queueDb = new Q());
    }
    async pushEntry(e) {
      delete e.id,
        (e.queueName = this._queueName),
        await this._queueDb.addEntry(e);
    }
    async unshiftEntry(e) {
      let t = await this._queueDb.getFirstEntryId();
      t ? (e.id = t - 1) : delete e.id,
        (e.queueName = this._queueName),
        await this._queueDb.addEntry(e);
    }
    async popEntry() {
      return this._removeEntry(
        await this._queueDb.getLastEntryByQueueName(this._queueName),
      );
    }
    async shiftEntry() {
      return this._removeEntry(
        await this._queueDb.getFirstEntryByQueueName(this._queueName),
      );
    }
    async getAll() {
      return await this._queueDb.getAllEntriesByQueueName(this._queueName);
    }
    async size() {
      return await this._queueDb.getEntryCountByQueueName(this._queueName);
    }
    async deleteEntry(e) {
      await this._queueDb.deleteEntry(e);
    }
    async _removeEntry(e) {
      return e && (await this.deleteEntry(e.id)), e;
    }
  }
  let J = [
    "method",
    "referrer",
    "referrerPolicy",
    "mode",
    "credentials",
    "cache",
    "redirect",
    "integrity",
    "keepalive",
  ];
  class X {
    _requestData;
    static async fromRequest(e) {
      let t = { url: e.url, headers: {} };
      for (let a of ("GET" !== e.method &&
        (t.body = await e.clone().arrayBuffer()),
      e.headers.forEach((e, a) => {
        t.headers[a] = e;
      }),
      J))
        void 0 !== e[a] && (t[a] = e[a]);
      return new X(t);
    }
    constructor(e) {
      "navigate" === e.mode && (e.mode = "same-origin"),
        (this._requestData = e);
    }
    toObject() {
      let e = Object.assign({}, this._requestData);
      return (
        (e.headers = Object.assign({}, this._requestData.headers)),
        e.body && (e.body = e.body.slice(0)),
        e
      );
    }
    toRequest() {
      return new Request(this._requestData.url, this._requestData);
    }
    clone() {
      return new X(this.toObject());
    }
  }
  let Y = "serwist-background-sync",
    Z = new Set(),
    ee = (e) => {
      let t = {
        request: new X(e.requestData).toRequest(),
        timestamp: e.timestamp,
      };
      return e.metadata && (t.metadata = e.metadata), t;
    };
  class et {
    _name;
    _onSync;
    _maxRetentionTime;
    _queueStore;
    _forceSyncFallback;
    _syncInProgress = !1;
    _requestsAddedDuringSync = !1;
    constructor(
      e,
      { forceSyncFallback: t, onSync: a, maxRetentionTime: n } = {},
    ) {
      if (Z.has(e)) throw new s("duplicate-queue-name", { name: e });
      Z.add(e),
        (this._name = e),
        (this._onSync = a || this.replayRequests),
        (this._maxRetentionTime = n || 10080),
        (this._forceSyncFallback = !!t),
        (this._queueStore = new z(this._name)),
        this._addSyncListener();
    }
    get name() {
      return this._name;
    }
    async pushRequest(e) {
      await this._addRequest(e, "push");
    }
    async unshiftRequest(e) {
      await this._addRequest(e, "unshift");
    }
    async popRequest() {
      return this._removeRequest("pop");
    }
    async shiftRequest() {
      return this._removeRequest("shift");
    }
    async getAll() {
      let e = await this._queueStore.getAll(),
        t = Date.now(),
        a = [];
      for (let s of e) {
        let e = 60 * this._maxRetentionTime * 1e3;
        t - s.timestamp > e
          ? await this._queueStore.deleteEntry(s.id)
          : a.push(ee(s));
      }
      return a;
    }
    async size() {
      return await this._queueStore.size();
    }
    async _addRequest(
      { request: e, metadata: t, timestamp: a = Date.now() },
      s,
    ) {
      let n = {
        requestData: (await X.fromRequest(e.clone())).toObject(),
        timestamp: a,
      };
      switch ((t && (n.metadata = t), s)) {
        case "push":
          await this._queueStore.pushEntry(n);
          break;
        case "unshift":
          await this._queueStore.unshiftEntry(n);
      }
      this._syncInProgress
        ? (this._requestsAddedDuringSync = !0)
        : await this.registerSync();
    }
    async _removeRequest(e) {
      let t,
        a = Date.now();
      switch (e) {
        case "pop":
          t = await this._queueStore.popEntry();
          break;
        case "shift":
          t = await this._queueStore.shiftEntry();
      }
      if (t) {
        let s = 60 * this._maxRetentionTime * 1e3;
        return a - t.timestamp > s ? this._removeRequest(e) : ee(t);
      }
    }
    async replayRequests() {
      let e;
      for (; (e = await this.shiftRequest()); )
        try {
          await fetch(e.request.clone());
        } catch {
          throw (
            (await this.unshiftRequest(e),
            new s("queue-replay-failed", { name: this._name }))
          );
        }
    }
    async registerSync() {
      if ("sync" in self.registration && !this._forceSyncFallback)
        try {
          await self.registration.sync.register(`${Y}:${this._name}`);
        } catch (e) {}
    }
    _addSyncListener() {
      "sync" in self.registration && !this._forceSyncFallback
        ? self.addEventListener("sync", (e) => {
            if (e.tag === `${Y}:${this._name}`) {
              let t = async () => {
                let t;
                this._syncInProgress = !0;
                try {
                  await this._onSync({ queue: this });
                } catch (e) {
                  if (e instanceof Error) throw e;
                } finally {
                  this._requestsAddedDuringSync &&
                    !(t && !e.lastChance) &&
                    (await this.registerSync()),
                    (this._syncInProgress = !1),
                    (this._requestsAddedDuringSync = !1);
                }
              };
              e.waitUntil(t());
            }
          })
        : this._onSync({ queue: this });
    }
    static get _queueNames() {
      return Z;
    }
  }
  class ea {
    _queue;
    constructor(e, t) {
      this._queue = new et(e, t);
    }
    async fetchDidFail({ request: e }) {
      await this._queue.pushRequest({ request: e });
    }
  }
  let es = async (t, a) => {
    let n = null;
    if ((t.url && (n = new URL(t.url).origin), n !== self.location.origin))
      throw new s("cross-origin-copy-response", { origin: n });
    let r = t.clone(),
      i = {
        headers: new Headers(r.headers),
        status: r.status,
        statusText: r.statusText,
      },
      c = a ? a(i) : i,
      o = !(function () {
        if (void 0 === e) {
          let t = new Response("");
          if ("body" in t)
            try {
              new Response(t.body), (e = !0);
            } catch {
              e = !1;
            }
          e = !1;
        }
        return e;
      })()
        ? await r.blob()
        : r.body;
    return new Response(o, c);
  };
  class en extends K {
    _fallbackToNetwork;
    static defaultPrecacheCacheabilityPlugin = {
      cacheWillUpdate: async ({ response: e }) =>
        !e || e.status >= 400 ? null : e,
    };
    static copyRedirectedCacheableResponsesPlugin = {
      cacheWillUpdate: async ({ response: e }) =>
        e.redirected ? await es(e) : e,
    };
    constructor(e = {}) {
      (e.cacheName = i.getPrecacheName(e.cacheName)),
        super(e),
        (this._fallbackToNetwork = !1 !== e.fallbackToNetwork),
        this.plugins.push(en.copyRedirectedCacheableResponsesPlugin);
    }
    async _handle(e, t) {
      let a = await t.getPreloadResponse();
      if (a) return a;
      let s = await t.cacheMatch(e);
      return (
        s ||
        (t.event && "install" === t.event.type
          ? await this._handleInstall(e, t)
          : await this._handleFetch(e, t))
      );
    }
    async _handleFetch(e, t) {
      let a,
        n = t.params || {};
      if (this._fallbackToNetwork) {
        let s = n.integrity,
          r = e.integrity,
          i = !r || r === s;
        (a = await t.fetch(
          new Request(e, { integrity: "no-cors" !== e.mode ? r || s : void 0 }),
        )),
          s &&
            i &&
            "no-cors" !== e.mode &&
            (this._useDefaultCacheabilityPluginIfNeeded(),
            await t.cachePut(e, a.clone()));
      } else
        throw new s("missing-precache-entry", {
          cacheName: this.cacheName,
          url: e.url,
        });
      return a;
    }
    async _handleInstall(e, t) {
      this._useDefaultCacheabilityPluginIfNeeded();
      let a = await t.fetch(e);
      if (!(await t.cachePut(e, a.clone())))
        throw new s("bad-precaching-response", {
          url: e.url,
          status: a.status,
        });
      return a;
    }
    _useDefaultCacheabilityPluginIfNeeded() {
      let e = null,
        t = 0;
      for (let [a, s] of this.plugins.entries())
        s !== en.copyRedirectedCacheableResponsesPlugin &&
          (s === en.defaultPrecacheCacheabilityPlugin && (e = a),
          s.cacheWillUpdate && t++);
      0 === t
        ? this.plugins.push(en.defaultPrecacheCacheabilityPlugin)
        : t > 1 && null !== e && this.plugins.splice(e, 1);
    }
  }
  class er {
    updatedURLs = [];
    notUpdatedURLs = [];
    handlerWillStart = async ({ request: e, state: t }) => {
      t && (t.originalRequest = e);
    };
    cachedResponseWillBeUsed = async ({
      event: e,
      state: t,
      cachedResponse: a,
    }) => {
      if (
        "install" === e.type &&
        t?.originalRequest &&
        t.originalRequest instanceof Request
      ) {
        let e = t.originalRequest.url;
        a ? this.notUpdatedURLs.push(e) : this.updatedURLs.push(e);
      }
      return a;
    };
  }
  let ei = (e) => {
    if (!e) throw new s("add-to-cache-list-unexpected-type", { entry: e });
    if ("string" == typeof e) {
      let t = new URL(e, location.href);
      return { cacheKey: t.href, url: t.href };
    }
    let { revision: t, url: a } = e;
    if (!a) throw new s("add-to-cache-list-unexpected-type", { entry: e });
    if (!t) {
      let e = new URL(a, location.href);
      return { cacheKey: e.href, url: e.href };
    }
    let n = new URL(a, location.href),
      r = new URL(a, location.href);
    return (
      n.searchParams.set("__WB_REVISION__", t),
      { cacheKey: n.href, url: r.href }
    );
  };
  class ec extends L {
    constructor(e, t) {
      super(({ request: a }) => {
        let s = e.getUrlsToPrecacheKeys();
        for (let n of (function* (
          e,
          {
            directoryIndex: t = "index.html",
            ignoreURLParametersMatching: a = [/^utm_/, /^fbclid$/],
            cleanURLs: s = !0,
            urlManipulation: n,
          } = {},
        ) {
          let r = new URL(e, location.href);
          (r.hash = ""), yield r.href;
          let i = ((e, t = []) => {
            for (let a of [...e.searchParams.keys()])
              t.some((e) => e.test(a)) && e.searchParams.delete(a);
            return e;
          })(r, a);
          if ((yield i.href, t && i.pathname.endsWith("/"))) {
            let e = new URL(i.href);
            (e.pathname += t), yield e.href;
          }
          if (s) {
            let e = new URL(i.href);
            (e.pathname += ".html"), yield e.href;
          }
          if (n) for (let e of n({ url: r })) yield e.href;
        })(a.url, t)) {
          let t = s.get(n);
          if (t) {
            let a = e.getIntegrityForPrecacheKey(t);
            return { cacheKey: t, integrity: a };
          }
        }
      }, e.precacheStrategy);
    }
  }
  let eo = "www.google-analytics.com",
    el = "www.googletagmanager.com",
    eh = /^\/(\w+\/)?collect/,
    eu = ({ serwist: e, cacheName: t, ...a }) => {
      let s = i.getGoogleAnalyticsName(t),
        n = new ea("serwist-google-analytics", {
          maxRetentionTime: 2880,
          onSync: (
            (e) =>
            async ({ queue: t }) => {
              let a;
              for (; (a = await t.shiftRequest()); ) {
                let { request: s, timestamp: n } = a,
                  r = new URL(s.url);
                try {
                  let t =
                      "POST" === s.method
                        ? new URLSearchParams(await s.clone().text())
                        : r.searchParams,
                    a = n - (Number(t.get("qt")) || 0),
                    i = Date.now() - a;
                  if ((t.set("qt", String(i)), e.parameterOverrides))
                    for (let a of Object.keys(e.parameterOverrides)) {
                      let s = e.parameterOverrides[a];
                      t.set(a, s);
                    }
                  "function" == typeof e.hitFilter && e.hitFilter.call(null, t),
                    await fetch(
                      new Request(r.origin + r.pathname, {
                        body: t.toString(),
                        method: "POST",
                        mode: "cors",
                        credentials: "omit",
                        headers: { "Content-Type": "text/plain" },
                      }),
                    );
                } catch (e) {
                  throw (await t.unshiftRequest(a), e);
                }
              }
            }
          )(a),
        });
      for (let t of [
        new L(
          ({ url: e }) => e.hostname === el && "/gtm.js" === e.pathname,
          new $({ cacheName: s }),
          "GET",
        ),
        new L(
          ({ url: e }) => e.hostname === eo && "/analytics.js" === e.pathname,
          new $({ cacheName: s }),
          "GET",
        ),
        new L(
          ({ url: e }) => e.hostname === el && "/gtag/js" === e.pathname,
          new $({ cacheName: s }),
          "GET",
        ),
        ...((e) => {
          let t = ({ url: e }) => e.hostname === eo && eh.test(e.pathname),
            a = new H({ plugins: [e] });
          return [new L(t, a, "GET"), new L(t, a, "POST")];
        })(n),
      ])
        e.registerRoute(t);
    };
  class ed {
    _fallbackUrls;
    _serwist;
    constructor({ fallbackUrls: e, serwist: t }) {
      (this._fallbackUrls = e), (this._serwist = t);
    }
    async handlerDidError(e) {
      for (let t of this._fallbackUrls)
        if ("string" == typeof t) {
          let e = await this._serwist.matchPrecache(t);
          if (void 0 !== e) return e;
        } else if (t.matcher(e)) {
          let e = await this._serwist.matchPrecache(t.url);
          if (void 0 !== e) return e;
        }
    }
  }
  class ef {
    _precacheController;
    constructor({ precacheController: e }) {
      this._precacheController = e;
    }
    cacheKeyWillBeUsed = async ({ request: e, params: t }) => {
      let a =
        t?.cacheKey || this._precacheController.getPrecacheKeyForUrl(e.url);
      return a ? new Request(a, { headers: e.headers }) : e;
    };
  }
  class em {
    _urlsToCacheKeys = new Map();
    _urlsToCacheModes = new Map();
    _cacheKeysToIntegrities = new Map();
    _concurrentPrecaching;
    _precacheStrategy;
    _routes;
    _defaultHandlerMap;
    _catchHandler;
    _requestRules;
    constructor({
      precacheEntries: e,
      precacheOptions: t,
      skipWaiting: a = !1,
      importScripts: s,
      navigationPreload: n = !1,
      cacheId: r,
      clientsClaim: c = !1,
      runtimeCaching: o,
      offlineAnalyticsConfig: l,
      disableDevLogs: h = !1,
      fallbacks: u,
      requestRules: d,
    } = {}) {
      var f, g;
      let {
        precacheStrategyOptions: p,
        precacheRouteOptions: w,
        precacheMiscOptions: y,
      } = ((e, t = {}) => {
        let {
          cacheName: a,
          plugins: s = [],
          fetchOptions: n,
          matchOptions: r,
          fallbackToNetwork: c,
          directoryIndex: o,
          ignoreURLParametersMatching: l,
          cleanURLs: h,
          urlManipulation: u,
          cleanupOutdatedCaches: d,
          concurrency: f = 10,
          navigateFallback: m,
          navigateFallbackAllowlist: g,
          navigateFallbackDenylist: p,
        } = t ?? {};
        return {
          precacheStrategyOptions: {
            cacheName: i.getPrecacheName(a),
            plugins: [...s, new ef({ precacheController: e })],
            fetchOptions: n,
            matchOptions: r,
            fallbackToNetwork: c,
          },
          precacheRouteOptions: {
            directoryIndex: o,
            ignoreURLParametersMatching: l,
            cleanURLs: h,
            urlManipulation: u,
          },
          precacheMiscOptions: {
            cleanupOutdatedCaches: d,
            concurrency: f,
            navigateFallback: m,
            navigateFallbackAllowlist: g,
            navigateFallbackDenylist: p,
          },
        };
      })(this, t);
      if (
        ((this._concurrentPrecaching = y.concurrency),
        (this._precacheStrategy = new en(p)),
        (this._routes = new Map()),
        (this._defaultHandlerMap = new Map()),
        (this._requestRules = d),
        (this.handleInstall = this.handleInstall.bind(this)),
        (this.handleActivate = this.handleActivate.bind(this)),
        (this.handleFetch = this.handleFetch.bind(this)),
        (this.handleCache = this.handleCache.bind(this)),
        s && s.length > 0 && self.importScripts(...s),
        n &&
          self.registration?.navigationPreload &&
          self.addEventListener("activate", (e) => {
            e.waitUntil(
              self.registration.navigationPreload.enable().then(() => {}),
            );
          }),
        void 0 !== r && ((f = { prefix: r }), i.updateDetails(f)),
        a
          ? self.skipWaiting()
          : self.addEventListener("message", (e) => {
              e.data && "SKIP_WAITING" === e.data.type && self.skipWaiting();
            }),
        c && self.addEventListener("activate", () => self.clients.claim()),
        e && e.length > 0 && this.addToPrecacheList(e),
        y.cleanupOutdatedCaches &&
          ((g = p.cacheName),
          self.addEventListener("activate", (e) => {
            e.waitUntil(m(i.getPrecacheName(g)).then((e) => {}));
          })),
        this.registerRoute(new ec(this, w)),
        y.navigateFallback &&
          this.registerRoute(
            new W(this.createHandlerBoundToUrl(y.navigateFallback), {
              allowlist: y.navigateFallbackAllowlist,
              denylist: y.navigateFallbackDenylist,
            }),
          ),
        void 0 !== l &&
          ("boolean" == typeof l
            ? l && eu({ serwist: this })
            : eu({ ...l, serwist: this })),
        void 0 !== o)
      ) {
        if (void 0 !== u) {
          let e = new ed({ fallbackUrls: u.entries, serwist: this });
          o.forEach((t) => {
            t.handler instanceof K &&
              !t.handler.plugins.some((e) => "handlerDidError" in e) &&
              t.handler.plugins.push(e);
          });
        }
        for (let e of o) this.registerCapture(e.matcher, e.handler, e.method);
      }
      h && (self.__WB_DISABLE_DEV_LOGS = !0);
    }
    get precacheStrategy() {
      return this._precacheStrategy;
    }
    get routes() {
      return this._routes;
    }
    addEventListeners() {
      self.addEventListener("install", this.handleInstall),
        self.addEventListener("activate", this.handleActivate),
        self.addEventListener("fetch", this.handleFetch),
        self.addEventListener("message", this.handleCache);
    }
    addToPrecacheList(e) {
      let t = [];
      for (let a of e) {
        "string" == typeof a
          ? t.push(a)
          : a && !a.integrity && void 0 === a.revision && t.push(a.url);
        let { cacheKey: e, url: n } = ei(a),
          r = "string" != typeof a && a.revision ? "reload" : "default";
        if (this._urlsToCacheKeys.has(n) && this._urlsToCacheKeys.get(n) !== e)
          throw new s("add-to-cache-list-conflicting-entries", {
            firstEntry: this._urlsToCacheKeys.get(n),
            secondEntry: e,
          });
        if ("string" != typeof a && a.integrity) {
          if (
            this._cacheKeysToIntegrities.has(e) &&
            this._cacheKeysToIntegrities.get(e) !== a.integrity
          )
            throw new s("add-to-cache-list-conflicting-integrities", {
              url: n,
            });
          this._cacheKeysToIntegrities.set(e, a.integrity);
        }
        this._urlsToCacheKeys.set(n, e),
          this._urlsToCacheModes.set(n, r),
          t.length > 0 &&
            console.warn(`Serwist is precaching URLs without revision info: ${t.join(", ")}
This is generally NOT safe. Learn more at https://bit.ly/wb-precache`);
      }
    }
    handleInstall(e) {
      return (
        this.registerRequestRules(e),
        g(e, async () => {
          let t = new er();
          this.precacheStrategy.plugins.push(t),
            await O(
              this._concurrentPrecaching,
              Array.from(this._urlsToCacheKeys.entries()),
              async ([t, a]) => {
                let s = this._cacheKeysToIntegrities.get(a),
                  n = this._urlsToCacheModes.get(t),
                  r = new Request(t, {
                    integrity: s,
                    cache: n,
                    credentials: "same-origin",
                  });
                await Promise.all(
                  this.precacheStrategy.handleAll({
                    event: e,
                    request: r,
                    url: new URL(r.url),
                    params: { cacheKey: a },
                  }),
                );
              },
            );
          let { updatedURLs: a, notUpdatedURLs: s } = t;
          return { updatedURLs: a, notUpdatedURLs: s };
        })
      );
    }
    async registerRequestRules(e) {
      if (this._requestRules && e?.addRoutes)
        try {
          await e.addRoutes(this._requestRules), (this._requestRules = void 0);
        } catch (e) {
          throw e;
        }
    }
    handleActivate(e) {
      return g(e, async () => {
        let e = await self.caches.open(this.precacheStrategy.cacheName),
          t = await e.keys(),
          a = new Set(this._urlsToCacheKeys.values()),
          s = [];
        for (let n of t) a.has(n.url) || (await e.delete(n), s.push(n.url));
        return { deletedCacheRequests: s };
      });
    }
    handleFetch(e) {
      let { request: t } = e,
        a = this.handleRequest({ request: t, event: e });
      a && e.respondWith(a);
    }
    handleCache(e) {
      if (e.data && "CACHE_URLS" === e.data.type) {
        let { payload: t } = e.data,
          a = Promise.all(
            t.urlsToCache.map((t) => {
              let a;
              return (
                (a = "string" == typeof t ? new Request(t) : new Request(...t)),
                this.handleRequest({ request: a, event: e })
              );
            }),
          );
        e.waitUntil(a),
          e.ports?.[0] && a.then(() => e.ports[0].postMessage(!0));
      }
    }
    setDefaultHandler(e, t = "GET") {
      this._defaultHandlerMap.set(t, U(e));
    }
    setCatchHandler(e) {
      this._catchHandler = U(e);
    }
    registerCapture(e, t, a) {
      let n = ((e, t, a) => {
        if ("string" == typeof e) {
          let s = new URL(e, location.href);
          return new L(({ url: e }) => e.href === s.href, t, a);
        }
        if (e instanceof RegExp) return new F(e, t, a);
        if ("function" == typeof e) return new L(e, t, a);
        if (e instanceof L) return e;
        throw new s("unsupported-route-type", {
          moduleName: "serwist",
          funcName: "parseRoute",
          paramName: "capture",
        });
      })(e, t, a);
      return this.registerRoute(n), n;
    }
    registerRoute(e) {
      this._routes.has(e.method) || this._routes.set(e.method, []),
        this._routes.get(e.method).push(e);
    }
    unregisterRoute(e) {
      if (!this._routes.has(e.method))
        throw new s("unregister-route-but-not-found-with-method", {
          method: e.method,
        });
      let t = this._routes.get(e.method).indexOf(e);
      if (t > -1) this._routes.get(e.method).splice(t, 1);
      else throw new s("unregister-route-route-not-registered");
    }
    getUrlsToPrecacheKeys() {
      return this._urlsToCacheKeys;
    }
    getPrecachedUrls() {
      return [...this._urlsToCacheKeys.keys()];
    }
    getPrecacheKeyForUrl(e) {
      let t = new URL(e, location.href);
      return this._urlsToCacheKeys.get(t.href);
    }
    getIntegrityForPrecacheKey(e) {
      return this._cacheKeysToIntegrities.get(e);
    }
    async matchPrecache(e) {
      let t = e instanceof Request ? e.url : e,
        a = this.getPrecacheKeyForUrl(t);
      if (a)
        return (await self.caches.open(this.precacheStrategy.cacheName)).match(
          a,
        );
    }
    createHandlerBoundToUrl(e) {
      let t = this.getPrecacheKeyForUrl(e);
      if (!t) throw new s("non-precached-url", { url: e });
      return (a) => (
        (a.request = new Request(e)),
        (a.params = { cacheKey: t, ...a.params }),
        this.precacheStrategy.handle(a)
      );
    }
    handleRequest({ request: e, event: t }) {
      let a,
        s = new URL(e.url, location.href);
      if (!s.protocol.startsWith("http")) return;
      let n = s.origin === location.origin,
        { params: r, route: i } = this.findMatchingRoute({
          event: t,
          request: e,
          sameOrigin: n,
          url: s,
        }),
        c = i?.handler,
        o = e.method;
      if (
        (!c &&
          this._defaultHandlerMap.has(o) &&
          (c = this._defaultHandlerMap.get(o)),
        !c)
      )
        return;
      try {
        a = c.handle({ url: s, request: e, event: t, params: r });
      } catch (e) {
        a = Promise.reject(e);
      }
      let l = i?.catchHandler;
      return (
        a instanceof Promise &&
          (this._catchHandler || l) &&
          (a = a.catch(async (a) => {
            if (l)
              try {
                return await l.handle({
                  url: s,
                  request: e,
                  event: t,
                  params: r,
                });
              } catch (e) {
                e instanceof Error && (a = e);
              }
            if (this._catchHandler)
              return this._catchHandler.handle({
                url: s,
                request: e,
                event: t,
              });
            throw a;
          })),
        a
      );
    }
    findMatchingRoute({ url: e, sameOrigin: t, request: a, event: s }) {
      for (let n of this._routes.get(a.method) || []) {
        let r,
          i = n.match({ url: e, sameOrigin: t, request: a, event: s });
        if (i)
          return (
            (Array.isArray((r = i)) && 0 === r.length) ||
            (i.constructor === Object && 0 === Object.keys(i).length)
              ? (r = void 0)
              : "boolean" == typeof i && (r = void 0),
            { route: n, params: r }
          );
      }
      return {};
    }
  }
  "undefined" != typeof navigator &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  let eg = "cache-entries",
    ep = (e) => {
      let t = new URL(e, location.href);
      return (t.hash = ""), t.href;
    };
  class ew {
    _cacheName;
    _db = null;
    constructor(e) {
      this._cacheName = e;
    }
    _getId(e) {
      return `${this._cacheName}|${ep(e)}`;
    }
    _upgradeDb(e) {
      let t = e.createObjectStore(eg, { keyPath: "id" });
      t.createIndex("cacheName", "cacheName", { unique: !1 }),
        t.createIndex("timestamp", "timestamp", { unique: !1 });
    }
    _upgradeDbAndDeleteOldDbs(e) {
      this._upgradeDb(e),
        this._cacheName &&
          (function (e, { blocked: t } = {}) {
            let a = indexedDB.deleteDatabase(e);
            t && a.addEventListener("blocked", (e) => t(e.oldVersion, e)),
              v(a).then(() => void 0);
          })(this._cacheName);
    }
    async setTimestamp(e, t) {
      e = ep(e);
      let a = {
          id: this._getId(e),
          cacheName: this._cacheName,
          url: e,
          timestamp: t,
        },
        s = (await this.getDb()).transaction(eg, "readwrite", {
          durability: "relaxed",
        });
      await s.store.put(a), await s.done;
    }
    async getTimestamp(e) {
      let t = await this.getDb(),
        a = await t.get(eg, this._getId(e));
      return a?.timestamp;
    }
    async expireEntries(e, t) {
      let a = await this.getDb(),
        s = await a
          .transaction(eg, "readwrite")
          .store.index("timestamp")
          .openCursor(null, "prev"),
        n = [],
        r = 0;
      for (; s; ) {
        let a = s.value;
        a.cacheName === this._cacheName &&
          ((e && a.timestamp < e) || (t && r >= t)
            ? (s.delete(), n.push(a.url))
            : r++),
          (s = await s.continue());
      }
      return n;
    }
    async getDb() {
      return (
        this._db ||
          (this._db = await E("serwist-expiration", 1, {
            upgrade: this._upgradeDbAndDeleteOldDbs.bind(this),
          })),
        this._db
      );
    }
  }
  class ey {
    _isRunning = !1;
    _rerunRequested = !1;
    _maxEntries;
    _maxAgeSeconds;
    _matchOptions;
    _cacheName;
    _timestampModel;
    constructor(e, t = {}) {
      (this._maxEntries = t.maxEntries),
        (this._maxAgeSeconds = t.maxAgeSeconds),
        (this._matchOptions = t.matchOptions),
        (this._cacheName = e),
        (this._timestampModel = new ew(e));
    }
    async expireEntries() {
      if (this._isRunning) {
        this._rerunRequested = !0;
        return;
      }
      this._isRunning = !0;
      let e = this._maxAgeSeconds ? Date.now() - 1e3 * this._maxAgeSeconds : 0,
        t = await this._timestampModel.expireEntries(e, this._maxEntries),
        a = await self.caches.open(this._cacheName);
      for (let e of t) await a.delete(e, this._matchOptions);
      (this._isRunning = !1),
        this._rerunRequested &&
          ((this._rerunRequested = !1), this.expireEntries());
    }
    async updateTimestamp(e) {
      await this._timestampModel.setTimestamp(e, Date.now());
    }
    async isURLExpired(e) {
      if (!this._maxAgeSeconds) return !1;
      let t = await this._timestampModel.getTimestamp(e),
        a = Date.now() - 1e3 * this._maxAgeSeconds;
      return void 0 === t || t < a;
    }
    async delete() {
      (this._rerunRequested = !1),
        await this._timestampModel.expireEntries(1 / 0);
    }
  }
  class e_ {
    _config;
    _cacheExpirations;
    constructor(e = {}) {
      var t;
      (this._config = e),
        (this._cacheExpirations = new Map()),
        this._config.maxAgeFrom || (this._config.maxAgeFrom = "last-fetched"),
        this._config.purgeOnQuotaError &&
          ((t = () => this.deleteCacheAndMetadata()), h.add(t));
    }
    _getCacheExpiration(e) {
      if (e === i.getRuntimeName()) throw new s("expire-custom-caches-only");
      let t = this._cacheExpirations.get(e);
      return (
        t || ((t = new ey(e, this._config)), this._cacheExpirations.set(e, t)),
        t
      );
    }
    cachedResponseWillBeUsed({
      event: e,
      cacheName: t,
      request: a,
      cachedResponse: s,
    }) {
      if (!s) return null;
      let n = this._isResponseDateFresh(s),
        r = this._getCacheExpiration(t),
        i = "last-used" === this._config.maxAgeFrom,
        c = (async () => {
          i && (await r.updateTimestamp(a.url)), await r.expireEntries();
        })();
      try {
        e.waitUntil(c);
      } catch {}
      return n ? s : null;
    }
    _isResponseDateFresh(e) {
      if ("last-used" === this._config.maxAgeFrom) return !0;
      let t = Date.now();
      if (!this._config.maxAgeSeconds) return !0;
      let a = this._getDateHeaderTimestamp(e);
      return null === a || a >= t - 1e3 * this._config.maxAgeSeconds;
    }
    _getDateHeaderTimestamp(e) {
      if (!e.headers.has("date")) return null;
      let t = new Date(e.headers.get("date")).getTime();
      return Number.isNaN(t) ? null : t;
    }
    async cacheDidUpdate({ cacheName: e, request: t }) {
      let a = this._getCacheExpiration(e);
      await a.updateTimestamp(t.url), await a.expireEntries();
    }
    async deleteCacheAndMetadata() {
      for (let [e, t] of this._cacheExpirations)
        await self.caches.delete(e), await t.delete();
      this._cacheExpirations = new Map();
    }
  }
  let eb = async (e, t) => {
    try {
      if (206 === t.status) return t;
      let a = e.headers.get("range");
      if (!a) throw new s("no-range-header");
      let n = ((e) => {
          let t = e.trim().toLowerCase();
          if (!t.startsWith("bytes="))
            throw new s("unit-must-be-bytes", { normalizedRangeHeader: t });
          if (t.includes(","))
            throw new s("single-range-only", { normalizedRangeHeader: t });
          let a = /(\d*)-(\d*)/.exec(t);
          if (!a || !(a[1] || a[2]))
            throw new s("invalid-range-values", { normalizedRangeHeader: t });
          return {
            start: "" === a[1] ? void 0 : Number(a[1]),
            end: "" === a[2] ? void 0 : Number(a[2]),
          };
        })(a),
        r = await t.blob(),
        i = ((e, t, a) => {
          let n,
            r,
            i = e.size;
          if ((a && a > i) || (t && t < 0))
            throw new s("range-not-satisfiable", { size: i, end: a, start: t });
          return (
            void 0 !== t && void 0 !== a
              ? ((n = t), (r = a + 1))
              : void 0 !== t && void 0 === a
                ? ((n = t), (r = i))
                : void 0 !== a && void 0 === t && ((n = i - a), (r = i)),
            { start: n, end: r }
          );
        })(r, n.start, n.end),
        c = r.slice(i.start, i.end),
        o = c.size,
        l = new Response(c, {
          status: 206,
          statusText: "Partial Content",
          headers: t.headers,
        });
      return (
        l.headers.set("Content-Length", String(o)),
        l.headers.set(
          "Content-Range",
          `bytes ${i.start}-${i.end - 1}/${r.size}`,
        ),
        l
      );
    } catch (e) {
      return new Response("", {
        status: 416,
        statusText: "Range Not Satisfiable",
      });
    }
  };
  class ev {
    cachedResponseWillBeUsed = async ({ request: e, cachedResponse: t }) =>
      t && e.headers.has("range") ? await eb(e, t) : t;
  }
  class ex extends K {
    async _handle(e, t) {
      let a,
        n = await t.cacheMatch(e);
      if (!n)
        try {
          n = await t.fetchAndCachePut(e);
        } catch (e) {
          e instanceof Error && (a = e);
        }
      if (!n) throw new s("no-response", { url: e.url, error: a });
      return n;
    }
  }
  class eE extends K {
    constructor(e = {}) {
      super(e),
        this.plugins.some((e) => "cacheWillUpdate" in e) ||
          this.plugins.unshift(j);
    }
    async _handle(e, t) {
      let a,
        n = t.fetchAndCachePut(e).catch(() => {});
      t.waitUntil(n);
      let r = await t.cacheMatch(e);
      if (r);
      else
        try {
          r = await n;
        } catch (e) {
          e instanceof Error && (a = e);
        }
      if (!r) throw new s("no-response", { url: e.url, error: a });
      return r;
    }
  }
  let eS = {
      rscPrefetch: "pages-rsc-prefetch",
      rsc: "pages-rsc",
      html: "pages",
    },
    eR = [
      {
        matcher: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
        handler: new ex({
          cacheName: "google-fonts-webfonts",
          plugins: [
            new e_({
              maxEntries: 4,
              maxAgeSeconds: 31536e3,
              maxAgeFrom: "last-used",
            }),
          ],
        }),
      },
      {
        matcher: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
        handler: new eE({
          cacheName: "google-fonts-stylesheets",
          plugins: [
            new e_({
              maxEntries: 4,
              maxAgeSeconds: 604800,
              maxAgeFrom: "last-used",
            }),
          ],
        }),
      },
      {
        matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
        handler: new eE({
          cacheName: "static-font-assets",
          plugins: [
            new e_({
              maxEntries: 4,
              maxAgeSeconds: 604800,
              maxAgeFrom: "last-used",
            }),
          ],
        }),
      },
      {
        matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: new eE({
          cacheName: "static-image-assets",
          plugins: [
            new e_({
              maxEntries: 64,
              maxAgeSeconds: 2592e3,
              maxAgeFrom: "last-used",
            }),
          ],
        }),
      },
      {
        matcher: /\/_next\/static.+\.js$/i,
        handler: new ex({
          cacheName: "next-static-js-assets",
          plugins: [
            new e_({
              maxEntries: 64,
              maxAgeSeconds: 86400,
              maxAgeFrom: "last-used",
            }),
          ],
        }),
      },
      {
        matcher: /\/_next\/image\?url=.+$/i,
        handler: new eE({
          cacheName: "next-image",
          plugins: [
            new e_({
              maxEntries: 64,
              maxAgeSeconds: 86400,
              maxAgeFrom: "last-used",
            }),
          ],
        }),
      },
      {
        matcher: /\.(?:mp3|wav|ogg)$/i,
        handler: new ex({
          cacheName: "static-audio-assets",
          plugins: [
            new e_({
              maxEntries: 32,
              maxAgeSeconds: 86400,
              maxAgeFrom: "last-used",
            }),
            new ev(),
          ],
        }),
      },
      {
        matcher: /\.(?:mp4|webm)$/i,
        handler: new ex({
          cacheName: "static-video-assets",
          plugins: [
            new e_({
              maxEntries: 32,
              maxAgeSeconds: 86400,
              maxAgeFrom: "last-used",
            }),
            new ev(),
          ],
        }),
      },
      {
        matcher: /\.(?:js)$/i,
        handler: new eE({
          cacheName: "static-js-assets",
          plugins: [
            new e_({
              maxEntries: 48,
              maxAgeSeconds: 86400,
              maxAgeFrom: "last-used",
            }),
          ],
        }),
      },
      {
        matcher: /\.(?:css|less)$/i,
        handler: new eE({
          cacheName: "static-style-assets",
          plugins: [
            new e_({
              maxEntries: 32,
              maxAgeSeconds: 86400,
              maxAgeFrom: "last-used",
            }),
          ],
        }),
      },
      {
        matcher: /\/_next\/data\/.+\/.+\.json$/i,
        handler: new $({
          cacheName: "next-data",
          plugins: [
            new e_({
              maxEntries: 32,
              maxAgeSeconds: 86400,
              maxAgeFrom: "last-used",
            }),
          ],
        }),
      },
      {
        matcher: /\.(?:json|xml|csv)$/i,
        handler: new $({
          cacheName: "static-data-assets",
          plugins: [
            new e_({
              maxEntries: 32,
              maxAgeSeconds: 86400,
              maxAgeFrom: "last-used",
            }),
          ],
        }),
      },
      {
        matcher: /\/api\/auth\/.*/,
        handler: new H({ networkTimeoutSeconds: 10 }),
      },
      {
        matcher: ({ sameOrigin: e, url: { pathname: t } }) =>
          e && t.startsWith("/api/"),
        method: "GET",
        handler: new $({
          cacheName: "apis",
          plugins: [
            new e_({
              maxEntries: 16,
              maxAgeSeconds: 86400,
              maxAgeFrom: "last-used",
            }),
          ],
          networkTimeoutSeconds: 10,
        }),
      },
      {
        matcher: ({ request: e, url: { pathname: t }, sameOrigin: a }) =>
          "1" === e.headers.get("RSC") &&
          "1" === e.headers.get("Next-Router-Prefetch") &&
          a &&
          !t.startsWith("/api/"),
        handler: new $({
          cacheName: eS.rscPrefetch,
          plugins: [new e_({ maxEntries: 32, maxAgeSeconds: 86400 })],
        }),
      },
      {
        matcher: ({ request: e, url: { pathname: t }, sameOrigin: a }) =>
          "1" === e.headers.get("RSC") && a && !t.startsWith("/api/"),
        handler: new $({
          cacheName: eS.rsc,
          plugins: [new e_({ maxEntries: 32, maxAgeSeconds: 86400 })],
        }),
      },
      {
        matcher: ({ request: e, url: { pathname: t }, sameOrigin: a }) =>
          e.headers.get("Content-Type")?.includes("text/html") &&
          a &&
          !t.startsWith("/api/"),
        handler: new $({
          cacheName: eS.html,
          plugins: [new e_({ maxEntries: 32, maxAgeSeconds: 86400 })],
        }),
      },
      {
        matcher: ({ url: { pathname: e }, sameOrigin: t }) =>
          t && !e.startsWith("/api/"),
        handler: new $({
          cacheName: "others",
          plugins: [new e_({ maxEntries: 32, maxAgeSeconds: 86400 })],
        }),
      },
      {
        matcher: ({ sameOrigin: e }) => !e,
        handler: new $({
          cacheName: "cross-origin",
          plugins: [new e_({ maxEntries: 32, maxAgeSeconds: 3600 })],
          networkTimeoutSeconds: 10,
        }),
      },
      { matcher: /.*/i, method: "GET", handler: new H() },
    ],
    eq = new em({
      precacheEntries: [
        {
          revision: "f4055f964b7d370807b39c2a0be3db43",
          url: "/_next/static/DVswK9xTH8O3S2RjdjI7L/_buildManifest.js",
        },
        {
          revision: "b6652df95db52feb4daf4eca35380933",
          url: "/_next/static/DVswK9xTH8O3S2RjdjI7L/_ssgManifest.js",
        },
        { revision: null, url: "/_next/static/chunks/11-b35716ef7b403872.js" },
        { revision: null, url: "/_next/static/chunks/156-6f77f45dd8c83dcd.js" },
        { revision: null, url: "/_next/static/chunks/176-dc4812879b8bc3a9.js" },
        { revision: null, url: "/_next/static/chunks/180-182b69bbc19c071b.js" },
        {
          revision: null,
          url: "/_next/static/chunks/259952ef-c43f02d0b35e462c.js",
        },
        { revision: null, url: "/_next/static/chunks/342-0466499a7b744391.js" },
        { revision: null, url: "/_next/static/chunks/370-5927003b18c23779.js" },
        { revision: null, url: "/_next/static/chunks/409-fd5fcaf7091fb21c.js" },
        { revision: null, url: "/_next/static/chunks/545-a7ef2f2c5fe97945.js" },
        {
          revision: null,
          url: "/_next/static/chunks/55e5cfd5-3287f837e423191d.js",
        },
        { revision: null, url: "/_next/static/chunks/612-b246fd23a8671b85.js" },
        { revision: null, url: "/_next/static/chunks/683-72c1a7a8d20821ea.js" },
        { revision: null, url: "/_next/static/chunks/687-a774d658d1962fa9.js" },
        { revision: null, url: "/_next/static/chunks/709-ea0b1a739adde4c4.js" },
        { revision: null, url: "/_next/static/chunks/890-201f17d2efd49220.js" },
        { revision: null, url: "/_next/static/chunks/907-b3fb9dd595d22c42.js" },
        { revision: null, url: "/_next/static/chunks/940-7dae857c53d5f08a.js" },
        {
          revision: null,
          url: "/_next/static/chunks/app/(auth)/sign-in/page-649b90e3c130c4b5.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/_not-found/page-4b41bde1fa9fd892.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/add-match/page-6f071b965069e1c7.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/auth/%5B...all%5D/route-8da0851f5ec677cc.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/courts/%5BcourtId%5D/route-580b422a51ee5d8e.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/courts/route-8eb7e51d6142b407.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/locations/%5BlocationId%5D/route-58856d8d7bcba0f2.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/locations/route-c61e2ecbc77582e7.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/matches/%5BmatchId%5D/route-6ad90e566d24304e.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/matches/%5BmatchId%5D/signup/%5BsignupId%5D/route-a63d37d685cec740.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/matches/%5BmatchId%5D/signup/route-f0a6931dbdb393ce.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/matches/route-bc990f222b6e63b0.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/push/preferences/route-7099143f8d1cffe5.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/push/subscribe/route-a94b1bd77ed51f67.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/push/test/route-182984649cbf9458.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/push/unsubscribe/route-3f97398cb9824f25.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/api/push/vapid-key/route-0afa41440ea6d76e.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/global-error-667a83ea34a926cd.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/layout-a5c18bdda2cbe8cb.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/matches/%5BmatchId%5D/page-2f2e2f41f656acdd.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/matches/page-862ad3734fe3a88f.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/organizer/page-10e692e9dd0c1198.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/page-bfe6fd80122e58b5.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/app/rules/page-d585fb58afec89a6.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/f243ff9c-5ca75657f36bce7d.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/framework-572cb4ec85c137d0.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/main-1cf3979b684cc82f.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/main-app-9c836b5f6cbc9c6a.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/pages/_app-93e5e1f01a8ae3a9.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/pages/_error-87c8632a62111024.js",
        },
        {
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
        },
        {
          revision: null,
          url: "/_next/static/chunks/webpack-2a5bbb634ef07eb6.js",
        },
        { revision: null, url: "/_next/static/css/a4b21e396ab388e6.css" },
        {
          revision: "f531ad76d06ac12a489aac7ae7287743",
          url: "/_next/static/media/017b990560e20fa8-s.woff2",
        },
        {
          revision: "aaef2fcdc4e522a77f9cd6049ee19557",
          url: "/_next/static/media/0489f99d015329f9-s.woff2",
        },
        {
          revision: "bae896026706cdee1aac94fbcbe51389",
          url: "/_next/static/media/05655c0aa5f3b658-s.woff2",
        },
        {
          revision: "c9f0c6606cc5b9aadb06c59a4068c146",
          url: "/_next/static/media/0794e5799d273cab-s.woff2",
        },
        {
          revision: "f143fb4877cf7ada1b84423ee86a0198",
          url: "/_next/static/media/1f173e5e25f3efee-s.woff2",
        },
        {
          revision: "04568c1574a279fb493c65c946f0071c",
          url: "/_next/static/media/209823bb303e9ddd-s.woff2",
        },
        {
          revision: "688cb059482cabe2902707e3bbc6038f",
          url: "/_next/static/media/3188544855147a63-s.woff2",
        },
        {
          revision: "3e89278c034422dd496e50daa8fad491",
          url: "/_next/static/media/33e5279d97124154-s.woff2",
        },
        {
          revision: "45ea393f38e4ecd97f4dbeb12ef23877",
          url: "/_next/static/media/48e2044251ef3125-s.woff2",
        },
        {
          revision: "6fa4ba21d0220176c8cb00017ca77281",
          url: "/_next/static/media/511c498c8e92e80b-s.woff2",
        },
        {
          revision: "a21950ff7f375d6cd661179f3bfbc2bf",
          url: "/_next/static/media/556496df2c7f963b-s.woff2",
        },
        {
          revision: "437c18cfc30583a9a35d401c85d38f53",
          url: "/_next/static/media/61125c9969377054-s.woff2",
        },
        {
          revision: "d49720ce180e5036ed80d82e6c6032a7",
          url: "/_next/static/media/6ee030e041c29623-s.woff2",
        },
        {
          revision: "a774a891176716933dd9815034cb2f3a",
          url: "/_next/static/media/7c04bfad68cddb4c-s.woff2",
        },
        {
          revision: "425690e87c3a461d7dbff69dbd9cc0b1",
          url: "/_next/static/media/7fc196796be227b8-s.woff2",
        },
        {
          revision: "0e21a8ae6431656210a3a7b324f7c3b1",
          url: "/_next/static/media/8b72e94d21ccaf2f-s.woff2",
        },
        {
          revision: "c154477b9affa3a0a47f894c8b80c03c",
          url: "/_next/static/media/904be59b21bd51cb-s.p.woff2",
        },
        {
          revision: "e304883712f38d0f9d5802d1cf39ee33",
          url: "/_next/static/media/90a02df6d2f9ff9e-s.woff2",
        },
        {
          revision: "eb005df4d31301e3b9b83e3eaf774e79",
          url: "/_next/static/media/93720efa6ffd49e4-s.woff2",
        },
        {
          revision: "8fe0d574b9eb56feff8770b10f998d0c",
          url: "/_next/static/media/ac255668834aa103-s.woff2",
        },
        {
          revision: "b5818778898bf6d34b7423ff99c6beb4",
          url: "/_next/static/media/b1f344208eb4edfe-s.woff2",
        },
        {
          revision: "d185d272afd4e2d7b4801eabba1463a1",
          url: "/_next/static/media/bf24a9759715e608-s.woff2",
        },
        {
          revision: "2dd3033c22e51dd94ffbe4d865a20872",
          url: "/_next/static/media/c0984d28def8350c-s.p.woff2",
        },
        {
          revision: "49f427eeffe588af0d7c4f2fc57cee94",
          url: "/_next/static/media/c856374feb52eee1-s.p.woff2",
        },
        {
          revision: "031439ed15eeb295d371d90fd63acd92",
          url: "/_next/static/media/ceab0d995744415d-s.woff2",
        },
        {
          revision: "e7dc13ddf6d78b088cbf8f889adc735e",
          url: "/_next/static/media/dbddaa124a0a717a-s.p.woff2",
        },
        { revision: "958c7a9239653963872d4167467391a7", url: "/logo.png" },
        {
          revision: "e12d06a731fc0cfd9a837f49a241c58e",
          url: "/logo_light.png",
        },
        { revision: "0810f20d4168122629b909388ac9121f", url: "/og.png" },
        {
          revision: "a1c52bc57564b835b728203c322efb56",
          url: "/web-app-manifest-192x192.png",
        },
        {
          revision: "dab43689dad6236e92c650035db54727",
          url: "/web-app-manifest-512x512.png",
        },
      ],
      skipWaiting: !0,
      clientsClaim: !0,
      navigationPreload: !0,
      runtimeCaching: [
        {
          urlPattern: /^https?:\/\/.*\/api\/.*/i,
          handler: "NetworkFirst",
          options: {
            cacheName: "api-cache",
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            cacheKeyWillBeUsed: async (e) => {
              let { request: t } = e;
              return "".concat(t.url);
            },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
          handler: "CacheFirst",
          options: {
            cacheName: "images-cache",
            expiration: { maxEntries: 100, maxAgeSeconds: 2592e3 },
          },
        },
        {
          urlPattern: /\.(?:js|css|woff|woff2|ttf|eot)$/i,
          handler: "CacheFirst",
          options: {
            cacheName: "static-assets-cache",
            expiration: { maxEntries: 50, maxAgeSeconds: 604800 },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "google-fonts-cache",
            expiration: { maxEntries: 10, maxAgeSeconds: 31536e3 },
          },
        },
        ...eR,
      ],
    });
  async function eN(e, t) {
    switch (e) {
      case "view":
        return eD(t.url);
      case "join":
        return eD("".concat(t.url, "?action=join"));
      case "remind_later":
        console.log("[SW] Remind later action - would reschedule notification");
        break;
      default:
        return console.log("[SW] Unknown notification action:", e), eD(t.url);
    }
  }
  async function eD(e) {
    for (let t of await self.clients.matchAll({ type: "window" }))
      if ("focus" in t) {
        if ((await t.focus(), "navigate" in t))
          return void (await t.navigate(e));
        return;
      }
    self.clients.openWindow && (await self.clients.openWindow(e));
  }
  async function eP(e, t) {
    try {
      await fetch("/api/analytics/notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: e,
          matchId: t,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      });
    } catch (e) {
      console.error("[SW] Error tracking notification event:", e);
    }
  }
  async function eT() {
    try {
      console.log("[SW] Syncing offline match signups...");
    } catch (e) {
      console.error("[SW] Error syncing offline signups:", e);
    }
  }
  self.addEventListener("push", (e) => {
    if ((console.log("[SW] Push event received", e), !e.data))
      return void console.log("[SW] Push event has no data");
    try {
      var t, a, s, n;
      let r = e.data.json();
      console.log("[SW] Push notification data:", r);
      let i = {
        body: r.body,
        icon: r.icon || "/icons/icon-192x192.png",
        badge: r.badge || "/icons/badge-72x72.png",
        ...(r.image && { image: r.image }),
        actions: r.actions || [],
        data: {
          type: null == (t = r.data) ? void 0 : t.type,
          matchId: null == (a = r.data) ? void 0 : a.matchId,
          url: (null == (s = r.data) ? void 0 : s.url) || "/",
          ...r.data,
        },
        requireInteraction: r.urgent || !1,
        silent: r.silent || !1,
        tag: r.tag || (null == (n = r.data) ? void 0 : n.type),
        timestamp: r.timestamp || Date.now(),
        vibrate: r.vibrate || [200, 100, 200],
        dir: "auto",
        lang: "en",
      };
      e.waitUntil(
        self.registration
          .showNotification(r.title, i)
          .then(() => {
            var e;
            return (
              console.log("[SW] Notification shown successfully"),
              eP("displayed", null == (e = r.data) ? void 0 : e.matchId)
            );
          })
          .catch((e) => {
            console.error("[SW] Error showing notification:", e);
          }),
      );
    } catch (e) {
      console.error("[SW] Error parsing push notification data:", e);
    }
  }),
    self.addEventListener("notificationclick", (e) => {
      console.log("[SW] Notification click event:", e);
      let t = e.notification,
        { type: a, matchId: s, url: n } = t.data;
      t.close(),
        eP("clicked", s),
        e.action
          ? (console.log("[SW] Notification action clicked:", e.action),
            e.waitUntil(eN(e.action, { type: a, matchId: s, url: n })))
          : e.waitUntil(
              self.clients.matchAll({ type: "window" }).then((e) => {
                for (let t of e)
                  if ("focus" in t) {
                    if ((t.focus(), "navigate" in t && n)) return t.navigate(n);
                    return;
                  }
                if (self.clients.openWindow)
                  return self.clients.openWindow(n || "/");
              }),
            );
    }),
    self.addEventListener("notificationclose", (e) => {
      console.log("[SW] Notification closed:", e);
      let { matchId: t } = e.notification.data;
      eP("dismissed", t);
    }),
    self.addEventListener("sync", (e) => {
      "match-signup" === e.tag && e.waitUntil(eT());
    }),
    self.addEventListener("install", (e) => {
      console.log("[SW] Service Worker installing..."),
        e.waitUntil(
          caches
            .open("essential-cache-v1")
            .then((e) =>
              e.addAll([
                "/",
                "/matches",
                "/icons/icon-192x192.png",
                "/icons/icon-512x512.png",
                "/manifest.json",
              ]),
            ),
        );
    }),
    self.addEventListener("activate", (e) => {
      console.log("[SW] Service Worker activating..."),
        e.waitUntil(
          caches
            .keys()
            .then((e) =>
              Promise.all(
                e
                  .filter(
                    (e) =>
                      e.startsWith("essential-cache-") &&
                      "essential-cache-v1" !== e,
                  )
                  .map((e) => caches.delete(e)),
              ),
            ),
        );
    }),
    self.addEventListener("message", (e) => {
      console.log("[SW] Message received:", e.data),
        e.data && "SKIP_WAITING" === e.data.type && self.skipWaiting(),
        e.data &&
          "GET_VERSION" === e.data.type &&
          e.ports[0].postMessage({ version: "1.0.0" });
    }),
    eq.addEventListeners();
})();
