const PORT = 5000;
export function postScore(score){
    fetch(`http://localhost:${PORT}/score?score=${score}`)
        .then(console.log)
        .catch(console.error)
}
