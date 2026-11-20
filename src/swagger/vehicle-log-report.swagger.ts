/**
 * @swagger
 * tags:
 *   - name: Vehicle Log Report
 *     description: Vehicles filtered by modified type and the month of their last update.
 *
 * components:
 *   schemas:
 *     VehicleLogReportItem:
 *       type: object
 *       description: >
 *         Full vehicle payload (same fields as the vehicle detail response, including client,
 *         device, and transporter) plus the log fields below.
 *       properties:
 *         sn: { type: integer, example: 1 }
 *         id: { type: string, description: Vehicle external id }
 *         vehicle: { type: string, example: "UP78AB1234" }
 *         mileage: { type: number }
 *         vehicleType: { type: string }
 *         overspeed: { type: number }
 *         hours: { type: string, nullable: true }
 *         minutes: { type: string, nullable: true }
 *         client: { type: object }
 *         device: { type: object, nullable: true }
 *         transporter: { type: object }
 *         subscriptionStartDate: { type: string, format: date-time }
 *         subscriptionDueDate: { type: string, format: date-time }
 *         fuelType: { type: string, nullable: true }
 *         currentOdometerReading: { type: number, nullable: true }
 *         vehicleNickname: { type: string, nullable: true }
 *         remark: { type: string, nullable: true }
 *         durationOdometer: { type: number, nullable: true }
 *         remark2: { type: string, nullable: true }
 *         parkingViolationAlarmOnIgnitionOn: { type: boolean }
 *         ownerName: { type: string, nullable: true }
 *         ownedBy: { type: string, nullable: true }
 *         vehicleBrand: { type: string, nullable: true }
 *         vehicleModel: { type: string, nullable: true }
 *         vehicleBody: { type: string, nullable: true }
 *         capacity: { type: number, nullable: true }
 *         manufactureDate: { type: string, format: date-time, nullable: true }
 *         purchaseDate: { type: string, format: date-time, nullable: true }
 *         status: { type: string, nullable: true }
 *         reason: { type: string, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *         modifiedType:
 *           type: string
 *           nullable: true
 *           enum:
 *             - Imei
 *             - Sim No.
 *             - Subscription
 *             - Inactive
 *             - Active
 *             - Timezone
 *             - Ignition Wire Not connected change
 *             - Ignition wire positive change
 *             - Vehicle No.
 *         modifiedDate:
 *           type: string
 *           format: date-time
 *           description: Last updated date of the vehicle (`updatedAt`).
 *
 * /vehicleLogReport:
 *   get:
 *     tags: [Vehicle Log Report]
 *     summary: Vehicle log filtered by modified type and month
 *     parameters:
 *       - in: query
 *         name: modifiedType
 *         schema:
 *           type: string
 *           enum:
 *             - Imei
 *             - Sim No.
 *             - Subscription
 *             - Inactive
 *             - Active
 *             - Timezone
 *             - Ignition Wire Not connected change
 *             - Ignition wire positive change
 *             - Vehicle No.
 *         description: Modified type from the ModifiedType enum. Optional.
 *       - in: query
 *         name: month
 *         schema: { type: string, example: "03/2026" }
 *         description: >
 *           Month of the last updated date. Accepts `03/2026`, `Mar` (with year),
 *           or `03` (with year). Optional.
 *       - in: query
 *         name: year
 *         schema: { type: string, example: "2026" }
 *         description: Required when month does not already include the year.
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Partial vehicle number search. Optional.
 *     responses:
 *       200:
 *         description: Vehicle log report fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/VehicleLogReportItem' }
 *       400:
 *         description: Invalid modifiedType, month, or year
 *       401:
 *         description: Authentication is required
 */
