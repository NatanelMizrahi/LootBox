import pyfirmata
import time


class SerialBusManager:
    # CLASS CONFIG
    PRODUCTION_MODE = False
    SENSITIVITY: float = 0.05
    DELAY: float = 0.3
    RPS: float = 4
    # SERIAL_BUS: str =  '/dev/cu.usbserial-1460'
    SERIAL_BUS: str =  '/dev/cu.usbserial-AK08KOBB'
    MOTOR_CTRL_PIN_NOS: list = [4, 5, 6, 7]
    ACTIVE = 0
    DISABLED = 1

    def __init__(self):
        self.board = None
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
        return score * self.SENSITIVITY

    def rotate_motor(self, score: float):
        rotate_duration = score * self.SENSITIVITY
        if self.PRODUCTION_MODE:
            pin = self.motor_control_pins[self.curr_motor_pin_idx]
            pin.write(self.ACTIVE)
            time.sleep(rotate_duration)
            pin.write(self.DISABLED)
        self.update_active_pin(rotate_duration)

    def update_active_pin(self, rotate_duration):
        rotation_degrees = self.duration_to_degrees(rotate_duration)
        print(f'rotation_degree={rotation_degrees}')
        self.motor_control_pins_angles[self.curr_motor_pin_idx] += rotation_degrees
        if self.motor_control_pins_angles[self.curr_motor_pin_idx] >= 360:
            self.motor_control_pins_angles[self.curr_motor_pin_idx] %= 360
            print(f'rotation_degree actual={self.motor_control_pins_angles[self.curr_motor_pin_idx]}')
            self.curr_motor_pin_idx = (self.curr_motor_pin_idx + 1) % len(self.MOTOR_CTRL_PIN_NOS)
            print(f'curr_motor_pin_idx={self.curr_motor_pin_idx}')
