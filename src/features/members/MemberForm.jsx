import React, { useMemo, useState } from "react";
import { Camera, CreditCard, FileImage, FolderOpen, Grid2X2, LoaderCircle, User } from "lucide-react";
import supabase from "../../../helpers/supabase";
import { SeatManagement } from "../seatmanagement/SeatManagement";
import { getSeatBaseFeeFromSettings } from "../seatmanagement/seatSettings";
import { useToast } from "../../components/ui/toastContext";
import { uploadMemberFile } from "./memberFiles";
import { recordSeatHistory } from "./memberSeatHistory";
import { getEndOfMonth, getMonthInputValue, getStartOfMonth } from "./memberUtils";

const LOCKER_FEE = 500;
const inputClass = "w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-sm outline-blue-500 transition focus:border-blue-300 focus:bg-white";
const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

const SectionHeader = ({ icon, title, description }) => (
  <div className="mb-4 flex items-start gap-3">
    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">{icon}</div>
    <div>
      <h3 className="font-bold text-slate-950">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  </div>
);

const isAfterMidMonth = (dateValue) => {
  if (!dateValue) return false;

  const date = new Date(`${dateValue}T00:00:00`);
  return date.getDate() > 15;
};

const getMembershipFeeDate = (registrationDate, membershipMonth) => {
  if (!membershipMonth) return registrationDate;

  const registrationMonth = registrationDate ? getMonthInputValue(registrationDate) : "";
  return registrationMonth === membershipMonth ? registrationDate : getStartOfMonth(membershipMonth);
};

const calculateSuggestedFee = (seatNumber, lockerTaken, registrationDate, seatBaseFee, membershipMonth) => {
  if (!seatNumber) return "";

  const baseFee = Number(seatBaseFee) || getSeatBaseFeeFromSettings(seatNumber);
  const feeDate = getMembershipFeeDate(registrationDate, membershipMonth);
  const seatFee = isAfterMidMonth(feeDate) ? baseFee / 2 : baseFee;
  const lockerFee = lockerTaken ? LOCKER_FEE : 0;

  return seatFee + lockerFee;
};

