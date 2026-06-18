import React, { useMemo } from "react";

const labelToneClasses = {
  aisle: "border-amber-200 bg-amber-50 text-slate-800",
  wall: "border-amber-200 bg-amber-50 text-slate-800",
  title: "border-transparent bg-white text-slate-900",
  default: "border-amber-200 bg-amber-50 text-slate-700",
};

const gridPlacement = ({ row, column, rowSpan = 1, columnSpan = 1 }) => ({
  gridRow: `${row} / span ${rowSpan}`,
  gridColumn: `${column} / span ${columnSpan}`,
});

export const SeatMapGrid = ({ floor, seats, renderSeat, fallbackClassName }) => {
  const layout = floor?.layout;
  const seatSet = useMemo(() => new Set(seats.map(String)), [seats]);

  if (!layout?.seats) {
    return <div className={fallbackClassName}>{seats.map((seat) => renderSeat(String(seat)))}</div>;
  }

  const mappedSeats = Object.entries(layout.seats).filter(([seat]) => seatSet.has(String(seat)));
  const mappedSeatSet = new Set(mappedSeats.map(([seat]) => String(seat)));
  const extraSeats = seats.map(String).filter((seat) => !mappedSeatSet.has(seat));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded border border-slate-200 bg-white p-2">
        <div
          className="grid min-w-max gap-0.5"
          style={{
            gridTemplateColumns: `repeat(${layout.columns}, minmax(64px, 86px))`,
            gridTemplateRows: `repeat(${layout.rows}, 52px)`,
          }}
        >
          {(layout.labels || []).map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className={`flex items-center justify-center border text-xs font-semibold ${
                labelToneClasses[item.tone] || labelToneClasses.default
              }`}
              style={gridPlacement(item)}
            >
              <span style={item.rowSpan > 2 ? { writingMode: "vertical-rl", textOrientation: "mixed" } : undefined}>{item.label}</span>
            </div>
          ))}

          {mappedSeats.map(([seat, position]) => (
            <div key={seat} style={gridPlacement(position)}>
              {renderSeat(seat)}
            </div>
          ))}
        </div>
      </div>

      {extraSeats.length > 0 && <div className={fallbackClassName}>{extraSeats.map((seat) => renderSeat(seat))}</div>}
    </div>
  );
};
