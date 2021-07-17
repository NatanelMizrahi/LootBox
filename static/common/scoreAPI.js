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
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {'Content-Type': 'application/json'},
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
  })
  .then(res => res.json())
  .catch(console.error);
}