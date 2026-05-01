import React, { useEffect, useMemo, useState } from "react";
import supabase from "../../../helpers/supabase";
import { getPaymentStatus, mapMemberFromDb } from "../members/memberUtils";

const statusClasses = {
  green: "text-emerald-700 bg-emerald-50 border-emerald-200",
  yellow: "text-yellow-800 bg-yellow-50 border-yellow-200",
  red: "text-red-700 bg-red-50 border-red-200",
};

export const SeatManagement = ({ onSeatSelect = () => {}, isLockerChecked = false, occupiedSeats, occupiedMembers }) => {
  const [activeFloor, setActiveFloor] = useState("second"); // 'first' or 'second'
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [dbOccupiedMembers, setDbOccupiedMembers] = useState([]);
  const [isLoadingSeats, setIsLoadingSeats] = useState(!occupiedMembers && !occupiedSeats);
  const [seatError, setSeatError] = useState("");

  // Generate seat arrays
  const secondFloorSeats = Array.from({ length: 29 }, (_, i) => i + 1);
  const firstFloorSeats = Array.from({ length: 56 }, (_, i) => i + 30);
  const activeSeats = activeFloor === "second" ? secondFloorSeats : firstFloorSeats;
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

  const handleSelect = (seatNumber) => {
    if (shouldBlockSeatActions) return;
    if (occupiedSeatSet.has(seatNumber)) return;

    setSelectedSeat(seatNumber);
    const baseFee = activeFloor === "second" ? 1100 : 900;
    const totalFee = isLockerChecked ? baseFee + 500 : baseFee;

    // Pass this data back to your Registration Form
    onSeatSelect({ seatNumber, floor: activeFloor, baseFee, totalFee });
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow-md">
      {/* Floor Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveFloor("second")}
            className={`px-4 py-2 rounded ${activeFloor === "second" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            Second Floor (Rs.1100)
          </button>
          <button
            type="button"
            onClick={() => setActiveFloor("first")}
            className={`px-4 py-2 rounded ${activeFloor === "first" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            First Floor (Rs.900)
          </button>
        </div>
        <div className="flex gap-2 text-xs font-medium">
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

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Grid Container */}
        <div className={`grid gap-3 ${activeFloor === "second" ? "grid-cols-5" : "grid-cols-4 sm:grid-cols-8"}`}>
          {activeSeats.map((seat) => {
            const occupiedMember = memberBySeat.get(seat);
            const isOccupied = !shouldBlockSeatActions && occupiedSeatSet.has(seat);
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
                className={`p-3 text-center border rounded transition-all ${
                  shouldBlockSeatActions
                    ? "cursor-wait bg-slate-100 text-slate-300 border-slate-200 animate-pulse"
                    : isOccupied
                      ? "cursor-help bg-gray-200 text-gray-500 border-gray-300 hover:bg-gray-300"
                      : selectedSeat === seat
                        ? "cursor-pointer bg-blue-500 text-white border-blue-700"
                      : "cursor-pointer bg-white hover:border-blue-400"
                }`}
              >
                {seat}
              </button>
            );
          })}
        </div>

        <aside className="border border-slate-200 bg-white p-4 text-sm">
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
