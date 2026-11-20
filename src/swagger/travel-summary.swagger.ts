/**
 * @swagger
 * tags:
 *   - name: Travel Summary Report
 *     description: Distance, time, and start/end location for vehicles in a date range.
 *
 * components:
 *   schemas:
 *     TravelSummaryStats:
 *       type: object
 *       properties:
 *         startTime: { type: string, format: date-time, nullable: true }
 *         endTime: { type: string, format: date-time, nullable: true }
 *         startLatitude: { type: number, nullable: true }
 *         startLongitude: { type: number, nullable: true }
 *         startAddress: { type: string, nullable: true }
 *         endLatitude: { type: number, nullable: true }
 *         endLongitude: { type: number, nullable: true }
 *         endAddress: { type: string, nullable: true }
 *         distanceMeters: { type: number }
 *         distanceKm: { type: number }
 *         maxSpeed: { type: number, description: km/h }
 *         avgSpeed: { type: number, description: km/h while moving }
 *         runningMs: { type: integer }
 *         idleMs: { type: integer, description: Ignition on and speed 0 }
 *         stopMs: { type: integer, description: Ignition off }
 *         pointCount: { type: integer }
 *
 * /travelSummaryReport:
 *   get:
 *     tags: [Travel Summary Report]
 *     summary: Travel summary filtered by client, transporter, vehicle, and date range
 *     parameters:
 *       - in: query
 *         name: client
 *         schema: { type: string }
 *         description: Client external id. `clientId` is also accepted.
 *       - in: query
 *         name: transporter
 *         schema: { type: string }
 *         description: Transporter external id. `transporterId` is also accepted.
 *       - in: query
 *         name: vehicle
 *         schema: { type: string }
 *         description: Vehicle external id. `vehicleId` is also accepted.
 *       - in: query
 *         name: from
 *         required: true
 *         schema: { type: string, example: "20/11/2026 00:00" }
 *         description: Range start. `startDate` is also accepted. DD/MM/YYYY HH:mm or ISO.
 *       - in: query
 *         name: to
 *         required: true
 *         schema: { type: string, example: "20/11/2026 23:59" }
 *         description: Range end. `endDate` is also accepted. 23:59 covers the last minute.
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Partial vehicle number search.
 *     responses:
 *       200:
 *         description: >
 *           Each row is the full vehicle payload (client, device, transporter) plus `sn` and `travel`.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 filter: { type: object }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sn: { type: integer }
 *                       travel: { $ref: '#/components/schemas/TravelSummaryStats' }
 *       400:
 *         description: Invalid or missing date range, or too many GPS points
 *       401:
 *         description: Authentication is required
 */
