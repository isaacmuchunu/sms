const csv = require('csv-parser');

// Note: csv-parser does not enforce row or column limits. Callers must validate
// result size (e.g., max rows/columns) after parsing to protect against abuse.
const parseCSV = (readableStream, options = {}) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];

    readableStream
      .pipe(csv(options))
      .on('data', (row) => results.push(row))
      .on('error', (err) => errors.push(err.message))
      .on('end', () => {
        if (errors.length) {
          return reject(new Error(errors.join('; ')));
        }
        resolve(results);
      });
  });
};

module.exports = { parseCSV };
