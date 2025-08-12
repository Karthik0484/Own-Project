// Readable-stream nuclear fix for Node.js 20
const { Readable, Writable, Transform, Duplex, PassThrough } = require('stream');

module.exports = {
    Readable,
    Writable,
    Transform,
    Duplex,
    PassThrough,
    // Add any missing methods that might be needed
    finished: require('stream').finished || (() => {}),
    pipeline: require('stream').pipeline || (() => {}),
    // Compatibility with older versions
    Stream: Readable,
    _stream_readable: Readable,
    _stream_writable: Writable,
    _stream_transform: Transform,
    _stream_duplex: Duplex,
    _stream_passthrough: PassThrough
};