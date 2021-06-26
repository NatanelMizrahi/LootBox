////URL = 'http://localhost:3000/'
////URL = 'http://localhost/'
////const url = new URL("http://localhost:5000")
//

const fetch = require('node-fetch');
body = { score: 3}
fetch("http://localhost:5000", {
        method: 'post',
        body:    JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain, */*',
            'User-Agent': '*',
        }
    })
    .then(res => res.json())
    .then(json => console.log(json));


//axios = require('axios')
//  var res = axios.post(
//    "http://localhost:5000",
//    {b:'3'},
//    {
//      headers: {
//        Accept: 'application/json, text/plain, */*',
//        'User-Agent': '*',
//      },
//    }
//  ).then(console.log);