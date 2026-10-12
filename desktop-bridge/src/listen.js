function listenLoopback(server, { host = "127.0.0.1", port = 47821, attempts = 20 } = {}) {
  if (host !== "127.0.0.1" && host !== "localhost") {
    return Promise.reject(new Error("Desktop bridge HTTP must bind to loopback"));
  }
  let next = Number(port) || 47821;
  let remaining = attempts;
  return new Promise((resolve, reject) => {
    const tryListen = () => {
      const onError = (error) => {
        server.removeListener("listening", onListening);
        if (error.code === "EADDRINUSE" && remaining > 1) {
          remaining -= 1;
          next += 1;
          tryListen();
          return;
        }
        error.code = error.code || "LISTEN_FAILED";
        reject(error);
      };
      const onListening = () => {
        server.removeListener("error", onError);
        resolve(server.address());
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen({ port: next, host, exclusive: true });
    };
    tryListen();
  });
}

module.exports = { listenLoopback };
