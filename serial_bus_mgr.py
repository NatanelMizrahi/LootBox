from typing import List

import numpy as np
import serial
from pathlib import Path
import time
from datetime import datetime
import pandas as pd
import matplotlib.pyplot as plt


class SerialBusManager:
    # CLASS CONFIG
    PRODUCTION_MODE = False
    TARGET_RPM = 0.3
    DEFAULT_SENSITIVITY: float = 0.005
    MIN_SENSITIVITY: float = 0.001
    MAX_SENSITIVITY: float = 0.100
    MIN_DEGREES = 3
    MAX_DEGREES = 90
    DELAY: float = 0.3
    MIN_DURATION = 0.007
    MAX_DURATION = 0.060
    MOTOR_COEFFS = [-9507, 1684, -6.823]
    # 7ms -> 4.5 deg
    # Min Pulse: 10ms -> 23 deg
    # Max Pulse: 60ms -> 360 deg
    RPS: float = 5  # 10ms -> 90deg / 4 => 23 deg => 2.3 deg/ms; 255ms => 360 * 3 => 1080deg => 4.2 deg/ms
    SERIAL_BUSES: List[str] = ['/dev/ttyUSB0', 'COM5']
    NUM_MOTORS = 4
    MOTOR_CTRL_PIN_NOS: list = [4, 5, 6, 7]

    def __init__(self):
        self.serial = None
        self.events = []
        self.start_ts = datetime.now()
        for path in self.SERIAL_BUSES:
            self.serial_path = Path(path)
            if self.serial_path.exists():
                self.PRODUCTION_MODE = True
                break
        self.total_rotation_degrees = 0
        self.sensitivity = self.DEFAULT_SENSITIVITY
        self.motor_control_pins = []
        self.motor_control_pins_angles = [0 for i in self.MOTOR_CTRL_PIN_NOS]
        self.curr_motor_pin_idx = 0
        if self.PRODUCTION_MODE:
            self.serial = serial.Serial(str(self.serial_path))
            self.serial.write(b'0')


    def degrees_to_duration(self, degrees: float):
        coeff = self.MOTOR_COEFFS[:]
        coeff[2] -= degrees
        roots = np.roots(coeff)
        duration = max(*roots)
        return duration

    def get_rotate_duration(self, score):
        x = score * self.sensitivity
        y = x or self.degrees_to_duration(x)
        rotation_duration = np.clip(y, self.MIN_DURATION, self.MAX_DURATION)
        print(f'{x=}, {y=}, {self.sensitivity=},  {rotation_duration=}')
        return rotation_duration

    def duration_to_degrees(self, x):
        y = np.polyval(self.MOTOR_COEFFS, x)
        print(f'{x=} -> {y=}')
        return y

    def rotate_motor(self, score: float):
        rotate_duration = self.get_rotate_duration(score)
        if self.PRODUCTION_MODE:
            pin = self.curr_motor_pin_idx
            duration_ms = int(rotate_duration * 1000)
            print(f'Rotating Motors: {duration_ms}ms')
            dur_bytes = duration_ms.to_bytes(1, 'little')
            self.serial.write(str(0x1 << pin).encode('ascii'))
            self.serial.write(dur_bytes)
            self.serial.write(b'\n')

        rotation_degrees = self.duration_to_degrees(rotate_duration)
        self.update_active_pin(rotation_degrees)
        self.adjust_sensitivity(rotation_degrees, score)

    def update_active_pin(self, rotation_degrees):
        self.motor_control_pins_angles[self.curr_motor_pin_idx] += rotation_degrees
        if self.motor_control_pins_angles[self.curr_motor_pin_idx] >= 360:
            self.motor_control_pins_angles[self.curr_motor_pin_idx] %= 360
            self.curr_motor_pin_idx = (self.curr_motor_pin_idx + 1) % len(self.MOTOR_CTRL_PIN_NOS)

    def adjust_sensitivity(self, rotation_degrees, score):
        self.total_rotation_degrees += rotation_degrees
        total_rotations = self.total_rotation_degrees / 360
        now = datetime.now()
        time_delta_minutes = (now - self.start_ts).seconds / 60
        actual_rpm = total_rotations / time_delta_minutes
        rpm_error = (self.TARGET_RPM - actual_rpm)
        self.sensitivity += rpm_error
        self.sensitivity = np.clip(self.sensitivity, self.MIN_SENSITIVITY, self.MAX_SENSITIVITY)
        print(f'{rotation_degrees =: .2f}˚, {self.sensitivity=}, {actual_rpm=}, {rpm_error=}')
        self.log_event(now, score, rotation_degrees, total_rotations, actual_rpm, rpm_error)

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


def main():
    mgr = SerialBusManager()
    time.sleep(1)
    score = 1
    while True:
        time.sleep(0.5)
        mgr.rotate_motor(score)


if __name__ == '__main__':
    main()
