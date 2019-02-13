const express = require('express')
const app = express()

// Need to add the .wasm MIME type explicitly as it's not standard yet
express.static.mime.types['wasm'] = 'application/wasm'

app.use(express.static('docs'))

app.listen(8000, () => console.log('Serving at http://localhost:8000!'))