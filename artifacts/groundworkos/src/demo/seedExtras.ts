/**
 * Demo-only seed data that the API server's own seed script doesn't cover:
 * the signed-in demo user, company settings (so the onboarding wizard is
 * skipped), timesheets, purchase orders, RAMS records and some audit history.
 *
 * Every company, person and number here is fictional.
 */
import type { Database } from "@workspace/db";
import {
  userTable,
  companySettingsTable,
  timesheetsTable,
  purchaseOrdersTable,
  ramsTable,
  auditLogsTable,
} from "@workspace/db/schema";

export const DEMO_USER = {
  id: "demo-user",
  name: "Demo Manager",
  email: "demo@groundworkos.example",
  role: "admin",
};

function day(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

function ago(hours: number) {
  return new Date(Date.now() - hours * 3600_000);
}

export async function seedExtras(db: Database) {
  const now = new Date();

  await db.insert(userTable).values({
    ...DEMO_USER,
    emailVerified: true,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(companySettingsTable).values({
    id: 1,
    data: {
      companyName: "Hartwell Groundworks Ltd (Demo)",
      companyNumber: "00000000",
      vatNumber: "GB 000 0000 00",
      utrNumber: "0000000000",
      cisReference: "000/DEMO",
      address: "Unit 4, Example Business Park, Anytown, AB1 2CD",
      invoicePrefix: "INV",
      quotePrefix: "QT",
      jobPrefix: "GW",
      paymentTerms: "30",
      streetWorksLicenceRef: "SWL-DEMO-001",
      defaultPermitAuthority: "Example County Council",
      bankName: "Demo Bank",
      sortCode: "00-00-00",
      accountNumber: "00000000",
      taxYearStart: "04-06",
      filingReminderDays: "7",
    },
    updatedAt: now,
  });

  const workers: [string, number][] = [
    ["Dave Walters", 220],
    ["Colin Sharp", 210],
    ["Raj Patel", 220],
    ["Tom Price", 180],
    ["Liam Doyle", 170],
  ];
  const jobsFor = ["j1", "j2", "j4", "j1", "j3"];
  const timesheets = [];
  for (let d = 0; d <= 10; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    for (let w = 0; w < workers.length; w++) {
      const [name, rate] = workers[w];
      const hours = w === 4 && d % 3 === 0 ? 6 : 8;
      timesheets.push({
        id: `ts-${d}-${w}`,
        jobId: jobsFor[w],
        workerName: name,
        workDate: date.toISOString().split("T")[0],
        hoursWorked: hours,
        dayRate: rate,
        cost: Math.round((rate * hours) / 8),
        description: null,
        createdBy: DEMO_USER.id,
      });
    }
  }
  await db.insert(timesheetsTable).values(timesheets);

  const year = new Date().getFullYear();
  await db.insert(purchaseOrdersTable).values([
    {
      id: "po1",
      poNumber: `PO-${year}-001`,
      jobId: "j1",
      supplier: "Example Pipe Supplies",
      description: "150mm uPVC drainage pipe x 60 lengths, bends and junctions",
      amount: 4280,
      vatAmount: 856,
      totalAmount: 5136,
      status: "received",
      orderDate: day(-21),
      expectedDelivery: day(-16),
      deliveryDate: day(-15),
    },
    {
      id: "po2",
      poNumber: `PO-${year}-002`,
      jobId: "j2",
      supplier: "Demo Ready-Mix Concrete",
      description: "C32/40 concrete, 48m³ for pile caps grid A",
      amount: 6720,
      vatAmount: 1344,
      totalAmount: 8064,
      status: "ordered",
      orderDate: day(-4),
      expectedDelivery: day(3),
    },
    {
      id: "po3",
      poNumber: `PO-${year}-003`,
      jobId: "j3",
      supplier: "Sample Aggregates Ltd",
      description: "Type 1 MOT sub-base, 120 tonnes",
      amount: 2640,
      vatAmount: 528,
      totalAmount: 3168,
      status: "draft",
      orderDate: day(-1),
      expectedDelivery: day(6),
    },
    {
      id: "po4",
      poNumber: `PO-${year}-004`,
      jobId: "j4",
      supplier: "Example Plant Hire",
      description: "3t mini excavator hire, 2 weeks",
      amount: 1150,
      vatAmount: 230,
      totalAmount: 1380,
      status: "invoiced",
      orderDate: day(-8),
      expectedDelivery: day(-6),
    },
  ]);

  await db.insert(ramsTable).values([
    {
      id: "rams1",
      jobId: "j1",
      title: "Deep drainage excavation - 3m trench",
      activity: "Excavation over 1.2m with trench support boxes",
      riskLevel: "high",
      status: "active",
      hazards: JSON.stringify([
        { hazard: "Trench collapse", whoAtRisk: "Operatives", controls: "See method statement", riskBefore: "high", riskAfter: "low" },
        { hazard: "Buried services", whoAtRisk: "Operatives", controls: "See method statement", riskBefore: "high", riskAfter: "low" },
        { hazard: "Falls into excavation", whoAtRisk: "Operatives", controls: "See method statement", riskBefore: "high", riskAfter: "low" },
        { hazard: "Plant/pedestrian interface", whoAtRisk: "Operatives", controls: "See method statement", riskBefore: "high", riskAfter: "low" },
      ]),
      ppe: JSON.stringify(["Hard hat", "Hi-vis", "Safety boots", "Gloves"]),
      briefedAt: ago(72),
      briefedBy: "Dave Walters",
      attendees: JSON.stringify(
        ["Dave Walters", "Tom Price", "Liam Doyle"].map((name) => ({
          name,
          role: "Operative",
          subcontractorId: null,
          acknowledged: true,
          acknowledgedAt: ago(72).toISOString(),
        })),
      ),
      reviewDate: day(25),
    },
    {
      id: "rams2",
      jobId: "j2",
      title: "Concrete pour - pile caps",
      activity: "Pumped concrete pour and vibration",
      riskLevel: "medium",
      status: "active",
      hazards: JSON.stringify([
        { hazard: "Wet concrete burns", whoAtRisk: "Operatives", controls: "See method statement", riskBefore: "high", riskAfter: "low" },
        { hazard: "Hand-arm vibration", whoAtRisk: "Operatives", controls: "See method statement", riskBefore: "high", riskAfter: "low" },
        { hazard: "Pump line failure", whoAtRisk: "Operatives", controls: "See method statement", riskBefore: "high", riskAfter: "low" },
      ]),
      ppe: JSON.stringify(["Hard hat", "Hi-vis", "Wellington boots", "Gauntlets", "Eye protection"]),
      reviewDate: day(40),
    },
    {
      id: "rams3",
      jobId: "j4",
      title: "Utility ducting in live carriageway",
      activity: "Excavation and ducting under traffic management",
      riskLevel: "high",
      status: "draft",
      hazards: JSON.stringify([
        { hazard: "Live traffic", whoAtRisk: "Operatives", controls: "See method statement", riskBefore: "high", riskAfter: "low" },
        { hazard: "Gas mains", whoAtRisk: "Operatives", controls: "See method statement", riskBefore: "high", riskAfter: "low" },
        { hazard: "Underground electricity cables", whoAtRisk: "Operatives", controls: "See method statement", riskBefore: "high", riskAfter: "low" },
      ]),
      ppe: JSON.stringify(["Hard hat", "Class 3 hi-vis", "Safety boots"]),
      reviewDate: day(14),
    },
  ]);

  const log = (
    entityType: string,
    entityId: string,
    action: string,
    changes: Record<string, unknown> | null,
    hoursAgo: number,
  ) => ({
    id: `al-${entityType}-${entityId}-${hoursAgo}`,
    entityType,
    entityId,
    action,
    changes,
    userId: DEMO_USER.id,
    userName: DEMO_USER.name,
    userEmail: DEMO_USER.email,
    createdAt: ago(hoursAgo),
  });
  await db.insert(auditLogsTable).values([
    log("job", "j1", "update", { progressPercent: 72 }, 2),
    log("purchase_order", "po3", "create", { supplier: "Sample Aggregates Ltd" }, 20),
    log("invoice", "inv-demo", "update", { status: "paid" }, 30),
    log("timesheet", "ts-1-0", "create", { workerName: "Dave Walters" }, 26),
    log("rams", "rams1", "update", { status: "active" }, 72),
    log("client", "c3", "update", { notes: "Preferred subcontractor status" }, 120),
  ]);
}
