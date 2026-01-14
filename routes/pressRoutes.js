const PressRelease = require('../models/PressRelease');
const createCrudRouter = require('./crudFactory');

module.exports = createCrudRouter(PressRelease, 'press');
