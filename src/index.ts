import substacks from './substacks';

require('./provision.substack');
require('./build.substack');
require('./deploy.substack');

export = async () => substacks.run();
