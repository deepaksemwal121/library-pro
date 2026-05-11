import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Eye, History } from "lucide-react";
import { MemberDetailsDialog } from "./MemberDetailsDialog";
import { PaymentHistoryDialog } from "./PaymentHistoryDialog";
import { getMemberFileSignedUrl } from "./memberFiles";
import { getPaymentStatus } from "./memberUtils";

const statusClasses = {
  green: "text-emerald-700 bg-emerald-50",
  yellow: "text-amber-700 bg-amber-50",
  red: "text-red-700 bg-red-50",
};

const MEMBERS_PER_PAGE = 10;

const MemberPhoto = ({ member }) => {
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadPhoto = async () => {
      const signedUrl = await getMemberFileSignedUrl(member.passportPhotoPath);
      if (!ignore) {
        setPhotoUrl(signedUrl);
      }
    };

    loadPhoto();

    return () => {
      ignore = true;
    };
  }, [member.passportPhotoPath]);

  if (photoUrl) {
    return <img src={photoUrl} alt={member.fullName} className="h-10 w-10 rounded-md border border-slate-200 object-cover" />;
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500">
      {member.fullName?.charAt(0)?.toUpperCase() || "M"}
    </div>
  );
};

export const MembersTable = ({
  members = [],
  loading = false,
  emptyMessage = "No members registered yet.",
  onSaveMember = () => {},
  onMarkLeft = () => {},
  onPaymentsChanged = () => {},
}) => {
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState(null);
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
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Member</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Contact</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Seat</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Locker</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Paid Until</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                    <tr key={member.id} className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"} transition-colors hover:bg-sky-50/70`}>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        <div className="flex items-center gap-3">
                          <MemberPhoto member={member} />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{member.fullName}</div>
                            <div className="mt-0.5 text-xs text-slate-500">Seat {member.seatNumber}</div>
                            {!member.idDocumentPath && (
                              <div className="mt-1 inline-flex items-center gap-1 rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                <AlertTriangle size={11} />
                                ID missing
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-slate-600">{member.phoneNumber}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {member.seatNumber} <span className="text-xs text-slate-400">({member.seatFloor} floor)</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{member.isLockerTaken ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{member.paidUntil}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClasses[paymentStatus.tone]}`}>
                          {paymentStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            aria-label={`View ${member.fullName}`}
                            title="View details"
                            onClick={() => setSelectedMember(member)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Payment history for ${member.fullName}`}
                            title="Payment history"
                            onClick={() => setSelectedMemberForPayment(member)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          >
                            <History size={15} />
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
        <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
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
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                aria-label="Next page"
                disabled={loading || currentPage === totalPages}
                onClick={() => setRequestedPage((page) => Math.min(totalPages, page + 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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

      <PaymentHistoryDialog
        key={selectedMemberForPayment?.id ?? "payment-history"}
        member={selectedMemberForPayment}
        open={Boolean(selectedMemberForPayment)}
        onOpenChange={(isOpen) => !isOpen && setSelectedMemberForPayment(null)}
        onPaymentsChanged={onPaymentsChanged}
      />
    </>
  );
};
