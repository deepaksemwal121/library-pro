import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, Camera, FileImage, FolderOpen, Pencil, UserCheck, X } from "lucide-react";
import { SeatSelector } from "../seatmanagement/SeatSelector";
import { getMemberFileSignedUrl } from "./memberFiles";
import { loadMemberSeatHistory } from "./memberSeatHistory";
import { EXIT_REASON_OPTIONS, getEndOfMonth, getMonthInputValue } from "./memberUtils";

const LOCKER_FEE = 500;

const getEditableMemberData = (member) => ({
  fullName: member.fullName,
  dateOfBirth: member.dateOfBirth || "",
  phoneNumber: member.phoneNumber,
  registeredEmail: member.registeredEmail || "",
  idType: member.idType,
  idNumber: member.idNumber,
  registrationDate: member.registrationDate,
  lockerTaken: member.isLockerTaken,
  seatNumber: member.seatNumber,
  seatFloor: member.seatFloor,
  seatLockerAvailable: member.seatFloor !== "Free Floor",
  feeAmount: member.feeAmount ?? "",
  paymentMethod: member.paymentMethod,
  transactionNotes: member.transactionNotes || "",
  paidUntil: member.paidUntil ?? "",
  idDocumentPath: member.idDocumentPath || "",
  passportPhotoPath: member.passportPhotoPath || "",
});

const getInitialLeftData = () => ({
  leftAt: new Date().toISOString().slice(0, 10),
  lockerSecurityRefunded: false,
  lockerKeysReturned: false,
  exitReason: "",
  exitNotes: "",
});

const getInitialReactivateData = () => ({
  seatNumber: "",
  seatFloor: "",
  seatBaseFee: 0,
  seatLockerAvailable: true,
  lockerTaken: false,
  membershipMonth: getMonthInputValue(new Date().toISOString().slice(0, 10)),
  paymentReceivedNow: false,
  feeAmount: "",
  paymentMethod: "Cash",
  transactionNotes: "",
});

