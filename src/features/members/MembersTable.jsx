import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { MemberDetailsDialog } from "./MemberDetailsDialog";
import { getPaymentStatus } from "./memberUtils";

const statusClasses = {
  green: "text-emerald-700 bg-emerald-50 border-emerald-200",
  yellow: "text-yellow-800 bg-yellow-50 border-yellow-200",
  red: "text-red-700 bg-red-50 border-red-200",
};

const MEMBERS_PER_PAGE = 10;

export const MembersTable = ({
  members = [],
  loading = false,
  emptyMessage = "No members registered yet.",
  onMarkPaid = () => {},
  onSaveMember = () => {},
  onMarkLeft = () => {},
}) => {
  const [selectedMember, setSelectedMember] = useState(null);
  const [requestedPage, setRequestedPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(members.length / MEMBERS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const startRecord = members.length === 0 ? 0 : (currentPage - 1) * MEMBERS_PER_PAGE + 1;
  const endRecord = Math.min(currentPage * MEMBERS_PER_PAGE, members.length);
  const visibleMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * MEMBERS_PER_PAGE;
    return members.slice(startIndex, startIndex + MEMBERS_PER_PAGE);
  }, [currentPage, members]);

  return (
    <>
      <div className="border border-slate-300 rounded-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left border-collapse">
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
                  {emptyMessage}
                </td>
              </tr>
            )}

            {!loading &&
              visibleMembers.map((member, index) => {
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
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col gap-2 bg-slate-100 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between border-t border-slate-300">
          <span>
            Showing {startRecord}-{endRecord} of {members.length} records
          </span>
          <div className="flex items-center gap-2">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={loading || currentPage === 1}
                onClick={() => setRequestedPage((page) => Math.max(1, Math.min(page, totalPages) - 1))}
                className="inline-flex h-7 w-7 items-center justify-center border border-slate-300 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                aria-label="Next page"
                disabled={loading || currentPage === totalPages}
                onClick={() => setRequestedPage((page) => Math.min(totalPages, page + 1))}
                className="inline-flex h-7 w-7 items-center justify-center border border-slate-300 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
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
