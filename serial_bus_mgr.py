import pyfirmata
import time
from datetime import datetime


class SerialBusManager:
    # CLASS CONFIG
    PRODUCTION_MODE = False
    TARGET_RPM = 0.3
    DEFAULT_SENSITIVITY: float = 0.05
    MIN_SENSITIVITY: float = 0.005
    MAX_SENSITIVITY: float = 0.100
    DELAY: float = 0.3
    RPS: float = 4
    # SERIAL_BUS: str =  '/dev/cu.usbserial-1460'
    SERIAL_BUS: str = '/dev/cu.usbserial-AK08KOBB'
    MOTOR_CTRL_PIN_NOS: list = [4, 5, 6, 7]
    ACTIVE = 0
    DISABLED = 1

    def __init__(self):
        self.board = None
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
        return 360 * self.RPS * rotate_duration

    def get_rotate_duration(self, score):
        return score * self.sensitivity

    def rotate_motor(self, score: float):
        rotate_duration = score * self.sensitivity
        if self.PRODUCTION_MODE:
            pin = self.motor_control_pins[self.curr_motor_pin_idx]
            pin.write(self.ACTIVE)
            time.sleep(rotate_duration)
            pin.write(self.DISABLED)
        self.update_active_pin(rotate_duration)


    def update_active_pin(self, rotate_duration):
        rotation_degrees = self.duration_to_degrees(rotate_duration)
        self.motor_control_pins_angles[self.curr_motor_pin_idx] += rotation_degrees
        if self.motor_control_pins_angles[self.curr_motor_pin_idx] >= 360:
            self.motor_control_pins_angles[self.curr_motor_pin_idx] %= 360
            # print(f'rotation_degree actual={self.motor_control_pins_angles[self.curr_motor_pin_idx]}')
            self.curr_motor_pin_idx = (self.curr_motor_pin_idx + 1) % len(self.MOTOR_CTRL_PIN_NOS)
            # print(f'curr_motor_pin_idx={self.curr_motor_pin_idx}')
        self.adjust_sensitivity(rotation_degrees)

    def adjust_sensitivity(self, rotation_degrees):
        self.total_rotation_degrees += rotation_degrees
        total_rotations = self.total_rotation_degrees / 360
        time_delta_minutes = (datetime.now() - self.start_ts).seconds / 60
        actual_rpm = total_rotations / time_delta_minutes
        rpm_ratio = self.TARGET_RPM / actual_rpm
        self.sensitivity *= rpm_ratio
        self.sensitivity = min(max(self.sensitivity, self.MIN_SENSITIVITY), self.MAX_SENSITIVITY)
        print(f'{rotation_degrees :.2f}˚| dt(m) {time_delta_minutes: .2f} | {actual_rpm: .2f} RPM| sens=f{self.sensitivity :.2f}')
