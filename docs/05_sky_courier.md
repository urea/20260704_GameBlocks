# Sky Courier

`experiments/sky-courier/` is a 3D flight prototype focused on GameBlocks reuse.

## Purpose

The earlier prototypes proved that GameBlocks modules can be copied into a Vite app. Sky Courier makes the GameBlocks role more visible by building the core game feel from existing flight-oriented modules instead of local one-off systems.

## Core Loop

1. Fly the aircraft through each glowing gate.
2. Keep altitude above terrain and water.
3. Use boost to shorten the course time.
4. Finish the final gate and keep flying in free flight.

## Controls: Expert Mode

- `A / D` or left/right arrows roll the aircraft.
- `W / S` or up/down arrows pitch the nose.
- Roll holds its bank angle when input is released.
- Bank and pull up to turn; rolling alone does not auto-turn the aircraft.
- `Q / E` apply light rudder yaw for fine correction.
- `Shift` or `Space` triggers boost.

## GameBlocks Modules In The Critical Path

- `AirplaneMotionController` owns throttle, speed, pitch, roll, yaw, banked turning, and boost.
- `AirplaneModelController` applies the motion state to the aircraft model.
- `AirplaneVisualFactory` creates the plane and jet flame anchors.
- `JetFlameLocalVisual` renders throttle and boost flames.
- `ArchipelagoTerrainSampler` supplies the island heights and colors.
- `NaturalEnvironment` builds terrain, trees, rocks, and grass.
- `FlightPlay` reports ground or water contact.
- `PoseFollowCameraRig` follows the aircraft body frame.
- `FlightHud` renders the aircraft HUD.

## Local Code

Local code is limited to the ring-course objective, keyboard and touch input, path/ring visuals, mission panel, and browser verification hooks. The copied `AirplaneMotionController` is locally extended for the Sky Courier expert arcade-flight profile: roll input sets and holds bank, pull-up while banked turns the aircraft, and Q/E apply rudder-style yaw.

## Verification

The Playwright checks load the scene, confirm the WebGL canvas is nonblank, complete the course through the debug hook, and capture desktop and mobile screenshots.
