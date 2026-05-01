const STORAGE_KEY = "librarypro-seat-settings";

export const defaultSeatFloors = [
  {
    id: "second",
    name: "Second Floor",
    price: 1100,
    seatPrices: {},
    seats: Array.from({ length: 29 }, (_, index) => index + 1),
  },
  {
    id: "first",
    name: "First Floor",
    price: 900,
    seatPrices: {},
    seats: Array.from({ length: 56 }, (_, index) => index + 30),
  },
];

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

export const loadSeatFloors = () => {
  try {
    const savedFloors = localStorage.getItem(STORAGE_KEY);

    if (!savedFloors) {
      return defaultSeatFloors;
    }

    const parsedFloors = JSON.parse(savedFloors);

    if (!Array.isArray(parsedFloors) || parsedFloors.length === 0) {
      return defaultSeatFloors;
    }

    return parsedFloors.map((floor) => ({
      ...floor,
      price: Number(floor.price) || 0,
      seatPrices: Object.fromEntries(
        Object.entries(floor.seatPrices || {}).map(([seat, price]) => [seat, Number(price) || 0]),
      ),
      seats: [...new Set((floor.seats || []).map(Number).filter(Boolean))].sort((first, second) => first - second),
    }));
  } catch {
    return defaultSeatFloors;
  }
};

export const saveSeatFloors = (floors) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(floors));
};

export const getSeatBaseFeeFromSettings = (seatNumber) => {
  const seat = Number(seatNumber);
  const floor = loadSeatFloors().find((item) => item.seats.includes(seat));

  if (floor) {
    return Number(floor.seatPrices?.[seat]) || Number(floor.price) || 0;
  }

  return seat <= 29 ? 1100 : 900;
};
