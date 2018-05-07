'use strict';

var znHttp = require('../../lib/zn-http');
var Q = require('q');

/**
 * Helper to format API response data.
 *
 * @param {Response} response A Node Response object.
 *
 * @return {Array<Object>} An array of  plain objects containing the results.
 */
module.exports.formatResponse = function (response) {
    return response.getBody().data;
};

/**
 * Helper to handle API errors.
 *
 * @param {Response} err A Node Response object.
 */
module.exports.errHandler = function (err) {
    // @TODO whether to throw an actual error is tentative.
    throw new Error(err.getBody());
};

/**
 * Helper to fetch all available records.
 * Uses batching to fetch multiple pages of results if necessary.
 *
 * @param {string} path
 * @param {Object} filter Optional, a filter object to apply.
 *
 * @returns {Promise<Array<Object>>} A promise for an array of plain objects.
 */
module.exports.fetchBatched = function (path, filter) {
    var limit = 20;
    var options = {
        "params": {
            "limit": limit,
            "page": 1
        }
    };

    if (filter) {
        options.params.filter = JSON.stringify(filter);
    }

    var def = Q.defer();

    // Kick off the batched fetch process.
    _fetchBatched(path, options).then(function (response) {
        var promises = [];

        // We've gotta make more API calls if the total count is greater than the limit.
        if (response.count > limit) {
            // Figure out how many additional calls we need to make.
            var extraCalls = Math.ceil((value.count - limit) / limit);
            for (var i = 1; i <= extraCalls; ++i) {
                // Clone object and set new page.
                var newOptions = JSON.parse(JSON.stringify(options));
                newOptions.params.page = i + 1;
                promises.push(_fetchBatched(newOptions));
            }
        }

        return {
            promises: promises,
            records: response.records
        };
    }).then(function (result) {
        // Finally, execute any additional promises we may need.
        Q.all(result.promises).done(function(values) {
            values.forEach(function (val) {
                result.records.concat(val.records);
            });
            def.resolve(result.records);
        }, function (err) {
            err = err.getBody();
            def.reject(err);
        });
    }).catch(function (err) {
        def.reject(err);
    });

    return def.promise;
};

/**
 * Internal helper to fetch a batch of results.
 *
 * @param {string} path
 * @param {Object} options
 *
 * @return {Promise<Object>}
 */
function _fetchBatched(path, options) {
    return znHttp().get(path, options).then(function (response) {
        var body = response.getBody();
        return {
            count: body.totalCount,
            records: body.data
        }
    });
}