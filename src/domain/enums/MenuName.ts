export enum MenuName {
  // Top-level parents
  Home = "home",
  Master = "master",
  Vehicle = "vehicle",
  Reports = "reports",
  Alerts = "alerts",
  Settings = "settings",
  Support = "support",
  AccessManagement = "access_management",

  // Home children
  Dashboard = "dashboard",
  AdvancedDashboard = "advanced_dashboard",
  AnalyticsDashboard = "analytics_dashboard",

  // Master children
  Owner = "owner",
  Role = "role",
  DeviceType = "device_type",
  GeoType = "geo_type",
  DriverLicence = "driver_licence",
  ExpenseType = "expense_type",

  // Vehicles (Vehicle parent) children
  Vehicles = "vehicles",
  Devices = "devices",
  Transporter = "transporter",
  ManageTechnician = "manage_technician",
  Client = "client",
  UserGroups = "user_groups",
  VehicleDetail = "vehicle_detail",
  DriverDetail = "driver_detail",
  Geofence = "geofence",
  PaymentDetail = "payment_detail",
  Enquiry = "enquiry",
  DeviceInventory = "device_inventory",

  // ManageTechnician children
  TechnicianList = "technician_list",
  JobSheet = "job_sheet",

  // UserGroups children
  User = "user",
  Group = "group",

  // Reports children
  CoinBanking = "coin_banking",
  DistanceReport = "distance_report",
  DriverAssignmentReport = "driver_assignment_report",
  ExpenseReport = "expense_report",
  GeofenceReport = "geofence_report",
  GoogleMapApiRecord = "google_map_api_record",
  IdleSummaryReport = "idle_summary_report",
  PoiReport = "poi_report",
  RegisterMobileReport = "register_mobile_report",
  RideReport = "ride_report",
  SendCommandLogs = "send_command_logs",
  SensorReport = "sensor_report",
  SimTrackingReport = "sim_tracking_report",
  SpeedAndDistance = "speed_and_distance",
  StatusReport = "status_report",
  StoppageSummaryReport = "stoppage_summary_report",
  SubscriptionChangeReport = "subscription_change_report",
  SubscriptionExpiredReport = "subscription_expired_report",
  TravelSummaryReport = "travel_summary_report",
  VehicleLogReport = "vehicle_log_report",

  // Alerts children
  AddAlerts = "add_alerts",
  NotificationList = "notification_list",
  ServiceMaintenance = "service_maintenance",
  ParkedScheduler = "parked_scheduler",
  Announcement = "announcement",

  // Support children
  RaiseTicket = "raise_ticket",
  AnswerTicket = "answer_ticket",
  Policy = "policy",
}
