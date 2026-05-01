import { useState } from "react";
import { Eye } from "lucide-react";
import { MemberDetailsDialog } from "./MemberDetailsDialog";
import { getPaymentStatus } from "./memberUtils";

const statusClasses = {
  green: "text-emerald-700 bg-emerald-50 border-emerald-200",
  yellow: "text-yellow-800 bg-yellow-50 border-yellow-200",
  red: "text-red-700 bg-red-50 border-red-200",
};

export const MembersTable = ({ members = [], loading = false, onMarkPaid = () => {}, onSaveMember = () => {}, onMarkLeft = () => {} }) => {
  const [selectedMember, setSelectedMember] = useState(null);

  return (
    <>
      <div className="border border-slate-300 rounded-sm overflow-hidden bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide border-r border-slate-300">Member</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide border-r border-slate-300">Contact</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide border-r border-slate-300">Seat</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide border-r border-slate-300">Locker</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide border-r border-slate-300">Paid Until</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide border-r border-slate-300">Status</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading && (
              <tr>
                <td colSpan="7" className="px-4 py-6 text-center text-sm text-slate-500">
                  Loading members...
                </td>
              </tr>
            )}

            {!loading && members.length === 0 && (
              <tr>
                <td colSpan="7" className="px-4 py-6 text-center text-sm text-slate-500">
                  No members registered yet.
                </td>
              </tr>
            )}

            {!loading &&
              members.map((member, index) => {
                const paymentStatus = getPaymentStatus(member.paidUntil);

                return (
                  <tr key={member.id} className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-sky-50 transition-colors`}>
                    <td className="px-4 py-3 text-sm text-slate-800 border-r border-slate-200">{member.fullName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-200 font-mono">{member.phoneNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-200">
                      {member.seatNumber} <span className="text-xs text-slate-400">({member.seatFloor} floor)</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-200">{member.isLockerTaken ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-200">{member.paidUntil}</td>
                    <td className="px-4 py-3 text-sm border-r border-slate-200">
                      <span className={`font-semibold px-2 py-0.5 border rounded-sm ${statusClasses[paymentStatus.tone]}`}>
                        {paymentStatus.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedMember(member)}
                          className="inline-flex items-center gap-1 px-3 py-1 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-sm"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => onMarkPaid(member.id)}
                          className="px-3 py-1 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-sm"
                        >
                          Mark Paid
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div className="bg-slate-100 border-t border-slate-300 px-4 py-2 flex justify-between items-center text-xs text-slate-600">
          <span>Showing {members.length} records</span>
          <div className="flex gap-1">
            <button className="px-2 py-1 border border-slate-300 bg-white hover:bg-slate-50">Prev</button>
            <button className="px-2 py-1 border border-slate-300 bg-white hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      <MemberDetailsDialog
        key={selectedMember?.id ?? "member-details"}
        member={selectedMember}
        members={members}
        open={Boolean(selectedMember)}
        onOpenChange={(isOpen) => !isOpen && setSelectedMember(null)}
        onSave={async (...args) => {
          const didSave = await onSaveMember(...args);
          if (didSave) {
            setSelectedMember(null);
          }
        }}
        onMarkLeft={async (...args) => {
          const didMarkLeft = await onMarkLeft(...args);
          if (didMarkLeft) {
            setSelectedMember(null);
          }
        }}
      />
    </>
  );
};
