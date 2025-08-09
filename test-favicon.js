const http = require('http');

// 测试 favicon 路由
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/favicon.ico',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Favicon 请求成功！');
      console.log(`响应数据长度: ${data.length} 字节`);
    } else {
      console.log('❌ Favicon 请求失败');
      console.log('响应内容:', data);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('❌ 请求错误:', e.message);
  console.log('请确保服务器正在运行在 http://localhost:3000');
  process.exit(1);
});

req.end();
