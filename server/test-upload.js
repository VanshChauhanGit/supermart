const fs = require('fs');
fs.writeFileSync('test.jpg', 'fake image content');
const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const payload = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\nfake image content\r\n--${boundary}--\r\n`;

fetch('http://localhost:5050/api/v1/upload', {
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`
  },
  body: payload
})
.then(res => res.json().catch(() => res.text()))
.then(console.log)
.catch(console.error);
