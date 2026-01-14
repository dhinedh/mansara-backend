const Career = require('../models/Career');
const createCrudRouter = require('./crudFactory');

module.exports = createCrudRouter(Career, 'careers');