const getDayBefore = (dateValue) => {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const initialFormData = {
  fullName: "",
  dateOfBirth: "",
  phoneNumber: "",
  registeredEmail: "",
  idType: "Aadhar",
  idNumber: "",
  registrationDate: "",
  membershipMonth: "",
  lockerTaken: false,
  seatNumber: "",
  seatFloor: "",
  seatBaseFee: "",
  seatLockerAvailable: true,
  feeAmount: "",
  paymentReceivedNow: true,
  paymentMethod: "Cash",
  transactionNotes: "",
};

export const MemberForm = ({ occupiedSeats = [], occupiedMembers = [], onMemberCreated = () => {} }) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    ...initialFormData,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [idDocumentFile, setIdDocumentFile] = useState(null);
  const [passportPhotoFile, setPassportPhotoFile] = useState(null);

  const feeBreakdown = useMemo(() => {
    if (!formData.seatNumber) {
      return null;
    }

    const baseFee = Number(formData.seatBaseFee) || getSeatBaseFeeFromSettings(formData.seatNumber);
    const feeDate = getMembershipFeeDate(formData.registrationDate, formData.membershipMonth);
    const midMonthDiscount = isAfterMidMonth(feeDate);
    const seatFee = midMonthDiscount ? baseFee / 2 : baseFee;
    const lockerFee = formData.seatLockerAvailable && formData.lockerTaken ? LOCKER_FEE : 0;

    return {
      baseFee,
      seatFee,
      lockerFee,
      midMonthDiscount,
    };
  }, [
    formData.lockerTaken,
    formData.membershipMonth,
    formData.registrationDate,
    formData.seatBaseFee,
    formData.seatLockerAvailable,
    formData.seatNumber,
  ]);

  const withSuggestedFee = (data) => ({
    ...data,
    feeAmount: calculateSuggestedFee(
      data.seatNumber,
      data.seatLockerAvailable && data.lockerTaken,
      data.registrationDate,
      data.seatBaseFee,
      data.membershipMonth,
    ),
  });

  const handleSeatPick = ({ seatNumber, floor, baseFee, lockerAvailable = true }) => {
    setFormData((prev) =>
      withSuggestedFee({
        ...prev,
        seatNumber,
        seatFloor: floor,
        seatBaseFee: baseFee,
        seatLockerAvailable: lockerAvailable,
        lockerTaken: lockerAvailable ? prev.lockerTaken : false,
      }),
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "registrationDate" && !prev.membershipMonth) {
        next.membershipMonth = value ? getMonthInputValue(value) : "";
      }

      if (name === "lockerTaken" || name === "registrationDate" || name === "membershipMonth") {
        return withSuggestedFee(next);
      }

      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.seatNumber) {
      toast.warning("Select a seat", { message: "Please select a seat before submitting." });
      return;
    }

    if (!idDocumentFile) {
      toast.warning("ID document required", { message: "Please upload the member's ID document photo before submitting." });
      return;
    }

    if (formData.paymentReceivedNow && formData.feeAmount !== "" && Number(formData.feeAmount) < 0) {
      toast.warning("Invalid payment amount", { message: "Amount paid cannot be negative." });
      return;
    }

    setIsSubmitting(true);
    toast.info("Registering member", { message: "Uploading documents and saving the member record.", duration: 2500 });

    const memberId = crypto.randomUUID();
    let idDocumentPath = "";
    let passportPhotoPath = "";

    try {
      idDocumentPath = await uploadMemberFile(memberId, idDocumentFile, "id-document");
      passportPhotoPath = await uploadMemberFile(memberId, passportPhotoFile, "passport-photo");
    } catch (error) {
      setIsSubmitting(false);
      toast.error("Could not upload member document", { message: error.message });
      return;
    }

    const suggestedFeeAmount = calculateSuggestedFee(
      formData.seatNumber,
      formData.seatLockerAvailable && formData.lockerTaken,
      formData.registrationDate,
      formData.seatBaseFee,
      formData.membershipMonth,
    );
    const savedFeeAmount = Number(formData.feeAmount || suggestedFeeAmount || 0);
    const membershipMonth = formData.membershipMonth || getMonthInputValue(formData.registrationDate);
    const membershipMonthStart = getStartOfMonth(membershipMonth);
    const paidUntil = formData.paymentReceivedNow ? getEndOfMonth(membershipMonth) : getDayBefore(formData.registrationDate);

    const { data, error } = await supabase
      .from("library_members")
      .insert({
        id: memberId,
        full_name: formData.fullName,
        date_of_birth: formData.dateOfBirth || null,
        phone_number: formData.phoneNumber,
        registered_email: formData.registeredEmail || null,
        id_type: formData.idType,
        id_number: formData.idNumber,
        registration_date: formData.registrationDate,
        locker_taken: formData.lockerTaken,
        seat_number: formData.seatNumber,
        seat_floor: formData.seatFloor,
        fee_amount: savedFeeAmount,
        payment_method: formData.paymentMethod,
        transaction_notes: formData.transactionNotes || null,
        paid_until: paidUntil,
        id_document_path: idDocumentPath,
        passport_photo_path: passportPhotoPath,
      })
      .select("id")
      .single();

    if (error) {
      setIsSubmitting(false);
      if (error.code === "23505") {
        toast.error("Seat already occupied", { message: "This seat is already occupied. Please select another seat." });
        return;
      }
      toast.error("Could not register member", { message: error.message });
      return;
    }

    const { error: seatHistoryError } = await recordSeatHistory({
      memberId: data.id,
      toSeatNumber: formData.seatNumber,
      toSeatFloor: formData.seatFloor,
      changedAt: new Date(`${formData.registrationDate}T00:00:00`).toISOString(),
      reason: "Initial seat allotment",
    });

    if (seatHistoryError) {
      toast.warning("Member created, seat history not recorded", { message: seatHistoryError.message, duration: 7500 });
    }

    if (!formData.paymentReceivedNow) {
      setIsSubmitting(false);
      toast.success("Member registered", { message: "No payment was recorded. The member is marked as due." });
      setFormData({ ...initialFormData });
      setIdDocumentFile(null);
      setPassportPhotoFile(null);
      setFormVersion((version) => version + 1);
      onMemberCreated();
      return;
    }

    const totalRegistrationAmount = Number(formData.feeAmount || 0);
    const paymentRecords = [
      {
        member_id: data.id,
        amount: totalRegistrationAmount,
        payment_for_month: membershipMonthStart,
        payment_method: formData.paymentMethod,
        payment_type: "Registration Fee",
        transaction_notes: formData.transactionNotes
          ? `Registration payment: ${formData.transactionNotes}`
          : "Registration payment",
      },
    ];

    const { error: paymentError } = await supabase.from("payment_history").insert(paymentRecords);

    setIsSubmitting(false);

    if (paymentError) {
      toast.warning("Member created, payment not recorded", { message: paymentError.message, duration: 7500 });
      setFormData({ ...initialFormData });
      setFormVersion((version) => version + 1);
      onMemberCreated();
      return;
    }

    toast.success("Member registered", { message: "Payment records were created successfully." });
    setFormData({ ...initialFormData });
    setIdDocumentFile(null);
    setPassportPhotoFile(null);
    setFormVersion((version) => version + 1);
    onMemberCreated();
  };

  return (
    <div className="mx-auto max-w-3xl bg-white p-0 sm:p-2">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <SectionHeader
            icon={<User size={18} />}
            title="Personal Details"
            description="Basic member information and identity details."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className={labelClass}>Registered Email</label>
              <input
                type="email"
                name="registeredEmail"
                value={formData.registeredEmail}
                onChange={handleChange}
                className={inputClass}
                placeholder="member@example.com"
              />
            </div>
            <div>
              <label className={labelClass}>Date of Birth</label>
              <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ID Type</label>
              <select name="idType" value={formData.idType} onChange={handleChange} className={inputClass}>
                <option>Aadhar</option>
                <option>PAN</option>
                <option>Passport</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>ID Number</label>
              <input
                type="text"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="Enter ID number"
              />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <SectionHeader
            icon={<Grid2X2 size={18} />}
            title="Seat & Membership"
            description="Choose the seat, locker option, and calendar month."
          />
          <div className="mb-4 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Registration Date</label>
              <input
                type="date"
                name="registrationDate"
                value={formData.registrationDate}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Membership Month</label>
              <input
                type="month"
                name="membershipMonth"
                value={formData.membershipMonth}
                onChange={handleChange}
                required
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                Paid until will be {formData.membershipMonth ? getEndOfMonth(formData.membershipMonth) : "the last day of this month"}.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className={labelClass}>Select Seat</label>
            <SeatManagement
              key={formVersion}
              onSeatSelect={handleSeatPick}
              isLockerChecked={formData.lockerTaken}
              occupiedSeats={occupiedSeats}
              occupiedMembers={occupiedMembers}
              allowConfiguration={false}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              {formData.seatNumber ? (
                <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  Seat {formData.seatNumber} selected on {formData.seatFloor} floor.
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Select an available seat to continue.
                </div>
              )}
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                <input
                  checked={formData.lockerTaken}
                  onChange={handleChange}
                  type="checkbox"
                  name="lockerTaken"
                  id="locker"
                  disabled={!formData.seatLockerAvailable}
                  className="h-4 w-4 rounded text-blue-600"
                />
                {formData.seatLockerAvailable ? "Locker Taken" : "Locker not available"}
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <SectionHeader
            icon={<CreditCard size={18} />}
            title="Payment Details"
            description="Record payment now or register first and collect later."
          />
          <div className="space-y-4">
          {feeBreakdown && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {feeBreakdown.baseFee === 0 && <div className="font-semibold text-emerald-700">Zero-fee seat selected: total payable can be Rs.0.</div>}
              <div>Seat fee: Rs.{feeBreakdown.seatFee}</div>
              {feeBreakdown.midMonthDiscount && <div>Mid-month joining applied: half seat fee charged after the 15th.</div>}
              <div>Locker fee: Rs.{feeBreakdown.lockerFee}</div>
            </div>
          )}

          <label className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            <input
              type="checkbox"
              name="paymentReceivedNow"
              checked={formData.paymentReceivedNow}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block font-semibold">Payment received during registration</span>
              <span className="text-blue-700">
                Turn this off to register the member now and collect the fee later from Payment History.
              </span>
            </span>
          </label>

          {!formData.paymentReceivedNow && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
              No payment record will be created. This member will appear as payment due until a payment is added later.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                {formData.paymentReceivedNow ? "Amount Paid Now (Rs.)" : "Expected Fee (Rs.)"}
              </label>
              <input
                type="number"
                name="feeAmount"
                value={formData.feeAmount}
                onChange={handleChange}
                required={formData.paymentReceivedNow}
                min="0"
                disabled={!formData.paymentReceivedNow}
                className={`${inputClass} border-green-200 bg-green-50 disabled:cursor-not-allowed disabled:opacity-70`}
                placeholder="0.00"
              />
              {!formData.paymentReceivedNow && (
                <p className="mt-1 text-xs text-slate-500">Saved for reference only; no payment history will be added.</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Payment via</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                disabled={!formData.paymentReceivedNow}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-70`}
              >
                <option>Cash</option>
                <option>Online</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Transaction Notes</label>
            <input
              type="text"
              name="transactionNotes"
              value={formData.transactionNotes}
              onChange={handleChange}
              className={inputClass}
              placeholder="Enter transaction notes"
            />
          </div>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <SectionHeader
            icon={<FileImage size={18} />}
            title="Documents"
            description="Upload required ID proof and optional member photo."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>ID Document Photo</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label
                htmlFor={`id-document-camera-${formVersion}`}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                <Camera size={16} />
                Take Photo
              </label>
              <input
                key={`id-document-camera-${formVersion}`}
                id={`id-document-camera-${formVersion}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setIdDocumentFile(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
              <label
                htmlFor={`id-document-file-${formVersion}`}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FolderOpen size={16} />
                Choose File
              </label>
              <input
                key={`id-document-file-${formVersion}`}
                id={`id-document-file-${formVersion}`}
                type="file"
                accept="image/*"
                onChange={(event) => setIdDocumentFile(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </div>
            {idDocumentFile && <p className="mt-1 truncate text-xs font-medium text-slate-600">Selected: {idDocumentFile.name}</p>}
            <p className="mt-1 text-xs text-red-700">Required for every new member registration. Use camera or choose an existing image.</p>
          </div>
          <div>
            <label className={labelClass}>Passport Size Photo</label>
            <input
              key={`passport-photo-${formVersion}`}
              type="file"
              accept="image/*"
              capture="user"
              onChange={(event) => setPassportPhotoFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Optional. A fallback photo will be shown if this is not uploaded. Tap to use selfie camera on mobile/tablet.
            </p>
          </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-green-600 py-3 font-bold text-white transition duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
        >
          {isSubmitting && <LoaderCircle size={18} className="animate-spin" />}
          {isSubmitting
            ? "Registering member..."
            : formData.paymentReceivedNow
              ? "Submit Registration"
              : "Register Without Payment"}
        </button>
      </form>
    </div>
  );
};
