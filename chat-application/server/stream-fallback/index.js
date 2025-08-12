// Stream fallback for Node.js 20 compatibility
const { Readable, Writable, Transform } = require('stream');

module.exports = {
    Readable,
    Writable,
    Transform,
    // Add any missing stream utilities here
    BufferList: class BufferList extends Readable {
        constructor() {
            super();
            this.buffers = [];
        }
        
        add(buffer) {
            this.buffers.push(buffer);
        }
        
        _read() {
            if (this.buffers.length > 0) {
                const buffer = this.buffers.shift();
                this.push(buffer);
            } else {
                this.push(null);
            }
        }
    }
};