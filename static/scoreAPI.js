const BASE_URL = 'http://localhost:5000';
export function postScore(score){
    return postData('score', {score});
}

export function getGameHighScore(game){
    return fetch(`${BASE_URL}/highscore?game=${game}`)
        .then(res => res.json())
        .catch(console.error) // then should be implemented by the caller
}

export function postGameHighScore(game, score){
    return postData('highscore',{game, score});
}

function postData(route = '', data = {}) {
  const url = `${BASE_URL}/${route}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),

    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json'
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
  })
  .then(res => res.json())
  .catch(console.error);
}