import { google } from "googleapis";

const spreadsheets = new Map([
  ["Instruction Scheduler", "1TKA8M9LQciU_NjYczRDpWzhBAYeVFEPPSvhs3UBY4tg"],
] as const);

type SpreadsheetName = Parameters<typeof spreadsheets.get>[0];

const auth = new google.auth.GoogleAuth({
  keyFile: "service-account.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

export async function getSpreadsheetData(
  spreadsheetName: SpreadsheetName,
  range: string,
): Promise<string[][]> {
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = spreadsheets.get(spreadsheetName);
  if (!spreadsheetId) {
    throw new Error(`Spreadsheet with name "${spreadsheetName}" not found.`);
  }
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  if (!res.data.values) {
    throw new Error("No data found in the specified range.");
  }
  return res.data.values;
}

export async function fetchStudentList(status: string): Promise<string> {
  const data = await getSpreadsheetData(
    "Instruction Scheduler",
    "Admin View!O2:AB77",
  );
  const headers = data[0];

  if (!headers) {
    throw new Error(
      "Expected the first row to contain headers, but it was empty.",
    );
  }

  const studentNameColNum = headers.indexOf("Student Name");
  const timeColNum = headers.indexOf("Time");
  const statusColNum = headers.indexOf("Status");

  const studentList =
    `**Today's ${status} Students**\n` +
    data
      .filter(
        (row, i) =>
          i > 0 &&
          row[studentNameColNum] !== "" &&
          row[statusColNum] === status,
      )
      .map((row) =>
        [row[studentNameColNum], `(*${row[timeColNum]}*)`].join(" "),
      )
      .join("\n");

  return studentList || `No ${status.toLowerCase()} students today!`;
}
