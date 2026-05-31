const STORAGE_KEY = "librarypro-seat-settings";

export const defaultSeatFloors = [
  {
    id: "second",
    name: "Second Floor",
    price: 1100,
    lockerAvailable: true,
    seatPrices: {},
    seats: Array.from({ length: 29 }, (_, index) => index + 1),
  },
  {
    id: "first",
    name: "First Floor",
    price: 900,
    lockerAvailable: true,
    seatPrices: {},
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
