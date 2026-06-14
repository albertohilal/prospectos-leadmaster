require('dotenv').config({ override: true });

const mysql = require('mysql2/promise');
const config = require('./config');

async function configureConnection(connection) {
  await connection.execute('SET time_zone = ?', [config.dbSessionTimeZone]);
  return connection;
}

async function getPrimaryDbConnection() {
  const connection = await mysql.createConnection(config.db);
  return configureConnection(connection);
}

async function getOperationalDbConnection() {
  const connection = await mysql.createConnection(config.operationalDb);
  return configureConnection(connection);
}

module.exports = {
  getPrimaryDbConnection,
  getOperationalDbConnection
};