import catchAsync from '../utils/catchAsync.js';

/**
 * Re-exported here so route/controller files can import a single
 * "asyncHandler" name from middlewares if preferred over utils.
 */
export default catchAsync;
