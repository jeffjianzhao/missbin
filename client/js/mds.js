/*************************************************************************
 * Copyright (c) 2017 Jian Zhao
 *
 *************************************************************************
 *
 * 
 * @author
 * Jian Zhao <zhao@fxpal.com>
 *
 *************************************************************************/

var numeric = require("numeric");

function mdsProjection(distances, dimensions) {
    dimensions = dimensions || 2;

    if(!distances.length)
        return [];

    // square distances
    var M = numeric.mul(-.5, numeric.pow(distances, 2));

    // double centre the rows/columns
    function mean(A) { return numeric.div(numeric.add.apply(null, A), A.length); }
    var rowMeans = mean(M),
        colMeans = mean(numeric.transpose(M)),
        totalMean = mean(rowMeans);

    for (var i = 0; i < M.length; ++i) {
        for (var j =0; j < M[0].length; ++j) {
            M[i][j] += totalMean - rowMeans[i] - colMeans[j];
        }
    }

    // take the SVD of the double centred matrix, and return the points from it
    var result;

    try {
        var ret = numeric.svd(M),
            eigenValues = numeric.sqrt(ret.S);
        result = ret.U.map(function(row) {
            return numeric.mul(row, eigenValues).splice(0, dimensions);
        });
    } catch(err) {
        // svd fails to converge
        console.warn("SVD failure");
        result = [];
        for(var i = 0; i < distances.length; i++) {
            result[i] = [];
            for(var j = 0; j < dimensions; j++)
                result[i][j] = Math.random();
        } 
    }

    // normalization
    var max = -Infinity, min = Infinity;

    for(var i = 0; i < result.length; i++) {
        for(var j = 0; j < result[i].length; j++) {
            if(isNaN(result[i][j])) {
                result[i][j] = Math.random();  // preventing layout failure
                console.warn("SVD failure");
            }
        }

        max = Math.max(max, d3.max(result[i]));
        min = Math.min(min, d3.min(result[i]));
    }
    if(max != min)
        for(var i = 0; i < result.length; i++) 
            for(var j = 0; j < result[i].length; j++)
                result[i][j] = (result[i][j] - min) / (max - min);

    return result;
}

module.exports = mdsProjection;
