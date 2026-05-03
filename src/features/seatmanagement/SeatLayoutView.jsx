import React, { useEffect, useMemo, useState } from "react";
import supabase from "../../../helpers/supabase";
import { mapMemberFromDb } from "../members/memberUtils";
import { loadSeatFloors, getSeatPrice } from "./seatSettings";

export const SeatLayoutView = ({
  currentSeatNumber = null,
  currentFloor = null,
  occupiedMembers = null,
  occupiedSeats = null,
}) => {
  const [floors, setFloors] = useState(loadSeatFloors);
  const [activeFloorId, setActiveFloorId] = useState(currentFloor ?? floors[0]?.id ?? "second");
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [dbOccupiedMembers, setDbOccupiedMembers] = useState([]);
  const [isLoadingSeats, setIsLoadingSeats] = useState(!occupiedMembers && !occupiedSeats);
  const [seatError, setSeatError] = useState("");

  const activeFloor = floors.find((floor) => floor.id === activeFloorId) ?? floors[0];
  const resolvedActiveFloorId = activeFloor?.id ?? "";
  const activeSeats = activeFloor?.seats ?? [];
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

  const getSeatPriceValue = (seat) => {
    const customPrice = Number(activeFloor?.seatPrices?.[seat]) || 0;
    return customPrice > 0 ? customPrice : activeFloor?.price || 0;
  };

  return (
    <div className="space-y-4">
      {/* Floor Toggles */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {floors.map((floor) => (
            <button
              type="button"
              key={floor.id}
              onClick={() => {
                setActiveFloorId(floor.id);
                setHoveredSeat(null);
              }}
              className={`rounded px-3 py-2 text-sm ${
                resolvedActiveFloorId === floor.id ? "bg-blue-600 text-white" : "bg-gray-200 text-slate-700"
              }`}
            >
              {floor.name} (Rs.{floor.price})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">Total: {activeFloor?.seats.length ?? 0}</span>
          <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">Available: {shouldBlockSeatActions ? "--" : availableOnFloor}</span>
          <span className="border border-slate-300 bg-slate-100 px-2 py-1 text-slate-600">Occupied: {shouldBlockSeatActions ? "--" : occupiedOnFloor}</span>
        </div>
      </div>

      {seatError && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700 rounded">{seatError}</div>}
      
      {shouldBlockSeatActions && (
        <div className="flex items-center gap-3 border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 rounded">
          <span className="h-4 w-4 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
          Loading seat availability...
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Seat Grid */}
        <div className="grid auto-rows-[52px] grid-cols-3 items-start gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6 xl:grid-cols-8">
          {activeSeats.map((seat) => {
            const occupiedMember = memberBySeat.get(seat);
            const isOccupied = !shouldBlockSeatActions && occupiedSeatSet.has(seat);
            const isCurrent = currentSeatNumber === seat;
            const seatPriceValue = getSeatPriceValue(seat);
            const hasCustomPrice = Number(activeFloor?.seatPrices?.[seat]) > 0;
            const seatTitle = occupiedMember
              ? `Seat ${seat}: ${occupiedMember.fullName}, ${occupiedMember.phoneNumber}`
              : shouldBlockSeatActions
                ? `Seat ${seat}: loading availability`
                : `Seat ${seat}: available`;

            return (
              <div
                key={seat}
                title={seatTitle}
                onMouseEnter={() => !shouldBlockSeatActions && setHoveredSeat(seat)}
                onMouseLeave={() => setHoveredSeat(null)}
                onFocus={() => !shouldBlockSeatActions && setHoveredSeat(seat)}
                className={`h-[52px] border p-2 text-center text-sm transition-colors flex items-center justify-center flex-col ${
                  shouldBlockSeatActions
                    ? "cursor-wait bg-slate-100 text-slate-300 border-slate-200 animate-pulse"
                    : isOccupied
                      ? "cursor-help bg-gray-200 text-gray-500 border-gray-300"
                      : isCurrent
                        ? "cursor-pointer bg-blue-500 text-white border-blue-700 font-semibold"
                        : "cursor-default bg-white border-slate-200 hover:border-blue-400"
                }`}
              >
                <span className="font-medium">{seat}</span>
                {hasCustomPrice && <span className="text-[10px] leading-none">Rs.{seatPriceValue}</span>}
              </div>
            );
          })}
        </div>

        {/* Seat Details Sidebar */}
        <aside className="border border-slate-200 bg-white p-4 text-sm rounded lg:sticky lg:top-0 lg:self-start">
          <h3 className="font-semibold text-slate-800 mb-3">Seat Information</h3>
          
          {isLoadingSeats && <p className="text-slate-500">Loading seat occupancy...</p>}

          {!isLoadingSeats && currentSeatNumber && (
            <div className="space-y-2 border-b pb-3 mb-3">
              <div>
                <div className="text-xs text-slate-500 font-semibold">Your Current Seat</div>
                <div className="text-lg font-bold text-blue-600">Seat {currentSeatNumber}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold">Floor</div>
                <div className="text-slate-700">{currentFloor || activeFloor.name}</div>
              </div>
            </div>
          )}

          {!isLoadingSeats && hoveredMember && (
            <div className="space-y-2 border-t pt-3">
              <div>
                <div className="text-xs font-semibold text-slate-500">Occupied Seat</div>
                <div className="text-lg font-bold text-slate-800">Seat {hoveredSeat}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">Member</div>
                <div className="font-medium text-slate-800">{hoveredMember.fullName}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">Contact</div>
                <div className="text-slate-600 text-sm font-mono">{hoveredMember.phoneNumber}</div>
              </div>
            </div>
          )}

          {!isLoadingSeats && !hoveredMember && !currentSeatNumber && (
            <p className="text-slate-500 text-sm">Hover over a seat to view member details</p>
          )}

          <div className="mt-4 space-y-2 border-t pt-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-slate-300 rounded"></div>
              <span className="text-slate-600">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
              <span className="text-slate-600">Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 border border-blue-700 rounded"></div>
              <span className="text-slate-600">Your Seat</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
