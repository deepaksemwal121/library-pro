import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, FileImage, Pencil, X } from "lucide-react";
import { SeatSelector } from "../seatmanagement/SeatSelector";
import { getMemberFileSignedUrl } from "./memberFiles";
import { EXIT_REASON_OPTIONS } from "./memberUtils";

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

export const MemberDetailsDialog = ({ member, members = [], open, onOpenChange, onSave, onMarkLeft }) => {
  const [formData, setFormData] = useState(() => (member ? getEditableMemberData(member) : null));
  const [leftData, setLeftData] = useState(getInitialLeftData);
  const [notice, setNotice] = useState({ tone: "", message: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMarkingLeft, setIsMarkingLeft] = useState(false);
  const [idDocumentFile, setIdDocumentFile] = useState(null);
  const [passportPhotoFile, setPassportPhotoFile] = useState(null);
  const [documentUrls, setDocumentUrls] = useState({ idDocument: "", passportPhoto: "" });

  const occupiedMembers = useMemo(() => members.filter((item) => item.id !== member?.id), [member?.id, members]);
  const occupiedSeats = useMemo(() => occupiedMembers.map((item) => item.seatNumber), [occupiedMembers]);
  const hasSeatChanged = Number(formData?.seatNumber) !== Number(member?.seatNumber);
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

  if (!member || !formData) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNotice({ tone: "", message: "" });
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleLeftChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNotice({ tone: "", message: "" });
    setLeftData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSeatPick = ({ seatNumber, floor }) => {
    setNotice({ tone: "warning", message: "Seat changed. Save changes to update this member's allotted seat." });
    setFormData((prev) => ({
      ...prev,
      seatNumber,
      seatFloor: floor,
    }));
  };

  const handleStartEditing = () => {
    setFormData(getEditableMemberData(member));
    setLeftData(getInitialLeftData());
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

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-0 right-0 h-full w-full max-w-4xl overflow-y-auto bg-white p-4 shadow-xl sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-xl font-bold text-slate-900">Member Details</Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500">
                {isEditing ? "Edit details, change seat, or close this membership." : "Review this member's saved details."}
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
                  ["Fee Amount", member.feeAmount ? `Rs.${member.feeAmount}` : "Not added"],
                  ["Payment Method", member.paymentMethod || "Not added"],
                  ["Paid Until", member.paidUntil || "Not added"],
                  ["ID Document", member.idDocumentPath ? "Uploaded" : "Not uploaded"],
                  ["Transaction Notes", member.transactionNotes || "Not added"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                    <div className="mt-1 break-words text-sm font-medium text-slate-900">{value}</div>
                  </div>
                ))}
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

              <div className="flex justify-end border-t pt-4">
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 sm:w-auto"
                >
                  <Pencil size={16} />
                  Edit Details
                </button>
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
                  <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
                    <input type="checkbox" name="lockerTaken" checked={formData.lockerTaken} onChange={handleChange} className="h-4 w-4" />
                    Locker Taken
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
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) => setIdDocumentFile(event.target.files?.[0] ?? null)}
                      className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                    />
                    <p className={`mt-1 text-xs ${formData.idDocumentPath ? "text-slate-500" : "font-semibold text-red-700"}`}>
                      {formData.idDocumentPath ? "Upload a new image or tap to use camera." : "Missing for this member. Please upload it or tap to use camera."}
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
                    <p className="mt-1 text-xs text-slate-500">Optional. Tap to use selfie camera on mobile/tablet. The table will use a fallback photo if empty.</p>
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
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
