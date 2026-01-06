const BlogPost = require('../models/BlogPost');
const createCrudRouter = require('./crudFactory');

module.exports = createCrudRouter(BlogPost);
