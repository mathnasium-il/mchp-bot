import axios from "axios";
import { formatInTimeZone } from "date-fns-tz";
import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "../../.env.local") });

export const [username, password] = [
  process.env.DAYSMART_SITE_ID!,
  process.env.DAYSMART_API_KEY!,
];

const daySmartClient = axios.create({
  baseURL: "https://ws.appointment-plus.com",
  auth: { username, password },
  params: {
    response_type: "JSON",
  },
  headers: {
    Accept: "application/json",
  },
});

interface Child {
  child_id: string;
  c_id: string;
  customer_id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  birth_date: string;
  notes: string;
  age: string;
}

interface DaySmartAppointment {
  c_id: string;
  appt_id: string;
  globalId: string;
  customer_id: string;
  account: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  email: string;
  employee_id: string;
  staff_screen_name: string;
  staff_type_id: string;
  pet_id: string;
  room_id: null;
  date: string;
  start_time: number;
  end_time: number;
  service_id: string;
  service: string;
  event_template_id: null;
  customer_notes: string;
  employee_notes: string;
  status_id: string;
  appt_status_description: string;
  rep_id: string;
  cost: string;
  tip: string;
  payment_type_id: string;
  coupon_id: string;
  coupon_code: string;
  type_id: string;
  spots: string;
  recur_id: string;
  reason: string;
  createTimestamp: string;
  creation_emp_id: string;
  lastUpdateTimestamp: string;
  last_emp_id: string;
  customer_package_id: string;
  duration_id: string;
  link_id: string;
  location_id: string;
  appt_status_type: string;
  lead_description: null;
  service_time_description: null;
  po_number: null;
  creation_timestamp: string;
  last_timestamp: string;
  action_link_url: string;
  time_zone: Object[];
}

export async function getStudentAppointments() {
  const header = [
    "Child",
    "Duration",
    "Start Time",
    "Service",
    "Calendar (screen name)",
    "Appointment Status",
  ];

  const date = formatInTimeZone(new Date(), "America/Chicago", "yyyyMMdd");

  const request = await daySmartClient.request({
    method: "POST",
    url: "/Appointments/GetAppointments",
    params: { date },
  });

  const response = request.data;
  const appointments = (await response.data) as DaySmartAppointment[];

  if (appointments.length === 0) {
    console.log("No scheduled session today.");
    return [header];
  }

  function formatDuration(start: number, end: number): string {
    const totalMinutes = end - start;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes} minute${minutes === 1 ? "" : "s"}`;
    }

    if (minutes === 0) {
      return `${hours} hour${hours === 1 ? "" : "s"}`;
    }

    return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  function formatTime(minutesSinceMidnight: number): string {
    const hours = Math.floor(minutesSinceMidnight / 60);
    const minutes = minutesSinceMidnight % 60;

    return new Date(0, 0, 0, hours, minutes).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function formatAppointments(appointments: DaySmartAppointment[]) {
    const result = [header];

    for (const appointment of appointments) {
      const {
        customer_id,
        pet_id,
        start_time,
        end_time,
        service,
        staff_screen_name,
        appt_status_description,
      } = appointment;

      const request = await daySmartClient.request({
        method: "POST",
        url: "/Customers/GetChildren",
        params: {
          customer_id,
          child_id: pet_id,
        },
      });

      const response = request.data;
      const child = (await response.data[0]) as Child;

      const formattedAppointment = [
        `${child.first_name} ${child.last_name}`.trim(),
        formatDuration(start_time, end_time),
        formatTime(start_time),
        service,
        staff_screen_name,
        appt_status_description,
      ];

      result.push(formattedAppointment);
    }

    return result;
  }

  const formattedAppointments = await formatAppointments(appointments);
  console.log(
    `${formattedAppointments.length - 1} ${formattedAppointments.length - 1 === 1 ? "appointment" : "appointments"} found and formatted.`,
  );
  return formattedAppointments;
}
