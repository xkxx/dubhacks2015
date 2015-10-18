var getLastSent = function(str) {
  // TODO: deal with vs.
  var stop = str.lastIndexOf(".");
  return str.slice(stop);
};
