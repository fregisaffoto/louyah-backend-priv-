const express = require('express');

// Empêche qu'une erreur dans une route async (ex: erreur SQL) ne fasse planter
// tout le processus Node — l'erreur est transmise proprement au middleware
// d'erreur d'Express (server.js) qui répond 500 au lieu de faire tomber le serveur
// pour TOUS les utilisateurs connectés.
function asyncRouter() {
  const router = express.Router();
  ['get', 'post', 'put', 'delete', 'patch'].forEach((method) => {
    const original = router[method].bind(router);
    router[method] = (path, ...handlers) => {
      const wrapped = handlers.map((h) => {
        if (typeof h === 'function' && h.constructor.name === 'AsyncFunction') {
          return (req, res, next) => Promise.resolve(h(req, res, next)).catch(next);
        }
        return h;
      });
      return original(path, ...wrapped);
    };
  });
  return router;
}

module.exports = asyncRouter;
