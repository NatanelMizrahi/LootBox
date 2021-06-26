# https://www.youtube.com/watch?v=tXpFERibRaU
import json
from flask import Flask, request, redirect, url_for
from serial_bus_mgr import SerialBusManager

app = Flask(__name__, static_url_path='/static')

app.config["DEBUG"] = True
serial_manager: SerialBusManager = SerialBusManager()


@app.route('/score', methods=['POST'])
def post_score():
    score = float(request.form.get('score'))
    serial_manager.rotate_motor(score)
    return (
        json.dumps({'success': True, 'score': score}),
        200,
        {'ContentType': 'application/json'}
    )


@app.route('/game', methods=['GET'])
def load_game():
    game = request.args.get('game', default='pickle-rick-pong', type=str)
    return redirect(url_for('static', filename=f'{game}.html'))


app.run()
