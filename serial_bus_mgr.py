import pyfirmata
import time
from datetime import datetime
import pandas as pd
import matplotlib.pyplot as plt


class SerialBusManager:
    # CLASS CONFIG
    PRODUCTION_MODE = False
    TARGET_RPM = 0.3
    DEFAULT_SENSITIVITY: float = 0.05
    MIN_SENSITIVITY: float = 0.01
    MAX_SENSITIVITY: float = 0.10
    MIN_DEGREES = 3
    MAX_DEGREES = 90
    DELAY: float = 0.3
    RPS: float = 3
    # SERIAL_BUS: str =  '/dev/cu.usbserial-1460'
    SERIAL_BUS: str = '/dev/cu.usbserial-AK08KOBB'
    MOTOR_CTRL_PIN_NOS: list = [4, 5, 6, 7]
    ACTIVE = 0
    DISABLED = 1

    def __init__(self):
        self.board = None
        self.events = []
        self.start_ts = datetime.now()
        self.total_rotation_degrees = 0
        self.sensitivity = self.DEFAULT_SENSITIVITY
        self.motor_control_pins = []
        self.motor_control_pins_angles = [0 for i in self.MOTOR_CTRL_PIN_NOS]
        self.curr_motor_pin_idx = 0
        if self.PRODUCTION_MODE:
            self.board = pyfirmata.Arduino(self.SERIAL_BUS)
            self.motor_control_pins = [self.board.get_pin(f'd:{i}:o') for i in self.MOTOR_CTRL_PIN_NOS]
            for pin in self.motor_control_pins:
                pin.write(self.DISABLED)

    def duration_to_degrees(self, rotate_duration):
        degrees = 360 * self.RPS * rotate_duration
        return min(max(degrees, self.MIN_DEGREES), self.MAX_DEGREES)

    def get_rotate_duration(self, score):
        return score * self.sensitivity

    def rotate_motor(self, score: float):
        rotate_duration = self.get_rotate_duration(score)
        if self.PRODUCTION_MODE:
            pin = self.motor_control_pins[self.curr_motor_pin_idx]
            pin.write(self.ACTIVE)
            time.sleep(rotate_duration)
            pin.write(self.DISABLED)
        self.update_active_pin(rotate_duration, score)

    def update_active_pin(self, rotate_duration, score):
        rotation_degrees = self.duration_to_degrees(rotate_duration)
        self.motor_control_pins_angles[self.curr_motor_pin_idx] += rotation_degrees
        if self.motor_control_pins_angles[self.curr_motor_pin_idx] >= 360:
            self.motor_control_pins_angles[self.curr_motor_pin_idx] %= 360
            self.curr_motor_pin_idx = (self.curr_motor_pin_idx + 1) % len(self.MOTOR_CTRL_PIN_NOS)
        self.adjust_sensitivity(rotation_degrees, score)

    def adjust_sensitivity(self, rotation_degrees, score):
        self.total_rotation_degrees += rotation_degrees
        total_rotations = self.total_rotation_degrees / 360
        now = datetime.now()
        time_delta_minutes = (now - self.start_ts).seconds / 60
        actual_rpm = total_rotations / time_delta_minutes
        rpm_ratio = self.TARGET_RPM / actual_rpm
        print(f'{rotation_degrees : .2f}˚')
        self.sensitivity *= rpm_ratio
        self.sensitivity = min(max(self.sensitivity, self.MIN_SENSITIVITY), self.MAX_SENSITIVITY)
        self.log_event(now, score, rotation_degrees, total_rotations, actual_rpm, rpm_ratio)

    def log_event(self, ts, score, rotation_degrees, rotations, rpm, rpm_ratio):
        self.events.append({
            "ts": ts,
            "score": score,
            "curr rotation": rotation_degrees,
            "# rotations": rotations,
            "RPM": rpm,
            "RPM ratio": rpm_ratio,
            "sensitivity": self.sensitivity,
            "pin #": self.curr_motor_pin_idx,
        })

    def analyze(self):
        if not self.events:
            return
        df = pd.DataFrame.from_records(self.events)
        df = df.set_index('ts')
        df.to_csv('log.csv', index=True, float_format='%.3f')
        df.plot(subplots=False)
        plt.show()

