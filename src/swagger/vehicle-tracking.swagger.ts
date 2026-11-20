/**
 * @swagger
 * tags:
 *   - name: Vehicle Live Tracking
 *     description: >
 *       Current position of every vehicle. Fetch the snapshot once, then join the Socket.IO room
 *       (`join-vehicle-live-tracking`, auth token in `auth.token`) and apply `vehicle.location.updated` events.
 *   - name: Vehicle History Tracking
 *     description: GPS track playback from MongoDB history (moving points only).
 *
 * components:
 *   schemas:
 *     VehicleLiveTrackingItem:
 *       type: object
 *       properties:
 *         vehicleId: { type: string, example: "3f0c7c1e-2f7a-4f8e-9a51-0d6f1b0e4c11" }
 *         vehicleNumber: { type: string, nullable: true, example: "UP78AB1234" }
 *         vehicleNickname: { type: string, nullable: true }
 *         vehicleType: { type: string, nullable: true }
 *         overspeed: { type: number, nullable: true, example: 60 }
 *         status: { type: string, nullable: true, example: "active" }
 *         gpsStatus:
 *           type: string
 *           enum: [running, idle, stop, inactive, no-gps]
 *           description: >
 *             inactive = no update for GPS_INACTIVE_AFTER_MINUTES (default 180);
 *             stop = ignition off; running = speed above GPS_RUNNING_SPEED_THRESHOLD_KMH (default 0).
 *         gpsStatusLabel: { type: string, example: "Running" }
 *         client:
 *           type: object
 *           nullable: true
 *           properties:
 *             id: { type: string }
 *             name: { type: string, nullable: true }
 *         transporter:
 *           type: object
 *           nullable: true
 *           properties:
 *             id: { type: string }
 *             name: { type: string, nullable: true }
 *         gpsDevice:
 *           type: object
 *           nullable: true
 *           properties:
 *             id: { type: string }
 *             deviceImei: { type: string, example: "868120145233604" }
 *             simNumber: { type: string, nullable: true }
 *             latitude: { type: number, nullable: true, example: 26.4499 }
 *             longitude: { type: number, nullable: true, example: 80.3319 }
 *             speed: { type: number, nullable: true, example: 32 }
 *             direction: { type: number, nullable: true, example: 145 }
 *             ignitionStatus: { type: boolean }
 *             locationTime: { type: string, format: date-time, nullable: true }
 *             satellite: { type: number, nullable: true }
 *             gpsRealTime: { type: string, nullable: true }
 *             gpsPositioning: { type: string, nullable: true }
 *             gsmSignal: { type: string, nullable: true }
 *             charging: { type: boolean, nullable: true }
 *             voltage: { type: string, nullable: true }
 *             terminalInfo: { type: string, nullable: true }
 *             alarm: { type: string, nullable: true }
 *             alarmStatus: { type: string, nullable: true }
 *             distance: { type: number, nullable: true, description: Meters since previous fix }
 *             odometer: { type: number, nullable: true, description: Cumulative GPS odometer (km) }
 *     VehicleHistoryPoint:
 *       type: object
 *       properties:
 *         lat: { type: number }
 *         lng: { type: number }
 *         speed: { type: number }
 *         direction: { type: number }
 *         locationTime: { type: string, format: date-time }
 *         ignitionStatus: { type: boolean }
 *         distance: { type: number, description: Meters from previous point }
 *         satellite: { type: number, nullable: true }
 *
 * /vehicleLiveTracking:
 *   get:
 *     tags: [Vehicle Live Tracking]
 *     summary: Live position snapshot of all vehicles
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema: { type: string }
 *         description: Filter by client external id
 *       - in: query
 *         name: transporterId
 *         schema: { type: string }
 *         description: Filter by transporter external id
 *     responses:
 *       200:
 *         description: Vehicle live tracking fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/VehicleLiveTrackingItem' }
 *       401:
 *         description: Authentication is required
 *
 * /vehicleHistoryTracking/vehicles:
 *   get:
 *     tags: [Vehicle History Tracking]
 *     summary: Vehicles that have a GPS device (history dropdown)
 *     responses:
 *       200:
 *         description: Vehicles fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       vehicleNumber: { type: string, nullable: true }
 *                       vehicleNickname: { type: string, nullable: true }
 *                       deviceImei: { type: string, nullable: true }
 *
 * /vehicleHistoryTracking/history:
 *   get:
 *     tags: [Vehicle History Tracking]
 *     summary: GPS track for one vehicle in a time range
 *     parameters:
 *       - in: query
 *         name: vehicleId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         required: true
 *         schema: { type: string, format: date-time, example: "2026-11-20T00:00:00.000Z" }
 *       - in: query
 *         name: to
 *         required: true
 *         schema: { type: string, format: date-time, example: "2026-11-20T23:59:59.999Z" }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Capped at GPS_HISTORY_MAX_POINTS (default 10000); the newest points win when capped.
 *     responses:
 *       200:
 *         description: Vehicle history fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     vehicle:
 *                       type: object
 *                       properties:
 *                         vehicleId: { type: string }
 *                         vehicleNumber: { type: string, nullable: true }
 *                         deviceImei: { type: string, nullable: true }
 *                     from: { type: string, format: date-time }
 *                     to: { type: string, format: date-time }
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalPoints: { type: integer }
 *                         totalDistanceMeters: { type: number }
 *                         maxSpeed: { type: number }
 *                         avgSpeed: { type: number }
 *                         durationMs: { type: integer }
 *                     points:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/VehicleHistoryPoint' }
 *       400:
 *         description: Missing or invalid vehicleId / from / to
 *       404:
 *         description: Vehicle not found
 */
