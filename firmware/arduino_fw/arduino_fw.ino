#define MOTOR_ACTIVE LOW
#define MOTOR_INACTIVE HIGH
#define MOTOR_START_PIN 4
#define NUM_MOTORS 4
unsigned int inByte = 0;

void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
  pinMode(4, OUTPUT);
  pinMode(5, OUTPUT);
  pinMode(6, OUTPUT);
  pinMode(7, OUTPUT);
}

void loop() {
  static int state = 0; 
  static unsigned char buf[10] = {0};
  // put your main code here, to run repeatedly:
  for (int i = 0 ; i < NUM_MOTORS ; i++) {
    digitalWrite(MOTOR_START_PIN + i, (state & (0x1 << i) ? MOTOR_ACTIVE : MOTOR_INACTIVE));
  }
  if (buf[1]) {
    delay((int) buf[1]);
    buf[1] = 0;
  }
  state = 0;
  while (Serial.available() > 0) {
    // get incoming byte:
 
    Serial.readBytesUntil('\n', buf, 3);
    state = buf[0];
    Serial.print("STATE: 0b");
    Serial.println(buf[0], BIN);

    Serial.print("DELAY: ");
    Serial.println(buf[1], DEC);
  }
  
}
