import json
import logging
from flask import Flask, request, redirect
from serial_bus_mgr import SerialBusManager

serial_manager: SerialBusManager = SerialBusManager()
app = Flask(__name__, static_url_path='/static')
# app.config["DEBUG"] = True
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)


@app.route('/score')
def post_score():
    try:
        score = float(request.args.get('score'))
        serial_manager.rotate_motor(score)
        return (json.dumps({'success': True, 'score': score}), 200, {'ContentType': 'application/json'})
    except Exception as e:
        print(e)
        return (json.dumps({'success': False, 'msg': f'{e}'}), 500, {'ContentType': 'application/json'})


@app.route('/game/<game>', methods=['GET'])
def load_game(game):
    try:
        return redirect(f'../static/{game}/index.html')
    except:
        return (json.dumps(f"No such game:{game}"), 500, {'ContentType': 'application/json'})


app.run()