const formatDisplayDate = (dateValue) => {
  if (!dateValue) return "Not added";

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const MemberDetailsDialog = ({
  member,
  members = [],
  open,
  onOpenChange,
  onSave,
  onMarkLeft,
  onReactivate,
  isLeftMember = false,
}) => {
  const [formData, setFormData] = useState(() => (member ? getEditableMemberData(member) : null));
  const [leftData, setLeftData] = useState(getInitialLeftData);
  const [reactivateData, setReactivateData] = useState(getInitialReactivateData);
  const [notice, setNotice] = useState({ tone: "", message: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMarkingLeft, setIsMarkingLeft] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [idDocumentFile, setIdDocumentFile] = useState(null);
  const [passportPhotoFile, setPassportPhotoFile] = useState(null);
  const [documentUrls, setDocumentUrls] = useState({ idDocument: "", passportPhoto: "" });
  const [seatHistory, setSeatHistory] = useState([]);
  const [isLoadingSeatHistory, setIsLoadingSeatHistory] = useState(false);
  const [seatHistoryError, setSeatHistoryError] = useState("");

  const occupiedMembers = useMemo(() => members.filter((item) => item.id !== member?.id), [member?.id, members]);
  const occupiedSeats = useMemo(() => occupiedMembers.map((item) => item.seatNumber), [occupiedMembers]);
  const hasSeatChanged =
    String(formData?.seatNumber ?? "") !== String(member?.seatNumber ?? "") ||
    String(formData?.seatFloor ?? "") !== String(member?.seatFloor ?? "");
  const canSubmitExit = !formData?.lockerTaken || (leftData.lockerSecurityRefunded && leftData.lockerKeysReturned);

  useEffect(() => {
    let ignore = false;

    const loadDocumentUrls = async () => {
      const [idDocument, passportPhoto] = await Promise.all([
        getMemberFileSignedUrl(member?.idDocumentPath),
        getMemberFileSignedUrl(member?.passportPhotoPath),
      ]);

      if (!ignore) {
        setDocumentUrls({ idDocument, passportPhoto });
      }
    };

    if (member) {
      loadDocumentUrls();
    }

    return () => {
      ignore = true;
    };
  }, [member]);

  useEffect(() => {
    let ignore = false;

    const loadSeatHistory = async () => {
      if (!member?.id) return;

      setIsLoadingSeatHistory(true);
      setSeatHistoryError("");
      try {
        const history = await loadMemberSeatHistory(member.id);
        if (!ignore) {
          setSeatHistory(history);
        }
      } catch (error) {
        if (!ignore) {
          setSeatHistory([]);
          setSeatHistoryError(error.message || "Seat history could not be loaded.");
        }
      } finally {
        if (!ignore) {
          setIsLoadingSeatHistory(false);
        }
      }
    };

    loadSeatHistory();

    return () => {
      ignore = true;
    };
  }, [member?.id]);

  if (!member || !formData) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNotice({ tone: "", message: "" });
    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      return next;
    });
  };

  const handleLeftChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNotice({ tone: "", message: "" });
    setLeftData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleReactivateChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNotice({ tone: "", message: "" });
    setReactivateData((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "lockerTaken") {
        next.feeAmount = Number(prev.seatBaseFee || 0) + (checked && prev.seatLockerAvailable ? LOCKER_FEE : 0);
      }

      return next;
    });
  };

  const handleSeatPick = ({ seatNumber, floor, lockerAvailable = true }) => {
    setNotice({ tone: "warning", message: "Seat changed. Save changes to update this member's allotted seat." });
    setFormData((prev) => ({
      ...prev,
      seatNumber,
      seatFloor: floor,
      seatLockerAvailable: lockerAvailable,
      lockerTaken: lockerAvailable ? prev.lockerTaken : false,
    }));
  };

  const handleReactivateSeatPick = ({ seatNumber, floor, baseFee = 0, lockerAvailable = true }) => {
    setNotice({ tone: "", message: "" });
    setReactivateData((prev) => ({
      ...prev,
      seatNumber,
      seatFloor: floor,
      seatBaseFee: Number(baseFee) || 0,
      seatLockerAvailable: lockerAvailable,
      lockerTaken: lockerAvailable ? prev.lockerTaken : false,
      feeAmount: Number(baseFee || 0) + (lockerAvailable && prev.lockerTaken ? LOCKER_FEE : 0),
    }));
  };

  const handleStartEditing = () => {
    setFormData(getEditableMemberData(member));
    setLeftData(getInitialLeftData());
    setReactivateData(getInitialReactivateData());
    setNotice({ tone: "", message: "" });
    setIdDocumentFile(null);
    setPassportPhotoFile(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setFormData(getEditableMemberData(member));
    setLeftData(getInitialLeftData());
    setNotice({ tone: "", message: "" });
    setIdDocumentFile(null);
    setPassportPhotoFile(null);
    setIsEditing(false);
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setFormData(getEditableMemberData(member));
      setLeftData(getInitialLeftData());
      setReactivateData(getInitialReactivateData());
      setNotice({ tone: "", message: "" });
      setIdDocumentFile(null);
      setPassportPhotoFile(null);
      setIsEditing(false);
    }

    onOpenChange(isOpen);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.seatNumber) {
      setNotice({ tone: "error", message: "Please select a seat before saving this member." });
      return;
    }

    if (Number(formData.feeAmount) < 0) {
      setNotice({ tone: "error", message: "Fee amount cannot be negative." });
      return;
    }

    setIsSaving(true);
    const didSave = await onSave(member.id, {
      ...formData,
      idDocumentFile,
      passportPhotoFile,
    });
    setIsSaving(false);

    if (!didSave) {
      setNotice({ tone: "error", message: "Could not save changes. Check the seat availability and try again." });
    }
  };

  const handleMarkLeft = async () => {
    if (!leftData.leftAt) {
      setNotice({ tone: "error", message: "Please select the member's leaving date." });
      return;
    }

    if (!leftData.exitReason && !leftData.exitNotes.trim()) {
      setNotice({ tone: "error", message: "Please select or write a reason before marking this member left." });
      return;
    }

    if (!canSubmitExit) {
      setNotice({ tone: "error", message: "Locker members must collect security refund and submit locker keys before removal." });
      return;
    }

    setIsMarkingLeft(true);
    const didMarkLeft = await onMarkLeft(member.id, {
      ...leftData,
      exitNotes: leftData.exitNotes.trim() || leftData.exitReason,
    });
    setIsMarkingLeft(false);

    if (!didMarkLeft) {
      setNotice({ tone: "error", message: "Could not remove this member. Please review the requirements and try again." });
    }
  };

  const handleReactivate = async () => {
    if (!reactivateData.seatNumber || !reactivateData.seatFloor) {
      setNotice({ tone: "error", message: "⚠️ Step 1 Required: Please select a new available seat before reactivating." });
      return;
    }

    if (String(reactivateData.seatNumber).trim() === String(member.seatNumber).trim()) {
      setNotice({ tone: "error", message: "❌ Cannot reuse the old seat. Please select a different available seat." });
      return;
    }

    if (!reactivateData.membershipMonth) {
      setNotice({ tone: "error", message: "⚠️ Step 2 Required: Please select the membership month." });
      return;
    }

    if (reactivateData.feeAmount === "") {
      setNotice({ tone: "error", message: "⚠️ Step 2 Required: Please enter the monthly fee amount." });
      return;
    }

    if (Number(reactivateData.feeAmount || 0) < 0) {
      setNotice({ tone: "error", message: "Invalid fee amount: Monthly fee cannot be negative." });
      return;
    }

    setIsReactivating(true);
    const didReactivate = await onReactivate(member.id, reactivateData);
    setIsReactivating(false);

    if (!didReactivate) {
      setNotice({
        tone: "error",
        message:
          "Could not complete reactivation. The selected seat may have just been assigned to another member. Please select a different available seat.",
      });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-0 right-0 h-full w-full max-w-4xl overflow-y-auto bg-white p-4 shadow-xl sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-xl font-bold text-slate-900">Member Details</Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500">
                {isEditing
                  ? isLeftMember
                    ? "Edit details or assign an available seat before reactivating."
                    : "Edit details, change seat, or close this membership."
                  : "Review this member's saved details."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="p-1 hover:bg-slate-100 rounded" aria-label="Close member details">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {notice.message && (
            <div
              className={`mb-4 border p-3 text-sm ${
                notice.tone === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : notice.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-yellow-200 bg-yellow-50 text-yellow-800"
              }`}
            >
              {notice.message}
            </div>
          )}

          {isEditing && (
            <button
              type="button"
              onClick={handleCancelEditing}
              disabled={isSaving || isMarkingLeft}
              className="mb-4 inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowLeft size={16} />
              Back to View
            </button>
          )}

          {!isEditing ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ["Full Name", member.fullName],
                  ["Phone Number", member.phoneNumber],
                  ["Registered Email", member.registeredEmail || "Not added"],
                  ["Date of Birth", member.dateOfBirth || "Not added"],
                  ["Registration Date", member.registrationDate],
                  ["ID Type", member.idType],
                  ["ID Number", member.idNumber],
                  ["Seat", `${member.seatNumber} (${member.seatFloor} floor)`],
                  ["Locker Taken", member.isLockerTaken ? "Yes" : "No"],
                  ["Fee Amount", member.feeAmount !== null && member.feeAmount !== undefined ? `Rs.${member.feeAmount}` : "Not added"],
                  ["Payment Method", member.paymentMethod || "Not added"],
                  ["Paid Until", member.paidUntil || "Not added"],
                  ...(isLeftMember
                    ? [
                        ["Left On", formatDisplayDate(member.leftAt)],
                        ["Exit Reason", member.exitNotes || "No reason recorded"],
                        ["Locker Security Refunded", member.lockerSecurityRefunded ? "Yes" : "No"],
                        ["Locker Keys Returned", member.lockerKeysReturned ? "Yes" : "No"],
                      ]
                    : []),
                  ["ID Document", member.idDocumentPath ? "Uploaded" : "Not uploaded"],
                  ["Transaction Notes", member.transactionNotes || "Not added"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                    <div className="mt-1 break-words text-sm font-medium text-slate-900">{value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-slate-200 p-3">
                <h3 className="font-bold text-slate-900">Seat History</h3>
                {isLoadingSeatHistory && <p className="mt-2 text-sm text-slate-500">Loading seat history...</p>}
                {!isLoadingSeatHistory && seatHistoryError && (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
                    Seat history table is not available yet. Showing this member's saved seat below.
                  </div>
                )}
                {!isLoadingSeatHistory && seatHistory.length === 0 && (
                  <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {isLeftMember ? "Last saved seat" : "Current saved seat"}
                    </div>
                    <div className="mt-1 font-semibold text-slate-900">
                      Seat {member.seatNumber} ({member.seatFloor} floor)
                    </div>
                    <div className="mt-1 text-slate-500">
                      {seatHistoryError
                        ? "Apply the seat-history migration to see full from/to movement records."
                        : "No earlier seat changes have been recorded for this member yet."}
                    </div>
                  </div>
                )}
                {!isLoadingSeatHistory && seatHistory.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">From</th>
                          <th className="px-3 py-2">To</th>
                          <th className="px-3 py-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {seatHistory.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-3 py-2 text-slate-700">
                              {new Date(entry.changed_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {entry.from_seat_number ? `${entry.from_seat_number} (${entry.from_seat_floor} floor)` : "-"}
                            </td>
                            <td className="px-3 py-2 font-semibold text-slate-900">
                              {entry.to_seat_number} ({entry.to_seat_floor} floor)
                            </td>
                            <td className="px-3 py-2 text-slate-600">{entry.reason || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                    <FileImage size={16} />
                    ID Document
                  </div>
                  {documentUrls.idDocument ? (
                    <a
                      href={documentUrls.idDocument}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      View Uploaded ID
                    </a>
                  ) : (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                      ID document not uploaded.
                    </div>
                  )}
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                    <FileImage size={16} />
                    Passport Photo
                  </div>
                  {documentUrls.passportPhoto ? (
                    <img
                      src={documentUrls.passportPhoto}
                      alt={`${member.fullName} passport size`}
                      className="h-28 w-24 rounded-md border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-28 w-24 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-xl font-bold text-slate-500">
                      {member.fullName?.charAt(0)?.toUpperCase() || "M"}
                    </div>
                  )}
                </div>
              </div>

              {isLeftMember && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-4">
                  <h3 className="font-bold text-slate-900">Step 1: Assign New Seat</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    This member previously occupied seat{" "}
                    <strong>
                      {member.seatNumber} ({member.seatFloor} floor)
                    </strong>
                    . Please select a <strong>different available seat</strong> to continue their membership. The old seat cannot be reused.
                  </p>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-bold text-slate-700">Select New Available Seat *</label>
                    <SeatSelector
                      currentSeatNumber={null}
                      currentFloor={null}
                      excludeSeat={member.seatNumber}
                      onSeatSelect={handleReactivateSeatPick}
                      isLockerChecked={reactivateData.lockerTaken}
                      occupiedSeats={occupiedSeats}
                      occupiedMembers={occupiedMembers}
                    />
                    {reactivateData.seatNumber ? (
                      <div className="mt-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-800">
                        ✓ New seat assigned: <strong>{reactivateData.seatNumber}</strong> on{" "}
                        <strong>{reactivateData.seatFloor} floor</strong>.
                      </div>
                    ) : (
                      <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        ⚠️ A new seat selection is required to reactivate this member.
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <h3 className="font-bold text-slate-900">Step 2: Update Payment Details</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Record the membership month and payment information to continue this member's membership.
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="lockerTaken"
                        checked={reactivateData.lockerTaken}
                        onChange={handleReactivateChange}
                        disabled={!reactivateData.seatLockerAvailable}
                        className="h-4 w-4"
                      />
                      {reactivateData.seatLockerAvailable ? "Locker Taken" : "Locker not available for this seat"}
                    </label>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Membership Month *</label>
                      <input
                        type="month"
                        name="membershipMonth"
                        value={reactivateData.membershipMonth}
                        onChange={handleReactivateChange}
                        className="w-full rounded-md border border-slate-200 bg-white p-2 outline-blue-500"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Paid until:{" "}
                        <strong>{reactivateData.membershipMonth ? getEndOfMonth(reactivateData.membershipMonth) : "Select a month"}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-md border-2 border-blue-300 bg-blue-50 p-4">
                    <label className="flex items-start gap-3 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        name="paymentReceivedNow"
                        checked={reactivateData.paymentReceivedNow}
                        onChange={handleReactivateChange}
                        className="mt-0.5 h-4 w-4"
                      />
                      <span>
                        <span className="block font-semibold">Payment Received</span>
                        <span className="text-slate-500">
                          Check this if the monthly fee has been received now. Leave unchecked to mark as due and track separately.
                        </span>
                      </span>
                    </label>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Monthly Fee Amount (Rs.) *</label>
                        <input
                          type="number"
                          name="feeAmount"
                          value={reactivateData.feeAmount}
                          onChange={handleReactivateChange}
                          min="0"
                          className="w-full rounded-md border border-slate-200 bg-white p-2 outline-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Payment Method</label>
                        <select
                          name="paymentMethod"
                          value={reactivateData.paymentMethod}
                          onChange={handleReactivateChange}
                          disabled={!reactivateData.paymentReceivedNow}
                          className="w-full rounded-md border border-slate-200 bg-white p-2 outline-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <option>Cash</option>
                          <option>Online</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Follow-up Notes</label>
                      <input
                        name="transactionNotes"
                        value={reactivateData.transactionNotes}
                        onChange={handleReactivateChange}
                        className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 outline-blue-500"
                        placeholder="Optional monthly fee note"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col justify-end gap-2 border-t pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-100 sm:w-auto"
                >
                  <Pencil size={16} />
                  Edit Details
                </button>
                {isLeftMember && (
                  <button
                    type="button"
                    onClick={handleReactivate}
                    disabled={
                      isReactivating || !reactivateData.seatNumber || !reactivateData.membershipMonth || reactivateData.feeAmount === ""
                    }
                    title={
                      !reactivateData.seatNumber
                        ? "Select a new seat"
                        : !reactivateData.membershipMonth
                          ? "Select membership month"
                          : reactivateData.feeAmount === ""
                            ? "Enter fee amount"
                            : ""
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 sm:w-auto"
                  >
                    <UserCheck size={16} />
                    {isReactivating ? "Reactivating..." : "Make Active Again"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <form className="space-y-5" onSubmit={handleSave}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                    <input
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border p-2 outline-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number</label>
                    <input
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border p-2 outline-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Registered Email</label>
                    <input
                      type="email"
                      name="registeredEmail"
                      value={formData.registeredEmail}
                      onChange={handleChange}
                      className="w-full rounded-md border p-2 outline-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="w-full rounded-md border p-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Registration Date</label>
                    <input
                      type="date"
                      name="registrationDate"
                      value={formData.registrationDate}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border p-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">ID Type</label>
                    <select name="idType" value={formData.idType} onChange={handleChange} className="w-full rounded-md border bg-white p-2">
                      <option>Aadhar</option>
                      <option>PAN</option>
                      <option>Passport</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">ID Number</label>
                    <input
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border p-2 outline-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Payment Method</label>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleChange}
                      className="w-full rounded-md border bg-white p-2"
                    >
                      <option>Cash</option>
                      <option>Online</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Fee Amount (Rs.)</label>
                    <input
                      type="number"
                      name="feeAmount"
                      value={formData.feeAmount}
                      onChange={handleChange}
                      min="0"
                      className="w-full rounded-md border p-2 outline-blue-500"
                    />
                  </div>
                  <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="lockerTaken"
                      checked={formData.lockerTaken}
                      onChange={handleChange}
                      disabled={!formData.seatLockerAvailable}
                      className="h-4 w-4"
                    />
                    {formData.seatLockerAvailable ? "Locker Taken" : "Locker not available for this seat"}
                  </label>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Change Seat</label>
                  <SeatSelector
                    currentSeatNumber={member.seatNumber}
                    currentFloor={member.seatFloor}
                    onSeatSelect={handleSeatPick}
                    isLockerChecked={formData.lockerTaken}
                    occupiedSeats={occupiedSeats}
                    occupiedMembers={occupiedMembers}
                  />
                  <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                    Current selection: Seat {formData.seatNumber} on {formData.seatFloor} floor.
                  </div>
                  {hasSeatChanged && (
                    <div className="mt-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                      This member will move from seat {member.seatNumber} to seat {formData.seatNumber} after saving.
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Transaction Notes</label>
                  <input
                    name="transactionNotes"
                    value={formData.transactionNotes}
                    onChange={handleChange}
                    className="w-full rounded-md border p-2 outline-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-700">ID Document Photo</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label
                        htmlFor={`edit-id-document-camera-${member.id}`}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Camera size={16} />
                        Take Photo
                      </label>
                      <input
                        id={`edit-id-document-camera-${member.id}`}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(event) => setIdDocumentFile(event.target.files?.[0] ?? null)}
                        className="sr-only"
                      />
                      <label
                        htmlFor={`edit-id-document-file-${member.id}`}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <FolderOpen size={16} />
                        Choose File
                      </label>
                      <input
                        id={`edit-id-document-file-${member.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(event) => setIdDocumentFile(event.target.files?.[0] ?? null)}
                        className="sr-only"
                      />
                    </div>
                    {idDocumentFile && <p className="mt-1 truncate text-xs font-medium text-slate-600">Selected: {idDocumentFile.name}</p>}
                    <p className={`mt-1 text-xs ${formData.idDocumentPath ? "text-slate-500" : "font-semibold text-red-700"}`}>
                      {formData.idDocumentPath
                        ? "Upload a new image from camera or file storage."
                        : "Missing for this member. Please upload it from camera or file storage."}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-700">Passport Size Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={(event) => setPassportPhotoFile(event.target.files?.[0] ?? null)}
                      className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Optional. Tap to use selfie camera on mobile/tablet. The table will use a fallback photo if empty.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-end gap-2 border-t pt-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    disabled={isSaving || isMarkingLeft}
                    className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isMarkingLeft}
                    className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>

              {!isLeftMember && (
                <div className="mt-6 border-t pt-5">
                  <h3 className="font-bold text-slate-900">Member Leaving Library</h3>
                  <div className="mt-2 border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                    Marking this member left will remove them from the active members list and free their seat for new registration.
                  </div>
                  {formData.lockerTaken && (
                    <div className="mt-2 border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                      This member has a locker. Confirm the refundable security has been collected and locker keys have been submitted.
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Leaving Date</label>
                      <input
                        type="date"
                        name="leftAt"
                        value={leftData.leftAt}
                        onChange={handleLeftChange}
                        className="w-full rounded-md border p-2"
                      />
                    </div>
                    <div className="flex flex-col justify-end gap-2">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          name="lockerSecurityRefunded"
                          checked={leftData.lockerSecurityRefunded}
                          onChange={handleLeftChange}
                          disabled={!formData.lockerTaken}
                          className="h-4 w-4"
                        />
                        Locker security refunded
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          name="lockerKeysReturned"
                          checked={leftData.lockerKeysReturned}
                          onChange={handleLeftChange}
                          disabled={!formData.lockerTaken}
                          className="h-4 w-4"
                        />
                        Locker keys submitted
                      </label>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Leaving Reason</label>
                      <select
                        name="exitReason"
                        value={leftData.exitReason}
                        onChange={handleLeftChange}
                        className="w-full rounded-md border bg-white p-2 outline-blue-500"
                      >
                        <option value="">Select reason</option>
                        {EXIT_REASON_OPTIONS.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Custom Reason</label>
                      <input
                        name="exitNotes"
                        value={leftData.exitNotes}
                        onChange={handleLeftChange}
                        className="w-full rounded-md border p-2 outline-blue-500"
                        placeholder="Write a specific reason"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkLeft}
                    disabled={isSaving || isMarkingLeft || !canSubmitExit}
                    className="mt-3 w-full rounded-md bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 sm:w-auto"
                  >
                    {isMarkingLeft ? "Removing..." : "Mark Member Left"}
                  </button>
                </div>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
