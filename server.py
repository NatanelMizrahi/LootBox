import json
import logging
from flask import Flask, request, redirect
from serial_bus_mgr import SerialBusManager

serial_manager: SerialBusManager = SerialBusManager()
app = Flask(__name__, static_url_path='/static')
# app.config["DEBUG"] = True
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

highscores = {}


def to_json(resp, code):
    return json.dumps(resp), code, {'ContentType': 'application/json'}


@app.route('/score', methods=['POST'])
def post_score():
    try:
        score = float(request.json['score'])
        print(f'score={score}')
        serial_manager.rotate_motor(score)
        return to_json({'success': True, 'score': score}, 200)
    except Exception as e:
        print(e)
        return to_json({'success': False, 'msg': f'{e}'}, 500)


@app.route('/highscore', methods=['GET', 'POST'])
def highscore_handler():
        if request.method == 'GET':
            game = request.args.get('game')
            highscore = highscores.get(game, 0)
            return to_json(highscore, 200)
        else:
            game = request.json.get('game')
            try:
                score = int(request.json['score'])
                curr_highscore = highscores.get(game,0)
                highscores[game] = max(curr_highscore, score)
            except Exception as e:
                print(e)
            finally:
                return to_json(highscores.get(game, 0), 200)


@app.route('/game/<game>', methods=['GET'])
def load_game(game):
    try:
        return redirect(f'../static/{game}/index.html')
    except:
        return to_json(f"No such game:{game}", 500)


app.run()
