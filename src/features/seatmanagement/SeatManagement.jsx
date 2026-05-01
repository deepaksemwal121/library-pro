import React, { useEffect, useMemo, useState } from "react";
import { Plus, Settings } from "lucide-react";
import supabase from "../../../helpers/supabase";
import { getPaymentStatus, mapMemberFromDb } from "../members/memberUtils";
import { createFloorId, getSeatRange, loadSeatFloors, saveSeatFloors } from "./seatSettings";

const statusClasses = {
  green: "text-emerald-700 bg-emerald-50 border-emerald-200",
  yellow: "text-yellow-800 bg-yellow-50 border-yellow-200",
  red: "text-red-700 bg-red-50 border-red-200",
};

const initialFloorForm = {
  name: "",
  price: "",
  startSeat: "",
  seatCount: "",
};

const initialSeatForm = {
  startSeat: "",
  seatCount: "",
};

const initialSeatPriceForm = {
  seatNumber: "",
  price: "",
};

export const SeatManagement = ({ onSeatSelect = () => {}, isLockerChecked = false, occupiedSeats, occupiedMembers, allowConfiguration = true }) => {
  const [floors, setFloors] = useState(loadSeatFloors);
  const [activeFloorId, setActiveFloorId] = useState(floors[0]?.id ?? "second");
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [dbOccupiedMembers, setDbOccupiedMembers] = useState([]);
  const [isLoadingSeats, setIsLoadingSeats] = useState(!occupiedMembers && !occupiedSeats);
  const [seatError, setSeatError] = useState("");
  const [floorForm, setFloorForm] = useState(initialFloorForm);
  const [seatForm, setSeatForm] = useState(initialSeatForm);
  const [seatPriceForm, setSeatPriceForm] = useState(initialSeatPriceForm);

  const activeFloor = floors.find((floor) => floor.id === activeFloorId) ?? floors[0];
  const resolvedActiveFloorId = activeFloor?.id ?? "";
  const activeSeats = activeFloor?.seats ?? [];
  const allSeatNumbers = useMemo(() => new Set(floors.flatMap((floor) => floor.seats)), [floors]);
  const hasProvidedSeatData = Boolean(occupiedMembers || occupiedSeats);
  const memberDetails = occupiedMembers ?? dbOccupiedMembers;
  const memberBySeat = useMemo(
    () => new Map(memberDetails.map((member) => [Number(member.seatNumber), member])),
    [memberDetails],
  );
  const occupiedSeatSet = useMemo(() => new Set(occupiedSeats ?? memberDetails.map((member) => member.seatNumber)), [memberDetails, occupiedSeats]);
  const hoveredMember = hoveredSeat ? memberBySeat.get(hoveredSeat) : null;
  const occupiedOnFloor = activeSeats.filter((seat) => occupiedSeatSet.has(seat)).length;
  const availableOnFloor = activeSeats.length - occupiedOnFloor;
  const shouldBlockSeatActions = isLoadingSeats && !hasProvidedSeatData;

  useEffect(() => {
    saveSeatFloors(floors);
  }, [floors]);

  useEffect(() => {
    if (hasProvidedSeatData) return undefined;

    let ignore = false;

    const fetchOccupiedMembers = async () => {
      setIsLoadingSeats(true);
      setSeatError("");

      const { data, error } = await supabase
        .from("library_members")
        .select("*")
        .eq("member_status", "active");

      if (ignore) return;

      if (error) {
        setSeatError(error.message);
        setDbOccupiedMembers([]);
      } else {
        setDbOccupiedMembers(data.map(mapMemberFromDb));
      }

      setIsLoadingSeats(false);
    };

    fetchOccupiedMembers();

    return () => {
      ignore = true;
    };
  }, [hasProvidedSeatData]);

  const updateActiveFloorPrice = (price) => {
    setFloors((previousFloors) =>
      previousFloors.map((floor) => (floor.id === resolvedActiveFloorId ? { ...floor, price: Number(price) || 0 } : floor)),
    );
  };

  const getSeatPrice = (seatNumber, floor = activeFloor) => {
    if (!floor) {
      return 0;
    }

    return Number(floor.seatPrices?.[seatNumber]) || Number(floor.price) || 0;
  };

  const handleAddFloor = (event) => {
    event.preventDefault();

    const seats = getSeatRange(floorForm.startSeat, floorForm.seatCount).filter((seat) => !allSeatNumbers.has(seat));

    if (!floorForm.name.trim() || !floorForm.price || seats.length === 0) {
      return;
    }

    const newFloor = {
      id: createFloorId(floorForm.name),
      name: floorForm.name.trim(),
      price: Number(floorForm.price),
      seatPrices: {},
      seats,
    };

    setFloors((previousFloors) => [...previousFloors, newFloor]);
    setActiveFloorId(newFloor.id);
    setSelectedSeat(null);
    setHoveredSeat(null);
    setFloorForm(initialFloorForm);
  };

  const handleAddSeats = (event) => {
    event.preventDefault();

    const seats = getSeatRange(seatForm.startSeat, seatForm.seatCount).filter((seat) => !allSeatNumbers.has(seat));

    if (!activeFloor || seats.length === 0) {
      return;
    }

    setFloors((previousFloors) =>
      previousFloors.map((floor) =>
        floor.id === resolvedActiveFloorId
          ? {
              ...floor,
              seats: [...floor.seats, ...seats].sort((first, second) => first - second),
            }
          : floor,
      ),
    );
    setSeatForm(initialSeatForm);
  };

  const handleSetSeatPrice = (event) => {
    event.preventDefault();

    const seatNumber = Number(seatPriceForm.seatNumber);
    const price = Number(seatPriceForm.price);

    if (!activeFloor || !activeFloor.seats.includes(seatNumber) || price < 0) {
      return;
    }

    setFloors((previousFloors) =>
      previousFloors.map((floor) =>
        floor.id === resolvedActiveFloorId
          ? {
              ...floor,
              seatPrices: {
                ...(floor.seatPrices || {}),
                [seatNumber]: price,
              },
            }
          : floor,
      ),
    );
    setSeatPriceForm(initialSeatPriceForm);
  };

  const handleSelect = (seatNumber) => {
    if (shouldBlockSeatActions) return;
    if (occupiedSeatSet.has(seatNumber)) return;
    if (!activeFloor) return;

    setSelectedSeat(seatNumber);
    const baseFee = getSeatPrice(seatNumber);
    const totalFee = isLockerChecked ? baseFee + 500 : baseFee;

    // Pass this data back to your Registration Form
    onSeatSelect({ seatNumber, floor: activeFloor.name, floorId: activeFloor.id, baseFee, totalFee });
  };

  return (
    <div className="rounded-lg bg-gray-50 p-3 shadow-md sm:p-4">
      {allowConfiguration && (
        <div className="mb-5 grid gap-4 border border-slate-200 bg-white p-3 sm:p-4 lg:grid-cols-[1fr_1fr]">
          <form className="space-y-3" onSubmit={handleAddFloor}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Settings size={16} />
              New Floor
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={floorForm.name}
                onChange={(event) => setFloorForm((previous) => ({ ...previous, name: event.target.value }))}
                className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm outline-blue-500"
                placeholder="Third Floor"
              />
              <input
                type="number"
                min="1"
                value={floorForm.price}
                onChange={(event) => setFloorForm((previous) => ({ ...previous, price: event.target.value }))}
                className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm outline-blue-500"
                placeholder="Monthly price"
              />
              <input
                type="number"
                min="1"
                value={floorForm.startSeat}
                onChange={(event) => setFloorForm((previous) => ({ ...previous, startSeat: event.target.value }))}
                className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm outline-blue-500"
                placeholder="Start seat"
              />
              <input
                type="number"
                min="1"
                value={floorForm.seatCount}
                onChange={(event) => setFloorForm((previous) => ({ ...previous, seatCount: event.target.value }))}
                className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm outline-blue-500"
                placeholder="Seat count"
              />
            </div>
            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto">
              <Plus size={16} />
              Add Floor
            </button>
          </form>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-800">Active Floor Setup</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Floor Price</label>
                <input
                  type="number"
                  min="0"
                  value={activeFloor?.price ?? ""}
                  onChange={(event) => updateActiveFloorPrice(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-sm outline-blue-500"
                />
              </div>
              <form className="grid grid-cols-[1fr_1fr_44px] gap-2" onSubmit={handleAddSeats}>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Start</label>
                  <input
                    type="number"
                    min="1"
                    value={seatForm.startSeat}
                    onChange={(event) => setSeatForm((previous) => ({ ...previous, startSeat: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-sm outline-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Count</label>
                  <input
                    type="number"
                    min="1"
                    value={seatForm.seatCount}
                    onChange={(event) => setSeatForm((previous) => ({ ...previous, seatCount: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-sm outline-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  aria-label="Add seats"
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  <Plus size={16} />
                </button>
              </form>
            </div>
            <form className="grid gap-3 sm:grid-cols-[1fr_1fr_120px]" onSubmit={handleSetSeatPrice}>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Seat Number</label>
                <input
                  type="number"
                  min="1"
                  value={seatPriceForm.seatNumber}
                  onChange={(event) => setSeatPriceForm((previous) => ({ ...previous, seatNumber: event.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-sm outline-blue-500"
                  placeholder="Seat"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Seat Price</label>
                <input
                  type="number"
                  min="0"
                  value={seatPriceForm.price}
                  onChange={(event) => setSeatPriceForm((previous) => ({ ...previous, price: event.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-sm outline-blue-500"
                  placeholder="Monthly price"
                />
              </div>
              <button type="submit" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 sm:mt-5">
                Set Price
              </button>
            </form>
            <p className="text-xs text-slate-500">Seat numbers are kept unique across floors to match existing member records.</p>
          </div>
        </div>
      )}

      {/* Floor Toggles */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {floors.map((floor) => (
            <button
              type="button"
              key={floor.id}
              onClick={() => {
                setActiveFloorId(floor.id);
                setSelectedSeat(null);
                setHoveredSeat(null);
              }}
              className={`rounded px-3 py-2 text-sm sm:px-4 ${resolvedActiveFloorId === floor.id ? "bg-blue-600 text-white" : "bg-gray-200 text-slate-700"}`}
            >
              {floor.name} (Rs.{floor.price})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">
            Total: {activeFloor?.seats.length ?? 0}
          </span>
          <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
            Available: {shouldBlockSeatActions ? "--" : availableOnFloor}
          </span>
          <span className="border border-slate-300 bg-slate-100 px-2 py-1 text-slate-600">
            Occupied: {shouldBlockSeatActions ? "--" : occupiedOnFloor}
          </span>
        </div>
      </div>

      {seatError && <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{seatError}</div>}
      {shouldBlockSeatActions && (
        <div className="mb-4 flex items-center gap-3 border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
          <span className="h-4 w-4 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
          Loading seat availability...
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Grid Container */}
        <div className="grid auto-rows-[52px] grid-cols-3 items-start gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6 xl:grid-cols-8">
          {activeSeats.map((seat) => {
            const occupiedMember = memberBySeat.get(seat);
            const isOccupied = !shouldBlockSeatActions && occupiedSeatSet.has(seat);
            const seatPrice = getSeatPrice(seat);
            const hasCustomPrice = Number(activeFloor?.seatPrices?.[seat]) > 0;
            const seatTitle = occupiedMember
              ? `Seat ${seat}: ${occupiedMember.fullName}, ${occupiedMember.phoneNumber}`
              : shouldBlockSeatActions
                ? `Seat ${seat}: loading availability`
                : `Seat ${seat}: available`;

            return (
              <button
                type="button"
                key={seat}
                aria-disabled={isOccupied || shouldBlockSeatActions}
                title={seatTitle}
                onMouseEnter={() => !shouldBlockSeatActions && setHoveredSeat(seat)}
                onFocus={() => !shouldBlockSeatActions && setHoveredSeat(seat)}
                onClick={() => handleSelect(seat)}
                className={`h-[52px] border p-2 text-center text-sm transition-colors ${
                  shouldBlockSeatActions
                    ? "cursor-wait bg-slate-100 text-slate-300 border-slate-200 animate-pulse"
                    : isOccupied
                      ? "cursor-help bg-gray-200 text-gray-500 border-gray-300 hover:bg-gray-300"
                      : selectedSeat === seat
                        ? "cursor-pointer bg-blue-500 text-white border-blue-700"
                      : "cursor-pointer bg-white hover:border-blue-400"
                }`}
              >
                <span>{seat}</span>
                {hasCustomPrice && <span className="mt-1 block text-[10px] leading-none">Rs.{seatPrice}</span>}
              </button>
            );
          })}
        </div>

        <aside className="border border-slate-200 bg-white p-4 text-sm lg:sticky lg:top-0 lg:self-start">
          <h3 className="font-semibold text-slate-800">Seat Details</h3>
          {isLoadingSeats && <p className="mt-3 text-slate-500">Loading seat occupancy...</p>}

          {!isLoadingSeats && hoveredMember && (
            <div className="mt-3 space-y-2 text-slate-700">
              <div className="text-lg font-bold text-slate-900">Seat {hoveredMember.seatNumber}</div>
              <div>
                <span className="text-slate-500">Member:</span> {hoveredMember.fullName}
              </div>
              <div>
                <span className="text-slate-500">Phone:</span> {hoveredMember.phoneNumber}
              </div>
              <div>
                <span className="text-slate-500">Locker:</span> {hoveredMember.isLockerTaken ? "Yes" : "No"}
              </div>
              <div>
                <span className="text-slate-500">Registered:</span> {hoveredMember.registrationDate}
              </div>
              <div>
                <span className="text-slate-500">Paid until:</span> {hoveredMember.paidUntil}
              </div>
              <span className={`inline-block border px-2 py-0.5 font-semibold ${statusClasses[getPaymentStatus(hoveredMember.paidUntil).tone]}`}>
                {getPaymentStatus(hoveredMember.paidUntil).label}
              </span>
            </div>
          )}

          {!isLoadingSeats && hoveredSeat && !hoveredMember && (
            <div className="mt-3 space-y-2 text-slate-700">
              <div className="text-lg font-bold text-slate-900">Seat {hoveredSeat}</div>
              <div>
                <span className="text-slate-500">Monthly price:</span> Rs.{getSeatPrice(hoveredSeat)}
              </div>
              <span className="inline-block border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                Available
              </span>
            </div>
          )}

          {!isLoadingSeats && !hoveredSeat && <p className="mt-3 text-slate-500">Hover over a seat to inspect availability.</p>}
        </aside>
      </div>
    </div>
  );
};
