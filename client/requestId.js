let requestId = 0;
function getRequestId() {
  return requestId++;
}

module.exports = {
    getRequestId
};