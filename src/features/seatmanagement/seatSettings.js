const STORAGE_KEY = "librarypro-seat-settings";

const range = (start, count) => Array.from({ length: count }, (_, index) => String(start + index));

const createSeatPositions = (rows) =>
  Object.fromEntries(
    rows.flatMap(({ row, startColumn, seats }) =>
      seats.map((seat, index) => [String(seat), { row, column: startColumn + index }]),
    ),
  );

const defaultSeatLayouts = {
  second: {
    columns: 8,
    rows: 8,
    labels: [
      { label: "Door", row: 1, column: 1 },
      { label: "2nd Floor", row: 1, column: 2, columnSpan: 6, tone: "title" },
      { label: "Aisle", row: 2, column: 1, rowSpan: 7, tone: "aisle" },
      { label: "Wall", row: 2, column: 8, rowSpan: 7, tone: "wall" },
    ],
    seats: createSeatPositions([
      { row: 2, startColumn: 2, seats: range(1, 6) },
      { row: 4, startColumn: 2, seats: range(7, 6) },
      { row: 5, startColumn: 3, seats: range(13, 5) },
      { row: 7, startColumn: 2, seats: range(18, 6) },
      { row: 8, startColumn: 2, seats: range(24, 6) },
    ]),
  },
  first: {
    columns: 10,
    rows: 13,
    labels: [
      { label: "Door", row: 1, column: 1, columnSpan: 2 },
      { label: "1st Floor", row: 1, column: 3, columnSpan: 7, tone: "title" },
      { label: "Aisle", row: 2, column: 1, columnSpan: 2, rowSpan: 10, tone: "aisle" },
      { label: "Wall", row: 2, column: 10, rowSpan: 12, tone: "wall" },
    ],
    seats: createSeatPositions([
      { row: 2, startColumn: 3, seats: range(30, 7) },
      { row: 4, startColumn: 3, seats: range(37, 7) },
      { row: 5, startColumn: 4, seats: range(44, 6) },
      { row: 7, startColumn: 3, seats: range(50, 7) },
      { row: 8, startColumn: 3, seats: range(57, 7) },
      { row: 10, startColumn: 4, seats: range(64, 6) },
      { row: 11, startColumn: 3, seats: range(70, 7) },
      { row: 13, startColumn: 1, seats: range(77, 9) },
    ]),
  },
};

const getDefaultSeatLayout = (floor) => {
  const floorName = floor?.name?.toLowerCase() ?? "";

  if (floor?.id === "second" || floorName.includes("second") || floorName.includes("2nd")) {
    return defaultSeatLayouts.second;
  }

  if (floor?.id === "first" || floorName.includes("first") || floorName.includes("1st")) {
    return defaultSeatLayouts.first;
  }

  return null;
};

export const defaultSeatFloors = [
  {
    id: "second",
    name: "Second Floor",
    price: 1100,
    lockerAvailable: true,
    seatPrices: {},
    layout: defaultSeatLayouts.second,
    seats: Array.from({ length: 29 }, (_, index) => index + 1),
  },
  {
    id: "first",
    name: "First Floor",
    price: 900,
    lockerAvailable: true,
    seatPrices: {},
    layout: defaultSeatLayouts.first,
    seats: Array.from({ length: 56 }, (_, index) => index + 30),
  },
  {
    id: "free",
    name: "Free Floor",
    price: 0,
    lockerAvailable: false,
    seatPrices: {},
    seats: ["A", "B", "C", "D", "E", "F"],
  },
];

export const normalizeSeatId = (seat) => String(seat ?? "").trim();

export const isFreeFloor = (floor) => floor?.id === "free" || floor?.name?.toLowerCase() === "free floor";

const sortSeats = (first, second) => {
  const firstNumber = Number(first);
  const secondNumber = Number(second);

  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
    return firstNumber - secondNumber;
  }

  return normalizeSeatId(first).localeCompare(normalizeSeatId(second), undefined, { numeric: true });
};

const normalizeFloor = (floor) => ({
  ...floor,
  price: Number(floor.price) || 0,
  lockerAvailable: floor.lockerAvailable ?? !isFreeFloor(floor),
  seatPrices: Object.fromEntries(
    Object.entries(floor.seatPrices || {}).map(([seat, price]) => [normalizeSeatId(seat), Number(price) || 0]),
  ),
  layout: floor.layout ?? getDefaultSeatLayout(floor),
  seats: [...new Set((floor.seats || []).map(normalizeSeatId).filter(Boolean))].sort(sortSeats),
});

export const createFloorId = (name) => {
  const baseId = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${baseId || "floor"}-${Date.now().toString(36)}`;
};

export const getSeatRange = (startSeat, seatCount) => {
  const start = Number(startSeat);
  const count = Number(seatCount);

  if (!start || !count || start < 1 || count < 1) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => start + index);
};

const ensureDefaultFloors = (floors) => {
  const normalizedFloors = floors.map(normalizeFloor);
  const existingFloorIds = new Set(normalizedFloors.map((floor) => floor.id));
  const missingDefaults = defaultSeatFloors.filter((floor) => !existingFloorIds.has(floor.id)).map(normalizeFloor);

  return [...normalizedFloors, ...missingDefaults];
};

export const loadSeatFloors = () => {
  try {
    const savedFloors = localStorage.getItem(STORAGE_KEY);

    if (!savedFloors) {
      return ensureDefaultFloors(defaultSeatFloors);
    }

    const parsedFloors = JSON.parse(savedFloors);

    if (!Array.isArray(parsedFloors) || parsedFloors.length === 0) {
      return ensureDefaultFloors(defaultSeatFloors);
    }

    return ensureDefaultFloors(parsedFloors);
  } catch {
    return ensureDefaultFloors(defaultSeatFloors);
  }
};

export const saveSeatFloors = (floors) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(floors));
};

export const getSeatBaseFeeFromSettings = (seatNumber) => {
  const seat = normalizeSeatId(seatNumber);
  const floor = loadSeatFloors().find((item) => item.seats.includes(seat));

  if (floor) {
    return Number(floor.seatPrices?.[seat]) || Number(floor.price) || 0;
  }

  return Number(seat) <= 29 ? 1100 : 900;
};
