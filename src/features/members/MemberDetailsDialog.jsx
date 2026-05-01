import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { SeatManagement } from "../seatmanagement/SeatManagement";

const getEditableMemberData = (member) => ({
  fullName: member.fullName,
  dateOfBirth: member.dateOfBirth || "",
  phoneNumber: member.phoneNumber,
  idType: member.idType,
  idNumber: member.idNumber,
  registrationDate: member.registrationDate,
  lockerTaken: member.isLockerTaken,
  seatNumber: member.seatNumber,
  seatFloor: member.seatFloor,
  feeAmount: member.feeAmount,
  paymentMethod: member.paymentMethod,
  transactionNotes: member.transactionNotes || "",
  paidUntil: member.paidUntil,
});

const getInitialLeftData = () => ({
  leftAt: new Date().toISOString().slice(0, 10),
  lockerSecurityRefunded: false,
  lockerKeysReturned: false,
  exitNotes: "",
});

export const MemberDetailsDialog = ({ member, members = [], open, onOpenChange, onSave, onMarkLeft }) => {
  const [formData, setFormData] = useState(() => (member ? getEditableMemberData(member) : null));
  const [leftData, setLeftData] = useState(getInitialLeftData);
  const [notice, setNotice] = useState({ tone: "", message: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isMarkingLeft, setIsMarkingLeft] = useState(false);

  const occupiedMembers = useMemo(() => members.filter((item) => item.id !== member?.id), [member?.id, members]);
  const occupiedSeats = useMemo(() => occupiedMembers.map((item) => item.seatNumber), [occupiedMembers]);
  const hasSeatChanged = Number(formData?.seatNumber) !== Number(member?.seatNumber);
  const canSubmitExit = !formData?.lockerTaken || (leftData.lockerSecurityRefunded && leftData.lockerKeysReturned);

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
    const didSave = await onSave(member.id, formData);
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

    if (!canSubmitExit) {
      setNotice({ tone: "error", message: "Locker members must collect security refund and submit locker keys before removal." });
      return;
    }

    setIsMarkingLeft(true);
    const didMarkLeft = await onMarkLeft(member.id, leftData);
    setIsMarkingLeft(false);

    if (!didMarkLeft) {
      setNotice({ tone: "error", message: "Could not remove this member. Please review the requirements and try again." });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-0 right-0 h-full w-full max-w-4xl overflow-y-auto bg-white p-4 shadow-xl sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-xl font-bold text-slate-900">Member Details</Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500">Edit details, change seat, or close this membership.</Dialog.Description>
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Fee Amount</label>
                <input
                  type="number"
                  name="feeAmount"
                  value={formData.feeAmount}
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Paid Until</label>
                <input type="date" name="paidUntil" value={formData.paidUntil} onChange={handleChange} className="w-full rounded-md border p-2" />
              </div>
              <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
                <input type="checkbox" name="lockerTaken" checked={formData.lockerTaken} onChange={handleChange} className="h-4 w-4" />
                Locker Taken
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Change Seat</label>
              <SeatManagement
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

            <div className="flex justify-end gap-2 border-t pt-4">
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
                <input type="date" name="leftAt" value={leftData.leftAt} onChange={handleLeftChange} className="w-full rounded-md border p-2" />
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
            <textarea
              name="exitNotes"
              value={leftData.exitNotes}
              onChange={handleLeftChange}
              className="mt-3 min-h-20 w-full rounded-md border p-2 outline-blue-500"
              placeholder="Exit notes"
            />
            <button
              type="button"
              onClick={handleMarkLeft}
              disabled={isSaving || isMarkingLeft || !canSubmitExit}
              className="mt-3 w-full rounded-md bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 sm:w-auto"
            >
              {isMarkingLeft ? "Removing..." : "Mark Member Left"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
