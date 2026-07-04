# Sky Courier

`experiments/sky-courier/` is a 3D flight prototype focused on GameBlocks reuse.

## Purpose

The earlier prototypes proved that GameBlocks modules can be copied into a Vite app. Sky Courier makes the GameBlocks role more visible by building the core game feel from existing flight-oriented modules instead of local one-off systems.

## Core Loop

1. Fly the aircraft through each glowing gate.
2. Keep altitude above terrain and water.
3. Use boost to shorten the course time.
4. Finish the final gate and keep flying in free flight.

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

Local code is limited to the ring-course objective, keyboard and touch input, path/ring visuals, mission panel, and browser verification hooks.

## Verification

The Playwright checks load the scene, confirm the WebGL canvas is nonblank, complete the course through the debug hook, and capture desktop and mobile screenshots.
