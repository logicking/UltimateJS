/*
 * Release build version. Removing debug functions by overwriting them with empty
 * functions. Should be included at the end of the engine files.
 */

// asserts
function assert(exp, message) {
}

// console
console.log = function() {
};

console.warn = function() {
};

console.error = function() {
};
